# Changelog

## 0.2.0

- Reworked the brand system around paper, ink, and semantic-only signal color.
- Added document summaries, outlines, passage retrieval, metrics, supported
  edit explanations, selection-aware rewrites, and reviewable replacement UI.
- Added an opt-in SmolLM2 360M Instruct WebGPU Leanlet for English-first local
  generation with download progress, explicit caveats, bounded conversation,
  and no automatic edits. This engine remains labeled Preview pending the
  published cold-start browser matrix.
- Added evidence-qualified ratings, honest sentiment abstention in the
  deterministic engine, and conversational document context for the optional
  model.
- Added full-height document and review drawers for mobile without moving the
  editor below either pane.
- Added typed application-check routing to the sibling Leanlet framework so
  custom checks can delegate to deterministic or model-backed Leanlets.
- Added a reusable custom model-pack contract to the sibling Leanlet framework
  release candidate before consuming the pattern in Invariant.
- Updated Vite and pinned a patched Sharp version used by the optional browser
  model dependency tree.
- Disabled service-worker registration during development and advanced the
  production cache version to prevent stale worker bundles during iteration.

## 0.1.0 — Initial preview

- Introduced Invariant branding, editorial landing page, and separate writing desk.
- Added multi-document browser persistence, import/export, copy, and focus mode.
- Added Leanlet-orchestrated language, spelling, privacy, readability, exact-rule, lexicon, and bounded-assistant capabilities.
- Added switchable language profiles, explicit quality warnings, typed evidence, manual suggestions, safe exact fixes, and transparent draft scores.
- Added lazy WordNet shards, conditional spelling-worker loading, and same-origin runtime caching.
- Added privacy documentation, capability specifications, release gates, SEO metadata, PWA manifest, and GitHub Pages deployment workflow.

Known limits: English-only spelling and lexical packs, local storage rather than durable document storage, and no statistically representative quality evaluation yet.
