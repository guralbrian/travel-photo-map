# Data Model: Trip Region Navigation

**Feature**: 001-trip-region-nav | **Date**: 2026-03-06

## Entities

### TripItinerary (source: `data/itinerary.json`)

The static JSON file loaded at page startup.

| Field   | Type   | Description                        | Example                       |
|---------|--------|------------------------------------|-------------------------------|
| trip    | string | Trip name                          | "Europe 2026"                 |
| dates   | string | Overall date range (display only)  | "2026-01-26 to 2026-03-09"   |
| regions | array  | Ordered list of Region objects     | (see below)                   |

### Region (within itinerary JSON)

Each geographic stop on the trip.

| Field  | Type   | Description                     | Example               |
|--------|--------|---------------------------------|-----------------------|
| name   | string | Region identifier (unique key)  | "Copenhagen (Visit 1)"|
| lat    | number | Center latitude                 | 55.6761               |
| lng    | number | Center longitude                | 12.5683               |
| days   | array  | Ordered list of DayEntry objects| (see below)           |

### DayEntry (within Region)

A single calendar day in a region.

| Field | Type   | Description                     | Example                                     |
|-------|--------|---------------------------------|---------------------------------------------|
| date  | string | ISO date (YYYY-MM-DD)           | "2026-01-30"                                |
| notes | string | Free-text narrative (may be "") | "Fly to Copenhagen from LGW. Meet Luis..." |

### RegionSection (runtime, defined in `region-nav.js`)

Maps one or more JSON regions to a single user-facing section. Not persisted — derived at load time.

| Field       | Type     | Description                                            | Example                          |
|-------------|----------|--------------------------------------------------------|----------------------------------|
| label       | string   | Display name in the grid panel                         | "Berlin / Hamburg"               |
| jsonRegions | string[] | JSON region `name` values mapped to this section       | ["Berlin", "Hamburg"]            |
| center      | object   | Averaged {lat, lng} of constituent JSON regions        | {lat: 53.02, lng: 11.7}         |
| startDate   | string   | Earliest date across all days in constituent regions   | "2026-02-17"                     |
| endDate     | string   | Latest date across all days in constituent regions     | "2026-02-19"                     |
| days        | array    | Merged + date-sorted DayEntry objects from all regions | (combined Berlin + Hamburg days) |

## Relationships

```text
TripItinerary
  └── regions: Region[]  (1:N, ordered)
        └── days: DayEntry[]  (1:N, ordered by date)

RegionSection  (runtime derived)
  ├── maps to 1+ Region via jsonRegions[]
  ├── filters allPhotos[] via startDate/endDate match on photo.date
  ├── filters tripSegments[] via date overlap
  └── rebuilds route lines from filtered photos
```

## Integration with Existing Data

### Photo matching (FR-009)

A photo belongs to a region section if:
```
photo.date >= section.startDate AND photo.date <= section.endDate
```

Uses the existing `date` field (YYYY-MM-DD string) on each photo in `manifest.json`. String comparison works correctly for ISO date format.

### Segment matching (FR-010, route filtering)

A trip segment overlaps a region section if:
```
segment.start < section.endDate + 'T23:59:59' AND segment.end > section.startDate + 'T00:00:00'
```

Uses existing `start`/`end` ISO datetime strings in `trip_segments.json`.

## State Transitions

```text
                    ┌──────────────┐
                    │   Overview   │  (default)
                    │  No region   │
                    │   selected   │
                    └──────┬───────┘
                           │ user opens region grid
                           ▼
                    ┌──────────────┐
                    │  Grid Open   │
                    │ 2x4 panels   │
                    │   visible    │
                    └──────┬───────┘
                           │ user clicks a region panel
                           ▼
                    ┌──────────────┐
                    │Region Active │
                    │ Map zoomed   │  ← photos/routes filtered
                    │ Itinerary    │  ← grid hidden
                    │ panel shown  │  ← feed entries hidden
                    └──────┬───────┘
                           │ user clicks back button
                           ▼
                    ┌──────────────┐
                    │  Grid Open   │  ← photos/routes restored
                    └──────────────┘
                           │ user closes grid / closes sidebar
                           ▼
                    ┌──────────────┐
                    │   Overview   │
                    └──────────────┘
```
