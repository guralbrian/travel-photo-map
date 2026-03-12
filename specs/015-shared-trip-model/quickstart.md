# Quickstart: Shared Trip Data Model

**Feature**: 015-shared-trip-model | **Date**: 2026-03-11

## Overview

`js/trip-model.js` is a shared IIFE module that provides the single canonical source for trip region definitions, photo-to-segment assignment, and date indexing. It replaces duplicated logic in `landing-page.js`, `region-nav.js`, and `app.js`.

## Script Loading

Add to `index.html` **before** `region-nav.js`:

```html
<script src="js/trip-model.js"></script>    <!-- Shared trip data model -->
<script src="js/region-nav.js"></script>
<script src="js/landing-page.js"></script>
<script src="js/app.js"></script>
```

## Initialization

Called once by `app.js` after fetching data:

```javascript
// In app.js, after Promise.all resolves with data
var model = window.TripModel;
model.init(itineraryData, allPhotos, tripSegments);

// Now all getters are populated
var regions = model.getRegions();
var clusters = model.getClusters();
var dateIndex = model.getDateIndex();
```

## API Reference

### `TripModel.init(itineraryData, photos, tripSegments)`

Initializes the model. Must be called before any getters return data.

- `itineraryData` — parsed `itinerary.json` object (or `null` for graceful degradation)
- `photos` — array of photo objects from `manifest.json`
- `tripSegments` — array of segment objects from `trip_segments.json`

**Side effects**: Mutates each photo object in `photos` to add `cityIndex`, `cityName`, `cityColor` (same behavior as the previous `assignPhotosToTripSegments()`).

### `TripModel.getRegions()`

Returns the array of 8 enriched region objects. Each has: `id`, `label`, `jsonRegions`, `center`, `startDate`, `endDate`, `days`, `summary`, `heroPhoto`.

### `TripModel.getRegion(id)`

Returns a single region by its stable `id` (e.g., `"uk"`, `"munich"`), or `undefined` if not found.

### `TripModel.getClusters()`

Returns the clusters array from photo-to-segment assignment. Same structure as the previous `assignPhotosToTripSegments()` return value.

### `TripModel.getDateIndex()`

Returns the date-keyed object grouping photos by calendar date. Same structure as the previous inline `dateIndex` construction in `app.js`.

### `TripModel.getPhotosForDateRange(startDate, endDate)`

Returns photos whose `date` falls within `[startDate, endDate]` (inclusive, string comparison on `YYYY-MM-DD` format).

## Consumer Integration Patterns

### landing-page.js (before → after)

```javascript
// BEFORE: own region array + own build function
var REGION_SECTIONS = [ /* 8 entries */ ];
function buildRegions(itineraryData) { /* ... */ }
var regions = buildRegions(itineraryData);

// AFTER: read from shared model
var regions = window.TripModel.getRegions();
```

### region-nav.js (before → after)

```javascript
// BEFORE: own region array + own build function
var REGION_SECTIONS = [ /* 8 entries */ ];
function buildRegionSections(itineraryData) { /* ... */ }
var sections = buildRegionSections(itineraryData);

// AFTER: read from shared model
var sections = window.TripModel.getRegions();
```

### app.js (before → after)

```javascript
// BEFORE: own assignment function + inline date index
var clusters = assignPhotosToTripSegments(allPhotos, tripSegments);
dateIndex = {};
for (var di = 0; di < allPhotos.length; di++) { /* ... */ }

// AFTER: delegate to shared model
window.TripModel.init(itineraryData, allPhotos, tripSegments);
var clusters = window.TripModel.getClusters();
dateIndex = window.TripModel.getDateIndex();
```

## Pre-init Safety

All getters return empty results before `init()` is called:
- `getRegions()` → `[]`
- `getRegion(id)` → `undefined`
- `getClusters()` → `[]`
- `getDateIndex()` → `{}`
- `getPhotosForDateRange()` → `[]`

This ensures no errors if a consumer accidentally accesses the model before initialization.
