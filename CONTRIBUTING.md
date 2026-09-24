# Frontend contribution workflow

Read [local instructions](AGENTS.md), [global workflow](../CONTRIBUTING.md), [quality](docs/engineering/QUALITY.md) and [review protocol](docs/ai/REVIEW.md). Run install/build/test commands only from this repository; no parent runtime packages are required.

Use `type(scope): imperative summary`. Types follow [global policy](../CONTRIBUTING.md). Allowed frontend scopes: `app`, `core`, `workspace`, `editor`, `parts`, `instructions`, `checks`, `ai-preview`, `community`, `marketplace`, `plans`, `design-system`, `a11y`, `deps`, `docs`, `spec`, `tooling`, `architecture`. English and truthful claims are review responsibilities beyond commitlint syntax.

Keep a feature, its necessary tests and documentation in one coherent change. Inspect the exact candidate diff, stage explicit paths, run read-only staged checks and create fresh review evidence. Do not include unrelated work, sweep all files at the superproject root, append `git add` to formatting tasks or use unstaged fixes to make a staged snapshot pass.

Hooks install per repository. Do not bypass a failing hook or run network installs inside hooks. Fresh-clone bootstrap and installed coverage are recorded in local quality/acceptance; file presence alone is not proof. CI reruns deterministic checks and does not trust ignored local evidence. No remote push or branch-protection mutation is authorized.

[Workflow](docs/ai/WORKFLOW.md) · [Decisions](docs/DECISIONS.md) · [Acceptance](docs/delivery/ACCEPTANCE.md)
