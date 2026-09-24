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

Routes: `/`, `/new`, `/editor`, `/instructions`, `/inventory`, `/community`, `/marketplace`, `/plans`, `/design-system`. Project selection uses allowlisted query values. Full reload resets in-memory edits; changes survive client navigation during the session.

[Acceptance](docs/delivery/ACCEPTANCE.md) distinguishes executed checks from pending/unavailable checks. [Handoff](docs/ai/HANDOFF.md) records current limitations. Approved remote URLs are not available; submodule registration remains blocked. BRIKUMA is not affiliated with or certified by LEGO.
