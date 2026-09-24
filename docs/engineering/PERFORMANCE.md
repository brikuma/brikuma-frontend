# FE-PERF-001 — Performance contract

Owner: frontend. Status: local production gzip/Lighthouse targets measured and passed; field and GPU metrics not measured. Baseline: execution brief 1.1.0. Related: [dependencies](DEPENDENCIES.md), [quality](QUALITY.md), [acceptance](../delivery/ACCEPTANCE.md), [index](../README.md).

Budgets: ordinary route initial JavaScript ≤250KiB gzip; editor shell ≤300KiB before WebGL; lazy 3D ≤900KiB; initial CSS ≤50KiB; initial selected-scene assets ≤2MiB; initial fonts ≤120KiB. System sans uses no downloaded font. Local SVG previews have fixed dimensions. Three/Fiber/Drei and scene arrays remain lazy at the workbench boundary; no dashboard card initializes WebGL. One active canvas, demand rendering and capped DPR are required.

`npm run perf:check` checks gzip sizes derived from actual exported route script/style references and dynamic chunk imports, `npm run perf:lighthouse` separately runs three Lighthouse13.5 production measurements each of workspace and community with installed Chrome. Static output must exist and `npm run preview` must be running. Reports include browser/user-agent, Lighthouse configuration, metric values, environment and revision; median metrics are summarized under ignored `artifacts/lighthouse/`; gzip budgets are under `artifacts/performance/`. Performance ≥95 is a project target; metric evidence remains available if unmet. Production interaction/network/browser journeys provide separate responsiveness evidence.

The targets LCP≤2.5s, INP≤200ms, CLS≤0.1 at field 75th percentile are not measured field compliance. Lighthouse TBT is not field INP. Shell LCP is not scene-ready. GPU fps and real-phone behavior remain not measured until an appropriate device/profile is recorded. No analytics/RUM service is connected.

Browser minimums: Next 16.3.6 documents Chrome/Edge 111+, Firefox 111+, Safari 16.4+. Tailwind 4's modern CSS floor includes Chrome 111+, Safari 16.4+, Firefox 128+. WebGL2 remains device-dependent. Product target is latest two stable Chrome/Edge/Firefox and currently supported Safari/iOS; actual tested versions belong in acceptance.

Sources: [Web Vitals](https://web.dev/articles/vitals), [Fiber performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance), [Tailwind compatibility](https://tailwindcss.com/docs/compatibility), [Next supported browsers](https://nextjs.org/docs/architecture/supported-browsers).

## Studio revision measurements — 2026-09-24

The final rebuilt studio output passed `npm run perf:check` at 2026-09-24T11:28:20.852Z: workspace JavaScript 192,601 bytes / 188.1 KiB gzip, editor shell 222,497 bytes / 217.3 KiB, initial CSS 8,338 bytes / 8.1 KiB, all remaining lazy chunks 416,853 bytes / 407.1 KiB as a conservative upper bound, and zero downloaded fonts. The courtyard SVG is 1,230,209 bytes raw / 198,393 gzip. Artifacts: `artifacts/performance/budgets.json` and `artifacts/studio-perf.log`. Profile: macOS 27.0 arm64, Node 22.23.3/npm 12.1.0; uncommitted tree based on `ad95c84`. The available toolchain differs from the pinned Node 22.23.2/npm 10.9.8. No budget failed.

The current fixture has 1,171 courtyard parts, a 1,136-part roof alternative, 44 rover parts and 38 creature parts, drawn from 67 definitions. [FE-DEC-011](../DECISIONS.md#fe-dec-011-contemporary-workspace-stud-feedback-and-authored-assemblies) adds the contemporary workspace, nominal stud placement and authored assembly inspection. These features do not certify physical assemblies. The renderer keeps one active canvas; underside inspection and authored module offsets do not create extra canvases or logical parts.

Studio quality adds owned GTAO/contact-shadow passes; Balanced/Performance render directly. Rendering remains demand-driven, with the studio composer DPR capped at 1.5. All three quality levels rendered successfully in the recorded 30-test production Chrome suite, which also checked same-origin asset loading and isolation of renderer/scene chunks from ordinary routes. This is functional evidence, not a measured frame-rate, scene-ready or latency claim. The deterministic suite passed 265 unit/component tests in 16 files; the final targeted responsive rerun passed 8/8 in 15.3 seconds after Structure count and capture corrections (`artifacts/studio-responsive-final.log`). Lighthouse, dependency audits and independent installation were not rerun for this revision; earlier measurements below describe the original checkpoint only. See [current acceptance](../delivery/ACCEPTANCE.md#current-studio-revision-evidence--2026-09-24).

## Initial implementation measurements (historical)

`npm run perf:check` produced `artifacts/performance/budgets.json` at 2026-09-24T08:30:00Z with zero budget failures. It sums gzip sizes of unique initial script/style URLs in each exported HTML page. Remaining output chunks are counted together as a conservative lazy-code upper bound; this does not claim they all transfer on one route or isolate Three.js exactly.

| Area                                   | Measured gzip size        | Target                       |
| -------------------------------------- | ------------------------- | ---------------------------- |
| Workspace initial JavaScript           | 191,487 bytes / 187.0 KiB | ≤250 KiB                     |
| Editor shell initial JavaScript        | 215,459 bytes / 210.4 KiB | ≤300 KiB                     |
| Initial CSS                            | 7,265 bytes / 7.1 KiB     | ≤50 KiB                      |
| All remaining lazy chunks, upper bound | 367,866 bytes / 359.2 KiB | Investigate 3D above 900 KiB |
| Downloaded fonts                       | 0 bytes                   | ≤120 KiB                     |

A timed production export completed in 2.7 seconds. The later final build and gzip check passed after the original SVG icon/scaffold-asset cleanup; `artifacts/final-build.log` retains build output. An independent candidate archive also passed offline installation, core typecheck/tests and static build with no parent dependencies. These results belong to tested working/candidate snapshots, not the initial scaffold commit or a completed final review.

`npm run perf:lighthouse` completed six sequential uncached production runs, three each for workspace and community, at 2026-09-24T08:22:47Z. Evidence: `artifacts/lighthouse/summary.json` and individual JSON/HTML reports. Profile: Lighthouse 13.5.0, installed Chrome 153 headless, desktop 1350×940 CSS viewport, simulated 40 ms RTT/10,240Kbps and 1× CPU, macOS/Darwin 27 arm64, Node 22.23.2.

| Route     | Median Performance / Accessibility / Best Practices | Median LCP | CLS | TBT  |
| --------- | --------------------------------------------------- | ---------- | --- | ---- |
| Workspace | 98 / 100 / 100                                      | 1,157 ms   | 0   | 0 ms |
| Community | 98 / 100 / 100                                      | 1,107 ms   | 0   | 0 ms |

The 26-test production Chrome suite separately passed same-origin GET/HEAD network checks, interaction journeys and WebGL fallback/context loss. Nine axe route diagnostics passed and desktop/mobile screenshots were inspected. This is local lab evidence only. Field INP/CWV percentiles, scene-ready latency, GPU frame rate, mobile Lighthouse, native 200%/400% browser zoom, Firefox/WebKit and real iOS devices remain not measured or not checked. Full delivery acceptance still awaits final candidate review and is blocked on remote/submodule registration. The owner approved a temporary development-only ESLint 9.39.5 maintenance exception on 2026-09-24, with reassessment by 2026-10-24 or the next stable Next.js lint configuration release, whichever is earlier; see the canonical [dependency decision](DEPENDENCIES.md).
