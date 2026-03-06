# Feature Specification: Trip Region Navigation

**Feature Branch**: `001-trip-region-nav`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "I want to integrate this trip itinerary from a json file into the project. I want the users to be able to narrow into any of 8 sections of the trip (UK, Copenhagen part 1, Baden-Württemberg/Franconia, Munich, Prague, Dresden/Meissen, Berlin/Hamburg, and Copenhagen part 2), which would be populated with context from a trip itinerary JSON."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select a Trip Region to Focus the Map (Priority: P1)

A visitor to the travel photo map wants to explore a specific part of the trip. They open the region/leg selector in the trip feed sidebar, which reveals a 2x4 grid of 8 clickable region panels. They click one, and the map pans and zooms to center on that region. The selected region's itinerary context — dates covered and daily notes — appears in the sidebar, giving them a narrative of what happened there.

**Why this priority**: This is the core value of the feature. Without the ability to select a region and see it on the map, no other part of the feature is useful.

**Independent Test**: Can be fully tested by selecting any region button and verifying (a) the map centers and zooms to that region's geographic location and (b) the region's date range and daily notes appear in the UI.

**Acceptance Scenarios**:

1. **Given** the map is loaded, **When** the user selects "UK - London" from the region selector, **Then** the map pans and zooms to London's coordinates and the itinerary panel shows Jan 26–29 with daily notes.
2. **Given** the user has selected a region, **When** they select a different region, **Then** the map transitions to the new region and the panel updates to that region's context.
3. **Given** the map is loaded, **When** no region is selected (default/overview state), **Then** the map shows the full trip extent and no region detail panel is displayed.

---

### User Story 2 - Read Daily Itinerary Notes for a Region (Priority: P2)

A visitor who has selected a region wants to read what happened each day during the trip in that location. They can scroll through a chronological list of dated entries with narrative notes in the itinerary panel.

**Why this priority**: This is the primary content value — the textual narrative from the JSON gives meaning to the photos and map locations. It depends on region selection (P1) being in place.

**Independent Test**: Can be fully tested by selecting a region and verifying that all days for that region appear in date order with their notes text, including days with empty notes.

**Acceptance Scenarios**:

1. **Given** a region is selected, **When** the itinerary panel is visible, **Then** each day entry shows the date and notes text, listed in chronological order.
2. **Given** a region with days that have empty notes, **When** viewing the itinerary panel, **Then** those days still appear with their date but with a visual indicator that no note is recorded (not hidden entirely).
3. **Given** the "Berlin/Hamburg" combined region is selected, **When** the panel is shown, **Then** days from both Berlin (Feb 17–18) and Hamburg (Feb 19) appear in sequence as one continuous section.

---

### User Story 3 - Return to Full Trip Overview (Priority: P3)

A visitor who has been exploring a specific region wants to zoom back out to see the full trip across Europe, resetting the region selection.

**Why this priority**: Completes the navigation loop — users need to be able to exit a focused view and return to the overview without refreshing the page.

**Independent Test**: Can be fully tested by selecting a region, then clicking a "View All" or equivalent reset control, and verifying the map returns to full-trip extent and the itinerary panel hides.

**Acceptance Scenarios**:

1. **Given** a region is selected and the map is focused on it, **When** the user activates the "overview" or "reset" control, **Then** the map zooms out to show all 8 regions and the itinerary panel closes or clears.

---

### Edge Cases

- What happens when a region's JSON entry has no `notes` for any day (e.g., all empty strings)? The panel should still show dates without crashing or hiding the section entirely.
- What if the itinerary JSON file fails to load? The region selector should still be visible with region names, but panel content should show a graceful "no data available" message rather than an error.
- The "Berlin/Hamburg" combined region spans two separate JSON entries — how does the system handle this merge? Days from both entries must appear sequentially without duplicates.
- Copenhagen appears twice in the JSON. The system must correctly distinguish "Copenhagen (Visit 1)" (Jan 30–Feb 3) from "Copenhagen (Visit 2)" (Feb 20–Mar 9) as separate selectable regions.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a region/leg selector accessible from the trip feed sidebar. When opened, it MUST display a clickable 2x4 grid of 8 region panels: UK, Copenhagen Part 1, Baden-Württemberg/Franconia, Munich, Prague, Dresden/Meißen, Berlin/Hamburg, and Copenhagen Part 2.
- **FR-002**: The system MUST load region data (coordinates, dates, daily notes) from the trip itinerary JSON file at page load without requiring user action.
- **FR-003**: When a region is selected, the map MUST pan and zoom to center on that region's geographic coordinates within 1 second.
- **FR-004**: When a region is selected, the system MUST display an itinerary panel showing: region name, date range covered, and all daily entries with their dates and notes in chronological order.
- **FR-005**: The "Berlin/Hamburg" region MUST combine daily entries from both the Berlin and Hamburg JSON entries into a single contiguous list ordered by date.
- **FR-006**: The region selector MUST visually indicate which region is currently selected (active/highlighted state).
- **FR-007**: The system MUST provide a back/close button in the itinerary panel that returns to the region grid. Clicking back MUST deselect the region, restore the full-trip map extent, restore all photos and route lines, and show the 2x4 region grid again.
- **FR-011**: When a region is selected, the 2x4 grid MUST collapse and be replaced by the itinerary panel (region name, date range, daily notes). The grid is not visible while viewing a region's itinerary.
- **FR-012**: On mobile viewports (375px and below), the region grid MUST appear as a full-screen overlay or bottom sheet instead of within the trip feed sidebar. After selecting a region, the overlay closes and the itinerary notes appear in a mobile-appropriate panel.
- **FR-008**: Days with empty notes in the JSON MUST still appear in the itinerary panel with their date visible, not be silently omitted.
- **FR-009**: When a region is selected, the system MUST filter photos displayed on the map and in the photo wall to show only photos taken during that region's date range. Photos outside the selected region's dates MUST be hidden from both the map markers and the photo wall. When the user returns to the full-trip overview, all photos MUST be restored.
- **FR-010**: When a region is selected, the system MUST filter route lines on the map to show only routes within the selected region's date range. When the user returns to the full-trip overview, all route lines MUST be restored.

### Key Entities

- **Trip Itinerary**: The top-level data object representing the full Europe 2026 trip, with a name, overall date range, and an ordered list of regions.
- **Region**: A named geographic section of the trip with a center coordinate (lat/lng), a list of days, and a display label. Two regions (Berlin and Hamburg) are merged into one user-facing section (Berlin/Hamburg).
- **Day Entry**: A single calendar date within a region, with an optional notes string. Days with no notes are still valid entries.
- **Region Selector**: A toggleable 2x4 grid of clickable region panels within the trip feed sidebar, opened via a dedicated control. When closed, the sidebar shows its default trip segment content.
- **Itinerary Panel**: The area within the trip feed sidebar (below the region selector) that displays the selected region's dates and notes, replacing the default trip segment list when a region is active.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can select any of the 8 regions and see the map focused on that region within 1 second of clicking.
- **SC-002**: All daily notes for a selected region are visible in the itinerary panel without any scrolling barrier for regions with 6 or fewer days; longer regions (Copenhagen Part 2 has 18 days) are scrollable within the panel.
- **SC-003**: 100% of the 9 raw JSON regions map correctly to the 8 user-facing sections, with Berlin and Hamburg correctly combined and both Copenhagen visits correctly separated.
- **SC-004**: The itinerary panel is readable on both desktop (1440px wide) and mobile (375px wide) layouts without content overflow or truncation of dates/notes. On mobile, the region grid appears as a full-screen overlay or bottom sheet rather than within the sidebar.
- **SC-005**: The region selector and itinerary panel remain functional when the itinerary JSON contains days with empty notes (no crashes, no missing dates).

## Clarifications

### Session 2026-03-06

- Q: Where should the region selector and itinerary panel live in the UI? → A: Integrate into the existing trip feed sidebar — region selector at top, itinerary notes below.
- Q: When a region is selected, should route lines also be filtered? → A: Yes — show only route lines within the selected region's date range.
- Q: What should the trip feed sidebar show by default when no region is selected? → A: The region selector is a clickable 2x4 grid of 8 region panels, shown only when the user opens the region/leg selector (not visible by default). Existing trip feed content remains the default sidebar view.
- Q: What happens in the sidebar after clicking a region panel? → A: The grid collapses, replaced by itinerary notes for the selected region + a back button to return to the grid.
- Q: How should the region grid adapt on mobile? → A: Show the grid as a full-screen overlay/bottom sheet on mobile instead of inside the sidebar.

## Assumptions

- The trip itinerary JSON (`data/itinerary.json` or equivalent) is served as a static file alongside the existing `manifest.json` and `trip_segments.json` — no backend service is needed.
- The 8 user-facing sections are fixed and defined in code; users cannot add, remove, or rename sections.
- "Baden-Württemberg/Franconia" maps to the "Heidelberg" JSON region. The UI label may say "Baden-Württemberg / Franconia" or simply "Heidelberg Region" — the exact label is a design decision.
- Map zoom levels for each region are determined by a reasonable default bounding box around the region's center coordinate; no manual zoom levels need to be specified in the JSON.
- The existing photo wall and trip feed panels continue to operate independently of this feature unless FR-009 clarification indicates filtering is required.
- The itinerary JSON provided by the user is the canonical data source and will be committed to the repository as a static data file.
