# invention-service

Express API plus a seven-stage research/design workflow. Scientific claims and generated designs are not treated as proven without independent evidence.

| Stage | File |
|---|---|
| Discover | discover.ts (OpenAlex + arXiv) |
| Understand | understand.ts |
| Connect | connect.ts |
| Invent | invent.ts |
| Experiment | experiment.ts (synthetic simulation disabled; measured validation pending) |
| Evaluate | evaluate.ts |
| Export | export-package.ts |

~~~bash
npm install
npm start
npm test
~~~

The service uses durable, tenant-scoped PostgreSQL storage on the existing SolveX Neon STAGING branch. It has no in-memory fallback and no MongoDB fallback. Startup fails closed if the database configuration, schema, forced tenant RLS, or restricted database role is unavailable.

## Existing Neon staging configuration

Set these Render environment variables without exposing their values in logs:

- DISCOVERY_DATABASE_URL: connection string for the existing Neon staging branch only
- DISCOVERY_EXPECTED_DB_HOST: ep-rough-unit-aysyjj75.c-5.us-east-2.aws.neon.tech
- DISCOVERY_TENANT_ID: server-owned tenant identifier; never accepted from API request bodies
- SOLVEX_ENV: staging (or sandbox/development)
- DISCOVERY_API_TOKEN: existing API bearer token, at least 32 characters

This service rejects production environment configuration and any Neon host outside the existing staging branch. Use a restricted database role that is neither superuser nor BYPASSRLS. The runtime verifies forced row-level security and the tenant policy before listening.

The additive migration is migrations/0001_discovery_projects.sql. It is manual and is not executed by the application. Review and apply it to the existing Neon staging branch before deploying this change. No new database or paid resource is required.

Render health checks:
- /healthz reports process liveness only.
- /readyz performs a real tenant-scoped database query and returns HTTP 503 if the database is unavailable.
- Configure the Render service health-check path as /readyz only after the migration and environment variables are correctly configured.

## Claim-level evidence provenance

The project response and ZIP export include evidenceClaims / data/evidence-claims.json: exact abstract-sentence quotes, sentence indices, canonical source IDs and URLs, extracted quantitative tokens, and candidate text matches across records. These are provenance leads only. Every claim remains human_review_required unless the exact passage cannot be validated, and no automated process promotes an abstract sentence to a scientifically verified fact.

Exact quote and numeric-token checks do not establish semantic support, full-text context, correct denominators or experimental conditions, independent replication, or truth. Candidate matches are not independent corroboration. Designs remain hypotheses; simulation remains disabled as evidence.

## Traceable measurement ingestion

Submit raw measurement metadata to POST /projects/:id/evidence/measurements. The payload must include a protocol ID/version/method, measured baseline and unit, timestamped replicate observations, sample size, environment, operator attribution, HTTPS dataset URI and SHA-256 digest, analysis method/version/code URI and digest, uncertainty method/value/unit, and calibration details. The API persists submissions as measured_unverified and adds a server-timestamped ingestion audit event. There is deliberately no API that promotes a submission to verified: this service currently has no authenticated independent-review workflow and does not fetch/hash remote datasets or reproduce analyses.

The ZIP export includes data/measurement-evidence.json. Operator-supplied attribution, URLs and hashes are recorded as assertions, not independently authenticated facts.

Still required before Issue #2 can close: publisher/full-text retrieval and page/table/figure/dataset locators; semantic claim-support review; validation of quantitative denominators, populations and conditions; source-lineage and true replication checks; contradiction adjudication; authenticated independent reviewer attestation; remote dataset retrieval/hash verification and reproducible analysis execution; and end-to-end parity tests for every UI/API/export path.
