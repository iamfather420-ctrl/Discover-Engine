# invention-service

Express API plus the 7-stage Daisy pipeline.

| Stage | File |
|---|---|
| Discover | `discover.ts` (OpenAlex + arXiv) |
| Understand | `understand.ts` |
| Connect | `connect.ts` |
| Invent | `invent.ts` |
| Experiment | `experiment.ts` |
| Evaluate | `evaluate.ts` |
| Export | `export-package.ts` |

```bash
npm install
npm start          # http://localhost:4000
npm test
```

Set `MONGO_URL` to persist projects in MongoDB; without it, storage is in-memory.
