# Frontend source register

ID: FE-SRC-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

Reference date: 2026-09-24. The supplied execution brief 1.1.0 and later owner instructions define the frontend assignment. The owner subsequently supplied the two v0.0.3 Markdown documents below. They now ground the [D1/D2 frontend alignment](product/BASELINE_ALIGNMENT.md); their original IDs are mapped without claiming full product delivery. The [global register](../../docs/SOURCES.md) owns cross-repository provenance, and [asset provenance](references/README.md) records the later inspection of the shared visual references.

| Supplied baseline                                              | Inspection and use                                                                                                                                                                 | Remaining limit                                                                                    |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| D1: `01_BRIKUMA_Prodotto_Requisiti_Business_v0.0.3.md`         | Supplied Markdown read for product intent, F01–F72, PF01–PF16 and UC01–UC18; relevant frontend mapping recorded.                                                                   | Product requirements are broader than the current frontend-only implementation.                    |
| D2: `02_BRIKUMA_Architettura_Contratti_Affidabilita_v0.0.3.md` | Supplied Markdown inspected for model/commands, catalog/capabilities, references, revision invalidation, BOM/instructions, interoperability, INV01–INV24 and applicable standards. | Proposed contracts are not proof that a backend, physical validator or production pipeline exists. |
| D3: delivery, gates and acceptance companion                   | Not supplied in this task.                                                                                                                                                         | Original D3 user-story/test/gate completion is not asserted.                                       |

The original Word binaries and the initially named local FORMA screenshot are still absent. That historical file absence no longer means D1/D2 product content is unavailable. The supplied Markdown is source material, not a shipped application asset; private attachments are not copied into the public demo.

Version-specific framework, packages, tool APIs, issues/advisories and licenses are tracked in [dependency evidence](engineering/DEPENDENCIES.md); do not infer their review from this link list.

| Reference                                                                          | Purpose                                     | Review status in documentation pass                                           |
| ---------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| [Next static export](https://nextjs.org/docs/app/guides/static-exports)            | Build-time rendering/export boundary        | Supplied reference; implementation agent must verify exact installed release. |
| [Tailwind theme variables](https://tailwindcss.com/docs/theme)                     | Semantic CSS-first tokens                   | Supplied reference; exact installed API verification in dependencies.         |
| [React purity rules](https://react.dev/reference/rules)                            | Pure rendering/hooks                        | Supplied primary reference.                                                   |
| [R3F performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)           | On-demand rendering/instancing              | Supplied primary reference; implementation-specific review required.          |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/)                                          | AA target and interaction criteria          | Official recommendation opened; no conformance claim.                         |
| [Testing Library principles](https://testing-library.com/docs/guiding-principles/) | User-visible behavioral tests               | Supplied primary reference.                                                   |
| [Web Vitals](https://web.dev/articles/vitals)                                      | Field targets distinct from lab diagnostics | Supplied reference; no field dataset exists.                                  |

Source existence does not validate a claim. Record actual installed API evidence, local package declarations and observed command results in their owners. Related: [asset provenance](references/README.md), [acceptance](delivery/ACCEPTANCE.md).
