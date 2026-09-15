# Testing and release gates

Every release must pass `npm ci`, type checking, lint, tests, and the production build.

Browser acceptance covers landing-page loading without worker requests, editor initialization, English spelling suggestions, reliable Kannada and Telugu identification, uncertain short-text warnings, WordNet lookup, exact replacement ordering, autosave recovery, import/export, model switching, bounded assistant history and rewrite inputs, evidence-qualified ratings, reduced-motion behavior, and desktop/mobile layout. Mobile checks must open and close the document and review drawers without moving the editor below either panel, trap no content behind the viewport, and preserve each panel's scroll position.

The optional generative engine remains Preview and requires a real WebGPU browser check on each
supported release platform: cold asset download and progress, warm cache reuse,
document Q&A, subjective-answer caveats, selected-text rewrite, stale-rewrite
rejection, over-limit abstention, worker disposal, offline warm-cache behavior,
and graceful failure when WebGPU or a model asset is unavailable. Unit and build
tests do not establish generation quality.

Before calling a capability production-ready, add a versioned evaluation set and report precision, recall, abstention rate, latency distributions, peak resident memory, and transferred bytes by device tier. Current tests verify behavior and known language samples; they are not yet a statistically meaningful quality evaluation.
