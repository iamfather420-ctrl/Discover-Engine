# Daisy Invention Engine

A standalone engine that gives Daisy the ability to:

1. **Discover** — live search across OpenAlex (250M+ scholarly works) and arXiv preprints, for a core query plus adjacent "lens" domains.
2. **Understand** — break sources into reusable technical components (algorithms, materials, devices, methods, concepts) that recur across independent papers.
3. **Connect** — rank component pairs by novelty (rarely studied together), domain distance and shared-neighbour compatibility.
4. **Invent** — turn the best connections into engineering designs with hypothesis, mechanism, risks and evidence.
5. **Experiment** — real measured validation only. Synthetic Monte Carlo output is disabled and cannot establish experimental truth.
6. **Evaluate** — evidence-status report. Numeric rankings remain unavailable until measured results and a measured baseline exist; abstract extracts are unverified leads.
7. **Export** — zip package with design specs, non-simulating design scaffolds, evidence-status report and raw research data.

## Structure

This repository is a [Bit](https://bit.dev) workspace. Each folder in `daisy-engine/` is an independently versioned component (published at [bit.cloud/agatenft/daisy-engine](https://bit.cloud/agatenft/daisy-engine)).

| Component | What it is |
|---|---|
| `daisy-engine/invention-service` | Express API + the 7-stage pipeline (`discover.ts`, `understand.ts`, `connect.ts`, `invent.ts`, `experiment.ts`, `evaluate.ts`, `export-package.ts`) with MongoDB persistence |
| `daisy-engine/daisy-app` | React workbench UI — one screen per stage |
| `daisy-engine/daisy-platform` | Composes the app, the service and an API gateway into one deployable unit |
| `daisy-engine/github-publisher` | Utility used to publish this workspace to GitHub |

## Run locally

```bash
npx @teambit/bvm install   # install Bit
bit install                # install dependencies
export MONGO_URL="mongodb://localhost:27017/daisy"   # optional — in-memory storage without it
bit run daisy-platform
```

## API (via the gateway, prefix `/invention-service`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/projects` `{ query, domains[] }` | Start a research run (pipeline runs in the background) |
| GET | `/projects` / `/projects/:id` | List / poll projects |
| POST | `/projects/:id/inventions` `{ componentIds[] }` | Invent from hand-picked components |
| POST | `/projects/:id/inventions/:inv/experiments` | Disabled (HTTP 410); submit traceable measured data through a future validated workflow |
| GET | `/projects/:id/evaluation` | Scorecard vs. baseline |
| GET | `/projects/:id/inventions/:inv/spec` | Markdown design spec |
| GET | `/projects/:id/export?inventions=a,b` | Integration package (.zip) |

## Use the engine as a library

```ts
import { discover, understand, connect, invent } from '@agatenft/daisy-engine.invention-service';

const sources = await discover('solid state battery', ['machine learning', 'bio-inspired'], console.log);
const components = understand(sources, 'solid state battery');
const designs = invent('solid state battery', components, connect(components, sources), sources);
console.log(designs[0].hypothesis); // hypothesis only; no performance result is implied
```
