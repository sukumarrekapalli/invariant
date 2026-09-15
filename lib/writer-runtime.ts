import {
  accepted,
  createLeanletKernel,
  defineFlow,
  type KernelLeanletDefinition,
  type LeanletKernelEvent,
  type LeanletResult,
} from 'leanlet-ai/kernel';
import {
  analyzePrivacy,
  analyzeReadability,
  analyzeStyle,
  stableTextHash,
  textMetrics,
} from './analyzers.ts';
import {
  LANGUAGE_PROFILES,
  type AssistantReply,
  type LanguageProfileId,
  type LanguageResult,
  type LexiconResult,
  type LexiconSense,
  type WriterFinding,
  type WriterReport,
} from './writer-types.ts';
/* oxlint-disable import/default -- Vite's ?worker query provides constructor default exports. */
import ExtraSmallLanguageWorker from './language-extrasmall.worker.ts?worker';
import SmallLanguageWorker from './language-small.worker.ts?worker';
import MediumLanguageWorker from './language-medium.worker.ts?worker';
import SpellingWorker from './spelling.worker.ts?worker';
/* oxlint-enable import/default */

type LanguageWorkerMessage =
  | { type: 'ready'; requestId: number }
  | { type: 'result'; requestId: number; result: LanguageResult }
  | { type: 'error'; requestId: number; message: string };

type Pending = {
  resolve(value: LanguageResult): void;
  reject(error: Error): void;
};

class LanguageClient {
  private readonly worker: Worker;
  private requestId = 0;
  private pending = new Map<number, Pending>();

  constructor(profileId: LanguageProfileId) {
    this.worker =
      profileId === 'eld-medium'
        ? new MediumLanguageWorker({ name: 'leanlet-writer-eld-medium' })
        : profileId === 'eld-small'
          ? new SmallLanguageWorker({ name: 'leanlet-writer-eld-small' })
          : new ExtraSmallLanguageWorker({
              name: 'leanlet-writer-eld-extrasmall',
            });
    this.worker.onmessage = ({ data }: MessageEvent<LanguageWorkerMessage>) => {
      const pending = this.pending.get(data.requestId);
      if (!pending) return;
      this.pending.delete(data.requestId);
      if (data.type === 'error') pending.reject(new Error(data.message));
      else if (data.type === 'result') pending.resolve(data.result);
      else
        pending.resolve({
          language: 'Uncertain',
          score: 0,
          reliable: false,
          profileId,
          alternatives: [],
          warning: 'The model is ready; add text to identify a language.',
        });
    };
    this.worker.onerror = () => {
      for (const pending of this.pending.values())
        pending.reject(
          new Error('The local language worker stopped unexpectedly.'),
        );
      this.pending.clear();
    };
  }

  detect(text: string, signal: AbortSignal) {
    if (!text.trim())
      return Promise.resolve<LanguageResult>({
        language: 'Uncertain',
        score: 0,
        reliable: false,
        profileId: 'eld-extrasmall',
        alternatives: [],
        warning: 'Add text to identify a language.',
      });
    const requestId = ++this.requestId;
    return new Promise<LanguageResult>((resolve, reject) => {
      const abort = () => {
        this.pending.delete(requestId);
        reject(new DOMException('Cancelled', 'AbortError'));
      };
      signal.addEventListener('abort', abort, { once: true });
      this.pending.set(requestId, {
        resolve: (value) => {
          signal.removeEventListener('abort', abort);
          resolve(value);
        },
        reject: (error) => {
          signal.removeEventListener('abort', abort);
          reject(error);
        },
      });
      this.worker.postMessage({ type: 'detect', requestId, text });
    });
  }

  destroy() {
    this.worker.terminate();
    this.pending.clear();
  }
}

type FindingWorkerMessage =
  | { type: 'result'; requestId: number; result: WriterFinding[] }
  | { type: 'error'; requestId: number; message: string };

class SpellingClient {
  private readonly worker = new SpellingWorker({
    name: 'invariant-spelling-en',
  });
  private requestId = 0;
  private pending = new Map<
    number,
    { resolve(value: WriterFinding[]): void; reject(error: Error): void }
  >();
  constructor() {
    this.worker.onmessage = ({ data }: MessageEvent<FindingWorkerMessage>) => {
      const pending = this.pending.get(data.requestId);
      if (!pending) return;
      this.pending.delete(data.requestId);
      if (data.type === 'error') pending.reject(new Error(data.message));
      else pending.resolve(data.result);
    };
  }
  analyze(text: string, signal: AbortSignal) {
    const requestId = ++this.requestId;
    return new Promise<WriterFinding[]>((resolve, reject) => {
      const abort = () => {
        this.pending.delete(requestId);
        reject(new DOMException('Cancelled', 'AbortError'));
      };
      signal.addEventListener('abort', abort, { once: true });
      this.pending.set(requestId, {
        resolve: (value) => {
          signal.removeEventListener('abort', abort);
          resolve(value);
        },
        reject: (error) => {
          signal.removeEventListener('abort', abort);
          reject(error);
        },
      });
      this.worker.postMessage({ requestId, text });
    });
  }
  destroy() {
    this.worker.terminate();
    this.pending.clear();
  }
}

class LexiconClient {
  private readonly shards = new Map<string, Record<string, LexiconSense[]>>();
  async lookup(rawWord: string, signal: AbortSignal): Promise<LexiconResult> {
    const word = rawWord.trim().toLocaleLowerCase('en-US').replace(/[’]/g, "'");
    const normalized = word.normalize('NFKD').replace(/[^a-z]/g, '');
    const shard = normalized ? `${normalized[0]}${normalized[1] ?? '_'}` : '__';
    let entries = this.shards.get(shard);
    if (!entries) {
      const base = import.meta.env.BASE_URL || '/';
      const response = await fetch(`${base}lexicon/${shard}.json`, { signal });
      if (!response.ok)
        return {
          word,
          senses: [],
          found: false,
          source: 'Princeton WordNet 3.0',
        };
      entries = (await response.json()) as Record<string, LexiconSense[]>;
      this.shards.set(shard, entries);
    }
    const senses = entries[word] ?? [];
    return {
      word,
      senses,
      found: senses.length > 0,
      source: 'Princeton WordNet 3.0',
    };
  }
}

function definition<Input, Output, State = undefined>(
  value: KernelLeanletDefinition<Input, Output, State>,
) {
  return value;
}

function languageFinding(language: LanguageResult): WriterFinding[] {
  if (language.reliable) return [];
  return [
    {
      id: 'language-confidence',
      source: 'language',
      category: 'language',
      severity: 'review',
      confidence: language.score,
      status: 'abstained',
      title: 'Language needs confirmation',
      explanation:
        language.warning ??
        'The local model could not identify a dependable language signal.',
      evidence: language.candidate
        ? [`Leading candidate: ${language.candidate}`]
        : [],
    },
  ];
}

function assistantResponse(
  question: string,
  report: WriterReport,
): AssistantReply {
  const intent = question.toLocaleLowerCase();
  const select = (categories: WriterFinding['category'][]) =>
    report.findings.filter((item) => categories.includes(item.category));
  let findings: WriterFinding[] = [];
  let lead = '';
  if (/private|privacy|secret|sensitive|safe|share|send/.test(intent)) {
    findings = select(['privacy']);
    lead = findings.length
      ? `I found ${findings.length} privacy item${findings.length === 1 ? '' : 's'} to review before sharing.`
      : 'The configured local privacy checks found no matching signals.';
  } else if (/hard|read|clear|clarity|sentence|concise/.test(intent)) {
    findings = select(['readability', 'style']);
    lead = findings.length
      ? `I found ${findings.length} clarity or style observation${findings.length === 1 ? '' : 's'}.`
      : 'The configured clarity checks found no current issues.';
  } else if (/language|locale/.test(intent)) {
    findings = select(['language']);
    lead = report.language.reliable
      ? `The ${report.language.profileId.replace('eld-', '')} local profile identifies this as ${report.language.language}.`
      : (report.language.warning ?? 'The language result needs confirmation.');
  } else if (/grammar|spelling|punctuation|mistake/.test(intent)) {
    findings = select(['grammar', 'spelling']);
    lead = findings.length
      ? `I found ${findings.length} grammar or spacing item${findings.length === 1 ? '' : 's'}.`
      : 'The current English rule pack found no matching grammar patterns.';
  } else if (/preflight|check|review|everything/.test(intent)) {
    findings = report.findings;
    lead = findings.length
      ? `The local preflight found ${findings.length} item${findings.length === 1 ? '' : 's'}: ${report.counts.block} blocking and ${report.counts.review} for review.`
      : 'The local preflight found no configured signals.';
  } else {
    return {
      supported: false,
      findingIds: [],
      answer:
        'This local assistant currently answers questions about privacy, clarity, grammar, language, and the preflight report. It will not invent an answer outside those capabilities.',
    };
  }
  const evidence = findings
    .slice(0, 3)
    .map((item) => item.title)
    .join('; ');
  return {
    supported: true,
    findingIds: findings.map((item) => item.id),
    answer: evidence ? `${lead} ${evidence}.` : lead,
  };
}

export function createWriterRuntime(
  profileId: LanguageProfileId,
  onEvent?: (event: LeanletKernelEvent) => void,
) {
  const profile =
    LANGUAGE_PROFILES.find((item) => item.id === profileId) ??
    LANGUAGE_PROFILES[0];
  const kernel = createLeanletKernel({
    budget: {
      maxConcurrentRuns: 4,
      maxResidentBytes: 96 * 1024 * 1024,
      defaultDeadlineMs: 2_500,
    },
    policy: { network: 'static-assets', allowedProviders: ['javascript'] },
  });
  if (onEvent) kernel.subscribe(onEvent);

  kernel.register(
    definition<string, LanguageResult, LanguageClient>({
      manifest: {
        id: 'writer.language',
        version: '0.1.0',
        task: 'language-identification',
        description:
          'Statistical language identification in a dedicated worker.',
        providers: ['javascript'],
        network: 'static-assets',
        estimatedResidentBytes: profile.estimatedResidentBytes,
      },
      load: () => new LanguageClient(profileId),
      run: async (text, client, context) =>
        accepted(await client.detect(text, context.signal)),
      dispose: (client) => client.destroy(),
    }),
  );
  kernel.register(
    definition<string, WriterFinding[]>({
      manifest: {
        id: 'writer.privacy',
        version: '0.1.0',
        task: 'privacy-preflight',
        providers: ['javascript'],
        network: 'deny',
        estimatedResidentBytes: 64 * 1024,
      },
      run: (text) => accepted(analyzePrivacy(text)),
    }),
  );
  kernel.register(
    definition<string, WriterFinding[], SpellingClient>({
      manifest: {
        id: 'writer.spelling-en',
        version: '0.1.0',
        task: 'english-dictionary-spelling',
        providers: ['javascript'],
        network: 'static-assets',
        estimatedResidentBytes: 14 * 1024 * 1024,
      },
      load: () => new SpellingClient(),
      run: async (text, client, context) =>
        accepted(await client.analyze(text, context.signal)),
      dispose: (client) => client.destroy(),
    }),
  );
  kernel.register(
    definition<string, LexiconResult, LexiconClient>({
      manifest: {
        id: 'writer.lexicon-en',
        version: '0.1.0',
        task: 'english-word-reference',
        providers: ['javascript'],
        network: 'static-assets',
        estimatedResidentBytes: 4 * 1024 * 1024,
      },
      load: () => new LexiconClient(),
      run: (word, client, context) =>
        client.lookup(word, context.signal).then(accepted),
    }),
  );
  kernel.register(
    definition<string, WriterFinding[]>({
      manifest: {
        id: 'writer.readability',
        version: '0.1.0',
        task: 'readability-analysis',
        providers: ['javascript'],
        network: 'deny',
        estimatedResidentBytes: 32 * 1024,
      },
      run: (text) => accepted(analyzeReadability(text)),
    }),
  );
  kernel.register(
    definition<string, WriterFinding[]>({
      manifest: {
        id: 'writer.english-rules',
        version: '0.1.0',
        task: 'english-style-and-grammar-rules',
        providers: ['javascript'],
        network: 'deny',
        estimatedResidentBytes: 48 * 1024,
      },
      run: (text) => accepted(analyzeStyle(text)),
    }),
  );
  kernel.register(
    definition<{ question: string; report: WriterReport }, AssistantReply>({
      manifest: {
        id: 'writer.assistant',
        version: '0.1.0',
        task: 'evidence-backed-writing-assistant',
        providers: ['javascript'],
        network: 'deny',
        estimatedResidentBytes: 24 * 1024,
      },
      run: ({ question, report }) =>
        accepted(assistantResponse(question, report)),
    }),
  );

  const flow = defineFlow<string, WriterReport>({
    id: 'writer.preflight',
    version: '0.1.0',
    uses: [
      'writer.language',
      'writer.privacy',
      'writer.readability',
      'writer.english-rules',
      'writer.spelling-en',
    ],
    run: async (text, context) => {
      const [languageResult, privacyResult, readabilityResult] =
        await Promise.all([
          context.run<string, LanguageResult>('writer.language', text, {
            coalesceKey: stableTextHash(text),
          }),
          context.run<string, WriterFinding[]>('writer.privacy', text, {
            coalesceKey: stableTextHash(text),
          }),
          context.run<string, WriterFinding[]>('writer.readability', text, {
            coalesceKey: stableTextHash(text),
          }),
        ]);
      const language =
        languageResult.status === 'accepted'
          ? languageResult.output
          : ({
              language: 'Uncertain',
              score: 0,
              reliable: false,
              profileId,
              alternatives: [],
              warning:
                languageResult.status === 'failed'
                  ? `Language analysis was unavailable: ${languageResult.error.message}`
                  : `Language analysis ${languageResult.reason.replaceAll('-', ' ')}.`,
            } satisfies LanguageResult);
      const unpack = (result: LeanletResult<WriterFinding[]>) =>
        result.status === 'accepted' ? result.output : [];
      const [rulesResult, spellingResult] = language.reliable && language.code === 'en'
        ? await Promise.all([
            context.run<string, WriterFinding[]>('writer.english-rules', text, { coalesceKey: stableTextHash(text) }),
            context.run<string, WriterFinding[]>('writer.spelling-en', text, { coalesceKey: stableTextHash(text) }),
          ])
        : [undefined, undefined];
      const findings = [
        ...languageFinding(language),
        ...unpack(privacyResult),
        ...unpack(readabilityResult),
        ...(rulesResult ? unpack(rulesResult) : []),
        ...(spellingResult ? unpack(spellingResult) : []),
      ].sort(
        (a, b) =>
          ({ block: 0, review: 1, info: 2 })[a.severity] -
          { block: 0, review: 1, info: 2 }[b.severity],
      );
      const counts = {
        block: findings.filter((item) => item.severity === 'block').length,
        review: findings.filter((item) => item.severity === 'review').length,
        info: findings.filter((item) => item.severity === 'info').length,
      };
      const metrics = textMetrics(text);
      const scoreFor = (
        categories: WriterFinding['category'][],
        penalties: Record<WriterFinding['severity'], number>,
      ) =>
        Math.max(
          0,
          100 -
            findings
              .filter((item) => categories.includes(item.category))
              .reduce((sum, item) => sum + penalties[item.severity], 0),
        );
      const scores = {
        correctness: language.reliable && language.code === 'en'
          ? scoreFor(['spelling', 'grammar'], { block: 24, review: 8, info: 3 })
          : null,
        clarity: scoreFor(['readability', 'style'], {
          block: 20,
          review: 7,
          info: 3,
        }),
        privacy: scoreFor(['privacy'], { block: 35, review: 15, info: 5 }),
        overall: 0,
      };
      scores.overall = scores.correctness === null
        ? Math.round(scores.clarity * 0.6 + scores.privacy * 0.4)
        : Math.round(scores.correctness * 0.4 + scores.clarity * 0.35 + scores.privacy * 0.25);
      return accepted({
        textHash: stableTextHash(text),
        findings,
        language,
        ...metrics,
        counts,
        health: scores.overall,
        scores,
        trace: [],
        completedAt: Date.now(),
      });
    },
  });

  return {
    profile,
    async analyze(text: string, signal?: AbortSignal) {
      const outcome = await flow.run(kernel, text, {
        signal,
        deadlineMs: 4_000,
        priority: 2,
        coalesceKey: stableTextHash(text),
      });
      if (outcome.result.status !== 'accepted')
        throw new Error(
          outcome.result.status === 'failed'
            ? outcome.result.error.message
            : `Analysis ${outcome.result.reason}.`,
        );
      return {
        ...outcome.result.output,
        trace: outcome.trace.map((item) => ({
          leanletId: item.leanletId,
          status: item.status,
          totalMs: item.timing?.totalMs,
        })),
      };
    },
    async ask(question: string, report: WriterReport) {
      const result = await kernel.run<
        { question: string; report: WriterReport },
        AssistantReply
      >('writer.assistant', { question, report }, { deadlineMs: 500 });
      if (result.status !== 'accepted')
        throw new Error('The local assistant could not complete this request.');
      return result.output;
    },
    async lookupWord(word: string, signal?: AbortSignal) {
      const result = await kernel.run<string, LexiconResult>(
        'writer.lexicon-en',
        word,
        {
          signal,
          deadlineMs: 4_000,
          coalesceKey: word.trim().toLocaleLowerCase('en-US'),
        },
      );
      if (result.status !== 'accepted')
        throw new Error(
          'The local word reference could not complete this lookup.',
        );
      return result.output;
    },
    inspect: () => kernel.inspect(),
    destroy: () => kernel.destroy(),
  };
}

export type WriterRuntime = ReturnType<typeof createWriterRuntime>;
