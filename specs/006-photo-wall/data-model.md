# Data Model: Photo Wall Album View

**Branch**: `006-photo-wall` | **Date**: 2026-03-02

---

## Overview

The photo wall feature introduces **no new persistent data storage**. All data is derived from existing sources (`manifest.json`, `trip_segments.json`) at runtime. The entities below are runtime/in-memory structures maintained within `photo-wall.js`.

---

## Existing Data Sources (read-only)

### PhotoEntry (from `manifest.json`)

Each element in the `manifest.json` array:

| Field | Type | Notes |
|-------|------|-------|
| `lat` | number | GPS latitude |
| `lng` | number | GPS longitude |
| `url` | string | Local photo path (not used in wall — privacy) |
| `thumbnail` | string | Firebase Storage URL for thumbnail |
| `web_url` | string | Full-resolution display URL |
| `caption` | string | User-authored caption (may be empty) |
| `date` | string | `YYYY-MM-DD` format |
| `datetime` | string | ISO 8601 full timestamp |
| `tags` | string[] | User-applied tags |
| `type` | `"photo" \| "video"` | Media type |
| `google_photos_url` | string | External link (not used in wall) |

**Validation rules**:
- `date` must be present and parseable as YYYY-MM-DD; photos without a valid date are excluded from the wall
- `thumbnail` must be a non-empty string; photos with missing thumbnails show a placeholder
- `type` defaults to `"photo"` if absent

---

### TripSegment (from `trip_segments.json`)

Each element in the segments array:

| Field | Type | Notes |
|-------|------|-------|
| `name` | string | City/location name |
| `start` | string | ISO 8601 start datetime |
| `end` | string | ISO 8601 end datetime |
| `color` | string | Hex color for UI accents |
| `lat` | number | Segment center latitude |
| `lng` | number | Segment center longitude |

---

## Runtime Entities (in-memory, computed at page load)

### DateSection

A grouping of photos that share the same calendar date, used to build the photo wall grid.

| Field | Type | Computed From |
|-------|------|---------------|
| `date` | string | `PhotoEntry.date` |
| `label` | string | Formatted as "Mon DD · CityName" (e.g., "Tue Jan 28 · London") |
| `cityName` | string | Resolved from `TripSegment` whose `start`–`end` range contains `date` |
| `cityColor` | string | `TripSegment.color` for the matching segment |
| `photos` | `PhotoEntry[]` | All photos with this `date`, sorted by `datetime` ascending |
| `gridRows` | `GridRow[]` | Computed justified layout rows for this section |
| `yOffset` | number | Cumulative vertical offset (px) from panel content top |
| `totalHeight` | number | Sum of all `GridRow.height` values plus section header height |

**State transitions**: DateSection objects are immutable once computed from the manifest. Only `yOffset` and `totalHeight` may change if the panel width changes (window resize).

---

### GridRow

A single horizontal row in the justified photo grid.

| Field | Type | Notes |
|-------|------|-------|
| `photos` | `PhotoEntry[]` | Photos in this row (2–6 photos typically) |
| `height` | number | Computed row height in px (target: 140–200px) |
| `widths` | `number[]` | Computed width for each photo in the row (px) |
| `yOffset` | number | Vertical position within its `DateSection` |

**Computation**: Given target row height `H` and photos with aspect ratios `[a1, a2, …, aN]`:
- `totalNaturalWidth = sum(ai * H)`
- `scaleFactor = panelInnerWidth / totalNaturalWidth`
- `finalHeight = H * scaleFactor`
- `width[i] = ai * finalHeight`

**Aspect ratio fallback**: If a photo's thumbnail dimensions are unknown, use `4/3` as the default aspect ratio.

---

### PanelState

The current state of the photo wall panel. Maintained as a single object in `PhotoWall`.

| Field | Type | Values | Notes |
|-------|------|--------|-------|
| `snapState` | string | `"collapsed" \| "half" \| "full"` | Current snap point |
| `isExpanding` | boolean | — | True during snap animation |
| `scrollTop` | number | — | Current scroll position within the grid |
| `targetPhotoId` | string \| null | — | Photo ID targeted from map click; null when not targeting |
| `panelHeight` | number | — | Current rendered height in px |
| `innerWidth` | number | — | Width of grid content area (panel width - scrubber width) |

---

### LayoutCache

Pre-computed positions for all photos in the grid. Rebuilt when panel width changes.

| Field | Type | Notes |
|-------|------|-------|
| `sections` | `DateSection[]` | All date sections with computed positions |
| `totalHeight` | number | Sum of all section heights (used for spacer div) |
| `dateToSectionIndex` | `Map<string, number>` | Fast lookup: date string → section index |
| `photoToPosition` | `Map<string, GridItemPosition>` | Fast lookup: photo URL → `{sectionIndex, rowIndex, photoIndex, top, left, width, height}` |
| `panelWidth` | number | The width this layout was computed for (used to detect stale cache) |

---

### GridItemPosition

The absolute pixel position of a single photo within the grid content area.

| Field | Type | Notes |
|-------|------|-------|
| `top` | number | px from grid content top |
| `left` | number | px from grid content left |
| `width` | number | px |
| `height` | number | px |
| `sectionDate` | string | Parent section's date |

---

## State Transitions

```
App load
  → fetch manifest.json + trip_segments.json
  → build DateSection[] (sorted by date asc)
  → compute LayoutCache at initial panel width
  → render collapsed panel (preview strip visible)

Map photo clicked
  → dispatch 'photo-wall:target' event with { photo }
  → PhotoWall receives event
  → if panel is collapsed → expand to "half" snap state
  → scroll grid to photo's DateSection
  → highlight photo in grid (2s animation)
  → PanelState.targetPhotoId = photo.url

Trip feed entry clicked
  → dispatch 'photo-wall:target-date' event with { date }
  → PhotoWall scrolls to that DateSection
  → (map pan happens via existing trip feed code)

Panel drag gesture
  → PanelState.snapState transitions: collapsed ↔ half ↔ full
  → LayoutCache unchanged (width does not change during vertical resize)

Window resize (width change)
  → LayoutCache invalidated and recomputed at new width
  → Virtual scroll viewport refreshed

Photo grid item clicked
  → dispatch existing 'photo-wall:open-viewer' event with { photos: currentSectionPhotos, index }
  → index.html opens PhotoViewer (existing)
  → map pans to photo's location
```

---

## Entity Relationships

```
trip_segments.json
  └── TripSegment[]
        └── provides cityName + cityColor to DateSection

manifest.json
  └── PhotoEntry[]
        └── grouped into DateSection[] by date
              └── laid out as GridRow[] (LayoutCache)
                    └── each photo → GridItemPosition
```

No new Firestore collections, no new files in `data/`. The photo wall is purely a presentational layer on top of existing data.
