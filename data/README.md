# Indian local names, 22 October 2026

`verified-local-names.json.gz` is gzip-compressed UTF-8 JSON (5,879 records, 1,155 species, 21 languages). Decompress it with `gzip -dc data/verified-local-names.json.gz`. It contains the complete source registry, original source spellings, exact worksheet cells/PDF pages and verification methods. `catalogue-reference.json` is the independently captured 2,029-species test fixture.

This is documented coverage of the retrieved sources, not an exhaustive inventory of India's languages or species names. A cited name means documented usage, not a unique species identifier or an official name. No names or original-script spellings were machine-translated. Published romanizations are retained. Language assignments have not all been independently reviewed by native speakers.

Sources include the official 2025 eBird common-names matrix (`full_sparse` only, no English or regional fallback columns), P. O. Nameer's 2015 peer-reviewed Kerala mammal checklist (published romanizations only), TRAFFIC India's wildlife law enforcement handbook, HBCSE/TIFR's snake account, and IUCN-attributed vernacular records with exact accepted GBIF matches. Additional 2019 snake compilation records were accepted only where another cited source corroborated them. Reptile Database entries were used to check specific synonyms/subspecies. The source registry includes URLs and source-specific scope notes.

411 source records were held out for uncertain taxonomic concepts, mismatched common names, unspecified languages, unsupported script extraction or uncorroborated compilations. GBIF retrieval was interrupted, so mammal and snake coverage is incomplete. Bird coverage dominates this version. Do not fill these gaps by guessing or copying aggregator labels without checking their original sources.

## Import

The CLI defaults to validation only: `DATABASE_URL=... node scripts/import-verified-names.mjs`; add `--apply` to write. It accepts only the exact Praani Render test database internal host/database. The Render app applies this version once at initialization after schema creation. Other database targets do not trigger it.

The import validates the entire dataset against the target's scientific names and species IDs before writes, then uses one transaction and an advisory lock. It preserves existing contributions, attaches evidence through `local_name_sources`, verifies every name's presence and records completion in `local_name_import_runs`. Retrying a completed version does not restore subsequent administrator deletions. Failed imports roll back. No credentials are stored in these files.
