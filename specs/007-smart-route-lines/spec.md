# Feature Specification: Smart Route Lines

**Feature Branch**: `007-smart-route-lines`
**Created**: 2026-03-02
**Status**: Draft
**Input**: User description: "Improve the location routes shown in the map by using the information from the geographical tags of the photos. Don't clutter the screen with sequential lines between each photo, but find some graceful way of following the itinerary generally, while not allowing major gaps in the lines. I.e., there is a line from Copenhagen to Heidelberg directly, but there is a photo off to the side showing where we actually went on the train through Hamburg."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Accurate Intercity Travel Routes (Priority: P1)

A visitor views the travel map and sees route lines between cities that reflect the actual path traveled, rather than straight point-to-point lines. For example, the route from Copenhagen to Heidelberg passes through Hamburg because photos taken during that train journey reveal the detour. The visitor can follow the general trajectory of the trip and understand the geographic story of the journey.

**Why this priority**: This is the core value of the feature — replacing misleading straight-line routes with geographically accurate paths that tell the real travel story.

**Independent Test**: Can be fully tested by comparing route lines on the map against known photo GPS coordinates taken during transit between cities. A route that previously showed a straight line from Copenhagen to Heidelberg should now visibly curve through the Hamburg area where transit photos exist.

**Acceptance Scenarios**:

1. **Given** a map with loaded trip data, **When** the map displays the route between two cities where transit photos exist along the way, **Then** the route line passes near the locations of those transit photos rather than drawing a straight line between city centers.
2. **Given** photos taken during a train ride between two cities, **When** the route renders, **Then** the path reflects the general geographic trajectory of the train route as evidenced by photo geotags.
3. **Given** a transit segment with no intermediate photos, **When** the route renders, **Then** a direct line between city centers is drawn as a fallback (current behavior preserved).

---

### User Story 2 - Clean, Uncluttered Route Display (Priority: P1)

A visitor sees smooth, simplified route lines that convey the general path without visual noise. The map does not show individual line segments zigzagging between every single photo location. Instead, the route is a clean, readable representation of the travel trajectory.

**Why this priority**: Equally critical as P1 — cluttered routes would make the map harder to read than the current straight lines, defeating the purpose of the improvement.

**Independent Test**: Can be tested by loading a trip with many photos in a concentrated area and verifying the route line appears as a smooth path rather than a tangled web of connections between individual photo locations.

**Acceptance Scenarios**:

1. **Given** a transit segment with many photos taken in close proximity (e.g., walking around a train station), **When** the route renders, **Then** only representative waypoints are used and the line does not zigzag between nearby photo locations.
2. **Given** a fully loaded map with all trip segments, **When** a visitor views the map at overview zoom, **Then** route lines appear as clean, readable paths without visual clutter.
3. **Given** multiple photos with similar GPS coordinates (within the same neighborhood), **When** the route is calculated, **Then** those photos contribute at most one waypoint to the route.

---

### User Story 3 - No Major Route Gaps (Priority: P2)

When a visitor traces the route across the map, there are no unexplained large geographic jumps. If photos reveal intermediate stops or detours, the route accounts for them so the travel narrative remains continuous and believable.

**Why this priority**: Gaps in the route break the storytelling experience. While the route doesn't need to be GPS-precise, it should not have unexplained leaps that confuse the viewer.

**Independent Test**: Can be tested by checking that the longest single line segment in any route does not skip over a geographic area where photos were actually taken.

**Acceptance Scenarios**:

1. **Given** a route between two cities with a photo taken at a location significantly off the direct path (e.g., Hamburg between Copenhagen and Heidelberg), **When** the route renders, **Then** the route line curves toward that intermediate location rather than bypassing it.
2. **Given** a transit route with photos spread across 3+ distinct intermediate locations, **When** the route renders, **Then** each intermediate location is reflected as a waypoint in the route.

---

### User Story 4 - Preserved Existing Controls (Priority: P3)

A visitor can still toggle route visibility on and off using the existing "Travel Route" checkbox. The improved routes respect the same layer controls, styling conventions, and color-coding as the current implementation.

**Why this priority**: Existing UI controls and visual language should not break. This ensures backward compatibility with the current user experience.

**Independent Test**: Can be tested by toggling the "Travel Route" checkbox and verifying the improved route lines appear and disappear as expected, using the same color scheme per city segment.

**Acceptance Scenarios**:

1. **Given** the map is loaded with smart routes, **When** the visitor unchecks the "Travel Route" toggle, **Then** all route lines and direction arrows disappear from the map.
2. **Given** routes are hidden, **When** the visitor re-checks the toggle, **Then** the improved routes reappear with correct colors and styling.

---

### Edge Cases

- What happens when a photo has no GPS coordinates (null lat/lng)? Photos without geolocation data are excluded from route calculation.
- What happens when all photos between two cities are concentrated in a single location? The route passes through that single intermediate point and continues to the destination.
- What happens when photos between cities are out of chronological order due to camera clock issues? Photos are sorted chronologically by their timestamp; minor clock drift does not affect route quality since the path is spatially simplified.
- What happens when two adjacent trip segments share the same city (e.g., returning to a previously visited location)? Each segment transition is treated independently; routes are drawn for each intercity connection as it appears in the trip timeline.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST use photo GPS coordinates as waypoints when constructing route lines between trip segments, rather than drawing straight lines between city centers alone.
- **FR-002**: System MUST simplify the route path so that clusters of nearby photos contribute at most one representative waypoint, preventing visual clutter from individual photo-to-photo connections.
- **FR-003**: System MUST identify photos taken during transit between cities (between the end of one segment and the start of the next) and incorporate their locations into the route.
- **FR-004**: System MUST also consider photos within a segment that are geographically distant from the city center, as they may indicate day trips or detours that should be reflected in the route.
- **FR-005**: System MUST fall back to a direct city-to-city line when no intermediate photo waypoints exist for a given segment transition.
- **FR-006**: System MUST preserve the existing color-coding scheme where route segments inherit the color of the origin city.
- **FR-007**: System MUST preserve compatibility with the existing "Travel Route" toggle control and layer visibility behavior.
- **FR-008**: System MUST render route lines that are smooth and readable at all zoom levels, adapting line detail appropriately.
- **FR-009**: System MUST preserve the animated dashed-line styling and direction arrow indicators on improved routes.
- **FR-010**: System MUST exclude photos with missing or invalid GPS coordinates from route calculations.

### Key Entities

- **Photo Waypoint**: A geographic coordinate derived from one or more photo geotags that serves as a point along a route. Attributes include latitude, longitude, timestamp, and the trip segment it falls between.
- **Transit Photo**: A photo whose timestamp falls between the end of one trip segment and the start of the next, indicating it was taken while traveling between cities.
- **Simplified Route**: An ordered sequence of waypoints (including origin city, intermediate waypoints, and destination city) that represents the travel path between two trip segments after spatial simplification.
- **Trip Segment**: An existing entity representing a named stop on the trip with a city center coordinate, time window, and color.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For any intercity route where transit photos exist, the route line passes within visual proximity of at least 80% of distinct intermediate geographic areas captured in photos.
- **SC-002**: The total number of rendered waypoints per intercity route does not exceed 15, keeping routes clean and readable regardless of how many photos were taken during transit.
- **SC-003**: No individual straight-line segment within a route spans more than 200 km when intermediate photos exist within that span, ensuring major geographic gaps are filled.
- **SC-004**: The map loads and renders all route lines within the same time frame as the current implementation (no noticeable performance degradation to the visitor).
- **SC-005**: 100% of existing route controls (toggle visibility, color-coding, direction arrows) continue to function identically after the improvement.

## Assumptions

- Photos taken during transit (between segment end/start times) are the primary source for intermediate waypoints. Photos within a segment but far from the city center are a secondary source.
- A "cluster" of nearby photos can be reasonably defined as photos within approximately 10-20 km of each other, though the exact threshold is an implementation detail.
- The existing `trip_segments.json` segment boundaries (start/end datetimes) are accurate enough to identify transit vs. in-city photos.
- The current dual-layer polyline styling (background + animated foreground) will be extended to the new multi-waypoint routes without fundamental visual redesign.
- Route simplification applies spatial simplification (reducing point density) rather than actual road/rail network routing — the goal is geographic accuracy, not turn-by-turn directions.
