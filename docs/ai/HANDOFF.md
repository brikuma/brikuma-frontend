# Frontend handoff

## Authorized placement commit checkpoint — 2026-09-25

The owner authorized a local frontend commit containing [FE-DEC-020](../DECISIONS.md#fe-dec-020-preserve-placement-intent-during-rotation-and-recovery) and [FE-DEC-021](../DECISIONS.md#fe-dec-021-preview-and-apply-single-piece-repositioning), including their tests and documentation. The two working-tree checkpoints below are historical development evidence for this combined candidate. Exact staged verification and independent review are recorded under ignored `artifacts/quality/`; the commit identity and actual pre-commit, commit-msg and committed-HEAD pre-push results are recorded separately in `artifacts/placement-commit/commit-manifest.json`. See the [commit acceptance record](../delivery/ACCEPTANCE.md#authorized-placement-commit-review--2026-09-25).

The integration root, backend, infrastructure and dependencies remain unchanged. No push or deployment is included. Next work remains multi-piece/group repair, support-dependent movement and instruction reconciliation; this commit does not claim a finished frontend product or physical assembly validation.

## Single-piece repositioning checkpoint — 2026-09-25

The continued uncommitted frontend work implements [FE-DEC-021](../DECISIONS.md#fe-dec-021-preview-and-apply-single-piece-repositioning). Primary Move/Rotate and single-piece arrow shortcuts now preview the destination before Apply move; Cancel preserves the original. A pure `relocate` command preserves identity, color, group, quantity and one-step history while checking the destination against the complete model except the source. Scoped target eligibility applies to both lists and pointer picking. Rotation after single-piece inspection waits for the parent editing lock, and queued requests cancel on renderer failure or interruption. Advanced numeric and rigid multi-selection/group edits remain explicit drafts.

[Acceptance](../delivery/ACCEPTANCE.md#single-piece-repositioning--2026-09-25) records **796 deterministic tests, 47 browser journeys and 10 automated accessibility checks**, a successful static build and bundle budgets, independent review and agent-operated production Chrome verification. Evidence, including initial failures and their final resolution, lives under ignored `artifacts/reposition-piece/`. The last commit remains `29568fd`; this slice and the preview-recovery slice below are uncommitted. No push, dependency, backend or other-repository edits occurred. Next: complete multi-piece/group repair and consider support-dependent movement, then meaningful instruction sections and reconciliation. Moving one piece does not guarantee that the remaining model stays supported or is physically buildable.

## Placement recovery checkpoint — 2026-09-25

The prior accumulated frontend changes are committed as `29568fd` (`feat(editor): improve building and preserve local projects`). Actual pre-commit, commit-msg and committed-HEAD pre-push checks passed, including 729 deterministic tests, 44 browser journeys and 10 accessibility checks; no push was performed. The owner then requested continued development. The subsequent uncommitted [FE-DEC-020](../DECISIONS.md#fe-dec-020-preserve-placement-intent-during-rotation-and-recovery) slice fixes pending brick rotation alignment and four-turn drift, recovers a nearby attachment after choosing the floor, and clears stale notices before Undo/Redo feedback. Preview changes preserve explicit Place and existing core validation.

[Acceptance](../delivery/ACCEPTANCE.md#placement-rotation-and-attachment-recovery--2026-09-25) records 754 deterministic tests, 45 production browser journeys, 10 automated accessibility checks, build/bundle success and independent production review. Agent-operated Chrome confirmed rotation, overlap recovery, duplication/history and a current-model guide without opening numeric placement controls. Evidence is under ignored `artifacts/placement-recovery/`; commit evidence remains separate. Dependencies and all other repositories are unchanged. Continue the [mixed-piece repair audit](../product/UX_REVIEW.md#follow-up-backlog) with offset attachments, dragging, selected-piece rotation, removal and keyboard recovery; do not imply that pending-preview improvements solve general movement or physical assembly planning.

ID: FE-AI-003. Owner: frontend. Checkpoint: 2026-09-25, local project continuity and portable backups.

## Authorized commit checkpoint — 2026-09-25

The owner authorized a local frontend commit of the accumulated usability and continuity slices. The [commit acceptance record](../delivery/ACCEPTANCE.md#authorized-local-commit-review--2026-09-25) distinguishes exact staged verification, independent review, actual hooks and final committed-HEAD gates from the earlier uncommitted checkpoints below. The root remains unchanged; no approved integration pin or push is included.

Review corrections reset reference-panel drafts after project replacement and keep edited step IDs/text within the portable format. Regressions cover importing a backup that reuses reference IDs and splitting a valid imported 128-character step identity before a backup round trip. Browser reference fixtures now contain valid PNG data; surface placement checks actual connector coordinates and preview/commit equality independently of camera quadrant. The changelog, canonical contracts and traceability accompany the same candidate. Final identity and actual hook results are in ignored `artifacts/local-projects/commit-manifest.json`; exact-tree check/review evidence remains in `artifacts/quality/`.

## Local project continuity checkpoint — 2026-09-25

[FE-DEC-019](../DECISIONS.md#fe-dec-019-local-project-continuity-and-portable-backups) adds IndexedDB restoration before fixture loading, serialized version-checked saves and clear pending/saved/error feedback. New project backups include the current model, edited guide and source snapshot, brief, validated image bytes and calibration, plus PDF metadata. Legacy scene files remain importable. Image decoding runs independently of the visible reference panel; restored object URLs are transient. Import validates the complete document before replacement, and conflicts preserve both the stored record and the open unsaved work.

[Acceptance](../delivery/ACCEPTANCE.md#local-project-continuity-and-portable-backups--2026-09-25) records 726 passing deterministic tests, fresh lint/build/format and bundle checks, and production Chrome reload, actual backup/import and two-tab conflict journeys, including a 390px inspection. Playwright/axe were not run; dependencies and backend remain unchanged. The [local-project contract](../engineering/LOCAL_PROJECTS.md) supersedes earlier session-only and geometry-only download statements in historical checkpoints below. No commit or staging occurred.

Storage remains local to the browser and origin, with four existing route slots. External backups remain necessary because browser data can be cleared; undo histories and camera state are not persisted. Follow the [UX backlog](../product/UX_REVIEW.md#follow-up-backlog) for mixed-piece building/repair, meaningful subassemblies and guide reconciliation, then arbitrary project identities/renaming and preferences. No physical buildability, finished production product or cloud service is claimed.

## Readable sections and editable steps checkpoint — 2026-09-25

[FE-DEC-018](../DECISIONS.md#fe-dec-018-readable-sections-and-editable-instruction-drafts) supersedes the earlier all-layer default: Disassemble isolates the highest layer, supports Previous/Next/direct choice and keeps the full overview optional. Instructions now support title/notes, saved 3D/top views, adjacent reorder, split/merge, forty-entry editorial history, current-step framing and a paged step list. Edited guides require explicit replacement before regeneration; the editor links back to review them. These operations preserve the canonical model and survive client navigation.

[Acceptance](../delivery/ACCEPTANCE.md#readable-sections-and-editable-steps--2026-09-25) records 648 passing deterministic tests, final focused review regressions, build/bundle checks and stable production Chrome desktop/mobile operation. Playwright/axe were not run; no commit, dependency or backend change occurred. The current [UX backlog](../product/UX_REVIEW.md#follow-up-backlog) retains mixed-piece building/repair, real assembly sequencing, meaningful subassemblies and guide portability. Height groups, local schematic drawings and manually edited order are not physical validation. Guide edits still clear on reload and are absent from scene downloads.

## Beginner building checkpoint — 2026-09-25

The current working tree also implements [FE-DEC-017](../DECISIONS.md#fe-dec-017-simple-manual-building-and-current-model-instructions): unified camera input, full layer separation at 100% with bounds-aware camera clipping, a validated initial attachment preview, and current-model instructions with 3D/top drawings. Selected-layer guides avoid a dense web of origin lines; changing tools cancels an active drag correctly. The canonical model and existing strict-placement rules remain authoritative. Both supplied product/competitor chats were inspected and recorded in [provenance](../references/README.md#september-25-product-and-competitor-conversations).

[Acceptance](../delivery/ACCEPTANCE.md#beginner-building-and-current-model-instructions--2026-09-25) records 623 passing deterministic tests, build/bundle checks, live Chrome scratch/Masseria journeys and 390px instruction inspection. Playwright/axe were not run. No commit or dependency change occurred. Next priorities are the mixed-piece beginner build-and-repair journey, readable sectional disassembly for large models and editable assembly steps. The earlier catalog-preference follow-up below is now lower priority; [UX review](../product/UX_REVIEW.md#follow-up-backlog) owns the current order. The generator remains a schematic height-ordered draft, not a verified physical assembly planner.

## Workspace rediscovery checkpoint — 2026-09-25

The current uncommitted follow-up implements [FE-DEC-016](../DECISIONS.md#fe-dec-016-discover-and-resume-browser-session-work): home now exposes loaded models and brief-only session work, uses current quantities/identity, and distinguishes resume actions from fresh entry. Search covers both current work and remaining sample slots. Model and brief state, history and reload boundaries remain unchanged. [Acceptance](../delivery/ACCEPTANCE.md#workspace-rediscovery--2026-09-25) records 594 passing deterministic tests, successful build/bundle checks, zero known audit findings and live Chrome desktop/390px journeys; Playwright/axe were not rerun. No commit, push or dependency change occurred.

The [incremental UX review](../product/UX_REVIEW.md) is the continuation list. Next: reproduce Favorites/Recent loss through normal project navigation, then preserve their intended lifetime. Creating and naming a second independent model remains a separately scoped product gap. These are agent observations and code findings, not participant research.

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
- Local browser saves and versioned project backups retain model, edited guide/source, brief, image references and calibration. PNG exports remain separate visual downloads; PDF references retain metadata only. There is no cloud storage.
- Original placement lab: 28 parts; courtyard study: 213; existing visual rover: 44. Deterministic 1,000/5,000-part stress fixtures are opt-in.

The [requirement register](../editor/README.md) maps EDR-001–036 to implementation and acceptance IDs. [Evidence](../editor/EVIDENCE.md) is the authoritative run ledger, with measured performance, visual artifacts and browser limits. The [modeling](../editor/MODELING.md), [rendering](../editor/RENDERING.md) and [experience](../editor/EXPERIENCE.md) documents explain actual contracts.

## Verification and review

Use the pinned existing Node 22.23.2 / npm 10.9.8 toolchain. No dependency or lockfile changed. Production and complete npm advisory audits reported zero known vulnerabilities in the specialist baseline; they were not repeated for this follow-up. The existing time-limited ESLint 9 maintenance exception remains in the [dependency register](../engineering/DEPENDENCIES.md). Existing architecture, hook and CI gates remain enabled.

Generated verification/review records in `artifacts/quality/` bind checks to the exact staged tree and lockfile. Source/build identities, command results and visual artifacts are in the evidence ledger; current raw files live under `artifacts/editor-ux/`. Independent review covers core boundaries, full-selection atomicity, hidden-member preservation, diagnostic focus, input ownership and code conventions. The exact commit/file inventory is generated after the child commit in `artifacts/editor-ux/delivery-manifest.json`.

## Remaining boundaries

EDR-029 is blocked by absent verified hinge geometry/pivot/axis/range metadata. No simulated mechanical validity is claimed. P2 remains deferred. Human participant count is zero; field performance, real iPad/touch/trackpad hardware and screen-reader behavior are not measured. Automated narrow layouts and WebKit are not device certification. Firefox launch availability and performance targets retain the actual statuses in evidence.

The later broad master prompt is only partially applied through this editor slice. Clipboard copy/paste, marquee selection, additional measurement workflows and product-page expansion have not been implemented here. Catalog preferences remain in memory. Project content now has browser-local autosave; there is no AI service or cloud persistence.

The next smallest unresolved editor risk is real-device touch/trackpad gesture arbitration. Dense connector/diagnostic query costs need separate workloads beyond the measured rendering and selection baseline. General magnetic screen-space snapping, free-angle gizmos, adaptive quality and arbitrary CAD support remain outside the declared bounded contracts.

Launch from this repository with `npm run dev -- --port 3000`, then open `/editor/?project=blank`. Production verification uses `npm run build` and `npm run preview` at port 4173. Check the local save status and explicitly download a project file as a separate backup. These two site origins have separate browser storage.
