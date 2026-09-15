import type {
  AssistantReply,
  AssistantRequest,
  WriterFinding,
} from './writer-types.ts';
import { stableTextHash } from './analyzers.ts';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'but', 'by', 'for',
  'from', 'had', 'has', 'have', 'he', 'her', 'his', 'i', 'if', 'in', 'is',
  'it', 'its', 'me', 'my', 'not', 'of', 'on', 'or', 'our', 'she', 'so',
  'that', 'the', 'their', 'them', 'there', 'they', 'this', 'to', 'was',
  'we', 'were', 'what', 'when', 'where', 'which', 'who', 'will', 'with',
  'you', 'your',
]);

function sentences(text: string) {
  return (text.match(/[^.!?\n]+(?:[.!?]+|$)/gu) ?? [])
    .map((value) => value.trim())
    .filter(Boolean);
}

function terms(value: string) {
  return (value.toLocaleLowerCase().match(/[\p{L}\p{N}']+/gu) ?? []).filter(
    (word) => word.length > 2 && !STOP_WORDS.has(word),
  );
}

function rankedSentences(text: string, query = '') {
  const parts = sentences(text);
  const frequency = new Map<string, number>();
  for (const word of terms(text)) frequency.set(word, (frequency.get(word) ?? 0) + 1);
  const queryTerms = new Set(terms(query));
  return parts
    .map((sentence, index) => {
      const words = terms(sentence);
      const relevance = words.reduce(
        (sum, word) => sum + (frequency.get(word) ?? 0) + (queryTerms.has(word) ? 8 : 0),
        0,
      );
      const lengthPenalty = Math.max(1, Math.sqrt(words.length || 1));
      return { sentence, index, score: relevance / lengthPenalty };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);
}

export function summarizeDocument(text: string, limit = 3) {
  const chosen = rankedSentences(text)
    .slice(0, limit)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);
  return chosen;
}

export function isRewriteRequest(question: string) {
  return (
    /\b(rewrite|rephrase|shorten|condense|proofread|clean up)\b/i.test(question) ||
    /\b(make|turn|change)\b.{0,32}\b(concise|clearer|formal|casual|tone)\b/i.test(question)
  );
}

function exactRewrite(text: string, findings: WriterFinding[]) {
  return findings
    .filter((item) => item.range && item.suggestion?.safeToApply)
    .sort((a, b) => b.range!.start - a.range!.start)
    .reduce(
      (current, item) =>
        current.slice(0, item.range!.start) +
        item.suggestion!.replacement +
        current.slice(item.range!.end),
      text,
    );
}

function topEvidence(findings: WriterFinding[]) {
  return findings
    .slice(0, 5)
    .map((item) => {
      const replacement = item.suggestion?.replacement
        ? ` Suggested replacement: “${item.suggestion.replacement}”.`
        : '';
      return `${item.title}: ${item.explanation}${replacement}`;
    })
    .join(' ');
}

function mechanicalImpression(request: AssistantRequest) {
  const { report } = request;
  const averageWords = report.sentences ? report.words / report.sentences : 0;
  const cadence = averageWords > 24 ? 'dense' : averageWords > 15 ? 'measured' : 'direct';
  const review = report.findings.filter((item) => item.severity !== 'info').length;
  return { cadence, review };
}

export function answerFromDocument(request: AssistantRequest): AssistantReply {
  const intent = request.question.toLocaleLowerCase();
  const report = request.report;
  const base = {
    basisHash: stableTextHash(request.text),
    findingIds: [] as string[],
    supported: true,
    source: 'structured' as const,
    kind: 'answer' as const,
  };

  if (/\b(summary|summarize|main point|about)\b/.test(intent)) {
    const summary = summarizeDocument(request.text);
    return {
      ...base,
      answer: summary.length
        ? `Document summary:\n${summary.map((item) => `• ${item}`).join('\n')}`
        : 'There is not enough text to summarize yet.',
    };
  }

  if (/\b(key points?|outline|structure)\b/.test(intent)) {
    const points = summarizeDocument(request.text, 5);
    return {
      ...base,
      answer: points.length
        ? `Working outline:\n${points.map((item, index) => `${index + 1}. ${item}`).join('\n')}`
        : 'Add more text before building an outline.',
    };
  }

  if (/\b(word count|how many words|reading time|length)\b/.test(intent)) {
    return {
      ...base,
      answer: `This draft has ${report.words} words in ${report.sentences} sentence${report.sentences === 1 ? '' : 's'}, with an estimated reading time of ${report.readingMinutes} minute${report.readingMinutes === 1 ? '' : 's'}.`,
    };
  }

  if (/\b(rate|score|grade|how good|quality)\b/.test(intent)) {
    const { cadence, review } = mechanicalImpression(request);
    return {
      ...base,
      kind: 'suggestion',
      findingIds: report.findings.map((item) => item.id),
      answer: `On the configured checks, this draft scores ${report.scores.overall}/100. Its sentence cadence is ${cadence}; ${review === 1 ? 'one item merits' : `${review} items merit`} review. That score measures the checks shown in Review—not originality, truth, literary merit, or your voice.`,
      caveat: 'This is a bounded editorial signal, not an objective judgment of the writing.',
    };
  }

  if (/\b(sentiment|tone|mood|feel|feels|emotion|emotional)\b/.test(intent)) {
    const { cadence } = mechanicalImpression(request);
    return {
      ...base,
      supported: false,
      answer: `I can observe a ${cadence} sentence cadence and explain the review evidence, but the deterministic engine cannot reliably infer emotional sentiment. Select Local generative for a qualified interpretation of tone or reader impression.`,
      caveat: 'Tone and sentiment are interpretive and culturally dependent; a compact model may still be wrong.',
    };
  }

  if (/^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(intent)) {
    return {
      ...base,
      answer: 'Hello. I’m reading only the draft in this tab. I can help examine its structure, clarity, review evidence, and exact supported edits. What would you like to understand?',
    };
  }

  if (/\b(what can you do|help me|who are you|what do you know)\b/.test(intent)) {
    return {
      ...base,
      answer: 'I can discuss this draft, summarize or outline it, locate relevant passages, explain its local checks, score those checks, and prepare inspectable edits. I do not know facts beyond the draft in this mode, and I will say when a request needs interpretation rather than evidence.',
    };
  }

  if (/\b(private|privacy|secret|sensitive|safe|share|send)\b/.test(intent)) {
    const findings = report.findings.filter((item) => item.category === 'privacy');
    return {
      ...base,
      kind: 'suggestion',
      findingIds: findings.map((item) => item.id),
      answer: findings.length
        ? `${findings.length} privacy signal${findings.length === 1 ? '' : 's'} need review. ${topEvidence(findings)}`
        : 'The configured local privacy patterns found no matching signal. This is a scoped preflight, not a guarantee that the document contains no sensitive information.',
    };
  }

  if (/\b(language|locale)\b/.test(intent)) {
    return {
      ...base,
      answer: report.language.reliable
        ? `The active ${report.language.profileId.replace('eld-', '')} profile identifies the draft as ${report.language.language}. Its score is a model signal, not a calibrated probability.`
        : report.language.warning ?? 'The language signal is not reliable enough to name a language.',
    };
  }

  if (/\b(rewrite|shorten|concise|clean up|fix)\b/.test(intent)) {
    const target = request.selection?.text || request.text;
    const offset = request.selection?.start ?? 0;
    const relevant = report.findings
      .filter((item) => item.range && item.suggestion?.safeToApply)
      .filter((item) => {
        if (!request.selection) return true;
        return item.range!.start >= request.selection.start && item.range!.end <= request.selection.end;
      })
      .map((item) => ({
        ...item,
        range: item.range
          ? { start: item.range.start - offset, end: item.range.end - offset }
          : undefined,
      }));
    const replacement = exactRewrite(target, relevant);
    if (replacement !== target) {
      return {
        ...base,
        kind: 'rewrite',
        findingIds: relevant.map((item) => item.id),
        answer: 'I prepared a conservative rewrite using only exact, inspectable corrections from the current review.',
        replacement,
        range: request.selection
          ? { start: request.selection.start, end: request.selection.end }
          : { start: 0, end: request.text.length },
      };
    }
    return {
      ...base,
      supported: false,
      answer:
        'The structured assistant has no exact rewrite to apply. Enable Local generative in settings for broader rewrites; generated text is English-first and always requires review.',
      caveat: 'No text was changed because the evidence did not support a deterministic edit.',
    };
  }

  if (/\b(suggest|improve|edit|problem|issue|grammar|spelling|clarity)\b/.test(intent)) {
    const findings = report.findings.filter((item) => item.status === 'accepted');
    return {
      ...base,
      kind: 'suggestion',
      findingIds: findings.map((item) => item.id),
      answer: findings.length
        ? `${findings.length} review item${findings.length === 1 ? '' : 's'} are supported by the active checks. ${topEvidence(findings)}`
        : 'The active checks found no exact edits. You can still ask about a topic in the document or enable the local generative model for broader rewriting.',
    };
  }

  const matches = rankedSentences(request.text, request.question)
    .filter((item) => item.score > 0)
    .slice(0, 2)
    .sort((a, b) => a.index - b.index);
  if (matches.length && terms(request.question).length) {
    return {
      ...base,
      answer: `The closest passages in this draft are:\n${matches.map((item) => `• ${item.sentence}`).join('\n')}`,
      caveat: 'This is extractive retrieval from the draft, not a generated factual answer.',
    };
  }

  return {
    ...base,
    supported: false,
    answer:
      'I can summarize this draft, build an outline, report document metrics, retrieve relevant passages, explain review evidence, or prepare exact supported edits.',
  };
}

export function buildGenerativeMessages(request: AssistantRequest) {
  const selected = request.selection?.text.trim().slice(0, 5_000);
  const document = request.text.slice(0, 7_500);
  const history = (request.history ?? []).slice(-6).map((turn) => ({
    role: turn.role,
    content: turn.content.slice(0, 1_500),
  }));
  return [
    {
      role: 'system',
      content:
        'You are Invariant, a private, conversational writing assistant. Discuss only the supplied document and writing craft. Never claim certainty about subjective tone or quality. Distinguish document evidence from interpretation and say when you may be wrong. Never invent facts. Preserve the author’s meaning and voice. If asked to rewrite, output only the replacement text. Keep answers concise and natural.',
    },
    ...history,
    {
      role: 'user',
      content: `DOCUMENT:\n${document}\n\n${selected ? `SELECTED TEXT:\n${selected}\n\n` : ''}REQUEST:\n${request.question}`,
    },
  ] as const;
}
