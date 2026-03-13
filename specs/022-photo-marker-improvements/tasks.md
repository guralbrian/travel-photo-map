# Tasks: Photo Marker Improvements

**Input**: Design documents from `/specs/022-photo-marker-improvements/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, quickstart.md ✅

**Scope**: 2 files, 5 concrete changes. No new files, no new dependencies.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies between them)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup

*No project initialization needed — changes are to existing files only.*

- [x] T001 Confirm local server is running (`python3 -m http.server 8000` from repo root) and the map loads at `http://localhost:8000`

---

## Phase 2: Foundational

*No blocking prerequisites — US1/US2 and US3 changes are independent and can be done in either order.*

**Checkpoint**: Ready to implement.

---

## Phase 3: User Story 1 + 2 — Geo-stable Pan and Zoom (Priority: P1/P2) 🎯 MVP

**Goal**: Replace screen-space cell key with geo-stable world-pixel key so marker assignments don't change on pan. US1 and US2 share the same single-line fix.

**Independent Test**: Pan the map across a populated area — existing markers must stay on screen throughout the drag. Zoom in/out — clusters must reform once, cleanly, after the zoom animation ends.

### Implementation

- [x] T002 [US1] In `js/ViewportSampler.js` inside `update()`, replace the line `var pt = _map.latLngToContainerPoint(L.latLng(photo.lat, photo.lng));` with `var pt = _map.project(L.latLng(photo.lat, photo.lng), _map.getZoom());` — this is the complete fix for both pan jitter and zoom flicker
- [x] T003 [US1] Use Playwright to screenshot `http://localhost:8000` at 1440px and 375px width; pan the map and confirm no marker flash is visible (check console for errors too)

**Checkpoint**: Pan and zoom are now stable. User Stories 1 and 2 are complete.

---

## Phase 4: User Story 3 — Smaller, Less Intrusive Markers (Priority: P3)

**Goal**: Reduce marker visual footprint ~25%, thin the frame border, and increase default density so geographic distribution within a city is readable without adjusting sliders.

**Independent Test**: Zoom into a city with many photos — multiple markers should be visible simultaneously, frame borders should appear thinner than before, overall markers should be smaller.

### Implementation

- [x] T004 [P] [US3] In `js/ViewportSampler.js`, replace the entire `TIER_CONFIG` array with reduced values (frameSize: 70→52, 85→64, 100→76, 115→88; stemHeight: 12→8, 14→10, 16→12); also change `var _cellSize = 150;` to `var _cellSize = 100;` on the same line where it is initialized
- [x] T005 [P] [US3] In `css/Leaflet.Photo.css`, change `.photo-frame-inner` border from `border: 3px solid white;` to `border: 2px solid white;`; reduce stem triangle sizes: tier-1 (`border-left/right: 7px`, `border-top: 12px`) → (`5px`, `8px`); tier-2 (`8px`, `14px`) → (`6px`, `10px`); tier-3 (`9px`, `16px`) → (`7px`, `12px`)
- [x] T006 [US3] Use Playwright to screenshot `http://localhost:8000` at 1440px and 375px; zoom into a city with many photos and confirm: (a) markers are visibly smaller, (b) border is thinner, (c) more markers are visible simultaneously compared to baseline

**Checkpoint**: All three user stories complete.

---

## Phase 5: Polish & Regression

**Purpose**: Verify sliders still work and nothing regressed.

- [x] T007 Open the control panel in the browser, drag the Photo Density slider (both directions) and confirm marker count changes; drag the Photo Size slider and confirm marker sizes change — verify no JS errors in console
- [x] T008 [P] Use Playwright to take a final side-by-side screenshot at both 1440px and 375px showing the completed state; confirm favorite markers (gold border) still render correctly alongside regular markers

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies
- **Foundational (Phase 2)**: No dependencies — skipped
- **US1/US2 (Phase 3)**: Can start immediately after T001
- **US3 (Phase 4)**: Independent of Phase 3 — can start in parallel with Phase 3
- **Polish (Phase 5)**: Depends on Phases 3 and 4 both complete

### User Story Dependencies

- **US1 + US2 (P1/P2)**: Single-line change to `js/ViewportSampler.js` `update()`. No dependencies on US3.
- **US3 (P3)**: T004 (`js/ViewportSampler.js` constants) and T005 (`css/Leaflet.Photo.css`) are in different files — fully parallel with each other. No dependencies on US1/US2.

### Parallel Opportunities

- T004 and T005 (different files): run in parallel
- T007 and T008 (different concerns): run in parallel

---

## Parallel Example: User Story 3

```text
# T004 and T005 can be launched together — different files, no conflict:
Task T004: Edit TIER_CONFIG + _cellSize in js/ViewportSampler.js
Task T005: Edit border + stem sizes in css/Leaflet.Photo.css
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2 only)

1. Complete T001 (confirm server running)
2. Complete T002 (one-line fix in ViewportSampler.js)
3. Complete T003 (Playwright verification)
4. **STOP and VALIDATE**: Pan and zoom are stable — ship if needed

### Incremental Delivery

1. T001 → T002 → T003: Pan/zoom stability (MVP, ~10 minutes of work)
2. T004 + T005 in parallel → T006: Smaller markers (~15 minutes)
3. T007 + T008: Regression check and final screenshots

### Total

| Phase | Tasks | Files |
|-------|-------|-------|
| US1+US2 | T002–T003 | `js/ViewportSampler.js` |
| US3 | T004–T006 | `js/ViewportSampler.js`, `css/Leaflet.Photo.css` |
| Polish | T007–T008 | — (verification only) |
| **Total** | **8 tasks** | **2 files** |
