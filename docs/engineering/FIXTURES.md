# Fixture and revision integrity

ID: FE-DATA-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

Fixtures are passive deterministic presentation inputs with fixed logical IDs and dates, not services. Core operations receive them through public APIs and never import fixture files. Lightweight project-list metadata must not transitively import full scenes or renderer code.

Provide three visibly different original scenes: brick-built courtyard (light walls, entrance, teal doors/windows, terracotta roof, studs/seams, courtyard, restrained brick vegetation), mechanical rover and creature/sculpture. Approximate parts use `demo-*` IDs, not verified manufacturer IDs. The actual instance count is derived rather than copied from an illustrative reference.

Required quantities group logical instances by definition/color. Stud bodies, selection helpers and meshes do not add parts. Exploded view, camera, selection, visibility and step navigation do not change quantities/revision. Supported model edits do change local revision; undo restores state and the correct compatibility relationship. Protected groups reject changes until explicitly unprotected, including sample variants.

Pre-authored instruction steps and example reports retain baseline revision references. After edits, instructions are stale and checks are not run for the current model. A pre-authored variant applies only against its declared compatible base and never silently overwrites an incompatible session. Core owns these decisions.

Illustrative owned stock, people, roles, comments, listings, prices or allowance values must be marked examples. No real personal data is used. Digital listing assets are public/demo-safe; hiding a link is not access control. Counts shown as computed must derive from the selected scene, including after cross-route navigation.

References allow up to six PNG/JPEG/WebP images or PDF metadata files, each at most 10MB. Validate type/size/count, show decode failure, revoke object URLs on removal/unmount/reset, never persist/log raw contents. PDFs are not rendered or parsed. UI preferences alone may use a versioned safely parsed browser key. Full reload resets session models unless persistence is explicitly implemented/tested/labeled.

Related: [core](CORE.md), [scope](../product/FRONTEND_SCOPE.md), [provenance](../references/README.md), [acceptance](../delivery/ACCEPTANCE.md). Source: execution brief §§12–13, 17.

## Current implemented fixture sources

[Project metadata](../../src/fixtures/projects.ts) stays lightweight and allowlists `masseria`, `rover`, `creature`, and `blank`; unknown query values carry a visible-fallback flag. [Scene loading](../../src/fixtures/load-scene.ts) dynamically imports only the selected fixture. The original scenes are [courtyard](../../src/fixtures/scenes/masseria.ts), [rover](../../src/fixtures/scenes/rover.ts), [creature](../../src/fixtures/scenes/creature.ts), and [blank](../../src/fixtures/scenes/blank.ts). [Catalog values](../../src/fixtures/catalog.ts) supply the supported demo policy.

The [preview generator](../../scripts/generate-previews.mjs) derives SVG posters/instruction previews and [lightweight counts](../../src/fixtures/scene-counts.json) from the same deterministic logical instances. Current baseline counts are 1,171 courtyard, 44 rover, 38 creature, and 0 blank; unit tests must verify these cached counts against source. These are logical parts, not meshes.

[Session ownership](../../src/features/editor/state/session.tsx) is shared across routes and delegates model commands/history to core. [Reference picker](../../src/features/project-brief/reference-picker.tsx) owns File objects/object URLs separately, clears them when leaving the brief, and displays that lifetime. [Reference tests](../../tests/component/references.test.tsx) are the relevant behavioral check; execution status remains in acceptance.

The studio courtyard is revision `masseria-r4`, with instruction sample `masseria-instructions-r4`. It includes an enclosed rear room with a removable compact roof, an open barred arch gate, recessed windows, a tower and tall chimney, supported exterior stairs, pergola, rounded olive canopy, upright vines, hollow planters and cactus pots. The room contains simple furniture visible with the roof lifted. The authored terrace alternative removes 55 roof parts and adds 20, yielding 1,136 logical parts; the tower roof and chimney stay in place.

Standard brick/round-brick height is 1.2 stud pitches, plate/tile height 0.4, with the nominal ratios and original-geometry limitations in [FE-DEC-010](../DECISIONS.md#fe-dec-010-nominal-brick-proportions-and-inspectable-connectors). The 67-definition catalog also contains custom architectural and plant approximations. Rectangular and round brick undersides have real cavities and support geometry. House base/floor connector phase agrees with the wall/stair grid; supporting floor locations use studded plates, while exposed paving remains smooth. [Assembly regressions](../../tests/unit/fixture-assembly.test.ts) check selected support, body-overlap and ground-clearance invariants; they are not a full buildability or strength analysis.

Rover and creature are coherently restacked as `rover-r2` and `creature-r2` after the dimensional correction. The wheel axes match its rendered horizontal cylinder (1.2 wide, 2 high, 2 deep). All posters and counts are regenerated from these fixtures; no static concept image stands in for the interactive model.

The final connector revision adds hollow two-pier stone portals (the two obsolete spandrel instances are removed), full receiving bases under all 16 roof beds and aligned roof grids. Pergola posts, lower beams and crossing slats use coordinated original tenon/groove geometry. Gate handles and flowers use tenth-stud coordinates to meet their supporting details. These authored assemblies do not certify custom foliage, hinges, strength or manufacturing fit.
