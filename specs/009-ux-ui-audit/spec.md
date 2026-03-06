# Feature Specification: UX/UI Audit Remediation

**Feature Branch**: `009-ux-ui-audit`
**Created**: 2026-03-03
**Status**: Draft
**Input**: User description: "Thorough audit of the current UX and UI for style, cohesiveness, usability, simplicity"

## Clarifications

### Session 2026-03-03

- Q: Should Trip Feed be hidden with CSS or have its code removed entirely? → A: CSS hide only (`display:none` on feed sidebar + toggle button) — code stays intact for potential future re-enablement.
- Q: Settings button mobile position — which corner at top of screen? → A: Top-left corner, consistent with desktop position and spatially near the control panel it opens.
- Q: Photo Wall reopen mechanism after X or drag-to-close? → A: Fix the existing gold reopen button so it reliably appears and is tappable after any close action (X click or drag-to-close).
- Q: Drag-to-close threshold for Photo Wall? → A: Velocity-based — a fast downward flick (>400px/s) past the collapsed state snaps to hidden; a slow drag snaps back to collapsed.
- (Directive) Playwright testing: Use two local servers (localhost:8000 and localhost:8001) in parallel — one for desktop viewport testing, one for mobile viewport testing.
- Q: Legacy straight-line route code (index.html:924-968) duplicates route rendering on top of smart routes (route-builder.js). How to resolve? → A: Remove legacy route code entirely; smart routes are the sole route renderer.
- Q: Should route segment colors from trip_segments.json be pulled into the design token system? → A: No — route colors are data-driven values from trip data. Design tokens cover UI chrome only (backgrounds, text, accents, borders), not data-driven visual encodings.

## Audit Summary

A comprehensive visual and code-level audit was conducted across desktop (1440x900) and mobile (375x812) viewports using Playwright screenshots and CSS source analysis. The app has a strong dark-glass aesthetic with gold accents, but the audit revealed **1 functional bug**, **8 high-priority issues**, **11 medium-priority issues**, and **6 low-priority issues** across typography, touch targets, z-index layering, design token consistency, and mobile usability.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Visual Language Across All Panels (Priority: P1)

A visitor browsing the map sees panels (Controls, Trip Feed, Photo Wall) that all share the same fonts, colors, spacing, and interaction patterns. The interface feels like one cohesive product, not a patchwork of independently built components.

**Why this priority**: Typography and color inconsistencies are the most visible issues and undermine trust in the product. The Photo Wall currently renders in Times New Roman (browser default) while all other panels use the system font stack. Legacy colors (#666, #333) appear in popups that clash with the dark theme. These are the cheapest fixes with the highest visual impact.

**Independent Test**: Open the app, visually confirm that all panels use the same font family, that accent colors match, and that no light-theme remnants appear.

**Acceptance Scenarios**:

1. **Given** the app is loaded at any viewport width, **When** a user opens each panel (Controls, Trip Feed, Photo Wall, Photo Viewer), **Then** all text renders in the same system font stack.
2. **Given** any interactive element with a gold hover state, **When** the user hovers, **Then** all elements use the same hover shade consistently.
3. **Given** popup text or annotation labels, **When** displayed, **Then** they use the defined dark-theme color palette, not legacy light-theme colors.

---

### User Story 2 - Mobile Touch Targets Meet Accessibility Standards (Priority: P1)

A user on a mobile phone can reliably tap every interactive element without frustration. Close buttons, accordion headers, radio buttons, and navigation controls all meet the 44px minimum touch target guideline.

**Why this priority**: Multiple critical controls (panel close buttons at 19.7x20px, accordion headers at 34px, radio labels at 24px) are well below the 44px minimum. This makes the app borderline unusable on mobile for some interactions.

**Independent Test**: On a 375px-wide viewport, measure all interactive elements and confirm each has at least a 44x44px tap area.

**Acceptance Scenarios**:

1. **Given** a mobile viewport, **When** a user taps the close button on any panel (Controls, Trip Feed, Photo Wall), **Then** the tap target is at least 44x44px and the panel closes.
2. **Given** the Controls panel with accordion sections, **When** a user taps a section header (Timeline, Map Layers, Settings), **Then** the tap target height is at least 44px.
3. **Given** the Map Layers section, **When** a user taps a radio button or checkbox, **Then** the tap target row height is at least 44px.

---

### User Story 3 - Fix Photo Wall Close Button Bug (Priority: P1)

A user can close the Photo Wall by tapping the X (close) button. Currently this button has no event listener and does nothing when clicked.

**Why this priority**: This is a functional bug. The close button is rendered but non-functional, which breaks user expectations and leaves users unable to fully dismiss the Photo Wall.

**Independent Test**: Click the Photo Wall close button (X) and confirm the panel fully dismisses, revealing the gold reopen button.

**Acceptance Scenarios**:

1. **Given** the Photo Wall is visible in any state (collapsed, half, or expanded), **When** the user clicks the close (X) button, **Then** the Photo Wall fully dismisses and the reopen button appears.

---

### User Story 4 - Establish Design Token System (Priority: P2)

All visual properties (colors, font sizes, spacing, transitions, z-indices) are defined as shared tokens, so that changes propagate consistently and future development stays cohesive.

**Why this priority**: The audit found 12 different font sizes, 6+ easing functions, inconsistent transition durations (250ms/400ms/600ms), ad-hoc padding values, and a fragile z-index hierarchy. Tokenizing these prevents drift and makes future changes safe and predictable.

**Independent Test**: Verify that design tokens are defined centrally and consumed throughout all style files, with no hardcoded duplicates.

**Acceptance Scenarios**:

1. **Given** the style source files, **When** inspected, **Then** colors, font sizes, transition durations, easing functions, and z-index layers are defined as shared tokens.
2. **Given** any panel or component, **When** a token value changes centrally, **Then** the change propagates to all components that use that token.
3. **Given** the font size scale, **When** reviewed, **Then** it follows a rationalized scale of no more than 6 standard sizes.

---

### User Story 5 - Resolve Z-Index and Layering Conflicts (Priority: P2)

Panels, toggle buttons, and overlays stack predictably at every viewport size. No interactive element is blocked by another panel's pointer events.

**Why this priority**: The Trip Feed panel (z:1001) blocks the Photo Wall (z:1000) collapse/close buttons on desktop. On mobile, reopen buttons overlap by 4px, and the Feed close button is unreachable behind the Controls toggle. The Photo Viewer close button is intercepted by the media div.

**Independent Test**: At both desktop and mobile widths, verify that every button/control can be clicked without being blocked by another element.

**Acceptance Scenarios**:

1. **Given** the Trip Feed and Photo Wall are both open on desktop, **When** the user clicks the Photo Wall collapse or close button, **Then** the click reaches the button and is not intercepted by the Trip Feed.
2. **Given** all panels are closed on mobile, **When** the reopen buttons are visible, **Then** they do not overlap and each can be independently tapped.
3. **Given** the Photo Viewer is open, **When** the user clicks the close (X) button, **Then** the click reaches the button and is not intercepted by the media container.

---

### User Story 6 - Improve Mobile Photo Wall Usability (Priority: P3)

The Photo Wall is usable and comfortable on small screens. The collapsed state shows enough content to be useful, the drag handle is visible, and the panel adapts well to the limited viewport.

**Why this priority**: In collapsed state on mobile, only ~126px of photo content is visible (barely one row). The drag handle is only 4px tall and nearly invisible. These aren't broken, but they significantly degrade the mobile experience.

**Independent Test**: On a 375px viewport, confirm the collapsed Photo Wall shows at least two rows of thumbnails, and the drag handle has adequate visual presence.

**Acceptance Scenarios**:

1. **Given** a mobile viewport with the Photo Wall collapsed, **When** the user views it, **Then** at least two rows of photo thumbnails are visible.
2. **Given** the Photo Wall drag handle, **When** viewed on mobile, **Then** it has sufficient visual presence to be discoverable.

---

### Edge Cases

- What happens when both remaining panels (Controls, Photo Wall) are open simultaneously on mobile? Panels must not fully obscure the map. (Trip Feed is hidden via CSS.)
- What happens when the Photo Viewer is opened while all panels are visible? The viewer overlay must appear above everything.
- What happens when the browser window is resized from desktop to mobile width? Panel layouts and z-index behavior must remain correct.
- What happens with the "View on Google Photos" link on mobile? The tap target should be large enough to reliably hit.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST declare a global font-family on the body element using the system font stack, eliminating browser-default font inheritance in all panels (especially Photo Wall).
- **FR-002**: System MUST ensure the Photo Wall close button (X) fully dismisses the panel and the gold reopen button reliably appears and is tappable afterward on both viewports.
- **FR-003**: All panel close buttons MUST have a minimum tap target of 44x44px on mobile viewports.
- **FR-004**: All accordion section headers in the Controls panel MUST have a minimum tap target height of 44px.
- **FR-005**: All radio button and checkbox rows in Map Layers MUST have a minimum tap target height of 44px.
- **FR-006**: System MUST define shared design tokens for: UI chrome colors (accent, text, backgrounds, borders), font size scale, transition durations, easing functions, and z-index layers. Data-driven colors (e.g., route segment colors from trip_segments.json) are excluded from the token system.
- **FR-007**: System MUST replace legacy light-theme colors (#666, #333) in popup and annotation styles with dark-theme palette values.
- **FR-008**: System MUST resolve z-index conflicts so that no interactive element is blocked by another panel's pointer events at any viewport width.
- **FR-009**: The Photo Viewer close button MUST be clickable without being intercepted by the media container.
- **FR-010**: Mobile reopen buttons (Controls toggle, Photo Wall reopen) MUST NOT overlap each other.
- **FR-017**: Trip Feed sidebar and its toggle button MUST be hidden via CSS (`display:none`) on both mobile and desktop viewports. Code remains intact for future re-enablement.
- **FR-018**: The Controls panel toggle button MUST be positioned at the top-left of the screen on both desktop and mobile viewports, and MUST NOT overlap with the Photo Wall or other UI elements.
- **FR-019**: The Controls panel MUST NOT be automatically open on initial load on either desktop or mobile. The user must explicitly tap the toggle button to open it.
- **FR-020**: Dragging the Photo Wall downward past the collapsed state with velocity >400px/s MUST snap to `hidden` (fully closed) and show the gold reopen button. A slow drag below collapsed MUST snap back to collapsed.
- **FR-021**: The gold reopen button MUST appear after any close action (X button click, drag-to-close) and MUST NOT be obscured by other UI elements at any viewport width.
- **FR-022**: Playwright visual testing MUST use two parallel local server instances (localhost:8000 for desktop at 1440px, localhost:8001 for mobile at 375px) to verify UI changes across both viewports simultaneously.
- **FR-011**: The gold hover state for accent-colored buttons MUST use a single consistent color value.
- **FR-012**: Photo Wall header left padding MUST match side panel header padding for visual consistency.
- **FR-013**: Panel transition durations and easing functions SHOULD be consistent across similar panel types.
- **FR-014**: The font size scale SHOULD be rationalized to no more than 6 standard sizes defined as tokens.
- **FR-015**: The Photo Wall collapsed state on mobile SHOULD show enough content for at least two rows of thumbnails.
- **FR-016**: The Photo Wall drag handle SHOULD be visually prominent enough to be discoverable.
- **FR-023**: The legacy straight-line route rendering code (`index.html:924-968`) MUST be removed. The smart route builder (`route-builder.js`) is the sole route renderer. The route toggle in Map Layers MUST control the smart routes layer.

### Assumptions

- The system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`) is the intended font for all UI text. This was confirmed by its use in the Controls and Trip Feed panels.
- The gold accent color `#d4a853` is the canonical brand color. The slight variations in hover states (`#e0b86a` vs `#e0b862`) are unintentional drift.
- The 44px minimum touch target follows Apple and Google mobile accessibility guidelines and is appropriate for this audience.
- The legacy `#666` and `#333` colors in popups are remnants from an earlier light-theme design and should be replaced, not preserved.
- The Photo Wall close button's missing event handler is a bug, not an intentional design decision.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All text across every panel renders in the same font family -- zero instances of browser-default font inheritance.
- **SC-002**: 100% of interactive elements on mobile (375px) have tap targets of at least 44x44px.
- **SC-003**: The Photo Wall close button successfully dismisses the panel on first click in both desktop and mobile viewports.
- **SC-004**: Zero z-index/pointer-event conflicts -- every visible button can be clicked at both desktop (1440px) and mobile (375px) widths.
- **SC-005**: Design tokens are defined centrally for all colors, font sizes, transitions, and z-indices, with zero hardcoded duplicates of tokenized values.
- **SC-006**: The rationalized font size scale uses 6 or fewer standard sizes.
- **SC-007**: No legacy light-theme color values (#666, #333) remain in the dark-theme UI.
- **SC-008**: Mobile reopen buttons have zero pixels of overlap between their bounding boxes.
- **SC-009**: Users can complete the full panel open/close/reopen cycle for Controls and Photo Wall without any interaction failure on mobile.
- **SC-010**: Trip Feed sidebar and toggle button are not visible on either desktop or mobile viewports.
- **SC-011**: Controls panel is closed on initial page load on both desktop and mobile.
- **SC-012**: Controls toggle button is positioned at top-left on both desktop and mobile, with no overlap against Photo Wall or other UI elements.
- **SC-013**: A fast downward flick (>400px/s) on the Photo Wall from collapsed state snaps to fully hidden and shows the gold reopen button.
- **SC-014**: The gold reopen button is visible and tappable after every Photo Wall close action (X, drag-to-close) on both viewports.
- **SC-015**: Only one set of route polylines is rendered on the map (no duplicate legacy lines). The route toggle in Map Layers controls visibility of the smart routes.
