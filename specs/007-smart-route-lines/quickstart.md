# Quickstart: Smart Route Lines

**Feature Branch**: `007-smart-route-lines` | **Date**: 2026-03-02

## What This Feature Does

Replaces the straight city-to-city route lines on the travel map with geographically accurate routes that follow the actual travel path based on photo GPS coordinates. For example, the Copenhagen → Heidelberg route now curves through Hamburg where train photos were taken, instead of drawing a misleading direct line.

## Architecture

```
data/manifest.json ──┐
                     ├──▶ route-builder.js ──▶ L.layerGroup (polylines + arrows)
data/trip_segments.json─┘         │
                                  ├── chronoCluster()  → PhotoCluster[]
                                  ├── rdpSimplify()    → simplified waypoints
                                  └── buildRoutes()    → L.polyline per segment pair
```

**Single new file**: `js/route-builder.js` — self-contained module, no dependencies beyond Leaflet.

## Key Functions

| Function | Purpose |
|----------|---------|
| `buildSmartRoutes(photos, segments, map)` | Main entry point. Returns `L.layerGroup` ready to add to map. |
| `getTransitPhotos(photos, segments)` | Extracts photos relevant to each intercity route (transit + far-from-city). |
| `chronoCluster(photos, radiusKm, timeGapHrs)` | Merges nearby sequential photos into clusters. Returns ordered centroids. |
| `rdpSimplify(waypoints, epsilon)` | Ramer-Douglas-Peucker line simplification. Reduces waypoint count. |
| `calcBearing(lat1, lng1, lat2, lng2)` | Moved from index.html. Compass bearing for arrow orientation. |

## Integration Point

In `index.html`, the existing route building block (~lines 862-907) is replaced with:

```javascript
// Old: inline polyline construction between city centers
// New: smart route calculation using photo geotags
travelRouteLayer = buildSmartRoutes(allPhotos, tripSegments, map);
travelRouteLayer.addTo(map);
```

Everything else (toggle handler, arrow zoom handler, CSS) remains unchanged.

## Testing

1. Open the map and verify routes curve through intermediate locations
2. Toggle "Travel Route" checkbox — routes should appear/disappear
3. Zoom in/out — arrows should hide below zoom level 4
4. Compare Copenhagen → Heidelberg route — should pass near Hamburg
5. Check that routes with no transit photos still show direct lines (fallback)

## Tuning

| Parameter | Default | Location | Effect |
|-----------|---------|----------|--------|
| Cluster radius | 15 km | route-builder.js | Larger = fewer waypoints, less detail |
| Time gap | 4 hours | route-builder.js | Larger = fewer separate stops |
| RDP epsilon | 0.01 degrees (~1 km) | route-builder.js | Larger = smoother but less accurate |
| Max waypoints | 15 | route-builder.js | Hard cap per route for readability |
