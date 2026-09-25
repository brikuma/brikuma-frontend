# User journeys

ID: FE-FLOW-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

| Journey                                                             | Meaningful result                                                                           | Important failure/state                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Workspace → sample → roof → variant → apply → undo                  | Same model session, explicit pre-authored comparison, reversible local edit                 | Protected facade and incompatible-base conflicts are visible.                                      |
| Start from scratch → add → select → recolor/move → remove/undo      | Genuine blank entry with derived quantities                                                 | Unsupported transform/protected edit returns an explicit error without mutation.                   |
| Current model → Generate instructions → steps/views → edit → return | Model-derived draft preserves its source; changes mark it stale until explicit regeneration | Empty models cannot generate; height-ordered schematic steps do not prove physical assembly order. |
| Original sample instructions → steps/zoom → edit geometry → return  | Opt-in sample retains its original model revision and becomes stale                         | Keep the baseline labeled; generate a separate current-model draft to include edits.               |
| Brief → choose separate design axes → add references → open editor  | Brief and local images/PDF metadata remain attached to the selected local project           | No analysis, geometry generation or constraint enforcement; failed local saves need a backup.      |
| Editor reference board → inventory/instructions → return            | Selected images and manual calibration survive navigation and successful local saves        | Removing a reference releases it; project backups include image bytes and calibration.             |
| Inventory → search/color/view/sort                                  | Scene-derived grouped quantities and illustrative owned/missing                             | Empty/no-results clearly distinguish from missing data.                                            |
| Community → project → revision-linked review                        | Fictional reviewer/author, part/step context and proposed correction                        | Comment remains an unsent local draft.                                                             |
| Marketplace → listing detail → included files                       | Distinguish digital instructions from physical bricks                                       | Checkout unconnected; no fake transaction.                                                         |
| Direct route/query → reload/back/forward                            | Static shell and restored browser-local projects                                            | Unknown fixture falls back visibly.                                                                |
| WebGL unavailable → retry/fallback                                  | Navigation, parts and instructions remain useful                                            | Poster/HTML selection replaces unavailable canvas without claiming rendered 3D.                    |

Workbench, instructions and parts inventory must be reachable through direct project navigation; opening file management is not a prerequisite. Assisted design retains an accessible, truthfully labeled pre-authored preview alongside free-form work. A changed base revision or protected affected group prevents sample application; the rejection does not alter model state.

Keyboard journeys use visible focus and semantic controls. At compact widths, sheets/tabs replace squeezed sidebars. See [screens](../design/SCREENS.md), [accessibility](../design/RESPONSIVE_ACCESSIBILITY.md) and [acceptance](../delivery/ACCEPTANCE.md). Source: execution brief §§10, 19; D1 PF02/PF04/PF05/PF08/PF15 and UC01/UC05/UC07 mapped in [baseline alignment](BASELINE_ALIGNMENT.md). The continuity follow-up requires fresh checks; historical evidence does not validate these changed journeys automatically.

## Local save, recovery and portable backup

Creating or editing a model, brief or guide saves that project in this browser after a successful IndexedDB transaction. Reload restores the latest completed snapshot before a route may open its default sample. The workspace also discovers brief-only saved work without loading scene geometry. **Download project** preserves the model, edited guide and its source, brief, image references and calibration in a portable file; legacy geometry-only files still open. Undo/redo histories and camera state restart on reload or import.

A failed or conflicting save leaves the current work open and the prior saved copy untouched. Users can retry an available local save or download a backup; a conflict never silently overwrites another tab. File replacement validates the complete package before asking to replace occupied work, including instruction-only edits. Cancel retains the full current project. The [local-project contract](../engineering/LOCAL_PROJECTS.md) owns boundaries and limits; [acceptance](../delivery/ACCEPTANCE.md) records executed evidence.
