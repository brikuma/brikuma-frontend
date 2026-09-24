# Frontend handoff

ID: FE-AI-003. Owner: frontend. Checkpoint: 2026-09-24, general-purpose workspace follow-up.

## General-purpose workspace checkpoint

The follow-up to `94ac671` implements [FE-DEC-014](../DECISIONS.md#fe-dec-014-manual-building-feedback-and-nominal-attachment-review) and [FE-DEC-015](../DECISIONS.md#fe-dec-015-general-purpose-workspace-and-local-instruction-drafts): nominal framed-door/slope connections and attachment coverage, an expanded general catalog, centimeters, quieter floating controls, optional building templates, local model-derived instruction drafts and generic layer separation. Free-form building remains the initial path. Real AI, manufacturer mapping, physical certification and durable persistence remain outside this frontend scope.

[Acceptance](../delivery/ACCEPTANCE.md#general-purpose-workspace-follow-up--2026-09-24) owns the completed working-tree checks, browser reruns, manual inspection, audit and limits. The authorized commit cycle runs fresh exact-staged verification and read-only review through `artifacts/quality/verification.json` and `review.json`; its resulting commit identity and actual hook output are recorded separately in `artifacts/ux-fixes/general-workspace-commit-manifest.json`. Earlier checkpoint counts below are historical and do not replace these records. The root has no changes or approved integration pins to commit. The staged review also corrected assembly-toggle closure after switching separation methods, Escape cancellation from the focused Select through chooser, and stale current-coverage descriptions. Focused regressions and renewed exact-candidate checks are recorded in the commit evidence.

## Previous product continuity checkpoint

The follow-up to `0af5d77` restores the reachable pre-authored assisted-design preview and direct Brief/Workbench/Instructions/Parts inventory navigation. Brief intent, style, construction system, technique, intended use and constraints remain separate. Each existing project slot retains its brief, local images, PDF metadata and manual calibration across client-side routes. Editing this context does not change geometry, quantities or revision. Explicit replacement clears it after confirmation, including metadata-only changes; reset preserves it. Reload clears it, and scene downloads explicitly exclude brief/reference context.

The supplied D1/D2 v0.0.3 Markdown now has a [requirement/invariant mapping](../product/BASELINE_ALIGNMENT.md); D3 is unavailable. The [capability table](../product/FRONTEND_SCOPE.md#capability-coverage) distinguishes the implemented subset from real parts, SNOT/Technic, real generation, general instruction planning and commerce. Those broader product requirements remain intact.

The [current execution ledger](../delivery/ACCEPTANCE.md#product-continuity-follow-up--2026-09-24) records 351 passing deterministic tests, final focused regressions, 40 browser journeys, 10 accessibility checks, a rebuilt static export, visual inspection and passing bundle budgets. Initial working-tree Node/npm were 22.23.3/12.1.0, not the declared pins; no dependency or lockfile changed. Independent code review findings were corrected. That checkpoint did not include a current audit or hardware measurements. Its identities and logs are recorded in `artifacts/continuity-manifest.json`. The subsequently authorized commit cycle uses fresh exact-staged verification/review under `artifacts/quality/`; resulting commit identities and actual hook logs belong to `artifacts/continuity-commit-manifest.json`.

## Previous editor checkpoint

The specialist editor was committed as `335a332`, followed by tracked pattern skills in `7fb1b97`. This follow-up extends that baseline with catalog search/favorites/committed recents, selection summaries, atomic multi-part duplication, persistent diagnostic drill-in and scoped shortcuts. A real short-window catalog/canvas stretching defect found during screenshot review was corrected with contained panel scrolling. Other product routes are preserved. The frontend remains an independent Git repository; no approved child remotes or root gitlinks exist. No push, remote creation, deployment, backend or infrastructure implementation is included.

## Current behavior

- Empty-scene building, original samples, stable surface picking, multi-selection, explicit groups/protection, atomic rigid edits and bounded undo/redo.
- Grid, Connect and Free previews share core validation. The declared rectangular subset has deterministic stud/receptacle candidates and render-independent occupied-volume checks. Custom geometry can remain not checked; physical stability and forces are not evaluated.
- Build/Inspect/Present share one canonical model. Focus, hiding, sectioning, explosion, curated steps and camera state are presentation layers.
- Real local experiments show exact impact and reject stale acceptance. Same-footprint replacement preserves instance identity and requires explicit acknowledgement for unknown compatibility.
- References stay local in memory. Versioned project files and 1024/2048-square PNGs are actual downloads, with no automatic model persistence or cloud claim.
- Original placement lab: 28 parts; courtyard study: 213; existing visual rover: 44. Deterministic 1,000/5,000-part stress fixtures are opt-in.

The [requirement register](../editor/README.md) maps EDR-001–036 to implementation and acceptance IDs. [Evidence](../editor/EVIDENCE.md) is the authoritative run ledger, with measured performance, visual artifacts and browser limits. The [modeling](../editor/MODELING.md), [rendering](../editor/RENDERING.md) and [experience](../editor/EXPERIENCE.md) documents explain actual contracts.

## Verification and review

Use the pinned existing Node 22.23.2 / npm 10.9.8 toolchain. No dependency or lockfile changed. Production and complete npm advisory audits reported zero known vulnerabilities in the specialist baseline; they were not repeated for this follow-up. The existing time-limited ESLint 9 maintenance exception remains in the [dependency register](../engineering/DEPENDENCIES.md). Existing architecture, hook and CI gates remain enabled.

Generated verification/review records in `artifacts/quality/` bind checks to the exact staged tree and lockfile. Source/build identities, command results and visual artifacts are in the evidence ledger; current raw files live under `artifacts/editor-ux/`. Independent review covers core boundaries, full-selection atomicity, hidden-member preservation, diagnostic focus, input ownership and code conventions. The exact commit/file inventory is generated after the child commit in `artifacts/editor-ux/delivery-manifest.json`.

## Remaining boundaries

EDR-029 is blocked by absent verified hinge geometry/pivot/axis/range metadata. No simulated mechanical validity is claimed. P2 remains deferred. Human participant count is zero; field performance, real iPad/touch/trackpad hardware and screen-reader behavior are not measured. Automated narrow layouts and WebKit are not device certification. Firefox launch availability and performance targets retain the actual statuses in evidence.

The later broad master prompt is only partially applied through this editor slice. Clipboard copy/paste, marquee selection, additional measurement workflows and product-page expansion have not been implemented here. Catalog preferences remain in memory; there is no added autosave, AI service or cloud persistence.

The next smallest unresolved editor risk is real-device touch/trackpad gesture arbitration. Dense connector/diagnostic query costs need separate workloads beyond the measured rendering and selection baseline. General magnetic screen-space snapping, free-angle gizmos, adaptive quality and arbitrary CAD support remain outside the declared bounded contracts.

Launch from this repository with `npm run dev -- --port 3000`, then open `/editor/?project=blank`. Production verification uses `npm run build` and `npm run preview` at port 4173. Explicitly download a project file to retain edits across reloads.
