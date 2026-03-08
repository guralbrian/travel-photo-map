# Research: Fix Mobile Navigation UX

**Feature**: 012-fix-mobile-nav-ux | **Date**: 2026-03-08

## R1: Root Cause — Touch Events Fall Through to Map

**Decision**: Trip Feed touch handlers must call `stopPropagation()` and the entire feed sidebar panel needs touch-action containment on mobile.

**Rationale**: The current Trip Feed uses `L.DomEvent.disableClickPropagation()` which only prevents click events from reaching the map. Touch events (`touchstart`, `touchmove`, `touchend`) are NOT suppressed — `onTouchMove` only calls `preventDefault()` (line 724 of index.html), which prevents default scroll behavior but does not stop bubbling to Leaflet. Additionally, the `.feed-entries` container has `pointer-events: none` (CSS), meaning touches on empty areas pass straight through to the map.

**Alternatives considered**:
- Adding `touch-action: none` CSS to the sidebar — partially works but doesn't stop Leaflet's own touch handlers
- Wrapping the entire sidebar in an overlay div — too invasive, breaks existing layout

## R2: Root Cause — Trip Feed Close Button Non-Functional

**Decision**: The close button event listener binding at line 517 of index.html (`feedClose.addEventListener('click', toggleFeedSidebar)`) is correct, but the button may be unreachable on mobile because `L.DomEvent.disableClickPropagation(feedSidebar)` at line 520 suppresses click events on all children of the sidebar, including the close button.

**Rationale**: `L.DomEvent.disableClickPropagation` stops mousedown/click from bubbling. On mobile, the touch-to-click synthesis may be affected. The close button needs its own `stopPropagation` before the Leaflet handler intercepts, or the event listener should use pointer events instead of click.

**Alternatives considered**:
- Moving the close button outside the sidebar element — breaks layout semantics
- Using `pointerup` instead of `click` — better compatibility with touch devices

## R3: Pattern — Photo Wall PanelSnap as Reference Implementation

**Decision**: Adopt the Photo Wall `PanelSnap` class pattern for the Trip Feed, refactored into a shared utility.

**Rationale**: The Photo Wall's PanelSnap (lines 211-333 of photo-wall.js) is a working, well-structured solution that:
- Uses Pointer Events API (unified touch/mouse handling)
- Implements pointer capture for reliable drag tracking
- Has velocity-based snapping with 400px/s threshold
- Uses CSS classes for state management (`--collapsed`, `--half`, `--full`, `--hidden`, `--animating`)
- Fires custom events for state communication
- Properly prevents map interaction via `stopPropagation` on wheel events and `touch-action: none` CSS

**Alternatives considered**:
- Fixing the existing Trip Feed touch handlers in-place — would produce duplicate logic with different event APIs (touch vs pointer), harder to maintain
- Using a third-party bottom sheet library — violates constitution (no new dependencies)

## R4: Panel Exclusivity on Mobile

**Decision**: Implement a lightweight panel coordinator that ensures only one bottom panel is visible on mobile at any time.

**Rationale**: Both panels currently operate independently. A coordinator pattern (event-driven) is simplest: when one panel transitions to a visible state, it dispatches an event; the other panel listens and hides itself. This avoids tight coupling between the two modules.

**Alternatives considered**:
- Central state manager — over-engineering for two panels
- CSS-only solution (`:has()` selector) — browser support concerns and can't coordinate JS state

## R5: Toggle Button Placement

**Decision**: Two toggle buttons pinned to the bottom-right of the map, stacked vertically. Each button is labeled with an icon and short text ("Feed" / "Photos").

**Rationale**: The Photo Wall already has a reopen button at `bottom: 12px; right: 60px` (photo-wall.css line 456). The Trip Feed toggle exists at `bottom: 12px; right: 12px` (map.css line 877). These positions need to be unified into a consistent button group that adapts based on which panel is active.

**Alternatives considered**:
- Single toggle that cycles between panels — less discoverable, no way to dismiss both
- Floating action button with sub-menu — over-complicated for two options

## R6: Region Selection Integration

**Decision**: Wire region-nav's `selectRegion` and `deselectRegion` to dispatch panel-switch events.

**Rationale**: Currently `selectRegion` (region-nav.js line 219-222) manually shows the feed sidebar with `feedSidebar.classList.remove('hidden')`. This needs to use the new panel coordinator to properly dismiss the Photo Wall and show the Trip Feed. Similarly, `deselectRegion` needs to switch back to Photo Wall.

**Alternatives considered**:
- Having region-nav directly manipulate both panels — tight coupling
- Making region-nav unaware of panels entirely — loses the contextual UX of showing the itinerary
