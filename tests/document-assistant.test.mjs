import assert from 'node:assert/strict';
import test from 'node:test';
import {
  answerFromDocument,
  buildGenerativeMessages,
  isRewriteRequest,
  isStructuredAssistantRequest,
  summarizeDocument,
} from '../lib/document-assistant.ts';

const report = {
  textHash: 'x',
  findings: [
    {
      id: 'style-1',
      source: 'style',
      category: 'style',
      severity: 'info',
      confidence: 0.98,
      status: 'accepted',
      range: { start: 0, end: 11 },
      title: 'Use a direct phrase',
      explanation: 'Use “to” directly.',
      evidence: ['In order to'],
      suggestion: { replacement: 'To', safeToApply: true },
    },
  ],
  language: {
    language: 'English',
    code: 'en',
    score: 0.99,
    reliable: true,
    profileId: 'eld-small',
    alternatives: [],
  },
  words: 12,
  sentences: 2,
  readingMinutes: 1,
  health: 97,
  scores: { overall: 97, correctness: 100, clarity: 97, privacy: 100 },
  counts: { block: 0, review: 0, info: 1 },
  trace: [],
  completedAt: 1,
};

test('structured assistant summarizes and reports document metrics', () => {
  const text = 'Local software keeps drafts private. Writers retain control of every change.';
  assert.ok(summarizeDocument(text).length > 0);
  const answer = answerFromDocument({ question: 'How many words?', text, report });
  assert.equal(answer.supported, true);
  assert.match(answer.answer, /12 words/);
  assert.equal(answer.source, 'structured');
});

test('structured rewrite returns an explicit, reviewable replacement', () => {
  const text = 'In order to write, begin.';
  const answer = answerFromDocument({ question: 'Rewrite this', text, report });
  assert.equal(answer.kind, 'rewrite');
  assert.equal(answer.replacement, 'To write, begin.');
  assert.deepEqual(answer.range, { start: 0, end: text.length });
});

test('structured ratings expose their bounded basis and sentiment abstains', () => {
  const text = 'A short deliberate sentence.';
  const rating = answerFromDocument({ question: 'Rate this content', text, report });
  assert.match(rating.answer, /97\/100/);
  assert.match(rating.caveat, /not an objective judgment/i);
  const sentiment = answerFromDocument({ question: 'How does this feel?', text, report });
  assert.equal(sentiment.supported, false);
  assert.match(sentiment.answer, /cannot reliably infer emotional sentiment/i);
});

test('generative prompt is bounded to the supplied document and selection', () => {
  const request = {
    question: 'Rewrite the selection',
    text: 'A private draft.',
    report,
    selection: { start: 2, end: 9, text: 'private' },
  };
  const messages = buildGenerativeMessages(request);
  assert.equal(messages.length, 2);
  assert.match(messages[1].content, /DOCUMENT:\nA private draft/);
  assert.match(messages[1].content, /SELECTED TEXT:\nprivate/);
  assert.match(messages[0].content, /Never invent facts/);
});

test('generative context retains only recent bounded conversation', () => {
  const history = Array.from({ length: 8 }, (_, index) => ({
    role: index % 2 ? 'assistant' : 'user',
    content: `${index}:${'x'.repeat(2_000)}`,
  }));
  const messages = buildGenerativeMessages({
    question: 'What did we discuss?',
    text: 'Draft',
    report,
    history,
  });
  assert.equal(messages.length, 8);
  assert.match(messages[1].content, /^2:/);
  assert.equal(messages[1].content.length, 1_500);
});

test('tone questions remain conversational while explicit tone changes rewrite', () => {
  assert.equal(isRewriteRequest('What is the tone of this draft?'), false);
  assert.equal(isRewriteRequest('How might this feel to a reader?'), false);
  assert.equal(isRewriteRequest('Change this paragraph to a formal tone'), true);
  assert.equal(isRewriteRequest('Rewrite the selected sentence'), true);
});

test('assistant routing keeps bounded intents off the generative model', () => {
  assert.equal(isStructuredAssistantRequest('hi'), true);
  assert.equal(isStructuredAssistantRequest('summarize this draft'), true);
  assert.equal(isStructuredAssistantRequest('suggest edits'), true);
  assert.equal(isStructuredAssistantRequest('how does this feel to a reader?'), false);
  assert.equal(isStructuredAssistantRequest('rewrite this with a warmer tone'), false);
});
