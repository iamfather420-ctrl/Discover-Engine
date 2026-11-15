# Daisy Invention Engine: test results

Run in the Bit workspace against the live OpenAlex and arXiv APIs. Evaluation scoring has no novelty criterion.

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
| Connect | 24 candidate connections |
| Invent | 6 engineering designs |
| Experiment | 2,000-trial simulation per design |
| Evaluate | Scorecard against current best practice |
| Export | Zip package |

## Evaluation scorecard

Scores are out of 10. The baseline is the current best practice.

| Design | Feasibility | Impact | Evidence | Risk | Overall | Experiment |
|---|---|---|---|---|---|---|
| Baseline: current best practice | 10 | 0 | 10 | 1 | 5.9 | n/a |
| Hybrid Machine Learning × Solid Electrolyte Interphase Framework | 5.6 | 7.3 | 9.2 | 0.9 | 7.2 | supported |
| Hybrid Machine Learning × Lithium ion Stack | 4.4 | 5.6 | 9.8 | 0.8 | 6.4 | supported |
| Programmable Lithium ion × Solid-state Lithium Batteries Architecture | 3.6 | 8.1 | 7.2 | 1.7 | 6.2 | inconclusive |
| Hierarchical Dendrite Suppression × Solid-state Lithium Batteries Framework | 3.2 | 7.7 | 5.8 | 2.3 | 5.4 | inconclusive |
| Coupled Battery Materials × Ion Transport Framework | 3.2 | 6.4 | 5.8 | 2.4 | 4.9 | inconclusive |
| Graded Electrochemical Stability Window × Battery Materials Module | 3.2 | 4.6 | 5.7 | 2.7 | 4.1 | inconclusive |

Weights: feasibility 0.30, impact 0.40, evidence 0.30, risk 0.15 (risk is subtracted).

The last three designs score below the baseline, so the engine does not rank every new idea above current practice.

## Caveats

- These results come from the Bit workspace build. The plain `invention-service/`, `daisy-app/` and `daisy-platform/` copies could not be installed here, so they have not been run. They carry the same scoring change.
- The experiment stage is a seeded Monte Carlo simulation. Its verdicts are hypotheses to test in the lab, not lab results.
- The Connect stage still ranks component pairs by how rarely they appear together. That is how it finds candidates. It no longer affects the evaluation score.
