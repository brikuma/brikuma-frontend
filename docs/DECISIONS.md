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
