# Privacy and offline behavior

Core review input is processed in the browser. There is no inference API in
this repository. Same-origin requests retrieve application JavaScript, workers,
language assets, and on-demand lexicon shards; they do not carry draft text as
a query or request body.

If the user selects a local model profile, the browser fetches pinned SmolLM2
model and tokenizer files from Hugging Face on the first request. These are ordinary
asset downloads: the draft is not placed in the URL, request body, headers, or
model-host telemetry by Invariant. Generation then runs in a dedicated WebGPU
worker. A model host can still observe normal connection metadata such as IP
address and requested asset paths. A later release should serve reproducibly
pinned artifacts from the application origin.

Documents are stored in local storage under `invariant:documents`. Users must export important work because browser storage may be cleared or unavailable. The first visit requires a network connection to obtain application assets. Successfully used assets are eligible for the browser and service-worker cache, but cache eviction can require a later download.

The privacy Leanlet is a reference preflight for declared patterns. It is not comprehensive DLP, compliance, malware scanning, or a guarantee that a draft is safe to disclose.

Generated text can reproduce model biases, change meaning, or invent details.
Invariant never applies a generated rewrite automatically.
