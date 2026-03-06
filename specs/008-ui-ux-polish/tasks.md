# Tasks: UI and UX Polish

**Input**: Design documents from `/specs/008-ui-ux-polish/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: Not requested — manual visual testing only (per quickstart.md).

**Organization**: Tasks grouped by user story. All changes are CSS edits to existing files (`css/map.css`, `css/photo-wall.css`). No new files, no setup phase, no foundational phase needed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: User Story 1 — Glassmorphism & Visual Depth (Priority: P1) 🎯 MVP

**Goal**: Lower panel background opacities from 0.88–0.97 to 0.80–0.82 so the map is visible through all panels.

**Independent Test**: Open each panel (Controls, Trip Feed, Photo Wall) and verify map colors/shapes are visible but softly blurred through the panel background.

### Implementation for User Story 1

- [x] T001 [US1] Lower Control Panel background opacity from `rgba(24, 24, 28, 0.88)` to `rgba(24, 24, 28, 0.80)` in `css/map.css`
- [x] T002 [US1] Lower Trip Feed sidebar background opacity from `rgba(24, 24, 28, 0.88)` to `rgba(24, 24, 28, 0.80)` in `css/map.css`
- [x] T003 [US1] Lower Photo Wall panel background (`--wall-bg`) from `rgba(24, 24, 28, 0.97)` to `rgba(24, 24, 28, 0.82)` in `css/photo-wall.css`
- [x] T004 [US1] Verify text readability on all three panels against various map tile backgrounds (light, dark, satellite)

**Checkpoint**: All three panels should show map content through their backgrounds. Text remains legible.

---

## Phase 2: User Story 2 — Enhanced Photo Wall Header (Priority: P1)

**Goal**: Refine the "PHOTOS" title and date label typography for a more editorial, premium look.

**Independent Test**: Expand photo wall to half or full screen; "PHOTOS" title should have wide letter-spacing and the date label should be clearly legible.

### Implementation for User Story 2

- [x] T005 [US2] Increase `.photo-wall-title` letter-spacing from `0.06em` to `0.12em` in `css/photo-wall.css`
- [x] T006 [US2] Increase `.photo-wall-date` color opacity from `0.5` to `0.6` in `css/photo-wall.css`
- [x] T007 [US2] Add a subtle bottom border separator (`1px solid rgba(255, 255, 255, 0.06)`) to `.photo-wall-header` in `css/photo-wall.css`

**Checkpoint**: Photo wall header feels editorial and polished. Date label is legible with the new lower panel opacity from US1.

---

## Phase 3: User Story 3 — Interactive Grid Hover (Priority: P2)

**Goal**: Add desktop-only `:hover` state on photo grid items with scale-up and subtle gold-tinted shadow.

**Independent Test**: On desktop, hover over any photo in the grid — it should scale up 1.03x with a soft glow. On mobile/touch, no hover effect fires.

### Implementation for User Story 3

- [x] T008 [US3] Add `@media (hover: hover)` block with `.photo-wall-item:hover` rule — `transform: scale(1.03)`, `box-shadow: 0 2px 12px rgba(212, 168, 83, 0.15)`, `z-index: 1` — in `css/photo-wall.css`
- [x] T009 [US3] Update `.photo-wall-item` base transition from `transform 80ms` to `transform 200ms ease-out, box-shadow 200ms ease-out` in `css/photo-wall.css`
- [x] T010 [US3] Verify hover does not cause layout shifts or z-index stacking issues when rapidly moving across grid items

**Checkpoint**: Desktop hover feedback is smooth and subtle. Touch devices unaffected.

---

## Phase 4: User Story 4 — Refined Reopen Button (Priority: P2)

**Goal**: Restyle the photo wall reopen button from a dark pill to a gold circle matching the Panel and Feed toggle buttons.

**Independent Test**: Hide the photo wall; the reopen button should be a 44px gold circle visually indistinguishable from the Panel/Feed toggles.

### Implementation for User Story 4

- [x] T011 [US4] Restyle `.photo-wall-reopen` in `css/photo-wall.css`: change to `width: 44px; height: 44px; border-radius: 50%; background: #d4a853; color: #18181c; border: none; padding: 0; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3)`
- [x] T012 [US4] Update `.photo-wall-reopen:hover` to `background: #e0b862` in `css/photo-wall.css`
- [x] T013 [US4] Adjust reopen button content/icon to center properly in circular layout — swapped text "▲ Photos" for SVG photo icon in `index.html`
- [x] T014 [US4] Verify reopen button matches Panel toggle and Feed toggle in size, color, shadow, and border-radius

**Checkpoint**: All three panel toggle buttons (Controls, Feed, Photos) look visually consistent.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Normalize transitions and final validation across all changes.

- [x] T015 Normalize button hover transition timings to `200ms` in `css/map.css` (panel toggle, feed toggle hover states currently at 150ms)
- [x] T016 Normalize button hover transition timings to `200ms` in `css/photo-wall.css` (any remaining sub-200ms hover transitions)
- [x] T017 Run full quickstart.md visual testing checklist in `specs/008-ui-ux-polish/quickstart.md`
- [x] T018 Cross-browser verification: Chrome, Firefox, Safari — confirm `backdrop-filter` renders correctly with new opacity values

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (US1)**: No dependencies — can start immediately
- **Phase 2 (US2)**: Depends on Phase 1 — date label readability is validated against new lower opacity
- **Phase 3 (US3)**: No dependency on US1/US2 — touches different selectors
- **Phase 4 (US4)**: No dependency on US1/US2/US3 — touches different selectors
- **Phase 5 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent — start first (MVP)
- **US2 (P1)**: Soft dependency on US1 — the lowered opacity affects header readability, so US2 typography should be tuned after US1 values are set
- **US3 (P2)**: Independent — different selectors in same file
- **US4 (P2)**: Independent — different selectors in same file

### Within Each User Story

- CSS changes before visual verification
- All changes in same file grouped together to avoid edit conflicts

### Parallel Opportunities

- **US3 and US4 can run in parallel** — they touch completely different selectors (`.photo-wall-item` vs `.photo-wall-reopen`), though both are in `css/photo-wall.css`
- **US1 and US3/US4 can partially overlap** — US1 map.css changes are independent from US3/US4 photo-wall.css changes

---

## Parallel Example: User Stories 3 & 4

```text
# These can run simultaneously (different selectors, same file):
Task: T008 [US3] Add hover states to .photo-wall-item in css/photo-wall.css
Task: T011 [US4] Restyle .photo-wall-reopen to gold circle in css/photo-wall.css
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: US1 — lower panel opacities
2. **STOP and VALIDATE**: Open all panels, verify map visibility through backgrounds
3. This single change delivers the biggest visual improvement

### Incremental Delivery

1. US1 → Glassmorphism visible → Validate → (biggest visual impact)
2. US2 → Header refined → Validate → (complements lowered opacity)
3. US3 + US4 in parallel → Hover + Button → Validate → (desktop polish + toggle consistency)
4. Polish → Transition normalization → Final cross-browser check

### Suggested MVP Scope

**US1 alone** delivers the most impactful change — making the map visible through panels. It's 3 opacity value changes across 2 files. Can be done and validated in minutes.

---

## Notes

- All 18 tasks are CSS-only edits — no JavaScript changes needed
- Total scope: ~50–80 lines of CSS changed across 2 files
- No new files created
- Verification tasks (T004, T010, T014, T017, T018) are manual visual checks
- Commit after each user story phase for clean git history
