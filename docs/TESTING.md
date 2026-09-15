# Testing and release gates

Every release must pass `npm ci`, type checking, lint, tests, and the production build.

Browser acceptance covers landing-page loading without worker requests, editor initialization, English spelling suggestions, reliable Kannada and Telugu identification, uncertain short-text warnings, WordNet lookup, exact replacement ordering, autosave recovery, import/export, model switching, reduced-motion behavior, and desktop/mobile layout.

Before calling a capability production-ready, add a versioned evaluation set and report precision, recall, abstention rate, latency distributions, peak resident memory, and transferred bytes by device tier. Current tests verify behavior and known language samples; they are not yet a statistically meaningful quality evaluation.
