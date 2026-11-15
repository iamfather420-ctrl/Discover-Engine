# Daisy Invention Engine: test results

Run in the Bit workspace against the live OpenAlex and arXiv APIs.

## Checks

| Check | Result |
|---|---|
| Unit tests (`invention-service.spec.ts`) | 2 of 2 passed |
| Type check (`bit check-types`) | No errors |
| Live pipeline run through the gateway | Completed, status `ready` |
| Evaluation endpoint | Returned scorecard, benchmarks and weights |
| Export endpoint | HTTP 200, 52,261-byte zip |

## Live run: "solid state battery"

Adjacent lenses: machine learning, bio-inspired.

| Stage | Output |
|---|---|
| Discover | 36 sources across 3 lenses |
| Understand | 28 technical components |
| Connect | 24 candidate connections (all 24 unexplored) |
| Invent | 6 engineering designs |
| Experiment | 2,000-trial simulation per design |
| Evaluate | Scorecard against current best practice |
| Export | Zip package |

## Evaluation scorecard

Scores are out of 10. The baseline is the current best practice.

| Design | Novelty | Feasibility | Impact | Evidence | Risk | Overall | Experiment |
|---|---|---|---|---|---|---|---|
| Baseline: current best practice | 0 | 10 | 0 | 10 | 1 | 4.4 | n/a |
| Hybrid Machine Learning × Solid Electrolyte Interphase Framework | 10 | 5.6 | 7.3 | 9.2 | 0.9 | 7.8 | supported |
| Hybrid Machine Learning × Lithium ion Stack | 10 | 4.4 | 5.6 | 9.8 | 0.8 | 7.1 | supported |
| Programmable Lithium ion × Solid-state Lithium Batteries Architecture | 10 | 3.6 | 8.1 | 7.2 | 1.7 | 7.0 | inconclusive |
| Hierarchical Dendrite Suppression × Solid-state Lithium Batteries Framework | 10 | 3.2 | 7.7 | 5.8 | 2.3 | 6.4 | inconclusive |
| Coupled Battery Materials × Ion Transport Framework | 10 | 3.2 | 6.4 | 5.8 | 2.4 | 6.0 | inconclusive |
| Graded Electrochemical Stability Window × Battery Materials Module | 10 | 3.2 | 4.6 | 5.7 | 2.7 | 5.4 | inconclusive |

Weights: novelty 0.25, feasibility 0.25, impact 0.30, evidence 0.20, risk 0.15.

## Caveats

- These results come from the Bit workspace build. The plain `invention-service/`, `daisy-app/` and `daisy-platform/` copies could not be installed here, so they have not been run. The pipeline files are byte-for-byte the same size as the tested ones. The server entry, imports, API path and `package.json` files are new.
- The experiment stage is a seeded Monte Carlo simulation. Its verdicts are hypotheses to test in the lab, not lab results.
- Novelty scores 10 for every design because all 24 connections were unexplored. That limits how much it separates the designs.
