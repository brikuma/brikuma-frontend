# FE-PERF-001 — Performance contract

Owner: frontend. Status: local production gzip/Lighthouse checkpoints and editor render-submission measurements recorded below; field metrics remain not measured. Baseline: execution brief 1.1.0 and editor specialist 1.0.0. Related: [dependencies](DEPENDENCIES.md), [quality](QUALITY.md), [acceptance](../delivery/ACCEPTANCE.md), [index](../README.md).

Budgets: ordinary route initial JavaScript ≤250KiB gzip; editor shell ≤300KiB before WebGL; lazy 3D ≤900KiB; initial CSS ≤50KiB; initial selected-scene assets ≤2MiB; initial fonts ≤120KiB. System sans uses no downloaded font. Local SVG previews have fixed dimensions. Three/Fiber/Drei and scene arrays remain lazy at the workbench boundary; no dashboard card initializes WebGL. One active canvas, demand rendering and capped DPR are required.

`npm run perf:check` checks gzip sizes derived from actual exported route script/style references and dynamic chunk imports, `npm run perf:lighthouse` separately runs three Lighthouse13.5 production measurements each of workspace and community with installed Chrome. Static output must exist and `npm run preview` must be running. Reports include browser/user-agent, Lighthouse configuration, metric values, environment and revision; median metrics are summarized under ignored `artifacts/lighthouse/`; gzip budgets are under `artifacts/performance/`. Performance ≥95 is a project target; metric evidence remains available if unmet. Production interaction/network/browser journeys provide separate responsiveness evidence.

The targets LCP≤2.5s, INP≤200ms, CLS≤0.1 at field 75th percentile are not measured field compliance. Lighthouse TBT is not field INP. Shell LCP is not scene-ready. The editor checkpoint records renderer frame-counter intervals on one desktop profile, not GPU hardware timestamps or real-phone behavior. No analytics/RUM service is connected.

Browser minimums: Next 16.3.6 documents Chrome/Edge 111+, Firefox 111+, Safari 16.4+. Tailwind 4's modern CSS floor includes Chrome 111+, Safari 16.4+, Firefox 128+. WebGL2 remains device-dependent. Product target is latest two stable Chrome/Edge/Firefox and currently supported Safari/iOS; actual tested versions belong in acceptance.

Sources: [Web Vitals](https://web.dev/articles/vitals), [Fiber performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance), [Tailwind compatibility](https://tailwindcss.com/docs/compatibility), [Next supported browsers](https://nextjs.org/docs/architecture/supported-browsers).

## Editor specialist measurements — 2026-09-24

At 13:03:41 UTC, `node scripts/editor-performance.mjs` completed with exit 0 against the production static export after the comparison-view reset correction, with no concurrent browser/test workload. Toolchain: pinned Node 22.23.2/npm 10.9.8. Profile: Chrome 153.0.8010.53 headless, Darwin 27.0.0 ARM64, Apple M2 CPU and ANGLE Metal Apple M2 renderer, 1440×900 CSS pixels, DPR 1, Auto conservative quality, reduced motion, loopback network and no CPU/network throttle. This measured the uncommitted candidate based on `8f8e9190b3ec8d6cf77db78e2aec11a4d39df4a4`, build `JX50FHqhYGX3BumJv2qHZ`. The report retains exported HTML and fixture source SHA-256 values; the Git diff hash alone does not include untracked source.

The fresh browser context opened the empty scene: shell-ready took 146.8 ms measured by the driver; the first real frame and scene-ready marks occurred 550.0 and 552.8 ms after the page time origin. The first Add/Place operation took 178.8 ms after its invocation. Subsequent fixture switches used the warmed browser context; their timings include opening the local study dialog and selecting the fixture.

| Fixture            | Parts / draw calls / triangles | Scene switch ready | Orbit interval median / p95 | Pan interval median / p95 | Input to next render submission p95 / samples |
| ------------------ | ------------------------------ | ------------------ | --------------------------- | ------------------------- | --------------------------------------------- |
| Courtyard study    | 213 / 13 / 327,600             | 215.0 ms           | 16.7 / 17.8 ms              | 16.7 / 17.1 ms            | 17.3 ms / 12                                  |
| Stress seed 260924 | 1,000 / 6 / 640,016            | 164.2 ms           | 16.7 / 17.5 ms              | 16.7 / 17.6 ms            | 14.6 ms / 17                                  |
| Stress seed 260924 | 5,000 / 6 / 3,200,016          | 235.1 ms           | 16.7 / 19.1 ms              | 16.6 / 18.2 ms            | 27.8 ms / 30                                  |

Each fixture had 58 measured orbit intervals and 39 pan intervals. Camera orientation/target changed while canonical revision/count stayed unchanged. Thirty canvas clicks were attempted per fixture; only clicks followed by a render-counter update contributed latency samples. This is an input-to-render-submission proxy, not displayed-pixel latency or field INP. Median intervals were near 60 fps and p95 intervals below the 33.3 ms fallback target; a strict 16.67 ms ceiling was not uniformly met. These bounded synthetic workloads do not establish performance for arbitrary models or other devices.

On one selected brick, drag-preview/cancel took 159.7 ms and preserved revision, identity, count, position and history; completed drag took 157.2 ms, moved the same instance and added exactly one transaction; one undo took 39.4 ms and restored the original state. These wall times include Playwright movement and DOM observations, not human task times. After settling, each fixture added zero frames during an 800 ms idle observation. Twenty alternating empty/courtyard resets retained stable geometry counts of 15/24 and six textures. This covers the observed renderer counters, not all JavaScript memory or listener ownership.

Page errors, HTTP responses ≥400 and external requests were all zero. The attempted background-tab observation reported `document.hidden=false`; true hidden-tab behavior remains **not measured**, despite an unchanged frame count. Field CWV, actual screen presentation latency, GPU hardware timing, real touch devices and participant outcomes remain unmeasured. Raw evidence: `artifacts/editor-performance/report.json` and the three adjacent fixture PNGs, all visually inspected. The superseded 12:52:21 UTC report is retained as `report-before-comparison-fix.json` in the same directory. The [measurement runner](../../scripts/editor-performance.mjs) reproduces this bounded protocol; [editor evidence](../editor/EVIDENCE.md) records broader candidate checks and remaining gaps. Earlier measurements below describe their own historical outputs.

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
