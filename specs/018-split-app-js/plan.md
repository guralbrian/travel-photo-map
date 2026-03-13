# Implementation Plan: Split app.js — Extract Feed Controller & Control Panel

**Branch**: `018-split-app-js` | **Date**: 2026-03-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/018-split-app-js/spec.md`

## Summary

Extract two subsystems from the 1274-line `js/app.js` monolith into standalone modules: `js/feed-controller.js` (~320 lines, feed sidebar logic) and `js/control-panel.js` (~215 lines, control panel logic). Consolidate the duplicated `formatDateShort` utility into `js/dom-helpers.js`. This is a pure structural refactor with zero behavior change, unblocking parallel worktree development on future specs (appState consumer wiring, remaining innerHTML cleanup, mobile map interaction policy).

## Technical Context

**Language/Version**: Vanilla JavaScript (ES5-compatible IIFEs)
**Primary Dependencies**: Leaflet.js 1.9.4 (vendored), no new dependencies
**Storage**: N/A — reads existing JSON manifests at runtime
**Testing**: Manual browser verification + Playwright screenshots at desktop (1440px) and mobile (375px)
**Target Platform**: Static web (GitHub Pages), all modern browsers
**Project Type**: Single-page web application (no build step)
**Performance Goals**: No measurable change — same code, different files
**Constraints**: ES5-compatible, no new external dependencies, zero behavior change
**Scale/Scope**: 2 new files, 4 modified files (app.js, dom-helpers.js, region-nav.js, index.html)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
| --------- | ------ | ----- |
| I. Privacy by Default | PASS | No new data collection, no external scripts, no analytics |
| II. Static & Zero-Config | PASS | No server-side processing, no API keys, pure static JS |
| III. Approachable by Everyone | PASS | No user-facing changes — zero behavior change |
| IV. Professional Visual Polish | PASS | No visual changes — same markup, classes, and styles |
| V. Performant at Any Scale | PASS | Same code in different files; 2 additional HTTP requests negligible |
| VI. Unified Media Experience | PASS | Photo/video handling untouched |
| VII. Map-Centric Integration | PASS | All map interactions preserved identically |

**Technology Constraints**:
- Plain HTML, vanilla JS, CSS — PASS (no framework, no build step)
- ES5-compatible — PASS (IIFE pattern, no arrow functions/const/let)
- No new dependencies — PASS (structural refactor only)

**Post-Phase 1 Re-check**: All principles still satisfied. No data model changes, no new surfaces, no behavior changes.

## Project Structure

### Documentation (this feature)

```text
specs/018-split-app-js/
├── spec.md              # This specification
├── plan.md              # This file
├── research.md          # Phase 0: boundary analysis and design decisions
├── data-model.md        # Module interfaces: init opts, public methods
├── quickstart.md        # Implementation order and verification
├── tasks.md             # Task breakdown across 5 phases
└── contracts/
    ├── feed-controller-api.md   # feedController API contract
    └── control-panel-api.md     # controlPanel API contract
```

### Source Code (repository root)

```text
js/
├── dom-helpers.js       # MODIFIED — add formatDateShort
├── feed-controller.js   # NEW — feed sidebar subsystem (~320 lines)
├── control-panel.js     # NEW — control panel subsystem (~215 lines)
├── app.js               # MODIFIED — shrinks to ~750 lines
├── region-nav.js        # MODIFIED — use domHelpers.formatDateShort
├── leaflet.js           # UNCHANGED
├── Leaflet.Photo.js     # UNCHANGED
├── ViewportSampler.js   # UNCHANGED
├── route-builder.js     # UNCHANGED
├── app-state.js         # UNCHANGED
├── photo-viewer.js      # UNCHANGED
├── panel-manager.js     # UNCHANGED
├── photo-wall.js        # UNCHANGED
├── trip-model.js        # UNCHANGED
└── landing-page.js      # UNCHANGED

index.html               # MODIFIED — add 2 script tags
```

**Structure Decision**: Flat `js/` directory matches existing project layout. New files placed alongside existing modules.

## Detailed Design

### 1. Feed Controller Module (`js/feed-controller.js`)

ES5-compatible IIFE exposing `window.feedController` with an `init(opts)` function and public methods.

**Extracted from app.js**: Lines 362–679 (feed sidebar logic).

**init(opts) receives**:
- `map` — Leaflet map instance (for flyToBounds)
- `dateIndex` — date index object from TripModel
- `getFilteredPhotos` — getter function returning current filteredPhotos array
- `getPhotoIndex` — getter function returning current photoIndex object
- `formatDateShort` — date formatting function (from domHelpers)

**Functions moved** (10 total):
- `buildFeed()` — builds feed entry DOM from dateIndex
- `onFeedEntryClick(evt)` — click handler: highlight + flyToBounds + photo wall notification
- `onFeedThumbnailClick(evt)` — click handler: open photo viewer with day-scoped photos
- `updateFeedForTimeline(minDate, maxDate)` — show/hide entries by date range
- `renderFeedNarratives()` — render narrative text into feed slots
- `_wireNarrativeEditing()` — wire click-to-edit on narrative elements
- `_onNarrativeEditStart(evt)` — create textarea for inline editing
- `_saveNarrativeAndRender(textarea)` — save narrative via cloudData
- Feed toggle/close/PanelSnap wiring
- Event listeners for `narratives-loaded` and `auth-state-changed`

**Public methods** (exposed on `window.feedController` after init):
- `updateFeedForTimeline(minDate, maxDate)` — called by app.js after timeline filter
- `buildFeed()` — called by app.js during init
- `renderFeedNarratives()` — called by app.js after narratives load

**DOM refs** (declared inside the IIFE, initialized during init):
- `feedSidebar`, `feedToggle`, `feedClose`, `feedEntries`, `activeFeedDate`, `feedPanelSnap`

### 2. Control Panel Module (`js/control-panel.js`)

ES5-compatible IIFE exposing `window.controlPanel` with an `init(opts)` function and public methods.

**Extracted from app.js**: Lines 682–917 (buildControlPanel, _updatePendingIndicator, updatePhotoCount) plus slider handlers from the Promise.all callback (lines 1218–1239).

**init(opts) receives**:
- `map` — Leaflet map instance (for layer switching)
- `baseLayers` — base layer object
- `currentBaseLayer` — initially active base layer
- `travelRouteLayer` — route layer reference
- `uniqueDates`, `timelineSegments`, `boundaryMarkers`, `allPhotos` — data for panel construction
- `feedSidebar`, `feedToggle` — for auto-collapse on medium viewports
- `formatDateShort` — date formatting function (from domHelpers)
- `setCloudFavoritesLoaded(value)` — setter callback for the flag in app.js
- `rebuildPhotoLayer()` — callback for post-auth-change rebuilds
- `buildPhotoIndex()` — callback for post-auth-change index rebuilds
- `initialDensityCellSize` (default 150) — initial density cell size
- `initialIconSize` (default 90) — initial icon size
- `onDensityChange(cellSize)` — callback when density slider changes
- `onSizeChange(iconSize)` — callback when size slider changes

**Functions moved** (3 + slider handlers):
- `buildControlPanel()` — builds panel DOM and wires all event listeners
- `_updatePendingIndicator()` — show/hide pending-writes indicator
- `updatePhotoCount(count)` — update photo count display
- Density slider input handler (from lines 1222–1228)
- Size slider input handler (from lines 1230–1238)

**Public methods** (exposed on `window.controlPanel` after init):
- `updatePhotoCount(count)` — called by app.js from `onTimelineVisualUpdate()`
- `updatePendingIndicator()` — called by app.js from `pending-writes-changed` listener

### 3. formatDateShort Consolidation

**Move to dom-helpers.js**: The app.js implementation (line 354, string-splitting approach):
```javascript
function formatDateShort(isoDate) {
    if (!isoDate) return '';
    var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    var parts = isoDate.split('-');
    if (parts.length < 3) return isoDate;
    return months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10);
}
```

**Remove from region-nav.js**: Line 31, the Date-object-based duplicate.

**Update region-nav.js**: Replace internal calls to `formatDateShort(x)` with `domHelpers.formatDateShort(x)`.

### 4. app.js Changes

After extraction, app.js retains:
- Map setup (lines 1–77)
- Popup helpers / `createPopupElement` (lines 79–146)
- Photo state variables and favorites subsystem (lines 148–210)
- Photo viewer event listeners (lines 214–232)
- Photo layer management: `buildPhotoIndex`, `onPhotoClick`, `rebuildPhotoLayer`, `getFilteredBounds` (lines 234–316)
- Annotation loading (lines 318–347)
- Trip segment state (lines 349–352)
- Timeline state variables and filter functions (lines 159–164, 907–987)
- Init sequence / Promise.all (lines 989–1256) — minus extracted init calls
- Firebase integration (lines 1258–1274)

**New code in app.js** (init sequence):
```javascript
// Initialize feed controller
window.feedController.init({
    map: map,
    dateIndex: dateIndex,
    getFilteredPhotos: function () { return filteredPhotos; },
    getPhotoIndex: function () { return photoIndex; },
    formatDateShort: domHelpers.formatDateShort
});
window.feedController.buildFeed();

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
    feedSidebar: feedSidebar,
    feedToggle: feedToggle,
    formatDateShort: domHelpers.formatDateShort,
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

**Modified calls**:
- `updatePhotoCount(count)` → `controlPanel.updatePhotoCount(count)`
- `updateFeedForTimeline(minDate, maxDate)` → `feedController.updateFeedForTimeline(minDate, maxDate)`

### 5. Script Load Order (index.html)

```html
<script src="js/landing-page.js"></script>
<script src="js/feed-controller.js"></script>
<script src="js/control-panel.js"></script>
<script src="js/app.js"></script>
```

### 6. Dependency Flow

```text
dom-helpers.js
  └─ formatDateShort() ──▶ feed-controller.js (via init opts)
                          ──▶ control-panel.js (via init opts)
                          ──▶ region-nav.js (via window.domHelpers)
                          ──▶ app.js (via local ref)

app.js (init sequence)
  ├─ feedController.init(opts) ──▶ feed-controller.js
  │   └─ opts: map, dateIndex, getFilteredPhotos, getPhotoIndex
  └─ controlPanel.init(opts)  ──▶ control-panel.js
      └─ opts: map, baseLayers, callbacks, data arrays
```
