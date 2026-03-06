# Feature Specification: UI and UX Polish

**Feature Branch**: `008-ui-ux-polish`  
**Created**: 2026-03-03  
**Status**: Draft  
**Input**: User description: "UI and UX polish: Implement glassmorphism across all panels, enhance photo wall header typography, add interactive hover states for grid items, and refine the reopen button aesthetics."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Glassmorphism & Visual Depth (Priority: P1)

As a user, when I open any panel (Controls, Trip Feed, Photo Wall), I want the background to be translucent and blurred so that the map content behind it provides a sense of depth and context without being distracting.

**Why this priority**: Core visual identity. It elevates the app from a basic map to a premium, modern experience.

**Independent Test**: Can be tested by opening any panel and verifying that the map colors/shapes are visible but softly blurred through the panel background.

**Acceptance Scenarios**:

1. **Given** the app is loaded, **When** I open the Control Panel, **Then** I should see the map blurred through the panel's dark semi-transparent background.
2. **Given** the photo wall is expanded, **When** I scroll the map behind it (on desktop), **Then** I should see the movement of colors through the header and panel body.

---

### User Story 2 - Enhanced Photo Wall Header (Priority: P1)

As a user, when I expand the photo wall, I want to see a header that feels designed rather than just functional, with clear titles and a legible date/location indicator.

**Why this priority**: The photo wall is the primary "album" view. Its header sets the tone for the entire browsing experience.

**Independent Test**: Can be tested by expanding the photo wall to half or full screen and observing the "PHOTOS" title and current date label.

**Acceptance Scenarios**:

1. **Given** the photo wall is half-expanded, **When** I look at the header, **Then** I should see a stylized "PHOTOS" title and a distinct, legible date/location label.

---

### User Story 3 - Interactive Grid Hover (Priority: P2)

As a desktop user, when I move my mouse over photos in the wall, I want to see a subtle visual response so that I know which item I am about to select.

**Why this priority**: Improves perceived performance and interactivity on desktop.

**Independent Test**: Can be tested on desktop by hovering over any photo in the justified grid and seeing a scale/glow effect.

**Acceptance Scenarios**:

1. **Given** the photo wall is open on desktop, **When** I hover over a photo, **Then** it should scale up slightly (e.g., 1.02x) and possibly show a subtle outer glow or shadow.

---

### User Story 4 - Refined Reopen Button (Priority: P2)

As a user, if I dismiss the photo wall, I want the "▲ Photos" button to look like a high-quality part of the map's control set rather than a temporary fix.

**Why this priority**: Consistency. The app has several toggles (Controls, Feed); the Photos toggle should match them.

**Independent Test**: Can be tested by hiding the photo wall and observing the "Photos" reopen button.

**Acceptance Scenarios**:

1. **Given** the photo wall is hidden, **When** I look at the map controls, **Then** the "Photos" toggle should match the visual style (color, radius, shadow) of the Feed toggle.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Panels (Control Panel, Trip Feed, Photo Wall) MUST use semi-transparent backgrounds with a `backdrop-filter: blur(16px)` or higher.
- **FR-002**: Photo wall header MUST display "PHOTOS" in a stylized font (e.g., uppercase, increased letter-spacing) and the current section's date/location in a secondary, muted style.
- **FR-003**: Grid items MUST implement a `:hover` state on desktop view that includes a `transform: scale()` transition.
- **FR-004**: The reopen button MUST be styled as a pill or FAB matching the `#d4a853` (gold) and dark theme of the app.
- **FR-005**: All transition durations for UI state changes MUST be consistent (e.g., 200-300ms) to ensure a smooth "agentic" feel.

### Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Panel backgrounds have an opacity between 0.7 and 0.85, allowing underlying map content to be perceptible.
- **SC-002**: Photo wall header typography uses CSS properties like `letter-spacing` and `text-transform` to achieve a professional look as shown in modern photo apps.
- **SC-003**: Hover transitions on grid items complete in under 150ms for high responsiveness.
- **SC-004**: The "Photos" toggle button is visually indistinguishable in style from the existing sidebar toggle buttons.
