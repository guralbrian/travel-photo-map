# Implementation Plan: Trip Landing Page — Interactive Detail Map

**Branch**: `010-trip-landing-page` | **Date**: 2026-04-04 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/010-trip-landing-page/spec.md`

## Summary

Add an interactive map with photo clusters to the region detail view on the trip landing page. The detail map replaces the current static mini-map with a full ViewportSampler-powered Leaflet map that shows the same tier-based photo markers as the main map. The map pre-initializes during the 3.5s intro animation for instant interactivity. Mobile uses two-finger gestures; panning too far prompts escalation to the fullscreen main map.

**Key technical challenge**: ViewportSampler is currently a singleton IIFE and must be refactored to a constructor function to support a second instance for the detail map.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES5-compatible IIFE pattern), CSS3, HTML5
**Primary Dependencies**: Leaflet.js 1.9.4 (vendored), ViewportSampler.js (local), Leaflet.Photo.js (local)
**Storage**: N/A — reads `data/manifest.json` and `data/itinerary.json` at runtime
**Testing**: Manual browser testing via Playwright MCP (desktop 1440px, mobile 375px)
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge), desktop + mobile
**Project Type**: Single-page static web application (GitHub Pages)
**Performance Goals**: Detail map interactive within 0ms of card open (pre-initialized); 60fps pan/zoom; photo clusters render on viewport change within 16ms
**Constraints**: No build step, no npm, no external CDN. All dependencies vendored. Static hosting only.
**Scale/Scope**: 5000+ photos in manifest, 8 regions, ~50-600 photos per region

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy by Default | **PASS** | No new data transmitted externally. Photos/coordinates stay in browser. |
| II. Static & Zero-Config | **PASS** | No API keys, no backend. Map tiles use free keyless CARTO provider. |
| III. Approachable by Everyone | **PASS** | Two-finger gesture follows platform conventions (Google Maps pattern). Overlay hint teaches interaction. Escalation prompt uses plain language. |
| IV. Professional Visual Polish | **PASS** | Full-width 50vh map, smooth transitions, consistent dark CARTO tiles. No jank — pre-initialized map avoids loading delays. |
| V. Performant at Any Scale | **PASS** | ViewportSampler's density sampling handles 600+ photos per region efficiently. Pre-initialization during intro amortizes cost. |
| VI. Unified Media Experience | **PASS** | Photo clusters on detail map open the same immersive viewer. Videos display with play badge same as main map. |
| VII. Map-Centric Integration | **PASS** | The detail view now embeds a real interactive map — reinforcing the map-as-canvas principle. Escalation to fullscreen map is a natural progression. |

**Post-Phase 1 re-check**: Constitution remains fully satisfied. The ViewportSampler refactor (singleton → constructor) is an internal change with no user-facing impact.

## Project Structure

### Documentation (this feature)

```text
specs/010-trip-landing-page/
├── plan.md              # This file
├── research.md          # Phase 0 output (updated 2026-04-04)
├── data-model.md        # Phase 1 output (updated 2026-04-04)
├── quickstart.md        # Phase 1 output (updated 2026-04-04)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
js/
├── ViewportSampler.js     # MODIFIED: singleton IIFE → constructor function
├── Leaflet.Photo.js       # UNCHANGED: marker icon system (reused by detail map)
├── landing-page.js        # MODIFIED: replace static mini-map with interactive map
├── photo-viewer.js        # UNCHANGED: viewer opened from detail map clusters
└── region-nav.js          # UNCHANGED: main map region filtering

css/
├── landing-page.css       # MODIFIED: 50vh map section, gesture overlay, escalation prompt
└── Leaflet.Photo.css      # UNCHANGED: marker styles (shared by both maps)

index.html                 # MODIFIED: ViewportSampler instantiation change
data/
├── manifest.json          # UNCHANGED: photo data source
└── itinerary.json         # UNCHANGED: region data source
```

**Structure Decision**: Single-page static web app. All changes are within the existing flat `js/` and `css/` structure. No new directories needed.

## Implementation Design

### Phase 1: ViewportSampler Refactor (Foundation)

**Goal**: Convert ViewportSampler from singleton IIFE to constructor function.

**Approach**:
1. Replace outer `(function() { ... window.ViewportSampler = { init, stop, ... }; })()` with `window.ViewportSampler = function ViewportSampler() { ... return { init, stop, ... }; };`
2. All module-scope `var _map, _photos, _markers, ...` become instance-scoped (inside the constructor body)
3. All internal functions (`update`, `createMarker`, etc.) remain as closures over instance state — no API change

**Migration in index.html**:
```javascript
// Before:
ViewportSampler.init(map, photos, opts);
ViewportSampler.setPhotos(filtered);
ViewportSampler.update();

// After:
var mainSampler = new ViewportSampler();
mainSampler.init(map, photos, opts);
mainSampler.setPhotos(filtered);
mainSampler.update();
```

**Risk**: Every `ViewportSampler.xxx()` call in index.html and region-nav.js must be updated. Grep for all references to ensure none are missed.

### Phase 2: Detail Map Pre-initialization

**Goal**: Create a hidden interactive Leaflet map during the intro animation.

**Approach**:
1. In `setupIntro()`, after starting the 3.5s timer, create a hidden `<div id="detail-map-holder">` in the landing page container
2. Initialize `L.map('detail-map-holder', { zoomControl: false, attributionControl: false })` with CARTO dark tiles
3. Create `detailSampler = new ViewportSampler()` and call `detailSampler.init(detailMap, [], { onClick: onDetailPhotoClick })`
4. Store `_detailMap` and `_detailSampler` in module state

**Mobile-specific initialization**:
```javascript
var isMobile = window.innerWidth <= 768;
var mapOpts = {
    zoomControl: false,
    attributionControl: false,
    dragging: !isMobile,
    scrollWheelZoom: !isMobile,
    touchZoom: true,
    doubleClickZoom: true
};
```

### Phase 3: Detail View Integration

**Goal**: Wire the pre-initialized map into the detail view on card open/close.

**On card open** (`openDetail()`):
1. Move `#detail-map-holder` div into the detail view's map container
2. Call `_detailMap.invalidateSize()` (container size changed)
3. Compute region photo bounds: `L.latLngBounds(regionPhotos.map(p => [p.lat, p.lng]))`
4. Call `_detailMap.fitBounds(regionBounds, { padding: [30, 30] })`
5. Call `_detailSampler.setPhotos(regionPhotos)` then `_detailSampler.update()`

**On card close** (`closeDetail()`):
1. Call `_detailSampler.setPhotos([])` (clear markers)
2. Move `#detail-map-holder` back to hidden position
3. Remove `moveend` listener for escalation

**On photo cluster click** (`onDetailPhotoClick`):
- Same handler pattern as main map: `window.photoViewer.open(regionPhotos, clickedIndex, markerElement)`

### Phase 4: Detail View Layout Restructure

**Goal**: Change detail from two-column to full-width map + stacked content.

**New HTML structure**:
```html
<div class="landing-detail">
  <div class="detail-header"><!-- title, close button --></div>
  <div class="detail-map-section" style="height: 50vh">
    <!-- detail-map-holder moved here on open -->
  </div>
  <div class="detail-content">
    <div class="detail-summary">...</div>
    <div class="detail-places">...</div>
    <div class="detail-photos">...</div>
  </div>
</div>
```

**CSS**:
```css
.detail-map-section {
    width: 100%;
    height: 50vh;
    border-radius: 12px;
    overflow: hidden;
    position: relative; /* for overlay positioning */
}
@media (max-width: 768px) {
    .detail-map-section { height: 40vh; }
}
```

### Phase 5: Two-Finger Gesture Handler (Mobile)

**Goal**: Implement FR-009d — two-finger to pan map on mobile.

**Approach**:
1. Add `pointerdown`/`pointermove`/`pointerup` listeners on the map container
2. Track active pointer IDs in a `Map` or array
3. When 2+ pointers active: compute centroid delta between frames, call `_detailMap.panBy([-dx, -dy])`
4. When 1 pointer on mobile: no-op (browser handles scroll)
5. Show "Use two fingers to move the map" overlay on first single-finger `touchmove` on map
6. Auto-dismiss overlay after 2s; store in `sessionStorage` to avoid repeat

**Overlay HTML** (injected into `.detail-map-section`):
```html
<div class="map-gesture-overlay">Use two fingers to move the map</div>
```

### Phase 6: Out-of-Bounds Escalation

**Goal**: Implement FR-009e — prompt when user pans far from region.

**Approach**:
1. On card open, compute `_regionBounds` from photo lat/lng
2. Listen for `moveend` on `_detailMap`
3. On each `moveend`: compute overlap ratio = intersection area / viewport area
4. If overlap < 0.2 (less than 20% of viewport shows region content): show escalation prompt
5. If overlap >= 0.2: hide prompt if visible

**Overlap calculation** (simplified):
```javascript
function boundsOverlapRatio(viewBounds, regionBounds) {
    var intersection = viewBounds.intersects(regionBounds)
        ? /* compute intersection bounds */ : null;
    if (!intersection) return 0;
    // approximate area ratio using lat/lng rectangles
    var viewArea = boundsArea(viewBounds);
    var intArea = boundsArea(intersection);
    return intArea / viewArea;
}
```

**Prompt behavior**:
- "Explore the full map?" with Accept / Dismiss buttons
- Accept: call `enterMapFromDetail()` with `_detailMap.getCenter()` and `_detailMap.getZoom()` passed to main map
- Dismiss: hide prompt, set `_escalationDismissed = true`, reset on next card open or when user returns to region bounds

## Complexity Tracking

> No constitution violations — no entries needed.

| Aspect | Complexity | Justification |
|--------|------------|---------------|
| ViewportSampler refactor | Medium | Required for dual-instance support. Same API, internal restructure only. |
| Two-finger gesture handler | Low-Medium | ~40 lines of Pointer Events code. Well-understood pattern. |
| Bounds overlap computation | Low | Simple lat/lng rectangle intersection math. |
