# Tasks: Lightweight App State Module

**Input**: Design documents from `/specs/016-app-state-module/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not requested — manual browser verification via Playwright MCP in Polish phase.

**Organization**: Tasks grouped by user story. US1–US4 integrations are in separate files and can proceed in parallel after the foundational phase.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Add the script tag so app-state.js loads in the correct position

- [x] T001 Add `<script src="js/app-state.js"></script>` tag in `index.html` after the `route-builder.js` script tag and before the `photo-viewer.js` script tag, per the load order in research.md R5

---

## Phase 2: Foundational — Core State Module

**Purpose**: Create the app-state module with full API including unsubscribe support. Also satisfies US5 (Change Subscription).

**CRITICAL**: No integration tasks can begin until this phase is complete.

- [x] T002 Create `js/app-state.js` as an ES5-compatible IIFE exposing `window.appState` with:
  - Closure-scoped `_state` object initialized with defaults per FR-003: `activePanel: null`, `activeRegionId: null`, `visibleDateRange: { min: null, max: null }`, `viewerOpen: false`, `mapInteractive: false`, `baseLayer: 'Humanitarian'`
  - Closure-scoped `_listeners` object mapping each key to an empty array
  - `get(key)` — returns `_state[key]` if key exists, else `console.warn` + return `undefined` (R4)
  - `set(key, value)` — validates key, performs change detection (property-level for `visibleDateRange`, strict `===` for others per R2), updates value, fires listeners with `(newValue, oldValue)` each wrapped in try/catch (R3)
  - `getAll()` — returns shallow copy (copy `visibleDateRange` as new object)
  - `onChange(key, callback)` — validates key, pushes callback to listeners array
  - Invalid key handling: `console.warn('[appState] Unknown key: ' + key)` (R4)

- [x] T003 Update `onChange` in `js/app-state.js` to return an idempotent unsubscribe function per FR-001 clarification and R7: when called, the returned function splices the callback from the `_listeners[key]` array. Subsequent calls to the same unsubscribe function are no-ops. This enables modules to clean up listeners without holding callback references.

**Checkpoint**: `window.appState` available in console. `getAll()` returns defaults. `set()`/`get()` work. `onChange()` returns an unsubscribe function that removes the listener when called.

---

## Phase 3: User Story 1 — Panel State Tracking (Priority: P1) MVP

**Goal**: `appState.get('activePanel')` always reflects the currently visible panel

**Independent Test**: Open app, switch panels (photo-wall, trip-feed), verify `window.appState.get('activePanel')` in console matches the visible panel. Verify `panel:activate`/`panel:deactivate` custom events still fire.

- [x] T004 [US1] Integrate activePanel tracking in `js/panel-manager.js`: In `PanelCoordinator.activate(panelId)`, add `if (window.appState) window.appState.set('activePanel', panelId)` after the existing activation logic. In the deactivation path, add `if (window.appState) window.appState.set('activePanel', null)`. Existing `panel:activate`/`panel:deactivate` events remain untouched (R6, FR-007).

**Checkpoint**: Panel switches update `appState.get('activePanel')`. Custom events still fire.

---

## Phase 4: User Story 2 — Shared Visible Date Range (Priority: P1)

**Goal**: `appState.get('visibleDateRange')` returns the current timeline filter range

**Independent Test**: Adjust timeline slider, verify `window.appState.get('visibleDateRange')` returns `{ min: '<ISO date>', max: '<ISO date>' }` matching slider position.

- [x] T005 [P] [US2] Integrate visibleDateRange in `js/app.js`: In `applyTimelineFilter()`, add `if (window.appState) window.appState.set('visibleDateRange', { min: minDate, max: maxDate })`. Also add initial set in the init sequence after `uniqueDates` is populated, setting the full range.

**Checkpoint**: Timeline slider and initial load update `appState.get('visibleDateRange')`.

---

## Phase 5: User Story 3 — Region Selection Tracking (Priority: P2)

**Goal**: `appState.get('activeRegionId')` returns the currently selected region ID

**Independent Test**: Select a region, verify `window.appState.get('activeRegionId')` returns the region's stable ID. Deselect, verify it returns `null`.

- [x] T006 [P] [US3] Integrate activeRegionId in `js/region-nav.js`: In `selectRegion(index)`, add `if (window.appState) window.appState.set('activeRegionId', section.id)`. In `deselectRegion()`, add `if (window.appState) window.appState.set('activeRegionId', null)`.

**Checkpoint**: Region select/deselect updates `appState.get('activeRegionId')`.

---

## Phase 6: User Story 4 — Viewer Open/Closed State (Priority: P2)

**Goal**: `appState.get('viewerOpen')` reflects whether the photo viewer is currently open

**Independent Test**: Open a photo, verify `window.appState.get('viewerOpen')` returns `true`. Close viewer, verify it returns `false`.

- [x] T007 [P] [US4] Integrate viewerOpen in `js/photo-viewer.js`: In the open handler, add `if (window.appState) window.appState.set('viewerOpen', true)`. In the close handler, add `if (window.appState) window.appState.set('viewerOpen', false)`.

**Checkpoint**: Viewer open/close updates `appState.get('viewerOpen')`.

---

## Phase 7: User Story 5 — Change Subscription (Priority: P2)

**Goal**: Modules can subscribe to state changes via `onChange` and unsubscribe when done

**Independent Test**: `var unsub = appState.onChange('activePanel', cb)` → switch panels → verify callback fires with `(newVal, oldVal)` → call `unsub()` → switch panels again → verify callback does NOT fire.

**Note**: US5 core onChange mechanism delivered by T002. Unsubscribe addition delivered by T003. No additional integration tasks needed.

**Checkpoint**: Verified through console testing per quickstart.md.

---

## Phase 8: Polish & Verification

**Purpose**: Verify no visual or behavioral regressions across viewports

- [x] T008 Playwright screenshot verification at 375px mobile width — confirm panel transitions, timeline slider, region nav, and photo viewer work identically (FR-009, SC-003)
- [x] T009 Playwright screenshot verification at 1440px desktop width — confirm desktop behavior unchanged
- [x] T010 Run full quickstart.md validation in browser console: verify `getAll()` output, panel tracking, change subscription with unsubscribe, and all behavioral preservation checks

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Stories (Phases 3–6)**: All depend on Phase 2. US1–US4 can proceed **in parallel** (different files)
- **US5 (Phase 7)**: Delivered by Phase 2 (T002 + T003) — no additional work
- **Polish (Phase 8)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (Panel State)**: Phase 2 only. Touches `panel-manager.js`.
- **US2 (Date Range)**: Phase 2 only. Touches `app.js`.
- **US3 (Region Selection)**: Phase 2 only. Touches `region-nav.js`.
- **US4 (Viewer State)**: Phase 2 only. Touches `photo-viewer.js`.
- **US5 (Change Subscription)**: Built into core module (T002 + T003).

### Parallel Opportunities

```text
Sequential: T001 → T002 → T003 (setup + core module + unsubscribe)

Parallel batch (after T003):
  T004 (panel-manager.js)  ─┐
  T005 (app.js)             ├─ all touch different files
  T006 (region-nav.js)      │
  T007 (photo-viewer.js)   ─┘

Sequential: T008 → T009 → T010 (verification)
```

---

## Implementation Strategy

### MVP First (US1 + US2 — both P1)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002, T003)
3. Complete Phase 3: US1 — Panel State (T004)
4. Complete Phase 4: US2 — Date Range (T005)
5. **STOP and VALIDATE**: `appState.getAll()` shows panel and date range tracking

### Full Delivery (Recommended — Small Feature)

1. T001 → T002 → T003 (sequential setup)
2. T004 + T005 + T006 + T007 (parallel integrations)
3. T008 + T009 + T010 (verification)
4. Total: 10 tasks across 8 phases

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- US5 has no dedicated implementation tasks — it is built into the core module (T002 + T003)
- All integration tasks (T004–T007) are additive `appState.set()` calls — existing logic untouched (R6)
- Tasks T001, T002, T004–T007 are already complete from prior implementation. Remaining: T003 (unsubscribe), T008–T010 (verification).
- `mapInteractive` and `baseLayer` keys are in the schema but NOT integrated in this feature — reserved for future phases
