# Capability contracts

Invariant treats every intelligent behavior as a bounded Leanlet. Each contract declares input, output, execution boundary, coverage, failure behavior, and when the UI may apply a change.

| Leanlet | Input → output | Execution | Coverage and abstention |
| --- | --- | --- | --- |
| `writer.language` | text → language, score, alternatives, reliability | selected ELD worker | Detects any language represented by the shipped ELD profile. Short or ambiguous input returns an unreliable result with a warning. |
| `writer.spelling-en` | text → spelling findings | lazy nspell worker | Runs only after a reliable English result. Suggestions are always manual because names and domain terms may be valid. |
| `writer.privacy` | text → typed findings | synchronous JavaScript | Finds declared identifier and credential-shaped patterns. It is not a complete DLP system. |
| `writer.readability` | text → typed findings | synchronous JavaScript | Flags unusually long sentences and dense paragraphs. It does not judge quality or voice. |
| `writer.english-rules` | text → exact edits | synchronous JavaScript | Runs explicit transformations. Only deterministic replacements are marked `safeToApply`. |
| `writer.lexicon-en` | word → senses and relations | lazy static shard | English WordNet. Missing entries return `found: false`; no definition is generated. |
| `writer.assistant` | question + report → bounded answer | synchronous JavaScript | Routes supported intents to report evidence. Unsupported questions return `supported: false`. |

## Findings

Every `WriterFinding` contains a stable source, category, severity, status, optional confidence, optional text range, explanation, evidence, and optional suggestion. Confidence is `null` where a numeric probability would be misleading, such as a dictionary absence.

## Corrections

Manual replacement supports all suggestions. Bulk and automatic application use only `safeToApply` findings. Current automatic correction is further restricted to grammar and style categories, so it cannot silently redact private data or choose a spelling suggestion.

## Scores

Correctness, clarity, and privacy scores are deterministic summaries of active findings. Overall score is a documented weighted aggregate. They are interface signals for triage, not probabilities and not measures of literary value.
