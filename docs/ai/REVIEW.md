# Frontend review protocol

ID: FE-AI-002

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

Inputs are the exact staged candidate diff/tree, applicable global/local specs, installed library contracts, lock/toolchain inputs and actual command outputs. The review is read-only. Use a separate reviewer agent when available and state its independence limits; otherwise explicitly call it structured self-review.

Review questions:

1. Is each changed behavior required or justified by a recorded decision, within frontend scope?
2. Do new imports/props/symbols/flags/configuration exist in the exact installed API?
3. Are invariants/use cases owned by core, with useful patterns and inward dependencies?
4. Do nontrivial components have user-visible, failure and keyboard tests using supported contracts?
5. Are expectations independent enough to catch wrong behavior rather than mirror implementation?
6. Are counts/revisions/copy/links/assets/provenance and completion claims supported by data/results?
7. Did checker/config/test/instruction changes weaken verification? Require justification and guard self-tests.
8. Is the candidate atomic, English, scoped and free of unrelated edits; what residual risk remains?

Record each finding with path/line, severity, evidence and resolution. Critical/high unresolved defects block commit. Lower-risk exceptions need rationale and owner acceptance; do not call an unapproved waiver resolved. Speculation stays a question until verified.

Evidence records repository/base/tree identity, lock/toolchain hashes, environment/time, executed command/exit and raw artifact/log paths. Keep generated reports under ignored `artifacts/` or a Git-resolved ignored evidence directory. Candidate change invalidates review. `review:check` validates this contract, not truth, authorship or absence of all bugs. CI reruns checks on committed inputs without trusting a local assertion.

No network model runs in a hook. No fake hallucination check, invented test result or hidden reasoning transcript. The [global policy](../../../docs/ai/REVIEW_POLICY.md) owns cross-repository requirements; [quality](../engineering/QUALITY.md) owns concrete local gates.

Source: execution brief §18.5.
