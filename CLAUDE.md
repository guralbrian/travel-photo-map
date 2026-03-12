# travel-photo-map Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-02-20

## Project Overview

This is a travel photo map app built with HTML/CSS/JavaScript and Leaflet.js. Photos are sourced from Google Drive. The app uses static hosting via GitHub Pages.

## Git Workflow

- Always use feature branch → PR → merge workflow. Never commit directly to main. When pushing changes, create a PR using `gh` CLI (`gh pr create --fill && gh pr merge --merge`).
- The `gh` CLI is installed and available. Always use it for PR creation and merging. Do not fall back to manual URLs.
- When the user says 'commit and push' or 'deploy', they mean: stage all changes, commit with a descriptive message, push the branch, create a PR via gh CLI, and merge it. Do NOT start a local server unless explicitly asked.
- Always check which branch you're on before any git operations. Run `git branch --show-current` first.

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
- Vanilla JavaScript (ES2020+), CSS3, HTML5 + Leaflet.js (existing, vendored) — no new dependencies (008-ui-ux-polish)
- N/A — pure visual changes, no data changes (008-ui-ux-polish)
- N/A — pure visual changes, no data persistence (009-ux-ui-audit)
- Vanilla JavaScript (ES2020+), CSS3, HTML5 + Leaflet.js (vendored), no new dependencies (009-ux-ui-audit)
- Vanilla JavaScript (ES2020+), CSS3, HTML5 + Leaflet.js (vendored in `js/`), no new libraries (009-ux-ui-audit)
- N/A — reads `data/manifest.json` + `data/trip_segments.json` at runtime (009-ux-ui-audit)
- Vanilla JavaScript (ES2020+), CSS3, HTML5 + Leaflet.js (vendored in `js/`), existing modules: photo-wall.js, photo-viewer.js, route-builder.js, ViewportSampler.js, Leaflet.Photo.js (001-trip-region-nav)
- Static JSON — new `data/itinerary.json`, existing `data/manifest.json` + `data/trip_segments.json` (001-trip-region-nav)
- Vanilla JavaScript (ES2020+), CSS3, HTML5 + Leaflet.js (existing, vendored in `js/`) (010-trip-landing-page)
- Static JSON — extends existing `data/itinerary.json` with `summary` and `heroPhoto` fields per region; reads existing `data/manifest.json` for photos (010-trip-landing-page)
- Vanilla JavaScript (ES5-compatible IIFE in landing-page.js), CSS3, HTML5 + Leaflet.js (vendored), photo-viewer.js (existing global `window.photoViewer`) (010-trip-landing-page)
- N/A — reads existing `data/manifest.json` and `data/itinerary.json` at runtime (010-trip-landing-page)
- Vanilla JavaScript (ES5-compatible IIFE), CSS3, HTML5 + Leaflet.js (existing, vendored) (011-fix-video-playback)
- Vanilla JavaScript (ES5-compatible IIFE), CSS3, HTML5 + Leaflet.js (vendored), no new dependencies (011-fix-video-playback)
- N/A — reads `data/manifest.json` at runtime (011-fix-video-playback)
- Vanilla JavaScript (ES5-compatible IIFEs), CSS3, HTML5 + Leaflet.js (vendored in `js/`), no new dependencies (012-fix-mobile-nav-ux)
- N/A — pure UI changes, no data persistence (012-fix-mobile-nav-ux)
- Vanilla JavaScript (ES5-compatible IIFEs for frontend), Python 3.10+ (processing pipeline) + Leaflet.js (vendored), ffmpeg/ffprobe (CLI, already available for thumbnails), Firebase Storage SDK v11 (vendored) (013-native-video-playback)
- Firebase Storage (Spark free tier: 5 GB storage, 1 GB/day downloads) for transcoded video files; local `data/manifest.json` for metadata (013-native-video-playback)
- Vanilla JavaScript (ES5-compatible IIFEs) + None new — Leaflet.js (existing, vendored) (015-shared-trip-model)
- N/A — reads existing `data/manifest.json`, `data/trip_segments.json`, `data/itinerary.json` at runtime (015-shared-trip-model)
- N/A — in-memory only, no persistence (016-app-state-module)
- Vanilla JavaScript (ES5-compatible IIFE) + None (standalone module, no framework or library dependencies) (016-app-state-module)
- Vanilla JavaScript (ES5-compatible IIFEs) + Leaflet.js 1.9.4 (vendored), no new dependencies (017-dom-builders)
- N/A — reads existing JSON manifests at runtime (017-dom-builders)

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

## Frontend Development
- After any CSS/JS change to UI components, use the Playwright MCP to screenshot localhost:8000 and verify the change visually before committing.
- Test at both desktop (1440px) and mobile (375px) widths.

## Recent Changes
- 017-dom-builders: Added Vanilla JavaScript (ES5-compatible IIFEs) + Leaflet.js 1.9.4 (vendored), no new dependencies
- 016-app-state-module: Added Vanilla JavaScript (ES5-compatible IIFE) + None (standalone module, no framework or library dependencies)
- 016-app-state-module: Added Vanilla JavaScript (ES5-compatible IIFEs) + None new — Leaflet.js (existing, vendored)


## Testing

- After implementing changes, test in the browser using the Playwright MCP before declaring work complete. Watch for: CSS z-index/positioning issues, gesture/pointer event interception, and browser caching of stale assets.

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
