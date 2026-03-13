# Contract: Feed Controller API

**Module**: `js/feed-controller.js`
**Global**: `window.feedController`
**Pattern**: ES5-compatible IIFE, dependency injection via init(opts)

## Interface

### `feedController.init(opts)`

Initializes the feed controller module. Wires DOM references, sets up PanelSnap, registers with panel coordinator, and binds event listeners. Must be called once after DOM is ready and data is loaded.

**Parameters**:
- `opts` (object, required): Initialization options

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `opts.map` | `L.Map` | Yes | Leaflet map instance for `flyToBounds()` calls |
| `opts.dateIndex` | `object` | Yes | `{ "YYYY-MM-DD": { photos: [], segmentName, segmentColor } }` |
| `opts.getFilteredPhotos` | `function → Array` | Yes | Returns current filteredPhotos array |
| `opts.getPhotoIndex` | `function → object` | Yes | Returns current photoIndex `{ "url\|lat\|lng": index }` |
| `opts.formatDateShort` | `function(string) → string` | Yes | Converts ISO date to "Mon DD" format |

**Returns**: `void`

**Behavior**:
- Acquires DOM references: `#feed-sidebar`, `#feed-toggle`, `#feed-close`, `#feed-entries`
- Creates PanelSnap instance for feed sidebar
- Registers with `window.panelCoordinator` if available
- Wires toggle button click handlers
- Sets initial mobile state (hidden, collapsed)
- Binds `narratives-loaded` and `auth-state-changed` event listeners

---

### `feedController.buildFeed()`

Builds feed entry DOM nodes from the dateIndex and appends them to the entries container.

**Parameters**: None

**Returns**: `void`

**Behavior**:
- Iterates sorted dateIndex keys
- Creates one `.feed-entry` per date with header, narrative slot, and thumbnails
- Attaches click handlers inline (entry click, thumbnail click)
- Uses DocumentFragment for single-reflow insertion
- Replaces any existing content in the entries container

---

### `feedController.updateFeedForTimeline(minDate, maxDate)`

Shows or hides feed entries based on the active timeline date range.

**Parameters**:

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `minDate` | `string` | Yes | Minimum visible date (ISO "YYYY-MM-DD") |
| `maxDate` | `string` | Yes | Maximum visible date (ISO "YYYY-MM-DD") |

**Returns**: `void`

**Behavior**:
- Queries all `.feed-entry[data-date]` elements
- Sets `display: none` for entries outside the range, `display: ''` for entries within

---

### `feedController.renderFeedNarratives()`

Renders narrative text into feed narrative slots. Wires click-to-edit functionality for authenticated editors.

**Parameters**: None

**Returns**: `void`

**Behavior**:
- Queries all `.feed-narrative-slot` elements
- For each slot, reads narrative text from `window.cloudData.getDailyNarrative(date)`
- If narrative exists: inserts `<p class="feed-narrative">` with text node
- If editor and no narrative: inserts `<span class="feed-add-note">Add note...</span>`
- Calls `_wireNarrativeEditing()` to set up click handlers

## Usage Example

```javascript
// In app.js Promise.all callback:
window.feedController.init({
    map: map,
    dateIndex: dateIndex,
    getFilteredPhotos: function () { return filteredPhotos; },
    getPhotoIndex: function () { return photoIndex; },
    formatDateShort: domHelpers.formatDateShort
});
window.feedController.buildFeed();

// After timeline filter changes:
window.feedController.updateFeedForTimeline(minDate, maxDate);
```

## Consumers

1. `js/app.js` — calls `init()`, `buildFeed()`, `updateFeedForTimeline()`, `renderFeedNarratives()`

## Error Behavior

| Scenario | Behavior |
| -------- | -------- |
| `init()` called before DOM ready | DOM refs will be null; methods will no-op or error |
| `buildFeed()` called before `init()` | dateIndex is undefined; no entries rendered |
| `getFilteredPhotos()` returns empty array | Fallback photo lookup finds no match; no viewer opened |
| `dateIndex[date]` is undefined | Entry click handler returns early |
| `window.cloudData` is null | Narratives silently return empty strings |
