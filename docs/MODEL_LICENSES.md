# Model and data licenses

Invariant packages or derives runtime assets from:

- **ELD** (`eld`) for statistical language identification. See the installed package and upstream repository for its MIT license and data attribution.
- **nspell** for Hunspell-compatible checking, MIT licensed.
- **dictionary-en** for the English affix and dictionary data; see its installed license and upstream source.
- **Princeton WordNet 3.0** for definitions and lexical relations. The complete WordNet license is copied to `public/lexicon/LICENSE.txt` during the build and shipped beside the derived shards.
- **Leanlet** (`leanlet-ai`) for browser orchestration, Apache-2.0.

Release review must verify the exact installed versions and retain upstream notices. Derived WordNet files must never be distributed without its license.
