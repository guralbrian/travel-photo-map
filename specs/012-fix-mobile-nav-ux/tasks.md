# Tasks: Fix Mobile Navigation UX

**Input**: Design documents from `/specs/012-fix-mobile-nav-ux/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested — no test tasks generated. Visual verification via Playwright screenshots in final phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create new files and add script references needed by all subsequent phases.

- [x] T001 Create `js/panel-manager.js` with module IIFE skeleton exposing `window.PanelSnap` and `window.PanelCoordinator` — include empty constructor stubs only
- [x] T002 [P] Create `css/panel-shared.css` with CSS custom properties for shared panel tokens (drag handle dimensions, toggle button sizing, animation timing) — no rules yet, just variables
- [x] T003 Add `<link>` for `css/panel-shared.css` and `<script>` for `js/panel-manager.js` in `index.html`, placed before `photo-wall.js` and other panel scripts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extract PanelSnap into the shared module and build the PanelCoordinator. MUST be complete before any user story work.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T004 Extract the `PanelSnap` class from `js/photo-wall.js` (lines 211-333) into `js/panel-manager.js`. The shared PanelSnap must accept a config object `{ panelEl, handleEl, collapseBtn, statePrefix, onStateChange }` where `statePrefix` is the CSS class prefix (e.g., `'photo-wall-panel'` or `'feed-sidebar'`). Preserve all existing behavior: pointer capture, velocity sampling (last 6 samples, ±400px/s threshold), CSS class-based state (`--collapsed`, `--half`, `--full`, `--hidden`, `--animating`), and z-index elevation in full state.
- [x] T005 Implement `PanelCoordinator` in `js/panel-manager.js`. It must: (1) maintain a registry of panel IDs to their PanelSnap instances, (2) listen for `panel:activate` custom events on `document`, (3) on mobile (< 768px), hide all other registered panels by calling `snapTo('hidden')` when one activates, (4) manage toggle button visibility — show a panel's toggle button when that panel is NOT the active panel, (5) dispatch `panel:deactivate` events when a panel is hidden by the coordinator.
- [x] T006 Refactor `js/photo-wall.js` to remove the inline `PanelSnap` class (lines 211-333) and use `window.PanelSnap` from `panel-manager.js`. Update the constructor call at line ~442 to pass `statePrefix: 'photo-wall-panel'`. Wire `onStateChange` to dispatch both `photo-wall:state-changed` (existing) and `panel:activate` (new, when state !== 'hidden') events. Register the Photo Wall's PanelSnap instance with `PanelCoordinator`.
- [x] T007 Verify Photo Wall behavior is unchanged after refactor — test at 375px mobile and 1440px desktop by running the local server and visually confirming drag, snap, close, and reopen all work identically.

**Checkpoint**: PanelSnap is shared, PanelCoordinator exists, Photo Wall uses them. Foundation ready.

---

## Phase 3: User Story 1 — Reliable Bottom Panel Touch Interactions (Priority: P1) MVP

**Goal**: Touch events inside expanded bottom panels do NOT propagate to the map. Dragging and scrolling within panels works without moving the map.

**Independent Test**: On mobile emulator (375px), expand Photo Wall or Trip Feed, scroll content inside — map must remain stationary. Drag handle to expand/collapse — map must not pan.

### Implementation for User Story 1

- [x] T008 [US1] In `css/map.css`, remove the `display: none` rules that hide `.feed-sidebar` and `.feed-toggle` on mobile (spec 009 FR-017 override). Add `touch-action: none` to `.feed-sidebar` in the mobile media query (< 768px). Ensure the feed sidebar uses `position: fixed; bottom: 0; left: 0; right: 0` bottom-sheet layout matching Photo Wall's pattern.
- [x] T009 [US1] In `index.html`, remove the old Trip Feed touch handlers (the IIFE at approximately lines 673-768 that adds `touchstart`, `touchmove`, `touchend` listeners to `feed-drag-handle` and `feed-header`). Replace with a new PanelSnap instantiation: `new PanelSnap({ panelEl: feedSidebar, handleEl: document.querySelector('.feed-drag-handle'), collapseBtn: null, statePrefix: 'feed-sidebar', onStateChange: function(state) { ... } })`. Register with PanelCoordinator.
- [x] T010 [US1] In `css/map.css`, add CSS state classes for the feed sidebar matching PanelSnap's pattern: `.feed-sidebar--collapsed` (height matching header only ~60px), `.feed-sidebar--half` (50vh), `.feed-sidebar--full` (100vh), `.feed-sidebar--hidden` (transform: translateY(100%); pointer-events: none), `.feed-sidebar--animating` (transition on height, transform, border-radius using cubic-bezier(0.22, 1, 0.36, 1) at 250ms). These replace the existing `feed-sheet-collapsed`, `feed-sheet-half`, `feed-sheet-full` classes.
- [x] T011 [US1] In `index.html`, add a `wheel` event listener on the feed sidebar element with `e.stopPropagation()` and `{ passive: false }` to prevent map zoom-on-scroll when hovering/touching the feed panel. Also add `stopPropagation()` calls on `pointerdown` events within the feed sidebar to prevent Leaflet from receiving pointer events.
- [x] T012 [US1] Remove the `pointer-events: none` CSS from `.feed-entries` in `css/map.css` (and the corresponding `pointer-events: auto` on `.feed-entry`). The PanelSnap approach handles event isolation via pointer capture on the handle, so the feed entries container should have normal pointer events for scrolling.

**Checkpoint**: Both panels respond to touch/drag without affecting the map. US1 is functional.

---

## Phase 4: User Story 2 — Working Close/Dismiss Controls (Priority: P1)

**Goal**: Close ('x') buttons on both panels dismiss them reliably on first tap. A toggle/reopen button appears when a panel is hidden.

**Independent Test**: Tap the 'x' on Trip Feed — it slides off-screen. Tap its toggle button — it reappears collapsed. Same for Photo Wall.

### Implementation for User Story 2

- [x] T013 [US2] In `index.html`, rewire the Trip Feed close button (`#feed-close`). Remove the old `feedClose.addEventListener('click', toggleFeedSidebar)` (line ~517). Instead, wire it through the PanelSnap collapse button mechanism: pass `collapseBtn: document.getElementById('feed-close')` to the Trip Feed's PanelSnap constructor, or add a direct click listener that calls `feedPanelSnap.snapTo('hidden')` with `e.stopPropagation()` to prevent Leaflet's click suppression from blocking it.
- [x] T014 [US2] In `index.html`, update the Trip Feed's `onStateChange` callback to dispatch `trip-feed:state-changed` custom event on `document` with `{ detail: { state } }` and to dispatch `panel:activate` with `{ detail: { panel: 'trip-feed' } }` when state is not `'hidden'`. When state is `'hidden'`, dispatch `panel:deactivate` with `{ detail: { panel: 'trip-feed' } }`.
- [x] T015 [P] [US2] In `index.html`, add toggle button HTML elements for both panels inside the map container (after the existing photo-wall-reopen-btn): `<button class="panel-toggle-btn" id="trip-feed-toggle-btn" data-panel="trip-feed">Feed</button>` and update the existing `#photo-wall-reopen-btn` to use the shared class `panel-toggle-btn` with `data-panel="photo-wall"` and label "Photos".
- [x] T016 [US2] In `js/panel-manager.js`, implement toggle button wiring in PanelCoordinator: query all `.panel-toggle-btn` elements, add click listeners that dispatch `panel:activate` for the corresponding `data-panel` value. Update button visibility logic: a button is visible (class `visible`) when its panel is NOT the active panel.
- [x] T017 [US2] In `css/panel-shared.css`, style `.panel-toggle-btn`: position fixed, bottom-right of viewport, 44x44px minimum touch target, dark glass background matching panel aesthetic, hidden by default (`display: none`), shown with `.panel-toggle-btn.visible` (`display: flex`). Stack two buttons vertically with 8px gap. Use z-index `var(--z-panel-toggle, 1002)`.
- [x] T018 [US2] In `js/photo-wall.js`, update the reopen button logic: replace the existing `#photo-wall-reopen-btn` click handler (lines ~520-525) with delegation to PanelCoordinator. The reopen button should dispatch `panel:activate` for `photo-wall` instead of directly calling `snapTo('collapsed')`. Remove the old `.visible` class toggle from `_onSnapStateChange` for the reopen button — PanelCoordinator now manages this.

**Checkpoint**: Close buttons work on both panels. Toggle buttons appear/disappear correctly. US2 is functional.

---

## Phase 5: User Story 3 — Clear Distinction Between Trip Feed and Photo Wall (Priority: P2)

**Goal**: Only one bottom panel visible at a time on mobile. Each panel has a visually distinct header.

**Independent Test**: On mobile, only one panel is visible. Tapping the other panel's toggle replaces it. Each panel has a clearly different header.

### Implementation for User Story 3

- [x] T019 [US3] In `js/panel-manager.js`, ensure PanelCoordinator enforces single-panel exclusivity on mobile: when `panel:activate` fires for panel A, if viewport < 768px and panel B is in a non-hidden state, call panel B's `snapTo('hidden')` before activating panel A. Add a small delay (50ms) or use the animation end callback to avoid visual overlap during the transition.
- [x] T020 [US3] In `css/map.css`, update the Trip Feed header (`.feed-header`) styling for mobile to be visually distinct from Photo Wall: use a different accent color or left-border highlight. Ensure the "Trip Feed" text label is prominent. The header should contain the title, region toggle button, and close button with 44px touch targets.
- [x] T021 [P] [US3] In `css/photo-wall.css`, verify the Photo Wall header (`.photo-wall-header`) has the "Photos" label prominent and its own distinct accent style. Ensure consistency with the shared panel design language (same font sizes, spacing, close button placement) while being visually distinguishable from the Trip Feed header.
- [x] T022 [US3] In `index.html`, set the default panel state on mobile page load (per FR-015): Photo Wall starts in collapsed state (already handled by existing init code), Trip Feed starts in hidden state with its toggle button visible. Add initialization logic in the Trip Feed setup section that checks `window.innerWidth <= 768` and calls `feedPanelSnap.snapTo('hidden')` and registers with PanelCoordinator as initially inactive.

**Checkpoint**: Panels are exclusive on mobile. Each is visually distinct. US3 is functional.

---

## Phase 6: User Story 4 — Smooth Navigation Between Map, Regions, and Panels (Priority: P2)

**Goal**: Region selection auto-switches to Trip Feed. Deselection restores Photo Wall. Back/Escape dismisses topmost overlay.

**Independent Test**: Select a region → Trip Feed appears with itinerary. Deselect → Photo Wall returns. Press Escape to dismiss any open overlay.

### Implementation for User Story 4

- [x] T023 [US4] In `js/region-nav.js`, update the `selectRegion` function (around line 219-222): replace `feedSidebar.classList.remove('hidden')` with `document.dispatchEvent(new CustomEvent('panel:activate', { detail: { panel: 'trip-feed' } }))`. This uses the coordinator to properly dismiss Photo Wall and show Trip Feed on mobile.
- [x] T024 [US4] In `js/region-nav.js`, update the `deselectRegion` function (around line 268-300): add `document.dispatchEvent(new CustomEvent('panel:activate', { detail: { panel: 'photo-wall' } }))` to switch back to Photo Wall in collapsed state when the user returns to all-regions view (per FR-017).
- [x] T025 [US4] In `js/panel-manager.js`, add a keyboard/back-gesture handler: listen for `keydown` event on `document` for `Escape` key. When pressed, determine the topmost dismissable layer: (1) if regions overlay is visible (`region-grid--overlay` class present), close it; (2) else if a panel is in `full` or `half` state, collapse it; (3) else if a panel is in `collapsed` state, hide it. This implements FR-014.
- [x] T026 [US4] In `js/region-nav.js`, ensure the regions grid overlay dismisses on backdrop tap: verify the existing click handler on the overlay backdrop (if any) calls `toggleGrid()` or equivalent. If missing, add a click listener on the `.region-grid--overlay` element (when it has that class) that calls the grid toggle function when the click target is the backdrop itself (not a region card).

**Checkpoint**: Full navigation flow works: map → regions → itinerary → back → map. US4 is functional.

---

## Phase 7: User Story 5 — Consistent Drag Handle Affordance (Priority: P3)

**Goal**: Drag handles on both panels are visually prominent with adequate touch targets.

**Independent Test**: On mobile, the drag handle is immediately visible and easy to grab on first attempt.

### Implementation for User Story 5

- [x] T027 [P] [US5] In `css/panel-shared.css`, define shared drag handle styles: `.panel-drag-handle` with width 48px, height 8px, border-radius 4px, background `rgba(255,255,255,0.4)`, centered with `margin: 8px auto 4px`, minimum touch target area of 44x44px (use padding or a transparent hit area wrapper). Add hover/active state with increased opacity (`rgba(255,255,255,0.6)`).
- [x] T028 [P] [US5] In `css/map.css`, update `.feed-drag-handle` to use the shared handle dimensions from `panel-shared.css`. Remove the existing `display: none` default and `display: block` mobile override — the handle should always be present but only functional (PanelSnap binds to it) on mobile. On desktop, it serves as a visual separator.
- [x] T029 [US5] In `css/photo-wall.css`, update `.photo-wall-handle-bar` to match the shared drag handle dimensions (48x8px, same border-radius and opacity). Ensure the `.photo-wall-handle` wrapper has the 44px minimum touch target area consistent with the Trip Feed handle.

**Checkpoint**: Both panels have prominent, consistent drag handles. US5 is functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Visual verification, edge case handling, and cleanup.

- [x] T030 Handle orientation change edge case: in `js/panel-manager.js`, add a `resize` event listener (debounced 200ms) that re-evaluates panel state. If viewport crosses the 768px breakpoint, reset panel exclusivity rules. If a panel is expanded and viewport height changes, re-snap to the current state to recalculate heights.
- [x] T031 Handle tap-to-toggle edge case: in `js/panel-manager.js` PanelSnap class, detect taps (pointerdown + pointerup with < 5px movement and < 200ms duration) on the drag handle and toggle between collapsed and half states instead of treating as a drag.
- [x] T032 Remove the old `toggleFeedSidebar` function from `index.html` (lines ~502-514) and the old `feedToggle` button logic that is no longer needed now that PanelCoordinator manages feed visibility. Clean up any dead code references to the old feed toggle mechanism.
- [X] T033 Run visual verification: start local server (`python3 -m http.server 8000`), use Playwright MCP to screenshot at 375px width showing (a) Photo Wall collapsed default, (b) Photo Wall expanded, (c) Trip Feed after toggle, (d) Trip Feed expanded, (e) region grid overlay, (f) after region selection with Trip Feed showing. Also screenshot at 1440px to verify desktop layout is unchanged.
- [X] T034 Review all modified files for cleanup: remove unused CSS classes, commented-out code, and orphaned event listeners. Ensure no console.log statements remain. Verify z-index hierarchy is consistent across all panels and overlays.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — fixes core touch isolation
- **US2 (Phase 4)**: Depends on US1 (T009 creates the Trip Feed PanelSnap that US2 wires close/toggle to)
- **US3 (Phase 5)**: Depends on US2 (needs toggle buttons and coordinator wiring in place)
- **US4 (Phase 6)**: Depends on US3 (needs panel exclusivity to be working before region nav integration)
- **US5 (Phase 7)**: Can start after Foundational — independent visual changes, no dependency on US1-US4
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — core bug fix
- **US2 (P1)**: Depends on US1 — needs PanelSnap on Trip Feed before wiring close/toggle
- **US3 (P2)**: Depends on US2 — needs toggle buttons to enforce exclusivity
- **US4 (P2)**: Depends on US3 — needs coordinator exclusivity before region nav integration
- **US5 (P3)**: Independent of US1-US4 — pure CSS visual changes (can parallel with US3/US4)

### Within Each User Story

- CSS state classes before JS wiring (e.g., T010 before T009)
- Core functionality before integration
- Story complete before moving to next priority

### Parallel Opportunities

- T002 and T003 can run in parallel (different files)
- T015 (toggle button HTML) can run in parallel with T013/T014 (different concerns)
- T020 and T021 can run in parallel (different CSS files)
- T027, T028 can run in parallel (different CSS files)
- US5 (Phase 7) can run in parallel with US3/US4 (Phases 5-6) since it's CSS-only

---

## Parallel Example: User Story 1

```bash
# T010 and T012 can run in parallel (both CSS in map.css but different sections):
Task: "Add feed-sidebar CSS state classes in css/map.css"
Task: "Remove pointer-events: none from .feed-entries in css/map.css"

# T008 must complete before T009 (CSS states needed before JS wiring)
```

## Parallel Example: User Story 5

```bash
# All three tasks touch different CSS files:
Task: "Define shared drag handle styles in css/panel-shared.css"
Task: "Update .feed-drag-handle in css/map.css"
Task: "Update .photo-wall-handle-bar in css/photo-wall.css"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (extract PanelSnap, create coordinator)
3. Complete Phase 3: US1 — touch isolation fixed
4. Complete Phase 4: US2 — close buttons and toggle buttons work
5. **STOP and VALIDATE**: Both panels drag, close, and reopen correctly on mobile
6. Deploy/demo if ready — core bugs are fixed

### Incremental Delivery

1. Setup + Foundational → shared infrastructure ready
2. Add US1 → touch events isolated → core bug fixed
3. Add US2 → close/toggle buttons work → panels dismissable
4. Add US3 → single panel at a time + distinct headers → no more confusion
5. Add US4 → region nav integration → seamless navigation flow
6. Add US5 → polished drag handles → professional feel
7. Polish → edge cases, cleanup, screenshots

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US1 and US2 are both P1 but sequentially dependent (US2 needs the PanelSnap from US1)
- US5 is the only fully independent story — can be done any time after Foundational
- All visual changes must be verified with Playwright screenshots at 375px and 1440px per CLAUDE.md
- Desktop layout (>= 768px) must remain completely unchanged throughout
