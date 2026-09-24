# Frontend scope

ID: FE-SCOPE-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

Implemented behavior is intentionally bounded: static navigation, filters/forms/dialogs, local reference selection, curated 3D display, supported grid edits, undo/redo, derived counts, baseline instructions and presentation previews.

The allowed edits are select, recolor among demo colors, translate by valid grid increments, set a numeric transform, rotate in quarter turns, duplicate a supported part, place a supported demo brick using a preview or numeric coordinates, and remove an unprotected part. Numeric X/Z coordinates support tenth-stud increments and Y supports twentieth-stud increments. Direct horizontal dragging commits one command on release; placement requires explicit confirmation. Group protection is a local model invariant, not security. The predefined variant requires a compatible base revision and explicit apply.

The focused specialist continuation implements Build, Inspect and Present around one canonical model. Strict Connect and Grid placement use the same core validation at preview and commit; Free position remains an explicitly unverified draft. Multi-selection, nested groups and protection, focus/section/explosion, local experiments, same-footprint replacement, versioned project download/load, local reference pinning and real PNG export are editor-scoped. [Editor requirements](../editor/README.md) and [modeling](../editor/MODELING.md) define exact coverage. Geometric checks do not assess strength, stability, manufacturing tolerances or general mechanisms.

Single-brick inspection reuses the existing canvas to expose underside geometry. Roof access and assembly separation use authored, baseline-linked module metadata with a separation slider and guides. These are reversible display arrangements, not generated or verified build orders. Camera, inspection, assembly offsets and visibility do not change model coordinates, BOM or revisions. The modern shared shell and project-library home preserve a first-class blank-canvas entry alongside examples.

Excluded: endpoints, Server Actions, auth/databases, fake network services, AI SDKs or arbitrary prompt generation, network upload/OCR/PDF ingestion, production physics or manufacturer-certified snapping, automatic instruction generation, billing/checkout, invitations/notifications, publishing, realtime/sync, cloud persistence and speculative offline services. Backend/infrastructure application work is out of scope.

The specialist editor does not add a PDF production pipeline. Purchase/invite capabilities remain unconnected; project-file and PNG downloads are actual local browser outputs. Blank entry must open a usable empty model; sample exploration is never described as generation from user text.

Related: [global boundary](../../../docs/ARCHITECTURE.md), [requirements](../TRACEABILITY.md), [user flows](USER_FLOWS.md). Source: execution brief §§2, 11–13.
