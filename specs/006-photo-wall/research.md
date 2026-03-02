# Research: Photo Wall Album View

**Branch**: `006-photo-wall` | **Date**: 2026-03-02

---

## Decision 1: Panel Layout Architecture — Fixed Overlay vs. Split Viewport

**Decision**: Fixed-position overlay panel (same pattern as existing trip feed bottom sheet)

**Rationale**: The map is already `height: 100%; width: 100%` with all panels as fixed overlays on top. Changing this to a split-viewport flexbox would require refactoring the core layout used by the control panel, feed sidebar, and map markers. Instead, the photo wall panel is `position: fixed; bottom: 0; left: 0; right: 0` with variable `height` controlled by snap state. The map renders at full-size underneath; the panel covers the bottom portion. This is identical to how the existing mobile trip feed works — expand it to full screen and the map is covered (still rendering underneath). No layout refactoring needed.

**Alternatives considered**:
- CSS flexbox column split (map top, panel bottom): Would shrink the actual map viewport. Rejected because it requires refactoring the existing `#map { height: 100% }` layout and all fixed-position overlay elements. Much higher blast radius.
- CSS grid rows: Same problem as flexbox. Rejected.

---

## Decision 2: Justified Grid Layout — Custom Algorithm vs. Library

**Decision**: Custom vanilla JS implementation of the "justified layout" algorithm (no library)

**Rationale**: The algorithm is a single function (~40 lines): for each row, greedily pack photos by aspect ratio until the row is full, then scale all photos uniformly so they fill the row width exactly. Row height = panel_width / sum_of_aspect_ratios_in_row. This is well-understood, has no dependencies, and fits the constitution's zero-build-step requirement. The aspect ratios are derivable from the thumbnail dimensions available in manifest.json (width/height fields — if not present, default to 4:3 ratio).

**Alternatives considered**:
- Flickr `justified-layout` npm package: Requires Node.js/bundler. Violates vendored-deps and no-build-step principles. Rejected.
- CSS grid with `auto-fill`: Cannot maintain aspect ratios across a full-width row without knowing each item's dimensions in advance. Produces uniform-sized tiles, not the Google Photos justified look. Rejected.
- CSS Masonry (`columns`): Vertical flow, not horizontal rows. Does not match the chronological left-to-right reading pattern of Google Photos album view. Rejected.

---

## Decision 3: Virtual Scrolling — Custom vs. Library

**Decision**: Custom scroll-event virtual scroll with pre-computed row positions

**Rationale**: The justified grid must pre-compute all row positions before rendering (because row N's vertical position depends on the cumulative height of rows 1..N-1). Once positions are known, virtual scrolling is straightforward: on each scroll event, find rows whose vertical range intersects `[scrollTop - buffer, scrollTop + panelHeight + buffer]` and render only those. Rows outside the buffer are removed from the DOM. A large spacer `div` with `height = totalContentHeight` provides correct scrollbar proportions. This is ~80 lines of code with no dependencies.

**Alternatives considered**:
- `virtual-scroller` web component library: Requires build tooling or a CDN link (incompatible with vendored-deps principle). Rejected.
- CSS `content-visibility: auto`: Simplifies rendering but doesn't work with position-absolute grid items (rows must be absolutely positioned for the virtual scroll spacer pattern). Rejected.
- IntersectionObserver: Good for lazy image loading (will use for thumbnails) but insufficient alone for virtual DOM removal — you'd still need to pre-compute positions. Scroll event is clearer for the row rendering logic. Rejected as sole mechanism (IntersectionObserver IS used for thumbnail lazy-loading within rendered rows).

---

## Decision 4: Snap-Point Drag Handling — Reuse vs. New Implementation

**Decision**: Extract and reuse the existing snap-point logic from the trip feed bottom sheet in `index.html`

**Rationale**: Lines 649-712 of `index.html` already implement a complete three-state snap system (collapsed/half/full) with velocity detection (`velocity > 80px/s`), Pointer Events API, and smooth CSS transition easing (`cubic-bezier(0.22, 1, 0.36, 1)`). The photo wall needs the same behavior but: (a) full-width instead of sidebar-width, (b) active on desktop too (not just mobile). The logic will be encapsulated in `photo-wall.js` as a `PanelSnap` class, making it self-contained. The existing trip feed code remains unchanged.

**Alternatives considered**:
- Separate resize handle with arbitrary heights: Rejecting snap points would feel less polished and harder to implement consistently. Google Photos has a binary expand/collapse (not arbitrary drag). Snap points are the right UX.
- Share code by extracting to a common utility: Over-engineering for two use cases with different DOM structures. Better to keep the photo wall self-contained.

---

## Decision 5: Map-to-Wall Event Integration

**Decision**: Custom DOM events dispatched from the existing `onPhotoClick` handler

**Rationale**: `index.html` already has an `onPhotoClick(e)` function that fires when a map marker is clicked and opens the photo viewer. Adding one line — `document.dispatchEvent(new CustomEvent('photo-wall:target', { detail: { photo } }))` — makes the photo wall aware of map clicks without creating tight coupling. The photo wall module registers this listener independently. This is consistent with the Firebase `firebase-ready` event pattern already in the codebase.

**Alternatives considered**:
- Direct function call into `PhotoWall` from `onPhotoClick`: Creates coupling between `index.html` and the photo wall module. If the photo wall is removed, the call breaks. Events are decoupled.
- Global variable: `window.photoWall.targetPhoto(photo)`. Same coupling problem plus pollutes the global namespace.

---

## Decision 6: Date Scrubber Implementation

**Decision**: A narrow vertical strip on the right edge of the panel with touch/mouse drag events

**Rationale**: The scrubber needs to map a pointer Y position (relative to scrubber height) to a trip date index, then scroll the grid to the corresponding position. This is ~30 lines of event handling. The scrubber thumb shows a floating date label on drag. No library needed.

**Alternatives considered**:
- HTML `<input type="range" orient="vertical">`: Non-standard attribute, inconsistent browser support. Rejected.
- Custom SVG scrubber: Adds unnecessary complexity. Plain div with pointer events is sufficient.

---

## Decision 7: Photo Aspect Ratios in Manifest

**Finding**: The existing manifest.json entries do not include explicit `width`/`height` fields for thumbnails. The justified grid algorithm requires aspect ratios.

**Decision**: Use `Image()` lazy loading with natural dimensions for visible rows; default 4:3 ratio for pre-layout calculation; update row layout when actual dimensions become known (recalculate affected rows and re-render).

**Rationale**: Loading all thumbnail images upfront just for dimensions would be expensive (~570 requests). Instead: pre-compute layout with 4:3 as default (creates a stable approximate layout), then as thumbnails load within the visible buffer zone, their actual dimensions update the layout for those rows. This means the layout is approximate initially but corrects itself as the user scrolls. Most travel photos are landscape (approx 4:3), so the initial layout will be close to correct in most cases.

**Alternative**: Embed width/height in manifest.json via the Python processing script. This would be the ideal long-term solution (accurate layout from the start), but it requires a backend change (modifying `process_photos.py`). This is tracked as a future improvement. For this feature, the lazy-load approach is sufficient.

---

## Decision 8: Panel Coexistence with Feed Sidebar and Control Panel

**Decision**: Photo wall panel sits below the feed sidebar and control panel in the fixed-overlay stack; when the photo wall is fully expanded (100vh), it covers both other panels; a collapse button remains accessible on the photo wall itself.

**Rationale**: The existing panels use `z-index: 1001-1002`. The photo wall panel will use `z-index: 1000` (below other panels) in its collapsed/half state so the feed sidebar remains accessible. When fully expanded, the photo wall uses `z-index: 1003` to cover everything and provide an immersive experience. A collapse button (↓) is always visible in the photo wall header.

**Alternatives considered**:
- Always-below: Photo wall never covers the feed sidebar. Problem: on narrow viewports, fully-expanded photo wall would still be behind the sidebar, creating overlap confusion.
- Side-by-side layout math: Photo wall width = viewport_width - sidebar_width when feed is open. Too complex; breaks if the sidebar is toggled.

---

## Summary of Key Constraints

| Constraint | How Resolved |
|------------|--------------|
| No build step | All code is plain JS/CSS in `frontend/js/` and `frontend/css/` |
| No new CDN/npm dependencies | Justified grid, virtual scroll, snap drag — all implemented in `photo-wall.js` |
| Aspect ratios not in manifest | Default 4:3; corrected lazily as thumbnails load |
| Single codebase for mobile + desktop | Same overlay pattern, same snap-point logic, different CSS heights |
| No modification to existing photo viewer | Photo wall dispatches click events; viewer opens as-is |
