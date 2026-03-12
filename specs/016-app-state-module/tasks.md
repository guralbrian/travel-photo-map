# Tasks: Lightweight App State Module

**Input**: Design documents from `/specs/016-app-state-module/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/app-state-api.md

**Tests**: Not requested — manual browser verification via Playwright MCP in Polish phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Add the script tag so app-state.js is loaded in the correct position

- [x] T001 Add `<script src="js/app-state.js"></script>` tag in `index.html` after the `route-builder.js` script tag and before the `photo-viewer.js` script tag, per the load order in plan.md

---

## Phase 2: Foundational (Core Module)

**Purpose**: Create the app-state.js module with full API — this also satisfies US5 (Change Subscription)

**CRITICAL**: No integration tasks can begin until this phase is complete

- [x] T002 Create `js/app-state.js` as an ES5-compatible IIFE that exposes `window.appState` with the following implementation per `contracts/app-state-api.md`:
  - Closure-scoped `_state` object initialized with defaults from `data-model.md`: `activePanel: null`, `activeRegionId: null`, `visibleDateRange: { min: null, max: null }`, `viewerOpen: false`, `mapInteractive: false`, `baseLayer: 'Humanitarian'`
  - Closure-scoped `_listeners` object mapping each key to an empty array
  - `get(key)` — returns `_state[key]` if key exists in schema, else `console.warn` + return `undefined`
  - `set(key, value)` — validates key exists, performs change detection (property-level for `visibleDateRange`, strict `===` for all others per `data-model.md` Change Detection Rules), updates `_state[key]`, fires all `_listeners[key]` callbacks with `(newValue, oldValue)` each wrapped in try/catch per research.md R3
  - `getAll()` — returns shallow copy of `_state` (copy `visibleDateRange` as new object)
  - `onChange(key, callback)` — validates key exists, pushes callback to `_listeners[key]`
  - Invalid key handling: `console.warn('[appState] Unknown key: ' + key)` per research.md R4

**Checkpoint**: `window.appState` is available in the browser console. `getAll()` returns defaults. `set()`/`get()`/`onChange()` work correctly.

---

## Phase 3: User Story 1 — Panel State Tracking (Priority: P1)

**Goal**: Track active panel through appState alongside existing panel:activate/panel:deactivate events

**Independent Test**: Open app, switch panels (photo-wall, trip-feed), verify `window.appState.get('activePanel')` reflects current panel. Verify `panel:activate`/`panel:deactivate` custom events still fire.

### Implementation for User Story 1

- [x] T003 [US1] Integrate activePanel tracking in `js/panel-manager.js`: In the `PanelCoordinator.activate(panelId)` method, add `window.appState.set('activePanel', panelId)` after the existing `_activePanel = panelId` assignment. In the deactivation path (when a panel is deactivated and no replacement is activated), add `window.appState.set('activePanel', null)`. Do NOT remove existing `panel:activate`/`panel:deactivate` event dispatching — appState writes are additive per research.md R6

**Checkpoint**: Panel switches update `appState.get('activePanel')`. Custom events still fire normally.

---

## Phase 4: User Story 2 — Shared Visible Date Range (Priority: P1)

**Goal**: Track timeline date range through appState so any module can read it

**Independent Test**: Adjust timeline slider, verify `window.appState.get('visibleDateRange')` returns `{ min: '<ISO date>', max: '<ISO date>' }` matching the slider position.

### Implementation for User Story 2

- [x] T004 [P] [US2] Integrate visibleDateRange tracking in `js/app.js`: In the `applyTimelineFilter()` function, after computing the start and end dates from the slider values + `uniqueDates` array, add `window.appState.set('visibleDateRange', { min: startDate, max: endDate })` where startDate/endDate are the ISO date strings derived from `uniqueDates[handleMin.value]` and `uniqueDates[handleMax.value]`. Also add an initial `window.appState.set('visibleDateRange', ...)` call after the timeline is first built (after the `uniqueDates` array is populated and slider defaults are set), so appState reflects the initial full range on load

**Checkpoint**: Timeline slider updates `appState.get('visibleDateRange')`. Initial page load shows full date range.

---

## Phase 5: User Story 3 — Region Selection Tracking (Priority: P2)

**Goal**: Track selected region through appState

**Independent Test**: Select a region from the navigation, verify `window.appState.get('activeRegionId')` returns the region's stable ID. Deselect, verify it returns `null`.

### Implementation for User Story 3

- [x] T005 [P] [US3] Integrate activeRegionId tracking in `js/region-nav.js`: In the `selectRegion(index)` function, after setting `_activeIndex = index`, add `window.appState.set('activeRegionId', section.id)` where `section` is `_sections[index]` (the region object from TripModel which has a stable `.id` property). In `deselectRegion()`, after setting `_activeIndex = -1`, add `window.appState.set('activeRegionId', null)`

**Checkpoint**: Region select/deselect updates `appState.get('activeRegionId')`.

---

## Phase 6: User Story 4 — Viewer Open/Closed State (Priority: P2)

**Goal**: Track photo viewer open/closed state through appState

**Independent Test**: Open a photo in the viewer, verify `window.appState.get('viewerOpen')` returns `true`. Close the viewer, verify it returns `false`.

### Implementation for User Story 4

- [x] T006 [P] [US4] Integrate viewerOpen tracking in `js/photo-viewer.js`: In the open handler (where `S.open = true` is set), add `window.appState.set('viewerOpen', true)` immediately after. In the close handler (where `S.open = false` is set), add `window.appState.set('viewerOpen', false)` immediately after

**Checkpoint**: Viewer open/close updates `appState.get('viewerOpen')`.

---

## Phase 7: Polish & Verification

**Purpose**: Verify no visual or behavioral regressions across the full app

- [x] T007 Browser verification: Start local server (`python3 -m http.server 8000`), open app in Playwright at desktop (1440px) and mobile (375px) widths. Verify:
  - Map loads with photo markers
  - Panel transitions (trip-feed, photo-wall) work as before
  - Timeline slider filters photos
  - Region navigation selects/deselects regions
  - Photo viewer opens and closes
  - `window.appState.getAll()` in console shows correct state after each interaction
  - No console errors from app-state.js
  - No visual differences from before

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (script tag must exist for module to load)
- **User Stories (Phases 3–6)**: All depend on Phase 2 completion
  - US1 (T003), US2 (T004), US3 (T005), US4 (T006) can proceed **in parallel** — they touch different files with no cross-dependencies
- **Polish (Phase 7)**: Depends on all user story phases being complete

### User Story Dependencies

- **US1 (Panel State)**: Depends only on Phase 2. Touches `panel-manager.js` only.
- **US2 (Date Range)**: Depends only on Phase 2. Touches `app.js` only.
- **US3 (Region Selection)**: Depends only on Phase 2. Touches `region-nav.js` only.
- **US4 (Viewer State)**: Depends only on Phase 2. Touches `photo-viewer.js` only.
- **US5 (Change Subscription)**: Satisfied by Phase 2 (built into core module).

### Parallel Opportunities

```text
Sequential: T001 → T002 (must complete before any integration)

Parallel batch (after T002):
  T003 (panel-manager.js)  ─┐
  T004 (app.js)             ├─ all touch different files
  T005 (region-nav.js)      │
  T006 (photo-viewer.js)   ─┘

Sequential: T007 (verification after all integrations)
```

---

## Parallel Example: User Stories 1–4

```bash
# After T002 completes, launch all integrations in parallel:
Task: "T003 [US1] Integrate activePanel tracking in js/panel-manager.js"
Task: "T004 [US2] Integrate visibleDateRange tracking in js/app.js"
Task: "T005 [US3] Integrate activeRegionId tracking in js/region-nav.js"
Task: "T006 [US4] Integrate viewerOpen tracking in js/photo-viewer.js"
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002)
3. Complete Phase 3: US1 — Panel State (T003)
4. Complete Phase 4: US2 — Date Range (T004)
5. **STOP and VALIDATE**: `appState.getAll()` shows panel and date range tracking
6. Remaining stories add incremental value

### Full Delivery (Recommended — Small Feature)

1. T001 → T002 (sequential setup)
2. T003 + T004 + T005 + T006 (parallel integrations)
3. T007 (verification)
4. Total: 7 tasks, ~30 minutes implementation time

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US5 (Change Subscription) has no dedicated phase — it is built into the core module (T002)
- All integration tasks (T003–T006) are single `appState.set()` calls added to existing code — additive, not replacement
- No test tasks generated — verification is manual via Playwright in T007
