# Research: Smart Route Lines

**Feature Branch**: `007-smart-route-lines` | **Date**: 2026-03-02

## Research Summary

All NEEDS CLARIFICATION items resolved. No external dependencies required — the solution uses existing Leaflet utilities and ~50 lines of new vanilla JS.

---

## Decision 1: Route Simplification Algorithm

**Decision**: Two-pass approach — chronological sweep clustering followed by Ramer-Douglas-Peucker (RDP) simplification.

**Rationale**: Photos are already timestamped and geotagged. A chronological sweep merges photos that are close in both space and time into "stops" (waypoints). RDP then removes waypoints that don't meaningfully change the route direction. This produces clean, accurate routes with minimal code.

**Alternatives considered**:
- Grid-based spatial clustering: Simple O(n) but grid boundaries are arbitrary — two nearby photos can split across cells. Also ignores temporal proximity.
- Full DBSCAN: Overkill for hundreds of photos. Requires `minPts` tuning and doesn't naturally produce ordered waypoints.
- Supercluster (Mapbox): Designed for marker clustering per zoom level, not route generation. Wrong abstraction.
- Chronological sweep alone (no RDP): Produces too many waypoints for routes with many distinct stops. RDP pass keeps the count manageable.

---

## Decision 2: Clustering Parameters

**Decision**: Use distance threshold of ~15 km and time gap of 4 hours for transit photo clustering.

**Rationale**: Transit photos between cities (e.g., train ride from Copenhagen to Heidelberg) are spaced at city-scale distances (tens of km). A 15 km radius groups photos within the same city/town stop while keeping distinct intermediate cities as separate waypoints. The 4-hour time gap separates genuine stops from brief transit pauses. These parameters can be tuned if results look off.

**Alternatives considered**:
- 500m radius: Too fine-grained for intercity transit routes — would create dozens of waypoints per train ride as the phone captures photos at each station/stop.
- 50 km radius: Too coarse — would merge genuinely distinct intermediate cities (e.g., Hamburg stop would merge with nearby towns).
- No time threshold: Photos at the same location on different days should remain separate waypoints only if they represent different trip legs — the 4-hour gap handles this.

---

## Decision 3: Visual Smoothing Approach

**Decision**: Use Leaflet's built-in `smoothFactor` on `L.Polyline` (no additional library).

**Rationale**: The existing dual-layer polyline rendering (background + animated foreground) already works well visually. With proper waypoints from the clustering algorithm, the routes will naturally curve through intermediate cities. Leaflet's `smoothFactor` provides sufficient rendering smoothness. Adding a Bezier curve library (leaflet-spline) would be unnecessary complexity for marginal visual improvement.

**Alternatives considered**:
- Leaflet.curve (Bezier curves): Adds visual smoothness but requires vendoring a new library and changing the rendering approach from polylines to SVG paths. The animated dash pattern may not work identically with Bezier paths.
- leaflet-spline: Higher-level wrapper around Leaflet.curve — same concerns plus additional dependency.
- No smoothing at all: Polylines with 5-15 waypoints already look smooth enough at map zoom levels. The angular "joints" between segments are barely visible.

---

## Decision 4: Which Photos to Use for Route Waypoints

**Decision**: Use all photos with valid GPS coordinates, sorted chronologically, then cluster. Transit photos (between segment end/start times) are naturally captured. Photos within a segment but far from the city center (>15 km) also contribute as they indicate day trips.

**Rationale**: The existing `assignPhotosToTripSegments` function assigns photos to segments by datetime. Photos that fall between segment boundaries (cityIndex = -1, "Unknown") are true transit photos. However, the clustering approach doesn't need this distinction — by clustering ALL chronologically-sorted geotagged photos, transit photos naturally become waypoints between city clusters.

**Alternatives considered**:
- Only use "Unknown"/unassigned photos: Misses photos taken during transit that happen to fall within a segment's time window (e.g., a photo at Hamburg train station might be timestamped within the Copenhagen segment's end boundary).
- Use segment centroids + transit photos only: Loses within-city geographic detail. The existing centroid-only approach is exactly what we're improving on.

---

## Decision 5: Arrow Placement on Multi-Waypoint Routes

**Decision**: Place one arrow per intercity route segment at the geographic midpoint of the simplified route, oriented along the general bearing from origin to destination city.

**Rationale**: The current implementation places one arrow at the midpoint between city centers. With multi-waypoint routes, placing arrows at every waypoint-to-waypoint segment midpoint would clutter the map. A single arrow per intercity route preserves the current clean look while indicating travel direction.

**Alternatives considered**:
- Arrow at every segment midpoint: Too many arrows, especially for routes with 10+ waypoints.
- Arrow at the geographic centroid of the route: May land off the route line, looking disconnected.
- No arrows: Loses directional context that helps viewers understand journey order.

---

## Decision 6: Handling the Existing Route Building Code

**Decision**: Extract route building into a new module (`js/route-builder.js`) that replaces the inline route construction in `index.html` (lines 862-907). The module exports a single function that takes photos, segments, and map reference, and returns the `L.layerGroup`.

**Rationale**: The current route code is ~45 lines inline in the main HTML. The new logic will be significantly more complex (clustering + simplification + multi-waypoint polylines). Keeping it inline would make `index.html` harder to maintain. A separate module follows the existing pattern of `js/cloud-data.js` and `js/ViewportSampler.js`.

**Alternatives considered**:
- Keep everything inline in index.html: Would add 100+ lines to an already large file. Harder to test and maintain.
- Modify trip_segments.json to include waypoints: Would require a preprocessing step and change the data format. The current approach computes routes at render time from existing data.

---

## Key Technical Findings

### Existing Utilities Available

| Utility | Location | Purpose |
|---------|----------|---------|
| `haversineKm(lat1, lng1, lat2, lng2)` | index.html:343-351 | Distance calculation (already declared, unused in route code) |
| `L.latLng.distanceTo()` | Leaflet built-in | Haversine distance in meters |
| `L.LineUtil.simplify()` | Leaflet built-in | RDP simplification (pixel space) |
| `L.LineUtil.pointToSegmentDistance()` | Leaflet built-in | Perpendicular distance for custom RDP |
| `calcBearing()` | index.html:867-874 | Compass bearing for arrow rotation |

### Data Volume

- **manifest.json**: ~600 photos with GPS coordinates
- **trip_segments.json**: 8 city segments
- **Intercity routes**: 7 (one per adjacent segment pair)
- **Expected waypoints per route**: 3-12 after clustering + RDP
- **Performance**: All operations complete in <50ms for this data volume
