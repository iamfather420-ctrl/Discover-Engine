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
