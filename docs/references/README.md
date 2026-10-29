# Reference and asset provenance

ID: FE-ASSET-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

| Input / asset class                   | Provenance and intended use                                                                            | Status                                                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| FORMA editor reference                | Expected root input `references/forma-editor-reference.png`; direction only, never embed as app UI     | Absent at inspection; not reviewed.                                                                                                         |
| v0.0.3 product/architecture documents | D1 and D2 supplied later as Markdown; preserve source identity and summarize relevant facts in English | Supplied content now reviewed for [frontend alignment](../product/BASELINE_ALIGNMENT.md). Original Word binaries and D3 remain unavailable. |
| Shared ChatGPT reference              | Supplied link (private reference URL withheld)                                                         | Inspected in Chrome at 100% image zoom during the studio revision.                                                                          |
| Demo model geometry                   | Original deterministic purpose-built approximations                                                    | Implemented original fixture sources; no official catalog verification.                                                                     |
| Model previews/instruction renderings | Must derive from same original scene data                                                              | Generated SVG projections from original scene fixtures; no AI images or official scans.                                                     |
| Typography                            | System-sans fallback; optional verified Manrope with exact asset/OFL retained                          | System sans selected; no font downloaded.                                                                                                   |
| Icons                                 | Exact audited icon package and license in dependency register                                          | See [dependencies](../engineering/DEPENDENCIES.md).                                                                                         |
| UI component source                   | Official shadcn registry only if copied; record exact provenance and source review                     | No copied shadcn source/CLI used; native controls and Radix Dialog composition selected.                                                    |

No official LEGO marks, packaging, private user content or third-party instruction scans are supplied. Everything shipped must be safe as public demo content. See [third-party notices](../../THIRD_PARTY_NOTICES.md), [security](../../SECURITY.md), [fixtures](../engineering/FIXTURES.md) and [global sources](../../../docs/SOURCES.md).

Source: execution brief §§1, 7, 12, 17.

Current asset implementation: [generator](../../scripts/generate-previews.mjs), [scene sources](../../src/fixtures/scenes), [preview directory](../../public/assets/previews), and [scene-derived counts](../../src/fixtures/scene-counts.json). The generator projects brick bodies/studs into original SVG files and step images; it does not acquire external model assets. Asset fidelity and rendered behavior still require visual acceptance evidence.

## September 24 studio references

The owner supplied three additional ChatGPT shares. Direct web retrieval failed, but all three were opened and visually inspected through the owner's Chrome session on 2026-09-24:

- Mockup UI Brickly: Costruisci e Condividi (private reference URL withheld): multi-screen board with Mediterranean house, model-first editor, compact property panel and instruction layout.
- Dashboard Brickly: idee in mattoncini (private reference URL withheld): all five images inspected across the two visual passes, showing detailed cream masonry, terracotta roofing, recessed openings, fine foliage, soft ground shadows and compact catalog/editor layouts. The last three also show assembly-focused selection, precise transforms and instruction sequences; their illustrative success/validation labels are not implemented as real checks.
- Specifiche UX/UI di Brickly (private reference URL withheld): product overview board inspected visually; tiny embedded specification text was not treated as a verified technical contract.

These are generated concept images and visual direction only. They are not embedded as application UI or evidence of physical correctness. BRIKUMA remains the product name. Original geometry and functioning browser controls must carry the visual direction.

The owner repeatedly re-supplied the Masseria Mediterranea reference (private reference URL withheld), inspected in Chrome at 100% image zoom. The detailed target includes an enclosed courtyard, tall front wall with an open barred teal gate, recessed windows, enclosed rear room with a compact removable roof, tower, exterior stair/parapet, irregular cream/tan/gray paving, fine olive foliage and climbing plants. The owner also explicitly requested visible separation around studs and underside cavities. Its dimension annotation informs real model-unit guides; the image's centimeter values, piece count and validation claims are not copied as verified application data. The image was not downloaded into the shipped assets.

Standard brick proportions are informed by the dimensional facts in the [LDraw coordinate/unit specification](https://www.ldraw.org/article/218.html), inspected on 2026-09-24. Geometry is original procedural code, not imported LDraw part data. Nominal dimensions and their limits are recorded in [FE-DEC-010](../DECISIONS.md#fe-dec-010-nominal-brick-proportions-and-inspectable-connectors).

The owner also authorized reading the private ChatGPT project “Lego Builder.” Its project index, visible mockup prompts and the “Ramo · Progettare app Lego” discussion were read. The latter reinforces free-form creation and distinct model/core/rendering responsibilities. The mockup thread's assistant response bodies were not exposed in the rendered page, so their full specifications are not claimed reviewed. No private conversation export or personal account data is shipped. Current task instructions and repository scope remain authoritative over earlier project discussions.

The application [icon.svg](../../src/app/icon.svg) is an original geometric cube mark authored for BRIKUMA. It replaces the scaffold favicon; the five default public scaffold logos/illustrations were removed. The icon contains project-owned vector geometry and no external brand mark or acquired asset. The final static build and independent archived-candidate build passed with this original icon.

## Latest general-purpose UX clarification

The owner supplied the shared product conversation (private reference URL withheld) and reaffirmed general-purpose brick modeling with optional assistance. The rendered v0.0.2/v0.0.3 discussion and its free-form scope were read; linked document attachments are not claimed newly downloaded or fully inspected. The Mediterranean reference image (private reference URL withheld) was inspected at full resolution for layout, floating controls and model material direction. Its project, price and validation labels remain illustrative. No reference bitmap is shipped in the application. [FE-DEC-015](../DECISIONS.md#fe-dec-015-general-purpose-workspace-and-local-instruction-drafts) records the applied scope and design decision.

## September 25 product and competitor conversations

Both complete rendered conversations below were inspected through Chrome on 2026-09-25 during the owner-authorized frontend continuation. Attached documents were not inspected in this pass. The chats are supplied product input; statements about competitors, their current capabilities, prices or underlying sources were not independently reverified.

- Product idea and structured project discussion (private reference URL withheld): keep free-form design first-class, retain a canonical structured editable project rather than treating chat text as model truth, connect model/parts/instructions, and separate visual style, construction system, use and constraints. Future assistance should respect versions, protected work and reviewable previews. The current pass applies the manual placement and current-model output implications only.
- Competitor and design-tool discussion (private reference URL withheld): treat digital fit and physical buildability as separate questions; make part discovery useful; keep diagnostics distinct; develop instructions around subassemblies and preserve editorial changes. These are product directions and backlog inputs, not verified claims that BRIKUMA or any competitor already implements them.

[FE-DEC-017](../DECISIONS.md#fe-dec-017-simple-manual-building-and-current-model-instructions) and the [UX backlog](../product/UX_REVIEW.md#follow-up-backlog) record applied and deferred work. No chat export, attachment, account data or verbatim conversation content is shipped in the product. Frontend-only scope and the current user's instructions remain authoritative.
