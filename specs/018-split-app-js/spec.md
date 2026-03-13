# Feature Specification: Split app.js — Extract Feed Controller & Control Panel

**Feature Branch**: `018-split-app-js`
**Created**: 2026-03-12
**Status**: Draft
**Input**: User description: "Extract feed sidebar and control panel subsystems from app.js into their own modules to unblock parallel worktree development"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Feed Sidebar Works After Extraction (Priority: P1)

A visitor opens the trip feed panel, scrolls through daily entries, clicks an entry to fly the map, clicks a thumbnail to open the photo viewer, and reads/edits narratives. All of this behavior must work identically after the feed sidebar logic moves from app.js into feed-controller.js.

**Why this priority**: The feed sidebar is the primary navigation surface and interacts with the map, photo viewer, photo wall, and narrative editing. Any regression here is immediately user-visible.

**Independent Test**: Open the app, expand the feed panel, click a feed entry (map should fly to that date's photos), click a thumbnail (photo viewer should open with that day's photos), verify narrative display/editing if authenticated.

**Acceptance Scenarios**:

1. **Given** the app loads with trip data, **When** the feed panel opens, **Then** all feed entries render with correct dates, city names, segment colors, thumbnails, and "+N more" indicators — identical to the pre-refactor version
2. **Given** a feed entry is clicked, **When** the map animates, **Then** it flies to the bounds of that date's photos with correct asymmetric padding for desktop and mobile
3. **Given** a feed thumbnail is clicked, **When** the photo viewer opens, **Then** it opens with that day's photos at the correct index, enabling day-scoped navigation
4. **Given** the timeline range is changed, **When** the feed updates, **Then** entries outside the date range are hidden and entries within it are shown

---

### User Story 2 - Control Panel Works After Extraction (Priority: P1)

A visitor opens the control panel, switches map layers, toggles the travel route overlay, adjusts density/size sliders, and (if authenticated) signs in/out. All behavior must be identical after the control panel logic moves from app.js into control-panel.js.

**Why this priority**: The control panel contains auth flow, map layer management, and timeline rendering — all critical infrastructure. Regressions here break core map interaction.

**Independent Test**: Open the app, toggle the control panel, switch base layers (map should update), toggle travel route on/off, adjust density slider (photos should re-cluster), adjust size slider (photo icons should resize), sign in/out if Firebase is configured.

**Acceptance Scenarios**:

1. **Given** the control panel is built, **When** the user clicks a base layer radio button, **Then** the map switches to that layer
2. **Given** the travel route checkbox is toggled, **When** it is unchecked, **Then** the route layer is removed from the map; when re-checked, the layer is added back
3. **Given** the density slider is adjusted, **When** the user drags it, **Then** ViewportSampler.setCellSize() is called with the new value
4. **Given** the size slider is adjusted, **When** the user drags it, **Then** ViewportSampler.updateIconSize() is called and the photo layer rebuilds
5. **Given** a user signs in as editor, **When** auth state changes, **Then** the auth UI updates and cloud favorites load correctly

---

### User Story 3 - formatDateShort Consolidated in dom-helpers.js (Priority: P2)

The formatDateShort utility function exists as duplicates in app.js and region-nav.js with slightly different implementations. Both are consolidated into a single version in dom-helpers.js, ensuring consistent date formatting across all surfaces: feed entries, timeline labels, and region navigation.

**Why this priority**: Duplicate utility functions cause maintenance burden and subtle formatting inconsistencies. Consolidation reduces the surface area for bugs.

**Independent Test**: Verify date formatting is correct in feed entry headers, timeline date labels, and region navigation labels. All should display dates as "Mon DD" format (e.g., "Mar 15").

**Acceptance Scenarios**:

1. **Given** a feed entry for date "2024-03-15", **When** it renders, **Then** the date displays as "Mar 15"
2. **Given** the timeline shows a date range, **When** the start/end labels render, **Then** they use the same formatDateShort function from domHelpers
3. **Given** the region navigation panel shows date ranges, **When** dates render, **Then** they use domHelpers.formatDateShort and produce identical output to the pre-refactor version

---

### Edge Cases

- What happens when feed-controller.js calls getFilteredPhotos() after a timeline filter changes filteredPhotos? The getter function returns the current value, solving the stale reference problem.
- What happens when control-panel.js needs to set _cloudFavoritesLoaded? It calls the setter callback provided via init opts, which updates the variable in app.js's closure.
- What happens when the density slider fires rapidly? The existing debounce logic moves intact into control-panel.js.
- What happens if feed-controller.js or control-panel.js loads before app.js? Both modules only define constructors/namespaces on window; they don't execute until app.js calls their init() functions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Feed sidebar logic (entry building, click handlers, thumbnail navigation, narrative rendering/editing, timeline filtering, PanelSnap wiring) MUST be extracted from app.js into a new `js/feed-controller.js` module
- **FR-002**: Control panel logic (panel building, layer switching, route toggling, auth UI, density/size sliders, pending-writes indicator) MUST be extracted from app.js into a new `js/control-panel.js` module
- **FR-003**: Both new modules MUST use the ES5-compatible IIFE pattern matching existing project conventions
- **FR-004**: Both new modules MUST receive dependencies via an `init(opts)` function rather than accessing app.js closure variables directly
- **FR-005**: feed-controller.js MUST receive `getFilteredPhotos()` and `getPhotoIndex()` as getter functions to solve the stale reference problem when app.js reassigns these arrays
- **FR-006**: control-panel.js MUST receive `setCloudFavoritesLoaded(value)` as a setter callback to update the `_cloudFavoritesLoaded` flag in app.js's closure
- **FR-007**: The `formatDateShort` function MUST be moved from app.js into `dom-helpers.js` and the duplicate in region-nav.js MUST be removed
- **FR-008**: region-nav.js MUST be updated to call `domHelpers.formatDateShort()` instead of its local copy
- **FR-009**: Timeline filter functions (`onTimelineVisualUpdate`, `applyTimelineFilter`, `onTimelineRelease`, `scheduleFilterUpdate`) MUST remain in app.js
- **FR-010**: `updatePhotoCount` MUST be callable from app.js via `controlPanel.updatePhotoCount()`
- **FR-011**: `updateFeedForTimeline` MUST be callable from app.js via `feedController.updateFeedForTimeline()`
- **FR-012**: Script load order in index.html MUST place feed-controller.js and control-panel.js after landing-page.js and before app.js
- **FR-013**: No behavioral changes MUST be introduced — all user interactions, event flows, and visual output MUST remain identical

### Key Entities

- **Feed Controller Module**: Encapsulates the feed sidebar subsystem — entry rendering, click navigation, thumbnail viewing, narrative editing, and timeline-driven visibility filtering
- **Control Panel Module**: Encapsulates the control panel subsystem — panel construction, map layer switching, travel route toggling, auth UI, density/size sliders, and pending-writes indication
- **formatDateShort**: Shared utility function that converts ISO date strings to "Mon DD" format, consolidated in dom-helpers.js

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: app.js shrinks from ~1274 lines to ~750 lines, with feed-controller.js at ~320 lines and control-panel.js at ~215 lines
- **SC-002**: All feed interactions (entry click → map fly, thumbnail click → photo viewer, narrative edit, timeline filter) work identically at both desktop (1440px) and mobile (375px) widths
- **SC-003**: All control panel interactions (layer switch, route toggle, slider adjustments, auth flow) work identically
- **SC-004**: formatDateShort produces identical output in all three consuming locations (feed entries, timeline labels, region nav)
- **SC-005**: No new runtime errors are introduced as verified by browser console inspection at both widths

## Assumptions

- The feed sidebar and control panel subsystems have clear boundaries at the function level in app.js, enabling extraction without modifying internal logic
- The getter function pattern (getFilteredPhotos, getPhotoIndex) is sufficient to solve the stale reference problem — no observable/subscription pattern is needed
- The init(opts) dependency injection pattern matches the project's existing conventions (region-nav.js, landing-page.js)
- Timeline filter functions remain in app.js because they directly mutate the filteredPhotos array and trigger rebuilds — moving them would create circular dependencies
- Both new modules are loaded before app.js but do not execute until app.js calls their init() functions during the Promise.all callback
