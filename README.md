# BRIKUMA frontend

A static, browser-local creative workbench for brick models. The POC includes a workspace, free-form brief, model editor, instruction and inventory views, community examples, digital listing previews, provisional plans and a component review page. Fixture authors/reviews/listings are fictional. There is no backend, cloud save, AI provider, checkout or physical validation.

Read [frontend documentation](docs/README.md), [global documentation](../docs/README.md), [agent instructions](AGENTS.md), [Claude adapter](CLAUDE.md), [vocabulary](LEGEND.md), [contributing](CONTRIBUTING.md), [changes](CHANGELOG.md), [security](SECURITY.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

## Local development

Run commands from this directory using the exact Node/npm versions recorded in [dependency evidence](docs/engineering/DEPENDENCIES.md) and repository configuration:

```sh
npm ci
npm run dev
npm run check
npm run build
npm run preview
```

The static build outputs `out/`. The preview command serves exported files; no application server is needed at runtime. See the manifest for available scripts and [quality](docs/engineering/QUALITY.md) for their required behavior. Installation is not considered verified until acceptance records its actual result.

Routes: `/`, `/new`, `/editor`, `/instructions`, `/inventory`, `/community`, `/marketplace`, `/plans`, `/design-system`. Project selection uses four allowlisted slots. Browser-local saves restore models, edited instructions, briefs and references after reload; portable project files provide explicit backups. Undo histories survive client navigation but start fresh after restoration, and camera state is not saved. See [local projects](docs/engineering/LOCAL_PROJECTS.md) for storage, recovery and file boundaries.

[Acceptance](docs/delivery/ACCEPTANCE.md) distinguishes executed checks from pending/unavailable checks. [Handoff](docs/ai/HANDOFF.md) records current limitations. The integration repository pins this independent frontend repository as a submodule; see the [global documentation](../docs/README.md). BRIKUMA is not affiliated with or certified by LEGO.

## Verified build downloads

The Frontend GitHub Actions workflow retains the tested static export after security, deterministic, build-budget, browser and accessibility checks pass. Open a successful run in the repository's **Actions** tab and download its `brikuma-frontend-<commit-sha>-<attempt>` artifact. It expires after seven days and requires repository access. [Quality](docs/engineering/QUALITY.md#verified-static-build-delivery) documents exact revision selection, CLI download and verification limits. Hosting remains deferred.

Original project material is licensed under [MIT](LICENSE); third-party material retains its own terms. See [privacy setup](PRIVACY.md) and [security reporting](SECURITY.md). Contributions use pull requests with required privacy and quality checks; only designated maintainers may merge.

External agent skills retained in the history have an unverified redistribution license and are excluded from the project MIT grant; see [third-party notices](THIRD_PARTY_NOTICES.md#external-agent-skills-redistribution-license-unverified).
