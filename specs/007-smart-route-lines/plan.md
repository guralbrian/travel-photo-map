# Implementation Plan: Smart Route Lines

**Branch**: `007-smart-route-lines` | **Date**: 2026-03-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/007-smart-route-lines/spec.md`

## Summary

Replace straight city-to-city route lines with geographically accurate paths derived from photo GPS coordinates. A two-pass algorithm (chronological sweep clustering + Ramer-Douglas-Peucker simplification) produces clean, readable routes that follow the actual travel itinerary. Implementation requires one new JS module and a ~10-line change to the route initialization in `index.html`.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+), CSS3, HTML5
**Primary Dependencies**: Leaflet.js (existing, vendored) — uses `L.latLng.distanceTo()`, `L.polyline`, `L.layerGroup`, `L.divIcon`
**Storage**: N/A — reads existing `data/manifest.json` and `data/trip_segments.json` at runtime; no new data persisted
**Testing**: Manual visual testing against known photo locations; browser console verification of waypoint counts
**Target Platform**: Web browser (static hosting — GitHub Pages, local file server)
**Project Type**: Single (frontend-only static site)
**Performance Goals**: Route computation <50ms for 600 photos; no visible render delay vs. current straight-line approach
**Constraints**: No build step, no npm, no external APIs. All code must be vendorable vanilla JS.
**Scale/Scope**: ~600 photos, 8 trip segments, 7 intercity routes. Expected 3-12 waypoints per route after simplification.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Compliance |
|-----------|--------|------------|
| I. Privacy by Default | PASS | No new data transmitted externally. Route calculation uses existing local photo geotags in the browser. No analytics or tracking added. |
| II. Static & Zero-Config | PASS | All processing is client-side at render time. No server, no API keys, no environment variables. Works with `python -m http.server` and `file://` URLs. |
| III. Approachable by Everyone | PASS | Routes render automatically — no new user interactions required. Existing toggle control preserved. No new UI text or instructions needed. |
| IV. Professional Visual Polish | PASS | Improved routes use same animated dual-layer polyline styling. Routes will look more accurate and polished than current straight lines. No visual regression. |
| V. Performant at Any Scale | PASS | Clustering is O(n log n) sort + O(n) sweep. RDP is O(n log n). Total <50ms for 600 photos. Route rendering unchanged (same `L.polyline` API). |
| VI. Unified Media Experience | PASS | Routes are a map layer. No change to photo/video viewing experience. |
| VII. Map-Centric Integration | PASS | Routes are map layers within the existing `travelRouteLayer` group. No separate pages, screens, or navigation added. |

**Technology Constraints Check**:
- Frontend: Plain HTML, vanilla JS, CSS — COMPLIANT
- No build step — COMPLIANT
- Leaflet.js vendored — COMPLIANT (no new libraries needed)
- JSON data format — COMPLIANT (reads existing manifest.json and trip_segments.json)
- New frontend dependencies — NONE

**Post-Phase 1 Re-check**: All gates still pass. The design adds one new JS file (`js/route-builder.js`) following the existing pattern of `js/cloud-data.js` and `js/ViewportSampler.js`. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/007-smart-route-lines/
├── spec.md
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/
│   └── route-builder-api.md
└── checklists/
    └── requirements.md
```

### Source Code (repository root)

```text
js/
├── route-builder.js     # NEW — smart route computation module
├── cloud-data.js        # existing
├── ViewportSampler.js   # existing
└── leaflet.js           # existing (vendored)

css/
└── map.css              # MODIFIED — no changes expected (existing route CSS sufficient)

index.html               # MODIFIED — replace inline route building (~lines 862-907) with call to route-builder.js
```

**Structure Decision**: Single frontend project. One new file (`js/route-builder.js`) added to existing `js/` directory. Follows the established pattern where feature modules are standalone script files loaded via `<script>` tag in `index.html`.

## Algorithm Design

### Pipeline

```
1. Filter photos with valid lat/lng
2. Sort chronologically by datetime
3. For each adjacent segment pair (A → B):
   a. Collect photos between segment A's end time and segment B's start time (transit photos)
   b. Also collect photos assigned to segment A that are >15km from A's city center (day-trip outliers)
   c. Chronological sweep cluster: merge sequential photos within 15km / 4hrs
   d. Extract cluster centroids as waypoints
   e. Prepend origin city centroid, append destination city centroid
   f. RDP simplify if waypoints > 15 (cap at 15)
   g. Build dual-layer polyline + arrow from waypoints
4. Return all routes as L.layerGroup
```

### Chronological Sweep Clustering

For each intercity route's candidate photos:
1. Sort by datetime
2. Walk sequentially — if next photo is within 15km AND within 4 hours of previous, add to current cluster
3. Otherwise, start a new cluster
4. Return centroid (mean lat/lng) of each cluster, ordered by earliest datetime

### RDP Simplification

Standard Ramer-Douglas-Peucker on the ordered waypoint sequence:
1. Draw line from first to last waypoint
2. Find the waypoint with maximum perpendicular distance from that line
3. If distance > epsilon (~0.01 degrees ≈ 1km), keep it and recurse on both halves
4. Otherwise, discard all intermediate points

### Arrow Placement

One arrow per intercity route at the geographic midpoint of the full waypoint sequence. Bearing calculated from origin city to destination city (not from adjacent waypoints). This matches the current behavior and keeps the visual clean.

## Complexity Tracking

No constitution violations to justify. All gates pass cleanly.

| Aspect | Complexity | Justification |
|--------|-----------|---------------|
| New files | 1 (`js/route-builder.js`) | Keeps route logic out of monolithic `index.html` |
| Modified files | 1 (`index.html`) | Replace ~45 lines of inline route code with ~5 line module call |
| New dependencies | 0 | Uses existing Leaflet utilities |
| Algorithm complexity | O(n log n) | Sort-dominated; clustering and RDP are both subquadratic |
