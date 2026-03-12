# Data Model: Shared Trip Data Model

**Feature**: 015-shared-trip-model | **Date**: 2026-03-11

## Entities

### RegionDefinition (static, hardcoded)

The canonical list of user-facing trip regions. Defined once in `trip-model.js`.

| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Stable machine-readable identifier derived from label (e.g., `"uk"`, `"munich"`, `"berlin-hamburg"`) |
| `label` | `string` | Display label (e.g., `"Berlin / Hamburg"`, `"Copenhagen Pt.\u00a01"`) |
| `jsonRegions` | `string[]` | Array of itinerary region `name` values that map to this user-facing region |

```javascript
// Example
{ id: 'uk', label: 'UK', jsonRegions: ['UK - London'] }
{ id: 'berlin-hamburg', label: 'Berlin / Hamburg', jsonRegions: ['Berlin', 'Hamburg'] }
```

### EnrichedRegion (derived from itinerary data)

Computed by `init()` from `RegionDefinition` + `itinerary.json`. One per region.

| Field | Type | Source | Description |
|-------|------|--------|-------------|
| `id` | `string` | RegionDefinition | Stable identifier |
| `label` | `string` | RegionDefinition | Display label |
| `jsonRegions` | `string[]` | RegionDefinition | Itinerary region name mapping |
| `center` | `{ lat: number, lng: number }` | Averaged from matched itinerary regions | Geographic center for map positioning |
| `startDate` | `string` | Min date from aggregated days | First date in region (ISO format `YYYY-MM-DD`) |
| `endDate` | `string` | Max date from aggregated days | Last date in region |
| `days` | `object[]` | Aggregated from matched itinerary regions | Sorted, deduplicated array of `{ date, notes }` objects |
| `summary` | `string` | First matched itinerary region's `summary` field | Region description text |
| `heroPhoto` | `string` | First matched itinerary region's `heroPhoto` field | Path to hero image |

**Derivation logic** (mirrors existing `buildRegions()` / `buildRegionSections()`):
1. Build a `regionMap` keyed by itinerary region `name`
2. For each `RegionDefinition`, aggregate `days` from all matching itinerary regions
3. Deduplicate days by `date` field
4. Sort days chronologically
5. Average `lat`/`lng` across matched itinerary regions for `center`
6. Take `summary` and `heroPhoto` from the first matched itinerary region

### TripSegment (input, from trip_segments.json)

Unchanged from current format. Used as input to photo assignment.

| Field | Type | Description |
|-------|------|-------------|
| `name` | `string` | Segment display name (e.g., `"London"`) |
| `start` | `string` | ISO datetime boundary start (e.g., `"2026-01-27T00:00:00"`) |
| `end` | `string` | ISO datetime boundary end |
| `color` | `string` | Hex color for route/segment display |
| `lat` | `number` | Segment center latitude |
| `lng` | `number` | Segment center longitude |

### Photo (enriched, mutated in place)

Existing photo objects from `manifest.json` are augmented during assignment. These fields are **added** to each photo object by the assignment function:

| Field | Type | Description |
|-------|------|-------------|
| `cityIndex` | `number` | Index of the matched trip segment (or `-1` if unmatched) |
| `cityName` | `string` | Name of the matched trip segment (or `''` if unmatched) |
| `cityColor` | `string` | Color of the matched trip segment (or `'#999'` if unmatched) |

**Assignment semantics** (unchanged from current `assignPhotosToTripSegments()`):
- Try `photo.datetime` first; fall back to `photo.date` with noon assumed
- Match: `photoTime >= segment.start && photoTime < segment.end`
- First matching segment wins (segments are non-overlapping by convention)

### Cluster (output of assignment)

One cluster per trip segment, containing matched photos and computed centroid.

| Field | Type | Description |
|-------|------|-------------|
| `photos` | `object[]` | Array of photo objects assigned to this segment |
| `centroidLat` | `number` | Average latitude of assigned photos (or segment lat if no photos) |
| `centroidLng` | `number` | Average longitude of assigned photos (or segment lng if no photos) |
| `cityName` | `string` | Segment name |
| `color` | `string` | Segment color |
| `startDate` | `string` | Earliest photo date in this cluster |
| `endDate` | `string` | Latest photo date in this cluster |

### DateIndexEntry (derived from assigned photos)

Date-keyed grouping of photos sharing the same calendar date.

| Field | Type | Description |
|-------|------|-------------|
| `photos` | `object[]` | Photos for this date, sorted by `datetime` ascending |
| `segmentName` | `string` | `cityName` of the first photo in this date group |
| `segmentColor` | `string` | `cityColor` of the first photo in this date group |
| `segmentIndex` | `number` | `cityIndex` of the first photo in this date group |

```javascript
// Example dateIndex structure
{
    "2026-01-29": {
        photos: [/* photo objects */],
        segmentName: "London",
        segmentColor: "#E53935",
        segmentIndex: 0
    },
    "2026-01-30": { ... }
}
```

## State Transitions

The shared model has a simple two-state lifecycle:

```
[Uninitialized] --init()--> [Initialized]
```

- **Uninitialized**: All getters return empty arrays/objects. No errors thrown.
- **Initialized**: All getters return populated data. `init()` can be called again to reinitialize (idempotent).

There is no destroy, reset, or partial initialization state. The model is initialized once during `app.js` startup and remains in the initialized state for the lifetime of the page.

## Relationships

```
RegionDefinition (8, static)
    │
    ├──[enriched with]── itinerary.json ──→ EnrichedRegion (8)
    │
TripSegment (8, from trip_segments.json)
    │
    ├──[assigns]── Photo[] (from manifest.json) ──→ Photo (enriched, mutated)
    │                                                   │
    ├──[groups into]──→ Cluster[] (8, one per segment)  │
    │                                                   │
    └──[indexed by date]──→ DateIndexEntry{} ───────────┘
```
