# Implementation Plan: Fix Mobile Navigation UX

**Branch**: `012-fix-mobile-nav-ux` | **Date**: 2026-03-08 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/012-fix-mobile-nav-ux/spec.md`

## Summary

Fix broken mobile navigation between the Trip Feed, Photo Wall, regions overlay, and map. The core issues are: touch events falling through panels to the map, non-functional close buttons on the Trip Feed, confusing overlap of two bottom panels, and unclear navigation between views. The approach extracts the working PanelSnap pattern from Photo Wall into a shared utility, applies it to the Trip Feed, adds a panel coordinator to enforce single-panel-at-a-time on mobile, and wires toggle buttons and region selection to coordinate panel visibility.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES5-compatible IIFEs), CSS3, HTML5
**Primary Dependencies**: Leaflet.js (vendored in `js/`), no new dependencies
**Storage**: N/A — pure UI changes, no data persistence
**Testing**: Manual + Playwright MCP screenshots at 375px and 1440px
**Target Platform**: Mobile web browsers (< 768px viewport), existing desktop layout unchanged
**Project Type**: Static web application (single `index.html` entry point)
**Performance Goals**: 60fps during panel drag; snap animations < 400ms; no jank
**Constraints**: Mobile-only changes (< 768px); no new JS libraries; no build step
**Scale/Scope**: 5 files modified, 2 new files, ~400 lines of JS + ~150 lines of CSS

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|------------|-------|
| I. Privacy by Default | PASS | No data changes, no analytics, no external services |
| II. Static & Zero-Config | PASS | All changes are static HTML/CSS/JS, no server-side processing |
| III. Approachable by Everyone | PASS | Core goal — making mobile UX intuitive for non-technical users |
| IV. Professional Visual Polish | PASS | Consistent drag handles, smooth transitions, cohesive panel design |
| V. Performant at Any Scale | PASS | 60fps drag target, CSS transitions preferred, velocity-based snapping |
| VI. Unified Media Experience | PASS | Photos and videos remain accessible through both panels |
| VII. Map-Centric Integration | PASS | Panels overlay the map, toggle buttons pinned to map, no separate pages |

**Technology Constraints**:
- Plain HTML, vanilla JS, CSS — no build step: PASS
- New files vendored into `js/` and `css/`: PASS
- Leaflet.js vendored: PASS (no changes to Leaflet)
- Graceful degradation: PASS (if panel JS fails, map still works)

## Project Structure

### Documentation (this feature)

```text
specs/012-fix-mobile-nav-ux/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
index.html                  # Trip Feed HTML structure, inline JS event handlers
css/
├── map.css                 # Trip Feed mobile styles, toggle button styles
├── photo-wall.css          # Photo Wall panel styles (minor updates)
└── panel-shared.css        # NEW: shared toggle button and drag handle styles
js/
├── panel-manager.js        # NEW: shared PanelSnap class + panel coordinator
├── photo-wall.js           # Refactored to use shared PanelSnap from panel-manager.js
├── region-nav.js           # Wire region select/deselect to panel coordinator
└── (other files unchanged)
```

**Structure Decision**: Flat structure matching existing project layout. New shared logic goes into `js/panel-manager.js` and `css/panel-shared.css`. Existing files are modified in-place.

## Implementation Strategy

### Phase A: Extract & Create Shared PanelSnap (Foundation)

**Goal**: Create `js/panel-manager.js` with the PanelSnap class extracted from photo-wall.js, plus a PanelCoordinator that enforces single-panel-at-a-time on mobile.

**Key decisions from research**:
- PanelSnap uses Pointer Events API with pointer capture (R3)
- Velocity-based snapping: ±400px/s threshold, last-6-sample rolling window (R3)
- CSS class-based state: `--collapsed`, `--half`, `--full`, `--hidden`, `--animating` (R3)
- Panel coordinator is event-driven: `panel:activate` / `panel:deactivate` (R4)

**Files**:
1. `js/panel-manager.js` — new file containing:
   - `PanelSnap` class (extracted from photo-wall.js lines 211-333)
   - `PanelCoordinator` — listens for `panel:activate`, hides the non-active panel on mobile
2. `css/panel-shared.css` — new file containing:
   - Shared toggle button styles (adapted from existing reopen button)
   - Shared drag handle styles

### Phase B: Refactor Photo Wall to Use Shared PanelSnap

**Goal**: Replace the inline PanelSnap in photo-wall.js with the shared version from panel-manager.js.

**Files**:
1. `js/photo-wall.js` — remove PanelSnap class (lines 211-333), import from panel-manager.js
2. `index.html` — add `<script src="js/panel-manager.js"></script>` before photo-wall.js
3. Verify Photo Wall behavior unchanged at both 375px and 1440px

### Phase C: Fix Trip Feed — Apply PanelSnap + Event Isolation

**Goal**: Replace the broken Trip Feed touch handlers with PanelSnap, fix the close button, and prevent touch event propagation to the map.

**Key decisions from research**:
- Replace touch event handlers (index.html lines 673-768) with PanelSnap pointer events (R1)
- Close button: use `pointerup` or ensure click fires before Leaflet's propagation stop (R2)
- Add `touch-action: none` to feed sidebar on mobile (R1)
- Add `stopPropagation()` on wheel events for the sidebar (R1)
- Remove `display: none` CSS that hides the feed on mobile (R1, FR-010)

**Files**:
1. `index.html` — remove old touch handlers (lines 673-768), wire PanelSnap to feed sidebar
2. `css/map.css` — remove `display: none` on feed sidebar/toggle for mobile; add mobile bottom-sheet styles matching Photo Wall pattern; add `touch-action: none`
3. Ensure the close button (`#feed-close`) properly calls `snapTo('hidden')` via PanelSnap

### Phase D: Panel Exclusivity + Toggle Buttons

**Goal**: On mobile, only one panel visible at a time. Toggle buttons on the map for switching.

**Key decisions from research**:
- Toggle buttons at bottom-right of map, stacked vertically (R5)
- When one panel activates, coordinator hides the other (R4)
- Photo Wall is default on load; Trip Feed starts hidden (clarification Q1)
- Each button visible when its panel is NOT active (clarification Q3)

**Files**:
1. `index.html` — add toggle button HTML elements
2. `css/panel-shared.css` — toggle button positioning and styling
3. `js/panel-manager.js` — coordinator wires toggle buttons to panel activate/deactivate
4. `js/photo-wall.js` — fire `panel:activate` on state changes (non-hidden)
5. `index.html` — Trip Feed fires `panel:activate` on state changes

### Phase E: Region Navigation Integration

**Goal**: Region selection auto-switches to Trip Feed; deselection restores Photo Wall.

**Key decisions from research**:
- `selectRegion` dispatches `panel:activate` for trip-feed instead of manual DOM manipulation (R6)
- `deselectRegion` dispatches `panel:activate` for photo-wall (R6, clarification Q5)

**Files**:
1. `js/region-nav.js` — replace `feedSidebar.classList.remove('hidden')` (line 221) with `panel:activate` event dispatch; add Photo Wall restore on deselect

### Phase F: Visual Polish + Drag Handle Affordance

**Goal**: Distinct panel headers, prominent drag handles, smooth transitions.

**Files**:
1. `css/map.css` — Trip Feed header styling distinct from Photo Wall
2. `css/panel-shared.css` — drag handle sizing (48x8px, minimum touch target 44px), contrasting color
3. `css/photo-wall.css` — minor alignment with shared styles

### Phase G: Testing & Verification

**Goal**: Verify all acceptance scenarios from spec.

**Test matrix**:
- Screenshot at 375px: panels collapsed, expanded, hidden, switching
- Screenshot at 1440px: desktop layout unchanged
- Touch scenarios: drag, scroll within panel, close, toggle, region flow
- Edge cases: orientation change, mid-drag release, tap-to-toggle handle

## Complexity Tracking

No constitution violations to justify. All changes align with existing patterns and principles.
