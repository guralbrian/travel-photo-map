# Implementation Plan: Photo Wall Album View

**Branch**: `006-photo-wall` | **Date**: 2026-03-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-photo-wall/spec.md`

---

## Summary

Add a full-width bottom panel ("photo wall") to the travel photo map that displays all trip photos in a justified chronological grid — modeled on Google Photos album view. The panel overlays the map at the bottom of the screen (same fixed-overlay pattern as the existing trip feed bottom sheet), with three snap states: collapsed (~30vh preview strip), half-screen (~50vh), and full-screen (100vh). Clicking a map marker auto-expands the panel and scrolls to that photo's date section. A date scrubber on the right edge enables fast date jumping. All logic is implemented in two new files (`photo-wall.js`, `photo-wall.css`) with targeted modifications to `index.html` for integration.

---

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+ modules), CSS3, HTML5
**Primary Dependencies**: Leaflet.js (existing, vendored); no new libraries
**Storage**: `manifest.json` + `trip_segments.json` (existing, read-only); no new data files
**Testing**: Manual browser testing via `python3 -m http.server 8000`
**Target Platform**: Web browsers (desktop + mobile); Chrome, Firefox, Safari
**Project Type**: Single-page web application
**Performance Goals**: 60fps scroll in the grid; panel snap animation ≤ 250ms; map-targeted scroll ≤ 400ms; layout computation for 600 photos < 50ms
**Constraints**: Static-first deployment; no build step; no CDN links; vendored deps only; `#map { height: 100% }` layout cannot be changed
**Scale/Scope**: ~570 photos at launch; virtual scroll must support up to 1,200 photos without degradation

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

| Principle | Status | Evidence |
|-----------|--------|---------|
| I. Static-First Deployment | ✅ PASS | Photo wall is pure client-side JS/CSS. No server-side processing. Reads `manifest.json` and `trip_segments.json` via `fetch()` — same as all existing features. |
| II. Zero-Configuration Viewing | ✅ PASS | No new API keys or environment variables. The panel works with any valid `manifest.json`. |
| III. Privacy by Default | ✅ PASS | Photo wall displays only thumbnail URLs (already in manifest, already in the existing UI). No access to the original `photos/` directory. |
| IV. Offline Processing Pipeline | ✅ PASS | No new browser-side image processing. All photo metadata (dates, thumbnails) comes from the pre-built manifest. The justified grid computes layout from metadata, not pixel data. |
| V. Vendored Frontend Dependencies | ✅ PASS | No new JavaScript libraries introduced. Justified grid, virtual scroll, and snap-point drag are implemented from scratch in `photo-wall.js` (~400–500 lines). |
| VI. Graceful Degradation | ✅ PASS | Empty `manifest.json` → photo wall shows empty state. Missing thumbnail URLs → placeholder tiles. Missing `type` field → treated as photo. Panel renders even if Firebase is unavailable (no cloud data needed). |

**GATE RESULT**: All 6 principles satisfied. No violations. No complexity tracking needed.

---

## Project Structure

### Documentation (this feature)

```text
specs/006-photo-wall/
├── plan.md              ← This file
├── spec.md              ← Feature specification
├── research.md          ← Phase 0 research decisions
├── data-model.md        ← Entity definitions and relationships
├── quickstart.md        ← How to run and test locally
├── contracts/
│   └── photo-wall-interface.md  ← Module API + DOM event protocol
└── tasks.md             ← Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
frontend/
├── index.html           ← Modified: panel HTML, event wiring, module import
├── js/
│   └── photo-wall.js    ← New: PhotoWall class (layout engine + panel + grid)
└── css/
    └── photo-wall.css   ← New: panel, grid, scrubber, and animation styles
```

**Structure Decision**: Single-project web application. New files are dropped directly into `frontend/js/` and `frontend/css/` — consistent with how `photo-viewer.js` and `photo-viewer.css` were added in feature 005.

---

## Phase 0: Research

**Status**: Complete — see [research.md](research.md)

Key decisions resolved:

| Question | Decision |
|----------|----------|
| Panel layout: split viewport vs. overlay | Fixed overlay (same as trip feed) — no `#map` layout changes |
| Justified grid: library vs. custom | Custom algorithm in `photo-wall.js` (~40 lines) — no new deps |
| Virtual scroll: library vs. custom | Custom position-absolute virtual scroll with scroll event (~80 lines) |
| Snap-point drag: reuse vs. new | New implementation in `photo-wall.js` (same pattern, different DOM) |
| Map-to-wall events: direct call vs. custom events | Custom DOM events on `document` — decoupled |
| Aspect ratios not in manifest | Default 4:3; corrected lazily when thumbnails load |

---

## Phase 1: Design

**Status**: Complete — see [data-model.md](data-model.md), [contracts/](contracts/), [quickstart.md](quickstart.md)

### Data Model Summary

No new persistent storage. All runtime entities are in-memory:
- `DateSection[]` — photos grouped by date with city name/color from trip segments
- `GridRow[]` — justified layout rows within each section
- `LayoutCache` — pre-computed pixel positions for all photos
- `PanelState` — current snap state and scroll position

### Module Interface Summary

**Module**: `frontend/js/photo-wall.js` exports `class PhotoWall`

**Public methods**: `constructor(options)`, `expand(state)`, `targetPhoto(photo)`, `targetDate(date)`, `relayout()`, `destroy()`

**Events consumed**: `photo-wall:target` (map marker clicked), `photo-wall:target-date` (feed entry clicked)

**Events dispatched**: `photo-wall:photo-clicked` (grid photo clicked), `photo-wall:state-changed` (snap state changed)

See full interface spec: [contracts/photo-wall-interface.md](contracts/photo-wall-interface.md)

---

## Implementation Breakdown

### Task Group 1: Panel Shell & Snap Behavior (P1 — foundation)

Deliver a resizable panel anchored to the bottom of the screen with three snap states. No photos yet — just the panel geometry and drag behavior. This is independently testable.

**Deliverables**:
1. `photo-wall.css` — Panel base styles: `position:fixed; bottom:0; left:0; right:0`, height classes for each snap state (`--collapsed`, `--half`, `--full`), transition easing, z-index management, drag handle styles, collapse button
2. `photo-wall.js` — `PanelSnap` class: touch/pointer event listeners on drag handle, velocity detection, snap state transitions, CSS class application, `photo-wall:state-changed` event dispatch
3. `index.html` — Add `.photo-wall-panel` HTML structure; add `<link>` for `photo-wall.css`; import `photo-wall.js` module; initialize `PhotoWall` after manifest loads

**Acceptance**: Panel visible at bottom in collapsed state; drag up to half/full; drag down to collapse; snap animation smooth.

---

### Task Group 2: Justified Grid Layout Engine (P1 — core browsing)

Implement the layout algorithm that converts the photo manifest into date sections and justified grid rows. Render all photos (non-virtualized first, virtualize in Task Group 3).

**Deliverables**:
1. `photo-wall.js` — `buildLayout(photos, segments, panelWidth)` function:
   - Group photos into `DateSection[]` by `date` field, sorted chronologically
   - For each section, resolve `cityName` and `cityColor` from trip segments
   - Pack photos into `GridRow[]` using the justified algorithm (target height: 160px; gap: 4px)
   - Compute cumulative `yOffset` for each section and row
   - Build `LayoutCache` with `photoToPosition` and `dateToSectionIndex` maps
2. `photo-wall.js` — `renderVisibleRows(scrollTop, panelHeight, layoutCache)` function:
   - Find sections/rows in the visible range
   - Create/update/remove `.photo-wall-item` and `.photo-wall-section-header` DOM elements
   - Set `position:absolute; top; left; width; height` on each item from `LayoutCache`
   - Each item: `<div class="photo-wall-item"><img loading="lazy" src="thumbnail"></div>`
   - Video items: add play icon overlay
3. `photo-wall.css` — Grid item styles: `overflow:hidden; border-radius:2px; cursor:pointer`, thumbnail `object-fit:cover; width:100%; height:100%`, placeholder (skeleton) state before thumbnail loads, video play icon overlay, section header styles (date + city color accent, sticky positioning)
4. `photo-wall.js` — Scroll event listener on `.photo-wall-scroll`: calls `renderVisibleRows` with buffer of 1.5× panel height above and below viewport

**Acceptance**: All photos render in justified rows with correct aspect ratios (defaulting to 4:3); date headers visible; section headers stick at top of panel while scrolling within that section; scrolling is smooth.

---

### Task Group 3: Virtual Scrolling (P1 — performance)

Replace the full DOM rendering from Task 2 with virtualized rendering that only keeps photos near the visible area in the DOM.

**Deliverables**:
1. `photo-wall.js` — Virtual scroll spacer: set `.photo-wall-spacer` height to `layoutCache.totalHeight`
2. `photo-wall.js` — `VirtualScroll` class:
   - On scroll, compute visible row range: `[scrollTop - buffer, scrollTop + panelHeight + buffer]`
   - Binary search `LayoutCache.sections` and `GridRow` yOffsets to find visible rows
   - Add photo items for newly-visible rows (create DOM nodes, set absolute positions)
   - Remove photo items for rows that scrolled out of buffer range
   - Maintain a pool of recently-used DOM nodes to minimize GC pressure (simple LRU of 20 nodes)
3. `photo-wall.js` — Sticky date header management:
   - Track which section's header should be "stuck" at the top of the panel (section whose content is in view but whose header has scrolled above the panel top)
   - Update stuck header label as user scrolls

**Acceptance**: With 570 photos loaded, the DOM never has more than ~100 photo tile elements at any time; scrolling performance is smooth at 60fps; the correct date header is always shown at the top.

---

### Task Group 4: Date Scrubber (P2 — navigation)

A narrow vertical strip on the right edge of the panel that provides fast date-jumping.

**Deliverables**:
1. `photo-wall.css` — Scrubber styles: `position:absolute; right:0; top:header_height; bottom:0; width:20px`, subtle background, thumb indicator dot
2. `photo-wall.js` — `DateScrubber` class:
   - Pointer/touch events on `.photo-wall-scrubber`
   - On drag: map pointer Y position (relative to scrubber height) to a date in `LayoutCache.sections`
   - Update `.photo-wall-scrubber-thumb` position
   - Show/hide `.photo-wall-scrubber-tooltip` with formatted date label
   - Scroll `.photo-wall-scroll` to the corresponding `DateSection.yOffset` (instant, no animation, for responsiveness)
   - On release: hide tooltip after 1 second

**Acceptance**: Dragging the scrubber from top to bottom traverses the full trip date range; tooltip shows the correct date; grid jumps to correct date instantly.

---

### Task Group 5: Map-to-Wall Integration (P1 — integration)

Wire map photo marker clicks to expand and scroll the photo wall.

**Deliverables**:
1. `index.html` — In `onPhotoClick` function: dispatch `photo-wall:target` custom event with the clicked photo object
2. `index.html` — In feed entry click handler: dispatch `photo-wall:target-date` event with the entry's date string
3. `photo-wall.js` — `PhotoWall` constructor: register `document.addEventListener('photo-wall:target', ...)`:
   - If `snapState === 'collapsed'` → call `expand('half')`
   - Scroll grid to the photo's `DateSection.yOffset` (smooth scroll, 300ms)
   - After scroll completes, add `.photo-wall-item--highlight` class to the photo's tile; remove after 2 seconds
4. `photo-wall.css` — `.photo-wall-item--highlight`: `animation: photo-wall-pulse 2s ease-out` — glowing border that fades out

**Acceptance**: Clicking any map marker expands the wall (if collapsed) and scrolls to the correct date section with the photo highlighted.

---

### Task Group 6: Wall-to-Map Integration (P1 — integration)

Wire photo grid clicks to open the photo viewer and pan the map.

**Deliverables**:
1. `photo-wall.js` — Click handler on `.photo-wall-scroll` (delegated): on click of `.photo-wall-item`, look up the clicked photo in `LayoutCache.photoToPosition`, get the `sectionPhotos` array (all photos in that `DateSection`), dispatch `photo-wall:photo-clicked` event
2. `index.html` — Register `document.addEventListener('photo-wall:photo-clicked', ...)`:
   - Call `window.photoViewer.open(detail.sectionPhotos, detail.indexInSection, detail.srcElement)`
   - Call `map.panTo([detail.photo.lat, detail.photo.lng])`

**Acceptance**: Clicking a grid photo opens the immersive viewer for that photo; map pans to the photo's location; navigating in the viewer traverses the day's photos.

---

### Task Group 7: Responsive Layout & Edge Cases (P2 — polish)

Ensure the panel works on all viewport sizes and handles edge cases gracefully.

**Deliverables**:
1. `photo-wall.css` — Mobile adjustments: on narrow viewports (`≤768px`), reduce collapsed height to `25vh`, reduce target row height to 120px
2. `photo-wall.js` — Window resize handler: debounced (200ms), calls `relayout()` which recomputes `LayoutCache` at the new panel width and re-renders the visible rows
3. `photo-wall.js` — Z-index management: apply `z-index: 1000` in `collapsed`/`half` states (below feed sidebar), `z-index: 1003` in `full` state (above all)
4. `photo-wall.js` — Empty state: when `photos.length === 0`, show `.photo-wall-empty` message in the panel content area
5. `photo-wall.js` — Scroll boundary: prevent panel scroll events from propagating to the map (call `stopPropagation()` on `wheel` events within `.photo-wall-scroll`)
6. `photo-wall.css` — Feed sidebar coexistence: on desktop, the photo wall panel right edge leaves `0px` gap (feed sidebar is fixed and will overlay the top-right corner; this is acceptable since the photo wall doesn't reach the feed sidebar in `half` state)

**Acceptance**: Panel renders correctly on mobile (375px wide) and desktop (1440px wide); window resize re-flows the grid; empty manifest shows helpful message; map does not scroll when scrolling the photo wall.

---

## Agent Context Update

After completing Phase 1, run:

```bash
bash .specify/scripts/bash/update-agent-context.sh claude
```

This updates `.claude/` agent context with the new technology additions from this plan.

---

## Implementation Order

```
Task 1 (Panel Shell) → Task 2 (Grid Layout) → Task 3 (Virtual Scroll)
                                                        ↓
                              Task 5 (Map→Wall)  Task 6 (Wall→Map)
                                        ↓                ↓
                                    Task 4 (Scrubber) + Task 7 (Polish)
```

Tasks 5 and 6 can proceed in parallel once Task 2 is complete (they need the layout engine to look up photos). Task 3 (virtualization) can follow Task 2 directly as a performance upgrade. Task 4 (scrubber) is independent after Task 2. Task 7 (polish) wraps up at the end.
