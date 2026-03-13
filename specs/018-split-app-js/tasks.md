# Tasks: Split app.js — Extract Feed Controller & Control Panel

**Input**: Design documents from `/specs/018-split-app-js/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/feed-controller-api.md, contracts/control-panel-api.md

**Tests**: Manual browser verification + Playwright screenshots at desktop (1440px) and mobile (375px)
**Organization**: Tasks are grouped into 5 phases: shared utility, feed extraction, control panel extraction, app.js wiring, and verification.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Shared Utility — formatDateShort Consolidation

**Purpose**: Move formatDateShort into dom-helpers.js and remove duplicates before extracting modules that depend on it.

- [x] T001 [P] [US3] Add `formatDateShort` to `js/dom-helpers.js` — Add the function to the IIFE (using the app.js string-splitting implementation from line 354). Add `formatDateShort: formatDateShort` to the `window.domHelpers` export object (currently at line 56-59). The implementation: if falsy input return `''`; split on `'-'`; if fewer than 3 parts return input; return `months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10)`.

- [x] T002 [P] [US3] Update `js/region-nav.js` — Remove the local `formatDateShort` function (lines 31-35). Replace all internal calls to `formatDateShort(x)` with `domHelpers.formatDateShort(x)`. The function is called within the module at multiple locations — search for all `formatDateShort(` references and update them. Do NOT add `var formatDateShort = domHelpers.formatDateShort;` alias — use the full `domHelpers.formatDateShort()` call to make the dependency explicit.

**Checkpoint**: Open the app. Feed dates and region nav dates display correctly as "Mon DD" format. Console has no errors.

---

## Phase 2: Feed Controller Extraction

**Purpose**: Extract the feed sidebar subsystem from app.js into feed-controller.js.

- [x] T003 [US1] Create `js/feed-controller.js` — ES5-compatible IIFE exposing `window.feedController`. Extract from `js/app.js`:
  - **DOM refs and state** (lines 363-367): `feedSidebar`, `feedToggle`, `feedClose`, `feedEntries`, `activeFeedDate` — these become local variables initialized inside `init()`.
  - **Map interaction prevention** (lines 370-375): `L.DomEvent.disableClickPropagation`, `disableScrollPropagation`, wheel handler.
  - **PanelSnap wiring** (lines 378-432): PanelSnap creation, panel coordinator registration, toggle button wiring, default mobile state.
  - **buildFeed()** (lines 435-487): Feed entry DOM construction. Uses `el` and `text` from `domHelpers` (already used in current code). Uses `formatDateShort` from opts. Uses `dateIndex` from opts.
  - **onFeedEntryClick()** (lines 489-554): Entry click → highlight + flyToBounds + photo wall notification. Uses `map` from opts. References `feedPanelSnap` (internal). References `feedSidebar` (internal).
  - **onFeedThumbnailClick()** (lines 556-583): Thumbnail click → photo viewer. Uses `getFilteredPhotos()` and `getPhotoIndex()` getter functions from opts.
  - **updateFeedForTimeline()** (lines 585-591): Date range filtering. References `feedEntries` (internal).
  - **renderFeedNarratives()** (lines 596-611): Narrative rendering. Uses `el` and `text` from `domHelpers`.
  - **_wireNarrativeEditing()** (lines 613-628): Wire click events on narratives.
  - **_onNarrativeEditStart()** (lines 630-659): Create textarea for editing.
  - **_saveNarrativeAndRender()** (lines 661-668): Save via cloudData and re-render.
  - **Event listeners** (lines 670-679): `narratives-loaded` and `auth-state-changed` listeners.

  Expose on `window.feedController` after init: `buildFeed`, `updateFeedForTimeline`, `renderFeedNarratives`.

  **Stale reference handling**: `onFeedThumbnailClick` uses `opts.getFilteredPhotos()` and `opts.getPhotoIndex()` instead of direct array references. The `_saveNarrativeAndRender` function has a local `var text = textarea.value.trim()` that shadows the dom-helpers `text` — rename to `var noteText` to avoid confusion.

- [x] T004 [US1] Add `<script src="js/feed-controller.js"></script>` to `index.html` — Insert after the `landing-page.js` script tag (currently line 102) and before `app.js` (currently line 103).

**Checkpoint**: `window.feedController` is accessible in browser console. The module defines `init` but does nothing until called.

---

## Phase 3: Control Panel Extraction

**Purpose**: Extract the control panel subsystem from app.js into control-panel.js.

- [x] T005 [US2] Create `js/control-panel.js` — ES5-compatible IIFE exposing `window.controlPanel`. Extract from `js/app.js`:
  - **buildControlPanel()** (lines 682-896): The entire function body. Internal state for `currentBaseLayer` (copied from opts, mutated on layer switch). Timeline segments HTML generation, boundary markers HTML, layer radio buttons, panel DOM construction, event wiring (toggle, layers, route, auth, segment tooltips). Auth-state-changed handler calls `opts.setCloudFavoritesLoaded(true/false)`, `opts.rebuildPhotoLayer()`, `opts.buildPhotoIndex()`.
  - **_updatePendingIndicator()** (lines 899-905): Pending writes display. Note: the local `var el` in this function shadows the dom-helpers `el` — this is fine since it's `document.getElementById`, not a DOM builder call.
  - **updatePhotoCount()** (lines 912-917): Photo count display. Uses `opts.allPhotos.length` for the total.
  - **Density slider handler** (from lines 1222-1228 in Promise.all callback): Move into `init()`. Owns `currentDensityCellSize` internally. Calls `opts.onDensityChange(cellSize)`.
  - **Size slider handler** (from lines 1230-1238 in Promise.all callback): Move into `init()`. Owns `currentIconSize` internally. Calls `opts.onSizeChange(iconSize)`.

  Expose on `window.controlPanel` after init: `updatePhotoCount`, `updatePendingIndicator`.

  **Auto-collapse behavior**: `togglePanel()` references `feedSidebar` and `feedToggle` from opts for the medium-viewport auto-collapse logic (lines 787-791).

- [x] T006 [US2] Add `<script src="js/control-panel.js"></script>` to `index.html` — Insert after `feed-controller.js` and before `app.js`.

**Checkpoint**: `window.controlPanel` is accessible in browser console. The module defines `init` but does nothing until called.

---

## Phase 4: app.js Wiring

**Purpose**: Remove extracted code from app.js and wire the new modules via init calls.

- [x] T007 [US1] [US2] Remove extracted code from `js/app.js` — Delete the following sections:
  - `formatDateShort` function (lines 354-360) — now in dom-helpers.js
  - Feed sidebar section (lines 362-679) — now in feed-controller.js
  - `buildControlPanel` function (lines 682-896) — now in control-panel.js
  - `_updatePendingIndicator` function (lines 899-905) — now in control-panel.js
  - `updatePhotoCount` function (lines 912-917) — now in control-panel.js
  - Density slider handler (lines 1222-1228) — now in control-panel.js
  - Size slider handler (lines 1230-1238) — now in control-panel.js

  Keep `formatDateShort` reference via `domHelpers.formatDateShort` (already accessible via the `var el = domHelpers.el, text = domHelpers.text;` line — add `var formatDateShort = domHelpers.formatDateShort;` alongside it).

- [x] T008 [US1] [US2] Add feedController and controlPanel init calls to `js/app.js` — In the Promise.all callback, after `dateIndex` is populated and before `buildFeed()` was previously called:

  ```javascript
  // Initialize feed controller
  window.feedController.init({
      map: map,
      dateIndex: dateIndex,
      getFilteredPhotos: function () { return filteredPhotos; },
      getPhotoIndex: function () { return photoIndex; },
      formatDateShort: formatDateShort
  });
  ```

  After `buildControlPanel()` was previously called (i.e., after uniqueDates/timelineSegments/boundaryMarkers are computed):

  ```javascript
  // Initialize control panel
  window.controlPanel.init({
      map: map,
      baseLayers: baseLayers,
      currentBaseLayer: currentBaseLayer,
      travelRouteLayer: travelRouteLayer,
      uniqueDates: uniqueDates,
      timelineSegments: timelineSegments,
      boundaryMarkers: boundaryMarkers,
      allPhotos: allPhotos,
      feedSidebar: document.getElementById('feed-sidebar'),
      feedToggle: document.getElementById('feed-toggle'),
      formatDateShort: formatDateShort,
      setCloudFavoritesLoaded: function (val) { _cloudFavoritesLoaded = val; },
      rebuildPhotoLayer: rebuildPhotoLayer,
      buildPhotoIndex: buildPhotoIndex,
      initialDensityCellSize: currentDensityCellSize,
      initialIconSize: currentIconSize,
      onDensityChange: function (cellSize) {
          currentDensityCellSize = cellSize;
          ViewportSampler.setCellSize(cellSize);
      },
      onSizeChange: function (iconSize) {
          currentIconSize = iconSize;
          ViewportSampler.updateIconSize(iconSize);
          if (filteredPhotos.length > 0) rebuildPhotoLayer();
      }
  });
  ```

- [x] T009 [US1] [US2] Update cross-module references in `js/app.js` — Replace direct function calls with module method calls:
  - `buildFeed()` → `window.feedController.buildFeed()`
  - `updateFeedForTimeline(minDate, maxDate)` → `window.feedController.updateFeedForTimeline(minDate, maxDate)` (in `applyTimelineFilter`, ~line 973)
  - `buildControlPanel()` → remove (handled by controlPanel.init)
  - `updatePhotoCount(count)` → `window.controlPanel.updatePhotoCount(count)` (in `onTimelineVisualUpdate`, ~line 947)
  - `_updatePendingIndicator` → `window.controlPanel.updatePendingIndicator` (in `pending-writes-changed` listener, ~line 1195)
  - `renderFeedNarratives()` → `window.feedController.renderFeedNarratives()` (if called from app.js — check `narratives-loaded` listener, but this may have moved to feed-controller.js)

  Also remove: `feedSidebar`, `feedToggle`, `feedClose`, `feedEntries`, `activeFeedDate`, `feedPanelSnap` variable declarations (now in feed-controller.js). Remove `currentDensityCellSize` and `currentIconSize` variable declarations if no longer needed in app.js (they're still needed for init opts values and the onSizeChange callback — keep them).

  **Important**: The landing page `onEnterMap` callback (lines 1097-1117) references `feedSidebar`, `feedToggle`. These DOM elements need to be re-acquired via `document.getElementById` since the feed controller owns the original refs. Similarly, the `initRegionNav` call (lines 1072-1088) passes `feedEntries` — update to `document.getElementById('feed-entries')`.

**Checkpoint**: App loads. All three init calls execute without errors. Feed, control panel, and timeline all work.

---

## Phase 5: Verification & Polish

**Purpose**: Visual verification and comprehensive testing at both viewport widths.

- [x] T010 [P] Take Playwright screenshots at desktop (1440px) and mobile (375px) showing: feed panel with entries, control panel open with timeline/layers/settings, and general map view. Verify visual output matches pre-refactor appearance. Serve locally via `python3 -m http.server 8000`.

- [x] T011 [P] Check browser console for any new runtime errors after all refactors. Navigate through all surfaces: open feed panel, click entries, click thumbnails, open control panel, switch layers, toggle route, adjust sliders, resize to mobile width. Confirm zero new errors or warnings.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (formatDateShort)**: No dependencies — can start immediately
- **Phase 2 (Feed extraction)**: Depends on Phase 1 (feed-controller.js uses formatDateShort)
- **Phase 3 (Control panel extraction)**: Depends on Phase 1 (control-panel.js uses formatDateShort)
- **Phase 4 (app.js wiring)**: Depends on Phases 2 and 3 (needs both modules to exist)
- **Phase 5 (Verification)**: Depends on Phase 4

### Parallel Opportunities

```text
Phase 1: T001 ∥ T002 (different files: dom-helpers.js vs region-nav.js)

Phase 2 ∥ Phase 3 (after Phase 1):
  T003 [feed-controller.js] ∥ T005 [control-panel.js]
  T004 [index.html line A]  ∥ T006 [index.html line B]
  (T004 and T006 touch the same file but different lines)

Phase 4: T007 → T008 → T009 (sequential, all modify app.js)

Phase 5: T010 ∥ T011 (different verification methods)
```

### Dependency DAG

```text
T001 ──┬──▶ T003 ──▶ T004 ──┐
       │                      ├──▶ T007 ──▶ T008 ──▶ T009 ──┬──▶ T010
T002 ──┤                      │                               │
       └──▶ T005 ──▶ T006 ──┘                               └──▶ T011
```

---

## Implementation Strategy

### MVP First (Phases 1–2 Only)

1. Complete Phase 1: formatDateShort consolidation (T001, T002)
2. Complete Phase 2: Feed controller extraction (T003, T004)
3. Partial Phase 4: Wire feedController.init in app.js, remove feed code
4. **STOP and VALIDATE**: Feed panel works identically
5. This proves the extraction pattern works before applying it to the control panel

### Full Delivery

1. Phase 1: formatDateShort → dom-helpers.js
2. Phase 2 ∥ Phase 3: Extract both modules in parallel
3. Phase 4: Wire both modules in app.js
4. Phase 5: Full verification

### Recommended Execution Order (Single Developer)

1. T001 + T002 (formatDateShort consolidation — small, low risk)
2. T003 + T004 (feed controller — larger extraction, tests the pattern)
3. T005 + T006 (control panel — follows proven pattern)
4. T007 → T008 → T009 (app.js wiring — sequential, careful)
5. T010 + T011 (verification)

---

## Notes

- ES5 only: no `const`, `let`, arrow functions, template literals, or `Array.from`
- The `_saveNarrativeAndRender` function declares `var text = textarea.value.trim()` which shadows the dom-helpers `text` variable — rename to `var noteText` in feed-controller.js
- The `_updatePendingIndicator` function declares `var el = document.getElementById(...)` which shadows the dom-helpers `el` — this is fine since it's not using the DOM builder
- Control panel's `buildControlPanel()` still uses innerHTML for the panel structure (large HTML string at lines 735-773) — this is intentional, not part of this refactor's scope
- Feed sidebar references in the landing page `onEnterMap` callback and `initRegionNav` call must be updated to use `document.getElementById` since the feed controller owns the original refs
- Commit after each phase checkpoint for easy rollback
