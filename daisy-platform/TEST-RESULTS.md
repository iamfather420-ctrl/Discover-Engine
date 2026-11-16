# Discover Engine evidence and validation status

**Status:** This document supersedes earlier scorecards and Monte Carlo test reports. Earlier numeric design scores, expected gains, confidence-like values, and simulation verdicts are legacy synthetic outputs and are not evidence of real-world performance. They must not be cited as validated results.

## Current evidence rules

- A source is eligible for downstream extraction only after its canonical provider identifier, title, publication year (when available), and abstract text match the provider's canonical record.
- A metadata match establishes record consistency only. It does not prove that the paper's scientific claims are correct.
- Extracted components retain an exact source-record pointer for the displayed abstract sentence.
- Connection scores describe co-occurrence and metadata patterns in the retrieved sample only. They do not establish novelty, compatibility, or effectiveness.
- Generated inventions are hypotheses. Expected performance gain, uncertainty, evidence maturity, and numeric evaluation scores are not established.
- Synthetic Monte Carlo experiments are disabled. The legacy experiment endpoint returns HTTP 410.
- Exports identify abstract-derived metrics as unverified literature leads and do not include synthetic performance models.

## Current automated checks

The GitHub Actions workflow is being expanded to test both the standalone service and the Bit production workspace. Only checks that pass on the exact current commit should be reported as current validation.

## What remains unproven

- Whether individual statements in source abstracts are scientifically correct.
- Whether each extracted metric is interpreted with the right denominator, baseline, unit, conditions, and context.
- Whether a proposed component combination works in practice.
- Whether an invention improves on a properly measured baseline.
- Independent replication by another operator or laboratory.

Until those steps are completed with traceable full-text evidence and measured data, results must remain explicitly unverified or hypothesis-only.
