# Responsive and accessibility contract

ID: FE-A11Y-001

Owner/scope: frontend repository

Status: Specified

Baseline: execution brief 1.1.0 / consolidated product v0.0.3, 2026-09-24.

Target WCAG 2.2 AA for implemented behavior; automated checks are not certification. Use semantic landmarks/headings, explicit labels, visible focus, Escape/focus restoration in dialogs, reduced motion, forced-color awareness and restrained live announcements. Body contrast target is 4.5:1, applicable large text and required non-text boundaries 3:1. Prefer 44×44px important touch actions; WCAG AA minimum target-size criterion is 24×24px with exceptions.

| Width (CSS px) | Composition                                                                             |
| -------------- | --------------------------------------------------------------------------------------- |
| 320–639        | Single column; choosing a part activates 3D, with a nonmodal panel below the viewport.  |
| 640–767        | Wider compact composition, no permanent sidebars.                                       |
| 768–1023       | Tablet shell with one nonmodal panel beside the usable canvas.                          |
| 1024–1279      | Compact desktop; inspector temporarily replaces the left panel without a modal overlay. |
| 1280–1535      | 256px left and 280px right panels, with independent collapse controls.                  |
| 1536+          | 256px left and 280px right panels; the remaining width belongs to the canvas.           |

Editor geometry uses the 48px shared header token, compact combined project/navigation strip, compact viewport toolbar and a small status row. Project navigation can scroll horizontally when its links exceed the available width; the page itself must not overflow. The optional authored-change assistant sits inside More tools. Floating tool groups remain bounded by the editing area; advanced options open explicitly. The inspector starts collapsed and opens on selection. Use `100dvh`/independent panel scrolling on desktops at least 1024px wide and 740px high; at short height/reflow allow sensible page scrolling. Never hide overflow to conceal a layout bug.

Required inspection sizes: 320×568, 390×844, 768×1024, 1024×768, 1280×800, 1440×900, 1536×1024 and 1920×1080, plus short desktop, wide display, 200% zoom and 400% reflow. Record actual screenshot/manual evidence in [acceptance](../delivery/ACCEPTANCE.md).

Canvas controls must not trap touch scroll or keyboard focus. Provide HTML part/group selection and quantities. Scope edit shortcuts to the relevant region, suppress them while typing, and avoid browser shortcut conflicts. Grid moves/step changes/constraints need non-drag alternatives. WebGL failure preserves other product tasks, a poster/HTML view and retry.

Browser target is latest two stable desktop Chrome/Edge/Firefox plus supported macOS/iOS Safari subject to exact package minima. Actual versions/platforms and unavailable devices must be recorded after execution. Playwright WebKit is not a real iPhone test. No browser pass is currently implied by this target.

Related: [design system](DESIGN_SYSTEM.md), [components](COMPONENTS.md), [performance](../engineering/PERFORMANCE.md). Sources: execution brief §§9, 15; [WCAG 2.2](https://www.w3.org/TR/WCAG22/) opened 2026-09-24.
