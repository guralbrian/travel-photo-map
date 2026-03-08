# Feature Specification: Fix Mobile Navigation UX

**Feature Branch**: `012-fix-mobile-nav-ux`
**Created**: 2026-03-08
**Status**: Draft
**Input**: User description: "The experience using and moving between the trip feed, regions page, photos wall, and map is confusing at best and broken at worst. The two bottom features when on map view (Trip Feed and Photo Wall) are hard to drag, overlap in view and apparent features (confuse users), and have broken features (Trip Feed: after expanding by dragging, touch-based drags move the map behind it; the 'x' button doesn't work on the trip feed)."

## Clarifications

### Session 2026-03-08

- Q: Which bottom panel should be visible by default on mobile page load? → A: Photo Wall shown by default (collapsed)
- Q: Are desktop layout changes in scope? → A: Mobile only (< 768px); desktop layout remains unchanged
- Q: How should users switch between Trip Feed and Photo Wall on mobile? → A: Toggle buttons on the map, one per panel, always visible when the other panel is active or both are hidden
- Q: What happens to the bottom panel when a region is selected? → A: Automatically switch to Trip Feed (collapsed) to show the selected region's itinerary
- Q: When a region is deselected, should the panel switch back to Photo Wall? → A: Yes, switch back to Photo Wall (collapsed) to restore default state

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reliable Bottom Panel Touch Interactions (Priority: P1)

A mobile user taps and drags the Photo Wall or Trip Feed handle to expand or collapse the panel. The panel responds to the drag gesture without the map underneath receiving the touch events. After the panel is expanded, scrolling within the panel content works correctly — the map does not pan or zoom in response to touches inside the panel.

**Why this priority**: Touch interactions that "fall through" to the map make both panels essentially unusable on mobile. This is the most critical broken behavior reported.

**Independent Test**: Open the app on a mobile device (or mobile emulator), drag the Photo Wall handle upward to expand it, then scroll through photos — the map must remain stationary. Repeat with Trip Feed.

**Acceptance Scenarios**:

1. **Given** the Photo Wall is in collapsed state on mobile, **When** user drags the handle upward, **Then** the panel expands smoothly and the map does not pan
2. **Given** the Trip Feed is expanded to half or full height, **When** user scrolls within the feed content, **Then** the feed scrolls and the map remains stationary
3. **Given** any bottom panel is expanded, **When** user touches inside the panel area, **Then** no touch events reach the map layer beneath

---

### User Story 2 - Working Close/Dismiss Controls (Priority: P1)

A mobile user taps the close button ('x') on the Trip Feed or Photo Wall to dismiss the panel. The panel slides away and a re-open button appears so the user can bring it back.

**Why this priority**: Non-functional close buttons trap users in a panel they can't dismiss, blocking access to the map and other features.

**Independent Test**: Open Trip Feed, tap the 'x' button — it must dismiss. Tap the re-open button — it must reappear.

**Acceptance Scenarios**:

1. **Given** the Trip Feed is visible on mobile, **When** user taps the close ('x') button, **Then** the Trip Feed slides off-screen and a re-open button appears
2. **Given** the Photo Wall is visible on mobile, **When** user taps the close ('x') button, **Then** the Photo Wall slides off-screen and a re-open button appears
3. **Given** a panel is dismissed, **When** user taps the corresponding re-open button, **Then** the panel reappears in its default collapsed state

---

### User Story 3 - Clear Distinction Between Trip Feed and Photo Wall (Priority: P2)

A user visiting the map view can clearly distinguish the Trip Feed from the Photo Wall. Each panel has a visually distinct identity, and only one bottom panel is visible at a time on mobile to avoid overlap and confusion.

**Why this priority**: Two overlapping bottom panels with similar-looking content confuse users about which panel they are interacting with and what each does.

**Independent Test**: Open the app on mobile. Only one bottom panel should be visible at a time. Each panel should have a clearly different visual header and purpose label.

**Acceptance Scenarios**:

1. **Given** the user is on mobile map view, **When** the Photo Wall is visible, **Then** the Trip Feed is not simultaneously visible as a bottom panel (and vice versa)
2. **Given** one bottom panel is open, **When** user taps the other panel's toggle button on the map, **Then** the first panel dismisses and the second panel appears in collapsed state
3. **Given** both panels are available, **When** user views either panel, **Then** each has a distinct header style, icon, and label that differentiates it from the other

---

### User Story 4 - Smooth Navigation Between Map, Regions, and Panels (Priority: P2)

A mobile user can move between the map view, regions overlay, and bottom panels without getting lost or stuck. Transitions between views are clear and reversible.

**Why this priority**: Users report confusion navigating between the different views. Clear entry/exit points and consistent back-navigation reduce disorientation.

**Independent Test**: Navigate from map -> region grid -> select a region -> view itinerary -> back to grid -> close grid -> map. At each step, the user should have a clear way to go back.

**Acceptance Scenarios**:

1. **Given** the regions grid overlay is open, **When** user taps outside the grid or taps a close control, **Then** the overlay dismisses and returns to the map
2. **Given** a region is selected with its itinerary showing, **When** user taps the back button, **Then** the view returns to the region grid
3. **Given** any overlay or panel is open, **When** user presses the device back gesture or Escape key, **Then** the topmost overlay/panel dismisses
4. **Given** the Photo Wall is active and user opens the regions overlay, **When** user selects a region, **Then** the overlay closes, the Photo Wall dismisses, and the Trip Feed appears in collapsed state showing that region's itinerary

---

### User Story 5 - Consistent Drag Handle Affordance (Priority: P3)

The drag handles on bottom panels are visually prominent and feel responsive when touched, giving users confidence that the panel can be dragged.

**Why this priority**: Users report panels are "hard to drag" — improving handle visibility and touch target size reduces frustration.

**Independent Test**: On a mobile device, the drag handle should be easy to locate and grab on first attempt. Dragging should begin immediately without noticeable delay.

**Acceptance Scenarios**:

1. **Given** a bottom panel is visible on mobile, **When** user looks at the panel, **Then** the drag handle is visually prominent (contrasting color, adequate size)
2. **Given** user touches the drag handle area, **When** they begin a vertical drag, **Then** the panel begins moving within 1 frame (no perceptible delay)
3. **Given** user drags the handle, **When** they release with velocity, **Then** the panel snaps to the nearest logical snap point with smooth animation

---

### Edge Cases

- What happens when user rotates device while a panel is expanded? Panel re-snaps to appropriate height for new orientation.
- What happens when user pinch-zooms the map while a collapsed panel is showing? Map zooms normally; panel stays in place.
- What happens when a panel is mid-drag and user lifts all fingers? Panel snaps to nearest snap point.
- What happens when user quickly taps (not drags) the handle? Panel toggles between collapsed and half-expanded states.
- What happens when the regions overlay is open and user taps a panel toggle? Overlay dismisses first, then the panel opens.
- What happens when user deselects a region while Trip Feed is expanded to full height? Panel switches to Photo Wall in collapsed (not full) state, restoring map visibility.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST prevent all touch/pointer events inside an expanded bottom panel from propagating to the map layer beneath
- **FR-002**: The Trip Feed close ('x') button MUST dismiss the Trip Feed panel when tapped
- **FR-003**: The Photo Wall close ('x') button MUST dismiss the Photo Wall panel when tapped
- **FR-004**: On mobile viewports (width < 768px), only one bottom panel (Trip Feed or Photo Wall) MUST be visible at a time
- **FR-005**: When a user opens one bottom panel while another is visible, the system MUST dismiss the currently visible panel before showing the new one
- **FR-006**: Each bottom panel MUST have a labeled toggle button pinned to the map edge, visible whenever that panel is not the active panel (i.e., when the other panel is active or both panels are hidden)
- **FR-007**: Drag handles on bottom panels MUST have a minimum touch target of 44x44 CSS pixels
- **FR-008**: Bottom panels MUST support three snap states: collapsed (showing header only), half-height (50% viewport), and full-height
- **FR-009**: Dragging a bottom panel MUST NOT cause the map to pan or zoom simultaneously
- **FR-010**: The Trip Feed MUST be re-enabled on mobile (currently hidden via CSS `display: none`)
- **FR-011**: The regions grid overlay MUST be dismissable via a close button, tap-outside, or back gesture
- **FR-012**: Panel drag gestures MUST use velocity-based snapping (fast swipe up = expand, fast swipe down = collapse/dismiss)
- **FR-013**: The Trip Feed and Photo Wall MUST have visually distinct headers (different label text and/or icon) so users can tell them apart
- **FR-014**: The Escape key (desktop) and back gesture (mobile) MUST dismiss the topmost open overlay or panel
- **FR-015**: On mobile page load, the Photo Wall MUST be shown in collapsed state by default; the Trip Feed MUST start hidden with its toggle button visible
- **FR-016**: When a user selects a region from the regions overlay on mobile, the system MUST automatically switch to the Trip Feed in collapsed state (dismissing the Photo Wall if active) to display the selected region's itinerary
- **FR-017**: When a user deselects a region (returns to all-regions view) on mobile, the system MUST switch back to the Photo Wall in collapsed state

### Key Entities

- **Bottom Panel**: A sliding sheet anchored to the bottom of the viewport. Has states: hidden, collapsed, half, full. Contains a drag handle, header with title and close button, and scrollable content area.
- **Panel Toggle Button**: A labeled button pinned to the map edge, visible whenever its corresponding panel is not the active panel. Tapping it opens that panel in collapsed state (dismissing the other panel if active). Two toggle buttons exist: one for Trip Feed, one for Photo Wall.
- **Drag Handle**: A visual affordance at the top of a bottom panel indicating it can be dragged vertically.
- **Regions Overlay**: A full-screen grid overlay showing trip regions. Dismissable via close button or backdrop tap.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can expand, scroll within, and collapse any bottom panel on mobile without the map moving — 100% of touch events inside the panel stay within the panel
- **SC-002**: The close button on every panel dismisses it on first tap, with zero non-responsive taps
- **SC-003**: Users can distinguish between Trip Feed and Photo Wall within 2 seconds of viewing either panel
- **SC-004**: Users can navigate from map to regions to itinerary and back to map in under 10 seconds with no dead ends
- **SC-005**: Drag handles are successfully grabbed on first attempt by users (touch target meets 44px minimum)
- **SC-006**: Panel snap animations complete in under 400ms with no visible jank (smooth transitions)

## Out of Scope

- Desktop layout changes (viewports >= 768px) — desktop side-drawer positioning and behavior remain unchanged
- New features or content changes within Trip Feed or Photo Wall panels
- Changes to the Photo Viewer modal or its gesture handling

## Assumptions

- The Trip Feed will be un-hidden and restored as a functional component (reversing the `display: none` from spec 009)
- Mobile breakpoint remains at 768px width
- The existing Photo Wall PanelSnap class and Pointer Events API approach is the correct pattern; Trip Feed should adopt a similar mechanism
- Both panels will share a consistent visual language (same drag handle style, same snap behavior) while differing in content and header identity
- The regions overlay will continue to use the existing full-screen backdrop approach
- No new JavaScript libraries will be introduced; fixes use vanilla JS and existing Leaflet utilities
