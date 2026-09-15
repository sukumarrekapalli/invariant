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
| `writer.assistant` | question + draft + report + optional selection → answer or exact rewrite | synchronous JavaScript | Summarizes, outlines, retrieves passages, reports metrics, explains findings, and applies only evidence-backed exact edits. |
| `writer.generate-smollm2-135m` | bounded document request → answer or proposed rewrite | lazy WebGPU worker | Recommended q4 compatibility profile. Downloads about 181 MB on first request. |
| `writer.generate-smollm2-360m` | bounded document request → answer or proposed rewrite | lazy WebGPU worker | Higher-capacity q4f16 Preview profile. Requires WebGPU `shader-f16` and downloads about 272 MB. |

## Assistant engines

`Document tools` is the default. It has no generation model and is suitable for
the broadest set of devices. It can answer conversational questions about its
scope and produce a bounded, evidence-explained draft rating, but abstains from
emotional sentiment. Local profiles are explicit user choices and register an
additional Leanlet with a larger declared memory budget. Invariant requests a
real WebGPU adapter before enabling them; the 360M option also requires
`shader-f16`. Failed initialization falls back to Document tools with a visible
reason rather than silently using a server.

Assistant replies name their `source` (`structured` or `generative`), `kind`
(`answer`, `suggestion`, or `rewrite`), supporting finding IDs, optional caveat,
and an optional replacement range. Generative context is bounded to six recent
turns, 1,500 characters per turn, 7,500 document characters, and 5,000 selected
characters. A rewrite is never applied without an author action.

## Findings

Every `WriterFinding` contains a stable source, category, severity, status, optional confidence, optional text range, explanation, evidence, and optional suggestion. Confidence is `null` where a numeric probability would be misleading, such as a dictionary absence.

## Corrections

Manual replacement supports all suggestions. Bulk and automatic application use only `safeToApply` findings. Current automatic correction is further restricted to grammar and style categories, so it cannot silently redact private data or choose a spelling suggestion.

## Scores

Correctness, clarity, and privacy scores are deterministic summaries of active findings. Overall score is a documented weighted aggregate. They are interface signals for triage, not probabilities and not measures of literary value.
