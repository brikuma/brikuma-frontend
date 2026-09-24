# Frontend scope

ID: FE-SCOPE-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

Implemented behavior is intentionally bounded: static navigation, filters/forms/dialogs, local reference selection, curated 3D display, supported grid edits, undo/redo, derived counts, baseline instructions and presentation previews.

The allowed edits are select, recolor among demo colors, translate by valid grid increments, add one supported demo brick at a designated workspace position and remove an unprotected part. Group protection is a local model invariant, not security. Camera, exploded view and visibility are presentation and do not change BOM/revision. The predefined variant requires a compatible base revision and explicit apply.

Excluded: endpoints, Server Actions, auth/databases, fake network services, AI SDKs or arbitrary prompt generation, file upload/OCR/PDF ingestion, production physics/snapping/instruction generation, billing/checkout, invitations/notifications, publishing, realtime/sync, cloud persistence and speculative offline services. Backend/infrastructure application work is out of scope.

Print, if implemented, is a local browser layout preview. Purchase/invite/export capabilities must explain unconnected status rather than show fabricated success. Blank entry must open a usable empty model; sample exploration is never described as generation from user text.

Related: [global boundary](../../../docs/ARCHITECTURE.md), [requirements](../TRACEABILITY.md), [user flows](USER_FLOWS.md). Source: execution brief §§2, 11–13.
