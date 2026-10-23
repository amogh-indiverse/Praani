# Electric Ember preview

A separate UI sandbox for discovering local names missing from Praani's sourced records. Run `node preview/server.mjs` with Node 24. Deploy using `preview/Dockerfile` and set `PUBLIC_ORIGIN` to the preview URL. No external packages are required.

The catalogue snapshot is the 2,029 public species served by praani-web on 23 October 2026. Sourced names retain the repository dataset's original references. Missions indicate gaps in those records for a language; they do not claim that no online record exists. Community reports collect language, region, how a name was learned, and optional context. They remain unverified.

This server never uses DATABASE_URL and cannot connect to the existing PostgreSQL instances. Contributions use SQLite under `/tmp`; free-service restarts or redeploys may reset them. This is explicitly disclosed in the UI. Existing index.ts, deployment configuration, PostgreSQL data, Railway and production DNS are unchanged. A persistent preview store is a separate follow-up before collecting real research data.
