# Implementation Plan: Trip Region Navigation

**Branch**: `001-trip-region-nav` | **Date**: 2026-03-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-trip-region-nav/spec.md`

## Summary

Add a region/leg navigation system to the travel photo map. Users open a 2x4 grid of 8 clickable region panels from the trip feed sidebar (or full-screen overlay on mobile). Clicking a region zooms the map, filters photos and route lines to that region's date range, and replaces the grid with a scrollable itinerary panel showing daily notes loaded from a static `data/itinerary.json` file. A back button returns to the grid and restores the full-trip view.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+), CSS3, HTML5
**Primary Dependencies**: Leaflet.js (vendored in `js/`), existing modules: photo-wall.js, photo-viewer.js, route-builder.js, ViewportSampler.js, Leaflet.Photo.js
**Storage**: Static JSON — new `data/itinerary.json`, existing `data/manifest.json` + `data/trip_segments.json`
**Testing**: Manual visual testing via Playwright MCP screenshots at 1440px (desktop) and 375px (mobile)
**Target Platform**: Browser — static files served by any HTTP server (GitHub Pages, `python -m http.server`)
**Project Type**: Single static web application (no build step)
**Performance Goals**: Map transition < 1 second on region select; 60fps interactions
**Constraints**: No build step, no backend, no npm, all dependencies vendored; must degrade gracefully if itinerary.json missing
**Scale/Scope**: 9 JSON regions → 8 UI sections; ~500 photos; <50 day entries total

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Compliance |
|-----------|--------|------------|
| I. Privacy by Default | PASS | Itinerary JSON is static local data — no external transmission, no analytics, no tracking. Location data stays in repo + browser. |
| II. Static & Zero-Config | PASS | `data/itinerary.json` is a static file fetched at load. No API keys, no backend, no env vars. Graceful fallback if file missing. |
| III. Approachable by Everyone | PASS | 2x4 grid of labeled panels is discoverable and intuitive. Large touch targets. Plain language labels. No jargon. Mobile uses full-screen overlay for thumb-friendliness. |
| IV. Professional Visual Polish | PASS | Region panels and itinerary panel will use existing dark glass design language, smooth CSS transitions for grid↔itinerary transitions. Consistent typography with existing panels. |
| V. Performant at Any Scale | PASS | 8 region panels + max 18 day entries = negligible data. Photo filtering is a simple date comparison on existing array. Route rebuild from filtered photos is ~O(n) on ~500 items. |
| VI. Unified Media Experience | PASS | Photo viewer, photo wall, and favorites all continue to work — just scoped to the selected region's date range. Return to overview restores full experience. |
| VII. Map-Centric Integration | PASS | Region selector integrates into the trip feed sidebar (an existing map surface). No separate pages or navigation hierarchies. Itinerary notes appear as a sidebar layer, keeping the map as the hero. |

## Project Structure

### Documentation (this feature)

```text
specs/001-trip-region-nav/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
data/
├── manifest.json          # Existing — photo metadata with date fields
├── trip_segments.json     # Existing — city segment boundaries
└── itinerary.json         # NEW — trip itinerary with regions, days, notes

js/
├── region-nav.js          # NEW — region navigation module (grid, itinerary panel, filtering)
├── route-builder.js       # MODIFIED — add date-range filtering support
├── photo-wall.js          # MODIFIED — add setPhotos() for filtered rebuild
├── ViewportSampler.js     # Existing — setPhotos() already exists
└── Leaflet.Photo.js       # Existing — no changes needed

css/
└── map.css                # MODIFIED — add region grid + itinerary panel styles

index.html                 # MODIFIED — add region grid HTML, wire region-nav module
```

**Structure Decision**: This is a frontend-only feature adding one new JS module (`region-nav.js`), one new data file (`itinerary.json`), and modifications to 3 existing files. No new directories needed — follows existing flat structure under `js/` and `data/`.
