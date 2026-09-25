# FE-QUALITY-001 — Quality gates

Owner: frontend. Status: implemented; evidence in [acceptance](../delivery/ACCEPTANCE.md). Baseline: execution brief 1.1.0. Related: [dependencies](DEPENDENCIES.md), [core](CORE.md), [review](../ai/REVIEW.md), [index](../README.md).

Use Node22.23.2 and npm10.9.8, independently installed frontend dependencies. `npm ci --ignore-scripts` preserves the reviewed lifecycle boundary; `npm run hooks:install` installs Husky into this repository. Never change global Git configuration. `npm run check` runs lint, formatting, generated Next route types, full/core TypeScript, graph checks and negative self-tests, pure/component tests, hook self-tests and local documentation checks. `npm run build` creates static `out/`; `npm run preview` serves that directory on loopback port4173 with a native development-only static file server.

The deterministic test runner derives its worker limit from Node `availableParallelism()`, leaves one CPU for the coordinator and caps the result at four workers (minimum one). This keeps DOM-heavy component suites from oversubscribing small hosted runners. Tests retain their existing assertions, default timeouts and retry policy; test deadlines are not a UI performance benchmark.

## Staged gate and evidence

Before an agent commit, stage explicit owned files, then use `node scripts/quality.mjs verify` to execute deterministic checks against matching staged/worktree inputs. Inspect the candidate diff and results read-only. Record findings in an ignored JSON array under `artifacts/`, then `node scripts/quality.mjs record-review <reviewer-label> <findings-json-path>`. The helper records the exact candidate tree, repository, base commit, lockfile hash, Node/npm versions, timestamp and actual command/log results. It does not prove review truth. Unresolved findings block; label a self-review honestly.

Pre-commit uses `npm run check:commit`: snapshot and review integrity plus read-only lint-staged. Relevant unstaged/untracked source, tests, configuration and docs are rejected non-destructively; unrelated preexisting user `.agents`, `.claude`, and `skills-lock.json` are untouched. Changed trees invalidate review. Partial staging is not silently expanded. Commit-msg runs exact local commitlint; pre-push runs complete checks, production build, browser journeys and axe. Hook execution never installs packages or accesses a model/network. CI reruns committed-tree checks independently of local evidence.

Pre-push requires those inputs to match committed `HEAD` before running and after each gate, so staged or unstaged fixes cannot validate a different published revision. A disposable regression test covers the valid committed state and both refusal cases without deleting work. This guard was added following the separate exact-candidate review.

## Architecture authority

[dependency-cruiser config](../../.dependency-cruiser.cjs) analyzes resolved aliases, reexports, type-only/static dynamic imports, cycles, unresolved modules, undeclared packages, pure core, public contracts, passive fixtures, product-agnostic primitives and renderer location. [Negative fixtures](../../tests/architecture/boundaries.test.mjs) are generated only under ignored artifacts. Scoped ESLint prohibits core browser globals, uncontrolled randomness, time and framework directives. `tsconfig.core.json` excludes ambient DOM/Node/React types. These checks constrain dependencies; human review still owns semantic domain boundaries.

## Browser and limitations

Playwright defaults to installed Google Chrome locally and its Chromium distribution in CI; Firefox/WebKit or real-device tests require explicitly available browsers. A software renderer does not establish GPU frame rate. Test descriptions and failures remain English. Automated axe is an aid to WCAG2.2AA review, not certification.

Remote protections are owner configuration: require the frontend `required` job, disallow bypass/force push, require review of policies/workflows. No remote protection is configured by a local file. Local hook timings and actual results are recorded in acceptance, not presumed passed.

Sources: [Git hooks](https://git-scm.com/docs/githooks), [Husky](https://typicode.github.io/husky/how-to.html), [lint-staged](https://github.com/lint-staged/lint-staged), [commitlint hook](https://commitlint.js.org/guides/local-setup.html), [dependency-cruiser rules](https://github.com/sverweij/dependency-cruiser/blob/main/doc/rules-reference.md).
