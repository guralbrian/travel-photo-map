# Implementation Plan: Region Detail Photo Viewer Integration

**Branch**: `010-trip-landing-page` | **Date**: 2026-03-07 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-trip-landing-page/spec.md`

## Summary

Make photo thumbnails in the landing page's region detail views clickable, opening the existing immersive photo viewer (`window.photoViewer.open`). Change the overflow "+N more" button to a "View on map" shortcut. This is a lightweight integration — no new modules, no data changes, just wiring existing UI to an existing API.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES5-compatible IIFE in landing-page.js), CSS3, HTML5
**Primary Dependencies**: Leaflet.js (vendored), photo-viewer.js (existing global `window.photoViewer`)
**Storage**: N/A — reads existing `data/manifest.json` and `data/itinerary.json` at runtime
**Testing**: Manual visual verification via Playwright screenshots at 1440px and 375px
**Target Platform**: Static site — any HTTP file server, mobile and desktop browsers
**Project Type**: Single static site
**Performance Goals**: Photo viewer opens within 200ms of thumbnail click; no layout shift in detail view
**Constraints**: No new dependencies; must use existing `window.photoViewer.open(photos, startIndex, sourceElement)` API
**Scale/Scope**: 8 regions, up to ~60 photos per region, ~500 total photos

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy by Default | PASS | No new data exposure; photos already loaded from manifest |
| II. Static & Zero-Config | PASS | No new services or APIs; pure client-side wiring |
| III. Approachable by Everyone | PASS | Clicking a photo to see it larger is a universal interaction pattern |
| IV. Professional Visual Polish | PASS | Reuses existing polished photo viewer; cursor/hover affordance added |
| V. Performant at Any Scale | PASS | Photo array already computed; no additional data loading on click |
| VI. Unified Media Experience | PASS | Extends the photo viewer to a new entry point, unifying the experience |
| VII. Map-Centric Integration | PASS | "View on map" button preserves map-centric navigation; landing page is an approved overlay per existing clarifications |

## Project Structure

### Documentation (this feature)

```text
specs/010-trip-landing-page/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal — no new entities)
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
js/
├── landing-page.js      # MODIFY: add click handlers to thumbnails, change overflow button
├── photo-viewer.js      # NO CHANGE: existing API used as-is
css/
├── landing-page.css     # MODIFY: add cursor/hover styles for clickable thumbnails
```

**Structure Decision**: No new files. All changes are within the existing `landing-page.js` and `landing-page.css` files. The photo viewer is consumed via its existing global API.

## Complexity Tracking

> No violations — no complexity tracking needed.
