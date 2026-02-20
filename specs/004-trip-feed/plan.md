# Implementation Plan: Trip Feed / Timeline Sidebar

**Branch**: `004-trip-feed` | **Date**: 2026-02-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/004-trip-feed/spec.md`

## Summary

Add a chronological trip feed sidebar that displays daily entries with city names (color-coded by trip segment), photo thumbnails, and optional editor-written narrative text. Clicking an entry smoothly pans the map to that day's photos. On desktop, the feed is a 280px right sidebar coexisting with the left control panel. On mobile, it becomes a three-state swipeable bottom sheet. Daily narratives are stored in Firestore (`dailyNarratives/all`) following the existing single-document pattern.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES5-compatible), CSS3, HTML5
**Primary Dependencies**: Leaflet.js (existing), Firebase SDK v11.6.0 (existing, vendored)
**Storage**: Firestore `dailyNarratives/all` document (new); existing `manifest.json` and `trip_segments.json` for photo/segment data
**Testing**: Manual browser testing (no test framework; matches existing project approach)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge), desktop and mobile
**Project Type**: Single static web application
**Performance Goals**: Feed loads in <2s, map fly animation <1s, 60fps scrolling and transitions
**Constraints**: No build step, no frameworks, vendor all dependencies, offline-capable writes
**Scale/Scope**: ~570 photos across 22 dates, 8 city segments, <200 POIs

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy by Default | PASS | Feed displays only data already in manifest.json. No new external data transmission. Narratives stored in existing Firestore (same as tags/captions). |
| II. Static & Zero-Config | PASS | Feed renders from static manifest.json and trip_segments.json. Narratives degrade gracefully if Firestore unavailable (feed still shows photos, just no text). No new API keys or config needed. |
| III. Approachable by Everyone | PASS | Feed is a scrollable list of day cards — intuitive touch/click interaction. Large tap targets for entries. Plain language (city names, dates). Bottom sheet on mobile follows native UX conventions. |
| IV. Professional Visual Polish | PASS | Dark glass sidebar matching existing control panel. Trip segment colors for visual continuity. Smooth CSS transitions (0.25s ease-out). Spring-feel bottom sheet animation. |
| V. Performant at Any Scale | PASS | dateIndex built in O(n) single pass (<1ms for 570 photos). Max 6 thumbnails per entry with "+N more" indicator. Feed entries are lightweight DOM (no virtual scrolling needed for 22 entries). |
| VI. Unified Media Experience | PASS | Clicking thumbnails in feed opens existing lightbox. Photo display uses same thumbnail→HD progressive loading. |
| VII. Map-Centric Integration | PASS | Feed is a map overlay (like the existing control panel), not a separate page. Clicking entries pans the map. Feed respects timeline slider filter. The feed is dismissible — map remains the primary surface. |

**Post-design re-check**: All gates still pass. The feed sidebar pattern is architecturally identical to the existing control panel — a dismissible overlay that drives map interaction.

## Project Structure

### Documentation (this feature)

```text
specs/004-trip-feed/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── firestore-rules-addition.txt
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
# Files modified
index.html               # Feed UI, dateIndex build, feed-to-map interaction
css/map.css              # Feed sidebar styles, bottom sheet, entry cards
js/cloud-data.js         # dailyNarratives CRUD (load, save, get, offline queue)
firebase/firestore.rules # Add dailyNarratives/all rule

# No new JS files — all feed logic lives in index.html inline script
# (consistent with existing pattern for lightbox, timeline, favorites)
```

**Structure Decision**: This feature adds no new source files. All feed UI and logic is added to the existing `index.html` inline script (matching the pattern used for the lightbox, timeline slider, and favorites). Cloud data functions are added to `js/cloud-data.js` (matching the pattern for tags/captions). CSS goes in `css/map.css`.
