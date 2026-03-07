# Research: Trip Landing Page

**Branch**: `010-trip-landing-page` | **Date**: 2026-03-06

## R1: Landing Page Overlay Strategy

**Decision**: Full-screen overlay div (`#landing-page`) at z-index 2500, placed before existing content in `index.html`. The existing map and panels load behind it but are hidden via `visibility: hidden` / `display: none` until the landing page is dismissed.

**Rationale**: This is the least invasive approach — the existing app code remains untouched except for: (1) adding the landing page HTML/CSS/JS, (2) deferring sidebar/panel visibility until landing closes, and (3) loading the new script. The map can still initialize in the background so transition to the full map is instant.

**Alternatives considered**:
- Separate HTML page: Rejected — requires duplicate asset loading and breaks the same-page transition requirement.
- Lazy-load map only after landing dismissal: Rejected — would cause a visible delay when entering the map, hurting the experience.

## R2: Card Expansion Animation Pattern

**Decision**: Use CSS transforms and transitions for the card-to-detail animation. On click, capture the card's bounding rect, then transition a detail container from that rect to fullscreen using `transform: translate() scale()`. Use `will-change: transform` for GPU acceleration.

**Rationale**: CSS transform animations are composited on the GPU, avoiding layout thrashing and ensuring 60fps. This matches the constitution's requirement for smooth transitions and CSS-over-JS animation preference.

**Alternatives considered**:
- FLIP animation (First, Last, Invert, Play): Viable but more complex. The simple transform approach achieves the same visual effect for a rect-to-fullscreen transition.
- Web Animations API: Good but less browser support than CSS transitions. No benefit for this use case.
- JavaScript `requestAnimationFrame` loop: Rejected — constitution prefers CSS transitions.

## R3: Mini Map in Detail View

**Decision**: Create a second, smaller Leaflet map instance inside the detail view. Initialize it only when a card is opened (lazy), destroy it when closed. Use the same tile layer as the main map.

**Rationale**: Leaflet supports multiple map instances on a page. A dedicated mini-map avoids the complexity of moving/resizing the main map. Lazy initialization keeps initial load fast. The mini-map is read-only with no controls needed.

**Alternatives considered**:
- Static map image: Simpler but less engaging and requires an image service or pre-rendered tiles.
- Reuse main map by moving it into the detail view: Too risky — would break map state and require complex restoration.
- Embed an iframe with a map URL: Overweight and off-brand.

## R4: Thumbnail Grid Implementation

**Decision**: Simple CSS grid of thumbnail images. Use existing `thumbnail` URLs from `manifest.json`. Filter photos by the region's date range. Limit visible thumbnails (e.g., first 30) with a "View all on map" link that transitions to the full app filtered to that region.

**Rationale**: A simple CSS grid avoids pulling in the full photo-wall justified layout engine. The detail view's photo section is a preview, not a full browsing experience — that's what the map app is for. Limiting to ~30 thumbnails keeps the detail view fast.

**Alternatives considered**:
- Reuse PhotoWall component: Overkill for a preview grid. PhotoWall uses justified layout with aspect ratios, scrubber, and drag — none of which are needed here.
- Infinite scroll: Unnecessary for a preview. Cap at 30 with an escape hatch to the full app.

## R4b: Thumbnail Click → Photo Viewer Integration

**Decision**: Add a delegated click handler on `.detail-photos-grid` that catches `<img>` clicks, determines the photo index from the element's sibling position, and calls `window.photoViewer.open(photos, index, imgElement)`.

**Rationale**: The photo viewer at `js/photo-viewer.js:674-697` exposes `window.photoViewer.open(photos, startIndex, sourceElement)`. The manifest photo objects returned by `getPhotosForRegion()` in `landing-page.js:58-63` already have the correct shape (url, thumbnail, caption, tags, web_url) — no transformation needed. Event delegation on the grid container is more efficient than attaching handlers to each `<img>` (up to 30 per region). The `sourceElement` parameter enables the viewer's open/close animation to originate from the clicked thumbnail.

**Alternatives considered**:
- Individual click handlers per `<img>`: Rejected — creates up to 30 listeners per detail open.
- Dispatching a custom event instead of calling the API directly: Rejected — unnecessary indirection.
- `data-index` attributes on each `<img>`: Viable but unnecessary — sibling index is sufficient.

## R4c: Overflow Button Change

**Decision**: Change the overflow button text from `"+N more — view on map"` to `"View on map"`. Keep the existing `data-region-index` attribute and click handler that navigates to the map.

**Rationale**: Since thumbnails now open the viewer with the full photo array (all photos, not just the displayed 30), users can swipe through all photos in the viewer. The "+N more" count is no longer meaningful. The button's value is now purely as a map navigation shortcut.

**Alternatives considered**:
- Removing the button entirely: Rejected — the map navigation shortcut is still valuable.
- Showing all thumbnails (removing the 30 cap): Rejected — would cause layout/performance issues for regions with 60+ photos.

## R4d: Photo Viewer Z-Index Layering

**Decision**: Override `--z-viewer` from 2000 to 3000 in `landing-page.css` `:root` block, ensuring the photo viewer overlay sits above the landing page detail view (`--z-landing: 2500`).

**Rationale**: The photo viewer uses `z-index: var(--z-viewer)` which was set to 2000 in `photo-wall.css`. The landing page detail uses `z-index: var(--z-landing): 2500`. Without the override, the viewer opens behind the detail view and is invisible. Overriding the CSS custom property in `landing-page.css` (loaded after `photo-wall.css`) is the least invasive fix — no changes to `photo-viewer.js` or `photo-viewer.css` needed.

**Alternatives considered**:
- Modifying `photo-wall.css` directly to raise `--z-viewer`: Rejected — could affect other stacking contexts.
- Setting inline z-index on the viewer DOM when opening from landing: Rejected — requires modifying `photo-viewer.js`.

## R5: Itinerary Data Extension

**Decision**: Add two new optional fields to each region object in `data/itinerary.json`:
- `summary` (string): Hand-authored 2-3 sentence description.
- `heroPhoto` (string): URL/path to the hero image for the card background.

Both fields are optional — the landing page gracefully handles missing values (fallback color for missing hero, generic text for missing summary).

**Rationale**: Extending the existing JSON is simpler than creating a new data file. The fields are read-only display data with no schema migration concerns.

**Alternatives considered**:
- Separate `landing-page-data.json`: Rejected — splits data about the same entity across two files.
- Store hero photo as an index into the manifest: More fragile. A direct URL is simpler and allows using web_url for high-quality hero images.

## R6: Intro Screen Transition

**Decision**: The intro screen fades/slides up to reveal the card grid beneath it. Auto-trigger after 3.5 seconds, or immediately on any user interaction (click, tap, scroll, keypress). Use CSS `opacity` + `transform: translateY()` transition.

**Rationale**: Fade + slide-up is a cinematic, familiar pattern. Dual trigger (timer + interaction) ensures no visitor is stuck waiting, and impatient visitors can skip immediately.

**Alternatives considered**:
- Scroll-based parallax: More complex and doesn't work well on mobile.
- Click-only (no auto-timer): Risks visitors thinking the page is broken if they don't realize they should interact.
- Timer-only (no skip): Frustrating for returning visitors or anyone who reads fast.
