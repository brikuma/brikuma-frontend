# Frontend architecture

ID: FE-ARCH-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

The App Router preserves Next.js conventions under `src/app`; routes/layouts compose features and contain no reusable model mutation/BOM/revision rules. Keep build-time Server Components where suitable and narrow client boundaries for local interactions/query parsing. Static export must not require request-time data services.

```text
app composition → feature presentation/session → core public application API → domain
browser/render adapters → permitted core value types
fixtures → passive values and permitted public core types
```

`src/core/model` is the initial cohesive Model Editing context. Its domain owns validated identity/transforms, supported edits/protection and quantities. Application operations own command/history/sample compatibility coordination. Consumers enter through `public.ts`. Separate catalog/instructions modules are justified only when behavior actually needs them. See [core](CORE.md) and [patterns](PATTERNS.md).

Core runtime uses only allowed core modules/ECMAScript: no frameworks, DOM/Node, renderer, storage, fixtures, network, clocks/randomness, timers or test tools. A DOM-free typecheck and import/syntax checks enforce mechanical boundaries. Graph rules must resolve aliases, relative bypasses, type-only imports, re-exports, dynamic imports, cycles, missing/undeclared modules and runtime dev/test dependencies. Negative fixtures prove guards can fail; semantic domain ownership still needs review.

`components/ui` is product-agnostic. Shell imports navigation contracts without heavy renderers. Presentation translates UI events into core calls; an in-memory session keyed by project ID persists snapshots through client navigation without importing all scenes. Camera/panel/tab/hover state is UI-only. Browser preferences use a small direct adapter; files remain separately in memory.

Scene rendering stays in `features/editor/scene`; selected scene data loads on demand. Logical identity is independent from mesh batch indices. Ordinary cards use lightweight local previews; no canvas per card. Adapters map core data to renderer values without Three types entering core.

There are no cross-repository TypeScript imports, fake services/repositories, DI containers, generic base entities or speculative ports. The frontend installs/builds independently. The [global architecture](../../../docs/ARCHITECTURE.md) owns shared principles; this page owns their frontend application.

Related: [fixtures](FIXTURES.md), [dependencies](DEPENDENCIES.md), [quality](QUALITY.md). Source: execution brief §§5.2–5.5, 13.
