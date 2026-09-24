# Frontend source register

ID: FE-SRC-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

Reference date: 2026-09-24. The supplied execution brief 1.1.0 is the executable product/frontend source. The [global register](../../docs/SOURCES.md) records unavailable original documents, the absent screenshot and unrecovered ChatGPT share. No original Word feature mapping is asserted.

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
