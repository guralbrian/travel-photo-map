# Feature Specification: Trip Feed / Timeline Sidebar

**Feature Branch**: `004-trip-feed`
**Created**: 2026-02-20
**Status**: Draft
**Input**: User description: "Add a feed/timeline section inspired by mattis.travelmap.net — chronological entries of text and photos, sidebar positioning on desktop, smooth panning and zoom for daily entries, color theming for the timeline section."

## Context

The travel photo map currently organizes ~570 photos across 8 city segments (London, Copenhagen, Heidelberg, Munich, Prague, Dresden, Meissen, Berlin) over a 24-day trip. The existing control panel is a 300px left sidebar with timeline sliders, map layers, and settings. While the timeline slider filters photos by date range, there is no narrative view — no way to browse the trip as a story with daily entries, descriptive text, and photo highlights.

This feature adds a chronological trip feed that presents the journey as a scrollable sequence of daily entries, each showing that day's city, narrative text, and photo thumbnails. Clicking an entry smoothly pans and zooms the map to that day's photos. The feed uses the existing trip segment color theming (each city has a distinct color) to create a visually cohesive timeline experience. On desktop, the feed replaces or sits alongside the existing control panel as a right sidebar; on mobile, it becomes a swipeable bottom sheet.

## User Scenarios & Testing

### User Story 1 - Browse Trip as Chronological Feed (Priority: P1)

A visitor opens the map and sees a scrollable feed sidebar showing the trip day-by-day. Each entry displays the date, city name (color-coded), and a row of photo thumbnails from that day. The feed gives visitors a narrative overview of the entire journey they can scroll through at their own pace.

**Why this priority**: This is the core feature — transforming raw photo data into a browsable trip narrative. It provides immediate value even without text entries or map interaction.

**Independent Test**: Load the map. The feed sidebar appears on the right side (desktop) showing entries for all 22 days with photos. Each entry shows the correct date, city name with segment color, and thumbnail photos from that day. Scrolling through the feed covers the entire trip chronologically.

**Acceptance Scenarios**:

1. **Given** the map loads with photo data, **When** a visitor views the page on desktop, **Then** a feed sidebar appears on the right side with chronological daily entries
2. **Given** photos exist for a date, **When** that date's entry renders in the feed, **Then** it shows the date, the city name color-coded to its trip segment, and thumbnail images from that day
3. **Given** a day has more than 6 photos, **When** the entry renders, **Then** it shows 6 thumbnails with a "+N more" indicator for the remainder
4. **Given** no photos exist for a day within the trip range, **When** the feed renders, **Then** that day is omitted from the feed (no empty entries)

---

### User Story 2 - Click Entry to Pan Map (Priority: P1)

A visitor clicks on a daily entry in the feed, and the map smoothly pans and zooms to show that day's photos. The clicked entry is visually highlighted as the active day. This creates a guided tour experience where the feed drives map navigation.

**Why this priority**: The feed-to-map interaction is what transforms a static photo list into an interactive travel story. Without it, the feed is just a thumbnail gallery.

**Independent Test**: Click on a feed entry for "Copenhagen, Feb 1". The map smoothly animates to show Copenhagen's photos. The entry highlights as active. Click "Munich, Feb 5" — the map flies to Munich. The previous entry de-highlights.

**Acceptance Scenarios**:

1. **Given** a visitor clicks a daily entry in the feed, **When** the click is registered, **Then** the map smoothly pans and zooms to fit all photos from that day within the viewport
2. **Given** the map is animating to a new location, **When** the animation completes, **Then** the clicked entry is visually highlighted as the active entry (distinct background or border)
3. **Given** an entry is active, **When** the visitor clicks a different entry, **Then** the previous entry de-highlights and the new one highlights
4. **Given** a visitor scrolls the map manually (not via feed), **When** the map view changes, **Then** no feed entry is force-highlighted (manual exploration is not constrained)

---

### User Story 3 - Trip Narrative Text (Priority: P2)

Editors can add descriptive text to daily entries that all visitors see. Each day's entry can optionally include a short narrative (e.g., "Explored the Old Town, tried amazing street food at the Christmas market"). Text is stored in the cloud and displayed above or below the photo thumbnails.

**Why this priority**: Text turns the feed from a photo timeline into a trip journal. Depends on the feed structure (US1) being in place.

**Independent Test**: Sign in as an editor, click the text area on a daily entry, type a narrative, save. The text appears in the entry for all visitors. Refresh — the text persists. Open on another device — the text is there.

**Acceptance Scenarios**:

1. **Given** an editor is signed in, **When** they view a daily entry in the feed, **Then** an editable text area or "Add note" prompt is visible
2. **Given** an editor types a narrative and saves, **When** the entry re-renders, **Then** the text is displayed in the entry for all visitors
3. **Given** narrative text exists for a day, **When** any visitor views the feed, **Then** the text appears in that day's entry
4. **Given** a visitor (non-editor) views the feed, **When** they see entries with text, **Then** no edit controls are visible

---

### User Story 4 - Mobile-Friendly Feed (Priority: P2)

On mobile devices, the feed adapts from a right sidebar to a collapsible bottom sheet that can be swiped up to browse and tapped down to return to the full map view. The feed entries remain scrollable and tappable.

**Why this priority**: Mobile is a common use case for sharing travel maps. Without mobile adaptation, the feed would overlap or hide the map on small screens.

**Independent Test**: Open the map on a mobile device (or narrow browser window). The feed appears as a bottom sheet (not a sidebar). Swipe up to expand, scroll through entries, tap an entry to pan the map, swipe down to minimize.

**Acceptance Scenarios**:

1. **Given** the viewport is narrow (mobile), **When** the page loads, **Then** the feed appears as a collapsed bottom sheet with a drag handle, not a right sidebar
2. **Given** the bottom sheet is collapsed, **When** the visitor swipes up or taps the handle, **Then** the sheet expands to show scrollable feed entries
3. **Given** the bottom sheet is expanded, **When** the visitor taps a daily entry, **Then** the map pans to that day's photos and the sheet partially collapses to reveal the map
4. **Given** the visitor swipes down on the expanded sheet, **When** the gesture completes, **Then** the sheet collapses back to its minimized state

---

### Edge Cases

- What happens when a trip segment spans multiple days with no photos on some days? Days without photos are omitted from the feed — only days with at least one photo appear as entries
- What happens when the feed is open and the existing timeline slider filters photos? The feed updates to show only entries within the selected date range, hiding entries outside the filter
- What happens when an editor saves narrative text while offline? The text is saved optimistically in the UI and queued for sync using the existing offline write queue
- What happens when photos load slowly on a poor connection? Thumbnail placeholders (matching the dark glass theme) display while images load, then fade in
- What happens when the existing left control panel and the new right feed sidebar are both open on a narrow desktop? The feed sidebar takes priority; the control panel can be collapsed via its toggle button to make room

## Requirements

### Functional Requirements

- **FR-001**: System MUST display a chronological feed of daily trip entries, ordered from earliest to latest date
- **FR-002**: Each feed entry MUST show the date, city name, city color accent (matching the trip segment color), and photo thumbnails for that day
- **FR-003**: Each feed entry MUST display a maximum of 6 photo thumbnails, with a "+N more" indicator when additional photos exist for that day
- **FR-004**: Clicking a feed entry MUST smoothly pan and zoom the map to show all photos from that day (animated transition, consistent with existing map animation patterns)
- **FR-005**: The currently active (clicked) feed entry MUST be visually highlighted; clicking a different entry MUST de-highlight the previous one
- **FR-006**: The feed MUST appear as a right sidebar on desktop viewports (width at or above the existing breakpoint) and as a collapsible bottom sheet on mobile viewports
- **FR-007**: The feed MUST use the trip segment color scheme (each city's color from the trip data) for visual theming of entry headers and accents
- **FR-008**: The feed MUST respect the existing timeline slider filter — when the date range is narrowed, feed entries outside the range are hidden
- **FR-009**: Signed-in editors MUST be able to add and edit narrative text for each daily entry, persisted to the cloud
- **FR-010**: Narrative text MUST be visible to all visitors (read-only for non-editors)
- **FR-011**: Clicking a photo thumbnail in a feed entry MUST open the existing lightbox for that photo
- **FR-012**: The feed MUST be toggleable (show/hide) via a button, so visitors can dismiss it for a full-map experience
- **FR-013**: The feed MUST coexist with the existing left control panel without overlap on desktop

### Key Entities

- **Feed Entry**: A daily grouping of trip content. Attributes: date, city name, city color, photos for that day, optional narrative text
- **Daily Narrative**: Optional editor-written text for a specific trip date. Attributes: date (unique key), text content, author, last-updated timestamp

## Success Criteria

### Measurable Outcomes

- **SC-001**: Feed loads and displays all daily entries within 2 seconds of page load
- **SC-002**: Map pan/zoom animation to a clicked entry completes within 1 second
- **SC-003**: Feed correctly groups photos by date for all 22 days of the trip with zero misattributed photos
- **SC-004**: Feed adapts between sidebar and bottom sheet layout at the existing mobile breakpoint without visual glitches
- **SC-005**: Editors can add narrative text to a daily entry in under 15 seconds (click, type, save)
- **SC-006**: The feed is dismissible — visitors can hide it and use the map without any feed UI visible

## Assumptions

- The existing trip segment data (`trip_segments.json`) provides city names and colors for feed entry theming
- The existing photo manifest (`manifest.json`) provides dates and thumbnails for grouping photos into daily entries
- The existing lightbox and photo click behavior is reused when clicking thumbnails in the feed
- The existing `map.flyToBounds()` pattern (0.8s duration, padding) is reused for feed-to-map navigation
- Daily narrative text is stored in the cloud (consistent with the existing Firestore architecture)
- The existing mobile breakpoint (768px) determines sidebar vs bottom sheet layout
- The feed does not replace the existing control panel — both coexist, with the feed on the right and controls on the left
