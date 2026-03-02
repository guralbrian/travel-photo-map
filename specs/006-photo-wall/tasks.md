# Tasks: Photo Wall Album View

**Input**: Design documents from `/specs/006-photo-wall/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅, quickstart.md ✅

**Tests**: No test tasks — not requested in spec. Manual validation via `quickstart.md` in Polish phase.

**Organization**: Tasks are grouped by user story. Each story phase is independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on in-progress tasks)
- **[Story]**: Which user story this task belongs to

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the new files and wire them into the existing app. No logic yet — just structure.

- [x] T001 Create `frontend/js/photo-wall.js` with `PhotoWall` class scaffold — `constructor({container, photos, segments})` that stores args; empty public method stubs: `expand(state)`, `targetPhoto(photo)`, `targetDate(date)`, `relayout()`, `destroy()`; private stub comments for `_buildLayout()`, `_renderVisible()`, `_onScroll()`, `_onDrag()`; `export { PhotoWall }`
- [x] T002 [P] Create `frontend/css/photo-wall.css` with commented section headers only (no rules yet): `/* Panel Base */`, `/* Snap States */`, `/* Drag Handle */`, `/* Header */`, `/* Grid Container */`, `/* Grid Items */`, `/* Section Headers */`, `/* Date Scrubber */`, `/* Highlight Animation */`, `/* Placeholder/Loading */`, `/* Empty State */`
- [x] T003 Add `.photo-wall-panel` HTML structure to `frontend/index.html` body (after the `#feed-sidebar` div) per `contracts/photo-wall-interface.md`: outer div `class="photo-wall-panel" id="photo-wall-panel"`; child elements: `.photo-wall-handle` > `.photo-wall-handle-bar`; `.photo-wall-header` > `.photo-wall-title` span + `.photo-wall-date-label` span + `.photo-wall-collapse-btn` button (text `↓`, aria-label "Collapse photo wall"); `.photo-wall-scroll` > `.photo-wall-spacer`; `.photo-wall-scrubber` > `.photo-wall-scrubber-thumb` + `.photo-wall-scrubber-tooltip`
- [x] T004 Wire photo wall into `frontend/index.html` — add `<link rel="stylesheet" href="css/photo-wall.css">` to `<head>` after existing CSS links; inside the `Promise.all([manifestFetch, segmentsFetch])` success handler (after `buildFeed()` call), add: `import('./js/photo-wall.js').then(({ PhotoWall }) => { window.photoWall = new PhotoWall({ container: document.getElementById('photo-wall-panel'), photos: allPhotos, segments: tripSegments }); })`

**Checkpoint**: App still loads without errors; `.photo-wall-panel` div exists in DOM (empty, unstyled).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core layout engine that ALL user stories depend on. Must be complete before grid can render.

**⚠️ CRITICAL**: US1 snap behavior can be wired (T011–T012), but the grid cannot render until this phase is complete.

- [x] T005 Implement `buildDateSections(photos, segments)` in `frontend/js/photo-wall.js` — sort `photos` array by `datetime` ascending; group into `Map<date, PhotoEntry[]>` by `photo.date` (YYYY-MM-DD); for each date, call `resolveSegmentForDate(date, segments)` to get city name + color; return sorted array of `DateSection` objects: `{date, label: formatDateLabel(date, cityName), cityName, cityColor, photos: [sorted by datetime]}`; skip photos with missing/invalid `date` field
- [x] T006 [P] Implement `resolveSegmentForDate(date, segments)` helper in `frontend/js/photo-wall.js` — parse `date` (YYYY-MM-DD) to a comparable Date; iterate `segments`, return first segment where `new Date(segment.start) <= photoDate <= new Date(segment.end)`; return `{name, color}` of matching segment, or `{name: 'Unknown', color: '#888888'}` if none matches
- [x] T007 [P] Implement `computeJustifiedRows(photos, panelInnerWidth, targetRowHeight, gap)` in `frontend/js/photo-wall.js` — greedy row packing: for each photo, compute aspect ratio from `photo._naturalAspect ?? (4/3)`; accumulate photos in current row until `sum(aspect * targetRowHeight) + gap*(n-1) >= panelInnerWidth`; for each completed row: `scaleFactor = panelInnerWidth / sum(aspect * targetRowHeight + gap*(n-1))`... actually: `rowHeight = panelInnerWidth / sum_of_aspects_in_row` (where sum accounts for gaps as fixed px); return `GridRow[]` with `{photos, height, widths: [width_per_photo]}`, last row left-aligned at natural size
- [x] T008 Implement `buildLayoutCache(sections, panelInnerWidth, gap)` in `frontend/js/photo-wall.js` — iterate sections, for each: call `computeJustifiedRows(section.photos, panelInnerWidth, 160, 4)` to get `GridRow[]`; compute `section.yOffset` = cumulative sum of previous sections' `totalHeight`; compute `section.totalHeight` = header height (40px) + sum of row heights + gaps; compute absolute pixel `top/left/width/height` for each photo item; build `Map<photoUrl, GridItemPosition>`; build `Map<date, sectionIndex>`; return `{sections, totalHeight, dateToSectionIndex, photoToPosition, panelWidth: panelInnerWidth}`; expose as `this._layout`

**Checkpoint**: Call `buildLayoutCache` manually in browser console with manifest data — verify it returns a layout object with correct sections and photo positions.

---

## Phase 3: User Story 1 — Expand Photo Wall from Bottom Panel (Priority: P1) 🎯 MVP

**Goal**: A visible collapsed panel anchored to the bottom of the screen that can be dragged to snap between collapsed (~30vh), half (~50vh), and full (100vh) states with smooth animation.

**Independent Test**: Open the app → collapsed panel strip visible at bottom → drag handle upward → panel grows smoothly → release near 50% → snaps to half-screen → drag up fully → full-screen (map hidden behind) → drag/collapse button → returns to collapsed. No photos required to verify snap behavior.

- [x] T009 [US1] Add panel base and handle CSS to `frontend/css/photo-wall.css` — `.photo-wall-panel`: `position:fixed; bottom:0; left:0; right:0; z-index:1000; background:rgba(24,24,28,0.95); backdrop-filter:blur(16px); border-radius:12px 12px 0 0; display:flex; flex-direction:column; overflow:hidden`; `.photo-wall-handle`: `display:flex; justify-content:center; padding:8px 0; cursor:grab; flex-shrink:0`; `.photo-wall-handle-bar`: `width:40px; height:4px; border-radius:2px; background:rgba(255,255,255,0.2)`; `.photo-wall-header`: `display:flex; align-items:center; padding:0 12px 8px; gap:8px; flex-shrink:0`; `.photo-wall-title`: `font-size:14px; font-weight:600; color:#e8e6e3`; `.photo-wall-collapse-btn`: `margin-left:auto; width:28px; height:28px; border-radius:50%; background:rgba(255,255,255,0.08); border:none; color:#e8e6e3; cursor:pointer; font-size:14px; display:flex; align-items:center; justify-content:center`
- [x] T010 [US1] Add snap-state and transition CSS to `frontend/css/photo-wall.css` — define `--wall-collapsed-height:30vh; --wall-half-height:50vh` on `:root`; `.photo-wall-panel--collapsed {height:var(--wall-collapsed-height)}`, `.photo-wall-panel--half {height:var(--wall-half-height)}`, `.photo-wall-panel--full {height:100vh; z-index:1003}`; `.photo-wall-panel--animating {transition: height 250ms cubic-bezier(0.22, 1, 0.36, 1)}`
- [x] T011 [US1] Implement `PanelSnap` class in `frontend/js/photo-wall.js` — `constructor({panelEl, handleEl, collapseBtn, onStateChange})`: attach `pointerdown` on `handleEl`; on `pointerdown`: record `startY = e.clientY`, `startHeight = panelEl.offsetHeight`, call `handleEl.setPointerCapture(e.pointerId)`; on `pointermove`: compute `deltaY = startY - e.clientY`; set `panelEl.style.height = Math.max(0, Math.min(window.innerHeight, startHeight + deltaY))+'px'`; track velocity using a rolling window of last 5 `{y, t}` samples; on `pointerup`: remove inline height, determine snap target (collapsed/half/full) by comparing velocity and final height to thresholds (velocity > 80 toward full → full; velocity > 80 toward collapsed → collapsed; else nearest based on `panelEl.offsetHeight` vs `vh` values); call `snapTo(target)`; `snapTo(state)` method: add `--animating` class, remove all snap classes, add new snap class, set `this.currentState = state`, `setTimeout(() => panelEl.classList.remove('--animating'), 280)`; call `onStateChange(state)`; wire `collapseBtn` click to `snapTo('collapsed')`; expose `currentState` getter; handle `pointercancel` by calling `snapTo(currentState)` to reset
- [x] T012 [US1] Initialize `PanelSnap` in `PhotoWall.constructor()` in `frontend/js/photo-wall.js` — after storing args, call `this._buildLayout()` (runs `buildLayoutCache` on `this.photos` and `this.segments`); instantiate `this._snap = new PanelSnap({panelEl: container, handleEl: container.querySelector('.photo-wall-handle'), collapseBtn: container.querySelector('.photo-wall-collapse-btn'), onStateChange: state => { this._onSnapStateChange(state); document.dispatchEvent(new CustomEvent('photo-wall:state-changed', {detail:{state}})); }})`; set initial class `container.classList.add('photo-wall-panel--collapsed')`; implement `expand(state)` method to call `this._snap.snapTo(state)`

**Checkpoint**: Panel snaps to all three states with smooth animation. Collapse button works. `photo-wall:state-changed` event fires in the browser console.

---

## Phase 4: User Story 2 — Browse Photos Chronologically in Grid View (Priority: P1)

**Goal**: All trip photos rendered in a justified grid inside the panel, organized by date sections with sticky headers. A date scrubber on the right edge enables fast date jumping. Virtual scrolling keeps performance smooth.

**Independent Test**: Expand panel to half or full screen → see all photos in justified rows (varying widths, same height per row) → date section headers visible and colored by city → scroll through full collection → drag scrubber → grid jumps to correct date → click any photo (viewer opens in Phase 5, but clicking should at least emit a console-loggable event).

- [x] T013 [P] [US2] Add grid container and item CSS to `frontend/css/photo-wall.css` — `.photo-wall-scroll`: `flex:1; overflow-y:auto; overflow-x:hidden; position:relative; -webkit-overflow-scrolling:touch`; `.photo-wall-spacer`: `position:absolute; top:0; left:0; width:1px` (height set by JS); `.photo-wall-item`: `position:absolute; overflow:hidden; border-radius:2px; cursor:pointer; background:rgba(255,255,255,0.06)`; `.photo-wall-item img`: `width:100%; height:100%; object-fit:cover; display:block; opacity:0; transition:opacity 200ms`; `.photo-wall-item img.loaded`: `opacity:1`; `.photo-wall-item--video::after`: content `▶`; centered overlay with semi-transparent background; `@keyframes shimmer`: left-to-right shimmer animation; `.photo-wall-item--loading`: `background:linear-gradient(90deg, #1e1e22 25%, #2a2a30 50%, #1e1e22 75%); background-size:400px 100%; animation:shimmer 1.5s infinite`
- [x] T014 [P] [US2] Add section header and sticky header CSS to `frontend/css/photo-wall.css` — `.photo-wall-section-header`: `position:absolute; left:0; right:20px; height:40px; display:flex; align-items:center; padding:0 12px; border-left:3px solid var(--section-color,#888); font-size:12px; font-weight:600; color:#e8e6e3; letter-spacing:0.03em; background:rgba(24,24,28,0.85)`; `.photo-wall-sticky-header`: `position:sticky; top:0; left:0; right:20px; height:40px; z-index:10` (same visual styles); `.photo-wall-date-label` in header: shows current section's date while scrolling
- [x] T015 [US2] Implement `renderGrid()` and scroll listener in `frontend/js/photo-wall.js` — `renderGrid()`: set `.photo-wall-spacer` style to `position:absolute; top:0; left:0; width:1px; height:${this._layout.totalHeight}px`; insert a sticky header element `.photo-wall-sticky-header` as first child of `.photo-wall-scroll`; call `renderVisibleRows()`; add scroll listener: `this._scrollEl.addEventListener('scroll', () => this._onScroll(), {passive:true})`; `_onScroll()` calls `renderVisibleRows()` and `updateStickyHeader()`; call `renderGrid()` at the end of `PhotoWall.constructor()` after `_buildLayout()`
- [x] T016 [US2] Implement `renderVisibleRows(scrollTop, panelHeight)` in `frontend/js/photo-wall.js` — default args from `this._scrollEl.scrollTop` and `this._scrollEl.clientHeight`; compute buffer = `panelHeight * 1.5`; visible range: `[scrollTop - buffer, scrollTop + panelHeight + buffer]`; for each `section` in `this._layout.sections`: if `section.yOffset + section.totalHeight < visibleTop` or `section.yOffset > visibleBottom`, skip; else: ensure section header div exists in DOM (create if not, set `style.top`, `style.left`, inject label text with `--section-color` CSS var); for each `row` in `section.gridRows`: if row range outside visible, remove any existing item divs for those photos; if row in range: for each photo in row, ensure `.photo-wall-item` div exists (create if not): set `style.top/left/width/height` from `GridItemPosition`; inject `<img loading="lazy" src="${photo.thumbnail}">` if not already present; attach `onload` → add class `loaded` + trigger aspect-ratio correction; set `data-photo-url`; add video overlay if `photo.type === 'video'`; maintain `this._activeItems = new Map()` of `url → element` for efficient updates; remove items not in active set
- [x] T017 [US2] Implement sticky section header update in `frontend/js/photo-wall.js` — `updateStickyHeader(scrollTop)`: find the last section whose `yOffset <= scrollTop`; that is the "current" section; update `.photo-wall-sticky-header` text content and `--section-color` CSS variable to that section's `label` and `cityColor`; also update `.photo-wall-date-label` in the panel header; show sticky header only when at least one section header has scrolled above the panel top
- [x] T018 [US2] Implement aspect ratio correction on image load in `frontend/js/photo-wall.js` — in the `img.onload` handler added in T016: `const aspect = img.naturalWidth / img.naturalHeight`; retrieve the photo's stored aspect from `photo._naturalAspect`; if `Math.abs(aspect - (photo._naturalAspect ?? 4/3)) > 0.05`: set `photo._naturalAspect = aspect`; mark the photo's section as `_layoutDirty = true`; debounce (100ms) a call to `_recomputeDirtySections()` which recomputes only dirty sections' `GridRow[]` and updates their items' positions without a full rebuild
- [x] T019 [P] [US2] Add date scrubber CSS to `frontend/css/photo-wall.css` — `.photo-wall-scrubber`: `position:absolute; right:0; top:48px; bottom:0; width:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; z-index:5`; `.photo-wall-scrubber-thumb`: `width:6px; height:6px; border-radius:50%; background:#d4a853; position:absolute`; `.photo-wall-scrubber-tooltip`: `position:absolute; right:24px; background:rgba(24,24,28,0.95); color:#e8e6e3; font-size:11px; padding:2px 6px; border-radius:4px; white-space:nowrap; opacity:0; transition:opacity 150ms`; `.photo-wall-scrubber-tooltip.visible`: `opacity:1`
- [x] T020 [US2] Implement `DateScrubber` class in `frontend/js/photo-wall.js` — `constructor({scrubberEl, thumbEl, tooltipEl, onDateSelect})`: attach `pointerdown` on `scrubberEl`; on drag: compute `ratio = (e.clientY - scrubberRect.top) / scrubberRect.height`, clamp to [0,1]; map ratio to section index: `sectionIdx = Math.floor(ratio * sections.length)`, clamped; call `onDateSelect(sections[sectionIdx])` with the section; set `thumbEl.style.top = ratio * scrubberRect.height - 3 + 'px'`; update tooltip text with `section.label`; show tooltip; on `pointerup`: hide tooltip after 1000ms; instantiate in `PhotoWall.constructor()` with `onDateSelect: (section) => { this._scrollEl.scrollTop = section.yOffset; }`; update scrubber thumb position on scroll to reflect current date position

**Checkpoint**: Panel fully expanded shows justified photo grid. Date headers stick correctly. Scrubber jumps to dates. Scrolling is smooth through all 570 photos. DOM count stays ≤ 100 items.

---

## Phase 5: User Story 3 — Map-to-Wall Navigation (Priority: P1)

**Goal**: Bidirectional navigation: clicking a map photo marker expands the wall and scrolls to that photo; clicking a photo in the wall opens the immersive viewer and pans the map.

**Independent Test**: Click a photo marker on the map → wall expands to half-screen → grid scrolls to that photo's date section → photo briefly glows → click a photo in the grid → immersive viewer opens for that photo → dismiss viewer → map has panned to that photo's location.

- [x] T021 [P] [US3] Dispatch `photo-wall:target` from map click handler in `frontend/index.html` — inside `onPhotoClick(e)` function (where `window.photoViewer.open(...)` is called): add after the `photoViewer.open` call: `if (window.photoWall) { document.dispatchEvent(new CustomEvent('photo-wall:target', { detail: { photo: allPhotos[photoIndex] } })); }` where `photoIndex` is the index of the clicked photo in `allPhotos`
- [x] T022 [P] [US3] Dispatch `photo-wall:target-date` from trip feed entry click handler in `frontend/index.html` — in the feed entry click handler (where `map.flyToBounds(...)` is called): add: `if (window.photoWall) { document.dispatchEvent(new CustomEvent('photo-wall:target-date', { detail: { date: entry.date } })); }` where `entry.date` is the YYYY-MM-DD date of the clicked feed entry
- [x] T023 [US3] Handle `photo-wall:target` event in `frontend/js/photo-wall.js` — in `PhotoWall.constructor()`, add: `document.addEventListener('photo-wall:target', e => this._onTargetPhoto(e.detail.photo))`; implement `_onTargetPhoto(photo)`: if `this._snap.currentState === 'collapsed'` call `this._snap.snapTo('half')`; look up photo position via `this._layout.photoToPosition.get(photo.url)`; if found: `this._scrollEl.scrollTo({top: pos.top - 60, behavior: 'smooth'})`; after 350ms (scroll settle), call `_highlightPhoto(photo.url)`; `_highlightPhoto(url)`: find element via `this._activeItems.get(url)` (may need to force-render if not in viewport — call `renderVisibleRows()` first); add class `photo-wall-item--highlight`; remove after 2000ms
- [x] T024 [US3] Handle `photo-wall:target-date` event in `frontend/js/photo-wall.js` — add: `document.addEventListener('photo-wall:target-date', e => this._onTargetDate(e.detail.date))`; implement `_onTargetDate(date)`: if `collapsed` → `snapTo('half')`; look up `this._layout.dateToSectionIndex.get(date)`, get section `yOffset`; `this._scrollEl.scrollTo({top: section.yOffset, behavior:'smooth'})`
- [x] T025 [P] [US3] Add highlight animation CSS to `frontend/css/photo-wall.css` — `@keyframes photo-wall-pulse { 0% { box-shadow: 0 0 0 0 rgba(212,168,83,0.8); } 50% { box-shadow: 0 0 0 6px rgba(212,168,83,0.4); } 100% { box-shadow: 0 0 0 0 rgba(212,168,83,0); } }`; `.photo-wall-item--highlight { animation: photo-wall-pulse 2s ease-out; outline: 2px solid rgba(212,168,83,0.7); z-index:1; }`
- [x] T026 [US3] Implement grid photo click dispatch in `frontend/js/photo-wall.js` — add a single delegated click listener on `this._scrollEl`; `_scrollEl.addEventListener('click', e => { const item = e.target.closest('.photo-wall-item'); if (!item) return; const url = item.dataset.photoUrl; const pos = this._layout.photoToPosition.get(url); if (!pos) return; const section = this._layout.sections[pos.sectionIndex]; const sectionPhotos = section.photos; const indexInSection = sectionPhotos.findIndex(p => p.url === url); document.dispatchEvent(new CustomEvent('photo-wall:photo-clicked', { detail: { photo: sectionPhotos[indexInSection], sectionPhotos, indexInSection, srcElement: item } })); })`
- [x] T027 [US3] Handle `photo-wall:photo-clicked` in `frontend/index.html` — add event listener after `window.photoWall` is initialized: `document.addEventListener('photo-wall:photo-clicked', e => { const {photo, sectionPhotos, indexInSection, srcElement} = e.detail; if (window.photoViewer) window.photoViewer.open(sectionPhotos, indexInSection, srcElement); map.panTo([photo.lat, photo.lng]); })`

**Checkpoint**: Full bidirectional navigation works. Map click → wall highlights. Wall click → viewer opens AND map pans.

---

## Phase 6: User Story 4 — Responsive Layout on Mobile (Priority: P2)

**Goal**: Photo wall behaves correctly on narrow viewports (≤768px) — smaller collapsed height, correct touch behavior, scrubber accessible without interfering with grid scroll.

**Independent Test**: Open app on mobile (or DevTools emulation, 375px width) → collapsed strip visible at bottom → drag handle upward → panel expands → grid rows fit screen width (2-3 photos per row) → scrubber reachable → scrolling grid does NOT accidentally trigger panel collapse → photo tap opens viewer.

- [x] T028 [US4] Add mobile CSS adjustments to `frontend/css/photo-wall.css` — `@media (max-width: 768px) { :root { --wall-collapsed-height: 25vh; } .photo-wall-scrubber { width: 24px; } .photo-wall-scrubber-thumb { width: 8px; height: 24px; border-radius: 12px; } }` (larger touch target for scrubber thumb); ensure `.photo-wall-scroll` has `-webkit-overflow-scrolling: touch` for momentum scrolling on iOS
- [x] T029 [US4] Fix touch scroll conflict in `frontend/js/photo-wall.js` — in `PanelSnap`: modify `pointerdown` handler to check if the pointer start target is inside `.photo-wall-scroll` (i.e., `e.target.closest('.photo-wall-scroll')`); if true AND `this._scrollEl.scrollTop > 0`, do NOT start a snap drag (allow the scroll to proceed naturally); only begin snap drag when: (a) pointer started on `.photo-wall-handle` or `.photo-wall-header`, OR (b) pointer started on scroll area AND scroll is at `scrollTop === 0` AND user is dragging downward; add `touchmove` `preventDefault()` ONLY when a snap drag is actively in progress (track with `this._dragging` boolean)

**Checkpoint**: On mobile, panel snaps correctly from handle drags. Scrolling photo grid does not trigger accidental panel collapse. Scrubber is tappable.

---

## Phase 7: User Story 5 — Trip Feed Coexistence (Priority: P3)

**Goal**: On desktop, the photo wall panel and the trip feed sidebar coexist without overlap. Clicking a trip feed entry also scrolls the photo wall to that date.

**Independent Test**: On desktop with feed sidebar open → expand photo wall to half → confirm feed sidebar is still visible above the panel → click a feed entry → map pans AND photo wall scrolls to that date → expand photo wall to full → feed sidebar is covered (expected, immersive mode) → click collapse button → feed sidebar accessible again.

- [x] T030 [US5] Ensure z-index transitions correctly for full-screen state in `frontend/js/photo-wall.js` — in `_onSnapStateChange(state)`: when `state === 'full'`, programmatically set `this._container.style.zIndex = '1003'`; when state changes away from `'full'`, set `this._container.style.zIndex = ''` (remove inline, revert to CSS class default of 1000); note: CSS class `--full` already sets `z-index:1003` via the stylesheet, but the inline style override ensures immediate application before the animation class is applied
- [x] T031 [US5] Verify trip feed → photo wall date targeting works end-to-end in `frontend/index.html` — review the feed entry click handler added in T022 for completeness: confirm it covers both desktop click (`.feed-entry` click event) and mobile tap (same handler); if the feed uses event delegation on `#feed-entries`, confirm the `photo-wall:target-date` dispatch is inside that handler; test: click "London" feed entry → confirm `photo-wall:target-date` event fires with correct date in browser console; confirm photo wall scrolls to London photos

**Checkpoint**: On desktop, both feed sidebar and photo wall are simultaneously usable. Trip feed clicks drive photo wall scroll.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Reliability, edge cases, and final validation.

- [x] T032 Implement window resize handler in `frontend/js/photo-wall.js` — implement `relayout()` public method: get new `panelInnerWidth = this._container.querySelector('.photo-wall-scroll').clientWidth - 20` (minus scrubber width); if width unchanged, return early; call `buildLayoutCache(this._sections, panelInnerWidth, 4)` and store as `this._layout`; update `.photo-wall-spacer` height; clear `this._activeItems` map and remove all current grid item DOM elements from `.photo-wall-scroll`; call `renderVisibleRows()` at current scroll position; update date scrubber thumb position; add to `frontend/index.html` after PhotoWall initialization: `window.addEventListener('resize', debounce(() => { if (window.photoWall) window.photoWall.relayout(); }, 200))`
- [x] T033 [P] Implement empty state in `frontend/js/photo-wall.js` — in `_buildLayout()`: after `buildDateSections()`, if `this._sections.length === 0`, set a flag `this._isEmpty = true` and inject `<div class="photo-wall-empty"><span>No photos to display</span></div>` inside `.photo-wall-scroll`; skip all layout computation; in `renderGrid()`, check `this._isEmpty` and return early
- [x] T034 [P] Add empty state CSS to `frontend/css/photo-wall.css` — `.photo-wall-empty`: `display:flex; align-items:center; justify-content:center; height:100%; color:rgba(232,230,227,0.4); font-size:14px; font-style:italic`
- [x] T035 Prevent scroll propagation to map in `frontend/js/photo-wall.js` — in `PhotoWall.constructor()`, after DOM wiring: `this._container.addEventListener('wheel', e => e.stopPropagation(), {passive:false})` — this prevents the Leaflet map from receiving scroll wheel events (which would cause map zoom) when the user is scrolling within the photo wall panel
- [x] T036 [P] Run `quickstart.md` manual validation — execute all 5 test scenarios from `specs/006-photo-wall/quickstart.md`: (1) panel snap behavior, (2) map-to-wall navigation, (3) grid browsing with date headers and scrubber, (4) photo click opens viewer and pans map, (5) trip feed entry scrolls wall; log any failures
- [x] T037 Verify constitution compliance — confirm in browser: no new CDN/external links added to `index.html` `<head>`; `photo-wall.js` served as local file; `photo-wall.css` served as local file; app loads with empty `manifest.json` showing empty state (not JS error); static deployment works (`python3 -m http.server 8000`); all 6 constitution principles from `specs/006-photo-wall/plan.md` still satisfied

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (file scaffolds exist) — **BLOCKS all grid rendering**
- **US1 — Panel Snap (Phase 3)**: Depends on Phase 1 (HTML + CSS wired); does NOT need Phase 2 (snap works without photos)
- **US2 — Grid View (Phase 4)**: Depends on Phase 2 (layout engine complete) AND Phase 3 (panel renders, scroll container exists)
- **US3 — Map Navigation (Phase 5)**: Depends on Phase 4 (grid renders, items selectable)
- **US4 — Mobile (Phase 6)**: Depends on Phase 3 (snap) and Phase 4 (grid) — CSS adjustments and touch fixes layer on top
- **US5 — Feed Coexistence (Phase 7)**: Depends on Phase 5 (target-date event is added in Phase 5)
- **Polish (Phase 8)**: Depends on all story phases complete

### User Story Dependencies

- **US1 (P1)**: Can start after Phase 1 (Setup). No other story dependency.
- **US2 (P1)**: Can start after Phase 2 (Foundational) + US1 complete (scroll container exists in DOM).
- **US3 (P1)**: Can start after US2 (grid items must exist to be highlighted/clicked).
- **US4 (P2)**: Can start after US1 and US2 are complete (CSS + touch fixes layer on top).
- **US5 (P3)**: Can start after US3 (target-date event dispatch is in US3 Phase).

### Within Each Story

- [P] tasks: different files, no dependency on each other — start together
- CSS tasks [P] with same-phase JS tasks: start both in parallel (different files)
- Implementation → wiring → integration ordering within each story

### Parallel Opportunities

Within Phase 1: T002 can run parallel to T001 (different files)
Within Phase 2: T006, T007 run parallel to T005 (different helpers, no deps)
Within Phase 3: T009 + T010 (CSS) parallel to T011 (JS class)
Within Phase 4: T013 + T014 + T019 (all CSS) parallel to T015–T018 (JS logic)
Within Phase 5: T021 + T022 + T025 + T026 (all index.html events or CSS) can overlap
Within Phase 8: T033 + T034 + T036 all independent

---

## Parallel Example: User Story 2 (Grid View)

```
# Launch CSS tasks together (T013, T014, T019 — all touch css/photo-wall.css):
Task A: "Add grid container and item CSS to frontend/css/photo-wall.css" [T013]
Task B: "Add section header and sticky header CSS to frontend/css/photo-wall.css" [T014]
Task C: "Add date scrubber CSS to frontend/css/photo-wall.css" [T019]

# While CSS tasks run, begin JS rendering logic:
Task D: "Implement renderGrid() and scroll listener in frontend/js/photo-wall.js" [T015]
Task E: "Implement renderVisibleRows() in frontend/js/photo-wall.js" [T016]  ← depends on T015

# After T015–T016:
Task F: "Implement sticky header update" [T017]
Task G: "Implement aspect ratio correction" [T018]
Task H: "Implement DateScrubber class" [T020]  ← depends on T019 CSS being done
```

---

## Implementation Strategy

### MVP Scope (User Stories 1 + 2 + 3)

All three P1 stories form the minimum viable photo wall:
1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational layout engine (T005–T008)
3. Complete Phase 3: US1 — Panel snap (T009–T012)
4. Complete Phase 4: US2 — Justified grid + virtual scroll + scrubber (T013–T020)
5. Complete Phase 5: US3 — Map ↔ wall navigation (T021–T027)
6. **STOP and VALIDATE**: All P1 stories independently testable → deploy/demo

### Incremental Delivery

1. Phase 1 + 2 + 3 → **Snapping panel exists** (no photos yet)
2. + Phase 4 → **Photo grid visible** and browsable (MVP photo wall)
3. + Phase 5 → **Full bidirectional navigation** (map ↔ wall ↔ viewer)
4. + Phase 6 → **Mobile-polished**
5. + Phase 7 → **Feed + wall coexist on desktop**
6. + Phase 8 → **Production-ready**

---

## Notes

- [P] tasks = different files, no in-progress task dependencies
- All CSS and JS for a story can be started in parallel (different files)
- `photo-wall.js` is an ES module — use `export { PhotoWall }` syntax consistent with existing `photo-viewer.js` pattern
- Photo wall's gold accent color `#d4a853` matches the existing app theme from `map.css`
- The `debounce` utility already exists in `index.html` (used for timeline slider) — call `debounce(fn, ms)` directly in `index.html` context; or reimplement the 3-line function locally in `photo-wall.js`
- `photo-wall.js` never accesses `photos/` directory (original images) — only `photo.thumbnail` and `photo.web_url` from the manifest
- Commit after each phase checkpoint for safe incremental rollback
