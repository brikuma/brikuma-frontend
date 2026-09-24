# Frontend handoff

ID: FE-AI-003. Owner: frontend. Checkpoint: 2026-09-24, editor discovery and selection follow-up.

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
