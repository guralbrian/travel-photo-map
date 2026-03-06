# Tasks: UX/UI Audit Remediation (Updated)

**Input**: Design documents from `/specs/009-ux-ui-audit/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md
**Updated**: 2026-03-06 — added US7 Apple Maps-style photo markers (FR-024 through FR-029) from clarification session 2026-03-06

**Tests**: Not requested. Visual verification via Playwright screenshots using dual-server setup (localhost:8000 for desktop 1440x900, localhost:8001 for mobile 375x812).

**Organization**: Tasks grouped by priority. Bug fixes (P0) from clarification added as new Phase 2. Previously completed work retained as checked-off phases.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Dual-Server Testing)

**Purpose**: Ensure parallel Playwright testing infrastructure per FR-022

- [x] T001 Verify two local servers are running: `python3 -m http.server 8000` (desktop) and `python3 -m http.server 8001` (mobile). Take baseline screenshots at both viewports before any changes.

---

## Phase 2: Bug Fixes from Clarification (P0 — must ship)

**Purpose**: Fix 6 bugs identified during user testing: Trip Feed visibility, settings panel defaults, settings button position, Photo Wall close/reopen/drag-to-close cycle

**Independent Test**: Page loads with Trip Feed hidden, settings closed, settings button at top-left. Photo Wall can be closed (X or fast flick) and reopened via gold button on both viewports.

### Trip Feed Hide

- [x] T002 [P] Hide Trip Feed sidebar and toggle button via CSS in `css/map.css`: add `.feed-sidebar, .feed-toggle { display: none !important; }` near the existing feed rules (~line 638). Include comment: `/* Trip Feed hidden — superseded by Photo Wall (re-enable by removing these rules) */`

### Settings Panel Defaults

- [x] T003 [P] Default control panel to closed on page load in `index.html`: change `panel.className = 'control-panel';` → `panel.className = 'control-panel hidden';` (~line 1093), change `toggleBtn.className = 'panel-toggle open';` → `toggleBtn.className = 'panel-toggle';` (~line 1088), remove `toggleBtn.style.display = 'none';` (~line 1091)

### Settings Button Reposition

- [x] T004 [P] Move settings toggle button to top-left on mobile in `css/map.css`: in the `@media (max-width: 768px)` block (~line 899), change `.panel-toggle` from `top: auto; left: auto; bottom: 20px; right: 20px;` to `top: 10px; left: 10px; bottom: auto; right: auto;`

### Photo Wall Drag-to-Close

- [x] T005 Fix Photo Wall drag-to-close snap logic in `js/photo-wall.js`: in `_onPointerUp` method (~line 316), change the velocity > 400 (fast swipe down) branch from `target = (this.currentState === 'full') ? 'half' : 'collapsed';` to `target = (this.currentState === 'full') ? 'half' : (this.currentState === 'half') ? 'collapsed' : 'hidden';` — this chains full→half→collapsed→hidden for successive fast downward flicks

### Reopen Button Reliability

- [x] T006 [P] Ensure gold reopen button z-index is above all bottom-positioned elements in `css/photo-wall.css`: set explicit `z-index: var(--z-panel-toggle)` on `.photo-wall-reopen-btn` (currently no explicit z-index, ~line 454). Verify button positioning doesn't overlap with settings toggle after reposition (settings now top-left, reopen stays bottom-right).

### Legacy Route Code Removal

- [x] T006b [P] Remove legacy straight-line route rendering code from `index.html`: delete lines 924-979 (legacy route loop with direct city-to-city lines, duplicate `calcBearing` function, `arrowMarkers` array, and zoom-based arrow handler). Keep smart routes initialization at line 890-891 intact. After removal, `travelRouteLayer` correctly references smart routes and the Map Layers toggle controls them (FR-023, SC-015, Research #11)

### Phase 2 Verification

- [x] T007 Verify all bug fixes via Playwright on both servers: (a) localhost:8000 at 1440x900 — Trip Feed not visible, settings panel closed on load, settings button at top-left, Photo Wall X close shows reopen button, reopen button click restores wall. (b) localhost:8001 at 375x812 — same checks plus: settings button at top-left with no overlap, fast flick down from collapsed snaps to hidden, slow drag back snaps to collapsed, reopen button visible and tappable after close.
- [x] T007b Verify legacy route removal via Playwright: confirm only 14 SVG path elements in `.leaflet-overlay-pane` (not 28), verify route toggle in Map Layers correctly shows/hides smart routes, confirm no console errors related to routes (SC-015)

**Checkpoint**: All 7 bugs fixed. SC-010, SC-011, SC-012, SC-013, SC-014, SC-015 satisfied.

---

## Phase 3: Previously Completed — Font & Close Button (P1)

**Status**: Completed in prior implementation pass

- [x] T008 Added `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;` to `body` selector in `css/map.css` (FR-001, SC-001)
- [x] T009 [US3] Wired click event listener on `#photo-wall-close-btn` in `js/photo-wall.js` calling `this._snap.snapTo('hidden')` (FR-002, SC-003)

---

## Phase 4: Previously Completed — Visual Consistency (P1)

**Status**: Completed in prior implementation pass

- [x] T010 [US1] Unified gold hover color to `#e0b862` across `css/map.css` and `css/photo-wall.css` (FR-011)
- [x] T011 [US1] Reviewed legacy colors in Leaflet popups — intentionally kept for white-background contrast (FR-007 context-dependent)

---

## Phase 5: Previously Completed — Design Token System (P2)

**Status**: Completed in prior implementation pass

- [x] T012 [US4] Expanded `:root` tokens in `css/photo-wall.css` — colors, font sizes (6-tier scale), transitions, easing, z-index (FR-006)
- [x] T013 [US4] Replaced hardcoded values with `var(--token)` references across `css/map.css`, `css/photo-viewer.css`, `css/photo-wall.css` (FR-006)
- [x] T014 [US4] Rationalized font sizes to 6-tier scale (FR-014, SC-005, SC-006)

---

## Phase 6: Previously Completed — Z-Index & Touch Targets (P1/P2)

**Status**: Completed in prior implementation pass

- [x] T015 [US5] Fixed Trip Feed blocking Photo Wall buttons via `pointer-events` strategy (FR-008)
- [x] T016 [US5] Fixed Photo Viewer close button interception via `pointer-events: none` on `.pv-media` (FR-009)
- [x] T017 [US5] Fixed mobile reopen button overlap via repositioning (FR-010)
- [x] T018 [US2] Increased all panel close buttons to 44x44px minimum on mobile (FR-003)
- [x] T019 [US2] Increased accordion headers and radio/checkbox rows to 44px (FR-004, FR-005)
- [x] T020 [US2] Increased Leaflet zoom buttons and Google Photos link tap targets (SC-002)

---

## Phase 7: Previously Completed — Mobile Photo Wall Polish (P3)

**Status**: Completed in prior implementation pass

- [x] T021 [US6] Increased mobile collapsed height to 35vh for 2+ thumbnail rows (FR-015)
- [x] T022 [US6] Increased drag handle visibility — 8px height, 48px width, 0.30 opacity (FR-016)
- [x] T023 [US6] Aligned Photo Wall header padding with side panels (FR-012)

---

## Phase 8: US7 — Apple Maps-Style Photo Markers with Pointer Stems (Priority: P2)

**Goal**: Photo markers display as white-bordered frames. Clustered markers (2+ photos) have downward pointer stems anchored at GPS coordinates. Marker size follows 4 discrete tiers based on photo count. Favorites use gold borders. Entire marker (frame + stem) is a unified click target.

**Independent Test**: Load the map, zoom to areas with varying photo density. Verify clustered markers show white frames with pointer stems, single photos show stemless frames, sizes vary by cluster count, favorites have gold borders.

**Tier Configuration** (from research #14):

| Tier | Photo Count | Frame (px) | Stem (px) | Total Height | iconAnchor |
|------|-------------|------------|-----------|-------------|------------|
| 0 | 1 | 70×70 | 0 | 70 | [35, 35] |
| 1 | 2–5 | 85×85 | 12 | 97 | [42, 97] |
| 2 | 6–15 | 100×100 | 14 | 114 | [50, 114] |
| 3 | 16+ | 115×115 | 16 | 131 | [57, 131] |

### JS Implementation

- [x] T027 [US7] Add tier configuration constants and `getSizeTier()` function to `js/ViewportSampler.js` — define `TIER_CONFIG` array with 4 entries: `{maxCount: 1, frameSize: 70, stemHeight: 0}`, `{maxCount: 5, frameSize: 85, stemHeight: 12}`, `{maxCount: 15, frameSize: 100, stemHeight: 14}`, `{maxCount: Infinity, frameSize: 115, stemHeight: 16}`. Add `getSizeTier(totalPhotos)` function returning tier index (0–3). Per FR-026, research #14.
- [x] T028 [US7] Modify `L.Photo.Icon` in `js/Leaflet.Photo.js` to accept new options: `tier` (0–3), `stemHeight`, `frameSize`. In `createIcon()`: set element width to `frameSize`, element height to `frameSize + stemHeight`, set img dimensions to `frameSize × frameSize`, add CSS class `marker-tier-{tier}` to the element. Override `iconAnchor` in `initialize()`: for stemmed markers (tier > 0) set `[frameSize/2, frameSize + stemHeight]`; for stemless (tier 0) set `[frameSize/2, frameSize/2]`. Per FR-024, FR-025, FR-028, research #12.
- [x] T029 [US7] Update `createMarker()` in `js/ViewportSampler.js` — compute `totalPhotos = hiddenCount + 1`, call `getSizeTier(totalPhotos)`, look up `frameSize` and `stemHeight` from `TIER_CONFIG`. Pass `tier`, `stemHeight`, `frameSize` as icon options instead of the flat `[_iconSize, _iconSize]`. Store the tier index on the marker object (`marker._tier = tier`) for later comparison in `updateBadge()`.
- [x] T030 [US7] Update `updateBadge()` in `js/ViewportSampler.js` — when `hiddenCount` changes on an existing marker, recompute `totalPhotos` and tier. If the new tier differs from `marker._tier`, rebuild the marker icon entirely via `marker.setIcon(newIcon)` with updated frameSize/stemHeight/iconAnchor. Update `marker._tier` after rebuild.
- [x] T031 [US7] Update `updateIconSize()` in `js/ViewportSampler.js` — currently rebuilds all markers at a flat `_iconSize`. Replace with tier-based sizing: for each marker, read its stored `hiddenCount` (from badge text), recompute tier, and rebuild with the appropriate `TIER_CONFIG` entry. Remove or deprecate the `_iconSize` variable. If the icon size slider in Controls still exists, either remove it or make it scale the tier config base sizes proportionally.
- [x] T032 [US7] Update favorites layer in `index.html` `rebuildPhotoLayer()` — change `favSize` from `currentIconSize + 10` to `80` (tier 0 base 70 + 10 bonus). Pass `tier: 0`, `frameSize: 80`, `stemHeight: 0` to the favorites `L.Photo` icon options so favorites render as white-framed (gold-bordered) markers without stems per FR-027, research #15.

### CSS Implementation

- [x] T033 [P] [US7] Add Apple Maps-style base frame CSS to `css/Leaflet.Photo.css` — (a) change `.leaflet-marker-photo` to: `border: 3px solid white`, `border-radius: 6px`, `overflow: visible` (was `hidden`), `background-color: transparent`, `position: relative`. (b) Add `.leaflet-marker-photo img` rules: `border-radius: 4px`, `overflow: hidden`, `display: block`, `object-fit: cover` (preserve existing). The img clips within the frame while the `::after` stem extends below.
- [x] T034 [P] [US7] Add pointer stem CSS via `::after` pseudo-elements in `css/Leaflet.Photo.css` — `.marker-tier-1::after, .marker-tier-2::after, .marker-tier-3::after` (tiers with stems) get: `content: ''`, `position: absolute`, `bottom: 0`, `left: 50%`, `transform: translateX(-50%)`, `width: 0`, `height: 0`, `border-left: 8px solid transparent`, `border-right: 8px solid transparent`, `border-top: Npx solid white` (12px for tier 1, 14px for tier 2, 16px for tier 3). `.marker-tier-0` gets no `::after` (no stem). Per FR-024, FR-029, research #13.
- [x] T035 [US7] Update favorite marker CSS in `css/Leaflet.Photo.css` — ensure `.photo-marker-favorite` overrides border color: `border-color: var(--color-accent) !important` (gold instead of white). Add `.photo-marker-favorite::after` with `border-top-color: var(--color-accent)` so the stem is also gold for stemmed favorites. Verify gold glow shadow still works with new frame structure. Per FR-027.
- [x] T036 [US7] Reposition badge elements in `css/Leaflet.Photo.css` — adjust `.photo-cluster-count` from `bottom: -4px; right: -4px` to position at the bottom-right of the photo *frame area* (not stem). For stemmed markers, this means the badge sits above the stem. Adjust `.photo-favorite-badge` (top-left) and `.photo-notes-badge` (bottom-left) positions to account for the 3px white border.

### Verification

- [x] T037 [US7] Screenshot verification desktop — navigate to localhost:8000 (1440px), zoom to areas with varying photo density. Verify: (a) single photos show white-framed markers centered over location with no stem (SC-017), (b) clusters show white-framed markers with downward pointer stems anchored at GPS coordinate (SC-016), (c) 4 distinct size tiers visible across different cluster densities (SC-018), (d) favorites have gold borders with same frame style (SC-019), (e) clicking any marker (frame or stem area) opens photo viewer (SC-020).
- [x] T038 [US7] Screenshot verification mobile — navigate to localhost:8001 (375px), verify markers render correctly at mobile zoom levels. Check that marker sizes are appropriate for the smaller viewport, stems point straight down, and click/tap targets work on touch simulation.
- [x] T039 [US7] Edge case verification — zoom in/out rapidly to trigger cluster count changes. Verify markers animate smoothly with existing fade-in/fade-out transitions. Verify no visual glitches when a marker transitions between tiers during viewport recalculation.

**Checkpoint**: Apple Maps-style markers working on both viewports. 4 size tiers visible. Favorites have gold borders. Click targets include stem area. SC-016 through SC-020 satisfied.

---

## Phase 9: Previously Completed — Final Verification (SC-001 through SC-015)

**Status**: Completed in prior implementation pass. These checks validated all non-marker success criteria.

- [x] T024 Full interaction walkthrough at desktop (localhost:8000 at 1440x900): load page → settings closed → click settings toggle → panel opens → close → Photo Wall visible → X close → reopen button appears → click reopen → wall returns → no Trip Feed visible anywhere
- [x] T025 Full interaction walkthrough at mobile (localhost:8001 at 375x812): load page → settings closed, button at top-left → Photo Wall collapsed → fast flick down → snaps to hidden → reopen button visible → tap reopen → wall returns to collapsed → slow drag down → snaps back to collapsed → no Trip Feed visible
- [x] T026 Compare before/after screenshots. Confirm all success criteria: SC-001 through SC-015 (including route deduplication).

---

## Phase 10: Final Comprehensive Verification

**Purpose**: End-to-end validation after Apple Maps markers are implemented — all SC-001 through SC-020.

- [ ] T040 Full visual regression check desktop (localhost:8000 at 1440px) — verify no regressions from marker changes: panels still use correct fonts, tokens still propagate, z-index layering intact, route toggle works, all buttons clickable. Plus: markers display Apple Maps style per SC-016–SC-020.
- [ ] T041 Full visual regression check mobile (localhost:8001 at 375px) — verify touch targets still ≥44px, Photo Wall close/reopen cycle works, controls panel starts closed. Plus: markers display correctly at mobile zoom levels.
- [ ] T042 Run quickstart.md validation — follow the 7-step quickstart checklist from plan.md to verify all acceptance criteria end-to-end.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phases 1–7**: Already completed — no action needed
- **Phase 8 (US7 Markers)**: Depends on Phase 5 (design tokens) being complete (✅ already done)
  - JS tasks (T027–T032) are sequential: T027 → T028 → T029 → T030 → T031 → T032
  - CSS tasks (T033–T036) can run in **parallel** with JS tasks (different files)
  - T033, T034 can run in parallel (different CSS concerns, same file but non-overlapping selectors)
  - T035 depends on T033 (needs base frame styles first)
  - T036 depends on T033 (needs frame structure for badge positioning)
  - T037–T039 (verification) depend on all implementation tasks
- **Phase 9**: Already completed
- **Phase 10 (Final)**: Depends on Phase 8 completion

### Within US7 Task Dependencies

```
Batch 1 (parallel — different files):
  JS: T027 (tier config in ViewportSampler.js)
  CSS: T033 (base frame in Leaflet.Photo.css)
  CSS: T034 (pointer stem in Leaflet.Photo.css — different selectors from T033)

Batch 2 (depends on Batch 1):
  JS: T028 (Leaflet.Photo.js createIcon — needs tier config from T027)
  CSS: T035 (favorites CSS — needs base frame from T033)
  CSS: T036 (badges — needs frame structure from T033)

Batch 3 (depends on Batch 2):
  JS: T029 (updateBadge — needs createIcon changes from T028)
  JS: T030 (updateIconSize — needs tier config from T027 + createIcon from T028)
  JS: T031 (updateIconSize — needs T030)

Batch 4 (depends on Batch 3):
  JS: T032 (index.html favorites — needs Leaflet.Photo.js changes from T028)

Batch 5 (depends on all):
  T037: Desktop screenshot verification
  T038: Mobile screenshot verification
  T039: Edge case zoom verification
```

---

## Implementation Strategy

### Remaining Work

Since Phases 1–7 and Phase 9 are already complete, the remaining work is:

1. **Phase 8**: US7 Apple Maps-style markers — **13 tasks** (T027–T039)
   - 6 JS implementation tasks (T027–T032)
   - 4 CSS implementation tasks (T033–T036)
   - 3 verification tasks (T037–T039)
2. **Phase 10**: Final comprehensive verification — **3 tasks** (T040–T042)
3. **Total: 16 new tasks**

### Execution Order

1. Start JS (T027) and CSS (T033, T034) in parallel
2. After T027 → T028 (Leaflet.Photo.js); after T033 → T035, T036
3. After T028 → T029, T030; then T031
4. After T028 → T032 (index.html favorites)
5. After all impl → T037, T038, T039 (screenshots)
6. After Phase 8 complete → Phase 10 (T040–T042)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All verification uses Playwright MCP with dual-server setup (port 8000 = desktop, port 8001 = mobile)
- No new files created — all changes modify existing `js/Leaflet.Photo.js`, `js/ViewportSampler.js`, `css/Leaflet.Photo.css`, and `index.html`
- The icon size slider in Controls may need adjustment or removal since tier-based sizing replaces flat icon sizing
- Favorites layer in index.html needs updated to pass tier info (T032)
