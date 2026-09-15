import assert from 'node:assert/strict';
import test from 'node:test';
import { analyzePrivacy, analyzeReadability, analyzeStyle, stableTextHash, textMetrics } from '../lib/analyzers.ts';

test('privacy preflight returns evidence and safe redactions', () => {
  const findings = analyzePrivacy('Email a@b.com with token sk-demo-1234567890 now.');
  assert.equal(findings.length, 2);
  assert.equal(findings.some((item) => item.severity === 'block'), true);
  assert.deepEqual(findings.map((item) => item.suggestion?.safeToApply), [true, true]);
});

test('readability finds a long sentence but leaves short prose alone', () => {
  const long = `${Array.from({ length: 35 }, (_, index) => `word${index}`).join(' ')}.`;
  assert.equal(analyzeReadability(long).length, 1);
  assert.equal(analyzeReadability('This is a short sentence.').length, 0);
});

test('English rule pack provides exact, user-controlled edits', () => {
  const findings = analyzeStyle('In order to be more clear, use the the correct phrase.');
  assert.deepEqual(findings.map((item) => item.suggestion?.replacement), ['to', 'clearer', 'the']);
});

test('text metrics and coalescing hash are deterministic', () => {
  assert.deepEqual(textMetrics('One sentence. Two sentences!'), { words: 4, sentences: 2, readingMinutes: 1 });
  assert.equal(stableTextHash('same'), stableTextHash('same'));
  assert.notEqual(stableTextHash('same'), stableTextHash('different'));
});

