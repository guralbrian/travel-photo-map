# Research: Trip Region Navigation

**Feature**: 001-trip-region-nav | **Date**: 2026-03-06

## R1: Photo Filtering by Date Range

**Decision**: Filter `allPhotos` by comparing each photo's `date` (YYYY-MM-DD string) against the selected region's start/end dates, producing a `regionFilteredPhotos` subset. Pass this subset to `ViewportSampler.setPhotos()` (already exists), rebuild the photo layer, and update the photo wall.

**Rationale**: Photos already have a `date` field in YYYY-MM-DD format (e.g., `"2026-01-29"`). The existing timeline filter (`applyTimelineFilter()` at index.html:1264) demonstrates the pattern: build a `filteredPhotos` array, call `rebuildPhotoLayer()`, and update the feed. Region filtering follows the same approach but uses region date boundaries instead of slider values.

**Alternatives considered**:
- Filtering by `lat/lng` proximity to region center — rejected because photos may be taken far from the city center (e.g., Bürgstadt day trip from Heidelberg) and date ranges are more reliable and explicitly defined in the itinerary JSON.
- Using existing trip_segments.json boundaries — rejected because segments don't map 1:1 to the 8 user-facing regions (Berlin and Hamburg are separate segments but one region).

## R2: Route Line Filtering

**Decision**: Rebuild route lines from the filtered photo subset by calling `buildSmartRoutes(regionFilteredPhotos, relevantSegments, map)` with only the segments that fall within the selected region's date range. Remove the old `travelRouteLayer` and add the new filtered one.

**Rationale**: Route lines are built from photos via `buildSmartRoutes()` (js/route-builder.js). The function accepts `photos` and `segments` arrays. By passing only the region's photos and matching segments, routes naturally scope to the region. On deselect, rebuild with `allPhotos` and all `tripSegments`.

**Alternatives considered**:
- Hiding/showing individual polyline segments — rejected because route lines are built holistically from photo clusters, not per-segment. Partial show/hide would break the line continuity.
- Adding date metadata to each polyline and toggling visibility — rejected because polylines span segment boundaries and don't have clean date ranges.

## R3: Photo Wall Filtering

**Decision**: Add a `setPhotos(photos)` method to the `PhotoWall` class that replaces the internal photo array, rebuilds the date sections and layout cache, and re-renders. Call this when a region is selected/deselected.

**Rationale**: `PhotoWall` currently receives `allPhotos` in its constructor and builds layout once. It already has `_buildLayout()` and `_renderGrid()` methods that can be re-invoked. Adding `setPhotos()` follows the same pattern as `ViewportSampler.setPhotos()` which already exists.

**Alternatives considered**:
- Destroying and re-creating the PhotoWall instance — rejected because it's heavier, loses scroll position state, and requires re-wiring all event listeners.
- CSS-based hiding of non-matching photos — rejected because the justified grid layout computes pixel positions for all photos; hiding individual items would leave gaps.

## R4: Region Grid UI Integration

**Decision**: Add the region grid HTML inside the `#feed-sidebar` element, above `#feed-entries`. The grid is hidden by default and shown via a toggle button in the feed header. When a region is selected, the grid hides and an itinerary panel replaces it. The existing feed entries are hidden while the region view is active.

**Rationale**: The trip feed sidebar already has the right structure: a header with controls, a scrollable content area, and mobile bottom-sheet behavior. Adding the region grid as a sibling to `#feed-entries` means both can be toggled independently. The existing sidebar toggle, close button, and drag handle continue to work.

**Alternatives considered**:
- New standalone sidebar — rejected per clarification (user chose integration into existing sidebar).
- Tab-based switching between feed and regions — considered but overly complex for 2 views; a simple toggle button is sufficient.

## R5: Mobile Region Grid Overlay

**Decision**: On viewports ≤ 768px, the region grid appears as a full-screen overlay (fixed position, z-index above map and panels) with a close button. Clicking a region dismisses the overlay and opens the itinerary panel in the feed sidebar's bottom-sheet form.

**Rationale**: The user specified full-screen overlay/bottom sheet for mobile (clarification Q5). A fixed overlay avoids the constraint of fitting a 2x4 grid inside the narrow sidebar (which on mobile is a bottom sheet with limited width). The existing mobile bottom-sheet pattern (feed sidebar, photo wall) provides design language to follow.

**Alternatives considered**:
- Bottom sheet with scrollable single-column list — workable but the user specifically asked for the grid layout to be preserved, and a 2x4 grid fits well in a full-screen overlay at 375px (each panel ~170×80px).

## R6: Region-to-Section Mapping

**Decision**: Define an 8-element configuration array in `region-nav.js` that maps each user-facing section to one or more JSON region names, with display labels, and date ranges derived from the itinerary JSON at load time. The Berlin/Hamburg merge is handled by listing both JSON region names under a single section entry.

**Rationale**: The mapping between 9 raw JSON regions and 8 UI sections is fixed and unlikely to change. A declarative config array is simple, readable, and avoids runtime inference.

**Config structure**:
```javascript
const REGION_SECTIONS = [
  { label: 'UK',                        jsonRegions: ['UK - London'] },
  { label: 'Copenhagen Pt. 1',          jsonRegions: ['Copenhagen (Visit 1)'] },
  { label: 'Baden-Württemberg',         jsonRegions: ['Heidelberg'] },
  { label: 'Munich',                    jsonRegions: ['Munich'] },
  { label: 'Prague',                    jsonRegions: ['Prague'] },
  { label: 'Dresden / Meißen',         jsonRegions: ['Dresden / Meißen'] },
  { label: 'Berlin / Hamburg',          jsonRegions: ['Berlin', 'Hamburg'] },
  { label: 'Copenhagen Pt. 2',          jsonRegions: ['Copenhagen (Visit 2)'] },
];
```

Each section derives its center coordinates (averaged lat/lng of constituent JSON regions), date range (min date to max date across all days in constituent regions), and combined day entries (merged + sorted by date).

## R7: Itinerary Panel Content

**Decision**: The itinerary panel shows: region label as a heading, date range as a subtitle (e.g., "Jan 26 – Jan 29, 2026"), followed by a scrollable list of day cards. Each day card shows a formatted date (e.g., "Wed, Jan 28") and the notes text. Days with empty notes show the date with a subtle "No notes" indicator.

**Rationale**: Matches the existing feed entry design language (date + city name + content) while being simpler (no thumbnails in the itinerary panel). Keeping it text-focused lets the itinerary complement the photo-centric wall and map.
