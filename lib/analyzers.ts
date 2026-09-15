import type { WriterFinding } from './writer-types.ts';

let findingSequence = 0;

function finding(input: Omit<WriterFinding, 'id' | 'status'>): WriterFinding {
  findingSequence += 1;
  return { ...input, id: `${input.source}-${findingSequence}`, status: 'accepted' };
}

function matches(text: string, expression: RegExp) {
  const output: RegExpExecArray[] = [];
  expression.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = expression.exec(text))) {
    output.push(match);
    if (!match[0].length) expression.lastIndex += 1;
  }
  return output;
}

export function analyzePrivacy(text: string): WriterFinding[] {
  const output: WriterFinding[] = [];
  for (const match of matches(text, /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi)) {
    output.push(finding({ source: 'privacy', category: 'privacy', severity: 'review', confidence: .99,
      range: { start: match.index, end: match.index + match[0].length }, title: 'Email address',
      explanation: 'This draft contains a directly contactable identifier.', evidence: [match[0]],
      suggestion: { replacement: '[EMAIL]', safeToApply: true } }));
  }
  for (const match of matches(text, /(?<![\w-])(?:\+?\d[\d ().-]{8,}\d)(?![\w-])/g)) {
    output.push(finding({ source: 'privacy', category: 'privacy', severity: 'review', confidence: .84,
      range: { start: match.index, end: match.index + match[0].length }, title: 'Possible phone number',
      explanation: 'This numeric sequence resembles a phone number and may need review before sharing.', evidence: [match[0]],
      suggestion: { replacement: '[PHONE]', safeToApply: true } }));
  }
  for (const match of matches(text, /\b(?:sk|api|token|secret)[-_][A-Za-z0-9_-]{12,}\b/gi)) {
    output.push(finding({ source: 'privacy', category: 'privacy', severity: 'block', confidence: .96,
      range: { start: match.index, end: match.index + match[0].length }, title: 'Credential-shaped value',
      explanation: 'This value resembles a token or secret. Remove it or confirm that it is safe to disclose.', evidence: [match[0]],
      suggestion: { replacement: '[REDACTED]', safeToApply: true } }));
  }
  for (const match of matches(text, /https?:\/\/(?:localhost|[^\s/]*(?:internal|corp|intranet)[^\s/]*)[^\s]*/gi)) {
    output.push(finding({ source: 'privacy', category: 'privacy', severity: 'review', confidence: .88,
      range: { start: match.index, end: match.index + match[0].length }, title: 'Internal-looking link',
      explanation: 'This link appears intended for an internal environment.', evidence: [match[0]] }));
  }
  return output;
}

export function analyzeReadability(text: string): WriterFinding[] {
  const output: WriterFinding[] = [];
  for (const match of matches(text, /[^.!?\n]+[.!?]?/g)) {
    const sentence = match[0].trim();
    if (!sentence) continue;
    const words = sentence.split(/\s+/).length;
    if (words > 30) {
      const leading = match[0].indexOf(sentence);
      output.push(finding({ source: 'readability', category: 'readability', severity: words > 42 ? 'review' : 'info', confidence: 1,
        range: { start: match.index + leading, end: match.index + leading + sentence.length }, title: `${words}-word sentence`,
        explanation: 'Long sentences can make the main point harder to scan. Consider splitting this into two ideas.', evidence: [`${words} words`] }));
    }
  }
  let paragraphOffset = 0;
  for (const paragraph of text.split(/\n{2,}/)) {
    const paragraphWords = paragraph.trim() ? paragraph.trim().split(/\s+/).length : 0;
    if (paragraphWords > 85) {
      output.push(finding({ source: 'readability', category: 'readability', severity: 'info', confidence: 1,
        range: { start: paragraphOffset, end: paragraphOffset + paragraph.length }, title: 'Dense paragraph',
        explanation: 'This paragraph is visually dense. A paragraph break may help readers find the next idea.', evidence: [`${paragraphWords} words without a paragraph break`] }));
    }
    paragraphOffset += paragraph.length + 2;
  }
  return output;
}

const EXACT_STYLE_RULES = [
  { expression: /\bin order to\b/gi, replacement: 'to', title: 'Use a direct phrase', explanation: '“To” usually communicates the same meaning more directly.' },
  { expression: /\bmore clear\b/gi, replacement: 'clearer', title: 'Use the comparative form', explanation: '“Clearer” is the conventional comparative form.' },
] as const;

export function analyzeStyle(text: string): WriterFinding[] {
  const output: WriterFinding[] = [];
  for (const rule of EXACT_STYLE_RULES) {
    for (const match of matches(text, rule.expression)) {
      output.push(finding({ source: 'style', category: 'style', severity: 'info', confidence: .98,
        range: { start: match.index, end: match.index + match[0].length }, title: rule.title,
        explanation: rule.explanation, evidence: [match[0]], suggestion: { replacement: rule.replacement, safeToApply: true } }));
    }
  }
  for (const match of matches(text, /\b(\p{L}+)\s+\1\b/giu)) {
    output.push(finding({ source: 'grammar', category: 'grammar', severity: 'review', confidence: .94,
      range: { start: match.index, end: match.index + match[0].length }, title: 'Repeated word',
      explanation: 'The same word appears twice in succession.', evidence: [match[0]],
      suggestion: { replacement: match[1], safeToApply: true } }));
  }
  for (const match of matches(text, / {2,}/g)) {
    output.push(finding({ source: 'grammar', category: 'grammar', severity: 'info', confidence: 1,
      range: { start: match.index, end: match.index + match[0].length }, title: 'Extra spacing',
      explanation: 'Use one space between words.', evidence: [`${match[0].length} consecutive spaces`],
      suggestion: { replacement: ' ', safeToApply: true } }));
  }
  return output;
}

export function textMetrics(text: string) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const sentences = (text.match(/[.!?]+(?:\s|$)/g) ?? []).length || (words ? 1 : 0);
  return { words, sentences, readingMinutes: words ? Math.max(1, Math.ceil(words / 220)) : 0 };
}

export function stableTextHash(text: string) {
  let hash = 2_166_136_261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}
