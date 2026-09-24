# User journeys

ID: FE-FLOW-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

| Journey                                                        | Meaningful result                                                           | Important failure/state                                                          |
| -------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Workspace → sample → roof → variant → apply → undo             | Same model session, explicit pre-authored comparison, reversible local edit | Protected facade and incompatible-base conflicts are visible.                    |
| Start from scratch → add → select → recolor/move → remove/undo | Genuine blank entry with derived quantities                                 | Unsupported transform/protected edit returns an explicit error without mutation. |
| Baseline instructions → steps/zoom → edit geometry → return    | Baseline instructions retain their revision label and become stale          | Offer baseline view or return to editor; never claim regeneration.               |
| Brief → add/remove image/PDF references                        | Image preview or PDF name/type, in-memory only                              | Reject unsupported MIME/size/count; handle decode error; release URLs.           |
| Inventory → search/color/view/sort                             | Scene-derived grouped quantities and illustrative owned/missing             | Empty/no-results clearly distinguish from missing data.                          |
| Community → project → revision-linked review                   | Fictional reviewer/author, part/step context and proposed correction        | Comment remains an unsent local draft.                                           |
| Marketplace → listing detail → included files                  | Distinguish digital instructions from physical bricks                       | Checkout unconnected; no fake transaction.                                       |
| Direct route/query → reload/back/forward                       | Static shell and allowlisted fixture selection                              | Unknown fixture falls back visibly.                                              |
| WebGL unavailable → retry/fallback                             | Navigation, parts and instructions remain useful                            | Poster/HTML selection replaces unavailable canvas without claiming rendered 3D.  |

Keyboard journeys use visible focus and semantic controls. At compact widths, sheets/tabs replace squeezed sidebars. See [screens](../design/SCREENS.md), [accessibility](../design/RESPONSIVE_ACCESSIBILITY.md) and [acceptance](../delivery/ACCEPTANCE.md). Source: execution brief §§10, 19.
