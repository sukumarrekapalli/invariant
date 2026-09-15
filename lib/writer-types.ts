export type FindingCategory =
  | 'spelling'
  | 'grammar'
  | 'readability'
  | 'style'
  | 'privacy'
  | 'language';
export type FindingSeverity = 'info' | 'review' | 'block';

export type WriterFinding = {
  id: string;
  source: string;
  category: FindingCategory;
  severity: FindingSeverity;
  confidence: number | null;
  status: 'accepted' | 'abstained' | 'unavailable';
  range?: { start: number; end: number };
  title: string;
  explanation: string;
  evidence: string[];
  suggestion?: {
    replacement: string;
    alternatives?: string[];
    safeToApply: boolean;
  };
};

export type LanguageProfileId = 'eld-extrasmall' | 'eld-small' | 'eld-medium';

export type LanguageResult = {
  language: string;
  code?: string;
  candidate?: string;
  score: number;
  reliable: boolean;
  warning?: string;
  profileId: LanguageProfileId;
  alternatives: Array<{ code: string; language: string; score: number }>;
};

export type WriterReport = {
  textHash: string;
  findings: WriterFinding[];
  language: LanguageResult;
  words: number;
  sentences: number;
  readingMinutes: number;
  health: number;
  scores: {
    overall: number;
    correctness: number | null;
    clarity: number;
    privacy: number;
  };
  counts: Record<FindingSeverity, number>;
  trace: Array<{ leanletId: string; status: string; totalMs?: number }>;
  completedAt: number;
};

export type LexiconSense = {
  partOfSpeech: 'n' | 'v' | 'a' | 'r';
  definition: string;
  synonyms: string[];
  antonyms: string[];
};

export type LexiconResult = {
  word: string;
  senses: LexiconSense[];
  found: boolean;
  source: 'Princeton WordNet 3.0';
};

export type AssistantReply = {
  basisHash: string;
  answer: string;
  findingIds: string[];
  supported: boolean;
  source: 'structured' | 'generative';
  kind: 'answer' | 'suggestion' | 'rewrite';
  replacement?: string;
  range?: { start: number; end: number };
  caveat?: string;
};

export type AssistantRequest = {
  question: string;
  text: string;
  report: WriterReport;
  selection?: { start: number; end: number; text: string };
  /** Recent bounded turns for the optional conversational model. */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
};

export type AssistantEngineId = 'structured' | 'smollm2-360m';

export const ASSISTANT_ENGINES: ReadonlyArray<{
  id: AssistantEngineId;
  name: string;
  detail: string;
  transfer: string;
  coverage: string;
}> = [
  {
    id: 'structured',
    name: 'Document tools',
    detail: 'Immediate evidence, retrieval, and exact edits',
    transfer: 'Included',
    coverage: 'Language-neutral metrics; strongest with English review evidence',
  },
  {
    id: 'smollm2-360m',
    name: 'Local generative · Preview',
    detail: 'SmolLM2 360M Instruct for bounded rewrites and document questions',
    transfer: '~272 MB + runtime once',
    coverage: 'English-first; generated output requires review',
  },
] as const;

export const LANGUAGE_PROFILES: ReadonlyArray<{
  id: LanguageProfileId;
  name: string;
  detail: string;
  transfer: string;
  estimatedResidentBytes: number;
}> = [
  {
    id: 'eld-extrasmall',
    name: 'Fast',
    detail: '60-language detection',
    transfer: '~294 KB',
    estimatedResidentBytes: 37 * 1024 * 1024,
  },
  {
    id: 'eld-small',
    name: 'Balanced',
    detail: '60-language detection',
    transfer: '~477 KB',
    estimatedResidentBytes: 54 * 1024 * 1024,
  },
  {
    id: 'eld-medium',
    name: 'Precise',
    detail: '60-language detection',
    transfer: '~586 KB',
    estimatedResidentBytes: 71 * 1024 * 1024,
  },
] as const;
