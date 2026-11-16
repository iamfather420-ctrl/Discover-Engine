# invention-service

Express API plus a seven-stage research/design workflow. Scientific claims and generated designs are not treated as proven without independent evidence.

| Stage | File |
|---|---|
| Discover | `discover.ts` (OpenAlex + arXiv) |
| Understand | `understand.ts` |
| Connect | `connect.ts` |
| Invent | `invent.ts` |
| Experiment | `experiment.ts` (synthetic simulation disabled; measured validation pending) |
| Evaluate | `evaluate.ts` |
| Export | `export-package.ts` |

```bash
npm install
npm start          # http://localhost:4000
npm test

The legacy experiment endpoint returns HTTP 410; simulation output is not experimental evidence.
```

Set `MONGO_URL` to persist projects in MongoDB; without it, storage is in-memory.

## Claim-level evidence provenance

The project response and ZIP export include `evidenceClaims` / `data/evidence-claims.json`: exact abstract-sentence quotes, sentence indices, canonical source IDs and URLs, extracted quantitative tokens, and candidate text matches across records. These are provenance leads only. Every claim remains `human_review_required` unless the exact passage cannot be validated, and no automated process promotes an abstract sentence to a scientifically verified fact.

Exact quote and numeric-token checks do not establish semantic support, full-text context, correct denominators or experimental conditions, independent replication, or truth. Candidate matches are not independent corroboration. Designs remain hypotheses; simulation remains disabled as evidence.

## Traceable measurement ingestion\n\nSubmit raw measurement metadata to `POST /projects/:id/evidence/measurements`. The payload must include a protocol ID/version/method, measured baseline and unit, timestamped replicate observations, sample size, environment, operator attribution, HTTPS dataset URI and SHA-256 digest, analysis method/version/code URI and digest, uncertainty method/value/unit, and calibration details. The API persists submissions as `measured_unverified` and adds a server-timestamped ingestion audit event. There is deliberately no API that promotes a submission to verified: this service currently has no authenticated independent-review workflow and does not fetch/hash remote datasets or reproduce analyses.\n\nThe ZIP export includes `data/measurement-evidence.json`. Operator-supplied attribution, URLs and hashes are recorded as assertions, not independently authenticated facts.\n\nStill required before Issue #2 can close: publisher/full-text retrieval and page/table/figure/dataset locators; semantic claim-support review; validation of quantitative denominators, populations and conditions; source-lineage and true replication checks; contradiction adjudication; authenticated independent reviewer attestation; remote dataset retrieval/hash verification and reproducible analysis execution; and end-to-end parity tests for every UI/API/export path.
