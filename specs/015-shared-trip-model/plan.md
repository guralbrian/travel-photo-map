# Implementation Plan: Shared Trip Data Model

**Branch**: `015-shared-trip-model` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/015-shared-trip-model/spec.md`

## Summary

Create `js/trip-model.js` as the single canonical source for trip region definitions, photo-to-segment assignment, and date indexing. This eliminates duplicated logic across `landing-page.js`, `region-nav.js`, and `app.js` by extracting the shared `REGION_SECTIONS` array, the `buildRegions()`/`buildRegionSections()` functions, the `assignPhotosToTripSegments()` function, and inline date index construction into one IIFE-based module exposed as `window.TripModel`.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES5-compatible IIFEs)
**Primary Dependencies**: None new — Leaflet.js (existing, vendored)
**Storage**: N/A — reads existing `data/manifest.json`, `data/trip_segments.json`, `data/itinerary.json` at runtime
**Testing**: Visual comparison via Playwright at 1440px and 375px widths
**Target Platform**: Static hosting (GitHub Pages, any HTTP server, `python -m http.server`)
**Project Type**: Single-page web application (static files only)
**Performance Goals**: No regression from current load/render performance
**Constraints**: Must load via `<script>` tag (no build tools, no ES modules for this file), ES5-compatible syntax, no new external dependencies
**Scale/Scope**: ~500 photos, 8 regions, 8 trip segments — all data already loaded by existing code

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Rationale |
|-----------|--------|-----------|
| I. Privacy by Default | ✅ Pass | Pure internal refactoring. No new data exposed, no new network requests, no analytics or tracking added. |
| II. Static & Zero-Config | ✅ Pass | No build step, no new dependencies, no server-side processing. New file is a plain `.js` loaded via `<script>` tag. |
| III. Approachable by Everyone | ✅ Pass | Zero user-facing changes. This is an internal code reorganization only. |
| IV. Professional Visual Polish | ✅ Pass | No visual changes whatsoever. Rendering output is identical before and after. |
| V. Performant at Any Scale | ✅ Pass | Same logic reorganized into one file — no additional computation, no extra network requests. One additional `<script>` tag (~5 KB). |
| VI. Unified Media Experience | ✅ Pass | No changes to media handling, lightbox, or viewer behavior. |
| VII. Map-Centric Integration | ✅ Pass | No navigation or UX changes. Map remains the single interaction surface. |

**Gate result: PASS** — All principles satisfied. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/015-shared-trip-model/
├── plan.md              # This file
├── research.md          # Phase 0: duplication analysis and API design research
├── data-model.md        # Phase 1: entity definitions and shared model structure
├── quickstart.md        # Phase 1: integration guide for consumer modules
├── contracts/
│   └── trip-model-api.md  # Phase 1: public API contract for window.TripModel
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
js/
├── trip-model.js        # NEW — shared trip data model (IIFE, exposes window.TripModel)
├── app.js               # MODIFIED — remove assignPhotosToTripSegments(), dateIndex construction; consume TripModel
├── landing-page.js      # MODIFIED — remove REGION_SECTIONS, buildRegions(); consume TripModel
├── region-nav.js        # MODIFIED — remove REGION_SECTIONS, buildRegionSections(); consume TripModel
├── route-builder.js     # UNCHANGED
├── photo-viewer.js      # UNCHANGED
├── photo-wall.js        # UNCHANGED
├── panel-manager.js     # UNCHANGED
├── ViewportSampler.js   # UNCHANGED
└── Leaflet.Photo.js     # UNCHANGED

index.html               # MODIFIED — add <script src="js/trip-model.js"> before region-nav.js
```

**Structure Decision**: Single static-hosted web app. The new `trip-model.js` file is added to the existing `js/` directory alongside all other application modules. No new directories needed. The file is an IIFE that attaches to `window.TripModel`, consistent with the pattern used by other modules (`window.photoViewer`, `window.PhotoWall`, `window.initRegionNav`, etc.).

## Complexity Tracking

> No constitution violations — table not needed.
