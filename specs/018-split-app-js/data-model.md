# Data Model: Split app.js — Extract Feed Controller & Control Panel

**Feature Branch**: `018-split-app-js`
**Date**: 2026-03-12

## Overview

This feature introduces no new data entities or persistence. It refactors app.js by extracting two subsystems into standalone modules. The data model describes the **module interfaces** — init options and public method signatures for each new module.

## Feed Controller Module Interface

### `window.feedController`

Global namespace for the feed sidebar module. Exposed as an ES5-compatible IIFE.

#### `init(opts)` → `void`

Initializes the feed controller, wires DOM refs, sets up event listeners, and registers with panel coordinator.

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `opts.map` | `L.Map` | Yes | Leaflet map instance (for flyToBounds on entry click) |
| `opts.dateIndex` | `object` | Yes | Date index from TripModel: `{ "YYYY-MM-DD": { photos, segmentName, segmentColor } }` |
| `opts.getFilteredPhotos` | `function → Array` | Yes | Getter returning current filteredPhotos array (solves stale reference) |
| `opts.getPhotoIndex` | `function → object` | Yes | Getter returning current photoIndex lookup `{ "url|lat|lng": index }` |
| `opts.formatDateShort` | `function(string) → string` | Yes | Date formatting utility from domHelpers |

#### `buildFeed()` → `void`

Builds feed entry DOM nodes from dateIndex and appends to the feed entries container. Called by app.js during init.

#### `updateFeedForTimeline(minDate, maxDate)` → `void`

Shows/hides feed entries based on the timeline date range.

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `minDate` | `string` | Yes | Minimum visible date (ISO format "YYYY-MM-DD") |
| `maxDate` | `string` | Yes | Maximum visible date (ISO format "YYYY-MM-DD") |

#### `renderFeedNarratives()` → `void`

Renders narrative text from cloudData into feed narrative slots. Wires click-to-edit if authenticated as editor.

### Feed Controller Internal State

| Variable | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `feedSidebar` | `HTMLElement` | `#feed-sidebar` | Feed panel container |
| `feedToggle` | `HTMLElement` | `#feed-toggle` | Desktop toggle button |
| `feedClose` | `HTMLElement` | `#feed-close` | Close button |
| `feedEntries` | `HTMLElement` | `#feed-entries` | Entries container |
| `activeFeedDate` | `string\|null` | `null` | Currently highlighted date |
| `feedPanelSnap` | `PanelSnap` | — | Panel drag/snap instance |

---

## Control Panel Module Interface

### `window.controlPanel`

Global namespace for the control panel module. Exposed as an ES5-compatible IIFE.

#### `init(opts)` → `void`

Initializes the control panel, builds DOM, wires event listeners.

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `opts.map` | `L.Map` | Yes | Leaflet map instance (for layer switching) |
| `opts.baseLayers` | `object` | Yes | Map of layer name → L.TileLayer |
| `opts.currentBaseLayer` | `L.TileLayer` | Yes | Initially active base layer |
| `opts.travelRouteLayer` | `L.LayerGroup\|null` | Yes | Travel route layer (for toggle) |
| `opts.uniqueDates` | `string[]` | Yes | Sorted array of unique dates |
| `opts.timelineSegments` | `object[]` | Yes | Timeline segment data for track rendering |
| `opts.boundaryMarkers` | `object[]` | Yes | Week/month boundary markers |
| `opts.allPhotos` | `object[]` | Yes | Full photo array (for count display) |
| `opts.feedSidebar` | `HTMLElement` | Yes | Feed sidebar element (for auto-collapse) |
| `opts.feedToggle` | `HTMLElement` | Yes | Feed toggle button (for auto-collapse) |
| `opts.formatDateShort` | `function(string) → string` | Yes | Date formatting utility |
| `opts.setCloudFavoritesLoaded` | `function(boolean) → void` | Yes | Setter for _cloudFavoritesLoaded in app.js |
| `opts.rebuildPhotoLayer` | `function() → void` | Yes | Callback to rebuild photo layer |
| `opts.buildPhotoIndex` | `function() → void` | Yes | Callback to rebuild photo index |
| `opts.initialDensityCellSize` | `number` | No | Initial density cell size (default 150) |
| `opts.initialIconSize` | `number` | No | Initial icon size (default 90) |
| `opts.onDensityChange` | `function(number) → void` | Yes | Callback when density slider value changes |
| `opts.onSizeChange` | `function(number) → void` | Yes | Callback when size slider value changes |

#### `updatePhotoCount(count)` → `void`

Updates the photo count display in the timeline section.

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `count` | `number` | Yes | Number of photos in current filter range |

#### `updatePendingIndicator()` → `void`

Updates the pending-writes indicator visibility based on `cloudData.getPendingWritesCount()`.

### Control Panel Internal State

| Variable | Type | Default | Description |
| -------- | ---- | ------- | ----------- |
| `currentBaseLayer` | `L.TileLayer` | from opts | Currently active base layer |
| `currentDensityCellSize` | `number` | 150 | Density slider value |
| `currentIconSize` | `number` | 90 | Size slider value |

---

## dom-helpers.js Extension

### `domHelpers.formatDateShort(isoDate)` → `string`

Converts an ISO date string to short month+day format.

| Parameter | Type | Required | Description |
| --------- | ---- | -------- | ----------- |
| `isoDate` | `string` | Yes | ISO date string (e.g., "2024-03-15") |

**Returns**: Formatted string (e.g., "Mar 15"), or empty string if input is falsy, or the original string if fewer than 3 parts after splitting on "-".

---

## Dependency Flow

```text
app.js
  │
  ├──▶ feedController.init({
  │        map, dateIndex,
  │        getFilteredPhotos: () => filteredPhotos,
  │        getPhotoIndex: () => photoIndex
  │    })
  │
  ├──▶ controlPanel.init({
  │        map, baseLayers, currentBaseLayer, travelRouteLayer,
  │        uniqueDates, timelineSegments, boundaryMarkers, allPhotos,
  │        feedSidebar, feedToggle,
  │        setCloudFavoritesLoaded: (v) => { _cloudFavoritesLoaded = v; },
  │        rebuildPhotoLayer, buildPhotoIndex,
  │        onDensityChange: (cs) => ViewportSampler.setCellSize(cs),
  │        onSizeChange: (is) => { ViewportSampler.updateIconSize(is); ... }
  │    })
  │
  ├──▶ controlPanel.updatePhotoCount(count)     // from onTimelineVisualUpdate
  └──▶ feedController.updateFeedForTimeline(min, max)  // from applyTimelineFilter
```
