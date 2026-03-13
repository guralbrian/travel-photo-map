# Research: Split app.js — Extract Feed Controller & Control Panel

**Feature Branch**: `018-split-app-js`
**Date**: 2026-03-12

## R1: Feed Sidebar Boundary Analysis (app.js lines 362–679)

**Decision**: Extract lines 362–679 as a cohesive unit into `js/feed-controller.js`.

**Rationale**: This block is self-contained: it declares its own DOM refs (`feedSidebar`, `feedToggle`, `feedClose`, `feedEntries`, `activeFeedDate`), its own PanelSnap instance (`feedPanelSnap`), and defines 10 functions that only interact with each other and a small set of external dependencies. The external dependencies are:
- `map` — for `flyToBounds()` in `onFeedEntryClick`
- `dateIndex` — for building entries and looking up photos by date
- `filteredPhotos` / `photoIndex` — for fallback photo lookup in `onFeedThumbnailClick`
- `formatDateShort` — utility (moving to dom-helpers.js)
- `window.photoViewer`, `window.cloudData`, `window.firebaseAuth`, `window.panelCoordinator`, `window.PanelSnap`, `window.photoWall` — global modules

All external dependencies can be injected via `init(opts)`.

**Alternatives considered**:
- Extract only `buildFeed()` and leave event handlers in app.js — rejected, splits the cohesive unit and leaves handlers referencing feed-internal state
- Use ES modules (import/export) — rejected, project uses ES5-compatible IIFEs throughout

## R2: Stale Reference Problem — filteredPhotos and photoIndex

**Decision**: Pass `getFilteredPhotos()` and `getPhotoIndex()` getter functions instead of direct array references.

**Rationale**: app.js reassigns `filteredPhotos` (line 959: `filteredPhotos = []`) and rebuilds `photoIndex` (line 970: `buildPhotoIndex()`) whenever the timeline filter changes. If feed-controller.js receives the array directly at init time, it holds a reference to the original array that becomes stale after the first filter change. Getter functions solve this by always returning the current value from app.js's closure:

```javascript
// In app.js init call:
feedController.init({
    getFilteredPhotos: function () { return filteredPhotos; },
    getPhotoIndex: function () { return photoIndex; }
});
```

**Alternatives considered**:
- Wrap arrays in a container object `{ photos: [] }` and mutate the container — works but is fragile and non-obvious
- Use appState.onChange to subscribe to filteredPhotos changes — over-engineered for this use case; the getter is simpler and synchronous
- Reassign in-place with `filteredPhotos.length = 0; filteredPhotos.push(...newPhotos)` — invasive change to app.js core logic, high regression risk

## R3: Control Panel Boundary Analysis (app.js lines 682–917)

**Decision**: Extract `buildControlPanel()` (lines 682–896), `_updatePendingIndicator()` (lines 899–905), and `updatePhotoCount()` (lines 912–917) into `js/control-panel.js`.

**Rationale**: `buildControlPanel()` is a 215-line function that constructs the panel DOM and wires all event listeners. It depends on:
- `uniqueDates`, `timelineSegments`, `boundaryMarkers`, `allPhotos` — passed via init opts (read-only)
- `baseLayers`, `currentBaseLayer`, `map` — for layer switching (pass via init opts)
- `travelRouteLayer` — for route toggle (pass via init opts)
- `feedSidebar`, `feedToggle` — for auto-collapse on medium viewports (pass via init opts)
- `_cloudFavoritesLoaded` — set by auth handler, needs setter callback
- `rebuildPhotoLayer`, `buildPhotoIndex` — callbacks for post-auth-change operations
- `currentDensityCellSize`, `currentIconSize` — slider state (can be owned by control-panel.js internally, with callbacks for external effects)

`_updatePendingIndicator()` and `updatePhotoCount()` are small functions tightly coupled to the panel DOM and belong with it.

**Alternatives considered**:
- Extract only `buildControlPanel` and leave helpers in app.js — rejected, they're direct panel DOM manipulations
- Move timeline filter functions too — rejected, they directly mutate `filteredPhotos` and call `rebuildPhotoLayer()`, creating circular dependencies

## R4: Shared State — _cloudFavoritesLoaded

**Decision**: Keep `_cloudFavoritesLoaded` in app.js; control-panel.js receives `setCloudFavoritesLoaded(value)` as a callback.

**Rationale**: `_cloudFavoritesLoaded` is read by `isFavorite()` and `toggleFavorite()` in app.js (lines 179, 190). It is set by the auth-state-changed handler inside `buildControlPanel()` (lines 874, 880, 889). After extraction, the auth handler lives in control-panel.js but the consumers remain in app.js. A setter callback is the simplest pattern:

```javascript
controlPanel.init({
    setCloudFavoritesLoaded: function (val) { _cloudFavoritesLoaded = val; }
});
```

**Alternatives considered**:
- Move `_cloudFavoritesLoaded` into control-panel.js and expose a getter — rejected, isFavorite/toggleFavorite are in app.js and would need to call control-panel.js, creating tight coupling
- Use appState to store the flag — over-engineered for a boolean that only has two consumers
- Move favorites subsystem into its own module — valid future refactor but out of scope for this spec

## R5: Module Pattern — init(opts)

**Decision**: Both new modules expose a global namespace with an `init(opts)` function and public methods.

**Rationale**: This matches the project's existing convention. `initRegionNav(opts)` (region-nav.js) and `initLandingPage(opts)` (landing-page.js) both receive dependencies via an opts object during initialization. The new modules follow the same pattern:

```javascript
// feed-controller.js
window.feedController = { init: function (opts) { ... } };

// control-panel.js
window.controlPanel = { init: function (opts) { ... } };
```

Public methods are added to the namespace object during init, enabling post-init calls like `feedController.updateFeedForTimeline()` and `controlPanel.updatePhotoCount()`.

**Alternatives considered**:
- Constructor/class pattern — inconsistent with project conventions
- Event-only communication — insufficient for synchronous operations like `updatePhotoCount`

## R6: formatDateShort Consolidation

**Decision**: Move the app.js implementation (string-splitting, no Date object) into `dom-helpers.js` as `domHelpers.formatDateShort()`. Remove the region-nav.js duplicate.

**Rationale**: Two implementations exist:
- **app.js (line 354)**: `parts = isoDate.split('-')`, returns `months[parseInt(parts[1], 10) - 1] + ' ' + parseInt(parts[2], 10)` — pure string parsing, no Date object
- **region-nav.js (line 31)**: `d = new Date(dateStr + 'T12:00:00')`, returns `months[d.getMonth()] + ' ' + d.getDate()` — creates Date object

The app.js implementation is preferred: it's simpler, avoids Date constructor overhead, and is immune to timezone edge cases since it never interprets the date string as a point in time.

Both produce identical output for valid ISO date strings ("YYYY-MM-DD"). dom-helpers.js is the natural home since it already provides shared utility functions.

**Alternatives considered**:
- Keep both implementations — rejected, maintenance burden and subtle divergence risk
- Create a new utility file — rejected, dom-helpers.js already exists as the utility module

## R7: Script Load Order

**Decision**: Insert `feed-controller.js` and `control-panel.js` between `landing-page.js` and `app.js` in index.html.

**Rationale**: Current script order (index.html lines 90–108):
1. leaflet.js, Leaflet.Photo.js
2. dom-helpers.js
3. ViewportSampler.js, route-builder.js, app-state.js
4. photo-viewer.js, panel-manager.js, photo-wall.js
5. trip-model.js, region-nav.js
6. **landing-page.js** ← insert after this
7. **feed-controller.js** ← NEW
8. **control-panel.js** ← NEW
9. **app.js** ← calls feedController.init() and controlPanel.init()
10. Firebase modules (ES modules)

Both new modules must load before app.js (which calls their init functions) but after dom-helpers.js (which they consume for formatDateShort). Placing them after landing-page.js and before app.js satisfies both constraints.

**Alternatives considered**:
- Place before landing-page.js — works but doesn't follow the logical dependency order
- Use dynamic imports — incompatible with ES5-compatible IIFE project pattern

## R8: Density/Size Slider State Ownership

**Decision**: Move `currentDensityCellSize` and `currentIconSize` variables into control-panel.js. Provide `onDensityChange` and `onSizeChange` callbacks via init opts for app.js to react to changes.

**Rationale**: These variables are only read during slider input events (lines 1222–1238) and initial icon size setup (line 284). The slider event handlers currently live inline in the Promise.all callback but logically belong with the control panel that contains the sliders. After extraction:

```javascript
controlPanel.init({
    initialDensityCellSize: 150,
    initialIconSize: 90,
    onDensityChange: function (cellSize) { ViewportSampler.setCellSize(cellSize); },
    onSizeChange: function (iconSize) {
        ViewportSampler.updateIconSize(iconSize);
        if (filteredPhotos.length > 0) rebuildPhotoLayer();
    }
});
```

**Alternatives considered**:
- Keep slider state in app.js and pass as getters — overly complex for simple numeric values that only the panel reads/writes
- Use appState for slider values — over-engineered; the values have no consumers outside the panel + the two callbacks
