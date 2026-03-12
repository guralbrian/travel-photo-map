# Tasks: Shared Trip Data Model

**Input**: Design documents from `/specs/015-shared-trip-model/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/trip-model-api.md, quickstart.md

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Add the new script tag and create the module skeleton

- [x] T001 Add `<script src="js/trip-model.js"></script>` to `index.html` after the `photo-wall.js` script tag and before `region-nav.js` (between current lines 97 and 98)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Create the shared module skeleton that all user stories build into

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Create `js/trip-model.js` as an IIFE exposing `window.TripModel` with: (1) private state variables (`_regions`, `_regionMap`, `_clusters`, `_dateIndex`, `_initialized`), (2) the canonical `REGION_SECTIONS` constant array with all 8 region entries (moved from `js/landing-page.js` lines 11–21), each entry augmented with a stable `id` field derived from the label, (3) a private `labelToId()` helper that converts labels to machine-readable IDs (e.g., `"Berlin / Hamburg"` → `"berlin-hamburg"`, `"Copenhagen Pt.\u00a01"` → `"copenhagen-pt-1"`, `"Baden-Württemberg"` → `"baden-wurttemberg"`, `"Dresden / Meißen"` → `"dresden-meissen"`), and (4) the public API surface (`init`, `getRegions`, `getRegion`, `getClusters`, `getDateIndex`, `getPhotosForDateRange`) with all getters returning pre-init safe defaults (empty arrays/objects). See `contracts/trip-model-api.md` for the full API specification.

**Checkpoint**: `window.TripModel` is globally available and all getters return safe empty values.

---

## Phase 3: User Story 1 — Single Source of Region Definitions (Priority: P1) MVP

**Goal**: The shared model provides enriched region objects derived from itinerary data, replacing the duplicated `buildRegions()` / `buildRegionSections()` functions.

**Independent Test**: Call `window.TripModel.init(itineraryData, [], [])` with real itinerary data and verify `getRegions()` returns 8 regions with correct labels, centers, date ranges, days, summaries, and hero photos matching the output of the existing `buildRegions()` in `landing-page.js`.

- [x] T003 [US1] Implement the private `buildRegions(itineraryData)` function in `js/trip-model.js` that mirrors the existing logic from `js/landing-page.js` lines 80–129: (1) build a `regionMap` keyed by itinerary region `name`, (2) for each `REGION_SECTIONS` entry, aggregate `days` from all matching itinerary regions, (3) deduplicate days by `date` field, (4) sort days chronologically, (5) average `lat`/`lng` across matched regions for `center`, (6) take `summary` and `heroPhoto` from the first matched itinerary region. Wire this into `init()` so it populates `_regions` and `_regionMap`. Handle `null` itineraryData gracefully (return regions with empty derived fields). See `data-model.md` EnrichedRegion entity for the complete field specification.

**Checkpoint**: `TripModel.getRegions()` returns 8 enriched region objects after `init()`. `TripModel.getRegion('uk')` returns the UK region.

---

## Phase 4: User Story 2 — Centralized Photo-to-Segment Assignment (Priority: P1)

**Goal**: The shared model assigns photos to trip segments, mutating photo objects with `cityIndex`/`cityName`/`cityColor` and producing clusters.

**Independent Test**: Call `window.TripModel.init(null, allPhotos, tripSegments)` with real manifest and segment data. Verify every photo has the same `cityIndex`, `cityName`, `cityColor` values as the existing `assignPhotosToTripSegments()` in `app.js`. Verify `getClusters()` returns the same cluster structure.

- [x] T004 [US2] Implement the private `assignPhotosToTripSegments(photos, segments)` function in `js/trip-model.js` by moving the logic from `js/app.js` lines 326–405 verbatim: (1) sort photos by datetime, (2) parse segment boundaries into Date objects, (3) for each photo try `datetime` first then fall back to `date` with noon assumed, (4) match `>= start && < end`, (5) mutate each photo with `cityIndex`/`cityName`/`cityColor`, (6) build and return clusters array with `photos`/`centroidLat`/`centroidLng`/`cityName`/`color`/`startDate`/`endDate`. Wire into `init()` so it populates `_clusters`. Handle empty `segments` array gracefully (all photos get fallback values: `cityIndex: -1`, `cityName: ''`, `cityColor: '#999'`). See `data-model.md` Cluster and Photo entities for field specifications.

**Checkpoint**: `TripModel.getClusters()` returns the same cluster array as the original function. All photo objects have segment metadata.

---

## Phase 5: User Story 3 — Centralized Date Index (Priority: P1)

**Goal**: The shared model builds the date-keyed photo index after assignment, replacing inline construction in `app.js`.

**Independent Test**: After full `init()`, verify `getDateIndex()` returns a date-keyed object with the same structure as the inline `dateIndex` from `app.js` — same date keys, same segment metadata per date, same photo ordering within each date.

**Depends on**: Phase 4 (US2) — date index reads `cityName`/`cityColor`/`cityIndex` from mutated photos

- [x] T005 [US3] Implement the private `buildDateIndex(photos)` function in `js/trip-model.js` by moving the logic from `js/app.js` lines 1057–1079: (1) iterate photos and group by `date` field, (2) for each new date create entry with first photo's `cityName`/`cityColor`/`cityIndex` as segment metadata, (3) sort photos within each date by `datetime` ascending (using `datetime || date || ''` for comparison). Wire into `init()` after assignment so it populates `_dateIndex`. Also implement `getPhotosForDateRange(startDate, endDate)` which filters the date index for dates within `[startDate, endDate]` inclusive (string comparison on `YYYY-MM-DD`). See `data-model.md` DateIndexEntry for the field specification.

**Checkpoint**: `TripModel.getDateIndex()` matches the structure previously built inline in `app.js`. `TripModel.getPhotosForDateRange('2026-01-27', '2026-01-30')` returns the correct photos.

---

## Phase 6: User Story 4 — Consumer Module Integration (Priority: P2)

**Goal**: Refactor the three consumer modules to read from the shared model, removing all duplicated region arrays, build functions, and assignment logic.

**Independent Test**: After integration, the app loads and renders identically — landing page cards, region nav grid, feed sidebar, photo wall, and route lines all display the same content as before. The removed functions (`REGION_SECTIONS`, `buildRegions`, `buildRegionSections`, `assignPhotosToTripSegments`) no longer exist in the consumer files.

**Depends on**: Phases 3–5 (US1, US2, US3 all complete)

- [x] T006 [P] [US4] Refactor `js/landing-page.js` — remove the `REGION_SECTIONS` array (lines 11–21) and the `buildRegions()` function (lines 80–129). Update `initLandingPage()` to read regions from `window.TripModel.getRegions()` instead of calling `buildRegions(itineraryData)`. Verify all region field accesses (`label`, `center`, `startDate`, `endDate`, `days`, `summary`, `heroPhoto`, `jsonRegions`) still work with the shared model's return structure.
- [x] T007 [P] [US4] Refactor `js/region-nav.js` — remove the `REGION_SECTIONS` array (lines 8–17) and the `buildRegionSections()` function (lines 69–112). Update the region grid rendering to read sections from `window.TripModel.getRegions()` instead of calling `buildRegionSections(itineraryData)`. Ensure the fallback grid (when itinerary data is missing) still works by reading static region definitions from the shared model.
- [x] T008 [P] [US4] Refactor `js/app.js` — (1) remove the `assignPhotosToTripSegments()` function definition (lines 326–405), (2) replace the call `clusters = assignPhotosToTripSegments(allPhotos, tripSegments)` (line 1055) with `window.TripModel.init(itineraryData, allPhotos, tripSegments); clusters = window.TripModel.getClusters();`, (3) remove the inline `dateIndex` construction loop (lines 1057–1079) and replace with `dateIndex = window.TripModel.getDateIndex();`. Verify that `clusters` and `dateIndex` are used identically downstream (passed to `buildSmartRoutes`, `initRegionNav`, `initLandingPage`, feed rendering).

**Checkpoint**: All consumer modules read from `window.TripModel`. No `REGION_SECTIONS`, `buildRegions`, `buildRegionSections`, or `assignPhotosToTripSegments` code remains in `landing-page.js`, `region-nav.js`, or `app.js`.

---

## Phase 7: Polish & Verification

**Purpose**: Visual regression check and deduplication completeness verification

- [x] T009 Visual verification at desktop (1440px) via Playwright — screenshot the app at `localhost:8000` and verify: (1) landing page shows 8 region cards with correct labels, date ranges, hero photos, and summaries, (2) region nav grid shows 8 buttons with correct labels and date ranges, (3) feed sidebar shows date entries with correct segment names and colors, (4) clicking a region filters photos correctly
- [x] T010 Visual verification at mobile (375px) via Playwright — screenshot the same views at mobile width and verify identical rendering to pre-refactor state
- [x] T011 Verify deduplication completeness — search the codebase to confirm: (1) `REGION_SECTIONS` appears only in `js/trip-model.js`, (2) no `buildRegions` or `buildRegionSections` function exists outside `js/trip-model.js`, (3) no `assignPhotosToTripSegments` function exists outside `js/trip-model.js`, (4) no inline `dateIndex` construction loop exists in `js/app.js`

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1: Setup ──────────────────────► Phase 2: Foundational
                                           │
                                           ▼
                                      Phase 3: US1 (regions)
                                      Phase 4: US2 (assignment) ──► Phase 5: US3 (date index)
                                           │                              │
                                           └──────────┬───────────────────┘
                                                      ▼
                                                 Phase 6: US4 (consumer integration)
                                                      │
                                                      ▼
                                                 Phase 7: Polish
```

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 (foundational skeleton). Independent of US2/US3.
- **US2 (P1)**: Depends on Phase 2. Independent of US1.
- **US3 (P1)**: Depends on US2 (date index reads mutated photo fields from assignment).
- **US4 (P2)**: Depends on US1 + US2 + US3 all complete (consumers need all APIs populated).

### Within Each User Story

- US1: Single task (T003) — build regions logic
- US2: Single task (T004) — assignment logic
- US3: Single task (T005) — date index logic (after US2)
- US4: Three parallel tasks (T006, T007, T008) — one per consumer file

### Parallel Opportunities

- **T003 and T004** (US1 and US2): Independent logic within `trip-model.js`. Can be implemented in sequence within the same file but have no logical dependency on each other.
- **T006, T007, T008** (US4): All three touch different files (`landing-page.js`, `region-nav.js`, `app.js`) and can be executed in parallel.
- **T009 and T010** (Polish): Desktop and mobile visual checks are independent and can run in parallel.

---

## Parallel Example: User Story 4

```bash
# Launch all three consumer refactors in parallel (different files):
Task: "T006 [P] [US4] Refactor js/landing-page.js"
Task: "T007 [P] [US4] Refactor js/region-nav.js"
Task: "T008 [P] [US4] Refactor js/app.js"
```

---

## Implementation Strategy

### MVP First (User Stories 1–3)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (T002)
3. Complete Phase 3: US1 — regions (T003)
4. Complete Phase 4: US2 — assignment (T004)
5. Complete Phase 5: US3 — date index (T005)
6. **STOP and VALIDATE**: `window.TripModel` API returns correct data for all getters

### Full Delivery

7. Complete Phase 6: US4 — consumer integration (T006, T007, T008 in parallel)
8. Complete Phase 7: Polish (T009, T010, T011)
9. **DONE**: All duplication eliminated, visual parity confirmed

---

## Notes

- All tasks modify files in `js/` — no new directories needed
- US1–US3 build into the same new file (`js/trip-model.js`), so they run sequentially
- US4 refactors three different existing files, so all three tasks can run in parallel
- The `formatDateShort()` duplication (app.js vs region-nav.js) is out of scope — noted in research.md for future cleanup
- No test tasks included (no unit test framework in this project; verification is visual via Playwright)
