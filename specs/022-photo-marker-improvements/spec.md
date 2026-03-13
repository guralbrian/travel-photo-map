# Feature Specification: Photo Marker Improvements

**Feature Branch**: `022-photo-marker-improvements`
**Created**: 2026-03-13
**Status**: Draft
**Input**: User description: "I want to update the photo marker rendering to address two problems: 1) any movement or zoom change flashes all photos on the map and makes the cluster markers reload — users should be able to see photos move as they pan the map. Clusters need to be more static/persistent. 2) Markers should be a bit smaller overall, with a thinner outline, and allow a bit more overlap so users can get a sense of where we went in a city based on photo distribution."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Stable Markers During Map Pan (Priority: P1)

A visitor is browsing the map and pans across a city. As they drag, the photo markers move with the map smoothly — no markers disappear and reappear, no flash of empty map, no cluster reforming mid-drag. The markers they see while panning are the same ones they saw before they started dragging.

**Why this priority**: This is the most disorienting part of the current experience. Every pan triggers a full marker reload, making the map feel broken. Stable markers are the baseline expectation for any map-based UI.

**Independent Test**: Load the map, note which markers are visible, pan the map in any direction, verify: (a) no flash/blank period occurs, (b) markers that were visible and remain in-viewport stay on screen throughout the drag, (c) only markers that exit the viewport are removed, and new ones entering the viewport appear smoothly.

**Acceptance Scenarios**:

1. **Given** the map has photo markers visible, **When** the user pans (drags) the map, **Then** existing markers move with the map without disappearing and reappearing during the gesture.
2. **Given** the user pans such that a marker exits the viewport edge, **When** the marker leaves the visible area, **Then** it fades out smoothly without affecting other visible markers.
3. **Given** the user pans to reveal a new area, **When** new photos enter the viewport, **Then** they fade in without causing existing visible markers to flash or reload.
4. **Given** the map is at a stable zoom level, **When** the user completes a pan (releases the drag), **Then** the final marker layout is computed once, not repeatedly.

---

### User Story 2 - Stable Clusters on Zoom (Priority: P2)

A visitor zooms in on a city. The cluster groupings recalculate to reflect the new zoom level, but do so as a single settled transition rather than repeatedly reforming while the zoom animation is in progress.

**Why this priority**: Zoom-induced reclustering is expected and acceptable, but the reclustering should happen once — at the end of the zoom — not continuously during the zoom animation, which currently compounds the jitter problem.

**Independent Test**: Start at a zoom level showing clusters, pinch/scroll to zoom in, verify clusters reform only once after the zoom animation completes — not mid-animation.

**Acceptance Scenarios**:

1. **Given** the map is zoomed in or out, **When** the zoom animation completes, **Then** clusters reform once to reflect the new zoom level without further flickering.
2. **Given** the user rapidly zooms in and out multiple times, **When** zoom gestures occur, **Then** cluster recalculation is debounced so it does not run on every intermediate zoom step.

---

### User Story 3 - Smaller, Less Intrusive Markers (Priority: P3)

A visitor is looking at a city they visited and wants to understand where they went based on photo density. The markers are compact enough that several can coexist in a small geographic area without completely occluding the map. The border/frame around each photo thumbnail is thinner, giving photos more visual space within the marker. Enough markers are visible simultaneously that the geographic distribution of the trip within a city is apparent at a glance.

**Why this priority**: This is a visual polish change that makes the map more readable as a travel record. It builds on the stability fixes in P1/P2 — a stable but oversized marker system is still hard to read.

**Independent Test**: Zoom into a city with many photos. Verify: (a) multiple photo markers are visible simultaneously without complete overlap, (b) marker frame borders are visually thinner than current, (c) the geographic spread of photos within the city area is discernible from the marker positions.

**Acceptance Scenarios**:

1. **Given** an area with several nearby photos, **When** the map is viewed at city zoom level, **Then** multiple photo markers are visible simultaneously with acceptable overlap rather than being collapsed into a single cluster.
2. **Given** a photo marker is visible on the map, **When** the user views it, **Then** the marker frame/border is thinner than the current design, giving the photo thumbnail more visual prominence.
3. **Given** a photo marker is visible, **When** compared to the current design, **Then** the overall marker footprint (frame + stem) is smaller at every cluster tier.

---

### Edge Cases

- What happens when dozens of photos share the same GPS coordinate? They should cluster gracefully without the marker growing unboundedly large.
- What happens when the user drags very fast? Markers that were never visible should not flash in and out as the viewport passes through them rapidly.
- What happens at very low zoom (whole-world view) where all photos collapse into a few clusters? Stability behavior should hold — no flashing during pan.
- What happens when the browser window is resized? Marker layout should recalculate once on resize completion, not continuously during the resize drag.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Marker layout MUST NOT be recalculated during an active pan gesture. Recalculation MUST only occur after the pan completes, not on each intermediate movement event.
- **FR-002**: No visual flash or marker reload MUST occur during an active pan gesture. Markers visible before the pan MUST remain visible and move with the map throughout the drag. (Note: the representative photo for a cluster MAY change between pans as screen-space cell boundaries shift — this is acceptable. The goal is eliminating visual jitter, not enforcing geographic identity of cluster representatives.)
- **FR-003**: Cluster recalculation after a zoom change MUST be debounced — it MUST run once after the zoom animation settles, not on every intermediate zoom step.
- **FR-004**: Markers that remain in the viewport across a pan MUST NOT be removed and re-added — they MUST stay in place and move with the map.
- **FR-005**: The default cluster density MUST be reduced (more markers visible by default) so that geographic distribution within a city is apparent without manual adjustment.
- **FR-006**: Photo marker frame sizes MUST be reduced across all cluster tiers compared to current values (tier-0: 70px, tier-1: 85px, tier-2: 100px, tier-3: 115px).
- **FR-007**: The photo frame border/outline thickness MUST be reduced compared to the current design.
- **FR-008**: The density and size sliders in the control panel MUST continue to function correctly after these changes.

### Key Entities

- **Cluster Cell**: A geographic grouping area that selects one photo as representative and counts hidden neighbors. Must produce stable assignments across pans at the same zoom level.
- **Photo Marker**: A map marker displaying a photo thumbnail at its GPS coordinates. Stability means it is reused (not destroyed and recreated) when it remains visible across pan events.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero visible marker flashes or blank-map periods occur during a pan gesture across a populated area.
- **SC-002**: No marker disappears and reappears during a pan gesture. Markers present at pan-start that remain in the viewport are still present at pan-end without having been removed and re-added.
- **SC-003**: At city-level zoom, more photo markers are simultaneously visible compared to the current default density setting, making the geographic trail through a city readable.
- **SC-004**: Marker frame borders are visually thinner than the current design (measurably reduced border width).
- **SC-005**: Overall marker footprint is smaller than current at every cluster tier.

## Clarifications

### Session 2026-03-13

- Q: What does "stable cluster groupings" mean — no visual flash during pan, or same photo always representing the same geographic area? → A: No visual flash (Option A). Stability means markers don't disappear/reappear mid-drag. The representative photo for a cluster may change between pans as screen-space cells shift — this is acceptable. A geo-anchored clustering rewrite is out of scope.

## Assumptions

- **Clustering strategy**: The current screen-space grid approach is retained but triggered only after pan/zoom completes rather than on every intermediate event. This is the minimal change needed to fix the jitter without a full rearchitecture of the clustering system.
- **Geographic stability**: Anchoring recalculation to pan-end means the same photos will represent the same clusters as long as the viewport and zoom don't change — satisfying the stability requirement.
- **Overlap tolerance**: Reducing default cell size (more cells, more visible markers) will naturally allow markers to appear geographically closer. Some visual overlap is acceptable and desirable per the user's request.
- **No new dependencies**: All changes are to existing event wiring in `ViewportSampler.js` and CSS values in existing stylesheets. No new libraries required.
