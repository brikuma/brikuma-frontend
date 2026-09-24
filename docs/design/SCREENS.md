# Route and screen contracts

ID: FE-SCREEN-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

All routes are static/noindex and use English copy. The persistent preview indicator is discreet. Shared route shells should not load all scene arrays or WebGL code. Allowlisted query-selected project routes use a scoped client boundary where required by the installed Next.js API.

| Route            | Required composition and local behavior                                                                                                                                                         | Unavailable/empty/error state                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/`              | Compact project library; equally visible scratch and brief entries; courtyard/rover/creature sample cards; local search/filter                                                                  | No-results with clear reset.                                                                                       |
| `/new`           | Scratch/reference/sample entries; subject, visual style, construction, piece/footprint/color/use constraints; local image/PDF metadata                                                          | Invalid/oversized/excess/undecodable file explanation; no analysis/upload.                                         |
| `/editor`        | Compact title/count/actions and segmented project navigation; parts/structure/brief left; large model with placement, inspection and assembly tools; selection/transforms/checks/activity right | Blank model, selection/protection, rejected placement, incompatible variant, WebGL fallback; no fake cloud status. |
| `/instructions`  | Thumbnail step rail, main page, previous/next, zoom, new-part tray, callout; model and instruction revisions distinct                                                                           | Baseline-only sample stale after edits; local print is layout preview.                                             |
| `/inventory`     | Demo identifier/color/required/owned/missing; thumbnails; search, color/view filters and sort                                                                                                   | Empty scene/no results; catalog/owned values illustrative.                                                         |
| `/community`     | Fictional curated models, subject/construction filters, details, build notes, attribution and revision review                                                                                   | No sending/invitations; draft visibly unsent.                                                                      |
| `/marketplace`   | Fictional digital listings, revision/pieces/included files/license-placeholder/instruction preview                                                                                              | No physical parts included; checkout outside POC.                                                                  |
| `/plans`         | Provisional Free/Creator concepts and optional future Team; useful intended free allowance                                                                                                      | Pricing to be validated; no billing or entitlement claim.                                                          |
| `/design-system` | Tokens/type/spacing/controls/dialogs/panels/table/status/focus/empty/error/state previews                                                                                                       | Deterministic scenario examples labeled component previews.                                                        |

The courtyard model remains prominent at 1440×900. Roof selection and a protected facade are explicit, not hidden demo facts. Instructions and inventory share local state through navigation. Browser reload may reset it; this must be stated.

Related: [user flows](../product/USER_FLOWS.md), [responsive/accessibility](RESPONSIVE_ACCESSIBILITY.md), [components](COMPONENTS.md). Source: execution brief §10.
