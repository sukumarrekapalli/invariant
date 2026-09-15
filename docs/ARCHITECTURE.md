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
          ┌──────────┬────────┬──────────┐       ┌──────────┐
          ▼          ▼        ▼          ▼       ▼          ▼
       language   privacy  readability  rules  lexicon   assistant
          │                                      │
          ▼                                      ▼
    spelling worker                        static shard cache
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

## Persistence

Documents are JSON records in local storage. This is convenient local persistence, not durable storage. Import and export are explicit escape hatches. IndexedDB, versioned migrations, encryption-at-rest semantics, and conflict-free file synchronization are intentionally deferred.

## Security posture

Network policy is `static-assets`; allowed provider is `javascript`. The application has no remote inference endpoint. This does not make arbitrary hosted JavaScript trustworthy: users still rely on the origin, release process, dependencies, and browser. A production release should publish dependency attestations and a content security policy.

## Extension points

New capabilities should define a typed contract, declare memory and network policy, return explicit abstention, use a worker for blocking work, include evaluation thresholds, and remain lazy unless required in the common editing path.
