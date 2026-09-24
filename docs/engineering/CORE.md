# FE-CORE-001 · Model Editing core

Owner: frontend. Scope: browser-local model operations. Status: implemented; test execution is recorded in [acceptance](../delivery/ACCEPTANCE.md). Baseline: frontend execution brief 1.1.0 / consolidated product v0.0.3. Related: [architecture](ARCHITECTURE.md), [patterns](PATTERNS.md), [fixtures](FIXTURES.md), [core instructions](../../src/core/AGENTS.md).

The single implemented bounded context is **Model Editing**. Catalog presentation and instruction samples do not require independent aggregates: parts are supported value definitions, and an instruction sample refers to a model revision. Future commerce, AI, authentication, collaboration delivery, and physical validation have no core implementations.

## Ubiquitous language

| Term                  | Meaning                                                                                                                                                                                                                      |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Model                 | Aggregate owning part instances, subassemblies, and the current geometry revision.                                                                                                                                           |
| Logical part instance | One counted demo part with a stable identifier. Meshes and studs never create inventory identities.                                                                                                                          |
| Subassembly           | A named group owned by one model, with explicit edit protection.                                                                                                                                                             |
| Part/color key        | Supported catalog identifiers, validated against a supplied editing policy. These are original demo IDs, not verified manufacturer catalog IDs.                                                                              |
| Grid transform        | Body-center position in stud units and a quarter-turn orientation. X/Z positions use tenth-stud increments and Y uses twentieth-stud increments; nominal standard brick and plate body heights are 1.2 and 0.4 stud pitches. |
| Baseline revision     | Identity of the curated original geometry.                                                                                                                                                                                   |
| Local revision        | Session-specific geometry identity, allocated by an explicit monotonic session counter. It is neither a timestamp nor a cloud version.                                                                                       |
| Sample variant        | Pre-authored removals/additions compatible with one exact baseline revision.                                                                                                                                                 |
| Memento               | An immutable-by-contract model snapshot used for bounded local history.                                                                                                                                                      |

## Public contract and dependencies

Consumers use [model/public.ts](../../src/core/model/public.ts). The API exposes `createModel`, `createSession`, `applyCommand`, `undo`, `redo`, `deriveBom`, `missingQuantity`, and `isInstructionCompatible`, with readonly TypeScript values and explicit result unions. Expected failures include protected groups, invalid transforms, unsupported catalog keys, duplicate IDs, missing instances, history exhaustion, and revision conflicts.

`previewVariant` validates the exact pre-authored command against a temporary session and returns only derived prospective quantities. It reuses command validation without changing the caller's model or history. Presentation consumes this result for compatibility, protection explanations, and counts instead of duplicating those rules.

The public API also exposes `getPartConnections`, `worldStudSites`, `findStudContacts` and `hasOccupiedStudSpace` from [connector queries](../../src/core/model/domain/connections.ts). These pure queries describe supported nominal stud/receiver sites, transform them through quarter turns, find coincident vertical contacts and check conservative occupied body bounds against catalog part bodies. They receive definitions/model values explicitly and do not mutate or validate an entire physical assembly. Decorative/custom details can have no supported socket. Coincidence is not proof of clutch, strength, collision-free geometry or manufacturability.

[Domain types](../../src/core/model/domain/types.ts), [validated construction](../../src/core/model/domain/model.ts), and [queries](../../src/core/model/domain/queries.ts) depend only on ECMAScript and other domain files. [Application commands](../../src/core/model/application/commands.ts) coordinate validation and history. No core operation imports fixtures, React, Next.js, Three.js, DOM, Node, storage, timers, HTTP, environment values, or randomness. No external capability is required, so no speculative port or repository exists.

[tsconfig.core.json](../../tsconfig.core.json) compiles the core using only the ES2022 library, `types: []`, strict mode, and no emitted code. Core tests live outside production source in [model.test.ts](../../tests/unit/model.test.ts).

## Invariants and operations

`createModel` validates unique identities, group ownership, allowed part/color keys, finite positions on a tenth-stud X/Z grid and twentieth-stud Y grid, demo bounds, and the piece limit. X/Z may be positive or negative within the supplied bounds; Y must be nonnegative and within bounds. It copies input collections and transforms; consumers must honor readonly contracts. The model does not enforce physical connections, collisions, stability, manufacturing dimensions or buildability.

An add/remove/recolor/translate/rotate/set-transform/duplicate or sample-variant operation validates the entire proposed aggregate before returning a new session. Duplication receives a new explicit identity and destination transform; it must respect source group protection and the aggregate piece limit. Rejected commands never mutate the input or advance history. A command touching a protected group fails until that group is explicitly unprotected. A sample variant checks both removed and added groups and applies in one history entry.

The specialist editor adds a strict `place` command with explicit Grid, Connect or Free policy and a base revision. [Placement feedback](../../src/features/editor/placement-feedback.ts) and commit call the same pure validation. Basic rectangular diagnostic material volumes include shells, voids and studs; unsupported shapes remain not checked. Ordinary numeric, rigid selection and duplication commands retain free-form draft behavior. The [modeling contract](../editor/MODELING.md) is authoritative for the bounded subset, grid anchoring, deterministic manual candidate list and diagnostic coverage.

Atomic selection commands, group nesting with ancestor protection/cycle rejection, same-footprint replacement and experiments extend this same context. Explicit local project parsing validates the complete schema before replacement; exhausted unsafe local revision counters are rejected. New IDs are supplied by the interaction owner after checking imported IDs. No render object or browser/file API enters core.

Geometry or color edits advance a monotonic local revision. Protection changes enter history but preserve geometry revision, because they do not change what an instruction page depicts. Visibility, selection, camera position, exploded layout, and instruction step are presentation state and never change the model or BOM.

History retains at most 40 preceding snapshots under the default editing policy. Undo restores the model and its original revision relationship; redo restores the edited snapshot. Editing after undo discards the redo branch and allocates a new revision. There is no per-pointer-event history or cloud persistence.

BOM quantity is the count of logical instances grouped by part and color IDs. Owned values are explicitly illustrative presentation data; missing quantity is `max(0, required - illustrativeOwned)`. Instruction compatibility compares the current model revision with the sample's referenced model revision. Curated instruction revision and model revision remain distinct labels.

## Context map and ownership

Next.js composition → feature/session presentation → core public API → application → domain. Browser adapters and Three.js translators consume public value types. Fixture authoring supplies deterministic input to the public factory and tests; the core never retrieves a fixture itself.

Rules and test coverage correspond to FE-005, FE-006, FE-008, FE-009, FE-012, FE-013, and FE-022. [Unit tests](../../tests/unit/model.test.ts) exercise behavior, rejected-command non-mutation, bounded history, compatible variants, full fixture validity, BOM totals, and the final instruction step's instance coverage. An import graph can enforce dependencies, but cannot prove semantic rule ownership; review remains required.

## Sources

The self-contained user execution brief is the executable requirement source. DDD terminology follows the provided primary references: [Domain Language reference](https://www.domainlanguage.com/ddd/reference/), [bounded contexts](https://martinfowler.com/bliki/BoundedContext.html), and the [dependency rule](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html). Folder names and this small functional implementation are project decisions, not requirements imposed by those authors.
