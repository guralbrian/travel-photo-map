# Contract: route-builder.js Module API

**Feature Branch**: `007-smart-route-lines` | **Date**: 2026-03-02

## Overview

This is a client-side JavaScript module (`js/route-builder.js`) loaded via `<script>` tag. It exposes functions on the global scope (no ES modules, consistent with existing codebase pattern).

## Public API

### `buildSmartRoutes(photos, segments, map)`

Main entry point. Computes smart routes from photo geotags and returns a Leaflet layer group.

**Parameters**:

| Name | Type | Description |
|------|------|-------------|
| `photos` | `Array<Photo>` | Full photo manifest array (from `data/manifest.json`). Photos without valid `lat`/`lng` are filtered internally. |
| `segments` | `Array<TripSegment>` | Trip segments array (from `data/trip_segments.json`). Must have at least 2 entries. |
| `map` | `L.Map` | Leaflet map instance (needed for zoom-level arrow visibility). |

**Returns**: `L.LayerGroup` containing all route polylines (background + foreground) and arrow markers. Returns an empty `L.layerGroup()` if fewer than 2 segments.

**Behavior**:
1. Filters photos to those with valid coordinates
2. For each adjacent segment pair, extracts relevant transit photos
3. Clusters photos using chronological sweep (15 km / 4 hr defaults)
4. Simplifies waypoints via RDP
5. Builds dual-layer polylines (background + animated foreground) per route
6. Adds midpoint arrow markers with bearing-based rotation
7. Registers zoom handler to hide arrows below zoom level 4

**Side effects**: Adds a `zoomend` listener to `map` for arrow visibility.

## Input Types (for reference)

```
Photo {
  lat: number | null
  lng: number | null
  datetime: string    // ISO 8601
  date: string        // YYYY-MM-DD (fallback)
  cityIndex: number   // set by assignPhotosToTripSegments
  cityName: string
  cityColor: string
  ...                 // other fields ignored
}

TripSegment {
  name: string
  start: string       // ISO 8601
  end: string         // ISO 8601
  color: string       // hex color
  lat: number
  lng: number
}
```

## Visual Contract

Each intercity route renders identically to the current implementation:

| Layer | Weight | Opacity | Style | Color |
|-------|--------|---------|-------|-------|
| Background | 5px | 0.3 | Solid, round cap | Origin segment color |
| Foreground | 3px | 0.7 | Dashed (8,12), animated | Origin segment color |
| Arrow | 16x16 SVG | 0.85 | Rotated to bearing | Origin segment color |

The only difference: the `coords` array passed to `L.polyline` contains multiple waypoints instead of 2 points.

## Popup Contract

Background polylines display a popup on click: `"{from.name} → {to.name}"` (unchanged from current behavior).
