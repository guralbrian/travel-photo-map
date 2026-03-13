# Research: Photo Marker Improvements

**Branch**: `022-photo-marker-improvements` | **Date**: 2026-03-13

## Root Cause Analysis — Marker Jitter

### Investigation

The map event wiring in `app.js` already uses `moveend` (not `move`):
```javascript
map.on('moveend', function () {
    ViewportSampler.update();
});
```

This is correct. The jitter occurs *after* pan, not during. On every `moveend`, `ViewportSampler.update()` nearly completely replaces all visible markers. Cause traced to `update()` in `ViewportSampler.js`:

```javascript
var pt = _map.latLngToContainerPoint(L.latLng(photo.lat, photo.lng));
var cellX = Math.floor(pt.x / _cellSize);
var cellY = Math.floor(pt.y / _cellSize);
```

`latLngToContainerPoint` returns **screen-space pixel coordinates** relative to the current viewport. These shift by exactly the pan distance with every map move. After a pan, a photo at (lat, lng) that was at pixel (320, 240) is now at (195, 240) — different cell assignment. This causes the diff algorithm to see almost every existing marker as "no longer needed" and almost every cluster representative as "new." The result: mass fade-out + fade-in on every `moveend`, producing the jitter.

### Decision

- **Decision**: Replace `latLngToContainerPoint` with `map.project(latlng, zoom)` for cell key calculation.
- **Rationale**: `map.project(latlng, zoom)` returns world-pixel coordinates at a given zoom level — a fixed value for any (lat, lng, zoom) triple, independent of the current pan position. Cell assignments become geo-stable across pans and only change when zoom changes.
- **Alternatives considered**:
  - *Debounce only*: Doesn't help — the mass replacement still occurs at `moveend`, just delayed.
  - *Suppress fade animations on update*: Hides the symptom but markers still flash (appear/disappear without transition).
  - *Full geo-clustering algorithm (k-means, DBSCAN)*: Overkill; would also break the simple priority-based representative selection. Rejected.
  - *Preserve all existing markers across pans, never remove*: Stale markers would linger. Rejected.

## Root Cause Analysis — Marker Size

### Current values

| TIER_CONFIG | frameSize | stemHeight |
|-------------|-----------|------------|
| Tier 0 (1 photo) | 70px | 0px |
| Tier 1 (2–5)     | 85px | 12px |
| Tier 2 (6–15)    | 100px | 14px |
| Tier 3 (16+)     | 115px | 16px |

CSS border: `3px solid white`. Default cellSize: `150`.

### Decision

- **Frame sizes**: Reduce ~25% across all tiers (52 / 64 / 76 / 88 px). Keeps proportional stepping while significantly reducing map footprint.
- **Border**: Reduce from 3px to 2px. Gives the photo thumbnail more visual space within the same frame.
- **Default cellSize**: Reduce from 150 to 100. A 150px cell at typical city zoom shows ~6–8 markers; 100px shows ~12–18, making intra-city distribution readable.
- **Stem triangles**: Scaled proportionally to new stemHeight values.
- **Rationale**: ~25% reduction is the minimum noticeable change that meaningfully reduces map occlusion without making thumbnails too small to recognize on mobile. Values chosen to keep tier-3 markers under ~90px (comfortable on 375px mobile screens).

## Files Changed

| File | Change |
|------|--------|
| `js/ViewportSampler.js` | Cell key: `latLngToContainerPoint` → `map.project`; TIER_CONFIG values; default `_cellSize` |
| `css/Leaflet.Photo.css` | `border: 3px` → `border: 2px`; stem triangle sizes reduced |
