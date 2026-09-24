# User journeys

ID: FE-FLOW-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

| Journey                                                            | Meaningful result                                                                           | Important failure/state                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Workspace → sample → roof → variant → apply → undo                 | Same model session, explicit pre-authored comparison, reversible local edit                 | Protected facade and incompatible-base conflicts are visible.                                     |
| Start from scratch → add → select → recolor/move → remove/undo     | Genuine blank entry with derived quantities                                                 | Unsupported transform/protected edit returns an explicit error without mutation.                  |
| Baseline instructions → steps/zoom → edit geometry → return        | Baseline instructions retain their revision label and become stale                          | Offer baseline view or return to editor; never claim regeneration.                                |
| Brief → choose separate design axes → add references → open editor | Brief and local images/PDF metadata remain attached to the selected project browser session | No analysis, geometry generation or constraint enforcement; reload clears session context.        |
| Editor reference board → inventory/instructions → return           | Selected images and manual calibration survive client navigation with the same project      | Removing a reference releases it; scene-file export does not include reference bytes/calibration. |
| Inventory → search/color/view/sort                                 | Scene-derived grouped quantities and illustrative owned/missing                             | Empty/no-results clearly distinguish from missing data.                                           |
| Community → project → revision-linked review                       | Fictional reviewer/author, part/step context and proposed correction                        | Comment remains an unsent local draft.                                                            |
| Marketplace → listing detail → included files                      | Distinguish digital instructions from physical bricks                                       | Checkout unconnected; no fake transaction.                                                        |
| Direct route/query → reload/back/forward                           | Static shell and allowlisted fixture selection                                              | Unknown fixture falls back visibly.                                                               |
| WebGL unavailable → retry/fallback                                 | Navigation, parts and instructions remain useful                                            | Poster/HTML selection replaces unavailable canvas without claiming rendered 3D.                   |

Workbench, instructions and parts inventory must be reachable through direct project navigation; opening file management is not a prerequisite. Assisted design retains an accessible, truthfully labeled pre-authored preview alongside free-form work. A changed base revision or protected affected group prevents sample application; the rejection does not alter model state.

Keyboard journeys use visible focus and semantic controls. At compact widths, sheets/tabs replace squeezed sidebars. See [screens](../design/SCREENS.md), [accessibility](../design/RESPONSIVE_ACCESSIBILITY.md) and [acceptance](../delivery/ACCEPTANCE.md). Source: execution brief §§10, 19; D1 PF02/PF04/PF05/PF08/PF15 and UC01/UC05/UC07 mapped in [baseline alignment](BASELINE_ALIGNMENT.md). The continuity follow-up requires fresh checks; historical evidence does not validate these changed journeys automatically.
