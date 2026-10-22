# Praani

Crowdsourced register of Indian wildlife names. Original Railway Bun source, packaged for Render using Docker.

## Deployment

Requires a private Render PostgreSQL connection URL set as `DATABASE_URL`. Set `ADMIN_EMAIL`; use newly generated `ADMIN_PASSWORD` and `SESSION_SECRET` and never reuse Railway secrets. Render test DB is free and expires 2026-11-21. Do not point the public domain here until data migration and verification are complete.

## Safety

Do not commit database exports, credentials, or snapshots. Existing Railway app and database remain the production source until cutover.
