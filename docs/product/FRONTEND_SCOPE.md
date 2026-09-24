# Frontend scope

ID: FE-SCOPE-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

Implemented behavior is intentionally bounded: static navigation, filters/forms/dialogs, local reference selection, curated 3D display, supported grid edits, undo/redo, derived counts, baseline instructions and presentation previews.

The [D1/D2 alignment](BASELINE_ALIGNMENT.md) preserves the broader product intent while distinguishing this frontend slice from product completion. The continuity follow-up keeps brief intent, visual language, construction system, technique, intended use and constraints separate in the project browser session. Selected images and PDF metadata accompany the brief; editor image references and manual calibration survive client navigation. They are not inferred measurements, enforced constraints or generated geometry. Reload clears this session context; explicit scene-file downloads preserve the supported model, not the brief, reference bytes/calibration or a full instruction package.

The allowed edits are select, recolor among demo colors, translate by valid grid increments, set a numeric transform, rotate in quarter turns, duplicate a supported part, place a supported demo brick using a preview or numeric coordinates, and remove an unprotected part. Numeric X/Z coordinates support tenth-stud increments and Y supports twentieth-stud increments. Direct horizontal dragging commits one command on release; placement requires explicit confirmation. Group protection is a local model invariant, not security. The predefined variant requires a compatible base revision and explicit apply.

The focused specialist continuation implements Build, Inspect and Present around one canonical model. Strict Connect and Grid placement use the same core validation at preview and commit; Free position remains an explicitly unverified draft. Multi-selection, nested groups and protection, focus/section/explosion, local experiments, same-footprint replacement, versioned project download/load, local reference pinning and real PNG export are editor-scoped. [Editor requirements](../editor/README.md) and [modeling](../editor/MODELING.md) define exact coverage. Geometric checks do not assess strength, stability, manufacturing tolerances or general mechanisms.

Single-brick inspection reuses the existing canvas to expose underside geometry. Roof access and assembly separation use authored, baseline-linked module metadata with a separation slider and guides. These are reversible display arrangements, not generated or verified build orders. Camera, inspection, assembly offsets and visibility do not change model coordinates, BOM or revisions. The modern shared shell and project-library home preserve a first-class blank-canvas entry alongside examples.

Excluded: endpoints, Server Actions, auth/databases, fake network services, AI SDKs or arbitrary prompt generation, network upload/OCR/PDF ingestion, production physics or manufacturer-certified snapping, automatic instruction generation, billing/checkout, invitations/notifications, publishing, realtime/sync, cloud persistence and speculative offline services. Backend/infrastructure application work is out of scope.

The specialist editor does not add a PDF production pipeline. Purchase/invite capabilities remain unconnected; project-file and PNG downloads are actual local browser outputs. Blank entry must open a usable empty model; sample exploration is never described as generation from user text.

## Capability coverage

The [catalog](../../src/fixtures/catalog.ts), [manifest](../../src/fixtures/editor/manifest.ts) and [modeling contract](../editor/MODELING.md) define the current subset. A capability is not enabled by selecting a visual style or describing a mechanism in the brief.

| Capability                   | Available in this frontend                                                                                                                            | Explicit boundary                                                                                                                                                                   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Free-form subject and layout | Empty scene; manual composition across the supported demo library; numeric transforms, groups and reversible edits.                                   | No architecture-only category gate. Supported transform/catalog bounds still apply.                                                                                                 |
| Part identity and color      | Stable logical instances and named original demo definitions/colors; derived part-color quantities.                                                   | No manufacturer catalog mapping, verified real part-color combinations, availability or price. Decorative geometry may not correspond to a purchasable part.                        |
| Basic stud construction      | Nominal rectangular stud/receiver subset; explicit Connect/Grid/Free placement and bounded occupied-volume feedback.                                  | Supported geometric feedback does not assess manufacturing fit, physical stability, strength or every catalog shape.                                                                |
| SNOT and hybrid construction | Brief preferences can record the intended technique; demo details without supported connectors can remain explicit drafts.                            | No verified lateral connector profile or arbitrary X/Z-axis part orientation. Y-axis quarter turns are not SNOT capability.                                                         |
| Technic and mechanisms       | A labeled visual rover study and manually positioned geometry.                                                                                        | No supported pin/axle/hinge family, verified revolute pose, kinematics, friction, load or continuous motion assessment. EDR-029 remains blocked by missing verified hinge metadata. |
| Assisted design              | Accessible pre-authored courtyard roof comparison with explicit apply/undo and revision/protection checks; local command experiments remain distinct. | No prompt-driven generation, reference analysis, provider, jobs or credits. The sample must not be represented as a response to the user's brief.                                   |
| References and design axes   | Browser-session brief, local images, PDF metadata and manual image calibration.                                                                       | No PDF parsing/OCR, network upload, inferred geometry, automatic constraints or durable reference storage.                                                                          |
| Instructions and assemblies  | Curated baseline steps and revision warnings; reversible authored roof/module display separation.                                                     | No general instruction editor/generator, proven insertion sequence, physical assembly test or production PDF.                                                                       |
| Parts list and portability   | Current-model BOM, illustrative owned/missing values, versioned scene JSON and real PNG output.                                                       | No real inventory/reservations, external sourcing, LDR/MPD import/export or complete project-package round trip.                                                                    |

These limits retain the wider D1 requirements as partial or deferred; they do not remove SNOT, Technic, useful free assistance, reliable instructions or digital distribution from the product. Any broader capability requires its own catalog provenance, command contract, coverage and evidence.

Related: [global boundary](../../../docs/ARCHITECTURE.md), [requirements](../TRACEABILITY.md), [user flows](USER_FLOWS.md). Source: execution brief §§2, 11–13.
