import nspell from 'nspell';
import aff from './generated/en.aff?raw';
import dic from './generated/en.dic?raw';
import type { WriterFinding } from './writer-types.ts';

const spell = nspell({ aff, dic });

function analyze(text: string): WriterFinding[] {
  const findings: WriterFinding[] = [];
  const seen = new Set<string>();
  for (const match of text.matchAll(/[A-Za-z][A-Za-z'’-]*/g)) {
    const original = match[0];
    const normalized = original.replaceAll('’', "'");
    const key = normalized.toLocaleLowerCase('en-US');
    if (seen.has(key) || spell.correct(normalized) || spell.correct(key)) continue;
    seen.add(key);
    const suggestions = spell.suggest(normalized).slice(0, 5);
    if (!suggestions.length) continue;
    findings.push({
      id: `spelling-${match.index}-${key}`,
      source: 'nspell-en',
      category: 'spelling',
      severity: 'review',
      confidence: null,
      status: 'accepted',
      range: { start: match.index, end: match.index + original.length },
      title: `Check “${original}”`,
      explanation: 'This word is not present in the active English dictionary. Names and specialist terms can be valid.',
      evidence: [original],
      suggestion: { replacement: suggestions[0], alternatives: suggestions, safeToApply: false },
    });
  }
  return findings;
}

self.onmessage = ({ data }: MessageEvent<{ requestId: number; text: string }>) => {
  try {
    self.postMessage({ type: 'result', requestId: data.requestId, result: analyze(data.text) });
  } catch (error) {
    self.postMessage({ type: 'error', requestId: data.requestId, message: error instanceof Error ? error.message : 'Spelling analysis failed.' });
  }
};
