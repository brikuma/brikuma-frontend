# Changelog

## Unreleased

- Deliver the verified static build as a private GitHub Actions artifact, retain browser failure captures, and check bundle budgets before pushing.
- Reuse the editor's fixed environment lighting across model and presentation updates without changing its appearance or quality settings.
- Preview single-piece moves and rotations before applying them, preserving part identity and checked attachment with one-step undo.
- Keep pending brick rotations aligned, recover nearby attachments after floor placement, and show current Undo/Redo feedback.
- Resume current work from the workspace, place supported bricks with simpler previews, and inspect individual model layers.
- Edit model-derived instruction steps, notes, ordering and saved views independently of model history.
- Restore browser-local projects and download complete backups containing models, edited guides, briefs and reference images, with explicit save failures and multi-tab conflict protection.
- Define the frontend-only workbench scope, local Model Editing context and static route contracts.
- Establish global/local documentation ownership and evidence-based acceptance tracking.
- Implementation is in progress; refer to [acceptance](docs/delivery/ACCEPTANCE.md) before interpreting any behavior as tested.
