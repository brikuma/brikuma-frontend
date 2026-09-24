# Design system

ID: FE-DESIGN-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

The visual language is a warm, precise creative workbench: ivory surfaces, graphite type, teal actions, restrained terracotta details, fine separators and generous useful space. Avoid official brand packaging, toy-shop primaries, neon, glass, decorative analytics and oversized marketing headings.

## Semantic tokens

`src/styles/tokens.css` is the intended single source. Map runtime variables through Tailwind v4 `@theme inline`; do not scatter literal hex values through components.

| Token                                        | Specified value                   |
| -------------------------------------------- | --------------------------------- |
| background / surface / surface-muted         | `#F7F5F0` / `#FFFEFB` / `#EEECE5` |
| foreground / muted-foreground                | `#183237` / `#53666B`             |
| border / control-border                      | `#DDDAD2` / `#82938F`             |
| primary / primary-hover / primary-foreground | `#14675F` / `#0D514C` / `#FFFFFF` |
| primary-muted / selection                    | `#E4F0EC` / `#0F8F88`             |
| accent / accent-foreground                   | `#A65F43` / `#975439`             |
| warning / warning-muted                      | `#955B00` / `#FFF1DA`             |
| success / success-muted                      | `#176844` / `#E5F2E9`             |
| danger / danger-muted                        | `#B33B3B` / `#FCECEC`             |

These are specified tokens, not proof of every combination's contrast. Verify actual states, opacity and boundaries. Status needs text/icon/shape in addition to color. Render colors are resolved through an explicit adapter rather than fed as unresolved CSS variables to Three.js.

## Type, rhythm and motion

System sans is the current fallback pending verified Manrope acquisition. Prefer one font, weights 400/500/600/700, tabular quantities and system monospace part IDs/shortcuts. Sizes in rem: display 32/40, page 28/36, section 20/28, panel 16/24, body 15/24, compact 14/20, caption 12/18 px equivalents. Essential copy never falls below 12px.

Spacing uses 4/8/12/16/24/32/48px rhythm. Controls default to 40px; important touch actions aim at least 44px. Radii: 6/10/14px. Use small consistent shadows/z-index levels. Motion lasts around 120–180ms and respects reduced motion; no perpetual decorative animation.

Use Grid/Flex, `min-w-0`, `min-h-0`, `dvh` and container queries. Complete utility names stay statically discoverable. Dynamic part colors/panel widths use validated CSS custom properties. Keep custom CSS for specific geometry/print needs.

Related: [component contracts](COMPONENTS.md), [responsive/accessibility](RESPONSIVE_ACCESSIBILITY.md), [provenance](../references/README.md). Source: execution brief §§7–9.
