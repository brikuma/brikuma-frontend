# Pure Model Editing core

Read the [frontend entry point](../../AGENTS.md), then [core specification](../../docs/engineering/CORE.md).

- Production files are plain TypeScript, never TSX. Runtime dependencies are standard ECMAScript and permitted core modules only.
- Domain does not import application. Consumers import only `model/public.ts`.
- Never import fixtures, frameworks, browser APIs, storage, Node modules, clocks, timers, uncontrolled randomness, or test tooling.
- Accept external identifiers as explicit command values. Return typed failures without mutating the current model.
- Geometry changes, protected edits, BOM grouping, and revision compatibility belong here. Visibility, camera, hover and selection belong to presentation.
- Every changed invariant needs a pure test that covers rejection without mutation.
