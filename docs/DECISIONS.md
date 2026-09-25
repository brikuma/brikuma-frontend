# Frontend decisions

ID: FE-ADR-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

## FE-DEC-001 Static browser-local architecture

Status: adopted specification. Retain Next.js App Router and Tailwind v4 with a static export. Narrow client boundaries own interactivity; no backend impersonation is introduced. Link [global scope decision](../../docs/DECISIONS.md#brk-dec-003-frontend-only-scope) and [local architecture](engineering/ARCHITECTURE.md).

## FE-DEC-002 Cohesive local Model Editing core

Status: adopted specification. Begin with one cohesive context for model identity, transforms, protection, revisions, history, BOM and sample compatibility. Extract another module only for implemented independent responsibility. No repository/service abstraction or future billing/security aggregate is needed. See [core](engineering/CORE.md) and [patterns](engineering/PATTERNS.md).

## FE-DEC-003 Original deterministic geometry

Status: adopted specification. Use original approximate demo bricks with stable logical IDs. Stud meshes and helpers never inflate quantities. Lightweight local posters are separate from interactive renderer/data imports. No manufacturer catalog, snapping/physics correctness or LDraw provenance claim is made. See [fixtures](engineering/FIXTURES.md).

## FE-DEC-004 Font and reference fallback

Status: initial fallback, supplemented by the September 24 studio references in [provenance](references/README.md). The originally named local screenshot and Word binaries remain unavailable; four shared image references were inspected for the studio revision. D1/D2 content was subsequently supplied as Markdown and is now mapped under FE-DEC-013 below; D3 remains unavailable. Use a system-sans stack until an exact licensed Manrope asset is verified; no unverified substitute or runtime font CDN. See [global source decision](../../docs/DECISIONS.md#brk-dec-002-executable-source-baseline).

## FE-DEC-005 Local state lifetime

Status: specified; extended by FE-DEC-013. Edits persist across client-side project routes in a lightweight session owner. Brief metadata and local references share the project-session lifetime while remaining separate from model geometry/revisions and browser preferences. Full reload resets them; this limitation is visible. Instructions and reports retain baseline revision identity after edits. See [fixture integrity](engineering/FIXTURES.md) and [scope](product/FRONTEND_SCOPE.md).

Exact dependency selections/alternatives belong to [dependency evidence](engineering/DEPENDENCIES.md), not duplicated here. Any later deviation records its reason, consequence and evidence before acceptance. Global topology/permissions remain owned by the [root decision index](../../docs/DECISIONS.md).

## FE-DEC-006 npm tooling override

Status: adopted by explicit subsequent user instruction. Use npm commands, exact supported Node/npm versions, local dependency installation and `package-lock.json`. `npm ci` is the reproducible frozen-lockfile installation. No global packages/settings or root shared runtime are permitted. This supersedes the initial pnpm requirement; see [global decision](../../docs/DECISIONS.md#brk-dec-005-npm-and-no-global-installations).

## FE-DEC-007 Narrow accessible primitive foundation

Status: selected implementation approach; API/test evidence remains in dependencies/acceptance. Use native input/select controls for simple interactions and an audited Radix Dialog composition for modal focus behavior. No shadcn CLI or component-source copy is required for these implemented controls. This retains one primitive foundation while avoiding unused registry components. Related: [dependencies](engineering/DEPENDENCIES.md), [component contracts](design/COMPONENTS.md).

## FE-DEC-008 Supported Webpack build in this environment

Status: implemented after observed environment failure. The default Next.js Turbopack worker attempted a prohibited/broken bind in this environment even after an approved retry. Use the installed release's documented `next dev --webpack` and `next build --webpack` paths; a production static build passed. This changes the bundler invocation, not the frontend-only/static-export boundary. Final post-fix builds still require rerun; see [acceptance](delivery/ACCEPTANCE.md).

## FE-DEC-009 Studio rendering and direct manual editing

Status: owner-requested revision, 2026-09-24. The owner rejected the initial visual/interaction quality and explicitly prioritized both manual building and detailed 3D presentation. Retain the installed Three.js/Fiber renderer: inspection found simplified scene geometry, lighting and interaction, not an established renderer capability limit. Build original detailed geometry, balanced studio lighting, contact/cast shadows, beveled parts and useful camera controls before considering an engine replacement. No new rendering dependency is required. The second pass uses installed Three.js GTAO/OutputPass in the Studio tier, retaining direct rendering in Balanced and Performance tiers; exact API and disposal evidence is recorded in the dependency document.

The [editing scope](product/FRONTEND_SCOPE.md) now includes explicit preview placement, quarter-turn rotation, duplication, numeric transforms and a single history entry per completed drag. Domain validation/protection/history remain in the pure core; temporary hover/ghost/camera states stay in presentation. The sample assistant yields space to manual construction. Visual target and inspected references belong to [design](design/DESIGN_SYSTEM.md) and [provenance](references/README.md). Tests and visual measurements must be recorded in [acceptance](delivery/ACCEPTANCE.md); the request alone is not evidence of completion.

## FE-DEC-010 Nominal brick proportions and inspectable connectors

Status: owner-requested refinement, 2026-09-24. The owner identified unrealistic connector spacing and missing underside cavities and confirmed that both require correction. Standard brick and plate dimensions use the nominal ratios in the [LDraw file-format specification](https://www.ldraw.org/article/218.html): stud pitch 1, brick body height 1.2, plate body height 0.4, stud diameter 0.6 and stud height 0.2. Original procedural meshes remain authored here; no third-party part meshes, logos or manufacturer's verification are implied. Custom architectural details remain explicitly approximate.

Rectangular brick/plate shells and the studded round brick have open undersides, inset ceilings and support tubes or pins. Wall thickness, bevels and clearances are visual approximations. The catalog and sample assemblies must agree with their declared dimensions; mesh detail never increases logical piece counts. A single-brick inspection mode reuses the existing canvas, permits orbit underneath and preserves model/history state. Standard rectangular footprint placement follows the support's stud-grid phase, including odd/even dimensions and quarter turns; numeric transforms retain free-form editing. This geometric alignment is not a connection, collision, strength or buildability certification. [Component contracts](design/COMPONENTS.md) and [fixture integrity](engineering/FIXTURES.md) own the concrete behavior.

## FE-DEC-011 Contemporary workspace, stud feedback and authored assemblies

Status: owner-requested revision, 2026-09-24. The owner rejected the interface as retro and requested a substantially more modern site, clearer nominal brick connections and useful assembly inspection. The [design system](design/DESIGN_SYSTEM.md) now uses a compact neutral-gray/white shell, graphite text and restrained indigo accent. Smaller shared navigation and panels give more space to the model; the home page is a practical project library with equally visible blank-canvas and project-brief entries. This supersedes the earlier warm/teal interface direction without recoloring model materials or changing frontend-only scope.

The supported catalog exposes nominal stud/receiver sites through pure [core queries](engineering/CORE.md). Snap to studs and Ground placement use contact feedback and conservative occupied-body checks; the explicit Free mode permits deliberate composition. Numeric X/Z coordinates accept tenth-stud increments; Y accepts twentieth-stud increments so thin parts can rest exactly on the ground. Ordinary model commands retain free-form behavior, protection and history invariants; neither contact coincidence nor those bounds constitute a comprehensive collision solver, strength analysis or physical certification.

Assembly views use authored fixture metadata, not inferred construction order: Roof access lifts an intact roof module, while Assembly separates defined modules using a 0–100% display offset and guide lines. Dimensions are hidden during separation, unassigned local parts remain in place, and reassembly preserves every model coordinate, count and revision. Single-brick underside inspection continues to reuse one canvas. [Component contracts](design/COMPONENTS.md) own the exact controls; [frontend scope](product/FRONTEND_SCOPE.md) preserves the static, local, no-real-AI boundary. Executed validation and visual evidence belong to acceptance rather than this decision.

## FE-DEC-012 Bounded local modeling workbench

Status: implemented continuation under specialist execution brief 1.0.0 (2026-09-24). Extend the existing Model Editing context and Three/Fiber renderer. Keep original stud-unit, Y-up, quarter-turn canonical values; an explicit proper-rotation LDraw point adapter documents the external basis without migrating every existing sample. [Modeling](editor/MODELING.md) owns supported material volumes, connector candidates, group protection, commands, experiment revisions and local-file validation. The strict `place` command and its preview share pure validation; ordinary transforms remain explicitly free-form drafts.

The owner's latest specialist brief requests warm ivory/graphite/teal editor art direction. Scope those semantic variable values within the existing token owner to the workbench; preserve other product pages and model colors. Native bounded panel-width controls provide keyboard resizing without a custom drag engine or new dependency. Build/Inspect/Present, camera/navigation and view layers share one session. [Experience](editor/EXPERIENCE.md) and [rendering](editor/RENDERING.md) own the exact contracts.

Retain exact runtime dependencies, static export, audited Dialog, hooks and CI gates. Local images and versioned project files are explicit browser operations, with no uploads or automatic persistence. Original fixtures and bounded connector support do not establish manufacturer equivalence or physical fitness. A revolute pose study is blocked by unavailable verified hinge metadata. [Evidence](editor/EVIDENCE.md) records actual validation and limitations; [requirements](editor/README.md) distinguish implementation, measurement and deferred P2 scope.

## FE-DEC-013 Product continuity and supplied baseline alignment

Status: owner-authorized frontend follow-up, 2026-09-24; execution evidence recorded separately. The supplied D1/D2 v0.0.3 Markdown restores direct traceability to the original product requirements and invariants. [Baseline alignment](product/BASELINE_ALIGNMENT.md) owns that mapping; [sources](SOURCES.md) distinguishes the newly supplied content from still-unavailable Word binaries and D3. The later frontend-only boundary remains authoritative for implementation scope.

Keep free-form building and assisted design visible together. Restore the explicit pre-authored roof comparison with base-revision/protection checks; unsupported models show an honest no-sample state. Expose Brief, Workbench, Instructions and Parts inventory directly in project navigation, outside the local-file dialog. Retain separate brief intent, visual language, construction system, technique, intended use and constraints, plus local images/PDF metadata and manual image calibration, in the existing route-keyed browser session. This repairs continuity without introducing real AI or a backend.

The existing project slots remain `blank`, `masseria`, `rover` and `creature`; this change does not introduce arbitrary project identities or a durable project library. Editing the brief changes metadata, not geometry revision/BOM. Loading a replacement scene/model clears its prior brief/reference context; restoring the same scene baseline preserves that context. Removing files or ending the provider lifetime releases local object URLs. Reload clears the session. Scene JSON downloads preserve supported geometry and identity but exclude brief, reference bytes/calibration, undo and instruction/editorial documents; the UI must state this boundary.

Alternative rejected: a detached brief and hidden downstream routes leave the idea-to-model-to-output journey disconnected even when each page is locally functional. This decision preserves existing manual tools and limits the change to session continuity and reachable flows. Broader source requirements such as real parts, SNOT/Technic, generation, a full BuildPlan and commerce remain explicit partial/deferred coverage in the [capability table](product/FRONTEND_SCOPE.md#capability-coverage). Revisit those boundaries only with a separately scoped capability, provenance and verification plan. Do not inherit historical passing checks for changed code; [acceptance](delivery/ACCEPTANCE.md) and [editor evidence](editor/EVIDENCE.md) own actual results.

## FE-DEC-014 Manual building feedback and nominal attachment review

Status: owner-authorized correction following the live farmhouse walkthrough, 2026-09-24; final browser and deterministic results belong to [editor evidence](editor/EVIDENCE.md). Positioning a decorative door beside a wall did not create an attachment, and the original receiving slopes advertised nominal sockets without being accepted by strict Connect. Correct the implemented construction path rather than treating visual proximity or a successful scene edit as a connection.

Extend the existing pure placement kernel with explicit original receiving-slope profiles and one closed framed-door assembly. Share their nominal material descriptions with the renderer, retain unsupported decorative pieces as drafts, and keep transform validation consistent between preview and commit. The [modeling contract](editor/MODELING.md) owns profile bounds, graph semantics and remaining limitations; no manufacturer equivalence, opening mechanism, physical validation or purchase integration is introduced.

Derive per-instance contact paths to the ground and keep them separate from overlap diagnostics. Show exact scene quantities and actionable instance review in inventory, rather than an undifferentiated required-parts list that can appear ready to purchase. The [capability table](product/FRONTEND_SCOPE.md#capability-coverage) retains the limits on catalog provenance and commerce. [Experience](editor/EXPERIENCE.md) owns nonmodal compact panels, repeat placement, automatic live rendering during building and explicit download feedback. No new dependency or backend is required.

## FE-DEC-015 General-purpose workspace and local instruction drafts

Status: owner-requested revision, 2026-09-24. The owner requested simpler controls and camera interaction, centimeters, floating tools like the supplied image, working instructions and clearer disassembly. They explicitly reaffirmed a general-purpose brick design product; the courtyard is an acceptance example, not the product scope. The shared product conversation (private reference URL withheld) and visual reference (private reference URL withheld) were inspected. Concept images are not implementation or physics evidence.

[Design system](design/DESIGN_SYSTEM.md) owns the neutral/deep-green tokens, quiet panels and floating tools. [Experience](editor/EXPERIENCE.md#general-purpose-workspace-follow-up) owns progressive disclosure, general free-form entry, optional architecture templates, instructions and reverse previews. [Modeling](editor/MODELING.md#nominal-centimeters-and-optional-architecture-templates) owns nominal units and the bounded deterministic construction shortcut. [Core](engineering/CORE.md#local-construction-and-instruction-queries) owns generation, exact identities, revision guards and immutable command behavior. This supersedes the earlier UI palette and the deferral of all local instruction generation, while retaining the exclusion of real AI, validated assembly planning and physical certification. No new runtime dependency is introduced.

## FE-DEC-016 Discover and resume browser-session work

Status: incremental frontend UX follow-up, 2026-09-25. A live agent walkthrough found that a one-piece scratch model disappeared from the workspace list while **Start from scratch** silently resumed it. The [workspace screen contract](design/SCREENS.md#workspace-session-discovery) now requires lightweight current-model and brief-only summaries, truthful resume actions and a single searchable view of session work and unopened samples. Resume navigation uses the slot identity; displayed model metadata uses the current model. Reading summaries must not initialize geometry.

The existing local-session and file-download boundaries remain in force. This slice does not introduce autosave, arbitrary project creation or renaming. The [incremental UX review](product/UX_REVIEW.md) records observed friction and the remaining backlog; [acceptance](delivery/ACCEPTANCE.md) records executed validation. An agent walkthrough is not a human usability study or an exhaustive product audit.

## FE-DEC-017 Simple manual building and current-model instructions

Status: owner-requested frontend usability follow-up, 2026-09-25. The owner confirmed the two-piece connector placement now behaves correctly and prioritized remaining friction in building from scratch, camera tools, disassembly and instructions. Preserve the existing pure geometry rules. Improve the complete beginner journey through validated initial attachment previews, explicit placement, direct floor/attachment controls and collapsed numeric details. A missing valid candidate remains a blocked Connect preview; no silent Free fallback or model mutation is introduced.

Use one camera input map with explicit **Orbit**, removing the device preset chooser. Make **Disassemble** open all current model layers at full separation, while roof access remains a separate authored action. The Instructions route starts with current-model generation or its existing draft; original sample instructions are opt-in. Schematic 3D/top views, step-specific framing and translucent previous pieces improve legibility without claiming exact geometry or verified build order.

The [experience contract](editor/EXPERIENCE.md) owns these interaction rules and the [screen contract](design/SCREENS.md#beginner-building-and-model-derived-output) owns route behavior. The [source record](references/README.md#september-25-product-and-competitor-conversations) records the two complete rendered conversations inspected in Chrome and their verification limits. They reinforce free-form design, one structured editable model behind parts/instructions, distinct design axes and independent diagnostics. Future assistance and instruction editing remain backlog, with no backend or AI expansion. [UX review](product/UX_REVIEW.md) tracks remaining friction; [acceptance](delivery/ACCEPTANCE.md) owns executed evidence. This slice is not product usability certification.

## FE-DEC-018 Readable sections and editable instruction drafts

Status: owner-authorized next frontend slice, 2026-09-25. The full Masseria separation remained too dense after FE-DEC-017. Default **Disassemble** to one current-model layer at a time, starting at the top, with direct layer navigation and an optional all-layer overview. Restore prior hide/focus choices when returning to the assembled model. This supersedes FE-DEC-017's all-layer default, while retaining its roof-access distinction and canonical-model invariants. [Experience](editor/EXPERIENCE.md#inspection-changes-and-local-artifacts) owns section navigation and framing.

Add a bounded instruction-authoring journey around the existing local draft: names/notes, adjacent order changes, strict-subset splits, merge-next, saved 3D/top views and independent editorial undo/redo. Focus diagrams on the current additions by default and page long step rails. Regeneration explicitly replaces edited content only after confirmation; stale guides remain readable from their source snapshot. The [core contract](engineering/CORE.md#instruction-editing-and-history) owns exact membership/history, and the [interaction contract](editor/EXPERIENCE.md#local-instruction-drafts-and-disassembly) owns confirmation, limits and session lifetime. This supersedes the deferral of all instruction editing, not the deferral of a physical assembly planner.

The [capability table](product/FRONTEND_SCOPE.md#capability-coverage) retains the boundaries: no named-subassembly sequencing, arbitrary camera authoring, automatic reconciliation after model edits, instruction-package export or production booklet. Height ordering and manual rearrangement do not prove physical buildability. No dependencies, backend, AI service or persistence layer are added. [UX review](product/UX_REVIEW.md) records remaining friction; [acceptance](delivery/ACCEPTANCE.md) records executed checks separately from these implementation rules.

## FE-DEC-019 Local project continuity and portable backups

Status: owner-authorized frontend continuation, 2026-09-25. Losing models, briefs and edited guides on reload prevents dependable use of the frontend. Restore the four existing project slots from IndexedDB before initializing fixtures and save current project documents locally with explicit pending, completed and failure feedback. Compare record versions within the write transaction; a second tab or corrupt saved record must never be silently overwritten. Keep a downloadable backup path when browser storage cannot save.

The [local-project contract](engineering/LOCAL_PROJECTS.md) owns storage lifetime, failure recovery, limits and formats. New `brikuma-project` version 1 files include the model, compact edited instruction steps and their source snapshot, brief, image bytes and manual calibration, plus PDF metadata. Existing `brikuma-scene` version 1 files remain importable. Derived guide claims are recomputed on import, complete membership is checked and stale sources are preserved. Browser records retain the reset baseline; portable imports establish their current model as the new baseline. Neither format persists undo history or camera state.

This supersedes the session-only lifetime and geometry-only download limitations of FE-DEC-005/013/016/018. It adds browser persistence and portable instruction data without changing the frontend-only boundary. It does not add a backend, cloud synchronization, arbitrary project library, automatic instruction reconciliation, physical validation or production booklet. No dependency changes are required. [Acceptance](delivery/ACCEPTANCE.md) records executed validation separately from these contracts.

## FE-DEC-020 Preserve placement intent during rotation and recovery

Status: owner-authorized frontend continuation, 2026-09-25. A production-browser walkthrough found three concrete beginner failures: rotating a pending Brick 1 × 2 on the floor invalidated its grid alignment; returning from On the floor to Attach to model retained an overlapping floor preview; Undo after duplication left a stale duplication message. Correct these interactions without changing canonical placement rules or ordinary free-form model transforms.

Pending quarter turns retain a stable positional intent and adapt the preview to its selected placement policy. Grid rotation respects the turned footprint; connected rotation searches locally at the same height around the original eligible support rather than jumping to another level or a distant piece. Four successive turns without a position change return to the original preview. Free rotation preserves the center. Returning to Attach proposes a nearby valid connection when available, preserving the chosen part, color and orientation. Unavailable connections remain visibly blocked; there is no silent Free fallback. Only explicit placement changes the model and history. Undo/Redo feedback describes the resulting model instead of retaining a previous action's notice.

The [building-loop contract](editor/EXPERIENCE.md#the-building-loop) owns visible behavior, while [preview intent](editor/MODELING.md#placement-intent-and-preview-recovery) distinguishes presentation guidance from the existing core validation. The [UX review](product/UX_REVIEW.md#fifth-slice-rotate-and-recover-a-placement-preview) records the observed cases and remaining mixed-piece journey gaps. [Acceptance](delivery/ACCEPTANCE.md) owns executed checks; this narrow correction does not add a general movement solver, physical validation, backend or dependency.

## FE-DEC-021 Preview and apply single-piece repositioning

Status: owner-authorized frontend continuation, 2026-09-25. The next production-browser walkthrough placed a Brick 1 × 2 on a Plate 4 × 4, then used the selected-piece Rotate action. The action committed immediately and the reported contacts fell from two to zero. Source inspection also found that the ordinary half-stud Move path can detach an aligned single piece. Extend the beginner placement interaction to an existing single piece rather than silently treating its primary Move/Rotate controls as unrestricted transforms.

Single-piece Move and Rotate open a shared placement preview. The canonical source remains in the model until explicit application; there is no intermediate remove/add or new identity. The destination uses its stated placement policy and the same validation as the preview. Acceptance relocates the source atomically, preserving its identity, part definition, color, group and scene quantity. Cancel preserves the complete model and history. Stale or protected edits fail without mutation, and real obstacles remain checked even when hidden.

This narrows the primary single-piece interaction, not the free-form design capability. Advanced position controls, explicit Free placement and rigid multi-selection/group transformations retain draft semantics. Moving one piece does not move pieces resting on it or prove the remaining assembly supported. The [relocation contract](editor/MODELING.md#single-piece-relocation), [core operation](engineering/CORE.md#single-piece-relocation) and [experience contract](editor/EXPERIENCE.md#the-building-loop) own the boundaries. The [sixth UX slice](product/UX_REVIEW.md#sixth-slice-reposition-a-placed-piece) records observed failures separately from [executed acceptance](delivery/ACCEPTANCE.md). No backend, dependency, physical solver or automatic assembly repair is introduced.
