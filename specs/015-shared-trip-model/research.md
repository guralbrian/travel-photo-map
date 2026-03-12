# Research: Shared Trip Data Model

**Feature**: 015-shared-trip-model | **Date**: 2026-03-11

## Research Task 1: Exact Scope of Duplicated Region Logic

### Decision
The `REGION_SECTIONS` array and the region-building function are duplicated verbatim in two files and must be extracted into `trip-model.js`.

### Findings

**Duplication in REGION_SECTIONS array:**
- `landing-page.js` lines 11–21: defines `REGION_SECTIONS` (8 entries)
- `region-nav.js` lines 8–17: defines identical `REGION_SECTIONS` (8 entries)
- Both arrays contain the same labels, the same `jsonRegions` mapping arrays, the same ordering

**Duplication in region-building functions:**
- `landing-page.js` lines 80–129: `buildRegions(itineraryData)` — maps REGION_SECTIONS → enriched region objects with `center`, `startDate`, `endDate`, `days`, `summary`, `heroPhoto`
- `region-nav.js` lines 69–112: `buildRegionSections(itineraryData)` — >90% identical logic, but omits `summary` and `heroPhoto` from the return object

**Additional duplication:**
- `formatDateShort()` is duplicated in `app.js` (lines 407–413) and `region-nav.js` (lines 43–47). This is a display-formatting utility and is *not* part of the data model, so it is out of scope for this feature but noted for future cleanup.

### Rationale
Extract once, expose a unified `getRegions()` API that includes all fields (including `summary` and `heroPhoto`). Consumers that don't need those fields simply ignore them.

### Alternatives Considered
1. **Keep two arrays, add a shared constant file** — Rejected because the building logic is also duplicated, not just the array.
2. **Merge into landing-page.js and have region-nav.js import from it** — Rejected because this creates a dependency between two peer modules. A shared model is architecturally cleaner.

---

## Research Task 2: Photo-to-Segment Assignment Extraction

### Decision
Move `assignPhotosToTripSegments()` from `app.js` into `trip-model.js` with identical semantics.

### Findings

**Current implementation** (`app.js` lines 326–405):
- Sorts photos by datetime
- Parses segment boundaries into Date objects
- For each photo: tries `datetime` first, falls back to `date` (assumes noon), then `>= start && < end` matching
- Mutates each photo object in place: sets `cityIndex`, `cityName`, `cityColor`
- Returns a `clusters` array (array of segment objects with `photos`, `centroidLat`, `centroidLng`, etc.)

**Consumers of assignment results:**
- `app.js` line 1055: calls `assignPhotosToTripSegments(allPhotos, tripSegments)`, assigns return to `clusters`
- `app.js` lines 1057–1079: builds `dateIndex` from the mutated `allPhotos` (reads `cityName`, `cityColor`, `cityIndex`)
- Route builder: reads `cityColor` from photos
- Photo wall: reads segment metadata from photos for section headers
- Feed sidebar: reads `dateIndex` for date entries

**Key insight**: The `clusters` return value is assigned to a variable in `app.js` but is passed to `buildSmartRoutes()` — it IS used, not dead code. The shared model must continue returning clusters.

### Rationale
The function is self-contained with clear inputs (photos array, segments array) and outputs (clusters array + mutated photos). It can be moved wholesale into the shared model.

### Alternatives Considered
1. **Leave in app.js, just call from there** — Rejected because the spec requires the shared model to own photo assignment (FR-003, FR-009).
2. **Make it a pure function (no mutation)** — Rejected because downstream consumers (photo-wall, route-builder, feed sidebar) rely on the mutated photo objects. Changing the mutation contract is out of scope and risks regression.

---

## Research Task 3: Date Index Construction Extraction

### Decision
Move date index construction from `app.js` into `trip-model.js`, triggered automatically after photo assignment.

### Findings

**Current implementation** (`app.js` lines 1057–1079):
- Iterates all photos, groups by `date` field
- For each new date: creates entry with first photo's `cityName`/`cityColor`/`cityIndex` as segment metadata
- After grouping: sorts photos within each date by `datetime` ascending
- Result stored in module-scoped `dateIndex` variable

**Consumers:**
- Feed sidebar rendering (reads `dateIndex` to build date list)
- Passed to `initRegionNav()` and `initLandingPage()` as part of options

### Rationale
Date indexing depends on photo assignment results (it reads `cityName`, `cityColor`, `cityIndex` from mutated photos). Both should live together in the shared model for consistency.

### Alternatives Considered
1. **Keep in app.js** — Rejected because it's tightly coupled to photo assignment output and the spec requires centralized date indexing (FR-004).

---

## Research Task 4: Initialization Order and Script Loading

### Decision
Place `<script src="js/trip-model.js">` in `index.html` after `photo-wall.js` and before `region-nav.js`. The shared model defines the data layer; consumer modules read from it.

### Findings

**Current script order in index.html (lines 90–105):**
1. leaflet.js
2. Leaflet.Photo.js
3. ViewportSampler.js
4. route-builder.js
5. photo-viewer.js
6. panel-manager.js
7. photo-wall.js
8. region-nav.js
9. landing-page.js
10. app.js

**Initialization flow:**
- All IIFEs execute immediately on load but only define functions/globals
- `app.js` IIFE runs `Promise.all()` to fetch data, then calls `window.initRegionNav()` and `window.initLandingPage()`
- The shared model must be available before `app.js` calls its `init()` method

**Proposed order:**
1–7: unchanged
8. **trip-model.js** (NEW)
9. region-nav.js
10. landing-page.js
11. app.js

### Rationale
`trip-model.js` must load before all consumers but after Leaflet and utility modules. Placing it at position 8 (before region-nav.js) ensures it's available when any consumer initializes.

### Alternatives Considered
1. **Load via ES module `import`** — Rejected because all existing modules use IIFEs and `<script>` tags. Mixing module types adds complexity for no benefit.
2. **Load at the very top** — Unnecessary since the IIFE only defines the `window.TripModel` object. Position 8 is sufficient.

---

## Research Task 5: Shared Model API Design

### Decision
Expose `window.TripModel` with an `init()` method and read-only getter functions.

### Findings

**Data the model must manage:**
1. Region definitions (REGION_SECTIONS + derived data from itinerary)
2. Photo-to-segment assignment (clusters + mutated photos)
3. Date index (date-keyed photo groupings)

**Consumers and what they need:**

| Consumer | Needs |
|----------|-------|
| `landing-page.js` | Full region objects (label, center, dates, days, summary, heroPhoto, jsonRegions) |
| `region-nav.js` | Region objects (label, center, dates, days, jsonRegions) |
| `app.js` | Clusters from assignment, dateIndex, regions for downstream passing |
| `photo-wall.js` | Reads photo objects (already mutated with segment metadata) |
| `route-builder.js` | Reads photo objects and clusters |

**Proposed API:**

```javascript
window.TripModel = {
    init: function(itineraryData, photos, tripSegments) { ... },
    getRegions: function() { ... },         // Returns enriched region array
    getRegion: function(id) { ... },        // Lookup by stable ID
    getClusters: function() { ... },        // Returns clusters from assignment
    getDateIndex: function() { ... },       // Returns date-keyed photo groupings
    getPhotosForDateRange: function(start, end) { ... }  // Filter photos by date range
};
```

### Rationale
- `init()` is called once by `app.js` after data is fetched — keeps existing fetch logic in `app.js`
- Getter methods provide read-only access (returns copies or direct references to internal arrays)
- Stable region IDs derived from labels (e.g., `"uk"`, `"munich"`, `"berlin-hamburg"`) for programmatic lookup

### Alternatives Considered
1. **Have the model fetch its own data** — Rejected because `app.js` already orchestrates the `Promise.all()` fetch and passes data to multiple consumers. Duplicating fetch logic would violate the principle of this refactoring.
2. **Event-based reactive model** — Rejected as over-engineering for a static data model that's initialized once.
