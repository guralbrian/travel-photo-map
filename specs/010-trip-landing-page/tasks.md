# Tasks: Trip Landing Page

**Input**: Design documents from `/specs/010-trip-landing-page/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md

**Tests**: No automated tests requested. Manual visual verification via Playwright MCP at 1440px and 375px.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new files and wire them into the existing app

- [X] T001 Create `css/landing-page.css` with design token imports (reuse `:root` vars from `css/photo-wall.css`), landing page z-index layer (`--z-landing: 2500`), and base `#landing-page` fixed-position overlay styles
- [X] T002 Create `js/landing-page.js` module scaffold exposing `window.initLandingPage(opts)` that accepts `{ itineraryData, allPhotos, tripSegments, map, onEnterMap }` per plan.md D2
- [X] T003 Add landing page HTML container `<div id="landing-page">` to `index.html` before `<div id="map">`, link `css/landing-page.css` in `<head>`, and add `<script src="js/landing-page.js"></script>` before the main inline script block

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data preparation and app initialization changes that MUST be complete before any user story

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Extend `data/itinerary.json` — add placeholder `summary` (empty string) and `heroPhoto` (empty string) fields to each of the 8 region objects. User will fill in real content later.
- [X] T005 Modify the main inline `<script>` in `index.html` to: (a) hide `#feed-sidebar` and `#photo-wall-panel` on page load when landing page is active, (b) call `window.initLandingPage()` after data loads in the `Promise.all` callback, passing `{ itineraryData, allPhotos, tripSegments, map, onEnterMap }` where `onEnterMap` is a callback that shows the sidebar/photo wall and restores normal app state

**Checkpoint**: Landing page overlay visible on load, existing app hidden behind it. No content yet.

---

## Phase 3: User Story 1 - Trip Stats Intro Screen (Priority: P1) MVP

**Goal**: Display a cinematic full-page intro showing "42 days, 8 regions, and 5 countries" that transitions to the card grid after 3.5 seconds or on user interaction.

**Independent Test**: Load `localhost:8000` — intro screen appears immediately with animated stats text. After 3.5s or any click/tap/scroll/keypress, it slides up to reveal the card grid area.

### Implementation for User Story 1

- [X] T006 [P] [US1] Build intro screen HTML structure inside `#landing-page` in `index.html` — a `<div class="landing-intro">` container with three stat lines ("42 days", "8 regions", "5 countries") and a subtle "scroll or tap to continue" hint
- [X] T007 [P] [US1] Style the intro screen in `css/landing-page.css` — full-viewport, centered text, large bold typography using existing font tokens, staggered fade-in animation for each stat line via CSS `@keyframes` with `animation-delay`, dark background matching `--color-bg-panel-heavy`
- [X] T008 [US1] Implement intro screen logic in `js/landing-page.js` — auto-dismiss timer (3.5s), skip on click/tap/scroll/keypress (add event listeners, remove after first trigger), dismiss via CSS class toggle (`landing-intro--hidden`) that triggers `opacity: 0` + `transform: translateY(-100%)` transition with `var(--duration-slow)`, reveal card grid section underneath after transition ends

**Checkpoint**: Intro screen fully functional — renders on load, auto-dismisses, skippable. Card grid area visible (but empty) after dismiss.

---

## Phase 4: User Story 2 - Region Card Grid (Priority: P1)

**Goal**: After intro dismisses, display a full-page grid of 8 evenly sized region cards with hero photo backgrounds, region names, and date ranges.

**Independent Test**: Navigate past intro — 8 cards visible in a 4x2 grid (desktop) or 2x4 grid (mobile) with region names, dates, and hero photo backgrounds.

### Implementation for User Story 2

- [X] T009 [P] [US2] Build card grid CSS in `css/landing-page.css` — `.landing-grid` container using CSS Grid (`grid-template-columns: repeat(4, 1fr)` desktop, `repeat(2, 1fr)` mobile via `@media (max-width: 768px)`), card `aspect-ratio: 16/9`, `background-size: cover`, dark gradient scrim at bottom for text readability, hover/active states with subtle scale transform
- [X] T010 [US2] Implement card grid rendering in `js/landing-page.js` — in `initLandingPage()`, read `itineraryData.regions` to build 8 cards, extract date range from each region's `days[0].date` to `days[last].date`, format as "Jan 27 – Jan 30" style, set `background-image` from `region.heroPhoto`, insert region name and date range as overlay text
- [X] T011 [US2] Add hero photo fallback in `js/landing-page.js` — when `region.heroPhoto` is empty/missing, find the region's matching trip segment color from `tripSegments` and apply a solid gradient background using that color. Also add an "Explore the Map" button below the grid (needed for US4 but placed here as grid chrome).

**Checkpoint**: Card grid renders with all 8 regions, correct names/dates, hero photos (or color fallbacks). Responsive at 1440px and 375px.

---

## Phase 5: User Story 3 - Region Card Detail View (Priority: P1)

**Goal**: Clicking a region card expands it into a full-page takeover with summary, places/dates, mini-map, and photo thumbnails.

**Independent Test**: Click any region card — it animates to fullscreen showing all 4 content sections. Click close — it collapses back to the grid.

### Implementation for User Story 3

- [X] T012 [P] [US3] Build detail view layout CSS in `css/landing-page.css` — `.landing-detail` full-viewport container, scrollable content area, sections for `.detail-summary`, `.detail-places`, `.detail-map`, `.detail-photos`. Close button positioned top-right. Content layout: single column on mobile, two-column on desktop (summary+places left, map+photos right). Transition styles for expand/collapse animation using `transform` + `opacity`
- [X] T013 [US3] Implement card-to-detail expand animation in `js/landing-page.js` — on card click: capture card `getBoundingClientRect()`, create/show `.landing-detail` positioned at that rect via `transform: translate(X,Y) scale(Sx,Sy)`, trigger reflow, then transition to `transform: translate(0,0) scale(1)` via CSS class toggle. Hide card grid after animation starts. Use `will-change: transform` during animation, remove after.
- [X] T014 [US3] Implement detail content: summary and places/dates in `js/landing-page.js` — populate `.detail-summary` with `region.summary` (fallback to first day's notes if empty). Populate `.detail-places` by iterating `region.days[]` and rendering each as a date + notes line item.
- [X] T015 [US3] Implement detail content: lazy mini Leaflet map in `js/landing-page.js` — create a new `L.map()` instance in `.detail-map` container (300x200 desktop, full-width mobile), center on `region.lat/lng` at zoom 10, add same tile layer URL as main map, add a single marker at region center. Disable zoom/pan controls. Destroy map instance on detail close via `map.remove()`.
- [X] T016 [US3] Implement detail content: photo thumbnail grid in `js/landing-page.js` — filter `allPhotos` by region date range, render up to 30 thumbnails as `<img>` in a CSS grid (`.detail-photos-grid` in `css/landing-page.css` — `grid-template-columns: repeat(auto-fill, minmax(80px, 1fr))`, square crop via `aspect-ratio: 1` + `object-fit: cover`). If more than 30, show "+N more — view on map" link.
- [X] T017 [US3] Implement detail close/collapse in `js/landing-page.js` — close button click and Escape key handler. Reverse the expand animation (transition detail back to original card rect). After animation ends, destroy mini-map, hide detail, show card grid. Clean up `will-change`.

**Checkpoint**: Full detail view works — expand, all 4 sections render with correct data, collapse. Smooth animations at 60fps.

---

## Phase 6: User Story 4 - Transition to Full Map Experience (Priority: P2)

**Goal**: Visitor can exit the landing page into the full interactive map via a show/hide transition.

**Independent Test**: Click "Explore the Map" from the card grid — landing page fades out, map and panels appear. Click "View on map" from a region detail — map appears zoomed to that region.

### Implementation for User Story 4

- [X] T018 [US4] Implement "Explore the Map" button behavior in `js/landing-page.js` — on click: fade out `#landing-page` (`opacity: 0`, then `display: none` after transition), call `onEnterMap({ region: null })` callback. The callback in the main inline script unhides `#feed-sidebar`, `#photo-wall-panel`, and restores normal app state.
- [X] T019 [US4] Implement "View on map" link in detail view in `js/landing-page.js` — add a "View on map" button/link in the detail view header or near the mini-map. On click: close detail, fade out landing page, call `onEnterMap({ region: regionData })`. The main app callback zooms the map to the region center and filters photos/routes to that region (reuse existing `region-nav.js` selection logic).
- [X] T020 [US4] Implement `onEnterMap` callback in main inline `<script>` in `index.html` — when called with `{ region: null }`: show sidebar, show photo wall, invalidate map size. When called with `{ region: regionData }`: additionally fly map to region center and trigger region selection via existing region-nav module.

**Checkpoint**: Landing page → map transition works in both directions (global and region-specific). Existing map functionality intact.

---

## Phase 7: Polish & Cross-Cutting Concerns (Round 1)

**Purpose**: Edge cases, performance, and final visual verification

- [X] T021 [P] Handle edge cases in `js/landing-page.js` — (a) region with no photos: show "No photos yet" in detail photo section, (b) missing summary: use first day's notes, (c) missing heroPhoto: color gradient fallback (covered in T011, verify), (d) window resize during detail view: re-center mini-map and adjust layout
- [X] T022 [P] Performance polish in `css/landing-page.css` and `js/landing-page.js` — lazy-load hero images (only set `background-image` when cards are visible, not during intro), add `loading="lazy"` to thumbnail `<img>` tags, ensure `will-change` is only applied during active animations and removed after
- [X] T023 Visual verification: screenshot `localhost:8000` at 1440px — verify intro screen, card grid (4x2), detail view, and map transition
- [X] T024 Visual verification: screenshot `localhost:8000` at 375px — verify intro screen, card grid (2x4 or stacked), detail view (single column), and map transition
- [X] T025 Run `quickstart.md` validation — follow all 8 test steps from quickstart.md and verify each passes

---

## Phase 8: Region Detail Photo Viewer Integration (Priority: P1)

**Goal**: Make photo thumbnails in the region detail view clickable, opening the existing immersive photo viewer. Change the overflow button to a "View on map" shortcut.

**Independent Test**: Open a region detail view, click any photo thumbnail — the immersive photo viewer opens at that photo. Navigate through photos with swipe/arrows. Close viewer — detail view remains expanded. For regions with >30 photos, the overflow button reads "View on map" and navigates to the map zoomed to that region.

**Depends on**: Phase 5 (US3 detail view) — all tasks complete.

### Implementation for Phase 8

- [X] T026 [P] [US3] Add clickable thumbnail styles in `css/landing-page.css` — add `cursor: pointer` to `.detail-photos-grid img`, add hover state with subtle scale or brightness change (`transform: scale(1.05)` or `filter: brightness(1.1)` on hover with `transition: transform 0.15s ease`), ensure touch targets are large enough (min 44x44px per constitution III)
- [X] T027 [US3] Add delegated click handler for photo thumbnails in `js/landing-page.js` — in the detail view rendering function (near line 256), after building the photo grid HTML, attach a click listener on `.detail-photos-grid` that: (a) identifies the clicked `<img>` element, (b) determines its index among sibling `<img>` elements, (c) gets the full photo array from `getPhotosForRegion(region)`, (d) calls `window.photoViewer.open(photos, clickedIndex, imgElement)` where `imgElement` is the clicked `<img>` for animation origin
- [X] T028 [US3] Change overflow button text in `js/landing-page.js` — modify the overflow button creation (near line 260) from `'+' + (photos.length - MAX_THUMBNAILS) + ' more \u2014 view on map'` to just `'View on map'`. Keep the existing `data-region-index` attribute and existing click handler that navigates to the map.
- [X] T029 Visual verification at 1440px: open region detail, click a thumbnail — verify photo viewer opens, navigate photos, close viewer — verify detail view remains expanded and interactive
- [X] T030 Visual verification at 375px: repeat T029 on mobile viewport — verify touch targets are adequate, photo viewer opens/closes correctly, detail view stays open

**Checkpoint**: Photo thumbnails in region details open the immersive viewer. Overflow button reads "View on map". Closing the viewer returns to the detail view.

---

## Phase 9: Foundational — ViewportSampler Refactor (Blocking)

**Purpose**: Convert ViewportSampler from singleton IIFE to constructor function to enable dual instances (main map + detail map)

**CRITICAL**: Phases 10-12 cannot begin until this phase is complete. The main map must remain fully functional after this refactor.

- [X] T031 Refactor `js/ViewportSampler.js` from singleton IIFE to constructor function — change `(function() { ... window.ViewportSampler = { init, stop, ... }; })()` to `window.ViewportSampler = function ViewportSampler() { ... return { init, stop, update, setPhotos, setCellSize, updateIconSize, getBounds }; };`. Move all module-scope variables (`_map`, `_photos`, `_markers`, `_layerGroup`, `_cellSize`, `_iconSize`, `_onClickHandler`, `_favGetter`) inside the constructor body so each `new ViewportSampler()` gets independent state. All internal functions (`update`, `createMarker`, `getSizeTier`, etc.) remain as closures over instance state — no public API change.
- [X] T032 Update all `ViewportSampler` references in `index.html` — replace direct calls (`ViewportSampler.init(...)`, `ViewportSampler.setPhotos(...)`, `ViewportSampler.update()`, `ViewportSampler.setCellSize(...)`, `ViewportSampler.updateIconSize(...)`) with instance calls on a new `var mainSampler = new ViewportSampler()` variable. Grep for every occurrence of `ViewportSampler.` in the inline `<script>` block to ensure none are missed.
- [X] T033 Update any `ViewportSampler` references in `js/region-nav.js` — if region-nav.js calls ViewportSampler directly (check via grep), update to use the mainSampler instance passed as a callback or parameter. If it uses callbacks (`_rebuildPhotoLayer`) that internally call ViewportSampler, no change needed in region-nav.js itself.
- [X] T034 Smoke-test main map after refactor — load `localhost:8000`, dismiss intro, enter full map. Verify: photo clusters render on the main map, panning/zooming updates clusters correctly, clicking a cluster opens photo viewer, region filtering via region-nav still works. Screenshot at 1440px.

**Checkpoint**: ViewportSampler is a constructor function. `new ViewportSampler()` creates independent instances. Main map works identically to before.

---

## Phase 10: US3 Enhancement — Interactive Detail Map (Priority: P1)

**Goal**: Replace the static mini-map (circle marker, no interaction) with a fully interactive Leaflet map showing photo clusters via ViewportSampler, pre-initialized during the intro animation for instant interactivity on card open.

**Independent Test**: Open any region detail — map section shows photo clusters (tier-based markers) fitted to the region. Pan and zoom respond instantly. Click a cluster — photo viewer opens. Close detail — no errors.

**Depends on**: Phase 9 (ViewportSampler refactor)

### Implementation

- [X] T035 [P] [US3] Add detail map section CSS in `css/landing-page.css` — replace existing `.detail-map` styles with a new `.detail-map-section` class: `width: 100%; height: 50vh; border-radius: 12px; overflow: hidden; position: relative;`. Add `@media (max-width: 768px) { .detail-map-section { height: 40vh; } }`. Ensure the map section has `z-index: 0` to sit below overlays.
- [X] T036 [US3] Restructure detail view HTML generation in `js/landing-page.js` — modify `openDetail()` to produce a new layout: full-width `.detail-map-section` div at the top (replaces the old right-column `.detail-map`), followed by stacked `.detail-content` div containing summary, places/dates, and photo grid. Remove the two-column layout for the map row. Keep header (title, close button, "View on map" button) above the map section.
- [X] T037 [US3] Pre-initialize hidden detail map during intro animation in `js/landing-page.js` — in `setupIntro()`, after starting the 3.5s timer: (a) create a hidden `<div id="detail-map-holder" style="width:1px;height:1px;position:absolute;left:-9999px">` appended to `_container`, (b) initialize `_detailMap = L.map('detail-map-holder', { zoomControl: false, attributionControl: false, dragging: !(window.innerWidth <= 768), scrollWheelZoom: !(window.innerWidth <= 768), touchZoom: true, doubleClickZoom: true })` with CARTO dark tiles (`TILE_URL`), (c) create `_detailSampler = new ViewportSampler()` and call `_detailSampler.init(_detailMap, [], { onClick: onDetailPhotoClick })` where `onDetailPhotoClick` calls `window.photoViewer.open()`. Store `_detailMap` and `_detailSampler` in module state alongside existing `_miniMap`.
- [X] T038 [US3] Wire detail map into card open/close cycle in `js/landing-page.js` — **On card open** (in `openDetail()`, replacing `initMiniMap()`): (a) move `#detail-map-holder` into the `.detail-map-section` container, (b) call `_detailMap.invalidateSize()`, (c) compute region photo bounds via `L.latLngBounds(regionPhotos.map(function(p) { return [p.lat, p.lng]; }))`, (d) call `_detailMap.fitBounds(regionBounds, { padding: [30, 30] })`, (e) call `_detailSampler.setPhotos(regionPhotos)` then `_detailSampler.update()`. Store `_regionBounds` for escalation use. **On card close** (in `closeDetail()`, replacing `_miniMap.remove()`): (a) call `_detailSampler.setPhotos([])`, (b) move `#detail-map-holder` back to hidden position (`_container.appendChild`), (c) remove any `moveend` listeners. Do NOT call `_detailMap.remove()` — keep the instance alive for reuse.
- [X] T039 [US3] Implement `onDetailPhotoClick` handler in `js/landing-page.js` — when a photo cluster marker on the detail map is clicked: (a) get the clicked photo from the marker's `.photo` property, (b) find its index in the current region's photo array, (c) call `window.photoViewer.open(regionPhotos, clickedIndex, marker._icon)`. Ensure the photo viewer z-index override (`--z-viewer: 3000` from R4d) keeps the viewer above the detail view.

**Checkpoint**: Detail map shows interactive photo clusters on card open. Clusters respond to pan/zoom. Clicking a cluster opens the photo viewer. Map instance persists between card open/close cycles.

---

## Phase 11: US3 Enhancement — Mobile Two-Finger Gesture Handler (Priority: P1)

**Goal**: On mobile, single-finger drags scroll the detail view while two-finger gestures pan/zoom the map. A hint overlay appears on first single-finger drag attempt.

**Independent Test**: At 375px viewport — single-finger drag on map scrolls the detail. Two-finger drag pans the map. "Use two fingers to move the map" overlay appears once on first single-finger touch, auto-dismisses.

**Depends on**: Phase 10 (detail map exists)

### Implementation

- [X] T040 [P] [US3] Add gesture overlay and hint CSS in `css/landing-page.css` — `.map-gesture-overlay` positioned absolutely over `.detail-map-section`, `display: none` by default, centered text "Use two fingers to move the map" on a semi-transparent dark backdrop (`background: rgba(0,0,0,0.6)`), `border-radius: 8px`, `padding: 12px 20px`, `color: white`, `font-size: 14px`, `pointer-events: none`, `z-index: 10`. Add `.map-gesture-overlay--visible` class with `display: flex; align-items: center; justify-content: center;`. Fade-out transition via `opacity` with 300ms duration.
- [X] T041 [US3] Implement two-finger pan handler in `js/landing-page.js` — add to the detail map initialization (after T037): (a) detect mobile via `window.innerWidth <= 768`, (b) if mobile, add `pointerdown`/`pointermove`/`pointerup`/`pointercancel` listeners on `_detailMap.getContainer()`, (c) track active pointer IDs in an array, (d) when 2+ pointers: compute centroid from current positions, on `pointermove` compute delta from previous centroid, call `_detailMap.panBy([-(dx), -(dy)], { animate: false })`, (e) when pointers drop below 2: stop panning. Set `touch-action: pan-y` CSS on the map container so single-finger vertical scroll passes through to the detail view.
- [X] T042 [US3] Implement gesture overlay show/dismiss logic in `js/landing-page.js` — (a) inject `.map-gesture-overlay` div into `.detail-map-section` during detail map setup, (b) on first single-finger `touchstart` on the map container (detected via pointer count === 1): show the overlay by adding `--visible` class, (c) auto-dismiss after 2 seconds via `setTimeout`, (d) also dismiss immediately if user performs a two-finger gesture, (e) store `sessionStorage.setItem('mapGestureHintShown', '1')` after first show, skip hint on subsequent card opens within the same session.

**Checkpoint**: Mobile scroll/drag conflict resolved. Single-finger scrolls detail view. Two-finger pans map. Hint appears once and auto-dismisses.

---

## Phase 12: US4 Enhancement — Out-of-Bounds Escalation (Priority: P2)

**Goal**: When the user pans the detail map far beyond the region's photo extent, a prompt offers to switch to the fullscreen main map with all photos at the current viewport position.

**Independent Test**: Open a region detail, pan the map far away from the region. "Explore the full map?" prompt appears. Accept — transitions to fullscreen map at current viewport. Dismiss — prompt hides, reappears only if user returns to region then leaves again.

**Depends on**: Phase 10 (detail map with region bounds)

### Implementation

- [X] T043 [P] [US4] Add escalation prompt CSS in `css/landing-page.css` — `.map-escalation-prompt` positioned absolutely at the bottom center of `.detail-map-section`, `display: none` by default, dark glass panel style (`background: rgba(20,20,20,0.85); backdrop-filter: blur(8px)`), `border-radius: 10px`, `padding: 10px 16px`, contains text + two buttons ("Explore full map" primary, "Dismiss" secondary). Add `.map-escalation-prompt--visible` with `display: flex`. Slide-up entrance animation via `transform: translateY(10px)` → `translateY(0)`.
- [X] T044 [US4] Implement bounds overlap computation in `js/landing-page.js` — add helper function `boundsOverlapRatio(viewBounds, regionBounds)`: (a) check `viewBounds.intersects(regionBounds)`, if false return 0, (b) compute intersection bounds by clamping lat/lng, (c) approximate area of intersection and viewport as `(ne.lat - sw.lat) * (ne.lng - sw.lng)`, (d) return `intersectionArea / viewportArea`. Add `moveend` listener on `_detailMap` (attached during card open in T038): if `boundsOverlapRatio < 0.2` and `!_escalationDismissed`, show escalation prompt.
- [X] T045 [US4] Wire escalation prompt behavior in `js/landing-page.js` — (a) inject `.map-escalation-prompt` div into `.detail-map-section` during detail map setup, (b) "Explore full map" button click: call `enterMapFromDetail(currentRegionIndex)` with additional viewport data — modify `enterMapFromDetail()` to pass `{ center: _detailMap.getCenter(), zoom: _detailMap.getZoom() }` to `onEnterMap` callback, and update the `onEnterMap` handler in `index.html` to use these coordinates instead of flying to region center, (c) "Dismiss" button click: hide prompt, set `_escalationDismissed = true`, (d) reset `_escalationDismissed` on next card open or when overlap returns above 0.5, (e) auto-hide prompt if user pans back into region bounds (overlap >= 0.2).

**Checkpoint**: Out-of-bounds escalation works. Prompt appears at ~20% overlap, accept transitions smoothly, dismiss suppresses re-trigger until re-entry.

---

## Phase 13: Polish & Cross-Cutting Concerns (Round 2)

**Purpose**: Edge cases, integration verification, and final visual sign-off for the interactive map feature

- [X] T046 Handle detail map edge cases in `js/landing-page.js` — (a) region with no photos: show map centered on `region.lat/lng` at zoom 10 with no clusters (empty ViewportSampler), (b) region with 1 photo: map centers on that single photo, ViewportSampler shows one tier-0 marker, (c) window resize while detail open: call `_detailMap.invalidateSize()` on `resize` event (debounced 200ms), (d) detail opened before intro map finishes loading: guard with `_detailMap` null check
- [X] T047 [P] Verify main map is unaffected — after all changes, enter the full map from landing page. Verify: photo clusters render, density sampling works on pan/zoom, clicking a cluster opens photo viewer, region-nav filtering works, photo wall syncs correctly. This confirms ViewportSampler refactor (T031-T033) introduced no regressions.
- [X] T048 Visual verification at 1440px: screenshot `localhost:8000` — open a region detail, verify 50vh interactive map with photo clusters, scroll to see summary/places/photos below. Pan/zoom map, click a cluster to open viewer.
- [X] T049 Visual verification at 375px: screenshot `localhost:8000` — open a region detail, verify 40vh map, single-finger scroll works, two-finger pan works, gesture overlay appears, escalation prompt triggers on far pan.
- [X] T050 Run updated `quickstart.md` validation — follow all 14 test steps from quickstart.md and verify each passes.

**Checkpoint**: Interactive detail map feature complete. Main map unaffected. All edge cases handled. Responsive at both viewports.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — COMPLETE
- **Foundational (Phase 2)**: Depends on Setup — COMPLETE
- **User Story 1 (Phase 3)**: Depends on Foundational — COMPLETE
- **User Story 2 (Phase 4)**: Depends on Foundational — COMPLETE
- **User Story 3 (Phase 5)**: Depends on US2 — COMPLETE
- **User Story 4 (Phase 6)**: Depends on US2 — COMPLETE
- **Polish Round 1 (Phase 7)**: COMPLETE
- **Photo Viewer Integration (Phase 8)**: COMPLETE
- **ViewportSampler Refactor (Phase 9)**: No dependencies on incomplete work — BLOCKS Phases 10-12
- **Interactive Detail Map (Phase 10)**: Depends on Phase 9
- **Two-Finger Gestures (Phase 11)**: Depends on Phase 10
- **Out-of-Bounds Escalation (Phase 12)**: Depends on Phase 10 (can parallel with Phase 11)
- **Polish Round 2 (Phase 13)**: Depends on Phases 10-12

### New Task Dependencies (Phases 9-13)

```
Phase 9: T031 → T032 → T033 → T034 (sequential — each builds on prior)
Phase 10: T035 [P] | T036 → T037 → T038 → T039 (CSS parallel, JS sequential)
Phase 11: T040 [P] | T041 → T042 (CSS parallel with JS)
Phase 12: T043 [P] | T044 → T045 (CSS parallel with JS)
Phase 13: T046, T047 [P] → T048 → T049 → T050 (code first, then verify)
```

### Parallel Opportunities

**Phase 10 + 11**: T035 (map CSS) and T040 (gesture CSS) can run in parallel — different CSS blocks
**Phase 10 + 12**: T035 (map CSS) and T043 (escalation CSS) can run in parallel
**Phase 11 + 12**: T041 (gesture JS) and T044 (bounds JS) work on different functions — can partially overlap after T038
**Phase 13**: T046 and T047 can run in parallel (different concerns)

---

## Parallel Example: Phases 10-12

```bash
# CSS tasks can all run in parallel (different class blocks):
Task T035: "Detail map section CSS in css/landing-page.css"         # [P]
Task T040: "Gesture overlay CSS in css/landing-page.css"            # [P]
Task T043: "Escalation prompt CSS in css/landing-page.css"          # [P]

# Then sequential JS core:
Task T036: "Restructure detail HTML generation in js/landing-page.js"
Task T037: "Pre-initialize hidden detail map in js/landing-page.js"
Task T038: "Wire detail map into card open/close in js/landing-page.js"

# Then parallel JS features (independent functions, same file):
Task T039: "Detail photo cluster click handler"       # depends on T038
Task T041: "Two-finger pan handler"                   # depends on T037
Task T044: "Bounds overlap computation"               # depends on T038

# Then wiring (sequential within each feature):
Task T042: "Gesture overlay show/dismiss logic"       # depends on T041
Task T045: "Escalation prompt behavior"               # depends on T044
```

---

## Implementation Strategy

### MVP Scope: Phase 9 + 10 (ViewportSampler Refactor + Interactive Map)

1. Complete Phase 9: ViewportSampler refactor (4 tasks)
2. Complete Phase 10: Interactive detail map (5 tasks)
3. **STOP and VALIDATE**: Photo clusters on detail map, pan/zoom works, cluster click opens viewer
4. This is a shippable increment — the detail map is interactive with photo clusters

### Full Feature Delivery

1. Phase 9: ViewportSampler refactor → Smoke test main map
2. Phase 10: Interactive detail map → Test cluster display and interaction
3. Phase 11: Two-finger gestures → Test mobile scroll/pan behavior
4. Phase 12: Out-of-bounds escalation → Test prompt trigger and transition
5. Phase 13: Polish → Full verification at both viewports

### Recommended Execution: Sequential by phase

Single-developer project. Execute phases 9-13 in order. Commit after each phase checkpoint. Phase 9 (refactor) is the riskiest — verify thoroughly before proceeding.

---

## Summary

| Phase | Tasks | New | Status |
|-------|-------|-----|--------|
| 1: Setup | T001-T003 | — | COMPLETE |
| 2: Foundational | T004-T005 | — | COMPLETE |
| 3: US1 Intro | T006-T008 | — | COMPLETE |
| 4: US2 Card Grid | T009-T011 | — | COMPLETE |
| 5: US3 Detail View | T012-T017 | — | COMPLETE |
| 6: US4 Map Transition | T018-T020 | — | COMPLETE |
| 7: Polish Round 1 | T021-T025 | — | COMPLETE |
| 8: Photo Viewer | T026-T030 | — | COMPLETE |
| **9: ViewportSampler Refactor** | **T031-T034** | **4** | TODO |
| **10: Interactive Detail Map** | **T035-T039** | **5** | TODO |
| **11: Two-Finger Gestures** | **T040-T042** | **3** | TODO |
| **12: Out-of-Bounds Escalation** | **T043-T045** | **3** | TODO |
| **13: Polish Round 2** | **T046-T050** | **5** | TODO |
| **Total** | **T001-T050** | **20 new** | — |
