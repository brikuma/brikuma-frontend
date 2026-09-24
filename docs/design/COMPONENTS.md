# Product component contracts

ID: FE-COMP-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

These are responsibility contracts; concrete file names may be smaller compositions rather than a one-file-per-name scaffold. UI primitives remain product-agnostic. Prefer audited primitive behavior for focus/dialog/menu semantics and native browser controls for simple input.

| Component responsibility          | Inputs / owned state / events                     | Responsive, keyboard and failure contract                                                                                                                                   |
| --------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shell / project navigation    | Current route/project; navigation only            | Landmarks, skip link, active link; no renderer imports.                                                                                                                     |
| Project card / model poster       | Lightweight metadata, title, category, preview    | Semantic link/image alternative; bounded dimensions; missing-image fallback.                                                                                                |
| Reference picker                  | Allowed image/PDF File objects; add/remove/reset  | Labeled native file input; six/10MB limits; decode errors; URL cleanup.                                                                                                     |
| Constraint controls / brief       | Typed display intent, approach, limits/colors     | Explicit labels, numeric alternatives, independent visual/construction values.                                                                                              |
| Workbench / viewport toolbar      | Camera/exploded/quality/selection UI state        | Compact sheets/tabs; named icon buttons; reset and HTML fallback.                                                                                                           |
| Model viewport                    | Plain scene values, selection event               | One lazy canvas; studio/balanced/performance quality, orbit/zoom/fit and named views, placement preview and horizontal drag; accessible label, mobile activation and retry. |
| Part catalog / structure tree     | Search/filter, logical definitions/groups         | Color names, clear dimensions; visibility and core-backed protection.                                                                                                       |
| Selection inspector               | Selected logical ID and core outcomes             | Numeric grid transforms, quarter-turn rotation, duplication and keyboard movement; protected errors; no direct model mutation.                                              |
| Assistant/sample comparison       | Pre-authored variant and compatible base          | Explicit preview/apply/cancel; no arbitrary text interpretation; conflict preserved.                                                                                        |
| Revision / check cards            | Current and baseline revision, sample categories  | Not-run/stale/unsupported differentiated; no safety score.                                                                                                                  |
| Parts table                       | Derived BOM and illustrative owned                | Accessible headings, sort/filter states, color labels and no results.                                                                                                       |
| Instruction page / step navigator | Baseline steps, current revision and step/zoom UI | Buttons/keyboard navigation; stale banner and baseline relation.                                                                                                            |
| Review thread / listing preview   | Fictional content, local selected anchor/draft    | Focus context or navigate to object; no send/checkout success.                                                                                                              |

Nontrivial behavior needs Testing Library interaction tests and browser coverage for real focus/route/renderer behavior. Do not unit-emulate async Server Components. Tests select accessible roles/names and verify independent expected outcomes, including protected errors, cleanup, no results and stale revisions.

The editor catalog exposes chosen color, original demonstration IDs, nominal dimensions and separately labeled connector/diagnostic coverage. Search matches normalized names, IDs and category terms; All parts, Favorites, Recent and Currently used combine with category/search filters. The workbench owns in-memory preferences. Only committed catalog placement updates Recent; opening or cancelling a ghost does not. Color availability is not represented as manufacturer inventory.

The canonical [editor modeling contract](../editor/MODELING.md#placement-and-independent-coverage) owns Connect, Grid and Free position validation, anchors, supported occupied-material geometry and unknown coverage. The [experience contract](../editor/EXPERIENCE.md#the-building-loop) owns preview/commit/cancel, current workplanes and input behavior. Component copy must use these same policy names and must not confuse permission to commit an unverified draft with a passed geometric check.

Inspect selected brick isolates a logical instance in the existing canvas, fits it closely and permits orbit underneath. The original model, count and history remain unchanged. Ground, grid, contact shadow and selection outline are omitted in this view so the underside is readable. Select, Move, an assembly view, new placement or explicit exit restores the full model and fits it again. Invalid/lost selection exits safely. Equivalent part dimensions remain available in the HTML inspector.

Assembly presentation consumes authored fixture metadata tied to a model baseline. **Roof access** moves the complete authored roof module while leaving the rest assembled; **Assembly** separates defined modules along their individual offsets. A 0–100% Separation slider changes only display offsets; dashed guides show original anchors and Reassemble restores the display. Part positions, count, BOM, revisions and history remain unchanged. New parts without authored assignments remain in place. Missing or incompatible metadata does not imply a generated assembly plan. The display is not a verified build order.

Dimension guides derive from declared part bounds, and selected parts have equivalent HTML readouts. They do not present uncalibrated centimeter values. Dimensions are hidden and their toggle disabled during assembly separation so presentation offsets cannot be mistaken for the model's dimensions. Camera fit uses visible part extents and waits for orbit controls to initialize. Studio quality adds screen-space occlusion; Balanced and Performance retain the same logical scene with less rendering work.

Related: [screens](SCREENS.md), [accessibility](RESPONSIVE_ACCESSIBILITY.md), [quality](../engineering/QUALITY.md), [core](../engineering/CORE.md). Source: execution brief §§14–15.
