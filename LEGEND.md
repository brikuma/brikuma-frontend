# Frontend vocabulary

Owner: frontend. Status: specified. Baseline: consolidated v0.0.3. Shared status words are defined in the [global legend](../LEGEND.md).

| Term                  | Local meaning                                                                           |
| --------------------- | --------------------------------------------------------------------------------------- |
| Model Editing context | Pure aggregate and local use cases for the implemented bounded editing behavior.        |
| Logical part instance | Stable ID, demo definition/color and grid transform; independent of mesh/stud counts.   |
| Demo part definition  | Original approximate geometry, not a verified manufacturer catalog entry.               |
| Semantic subassembly  | Named collection such as roof or facade with explicit visibility/protection behavior.   |
| Protected group       | Core edit restriction; not authorization, security or a physical constraint.            |
| Revision reference    | Compatibility identity for a model state and anchored sample material.                  |
| Command               | One bounded local domain operation with explicit success/failure.                       |
| Memento/history       | Bounded snapshots supporting local undo and redo.                                       |
| BOM                   | Quantities grouped by logical part definition and color.                                |
| Sample variant        | Pre-authored change for a compatible base revision; never arbitrary AI generation.      |
| Instruction sample    | Curated baseline steps; edits can make it stale but do not regenerate it.               |
| Session               | In-memory local model state shared across client route navigation; reload may reset it. |
| UI preference         | Small non-sensitive browser setting, distinct from model or reference-file persistence. |

See [core specification](docs/engineering/CORE.md) and [documentation index](docs/README.md).
