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

Still required before Issue #2 can close: full-text retrieval and page/table/figure/dataset locators; semantic support review; quantitative context validation; source-lineage and replication checks; contradiction adjudication; traceable raw-measurement ingestion and review; and consistent evidence states throughout every UI/API/export path.
