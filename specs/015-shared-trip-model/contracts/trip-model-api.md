# API Contract: window.TripModel

**Feature**: 015-shared-trip-model | **Date**: 2026-03-11

## Module Pattern

```javascript
// js/trip-model.js — IIFE exposing window.TripModel
(function () {
    'use strict';

    // Private state
    var _regions = [];
    var _regionMap = {};  // id → region
    var _clusters = [];
    var _dateIndex = {};
    var _initialized = false;

    window.TripModel = {
        init:                 init,
        getRegions:           getRegions,
        getRegion:            getRegion,
        getClusters:          getClusters,
        getDateIndex:         getDateIndex,
        getPhotosForDateRange: getPhotosForDateRange
    };

    // ... implementation
})();
```

## Method Contracts

### `init(itineraryData, photos, tripSegments)`

**Purpose**: Initialize the shared model with fetched data.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `itineraryData` | `object \| null` | Yes | Parsed `itinerary.json`. If `null`, regions will use only static definitions (no enriched data). |
| `photos` | `object[]` | Yes | Array of photo objects from `manifest.json`. |
| `tripSegments` | `object[]` | Yes | Array of segment objects from `trip_segments.json`. |

**Returns**: `void`

**Side effects**:
- Mutates each object in `photos` array: adds `cityIndex` (number), `cityName` (string), `cityColor` (string)
- Populates internal state for all getters

**Error handling**: Does not throw. If `itineraryData` is `null`, regions have no derived data (empty `days`, no `center`). If `photos` is empty, clusters and dateIndex are empty.

**Idempotent**: Can be called multiple times; each call resets internal state.

---

### `getRegions()`

**Returns**: `EnrichedRegion[]` — Array of 8 region objects, ordered by trip chronology.

```javascript
// Return type
[{
    id: 'uk',                           // string — stable identifier
    label: 'UK',                        // string — display label
    jsonRegions: ['UK - London'],       // string[] — itinerary region names
    center: { lat: 51.5074, lng: -0.1278 }, // object — averaged coordinates
    startDate: '2026-01-26',            // string — ISO date
    endDate: '2026-01-30',             // string — ISO date
    days: [{ date: '2026-01-26', notes: '...' }, ...], // object[] — sorted, deduplicated
    summary: '...',                     // string — region description
    heroPhoto: 'hero/uk.jpg'           // string — path to hero image
}]
```

**Pre-init**: Returns `[]`

---

### `getRegion(id)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | `string` | Yes | Stable region identifier (e.g., `"uk"`, `"munich"`, `"berlin-hamburg"`) |

**Returns**: `EnrichedRegion | undefined`

**Pre-init**: Returns `undefined`

**Region ID mapping**:

| ID | Label |
|----|-------|
| `uk` | UK |
| `copenhagen-pt-1` | Copenhagen Pt. 1 |
| `baden-wurttemberg` | Baden-Württemberg |
| `munich` | Munich |
| `prague` | Prague |
| `dresden-meissen` | Dresden / Meißen |
| `berlin-hamburg` | Berlin / Hamburg |
| `copenhagen-pt-2` | Copenhagen Pt. 2 |

---

### `getClusters()`

**Returns**: `Cluster[]` — Array of segment clusters with assigned photos.

```javascript
// Return type
[{
    photos: [/* photo objects */],       // object[] — photos in this segment
    centroidLat: 51.5074,               // number
    centroidLng: -0.1278,               // number
    cityName: 'London',                 // string
    color: '#E53935',                   // string — hex color
    startDate: '2026-01-27',            // string — earliest photo date
    endDate: '2026-01-30'              // string — latest photo date
}]
```

**Pre-init**: Returns `[]`

---

### `getDateIndex()`

**Returns**: `object` — Date-keyed object where each key is an ISO date string.

```javascript
// Return type
{
    '2026-01-29': {
        photos: [/* photo objects, sorted by datetime asc */],
        segmentName: 'London',          // string
        segmentColor: '#E53935',        // string
        segmentIndex: 0                 // number
    }
}
```

**Pre-init**: Returns `{}`

---

### `getPhotosForDateRange(startDate, endDate)`

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDate` | `string` | Yes | ISO date string (inclusive), e.g., `"2026-01-27"` |
| `endDate` | `string` | Yes | ISO date string (inclusive), e.g., `"2026-01-30"` |

**Returns**: `object[]` — Flat array of photos whose `date` field falls within `[startDate, endDate]`.

**Pre-init**: Returns `[]`

## Backward Compatibility

The shared model preserves exact behavioral parity with the code it replaces:

| Original Code | Replacement | Behavior Change |
|---------------|-------------|-----------------|
| `landing-page.js` `REGION_SECTIONS` | `TripModel.getRegions()` | None — same data, adds `id` field |
| `landing-page.js` `buildRegions()` | `TripModel.init()` + `TripModel.getRegions()` | None — same derivation logic |
| `region-nav.js` `REGION_SECTIONS` | `TripModel.getRegions()` | None — same data, adds `id`/`summary`/`heroPhoto` (ignored by region-nav) |
| `region-nav.js` `buildRegionSections()` | `TripModel.init()` + `TripModel.getRegions()` | None — same derivation logic |
| `app.js` `assignPhotosToTripSegments()` | `TripModel.init()` + `TripModel.getClusters()` | None — same mutation, same return structure |
| `app.js` dateIndex construction | `TripModel.getDateIndex()` | None — same grouping, same sorting |
