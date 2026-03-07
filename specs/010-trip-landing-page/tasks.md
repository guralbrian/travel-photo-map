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

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, performance, and final visual verification

- [X] T021 [P] Handle edge cases in `js/landing-page.js` — (a) region with no photos: show "No photos yet" in detail photo section, (b) missing summary: use first day's notes, (c) missing heroPhoto: color gradient fallback (covered in T011, verify), (d) window resize during detail view: re-center mini-map and adjust layout
- [X] T022 [P] Performance polish in `css/landing-page.css` and `js/landing-page.js` — lazy-load hero images (only set `background-image` when cards are visible, not during intro), add `loading="lazy"` to thumbnail `<img>` tags, ensure `will-change` is only applied during active animations and removed after
- [X] T023 Visual verification: screenshot `localhost:8000` at 1440px — verify intro screen, card grid (4x2), detail view, and map transition
- [X] T024 Visual verification: screenshot `localhost:8000` at 375px — verify intro screen, card grid (2x4 or stacked), detail view (single column), and map transition
- [X] T025 Run `quickstart.md` validation — follow all 8 test steps from quickstart.md and verify each passes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational — intro screen only
- **User Story 2 (Phase 4)**: Depends on Foundational — card grid (can parallel with US1 if card grid area exists)
- **User Story 3 (Phase 5)**: Depends on US2 (needs cards to click on)
- **User Story 4 (Phase 6)**: Depends on US2 (needs "Explore" button context), benefits from US3 (detail "View on map")
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Intro Screen)**: Independent — only needs the landing page overlay
- **US2 (Card Grid)**: Independent of US1 for rendering, but visually appears after intro transition
- **US3 (Detail View)**: Depends on US2 — needs rendered cards to expand
- **US4 (Map Transition)**: Depends on US2 for the "Explore" button; benefits from US3 for "View on map"

### Within Each User Story

- CSS layout before JS behavior
- Core rendering before edge cases
- Animation before content population (for US3)

### Parallel Opportunities

**Phase 1**: T001, T002 can run in parallel (different files); T003 depends on both
**Phase 3 (US1)**: T006, T007 can run in parallel (HTML vs CSS); T008 depends on both
**Phase 4 (US2)**: T009 can run in parallel with other CSS work; T010-T011 sequential
**Phase 5 (US3)**: T012 (CSS) can run in parallel with other phases; T013-T017 mostly sequential (T014-T016 content tasks can partially parallel after T013)
**Phase 7**: T021, T022 can run in parallel; T023-T025 sequential after all code is done

---

## Parallel Example: User Story 3

```bash
# First, CSS and expand animation can overlap:
Task T012: "Build detail view layout CSS in css/landing-page.css"  # [P]
Task T013: "Implement card-to-detail expand animation in js/landing-page.js"  # needs T012 for classes

# Then content tasks can partially parallel (different DOM sections):
Task T014: "Implement summary and places/dates content"
Task T015: "Implement lazy mini Leaflet map"  # independent section
Task T016: "Implement photo thumbnail grid"    # independent section

# Finally, close behavior depends on all content:
Task T017: "Implement detail close/collapse animation"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (3 tasks)
2. Complete Phase 2: Foundational (2 tasks)
3. Complete Phase 3: US1 — Intro Screen (3 tasks)
4. Complete Phase 4: US2 — Card Grid (3 tasks)
5. **STOP and VALIDATE**: Intro + card grid visible with correct data
6. This is a shippable MVP — visitors see the intro and can browse region cards

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Intro Screen) → Test intro animation → Shippable intro
3. Add US2 (Card Grid) → Test card rendering → Shippable cards + intro
4. Add US3 (Detail View) → Test expand/collapse + content → Full landing page
5. Add US4 (Map Transition) → Test landing → map flow → Complete feature
6. Polish → Edge cases + performance → Production-ready

### Recommended Execution: Sequential

This is a single-developer project. Execute phases 1-7 in order, committing after each phase checkpoint. Each phase builds directly on the previous.

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

## Dependencies & Execution Order (Phase 8)

- **T026** (CSS): Independent — can start immediately
- **T027** (click handler): Core task — depends on T026 for visual affordance
- **T028** (overflow button): Independent of T027 — can parallel with T026
- **T029, T030** (verification): Depend on T027 and T028 being complete

### Parallel Opportunities (Phase 8)

```bash
# T026 and T028 can run in parallel (CSS file vs JS, different code sections):
Task T026: "Add clickable thumbnail styles in css/landing-page.css"  # [P]
Task T028: "Change overflow button text in js/landing-page.js"

# Then T027 (core click handler):
Task T027: "Add delegated click handler for photo thumbnails in js/landing-page.js"

# Finally, sequential verification:
Task T029: "Visual verification at 1440px"
Task T030: "Visual verification at 375px"
```
