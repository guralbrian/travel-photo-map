# Data Model: Trip Landing Page

**Branch**: `010-trip-landing-page` | **Date**: 2026-03-06

## Entity: Region (extended)

**Source**: `data/itinerary.json` → `regions[]`

| Field       | Type     | Required | Description                                              |
| ----------- | -------- | -------- | -------------------------------------------------------- |
| name        | string   | yes      | Display name (e.g., "UK - London"). Existing field.      |
| lat         | number   | yes      | Center latitude. Existing field.                         |
| lng         | number   | yes      | Center longitude. Existing field.                        |
| days        | array    | yes      | Array of Day objects. Existing field.                    |
| summary     | string   | **new**  | Hand-authored 2-3 sentence description of the trip leg.  |
| heroPhoto   | string   | **new**  | URL to the hero image for the region card background.    |

**New field defaults**:
- `summary`: If missing, detail view shows the first day's notes as fallback.
- `heroPhoto`: If missing, card uses a solid color derived from the region's trip segment color.

## Entity: Day (unchanged)

**Source**: `data/itinerary.json` → `regions[].days[]`

| Field | Type   | Required | Description                              |
| ----- | ------ | -------- | ---------------------------------------- |
| date  | string | yes      | ISO date string (YYYY-MM-DD).            |
| notes | string | yes      | Activity/event notes for that day.       |

## Entity: Photo (unchanged, read-only)

**Source**: `data/manifest.json` → photos array

Used for the thumbnail grid in the detail view. Photos are filtered by matching `date` against the region's date range (first day to last day inclusive).

| Field     | Type   | Used by landing page | Description                    |
| --------- | ------ | -------------------- | ------------------------------ |
| thumbnail | string | yes                  | Thumbnail URL for grid display            |
| url       | string | yes                  | Full photo path (passed to photo viewer)  |
| web_url   | string | yes                  | High-res URL (hero fallback, viewer use)  |
| caption   | string | yes                  | Caption text (passed to photo viewer)     |
| tags      | array  | yes                  | Tag array (passed to photo viewer)        |
| date      | string | yes                  | For date-range filtering                  |
| lat       | number | **yes**              | Used for detail map photo clusters and region bounds computation |
| lng       | number | **yes**              | Used for detail map photo clusters and region bounds computation |
| type      | string | yes                  | 'photo' or 'video' — determines video badge on map markers      |

## Entity: Trip Summary (static)

Not stored in data — hardcoded in the landing page HTML/JS.

| Attribute  | Value        |
| ---------- | ------------ |
| days       | 42           |
| regions    | 8            |
| countries  | 5            |

## Relationships

```
Trip Summary (static, 1)
  └── Region (1:8)
        ├── Day (1:N per region)
        └── Photo (1:N, filtered by date range)
```

## Data Flow

1. `itinerary.json` loaded at app init (existing Promise.all fetch).
2. Landing page module reads `regions[]` to build cards (name, date range from days, summary, heroPhoto).
3. On card click, detail view reads region's days for the places/dates list.
4. Detail view filters `manifest.json` photos by date range for thumbnail grid.
5. On thumbnail click, the full region photo array (from step 4) is passed to `window.photoViewer.open(photos, clickedIndex, imgElement)`.
6. Detail map initializes during intro animation (hidden, tiles pre-cached).
7. On card open, detail map repositions to region center, ViewportSampler loads region photos with lat/lng for cluster display.
8. Detail map computes `L.latLngBounds` from region photos for bounds-overlap tracking (FR-009e escalation).
9. On photo cluster click, same flow as step 5 — `window.photoViewer.open(photos, clickedIndex)`.
