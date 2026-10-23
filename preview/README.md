# Praani Name Hunt — isolated interactive preview

A redesigned, gamified Name Hunt with the **original Praani archive and contribution form preserved** under a separate navigation tab. The preview runs on its own Render service and does not touch Railway, the paid Praani web service, or production PostgreSQL.

## Experiences

- **Name Hunt:** Three curated species with rights-reviewed photographs, language-specific archive-gap status, one-click contribution, ask-someone question and next-animal progression. A gap means missing from Praani records, not absent from the internet.
- **Original Archive:** The existing search, species autocomplete, contribution form, language missions and sourced-name archive remain available.
- **My Fieldbook:** Saves animals to ask about later in the visitor's browser localStorage. This is not an account or a verified-contribution dashboard.

Language and region are selected explicitly; no GPS, IP geolocation or inferred mother tongue is used. No badges reward unverified submissions.

## Image rights

Only the three species-matched Wikimedia Commons files in `media-rights.json` are used. Each file has been checked for its **CC BY 4.0** licence, author, source and species. Credits and licence links are displayed with the image; the complete register is available at `/media-rights.json`. No image is inferred from search results or used for a different species. Any unverified or failed image falls back to typography, never a substitute species.

## Data isolation

The preview uses a separate SQLite database in `/tmp`, and seeded sourced names from the repository. Contributions can disappear after a free-service restart. The 2,029-species catalogue is a snapshot for preview testing. Do not collect real field research here until durable storage and review are implemented.

## Run and test

Run `node preview/server.mjs` on Node 24. Set `PUBLIC_ORIGIN` to the preview URL when deployed. The `Electric Ember preview tests` GitHub Action checks the Name Hunt, rights register, images, Fieldbook, original archive, autocomplete, Unicode, submission validation and mobile layouts.

## Not yet implemented

Persistent contributor accounts, optional Google login, automatic location suggestions, image licensing at full-catalogue scale, audio pronunciations and moderation of community reports. These are future product features, not represented as live.
