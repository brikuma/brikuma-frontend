# Product component contracts

ID: FE-COMP-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

These are responsibility contracts; concrete file names may be smaller compositions rather than a one-file-per-name scaffold. UI primitives remain product-agnostic. Prefer audited primitive behavior for focus/dialog/menu semantics and native browser controls for simple input.

| Component responsibility          | Inputs / owned state / events                     | Responsive, keyboard and failure contract                                                  |
| --------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| App shell / project navigation    | Current route/project; navigation only            | Landmarks, skip link, active link; no renderer imports.                                    |
| Project card / model poster       | Lightweight metadata, title, category, preview    | Semantic link/image alternative; bounded dimensions; missing-image fallback.               |
| Reference picker                  | Allowed image/PDF File objects; add/remove/reset  | Labeled native file input; six/10MB limits; decode errors; URL cleanup.                    |
| Constraint controls / brief       | Typed display intent, approach, limits/colors     | Explicit labels, numeric alternatives, independent visual/construction values.             |
| Workbench / viewport toolbar      | Camera/exploded/quality/selection UI state        | Compact sheets/tabs; named icon buttons; reset and HTML fallback.                          |
| Model viewport                    | Plain scene values, selection event               | One lazy canvas; orbit/zoom/reset; accessible label, explicit mobile activation and retry. |
| Part catalog / structure tree     | Search/filter, logical definitions/groups         | Color names, clear dimensions; visibility and core-backed protection.                      |
| Selection inspector               | Selected logical ID and core outcomes             | Buttons/numerical grid transforms; protected error text; no direct model mutation.         |
| Assistant/sample comparison       | Pre-authored variant and compatible base          | Explicit preview/apply/cancel; no arbitrary text interpretation; conflict preserved.       |
| Revision / check cards            | Current and baseline revision, sample categories  | Not-run/stale/unsupported differentiated; no safety score.                                 |
| Parts table                       | Derived BOM and illustrative owned                | Accessible headings, sort/filter states, color labels and no results.                      |
| Instruction page / step navigator | Baseline steps, current revision and step/zoom UI | Buttons/keyboard navigation; stale banner and baseline relation.                           |
| Review thread / listing preview   | Fictional content, local selected anchor/draft    | Focus context or navigate to object; no send/checkout success.                             |

Nontrivial behavior needs Testing Library interaction tests and browser coverage for real focus/route/renderer behavior. Do not unit-emulate async Server Components. Tests select accessible roles/names and verify independent expected outcomes, including protected errors, cleanup, no results and stale revisions.

Related: [screens](SCREENS.md), [accessibility](RESPONSIVE_ACCESSIBILITY.md), [quality](../engineering/QUALITY.md), [core](../engineering/CORE.md). Source: execution brief §§14–15.
