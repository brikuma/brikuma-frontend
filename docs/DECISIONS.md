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

Status: adopted fallback. No reference image/Word documents were supplied. Use the verbal warm-studio direction. Use a system-sans stack until an exact licensed Manrope asset is verified; no unverified substitute or runtime font CDN. See [provenance](references/README.md) and [global source decision](../../docs/DECISIONS.md#brk-dec-002-executable-source-baseline).

## FE-DEC-005 Local state lifetime

Status: specified. Edits persist across client-side project routes in a lightweight session owner. Full reload resets them; this limitation is visible. Files are session-local and separate from scene/preference state. Instructions and reports retain baseline revision identity after edits. See [fixture integrity](engineering/FIXTURES.md).

Exact dependency selections/alternatives belong to [dependency evidence](engineering/DEPENDENCIES.md), not duplicated here. Any later deviation records its reason, consequence and evidence before acceptance. Global topology/permissions remain owned by the [root decision index](../../docs/DECISIONS.md).

## FE-DEC-006 npm tooling override

Status: adopted by explicit subsequent user instruction. Use npm commands, exact supported Node/npm versions, local dependency installation and `package-lock.json`. `npm ci` is the reproducible frozen-lockfile installation. No global packages/settings or root shared runtime are permitted. This supersedes the initial pnpm requirement; see [global decision](../../docs/DECISIONS.md#brk-dec-005-npm-and-no-global-installations).

## FE-DEC-007 Narrow accessible primitive foundation

Status: selected implementation approach; API/test evidence remains in dependencies/acceptance. Use native input/select controls for simple interactions and an audited Radix Dialog composition for modal focus behavior. No shadcn CLI or component-source copy is required for these implemented controls. This retains one primitive foundation while avoiding unused registry components. Related: [dependencies](engineering/DEPENDENCIES.md), [component contracts](design/COMPONENTS.md).

## FE-DEC-008 Supported Webpack build in this environment

Status: implemented after observed environment failure. The default Next.js Turbopack worker attempted a prohibited/broken bind in this environment even after an approved retry. Use the installed release's documented `next dev --webpack` and `next build --webpack` paths; a production static build passed. This changes the bundler invocation, not the frontend-only/static-export boundary. Final post-fix builds still require rerun; see [acceptance](delivery/ACCEPTANCE.md).
