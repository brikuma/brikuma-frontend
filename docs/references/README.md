# Reference and asset provenance

ID: FE-ASSET-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

| Input / asset class                   | Provenance and intended use                                                                        | Status                                                                                   |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| FORMA editor reference                | Expected root input `references/forma-editor-reference.png`; direction only, never embed as app UI | Absent at inspection; not reviewed.                                                      |
| Original v0.0.3 Word files            | Preserve originals and summarize relevant facts in English                                         | Unavailable; no original feature mappings.                                               |
| Shared ChatGPT reference              | Supplied link (private reference URL withheld)                          | Fetch unsuccessful; unreviewed.                                                          |
| Demo model geometry                   | Original deterministic purpose-built approximations                                                | Implemented original fixture sources; no official catalog verification.                  |
| Model previews/instruction renderings | Must derive from same original scene data                                                          | Generated SVG projections from original scene fixtures; no AI images or official scans.  |
| Typography                            | System-sans fallback; optional verified Manrope with exact asset/OFL retained                      | System sans selected; no font downloaded.                                                |
| Icons                                 | Exact audited icon package and license in dependency register                                      | See [dependencies](../engineering/DEPENDENCIES.md).                                      |
| UI component source                   | Official shadcn registry only if copied; record exact provenance and source review                 | No copied shadcn source/CLI used; native controls and Radix Dialog composition selected. |

No official LEGO marks, packaging, private user content or third-party instruction scans are supplied. Everything shipped must be safe as public demo content. See [third-party notices](../../THIRD_PARTY_NOTICES.md), [security](../../SECURITY.md), [fixtures](../engineering/FIXTURES.md) and [global sources](../../../docs/SOURCES.md).

Source: execution brief §§1, 7, 12, 17.

Current asset implementation: [generator](../../scripts/generate-previews.mjs), [scene sources](../../src/fixtures/scenes), [preview directory](../../public/assets/previews), and [scene-derived counts](../../src/fixtures/scene-counts.json). The generator projects brick bodies/studs into original SVG files and step images; it does not acquire external model assets. Asset fidelity and rendered behavior still require visual acceptance evidence.

The application [icon.svg](../../src/app/icon.svg) is an original geometric cube mark authored for BRIKUMA. It replaces the scaffold favicon; the five default public scaffold logos/illustrations were removed. The icon contains project-owned vector geometry and no external brand mark or acquired asset. The final static build and independent archived-candidate build passed with this original icon.
