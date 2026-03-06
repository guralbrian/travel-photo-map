# Implementation Plan: UI and UX Polish

**Branch**: `008-ui-ux-polish` | **Date**: 2026-03-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-ui-ux-polish/spec.md`

## Summary

CSS-only polish pass: lower panel opacities to 0.78–0.82 range so the map shows through more clearly, add desktop `:hover` scale+glow on photo grid items, restyle the reopen button as a gold circle matching the existing panel/feed toggles, and normalize transition timing to 200–250ms across interactive elements. No new JS modules, no new dependencies.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+), CSS3, HTML5
**Primary Dependencies**: Leaflet.js (existing, vendored) — no new dependencies
**Storage**: N/A — pure visual changes, no data changes
**Testing**: Manual visual inspection in Chrome/Firefox/Safari; mobile device testing
**Target Platform**: Modern browsers (desktop + mobile); static file hosting
**Project Type**: Single static web application
**Performance Goals**: All transitions complete in ≤250ms; no layout shifts; 60fps during hover animations
**Constraints**: CSS-only where possible; no build step; vendored dependencies only
**Scale/Scope**: 3 CSS files modified (`css/map.css`, `css/photo-wall.css`); ≤100 lines changed total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|-----------|-------|
| I. Privacy by Default | ✅ Pass | No data changes, no external requests |
| II. Static & Zero-Config | ✅ Pass | Pure CSS changes, no APIs or build steps |
| III. Approachable by Everyone | ✅ Pass | Hover states are progressive enhancement (no-op on touch); reopen button becomes more discoverable with gold accent |
| IV. Professional Visual Polish | ✅ Pass | This IS the polish feature — glassmorphism refinement, consistent transitions, matching toggle styles |
| V. Performant at Any Scale | ✅ Pass | CSS transitions only; `backdrop-filter` already in use (no new GPU compositing cost); `will-change` on hover targets if needed |
| VI. Unified Media Experience | ✅ Pass | No changes to media playback or viewing |
| VII. Map-Centric Integration | ✅ Pass | Lowering panel opacity makes the map more visible through panels — reinforces map-centric design |

**Gate result**: PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/008-ui-ux-polish/
├── spec.md              # Feature specification (Gemini draft, reviewed)
├── plan.md              # This file
├── research.md          # Phase 0 output — current state audit
├── data-model.md        # N/A (no data changes)
├── quickstart.md        # Phase 1 output — testing checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (files to modify)

```text
css/
├── map.css              # Control panel + feed sidebar + toggle buttons
└── photo-wall.css       # Photo wall panel + grid items + reopen button
```

**Structure Decision**: No new files. All changes are edits to existing CSS files. No JavaScript changes expected (hover states are pure CSS; reopen button markup already exists).

## Complexity Tracking

> No constitution violations — table not needed.
