# Privacy and offline behavior

Core review input is processed in the browser. There is no inference API in this repository. Same-origin requests retrieve application JavaScript, workers, language assets, and on-demand lexicon shards; they do not carry draft text as a query or request body.

Documents are stored in local storage under `invariant:documents`. Users must export important work because browser storage may be cleared or unavailable. The first visit requires a network connection to obtain application assets. Successfully used assets are eligible for the browser and service-worker cache, but cache eviction can require a later download.

The privacy Leanlet is a reference preflight for declared patterns. It is not comprehensive DLP, compliance, malware scanning, or a guarantee that a draft is safe to disclose.
