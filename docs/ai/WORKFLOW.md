# Agent implementation workflow

ID: FE-AI-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

1. Read actual parent/local instructions and relevant specs; record unavailable context. Inspect repository status, staged/unstaged changes and exact dependency versions.
2. Verify uncertain APIs using official version-matched documentation or local package declarations. Research dependencies before installation, including alternatives and license/advisory exposure.
3. Implement the smallest coherent vertical slice. Identify rule owner, reused/new pattern, tests and reason for abstraction. Keep core rules out of UI handlers.
4. Run applicable deterministic checks. Inspect the actual interface/screenshot for visual work and the production export/network boundary for runtime work.
5. Review exact candidate read-only through the [review protocol](REVIEW.md). Resolve critical/high findings; do not weaken tests or silently waive risks.
6. Update canonical specs, [traceability](../TRACEABILITY.md), [acceptance](../delivery/ACCEPTANCE.md) and factual [handoff](HANDOFF.md). Raw evidence remains ignored and contains no hidden reasoning or secrets.
7. Stage explicit coherent paths, capture the candidate tree, run commit gates and require fresh matching evidence. Relevant unstaged inputs cause non-destructive refusal. If anything changes, invalidate the review and recheck.
8. Commit in the owning repository only when authorized and identity exists. The root updates the integration pin last; no push is implied.

Related: [global review policy](../../../docs/ai/REVIEW_POLICY.md), [contributing](../../CONTRIBUTING.md), [local quality](../engineering/QUALITY.md). Source: execution brief §§6, 18–20.
