# Tasks: UX/UI Audit Remediation (Updated)

**Input**: Design documents from `/specs/009-ux-ui-audit/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md
**Updated**: 2026-03-03 — added bug fix tasks from clarification session

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

### Phase 2 Verification

- [x] T007 Verify all bug fixes via Playwright on both servers: (a) localhost:8000 at 1440x900 — Trip Feed not visible, settings panel closed on load, settings button at top-left, Photo Wall X close shows reopen button, reopen button click restores wall. (b) localhost:8001 at 375x812 — same checks plus: settings button at top-left with no overlap, fast flick down from collapsed snaps to hidden, slow drag back snaps to collapsed, reopen button visible and tappable after close.

**Checkpoint**: All 6 bugs fixed. SC-010, SC-011, SC-012, SC-013, SC-014 satisfied.

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

## Phase 8: Final Verification

**Purpose**: Cross-cutting visual regression check after all bug fixes applied

- [x] T024 Full interaction walkthrough at desktop (localhost:8000 at 1440x900): load page → settings closed → click settings toggle → panel opens → close → Photo Wall visible → X close → reopen button appears → click reopen → wall returns → no Trip Feed visible anywhere
- [x] T025 Full interaction walkthrough at mobile (localhost:8001 at 375x812): load page → settings closed, button at top-left → Photo Wall collapsed → fast flick down → snaps to hidden → reopen button visible → tap reopen → wall returns to collapsed → slow drag down → snaps back to collapsed → no Trip Feed visible
- [x] T026 Compare before/after screenshots. Confirm all success criteria: SC-001 through SC-014.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Bug Fixes)**: Depends on Phase 1 (need servers running for verification)
  - T002, T003, T004, T006 can run in **parallel** (different files)
  - T005 is independent (different file from T002-T004)
  - T007 depends on T002–T006 all being complete
- **Phases 3–7**: Already completed — no action needed
- **Phase 8 (Final Verification)**: Depends on Phase 2 completion

### Parallel Opportunities (Phase 2)

```
Batch 1 (parallel — different files):
  T002: css/map.css (feed hide)
  T003: index.html (settings defaults)
  T004: css/map.css (settings button — different section from T002)
  T005: js/photo-wall.js (drag-to-close)
  T006: css/photo-wall.css (reopen button z-index)

Batch 2 (sequential — depends on Batch 1):
  T007: Playwright verification of all changes
```

Note: T002 and T004 both modify `css/map.css` but in completely different sections (feed rules ~line 638 vs mobile media query ~line 899), so they can be done in one edit session without conflicts.

---

## Implementation Strategy

### MVP (Phase 2 Only)

1. Complete Phase 1: Dual-server setup + baselines
2. Complete Phase 2: All 6 bug fixes
3. **STOP and VALIDATE**: Run T007 verification
4. If clean → proceed to Phase 8 final verification

### Execution

Since Phases 3–7 are already complete, the remaining work is:
1. **6 new tasks** (T002–T007) in Phase 2
2. **3 verification tasks** (T024–T026) in Phase 8
3. **Total: 9 tasks remaining** out of 26

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All verification uses Playwright MCP with dual-server setup (port 8000 = desktop, port 8001 = mobile)
- No new files created — all changes edit existing CSS, JS, and HTML files
- Trip Feed hide uses `!important` for maximum reversibility — remove 2 CSS rules to re-enable
- Settings panel change touches both CSS and HTML — test interaction thoroughly
