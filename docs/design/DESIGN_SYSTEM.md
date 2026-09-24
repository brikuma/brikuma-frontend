# Design system

ID: FE-DESIGN-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

The current visual language is a compact professional design workspace: neutral light-gray and white surfaces, graphite text, one restrained indigo accent, quiet separators and a dominant model canvas. The owner's later September 24 review rejected the earlier warm/teal interface as retro; [FE-DEC-011](../DECISIONS.md#fe-dec-011-contemporary-workspace-stud-feedback-and-authored-assemblies) supersedes that interface direction. Model materials retain their own colors. Avoid official brand packaging, toy-shop primaries, neon, glass, decorative analytics and oversized marketing headings.

## Semantic tokens

`src/styles/tokens.css` is the intended single source. Map runtime variables through Tailwind v4 `@theme inline`; do not scatter literal hex values through components.

| Token                                        | Specified value                   |
| -------------------------------------------- | --------------------------------- |
| background / surface / surface-muted         | `#F5F6F8` / `#FFFFFF` / `#EEF0F4` |
| foreground / muted-foreground                | `#20212B` / `#626775`             |
| border / control-border                      | `#E2E5EB` / `#858C9A`             |
| primary / primary-hover / primary-foreground | `#5550D8` / `#4440BD` / `#FFFFFF` |
| primary-muted / selection                    | `#EEEDFC` / `#6960E8`             |
| accent / accent-foreground                   | `#5550D8` / `#4944BD`             |
| warning / warning-muted                      | `#955B00` / `#FFF1DA`             |
| success / success-muted                      | `#176844` / `#E5F2E9`             |
| danger / danger-muted                        | `#B33B3B` / `#FCECEC`             |

These are specified tokens, not proof of every combination's contrast. Verify actual states, opacity and boundaries. Status needs text/icon/shape in addition to color. Render colors are resolved through an explicit adapter rather than fed as unresolved CSS variables to Three.js.

## Type, rhythm and motion

Use the platform system-sans stack without a downloaded font dependency. Prefer weights 400/500/600/700, tabular quantities and system monospace part IDs/shortcuts. The hierarchy uses page headings around 24–28px, section headings 16–20px, panels and body 14px, and compact labels 12px, expressed in rem. Body line height is 1.5. Essential copy never falls below 12px. Use sentence case and normal tracking for metadata rather than pervasive uppercase labels.

Spacing uses 4/8/12/16/24/32/48px rhythm. Compact buttons and icon controls are 36px; canvas icons are 32px and form fields default to 40px. Important touch actions aim at least 44px; smaller controls retain the applicable 24px minimum target and sufficient spacing. Radii are 4/6/10px. Use small consistent shadows and restrained floating tools, rather than oversized pill cards. Motion lasts around 120–180ms and respects reduced motion; no perpetual decorative animation.

The shared header is 48px and the desktop navigation rail 56px. Project navigation is a compact segmented control. The desktop workbench uses 232px/256px left/right panels, growing to 248px/272px on wide screens, with collapsible panels and independent scrolling. The home page is a project library with equal blank-canvas and brief entries, working search/category filters and lightweight model cards. Responsive geometry is owned by [responsive/accessibility](RESPONSIVE_ACCESSIBILITY.md).

Use Grid/Flex, `min-w-0`, `min-h-0`, `dvh` and container queries. Complete utility names stay statically discoverable. Dynamic part colors/panel widths use validated CSS custom properties. Keep custom CSS for specific geometry/print needs.

Related: [component contracts](COMPONENTS.md), [responsive/accessibility](RESPONSIVE_ACCESSIBILITY.md), [provenance](../references/README.md). Source: execution brief §§7–9.

## Studio revision visual target

The owner-supplied September 24 references establish the model-quality target: visible masonry seams, recessed openings, layered roofs, convincing vegetation silhouettes, gentle plastic highlights and soft shadows that ground the model. Their earlier warm interface palette is superseded by the current neutral/indigo workspace. These are generated concept images, not evidence of an existing working renderer or physically verified model.

Use a large, useful viewport with compact tools, quiet side panels and a collapsed optional sample assistant. Model scale and framing must respond to the actual visible bounds. Provide named views, fit controls, optional grid, hover/selection feedback, explicit placement preview/cancel, numeric alternatives to dragging, single-brick underside inspection and authored assembly separation. Building and inspecting take priority over marketing copy or repeated capability notices. The original approximation catalog remains labeled truthfully; supported nominal stud feedback is distinct from physical validation.

Acceptance requires inspecting both the courtyard and a blank construction journey in the running browser. A build pass cannot establish shadow quality or interaction feel. Record observed dimensions/browser, failed attempts and unmeasured GPU performance separately.
