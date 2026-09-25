# Local projects and portable backups

ID: FE-LOCAL-001

Owner/scope: frontend browser persistence, project files and restoration.

Status: implemented; executed verification belongs in [acceptance](../delivery/ACCEPTANCE.md).

Baseline: frontend execution brief 1.1.0 / consolidated product v0.0.3, extended by the owner's September 25 frontend continuity request and [FE-DEC-019](../DECISIONS.md#fe-dec-019-local-project-continuity-and-portable-backups).

Related: [architecture](ARCHITECTURE.md), [core](CORE.md), [editor experience](../editor/EXPERIENCE.md), [scope](../product/FRONTEND_SCOPE.md).

## Document lifetime and ownership

The workspace retains the four existing route slots: `blank`, `masseria`, `rover` and `creature`. A slot can hold an imported model with a different model identity; navigation continues to use its slot. This is a local workspace, not an arbitrary project library, account or cloud service. Data belongs to the current browser profile and origin. Browser storage clearing or eviction can remove it; portable downloads remain the explicit backup mechanism.

The [session provider](../../src/features/editor/state/session.tsx) restores saved records and their reference context before mounting scene consumers. A new fixture cannot replace saved geometry while restoration is pending. Brief-only work restores without loading geometry. Authored sample metadata is attached later only when the saved baseline matches the original fixture; it does not replace the restored current model.

| Content                                                              | Browser workspace                                        | Portable project file                             |
| -------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------- |
| Current model, logical identities, transforms, groups and protection | Retained                                                 | Included                                          |
| Edited instruction sequence, titles, notes and saved 3D/top views    | Retained                                                 | Included                                          |
| Exact instruction source model, including a stale source             | Retained                                                 | Included                                          |
| Brief fields                                                         | Retained independently of geometry revisions             | Included                                          |
| PNG/JPEG/WebP references and manual image calibration                | Image Blobs and metadata retained; object URLs recreated | Image bytes encoded with metadata and calibration |
| PDF references                                                       | Filename, type and size only                             | Metadata only; no PDF content                     |
| Restore-baseline model                                               | Retained separately from current geometry                | Imported current model becomes the new baseline   |
| Model and instruction undo/redo histories                            | Remain in the open session only                          | Excluded                                          |
| Camera, selection, hidden parts, section view and open panels        | Presentation state only                                  | Excluded                                          |

Reload and file import start empty model and editorial histories. A restored customized guide still requires explicit confirmation before regeneration, even though its undo history is empty. Its source snapshot remains independent from the current model, so a stale guide stays visibly stale after restoration. Restoring a baseline preserves project context; loading a project file replaces context with the validated file contents. Loading a legacy scene starts with empty context and no local guide.

## Browser storage and save feedback

The direct [IndexedDB adapter](../../src/adapters/workspace-storage.ts) uses database `brikuma-workspace`, version 1, object store `projects`, keyed by slot `id`. Each record contains a positive safe-integer `version` and a validated project payload. Opening and reading records do not write them. The adapter bounds database opening and transactions with failure timeouts and closes connections on version changes.

A save reads the stored record and compares its version with the caller's expected version inside the same read/write transaction. It writes only if they match, then advances the version. A missing record matches only an expected `null` version. A conflicting tab's record is never silently replaced; the open project remains available for a backup. The save promise resolves after transaction completion, not after the individual write request succeeds. This follows the transaction lifecycle described by [MDN's IndexedDB guide](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API/Using_IndexedDB), retrieved September 25, 2026.

[Workspace persistence](../../src/features/editor/state/workspace-persistence.tsx) serializes writes per slot and keeps the newest pending document while a write is running. Undoing back to the prior saved model must replace an older pending edit too. **Saved in this browser** describes the latest completed local transaction. **Saving in this browser…** covers pending work; a download is separately labeled **Download requested** because the browser cannot confirm the user retained the file.

Quota or unavailable-storage failures leave current work open and show backup guidance. **Retry local save** retries the latest document. A corrected document can retry a transient failure; conflicts and corrupt records remain blocked. Failed initial storage reads block writes, and an invalid restored project blocks replacement of its affected slot. No recovery path silently resets or deletes saved data.

New reference images remain pending until their dimensions are checked. The save status explains that image checking is in progress; a successful decode or removal of a rejected image allows saving to continue. Image bytes use IndexedDB's structured-clone behavior rather than base64 conversion on every save. The API behavior was checked against [MDN's `IDBObjectStore.put()` reference](https://developer.mozilla.org/en-US/docs/Web/API/IDBObjectStore/put), retrieved September 25, 2026.

A `beforeunload` warning is registered while work is pending or failed and removed after saving. It is a supplementary warning, not a last-moment save mechanism or a guarantee against browser termination. The event is unreliable in some mobile shutdown paths and the browser controls its prompt, as documented in [MDN's `beforeunload` reference](https://developer.mozilla.org/en-US/docs/Web/API/Window/beforeunload_event), retrieved September 25, 2026.

## Portable file contract

The [project-package adapter](../../src/adapters/project-package.ts) writes `format: "brikuma-project"`, `schemaVersion: 1`, with a compact `snapshot` and project `context`. It also accepts existing `format: "brikuma-scene"`, `schemaVersion: 1` files through the unchanged [legacy scene parser](../../src/core/model/application/project-file.ts). Other formats, unsupported versions and unknown fields are rejected. Parsing and reference validation finish before replacement is offered; a rejected file leaves the open project intact.

The pure [snapshot codec](../../src/core/model/application/project-snapshot.ts) exposes `encodeProjectSnapshot` and `parseProjectSnapshot` through the core public API. Its snapshot contains the current model and an optional instruction document with its source model, compact steps and edited flag. Each serialized step contains only `id`, `title`, `description`, `view` and `newPartIds`. Cumulative visibility, source signatures, counts, layer metadata and physical-assessment claims are not accepted from the file.

Import requires unique step IDs and each source-model part exactly once across nonempty steps. The codec reconstructs cumulative visibility, source identity, layer counts and unchecked geometry. A step spanning several source layers receives the lowest represented source layer as nominal metadata; it does not imply assembly order. The current and instruction-source model IDs must match, while revisions and geometry may differ. Customized content cannot bypass regeneration confirmation by supplying `edited: false`: comparison with the source's generated compact steps restores that flag when needed.

[Reference serialization](../../src/adapters/project-context-file.ts) validates types, identities, metadata, byte signatures, actual decoded dimensions and calibration bounds. Image bytes are included in explicit backups; object URLs are never serialized. PDF content is neither parsed nor stored. Restored image object URLs belong to the mounted context provider and are released when removed or when its lifetime ends.

## Bounds and failures

| Boundary                                      | Limit                                                                                       |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Portable JSON file                            | 96 MiB of UTF-8 text, checked on write and read                                             |
| Each serialized current/source/baseline model | 5 MiB using the existing scene-model contract                                               |
| Logical pieces and groups per model           | Current editing policy: 5,000 pieces; at most 1,000 groups on import                        |
| Expanded cumulative instruction membership    | 2,000,000 entries; writer and reader reject an excessive guide with guidance to merge steps |
| Step identity, title and notes                | Stable ID up to 128 characters; title 1–120; notes up to 2,000                              |
| References                                    | At most six, each nonempty and no larger than 10 MiB                                        |
| Decoded image area                            | At most 40,000,000 pixels                                                                   |
| Brief text                                    | Up to 10,000 characters per field; `maxPieces` up to 100                                    |

The cumulative-membership limit bounds reconstruction before allocating the expanded arrays. Source-layer metadata and the comparison guide are derived without building an unnecessary cumulative source plan. Matching write checks prevent producing a backup that cannot be reopened under these limits. Storage quota remains browser-controlled and may be smaller than the file-format limits.

## Verification and remaining scope

[Snapshot tests](../../tests/unit/project-snapshot.test.ts) cover edited and stale guide round trips, source identity, exact membership, untrusted fields and bounded expansion. [Context tests](../../tests/unit/project-context-file.test.ts) and [package tests](../../tests/unit/project-package.test.ts) cover the browser-facing data boundary. [Storage tests](../../tests/unit/workspace-storage.test.ts) exercise transaction completion, errors and version conflicts. [Session tests](../../tests/component/workspace-persistence.test.tsx) exercise hydration, coalescing, undo during an in-flight save, restoration and failure recovery. Their presence is not a claim that a particular candidate passed; actual commands and browser observations remain in [acceptance](../delivery/ACCEPTANCE.md).

No dependency was added for this capability. Static export and frontend-only ownership remain unchanged. Backend storage, cloud sync, collaborative merging, arbitrary project management, full undo-history portability and external CAD formats remain outside this slice. Portable edited instructions are project data, not a production booklet or evidence of physical buildability.
