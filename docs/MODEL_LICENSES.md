# Model and data licenses

Invariant packages or derives runtime assets from:

- **ELD** (`eld`) for statistical language identification. See the installed package and upstream repository for its MIT license and data attribution.
- **nspell** for Hunspell-compatible checking, MIT licensed.
- **dictionary-en** for the English affix and dictionary data; see its installed license and upstream source.
- **Princeton WordNet 3.0** for definitions and lexical relations. The complete WordNet license is copied to `public/lexicon/LICENSE.txt` during the build and shipped beside the derived shards.
- **Leanlet** (`leanlet-ai`) for browser orchestration, Apache-2.0.
- **SmolLM2 360M Instruct** (`HuggingFaceTB/SmolLM2-360M-Instruct`) for the
  optional local generative assistant, Apache-2.0. The browser representation
  is `onnx-community/SmolLM2-360M-Instruct-ONNX`, pinned to revision `fe7c7db`
  and q4f16 weight SHA-256
  `ed196149bd9f24de0aa78f2ce8c6fa1167f71de9857173d1a231a4cbc01fb1c0`.
- **Transformers.js** (`@huggingface/transformers`) for optional browser model
  execution, Apache-2.0.

Release review must verify the exact installed versions and retain upstream notices. Derived WordNet files must never be distributed without its license.
