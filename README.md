# Invariant

**Intelligence within. Voice intact.**

Invariant is an open-source writing environment whose core intelligence runs in the browser. It uses [Leanlet](https://sukumarrekapalli.github.io/leanlet/) to coordinate small, bounded capabilities rather than sending every interaction to a general-purpose inference API.

## Product capabilities

- local documents with autosave, import, Markdown export, copy, and focus mode;
- multilingual statistical language identification with three switchable profiles;
- English spelling backed by a Hunspell-compatible dictionary and `nspell`;
- exact grammar and spacing fixes, readability signals, and private-data preflight;
- transparent correctness, clarity, and privacy scores;
- on-demand definitions, synonyms, and antonyms from Princeton WordNet;
- a bounded assistant that answers only from the current structured review;
- explicit abstention and quality warnings when a capability lacks coverage.

Invariant does not claim that a clean report is error-free, that its score measures literary quality, or that the current English packs provide multilingual grammar support.

## Quick start

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the URL printed by the development server. The landing page and writing desk are separate routes; the intelligence runtime is created only in `/writer/`.

```bash
npm run check
npm run lint
npm test
npm run build
```

`prepare:lexicon` derives lazy static shards from the installed WordNet database and copies the dictionary source into the spelling worker. Generated data is excluded from Git and rebuilt deterministically.

## Architecture at a glance

```text
Invariant editor
  └─ writer.preflight (Leanlet flow)
      ├─ writer.language       statistical worker; selectable profile
      ├─ writer.spelling-en    nspell worker; lazy after English result
      ├─ writer.privacy        inspectable pattern checks
      ├─ writer.readability    deterministic metrics
      └─ writer.english-rules  exact, reviewable transformations

On demand
  ├─ writer.lexicon-en         lazy two-letter WordNet shard
  └─ writer.assistant          bounded composition from report evidence
```

Leanlet owns orchestration, lifecycle, budgets, scheduling, coalescing, network policy, and typed results. Invariant owns writing policy, data packs, and product behavior. A missing generic runtime primitive must be implemented and released in Leanlet before it is consumed here; product-specific writing logic stays here.

## Documentation

- [Architecture and data flow](docs/ARCHITECTURE.md)
- [Capability contracts](docs/CAPABILITIES.md)
- [Privacy and offline behavior](docs/PRIVACY.md)
- [Model and data licenses](docs/MODEL_LICENSES.md)
- [Testing and release gates](docs/TESTING.md)
- [Next release](docs/NEXT_RELEASE.md)

## Deployment

The included GitHub Actions workflow builds `dist/client` for project Pages. Update the repository segment and site URL in the workflow if the repository is not named `invariant`.

## License

Apache-2.0. Third-party models, dictionaries, and databases retain their own licenses; see [Model and data licenses](docs/MODEL_LICENSES.md).
