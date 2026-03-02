# Feature Specification: Photo Wall Album View

**Feature Branch**: `006-photo-wall`
**Created**: 2026-03-02
**Status**: Draft
**Input**: User description: "Overhaul to the photo wall feature: essentially a panel/album view of cascading photos. This should be the bottom half of the screen and panning down expands it into all of it, where rows of photos appear chronologically. They're an endless view up and down but zoom to the relevant date if a photo had been clicked on the map or similar. If any features have been under described with regards to the UI or UX, refer to the view page for an album in Google Photos."

---

## Context

The travel photo map currently has two primary ways to view photos: individual photo markers on the map and a trip feed sidebar showing daily entries. There is no way to browse all trip photos in a unified grid/album view. This feature adds a persistent photo wall panel — inspired by Google Photos album view — that anchors to the bottom of the screen and can be expanded into a full-screen chronological photo grid. The panel integrates bidirectionally with the map: clicking a map marker scrolls the wall to that photo's date, and the wall provides a complete visual overview of the entire trip's photo collection.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Expand Photo Wall from Bottom Panel (Priority: P1)

A visitor sees a collapsed photo wall panel at the bottom of the screen showing a preview strip of the most recent photos. They drag or swipe the panel upward, causing it to expand smoothly. As it expands, the map above shrinks correspondingly. The panel can reach a fully expanded state covering the entire screen, turning into an immersive photo grid. The visitor can also drag the panel back down to any intermediate height or collapse it entirely.

**Why this priority**: This is the foundational interaction — establishing the panel as a persistent, resizable component. All other photo wall behaviors depend on this layout being in place.

**Independent Test**: Can be fully tested by opening the app and verifying the collapsed panel is visible at the bottom, dragging it up causes a smooth resize (map shrinks, panel grows), the fully expanded state fills the screen, and dragging back down restores the map.

**Acceptance Scenarios**:

1. **Given** the app loads, **When** the visitor views the page, **Then** a photo wall panel is visible at the bottom of the screen in a collapsed preview state (approximately 30% of screen height), showing a partial row of photo thumbnails.
2. **Given** the panel is in collapsed state, **When** the visitor drags the panel's handle upward or scrolls down within it, **Then** the panel expands smoothly upward while the map above contracts, maintaining a seamless split layout.
3. **Given** the visitor continues dragging upward, **When** the panel reaches the top of the viewport, **Then** the panel occupies the full screen height and the map is fully hidden behind it.
4. **Given** the panel is fully expanded, **When** the visitor drags the handle downward or swipes down at the top of the panel, **Then** the panel shrinks back, restoring the map portion above.
5. **Given** the visitor releases the drag at any intermediate height, **When** the drag gesture ends, **Then** the panel snaps to the nearest stable height: collapsed (~30%), half-screen (~50%), or full-screen (100%).

---

### User Story 2 - Browse Photos Chronologically in Grid View (Priority: P1)

A visitor expands the photo wall and sees all trip photos arranged in a justified grid with date section headers separating groups by day. Photos flow left-to-right in rows, with varying widths preserving their original aspect ratios (like Google Photos album view). Scrolling up goes back in time, scrolling down goes forward. Date headers (e.g., "Jan 28 · London") are sticky/prominent as the visitor scrolls. A date scrubber on the right edge lets the visitor quickly jump to any point in the trip.

**Why this priority**: The core browsing experience — providing a complete visual overview of all trip photos organized chronologically. Immediately useful once the panel exists.

**Independent Test**: Can be tested by expanding the panel and verifying all photos appear in chronological rows, date headers separate the groups, aspect ratios are preserved, and scrolling through the full collection covers the entire trip with no missing photos.

**Acceptance Scenarios**:

1. **Given** the photo wall panel is expanded, **When** the visitor views the grid, **Then** all trip photos are arranged in horizontal rows that fill the panel width, with each photo's original aspect ratio preserved, no cropping, and consistent row heights.
2. **Given** photos from multiple dates are visible, **When** the grid renders, **Then** each date group is preceded by a date section header showing the day of week, date, and city name (e.g., "Monday, Jan 28 · London").
3. **Given** the visitor is scrolling through the grid, **When** they scroll past a date section boundary, **Then** the current date header remains visible at the top of the panel in a sticky position until the next section takes over.
4. **Given** the panel is expanded, **When** the visitor drags the date scrubber on the right edge, **Then** the grid jumps to the corresponding date in the trip, with a floating tooltip showing the date at the scrubber position.
5. **Given** the visitor is at the beginning or end of the collection, **When** they scroll further in that direction, **Then** no more photos load (the collection is bounded by the trip dates) and a visual indicator shows they've reached the boundary.

---

### User Story 3 - Map-to-Wall Navigation (Priority: P1)

A visitor clicks a photo marker on the map (or opens a photo in the immersive viewer via the trip feed). The photo wall panel, even if collapsed, automatically expands to at least half-screen height and scrolls to the date section containing that photo. The specific photo is visually highlighted in the grid (brief glow or border). This creates a seamless two-way navigation between the geographic (map) and chronological (wall) views of the trip.

**Why this priority**: This is the key integration point that makes the photo wall feel like a native part of the app rather than a standalone feature. It ties together the map and the wall into one coherent experience.

**Independent Test**: Can be tested by clicking a map photo marker and verifying the wall panel expands, the grid scrolls to that photo's date group, and the clicked photo is briefly highlighted. Test with photos from different dates and cities to confirm all date groups are reachable.

**Acceptance Scenarios**:

1. **Given** a visitor is viewing the map and the photo wall is collapsed, **When** they click a photo marker on the map, **Then** the photo wall panel automatically expands to at least half-screen height and the grid scrolls to show the date section containing that photo.
2. **Given** the photo wall grid is visible, **When** a photo is targeted from the map, **Then** the target photo is visually highlighted in the grid (e.g., a brief pulse animation or temporary border) so the visitor can identify it at a glance.
3. **Given** the photo wall is already expanded but scrolled to a different date, **When** a photo marker is clicked on the map, **Then** the grid smoothly scrolls to bring the target photo's date section into view without re-collapsing and re-expanding the panel.
4. **Given** the visitor clicks a photo in the photo wall grid, **When** the click is registered, **Then** the map pans and zooms to show that photo's map marker, and the photo opens in the existing immersive viewer.

---

### User Story 4 - Responsive Layout on Mobile (Priority: P2)

On a mobile device, the photo wall behaves as a bottom sheet with the same drag-to-expand behavior. In collapsed state, a handle and a single-row preview strip are visible at the bottom. Dragging up reveals the full chronological grid. The justified grid adapts to the narrower screen — fewer photos per row while still preserving aspect ratios. The date scrubber remains accessible on the right edge.

**Why this priority**: Mobile is a primary use case for a travel photo map, and the existing trip feed already uses a bottom sheet pattern on mobile. The photo wall must feel equally native on small screens.

**Independent Test**: Can be tested on a mobile device or narrow viewport by verifying the collapsed strip is visible, dragging up reveals the grid, rows are appropriately sized for the screen width, and the date scrubber is reachable without interfering with the grid scroll.

**Acceptance Scenarios**:

1. **Given** the viewport is mobile-sized (narrow), **When** the page loads, **Then** the photo wall appears as a bottom sheet with a drag handle and a partial row of preview thumbnails, occupying approximately 25-30% of the screen height in its collapsed state.
2. **Given** the mobile bottom sheet is collapsed, **When** the visitor drags the handle upward, **Then** the panel expands to reveal the full photo grid, with rows containing 2-3 photos per row appropriate for the screen width.
3. **Given** the mobile panel is expanded, **When** the visitor scrolls the grid, **Then** the date scrubber on the right edge remains visible and usable, and scrolling the grid does not accidentally trigger a panel collapse.
4. **Given** the visitor is in a mobile expanded photo wall, **When** they tap a photo, **Then** the immersive viewer opens (as defined in the 005-photo-viewer spec) for that photo.

---

### User Story 5 - Coexistence with Trip Feed Sidebar (Priority: P3)

On desktop, the photo wall panel coexists with the trip feed sidebar (004-trip-feed). When both are visible, the photo wall occupies the bottom portion of the screen below the map, and the trip feed remains in its right sidebar position. Clicking a day in the trip feed scrolls the photo wall to that date section. The photo wall does not overlap or displace the trip feed sidebar.

**Why this priority**: Both features serve different purposes — the feed is a narrative-focused daily summary, while the wall is a visual grid of all photos. They complement each other and should coexist without conflict.

**Independent Test**: Can be tested on desktop by opening both the trip feed and the photo wall simultaneously, verifying they don't overlap, and clicking a trip feed entry to confirm the photo wall scrolls to that date.

**Acceptance Scenarios**:

1. **Given** both the trip feed sidebar and the photo wall panel are visible on desktop, **When** the visitor views the layout, **Then** the trip feed occupies the right sidebar and the photo wall occupies the bottom strip below the map — no overlap.
2. **Given** both components are visible, **When** the visitor clicks a daily entry in the trip feed, **Then** the photo wall scrolls to that day's date section in addition to panning the map (existing behavior).
3. **Given** the visitor expands the photo wall to full screen on desktop, **When** the panel is fully expanded, **Then** the trip feed sidebar remains accessible (either via a button or by collapsing the photo wall).

---

### Edge Cases

- What happens when the photo wall is fully expanded and the user tries to drag it further up? The panel remains at full-screen size and the drag is ignored (no overscroll).
- What happens when the visitor scrolls the map while the photo wall is partially expanded? Map interactions should work normally in the map portion above the panel; scroll events within the panel should not propagate to the map.
- What happens when a photo clicked on the map does not appear in the photo wall grid (e.g., filtered out)? The photo wall scrolls to the closest visible date section, and a brief message informs the user why the specific photo isn't shown.
- What happens when the photo collection is very large (1000+ photos)? The grid must use virtualized rendering — only photos near the visible area are rendered in the DOM. Scrolling performance must not degrade with photo count.
- What happens when photos for a date are loading slowly? Placeholder tiles of the correct aspect ratio are shown in the grid while the actual thumbnail loads, then fade in when ready.
- What happens when the visitor resizes the browser window? The panel layout re-flows gracefully — the grid re-calculates row widths and photo sizes to fit the new panel width.
- What happens when the panel is in an intermediate height state and the user rotates their mobile device? The panel re-snaps to the nearest valid snap point for the new orientation.
- What happens when there are no photos? The panel shows an empty state message with a clear explanation.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST display a persistent photo wall panel anchored to the bottom of the screen, visible in all app states (map view, trip feed visible, etc.).
- **FR-002**: System MUST support drag-to-resize the panel — dragging the handle upward expands the panel and shrinks the map area above, dragging downward collapses the panel and restores the map.
- **FR-003**: System MUST snap the panel to defined stable heights when the drag gesture ends: collapsed (~25-30% of viewport height), half-screen (~50%), and full-screen (100%).
- **FR-004**: System MUST arrange all trip photos in a justified grid layout that preserves each photo's original aspect ratio and fills rows to the full panel width, matching the visual style of Google Photos album view.
- **FR-005**: System MUST organize photos into date sections, with each section preceded by a header showing the day of week, date, and city name (derived from trip segment data).
- **FR-006**: System MUST display date section headers in a sticky position at the top of the panel while the visitor scrolls within that section's photos.
- **FR-007**: System MUST provide a date scrubber along the right edge of the panel that, when dragged, rapidly scrolls the grid to the corresponding date, with a floating tooltip showing the date at the scrubber thumb position.
- **FR-008**: System MUST support continuous scroll in both directions through the entire photo collection — no pagination, no load-more buttons.
- **FR-009**: System MUST use virtualized rendering: only photos within or near the visible area of the panel are rendered, regardless of total photo count.
- **FR-010**: When a photo marker on the map is clicked, System MUST expand the panel to at least half-screen height (if currently collapsed) and scroll the grid to bring that photo's date section into view.
- **FR-011**: When a photo is targeted from the map, System MUST briefly highlight that photo in the grid (pulse animation or temporary highlight border lasting 1-2 seconds).
- **FR-012**: When a photo in the grid is clicked, System MUST open the existing immersive photo viewer (005-photo-viewer) for that photo, with the navigation set covering all photos visible in the grid.
- **FR-013**: When a photo in the grid is clicked, System MUST also pan and zoom the map to show that photo's map marker.
- **FR-014**: On desktop viewports, System MUST position the photo wall panel below the map without overlapping or displacing the trip feed sidebar.
- **FR-015**: On mobile viewports, System MUST display the photo wall as a bottom sheet with a visible drag handle, using the same snap-point behavior as desktop.
- **FR-016**: When a trip feed daily entry is clicked, System MUST scroll the photo wall grid to that day's date section (in addition to panning the map, as per the existing trip feed behavior).
- **FR-017**: System MUST display placeholder tiles of the correct inferred aspect ratio for each photo while thumbnails are loading, replacing them with a crossfade when the thumbnail loads.
- **FR-018**: System MUST prevent scroll events within the photo wall from propagating to the map or causing page-level scrolling.
- **FR-019**: System MUST show an empty state message in the panel when no photos are available to display.

### Key Entities

- **Photo Wall Panel**: The resizable bottom panel component. Attributes: current height (snap state), scroll position, active date section.
- **Photo Grid Item**: A single photo or video displayed in the grid. Attributes: photo entry reference (thumbnail URL, full URL, date, city, aspect ratio, type), rendered position in the grid, loading state.
- **Date Section**: A chronological grouping of photos within the grid. Attributes: date, city name, city color accent, list of photo grid items, vertical position in the grid.
- **Date Scrubber**: The right-edge navigation control for rapid date jumping. Attributes: current position (maps to a date in the collection), visible state.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The photo wall panel opens (expands from collapsed to half-screen) within 300ms of the drag gesture completing, with no visible jank.
- **SC-002**: Scrolling through the photo grid maintains smooth performance (no visible frame drops) for a collection of up to 600 photos.
- **SC-003**: When a map photo marker is clicked, the photo wall scrolls to the correct date section within 400ms of the click, regardless of how far the grid must scroll.
- **SC-004**: The date scrubber correctly navigates to within ±1 day of the dragged position across the full trip date range.
- **SC-005**: All trip photos appear in the grid with correct date attribution — zero photos assigned to a wrong date section.
- **SC-006**: The panel snap behavior completes its snap animation within 250ms of the user releasing the drag gesture.
- **SC-007**: On mobile, the panel behaves as a proper bottom sheet — scrolling within the grid does not accidentally trigger the map or collapse the panel.
- **SC-008**: The photo wall and trip feed sidebar coexist on desktop without any visible layout overlap or displacement.

---

## Assumptions

- The existing photo manifest (`manifest.json`) provides each photo's thumbnail URL, full URL, date, aspect ratio (or width/height dimensions), and city/segment association.
- The existing trip segment data (`trip_segments.json`) provides the city-to-color mapping used for date section header accents.
- The existing snap-point / bottom-sheet drag interaction pattern from the trip feed (004-trip-feed) on mobile will be extended or reused for the photo wall panel.
- Videos in the photo wall are displayed using their thumbnail (poster frame) in the grid, with a play indicator overlay; clicking opens the full viewer.
- The photo wall does not introduce server-side changes — all data is derived from the existing manifest and segment files.
- The justified grid row height is calculated to fill the panel width while maintaining aspect ratios, similar to Google Photos' "Comfortable" view density.
- The entire trip collection (approximately 570 photos) represents the upper bound for initial implementation; the virtualization approach must handle at least 2x that count without performance regression.
- The map-to-wall integration reuses the event system already established by the map marker click handlers — no new inter-component messaging architecture is needed beyond what the existing codebase provides.
