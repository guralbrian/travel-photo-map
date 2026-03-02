# Tasks: Smart Route Lines

**Input**: Design documents from `/specs/007-smart-route-lines/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/route-builder-api.md

**Tests**: Not requested — manual visual testing per quickstart.md.

**Organization**: Tasks grouped by user story. US1 and US2 are co-equal P1 and tightly coupled (same algorithm serves both), so they share a phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Create the new module file and wire it into the HTML

- [x] T001 Create `js/route-builder.js` with IIFE module scaffold exposing `buildSmartRoutes` on the global scope. Include constants at the top: `CLUSTER_RADIUS_KM = 15`, `CLUSTER_TIME_GAP_HRS = 4`, `RDP_EPSILON = 0.01`, `MAX_WAYPOINTS = 15`. Stub out the five internal functions (`getRoutePhotos`, `chronoCluster`, `rdpSimplify`, `calcBearing`, `buildSmartRoutes`) as empty functions returning placeholder values. Follow the existing pattern in `js/cloud-data.js` (IIFE with global assignment).
- [x] T002 Add `<script src="js/route-builder.js"></script>` to `index.html`, placed after the Leaflet script tag and before the main inline `<script>` block that uses it. Verify the load order: leaflet.js → route-builder.js → inline script.

**Checkpoint**: Module loads without errors; `buildSmartRoutes` is callable from browser console.

---

## Phase 2: Foundational — Algorithm Building Blocks

**Purpose**: Implement the two core algorithm functions that all user stories depend on. These are pure functions with no Leaflet or DOM dependencies.

**CRITICAL**: No user story work can begin until these are complete.

- [x] T003 Implement `chronoCluster(sortedPhotos, radiusKm, timeGapHrs)` in `js/route-builder.js`. Input: array of photo objects sorted by `datetime`, each with `lat`, `lng`, `datetime` fields. Algorithm: walk sequentially; if next photo is within `radiusKm` (using `L.latLng.distanceTo()` in meters, divide by 1000) AND within `timeGapHrs` of the previous photo, add to current cluster; otherwise start a new cluster. Return: array of cluster centroids `{lat, lng, datetime, count}` where `lat`/`lng` are the mean of member coordinates and `datetime` is the earliest member's datetime. Handle empty input by returning empty array.
- [x] T004 Implement `rdpSimplify(waypoints, epsilon)` in `js/route-builder.js`. Input: array of `{lat, lng}` objects and epsilon tolerance in degrees (~0.01 = ~1km). Algorithm: standard Ramer-Douglas-Peucker — find point with max perpendicular distance from line between first and last points; if distance > epsilon, keep it and recurse on both halves; otherwise return just endpoints. Use degree-space approximation for perpendicular distance (sufficient at European latitudes). Return: simplified array of `{lat, lng}` objects. Handle ≤2 input points by returning them unchanged.

**Checkpoint**: Both functions can be tested in browser console with sample coordinate arrays.

---

## Phase 3: User Story 1 + User Story 2 — Accurate & Clean Routes (P1) 🎯 MVP

**Goal**: Replace straight city-to-city lines with geographically accurate routes derived from photo geotags, simplified to avoid visual clutter.

**Independent Test**: Load the map and verify the Copenhagen → Heidelberg route visibly curves through Hamburg. Verify no route has more than 15 waypoints. Verify routes with many nearby transit photos still appear as clean lines.

### Implementation

- [x] T005 [US1] Implement `getRoutePhotos(allPhotos, segFrom, segTo)` in `js/route-builder.js`. Purpose: extract photos relevant to the route between two adjacent segments. Logic: (1) filter to photos with valid `lat` and `lng` (not null/undefined), (2) collect photos whose `datetime` falls between `segFrom.end` and `segTo.start` (transit photos), (3) also collect photos assigned to `segFrom` (cityIndex matches) whose distance from `segFrom` city center exceeds `CLUSTER_RADIUS_KM` (outlier/day-trip photos). Return: combined array sorted by `datetime`. Use `L.latLng(seg.lat, seg.lng).distanceTo(L.latLng(p.lat, p.lng))` for distance checks (returns meters).
- [x] T006 [US1] [US2] Implement the waypoint assembly pipeline as a helper function `computeWaypoints(routePhotos, segFrom, segTo)` in `js/route-builder.js`. Steps: (1) call `chronoCluster(routePhotos, CLUSTER_RADIUS_KM, CLUSTER_TIME_GAP_HRS)` to get cluster centroids, (2) convert centroids to `{lat, lng}` waypoint array, (3) prepend `{lat: segFrom.lat, lng: segFrom.lng}` as first waypoint, (4) append `{lat: segTo.lat, lng: segTo.lng}` as last waypoint, (5) if waypoint count > `MAX_WAYPOINTS`, call `rdpSimplify(waypoints, RDP_EPSILON)` and if still > `MAX_WAYPOINTS`, increase epsilon by 50% and retry until ≤ `MAX_WAYPOINTS`, (6) return the final waypoint array. If no route photos exist (empty input), return just `[segFrom coords, segTo coords]` (fallback to direct line per FR-005).
- [x] T007 [US1] Implement dual-layer polyline + arrow rendering as a helper function `renderRoute(waypoints, segFrom, segTo, routeGroup, arrowMarkers)` in `js/route-builder.js`. For each route: (1) convert waypoints to `[[lat,lng], ...]` format for Leaflet, (2) create background `L.polyline` with `{color: segFrom.color, weight: 5, opacity: 0.3, lineCap: 'round'}` and bind popup `segFrom.name + ' → ' + segTo.name`, (3) create foreground `L.polyline` with `{color: segFrom.color, weight: 3, opacity: 0.7, dashArray: '8, 12', className: 'route-line-animated'}`, (4) calculate route midpoint as the waypoint closest to the geographic center of all waypoints, (5) create arrow `L.divIcon` with SVG rotated to `calcBearing(segFrom.lat, segFrom.lng, segTo.lat, segTo.lng)` using `segFrom.color`, (6) add all layers to `routeGroup` and push arrow marker to `arrowMarkers` array.
- [x] T008 [US1] Complete `buildSmartRoutes(photos, segments, map)` in `js/route-builder.js`. This is the public API per the contract. Logic: (1) return empty `L.layerGroup()` if segments.length < 2, (2) create `routeGroup = L.layerGroup()` and `arrowMarkers = []`, (3) loop through adjacent segment pairs `(segments[i], segments[i+1])`, (4) for each pair call `getRoutePhotos` → `computeWaypoints` → `renderRoute`, (5) register `map.on('zoomend', ...)` handler to toggle arrow visibility at zoom < 4 (same logic as current implementation), (6) return `routeGroup`.
- [x] T009 [US1] Replace inline route building in `index.html`. Remove the block from `var arrowMarkers = [];` through the route construction loop and arrow zoom handler (~lines 862-918). Replace with: `travelRouteLayer = buildSmartRoutes(allPhotos, tripSegments, map); if (travelRouteLayer) travelRouteLayer.addTo(map);`. Also move the `calcBearing` function from `index.html` into `js/route-builder.js` (it's already stubbed there from T001). Keep the existing toggle handler and CSS unchanged.

**Checkpoint**: Routes render with intermediate waypoints. Copenhagen → Heidelberg curves through Hamburg. Routes are clean with ≤15 waypoints each. Fallback direct lines work for segments with no transit photos.

---

## Phase 4: User Story 3 — No Major Route Gaps (P2)

**Goal**: Ensure no intercity route has unexplained geographic jumps when photo evidence exists for intermediate locations.

**Independent Test**: Inspect all 7 routes visually. No single line segment should jump >200km when photos exist in between. Each distinct intermediate city/town visible in photos should appear as a waypoint.

### Implementation

- [x] T010 [US3] Add gap detection validation to `computeWaypoints()` in `js/route-builder.js`. After the RDP simplification step, walk the final waypoint sequence and check if any consecutive pair is >200km apart (using `L.latLng.distanceTo()`). If a gap is found AND the original (pre-RDP) waypoints had intermediate points in that span, re-insert the most significant dropped waypoint (the one farthest from the gap line). Log a console warning when gap remediation occurs: `console.warn('Route gap remediated:', segFrom.name, '→', segTo.name, gapKm + 'km')`.
- [x] T011 [US3] Add debug logging to `buildSmartRoutes()` in `js/route-builder.js`. After all routes are built, log a summary table to the console: for each route, log `{from, to, waypointCount, maxSegmentKm, transitPhotoCount}`. Use `console.table()` if available, otherwise `console.log()`. This enables manual verification of SC-001 through SC-003 per the quickstart.md checklist.

**Checkpoint**: Console shows route statistics. No route has a segment >200km when transit photos exist. Hamburg waypoint is clearly present in Copenhagen → Heidelberg route.

---

## Phase 5: User Story 4 — Preserved Existing Controls (P3)

**Goal**: All existing route UI controls continue to work identically — toggle, colors, arrows, animation.

**Independent Test**: Toggle "Travel Route" checkbox off and on. Verify routes disappear and reappear. Verify colors match city segment colors. Verify dashed animation flows. Verify arrows hide at low zoom.

### Implementation

- [x] T012 [US4] Verify and fix toggle handler compatibility in `index.html`. The existing toggle handler at ~line 1107 references `travelRouteLayer`. Since `buildSmartRoutes()` now returns the layer group assigned to `travelRouteLayer`, the toggle should work without changes. Verify that: (1) `travelRouteLayer` is still assigned before the toggle handler runs, (2) unchecking the toggle removes all polylines AND arrow markers, (3) re-checking restores them with correct styling. If the arrow zoom handler needs adjustment (it previously referenced a local `arrowMarkers` array), refactor it into the route-builder module or expose the array.
- [x] T013 [US4] Clean up orphaned code in `index.html`. After confirming all functionality works: (1) remove the now-unused `haversineKm` function if it's only used by route code (check for other callers first), (2) verify no dangling variable references to the old `arrowMarkers` or `routeGroup` local variables, (3) ensure no duplicate `calcBearing` definition exists (it should now live only in `js/route-builder.js`).

**Checkpoint**: Full backward compatibility confirmed. Toggle works. Colors correct. Animation plays. Arrows appear/disappear with zoom. No console errors.

---

## Phase 6: Polish & Validation

**Purpose**: Final tuning and validation across all routes

- [x] T014 Tune clustering parameters in `js/route-builder.js` based on visual results. Load the map and inspect all 7 routes. Adjust `CLUSTER_RADIUS_KM` (try 10-20), `CLUSTER_TIME_GAP_HRS` (try 2-6), and `RDP_EPSILON` (try 0.005-0.02) until routes look natural. Document final chosen values as code comments.
- [x] T015 Run quickstart.md validation checklist: (1) routes curve through intermediate locations, (2) toggle works, (3) arrows hide/show with zoom, (4) Copenhagen → Heidelberg passes near Hamburg, (5) fallback direct lines work for segments without transit photos. Fix any failures found.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on T001 completion — BLOCKS all user stories
- **US1+US2 (Phase 3)**: Depends on Phase 2 completion (T003, T004)
- **US3 (Phase 4)**: Depends on Phase 3 completion (needs working routes to validate gaps)
- **US4 (Phase 5)**: Depends on Phase 3 completion (needs routes integrated into index.html)
- **Polish (Phase 6)**: Depends on all prior phases

### User Story Dependencies

- **US1+US2 (P1)**: Can start after Phase 2 — no dependencies on other stories
- **US3 (P2)**: Depends on US1+US2 completion — gap detection refines existing route computation
- **US4 (P3)**: Depends on US1+US2 completion — validates backward compatibility of the integration

### Within Phases

- T001 → T002 (must create file before referencing it)
- T003, T004 can be implemented in any order (independent algorithms in same file)
- T005 → T006 → T007 → T008 → T009 (sequential pipeline: extract → assemble → render → wire up → integrate)
- T010, T011 can be done in either order
- T012 → T013 (verify before cleanup)
- T014 → T015 (tune before final validation)

### Parallel Opportunities

- T003 and T004 are independent algorithms (but same file, so sequential in practice)
- T010 and T011 are independent additions (same file, sequential in practice)
- T012 and T013 operate on `index.html` but on different code sections
- Phase 4 (US3) and Phase 5 (US4) could theoretically run in parallel since they modify different aspects, but Phase 5 depends on the index.html integration from Phase 3

---

## Parallel Example: Foundational Phase

```bash
# These two algorithms are independent and could be written in parallel
# (but since they're in the same file, implement sequentially):
Task T003: "Implement chronoCluster() in js/route-builder.js"
Task T004: "Implement rdpSimplify() in js/route-builder.js"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (T001-T002)
2. Complete Phase 2: Foundational (T003-T004)
3. Complete Phase 3: US1+US2 (T005-T009)
4. **STOP and VALIDATE**: Load map, verify routes curve through intermediate cities, verify clean display
5. Deploy if ready — this delivers the core value

### Incremental Delivery

1. Setup + Foundational → Module ready
2. US1+US2 → Smart routes visible on map (MVP!)
3. US3 → Gap detection ensures no misleading jumps
4. US4 → Cleanup and backward compatibility confirmed
5. Polish → Parameters tuned, validation passed

### Task Count Summary

| Phase | Story | Tasks |
|-------|-------|-------|
| Phase 1: Setup | — | 2 |
| Phase 2: Foundational | — | 2 |
| Phase 3: US1+US2 (P1) | US1, US2 | 5 |
| Phase 4: US3 (P2) | US3 | 2 |
| Phase 5: US4 (P3) | US4 | 2 |
| Phase 6: Polish | — | 2 |
| **Total** | | **15** |

---

## Notes

- All 15 tasks modify only 2 files: `js/route-builder.js` (new) and `index.html` (existing)
- No tests phase — testing is manual/visual per quickstart.md
- US1 and US2 are combined because the same algorithm (clustering + RDP) serves both stories simultaneously
- The arrow zoom handler migration (T008/T012) is the trickiest integration point — the old code used a local `arrowMarkers` array that the new module must handle
- Commit after each phase checkpoint for safe rollback points
