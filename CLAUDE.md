# travel-photo-map Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-20

## Active Technologies
- Vanilla JavaScript (ES5-compatible), CSS3, HTML5 + Leaflet.js (existing), Firebase SDK v11.6.0 (existing, vendored) (004-trip-feed)
- Firestore `dailyNarratives/all` document (new); existing `manifest.json` and `trip_segments.json` for photo/segment data (004-trip-feed)
- Vanilla JavaScript (ES2020+), CSS3, HTML5 + None new (Leaflet.js existing, vendored) (005-photo-viewer)
- N/A — client-side only; reads from existing photo manifest and cloud data (005-photo-viewer)
- Vanilla JavaScript (ES2020+ modules), CSS3, HTML5 + Leaflet.js (existing, vendored); no new libraries (006-photo-wall)
- `manifest.json` + `trip_segments.json` (existing, read-only); no new data files (006-photo-wall)
- Vanilla JavaScript (ES2020+), CSS3, HTML5 + None (Leaflet.js existing, vendored; Pointer Events API) (005-photo-viewer)
- Vanilla JavaScript (ES2020+), CSS3, HTML5 + Leaflet.js (existing, vendored) — uses `L.latLng.distanceTo()`, `L.polyline`, `L.layerGroup`, `L.divIcon` (007-smart-route-lines)
- N/A — reads existing `data/manifest.json` and `data/trip_segments.json` at runtime; no new data persisted (007-smart-route-lines)

- Vanilla JavaScript (ES2020+ modules), Python 3.10+ + Leaflet.js (existing, vendored), Firebase JS SDK v11 (Auth + Firestore Lite, vendored), firebase-admin (Python) (002-cloud-photo-backend)

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

cd src [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] pytest [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] ruff check .

## Code Style

Vanilla JavaScript (ES2020+ modules), Python 3.10+: Follow standard conventions

## Recent Changes
- 007-smart-route-lines: Added Vanilla JavaScript (ES2020+), CSS3, HTML5 + Leaflet.js (existing, vendored) — uses `L.latLng.distanceTo()`, `L.polyline`, `L.layerGroup`, `L.divIcon`
- 006-photo-wall: Added Vanilla JavaScript (ES2020+ modules), CSS3, HTML5 + Leaflet.js (existing, vendored); no new libraries
- 005-photo-viewer: Added Vanilla JavaScript (ES2020+), CSS3, HTML5 + None (Leaflet.js existing, vendored; Pointer Events API)
- 005-photo-viewer: Added Vanilla JavaScript (ES2020+), CSS3, HTML5 + None new (Leaflet.js existing, vendored)


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
