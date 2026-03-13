# Contract: Control Panel API

**Module**: `js/control-panel.js`
**Global**: `window.controlPanel`
**Pattern**: ES5-compatible IIFE, dependency injection via init(opts)

## Interface

### `controlPanel.init(opts)`

Initializes the control panel module. Builds the panel DOM, wires event listeners for layers, sliders, and auth. Must be called once after DOM is ready and data is loaded.

**Parameters**:
- `opts` (object, required): Initialization options

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `opts.map` | `L.Map` | Yes | Leaflet map instance for layer management |
| `opts.baseLayers` | `object` | Yes | `{ "Layer Name": L.TileLayer }` map |
| `opts.currentBaseLayer` | `L.TileLayer` | Yes | Initially active base layer |
| `opts.travelRouteLayer` | `L.LayerGroup\|null` | Yes | Travel route layer for toggle |
| `opts.uniqueDates` | `string[]` | Yes | Sorted unique date strings |
| `opts.timelineSegments` | `object[]` | Yes | Array of `{ startIdx, count, color, cityName }` |
| `opts.boundaryMarkers` | `object[]` | Yes | Array of `{ index, type, label }` |
| `opts.allPhotos` | `object[]` | Yes | Full photo array for count display |
| `opts.feedSidebar` | `HTMLElement` | Yes | Feed sidebar element for auto-collapse |
| `opts.feedToggle` | `HTMLElement` | Yes | Feed toggle button for auto-collapse |
| `opts.formatDateShort` | `function(string) → string` | Yes | Date formatting utility |
| `opts.setCloudFavoritesLoaded` | `function(boolean) → void` | Yes | Setter for _cloudFavoritesLoaded flag |
| `opts.rebuildPhotoLayer` | `function() → void` | Yes | Rebuild photo layer after auth changes |
| `opts.buildPhotoIndex` | `function() → void` | Yes | Rebuild photo index after auth changes |
| `opts.initialDensityCellSize` | `number` | No | Initial density cell size (default: 150) |
| `opts.initialIconSize` | `number` | No | Initial icon size in pixels (default: 90) |
| `opts.onDensityChange` | `function(number) → void` | Yes | Called with new cell size when density slider changes |
| `opts.onSizeChange` | `function(number) → void` | Yes | Called with new icon size when size slider changes |

**Returns**: `void`

**Behavior**:
- Generates timeline segments HTML and boundary markers HTML
- Generates base layer radio buttons HTML
- Creates panel toggle button and panel container
- Appends to `document.body`
- Prevents map interaction behind panel (`L.DomEvent.disableClickPropagation/ScrollPropagation`)
- Wires toggle open/close, base layer switching, travel route toggle
- Wires mobile segment tooltip touch handlers
- Wires auth UI (sign-in, sign-out, auth-state-changed)
- Wires density and size slider input handlers with debounce
- Wires `firebase-ready` event listener
- Wires `auth-state-changed` event listener (updates user info, loads cloud favorites)

---

### `controlPanel.updatePhotoCount(count)`

Updates the photo count display in the timeline section.

**Parameters**:

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `count` | `number` | Yes | Number of photos in current filter range |

**Returns**: `void`

**Behavior**:
- Finds `.timeline-photo-count` element
- Sets innerHTML to `<span class="photo-count-number">COUNT</span> / TOTAL photos`

---

### `controlPanel.updatePendingIndicator()`

Updates the pending-writes indicator visibility.

**Parameters**: None

**Returns**: `void`

**Behavior**:
- Finds `#pending-writes-indicator` element
- Reads count from `window.cloudData.getPendingWritesCount()`
- Shows element if count > 0, hides otherwise
- Updates title attribute with count

## Usage Example

```javascript
// In app.js Promise.all callback:
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

// From onTimelineVisualUpdate:
controlPanel.updatePhotoCount(count);

// From pending-writes-changed listener:
controlPanel.updatePendingIndicator();
```

## Consumers

1. `js/app.js` — calls `init()`, `updatePhotoCount()`, `updatePendingIndicator()`

## Error Behavior

| Scenario | Behavior |
| -------- | -------- |
| `init()` called before DOM ready | Panel appended to incomplete body; may cause layout issues |
| `updatePhotoCount()` called before `init()` | `.timeline-photo-count` not found; no-op |
| `window.firebaseAuth` is undefined | Auth section hidden until firebase-ready event; sign-in/out buttons no-op |
| `window.cloudData` is null | Pending indicator stays hidden; favorites load skipped |
| `opts.travelRouteLayer` is null | Travel route toggle adds/removes null; no error (guarded by if check) |
