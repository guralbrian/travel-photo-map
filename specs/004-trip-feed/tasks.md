# Tasks: Trip Feed / Timeline Sidebar

**Input**: Design documents from `/specs/004-trip-feed/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: Not included — spec mandates manual browser testing with no test framework (matches existing project approach).

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- All file paths are relative to repository root

---

## Phase 1: Setup

**Purpose**: Firestore configuration for the new dailyNarratives collection

- [X] T001 Add `dailyNarratives/all` security rule (public read, editor-only write) to `firebase/firestore.rules` per `specs/004-trip-feed/contracts/firestore-rules-addition.txt`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data layer, base styles, and date index that ALL user stories depend on

**CRITICAL**: No user story work can begin until this phase is complete

- [X] T002 [P] Add `loadDailyNarratives()`, `getDailyNarrative(dateStr)`, and `saveDailyNarrative(dateStr, text)` functions to `js/cloud-data.js` following the existing `loadPhotoEdits`/`savePhotoCaption` single-document pattern with `_dailyNarratives` module-level cache, optimistic updates, and offline write queue integration
- [X] T003 [P] Add feed sidebar layout CSS to `css/map.css`: `.feed-sidebar` (fixed right, 280px wide, dark glass theme `rgba(24,24,28,0.88)` with `backdrop-filter: blur(16px)`, `z-index: 1001`, `border-radius: 12px`, overflow-y auto), `.feed-toggle` button (gold circular, matching `.panel-toggle` pattern), `.feed-entry` card base styles, `.feed-entry-header` (date + city name), `.feed-thumbnails` grid, `.feed-thumbnail` image styles, `.feed-more-indicator` for "+N more" badge
- [X] T004 Build `dateIndex` object in the data bootstrap `Promise.all` chain in `index.html` — after `assignPhotosToTripSegments()` runs, iterate `allPhotos` once to group photos by `photo.date` into `dateIndex[dateStr] = { photos: [], segmentName, segmentColor, segmentIndex }`, sorted chronologically by date key

**Checkpoint**: Foundation ready — dateIndex provides feed data, cloud-data.js handles narratives, CSS defines the visual shell

---

## Phase 3: User Story 1 — Browse Trip as Chronological Feed (P1) MVP

**Goal**: Visitors see a scrollable right sidebar with daily entries showing date, color-coded city name, and photo thumbnails

**Independent Test**: Load the map. Feed sidebar appears on the right with entries for all 22 photo-days. Each entry shows date, city name with segment color accent, and up to 6 thumbnails. Days with >6 photos show "+N more". Days with no photos are omitted. Scrolling covers the full trip chronologically.

### Implementation for User Story 1

- [X] T005 [US1] Add feed sidebar HTML structure to `index.html`: a `<div class="feed-sidebar">` container with a `<div class="feed-header">` (title + close button) and a `<div class="feed-entries">` scrollable list area, plus a `<button class="feed-toggle">` outside the sidebar for show/hide
- [X] T006 [US1] Implement `buildFeed(dateIndex)` function in `index.html` inline script that iterates `dateIndex` keys in chronological order and for each date creates a `.feed-entry` card containing: formatted date, city name `<span>` with `style="color: segmentColor"`, and a `.feed-thumbnails` container with up to 6 `<img>` elements using `photo.thumbnail` src, plus a `<span class="feed-more-indicator">+N more</span>` when photos exceed 6
- [X] T007 [US1] Wire `buildFeed()` call into the data bootstrap chain in `index.html` (after `assignPhotosToTripSegments` and `dateIndex` construction), and implement `updateFeedForTimeline(minDate, maxDate)` that shows/hides `.feed-entry` elements based on the timeline slider's current date range by comparing each entry's date attribute
- [X] T008 [US1] Implement feed toggle show/hide in `index.html`: clicking `.feed-toggle` toggles `.feed-sidebar.hidden` class (using same `transform: translateX(calc(100% + 20px))` slide-out pattern as the control panel), update toggle icon rotation state

**Checkpoint**: Feed sidebar displays all daily entries, respects timeline slider, and can be dismissed

---

## Phase 4: User Story 2 — Click Entry to Pan Map (P1)

**Goal**: Clicking a feed entry smoothly pans/zooms the map to that day's photos with active entry highlighting

**Independent Test**: Click "Copenhagen, Feb 1" entry — map flies to Copenhagen photos. Entry highlights as active. Click "Munich, Feb 5" — map flies to Munich, previous entry de-highlights. Manually scrolling the map does NOT force-highlight any entry.

**Depends on**: US1 (feed entries must exist to click)

### Implementation for User Story 2

- [X] T009 [P] [US2] Add active entry styles to `css/map.css`: `.feed-entry.active` with distinct left border or background highlight using the entry's segment color, smooth transition (0.25s ease-out)
- [X] T010 [US2] Implement feed entry click handler in `index.html`: on `.feed-entry` click, compute `L.latLngBounds` from all photos in `dateIndex[date]`, call `map.flyToBounds(bounds, { paddingTopLeft: [310, 20], paddingBottomRight: [290, 20], duration: 0.8, maxZoom: 15 })` with asymmetric padding accounting for left panel (310px) and right feed (290px), add `.active` class to clicked entry and remove from previous, handle single-photo days by creating artificial bounds (lat/lng 0.005)
- [X] T011 [US2] Wire click handlers on `.feed-thumbnail` images in `index.html` to call the existing `openLightbox(index)` function by looking up the photo's index in `allPhotos` (or `filteredPhotos`), with `event.stopPropagation()` to prevent the parent entry click from also firing

**Checkpoint**: Feed drives map navigation, thumbnails open lightbox, active state tracks correctly

---

## Phase 5: User Story 3 — Trip Narrative Text (P2)

**Goal**: Editors can add/edit daily narrative text visible to all visitors

**Independent Test**: Sign in as editor, click "Add note..." on a daily entry, type narrative, blur to save. Text appears for all visitors. Refresh — text persists. Non-editors see text but no edit controls.

**Depends on**: US1 (feed entries), T002 (cloud-data.js narrative functions)

### Implementation for User Story 3

- [X] T012 [P] [US3] Add narrative text and editor styles to `css/map.css`: `.feed-narrative` text block (font-size 13px, color `#e8e6e3`, padding, italic or normal), `.feed-narrative-editor` textarea (transparent background, `border-bottom: 1px solid rgba(255,255,255,0.25)`, gold focus color `#d4a853`, resize vertical), `.feed-add-note` prompt (muted color `#9a9790`, cursor pointer)
- [X] T013 [US3] Wire `loadDailyNarratives()` into the `firebase-ready` event listener in `index.html` (alongside existing `loadPhotoEdits` call), then update `buildFeed()` to call `cloudData.getDailyNarrative(dateStr)` for each entry and render a `.feed-narrative` paragraph when text exists, or an "Add note..." prompt when the user is an authenticated editor (check `window.authState`)
- [X] T014 [US3] Implement inline narrative editing in `index.html`: clicking "Add note..." or existing narrative text (editor only) replaces it with a `<textarea class="feed-narrative-editor">`, on blur or Enter keypress call `cloudData.saveDailyNarrative(dateStr, text)` with optimistic UI update (immediately render new text), handle empty text as deletion (remove narrative display, show "Add note..." again)

**Checkpoint**: Narratives persist to Firestore, display for all visitors, edit controls only for editors

---

## Phase 6: User Story 4 — Mobile-Friendly Feed (P2)

**Goal**: Feed adapts to a three-state bottom sheet on mobile (<=768px) with swipe gestures

**Independent Test**: Open on mobile/narrow viewport. Feed appears as collapsed bottom sheet with drag handle. Swipe up to half-height (current entry visible, map still visible). Swipe further to full-height (scroll all entries). Tap an entry — map pans, sheet collapses to half. Swipe down — sheet collapses.

**Depends on**: US1 (feed structure), US2 (entry tap behavior)

### Implementation for User Story 4

- [X] T015 [P] [US4] Add mobile bottom sheet CSS to `css/map.css` inside `@media (max-width: 768px)`: override `.feed-sidebar` to bottom-positioned (`top: auto; left: 0; right: 0; bottom: 0; width: 100%; border-radius: 12px 12px 0 0`), three transform states via classes `.feed-sheet-collapsed` (translateY showing only 60px peek), `.feed-sheet-half` (translateY 50vh), `.feed-sheet-full` (translateY 0), `transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)`, add `.feed-drag-handle` bar (40px wide, 4px tall, centered, `rgba(255,255,255,0.3)`, border-radius), hide `.feed-toggle` on mobile
- [X] T016 [US4] Implement bottom sheet touch gesture handling in `index.html`: add `.feed-drag-handle` element on mobile, listen for `touchstart`/`touchmove`/`touchend` on the handle and sheet header, track deltaY, apply `transform: translateY()` during drag for real-time feedback, on `touchend` snap to nearest state (collapsed/half/full) based on velocity and position thresholds, use `cubic-bezier(0.22, 1, 0.36, 1)` spring easing
- [X] T017 [US4] Implement sidebar mutual exclusion and sheet auto-collapse in `index.html`: on viewports 768px–1280px, opening the feed sidebar auto-collapses the left control panel (add `.hidden` to `.control-panel`) and vice versa; on mobile, tapping a feed entry to pan the map also transitions the sheet from full/half to half/collapsed state so the map animation is visible

**Checkpoint**: Feed works as bottom sheet on mobile with smooth gestures, sidebars don't overlap on medium screens

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Visual refinements and end-to-end validation

- [X] T018 [P] Add thumbnail placeholder and progressive loading styles to `css/map.css`: `.feed-thumbnail` starts with dark glass background placeholder, add `opacity: 0` default with `transition: opacity 0.3s ease-in`, use JS `onload` to add `.loaded` class that sets `opacity: 1` for fade-in effect
- [X] T019 Verify feed coexistence with control panel on desktop (both panels open, map has adequate space) and add any final spacing/z-index adjustments in `index.html` and `css/map.css`
- [X] T020 Run `specs/004-trip-feed/quickstart.md` end-to-end validation: deploy updated Firestore rules, verify feed display, verify narrative editing, verify responsive layout (desktop >1280px, medium 768–1280px, mobile <=768px), verify timeline integration

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup; T002, T003, T004 can all run in parallel (different files)
- **US1 (Phase 3)**: Depends on T003 (CSS) and T004 (dateIndex) from Foundational
- **US2 (Phase 4)**: Depends on US1 completion (need feed entries to click)
- **US3 (Phase 5)**: Depends on US1 (feed structure) and T002 (cloud-data.js narratives)
- **US4 (Phase 6)**: Depends on US1 and US2 (need feed + click behavior to make responsive)
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no other story dependencies
- **US2 (P1)**: Depends on US1 — feed must exist to enable click-to-pan
- **US3 (P2)**: Depends on US1 + T002 — feed structure + narrative cloud functions
- **US4 (P2)**: Depends on US1 + US2 — needs full feed behavior to adapt for mobile

### Within Each User Story

- CSS tasks marked [P] can run alongside index.html tasks (different files)
- index.html tasks within a story are sequential (same file, build on each other)
- Complete each story before moving to the next

### Parallel Opportunities

- **Phase 2**: T002 (cloud-data.js) + T003 (css/map.css) + T004 (index.html) — all different files
- **Phase 4**: T009 (css) can run alongside T010 (index.html)
- **Phase 5**: T012 (css) can run alongside T013 (index.html)
- **Phase 6**: T015 (css) can run alongside T016 (index.html)
- **Phase 7**: T018 (css) can run alongside T019 (index.html)

---

## Parallel Example: Foundational Phase

```
# All three foundational tasks target different files — launch together:
Task T002: "Add narrative CRUD functions to js/cloud-data.js"
Task T003: "Add feed sidebar CSS to css/map.css"
Task T004: "Build dateIndex in index.html"
```

## Parallel Example: User Story 3

```
# CSS and JS tasks can run in parallel:
Task T012: "Add narrative styles to css/map.css"
Task T013: "Wire loadDailyNarratives and render text in index.html"
# Then sequentially:
Task T014: "Implement inline narrative editor in index.html" (depends on T013)
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Complete Phase 1: Setup (deploy Firestore rule)
2. Complete Phase 2: Foundational (dateIndex + cloud-data + CSS)
3. Complete Phase 3: US1 — Feed displays daily entries
4. **STOP and VALIDATE**: Scroll feed, check entries, test timeline filter, test toggle
5. Complete Phase 4: US2 — Click-to-pan and lightbox integration
6. **STOP and VALIDATE**: Click entries, verify map animation, test active state
7. Deploy/demo MVP

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 → Test feed display → Demo (basic feed)
3. Add US2 → Test click-to-pan → Demo (interactive feed — **MVP complete**)
4. Add US3 → Test narrative editing → Demo (trip journal)
5. Add US4 → Test mobile bottom sheet → Demo (responsive feed)
6. Polish → Final validation → Ship

---

## Notes

- All feed UI logic lives in `index.html` inline script (no new JS files) — consistent with existing lightbox, timeline, and favorites patterns
- CSS goes in `css/map.css` — the only stylesheet for app-specific styles
- Cloud data goes in `js/cloud-data.js` — follows the existing single-document CRUD pattern exactly
- The feed sidebar (280px right) coexists with the control panel (300px left) on wide viewports (>1280px)
- Feed uses `photo.thumbnail` for images (already available on all photo objects from manifest)
- `dateIndex` reuses `cityName`/`cityColor` already stamped by `assignPhotosToTripSegments()`
- No build step, no frameworks, no new dependencies — vendor-only approach per constitution
