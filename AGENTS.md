<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# BRIKUMA frontend instructions

## Read before changing code

1. In the intended checkout, explicitly read [../AGENTS.md](../AGENTS.md), [global architecture](../docs/ARCHITECTURE.md), [repository policy](../docs/REPOSITORIES.md) and [quality gates](../docs/QUALITY_GATES.md). A nested Git root may prevent automatic parent discovery; record what actually loaded. If missing in a standalone checkout, obtain approved governance before policy changes. Builds/tests remain standalone.
2. Read [local index](docs/README.md), [scope](docs/product/FRONTEND_SCOPE.md), [architecture](docs/engineering/ARCHITECTURE.md), and relevant screen/component specification.
3. For core work read [core instructions](src/core/AGENTS.md), [core contracts](docs/engineering/CORE.md) and [patterns](docs/engineering/PATTERNS.md).
4. Before dependencies, read [dependency evidence](docs/engineering/DEPENDENCIES.md). Before a commit read [workflow](docs/ai/WORKFLOW.md), [quality](docs/engineering/QUALITY.md), [review protocol](docs/ai/REVIEW.md) and [contributing](CONTRIBUTING.md).

## Local constraints

- Implement a static Next.js App Router application (`output: 'export'`). Keep routes/layouts compositional and client boundaries narrow. No backend routes/actions, fake services, AI runtime or request-time business logic.
- Use npm with this repository's `package-lock.json`; no system-global package installation. The later user override supersedes the brief's pnpm choice.
- All frontend commands run here with this repository's manifest and lockfile. No root workspace, hoisting assumption or cross-repository source import.
- Model invariants, commands, revision compatibility, history and BOM belong in pure `src/core`. Consumers use deliberate `public.ts` exports. UI state does not own domain rules.
- Core has no React/Next/Three, DOM/Node/browser globals, fixtures, storage, uncontrolled time/randomness or `.tsx`. Expected errors are explicit outcomes and inputs immutable.
- Heavy renderer and selected fixture data load only at the scene boundary. The shared session survives client navigation without importing every scene or the renderer.
- Use semantic Tailwind v4 tokens, accessible primitives and English centralized copy. Scope keyboard shortcuts; provide HTML alternatives to the canvas.
- Counts derive from logical instances. Visual helpers do not count as parts. Examples/reports/instructions retain baseline revision identity after edits.
- Read exact installed library APIs. Do not cast away invented contracts or suppress failing rules to manufacture a pass.
- Every visible control navigates, changes local state or truthfully explains an unavailable capability. No fake send/save/payment/generation/validation success.
- Keep evidence honest in [acceptance](docs/delivery/ACCEPTANCE.md), [traceability](docs/TRACEABILITY.md) and [handoff](docs/ai/HANDOFF.md). Actual commands, errors, environment and limitations matter more than checkbox counts.

[Frontend vocabulary](LEGEND.md) · [Local decisions](docs/DECISIONS.md)
