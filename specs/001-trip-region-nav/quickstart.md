# Quickstart: Trip Region Navigation

**Feature**: 001-trip-region-nav | **Date**: 2026-03-06

## Prerequisites

- The project is served locally via `python3 -m http.server 8000`
- Existing `data/manifest.json` and `data/trip_segments.json` are present
- Branch `001-trip-region-nav` is checked out

## New Data File

Create `data/itinerary.json` with the trip itinerary JSON (provided in spec). This file is loaded at page startup alongside the manifest and segments.

## New Module

`js/region-nav.js` — the single new module for this feature. It:
1. Fetches and parses `data/itinerary.json`
2. Builds 8 RegionSection objects from the config mapping
3. Renders the 2x4 grid in the trip feed sidebar
4. Handles grid toggle, region selection, and back navigation
5. Dispatches filtering events to update photos, routes, and photo wall

## Modified Files

| File | Change |
|------|--------|
| `index.html` | Add `<script src="js/region-nav.js">`, add region grid HTML container in `#feed-sidebar`, wire initialization after data load |
| `js/photo-wall.js` | Add `setPhotos(photos)` method to rebuild layout with a new photo subset |
| `js/route-builder.js` | No API change — called with filtered params from region-nav.js |
| `css/map.css` | Add styles for region grid panels, itinerary panel, mobile overlay |

## Key Integration Points

1. **Photo filtering**: `region-nav.js` filters `allPhotos` by date range → calls `rebuildPhotoLayer()` (existing) and `photoWall.setPhotos()` (new)
2. **Route filtering**: `region-nav.js` rebuilds routes via `buildSmartRoutes(filteredPhotos, filteredSegments, map)` (existing function)
3. **Map zoom**: `region-nav.js` calls `map.flyTo(section.center, zoomLevel)` (existing Leaflet API)
4. **Sidebar state**: Grid and itinerary panel toggle visibility within `#feed-sidebar` using CSS class toggling (existing pattern)

## Testing

After changes, verify at both viewport widths:
- Desktop (1440px): Region grid appears in trip feed sidebar, itinerary panel replaces grid on selection
- Mobile (375px): Region grid appears as full-screen overlay, itinerary appears in bottom sheet
