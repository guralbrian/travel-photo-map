# Tasks: Trip Region Navigation

**Input**: Design documents from `/specs/001-trip-region-nav/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Not requested — no test tasks included.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup

**Purpose**: Create new data file and module scaffold

- [x] T001 Create `data/itinerary.json` with the trip itinerary JSON containing 9 regions (UK-London, Copenhagen Visit 1, Heidelberg, Munich, Prague, Dresden/Meißen, Berlin, Hamburg, Copenhagen Visit 2) with lat/lng, days, and notes
- [x] T002 [P] Create `js/region-nav.js` scaffold with REGION_SECTIONS config array mapping 9 JSON regions to 8 user-facing sections (Berlin + Hamburg merged), exported `initRegionNav()` function, and module-level state variables

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: HTML structure, CSS, photo wall API, and data loading that MUST be ready before user story work

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 [P] Add region grid container (`#region-grid`), itinerary panel container (`#itinerary-panel`), and "Trip Legs" toggle button to `#feed-sidebar` in `index.html`, placed above `#feed-entries`
- [x] T004 [P] Add `setPhotos(photos)` method to PhotoWall class in `js/photo-wall.js` — replace internal photos array, rebuild date sections via `buildDateSections()`, recompute layout via `_buildLayout()`, and re-render grid
- [x] T005 [P] Add CSS styles for region grid (2x4 grid layout, panel cards, hover/active states), itinerary panel (header, day cards, scrollable body), and mobile overlay (fixed fullscreen, close button) in `css/map.css`
- [x] T006 Add `data/itinerary.json` to the existing `Promise.all` fetch block in `index.html` (alongside manifest.json and trip_segments.json), parse response, store as `itineraryData` variable with graceful fallback to `null` on fetch failure

**Checkpoint**: Foundation ready — grid container in DOM, styles applied, photo wall supports filtering, itinerary data loaded

---

## Phase 3: User Story 1 — Select a Trip Region to Focus the Map (Priority: P1) MVP

**Goal**: User opens the region grid in the trip feed sidebar, clicks a region, and the map pans/zooms to that region while photos and routes filter to that date range

**Independent Test**: Select any region panel → verify map centers on correct coordinates, only region-dated photos show on map and in photo wall, only region-dated route lines visible

### Implementation for User Story 1

- [x] T007 [US1] Implement `buildRegionSections(itineraryData)` in `js/region-nav.js` — iterate REGION_SECTIONS config, look up matching JSON regions by name, merge days from multi-region sections (Berlin/Hamburg), sort days by date, compute center lat/lng (average of constituent regions), derive startDate/endDate from min/max day dates
- [x] T008 [US1] Implement `renderRegionGrid(container, sections)` in `js/region-nav.js` — create 8 clickable panel elements in a 2x4 CSS grid, each showing region label and date range (e.g., "Jan 26–29"), wire click handlers to `selectRegion(index)`
- [x] T009 [US1] Implement grid toggle in `js/region-nav.js` — "Trip Legs" button click shows/hides `#region-grid` (toggle `.hidden` class), hides `#feed-entries` when grid visible, restores feed entries when grid hidden
- [x] T010 [US1] Implement `selectRegion(index)` in `js/region-nav.js` — call `map.flyTo(section.center, zoomLevel)` to pan/zoom map, hide `#region-grid`, show `#itinerary-panel`, set active region state
- [x] T011 [US1] Implement photo filtering in `selectRegion()` in `js/region-nav.js` — filter `allPhotos` by `photo.date >= section.startDate && photo.date <= section.endDate`, set `filteredPhotos` to result, call `rebuildPhotoLayer()`, call `photoWall.setPhotos(filteredPhotos)`
- [x] T012 [US1] Implement route line filtering in `selectRegion()` in `js/region-nav.js` — filter `tripSegments` by date overlap with section, remove existing `travelRouteLayer` from map, rebuild via `buildSmartRoutes(filteredPhotos, filteredSegments, map)`, add new layer
- [x] T013 [US1] Wire `initRegionNav()` call in `index.html` after data load block — pass `map`, `allPhotos`, `tripSegments`, `itineraryData`, and DOM element refs (`feedSidebar`, grid container, itinerary container); add `<script src="js/region-nav.js">` tag

**Checkpoint**: User Story 1 fully functional — selecting a region zooms map, filters photos/routes, and shows itinerary panel placeholder

---

## Phase 4: User Story 2 — Read Daily Itinerary Notes for a Region (Priority: P2)

**Goal**: After selecting a region, the itinerary panel shows a scrollable list of dated day entries with narrative notes

**Independent Test**: Select "Berlin/Hamburg" → verify 3 days appear (Feb 17, 18, 19) in chronological order with correct notes; select "Copenhagen Pt. 2" → verify all 18 days appear (including those with empty notes showing a "No notes" indicator)

### Implementation for User Story 2

- [x] T014 [US2] Implement `renderItineraryPanel(container, section)` in `js/region-nav.js` — render region label as heading, formatted date range as subtitle (e.g., "Jan 26 – Jan 29, 2026"), scrollable list of day cards each showing weekday + date (e.g., "Wed, Jan 28") and notes text
- [x] T015 [P] [US2] Style itinerary panel day cards in `css/map.css` — date header typography, notes text wrapping, separator between days, scrollable container with max-height, dark glass design language consistent with existing feed entries
- [x] T016 [US2] Handle empty notes and merged regions in `renderItineraryPanel()` in `js/region-nav.js` — days with empty string notes display date with subtle "No notes recorded" text (dimmed/italic); Berlin/Hamburg merged days from `buildRegionSections()` already appear in sorted sequence

**Checkpoint**: User Stories 1 AND 2 functional — selecting a region zooms map, filters data, and shows readable daily itinerary

---

## Phase 5: User Story 3 — Return to Full Trip Overview (Priority: P3)

**Goal**: User clicks a back button in the itinerary panel and returns to the region grid with full-trip map extent, all photos, and all routes restored

**Independent Test**: Select a region → click back → verify map returns to full extent, all photos visible on map and in photo wall, all route lines restored, region grid visible again

### Implementation for User Story 3

- [x] T017 [US3] Implement `deselectRegion()` in `js/region-nav.js` — restore `filteredPhotos = allPhotos`, call `rebuildPhotoLayer()`, call `photoWall.setPhotos(allPhotos)`, remove filtered route layer and rebuild full routes via `buildSmartRoutes(allPhotos, tripSegments, map)`, fit map to full trip bounds, clear active region state
- [x] T018 [US3] Add back button to itinerary panel header in `js/region-nav.js` — render arrow/back icon + "All Regions" label, wire click to `deselectRegion()`, hide `#itinerary-panel`, show `#region-grid`; style back button in `css/map.css`

**Checkpoint**: Complete navigation loop — select region → view itinerary → back to grid → select another region

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Mobile layout, error handling, and visual verification

- [x] T019 Implement mobile full-screen overlay for region grid in `js/region-nav.js` and `css/map.css` (FR-012) — on viewports ≤768px, grid renders as fixed-position overlay (z-index above map/panels) with close button; selecting a region dismisses overlay and shows itinerary in feed sidebar bottom-sheet mode
- [x] T020 Add graceful fallback when `data/itinerary.json` fails to load in `js/region-nav.js` — render grid panels with region labels but show "Itinerary data unavailable" in itinerary panel; log warning to console; do not break existing app functionality
- [x] T021 Visual verification at desktop (1440px) and mobile (375px) via Playwright MCP screenshots — verify grid layout, itinerary panel readability, mobile overlay behavior, back-to-grid flow, and photo/route filtering

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001, T002) — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on US1 (needs `selectRegion()` and itinerary panel container)
- **User Story 3 (Phase 5)**: Depends on US1 (needs `selectRegion()` to have something to deselect)
- **Polish (Phase 6)**: Depends on US1, US2, US3 all complete

### Within Each User Story

```text
Phase 1: T001, T002 (parallel)
    ↓
Phase 2: T003, T004, T005 (parallel) → T006 (needs T001 for data file)
    ↓
Phase 3 (US1): T007 → T008 → T009 → T010 → T011, T012 (parallel) → T013
    ↓
Phase 4 (US2): T014 → T015 (parallel with T016) → T016
    ↓
Phase 5 (US3): T017 → T018
    ↓
Phase 6: T019 → T020 → T021
```

### Parallel Opportunities

- **Phase 1**: T001 and T002 can run in parallel (different files)
- **Phase 2**: T003, T004, T005 can all run in parallel (different files); T006 needs T001 done
- **Phase 3**: T011 and T012 can run in parallel (both extend `selectRegion()` but touch different systems — photos vs routes)
- **Phase 4**: T015 (CSS) can run in parallel with T014 or T016 (different files)

---

## Parallel Example: User Story 1

```text
# After Phase 2 foundational is complete:

# Sequential chain (each depends on previous):
T007: buildRegionSections() in js/region-nav.js
T008: renderRegionGrid() in js/region-nav.js
T009: Grid toggle logic in js/region-nav.js
T010: selectRegion() core in js/region-nav.js

# Then these two can run in parallel (different integration targets):
T011: Photo filtering in selectRegion() — touches rebuildPhotoLayer() + photoWall
T012: Route filtering in selectRegion() — touches buildSmartRoutes() + travelRouteLayer

# Finally:
T013: Wire initRegionNav() in index.html
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001–T002)
2. Complete Phase 2: Foundational (T003–T006)
3. Complete Phase 3: User Story 1 (T007–T013)
4. **STOP and VALIDATE**: Open browser at localhost:8000, verify grid appears, region selection zooms map and filters photos/routes
5. This delivers the core feature — region selection with filtering

### Incremental Delivery

1. Setup + Foundational → Grid container, styles, data loading ready
2. Add US1 → Region grid clickable, map zooms, photos/routes filter (MVP!)
3. Add US2 → Daily notes readable in itinerary panel
4. Add US3 → Back button completes navigation loop
5. Add Polish → Mobile overlay, error handling, visual QA

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- All filtering uses simple YYYY-MM-DD string comparison on existing `photo.date` fields
- Route rebuild uses existing `buildSmartRoutes()` function — no API changes needed
- PhotoWall `setPhotos()` (T004) is the only existing module modification
- Mobile overlay (T019) is deferred to Polish since desktop flow must work first
- Commit after each phase checkpoint for safe incremental progress
