/// <reference lib="webworker" />
import type { LanguageProfileId, LanguageResult } from './writer-types.ts';

type EldResult = { language: string; getScores(): Record<string, number>; isReliable(): boolean };
type Eld = { detect(text: string): EldResult };
type Request = { type: 'detect'; requestId: number; text: string } | { type: 'warmup'; requestId: number };

const displayNames = typeof Intl.DisplayNames === 'function' ? new Intl.DisplayNames(['en'], { type: 'language' }) : undefined;
function languageName(code: string) { try { return displayNames?.of(code) ?? code; } catch { return code; } }

export function installLanguageWorker(profileId: LanguageProfileId, model: Eld) {
  self.onmessage = ({ data }: MessageEvent<Request>) => {
    try {
      if (data.type === 'warmup') { self.postMessage({ type: 'ready', requestId: data.requestId }); return; }
      const raw = model.detect(data.text);
      const scores = Object.entries(raw.getScores()).filter((entry): entry is [string, number] => Number.isFinite(entry[1])).sort((a, b) => b[1] - a[1]);
      const code = raw.language || scores[0]?.[0];
      const candidate = code ? languageName(code) : undefined;
      const score = code ? (scores.find(([key]) => key === code)?.[1] ?? 0) : 0;
      const reliable = Boolean(code) && raw.isReliable();
      const result: LanguageResult = {
        code, candidate, score, reliable, profileId,
        language: reliable ? candidate ?? code ?? 'Unknown' : 'Uncertain',
        warning: reliable ? undefined : code ? `Add more text or review this result. The leading candidate is ${candidate}.` : 'No dependable language signal was found.',
        alternatives: scores.slice(0, 3).map(([itemCode, itemScore]) => ({ code: itemCode, language: languageName(itemCode), score: itemScore })),
      };
      self.postMessage({ type: 'result', requestId: data.requestId, result });
    } catch (error) {
      self.postMessage({ type: 'error', requestId: data.requestId, message: error instanceof Error ? error.message : 'Language detection failed.' });
    }
  };
}
