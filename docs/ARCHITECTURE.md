# Architecture

## Boundaries

```text
Landing route                         Writing route
static product content               editor + local document store
no runtime creation                  │
                                      ▼
                                Leanlet kernel
                         policy · budget · lifecycle · trace
                              │                    │
                 preflight flow                    on-demand flow
          ┌──────────┬────────┬──────────┐       ┌──────────────┐
          ▼          ▼        ▼          ▼       ▼              ▼
       language   privacy  readability  rules  lexicon   document assistant
          │                                      │
          ▼                                      ▼
    spelling worker                   static shard cache / optional model
          └──────────────┬───────────────────────┘
                         ▼
                typed evidence and scores
                         ▼
                  author-controlled UI
```

The kernel-only `leanlet-ai/kernel` export prevents product builds from importing vision adapters or ONNX runtime code. This keeps orchestration usable without coupling every application to every model family.

## Scheduling

Privacy, readability, rules, and language identification start concurrently. Spelling is conditional on a reliable English language result, which avoids downloading its dictionary for unsupported text. The kernel coalesces work by a stable text hash, propagates cancellation, applies deadlines, and disposes workers when the runtime is replaced or the route unmounts.

## Word reference

The build step parses WordNet into two-character shards. `writer.lexicon-en` fetches only the shard for the requested word and retains it in the runtime cache. The service worker caches successfully fetched same-origin assets. A common shard can still be hundreds of kilobytes; future releases should add an indexed binary format.

## Document assistant

The default `writer.assistant` Leanlet is document-aware but non-generative. It
can build extractive summaries and outlines, retrieve relevant passages, report
metrics, explain typed findings, and prepare only replacements supported by an
exact finding. It runs without loading a language generator.

`writer.generate-smollm2-360m` is registered only when the user selects Local
generative. Its worker loads SmolLM2 360M Instruct with Transformers.js on
WebGPU, reports asset progress through kernel diagnostics, and receives only
the current document, optional selection, and bounded instruction. It is
English-first and its output is never auto-applied. The kernel declares a
720 MiB resident estimate and a larger budget for this profile; that declaration
is admission metadata rather than measured GPU memory.

Product checks are application contracts rather than hidden prompts. The next
Leanlet package line exposes `defineCheck()` and `runCheck()` so a check maps
document state to a registered deterministic or model-backed Leanlet while
retaining kernel scheduling, abstention, timing, and provenance. Invariant's
current review flow will move to that public contract after the package release
is published.

## Persistence

Documents are JSON records in local storage. This is convenient local persistence, not durable storage. Import and export are explicit escape hatches. IndexedDB, versioned migrations, encryption-at-rest semantics, and conflict-free file synchronization are intentionally deferred.

## Security posture

Network policy is `static-assets`; allowed providers are JavaScript and, when
selected, WebGPU. The application has no remote inference endpoint. The
optional model host receives ordinary model-file requests on first load, but
not the draft. This does not make arbitrary hosted JavaScript trustworthy:
users still rely on the origin, release process, dependencies, browser, and
model artifact. A production release should publish dependency attestations,
pin all model files, and enforce a content security policy.

## Extension points

New capabilities should define a typed contract, declare memory and network policy, return explicit abstention, use a worker for blocking work, include evaluation thresholds, and remain lazy unless required in the common editing path.
