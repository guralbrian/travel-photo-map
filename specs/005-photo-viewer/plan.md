# Implementation Plan: Immersive Photo Viewer Bug Fixes

**Branch**: `005-photo-viewer` | **Date**: 2026-03-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-photo-viewer/spec.md`

## Summary

Fix five bugs in the existing photo viewer (`js/photo-viewer.js`, `css/photo-viewer.css`): (1) double-tap on iPhone locks into persistent zoom, (2) rapid desktop clicking falls through to backdrop and closes viewer, (3) close/nav buttons have ugly stretched-oval styling, (4) auto-hide timer is too aggressive at 2–3 seconds, (5) desktop scroll-wheel zoom targets the wrong point (middle-right instead of cursor position). All fixes are scoped to the two existing files — no new files, no new dependencies.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+), CSS3, HTML5
**Primary Dependencies**: None (Leaflet.js existing, vendored; Pointer Events API)
**Storage**: N/A — client-side only; reads from existing photo manifest and cloud data
**Testing**: Manual browser testing (mobile Safari/iOS, desktop Chrome, desktop Firefox)
**Target Platform**: Mobile browsers (iOS Safari, Android Chrome) + Desktop browsers (Chrome, Firefox)
**Project Type**: Single static web project
**Performance Goals**: Viewer open <300ms mobile / <200ms desktop; 60fps animations; zoom centered on cursor within 1px accuracy
**Constraints**: No build step, no frameworks, no npm; all code vendored; static-file deployment
**Scale/Scope**: 2 files modified (`js/photo-viewer.js`, `css/photo-viewer.css`); ~50 lines changed

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy by Default | PASS | No data changes; viewer is client-side only |
| II. Static & Zero-Config | PASS | No new dependencies, APIs, or build steps |
| III. Approachable by Everyone | PASS | Fixes directly improve usability (stuck zoom, accidental close, auto-hide timing) |
| IV. Professional Visual Polish | PASS | Button restyling addresses stretched-oval appearance with consistent circular design |
| V. Performant at Any Scale | PASS | No performance regressions; zoom math fix is computationally equivalent |
| VI. Unified Media Experience | PASS | Photo/video viewing experience improved by fixing interaction bugs |
| VII. Map-Centric Integration | PASS | Viewer remains an overlay on the map; no navigation changes |

**Gate result: PASS** — All principles satisfied. No violations to justify.

## Project Structure

### Documentation (this feature)

```text
specs/005-photo-viewer/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
js/
└── photo-viewer.js      # Gesture FSM, zoom logic, control visibility, double-tap handler

css/
└── photo-viewer.css     # Button styling (close, nav, favorite), control transitions
```

**Structure Decision**: This is a bug-fix plan targeting two existing files in the flat static project structure. No new files or directories are created. No contracts directory is needed — there are no APIs.

## Bug Analysis & Fix Design

### Bug 1: Double-tap on iPhone locks into persistent zoom (FR-005a)

**Root cause**: The `dblclick` event handler (line 155) zooms to 2.5x but has no deterministic toggle back to 1x. On iOS, rapid taps or touch event timing quirks can cause the `dblclick` to fire without a subsequent event to reset, leaving the user stuck at 2.5x with no way out.

**Fix**:
- Change `dblclick` handler to toggle between 1x and 2x (not 2.5x) at the tap point
- If `S.scale > 1.05`, always `animResetZoom()` (already correct)
- If at 1x, `zoomAt(2, e.clientX, e.clientY)` (was 2.5, now 2 per spec)
- Add a dedicated double-tap detector in the pointer event system (more reliable than `dblclick` on mobile) with 300ms timeout between taps
- Ensure `G.mode` resets to `IDLE` after double-tap zoom completes

**Files**: `js/photo-viewer.js` lines 154–159

### Bug 2: Rapid clicking closes viewer — backdrop click-through (FR-016, FR-016a)

**Root cause**: When the user clicks a nav arrow, the auto-hide timer (2s) runs out or the controls fade mid-click-sequence. The next click lands on `$ov` or `$wrap`, triggering the backdrop close handler (line 104). There's no guard period after navigation transitions.

**Fix**:
- Add a `S.navGuard` timestamp that records when the last nav transition completed
- In the backdrop click handler (line 104), check `Date.now() - S.navGuard < 300` and skip close if true
- In `nav()` and `commitSwipe()`, call `showCtrl()` and `resetHide()` to keep controls visible during active browsing
- In `onKey()` for arrow keys, also call `showCtrl()` and `resetHide()`

**Files**: `js/photo-viewer.js` lines 104–107, 631–634, 622–628, 409–418

### Bug 3: Buttons look ugly and stretched oval (FR-008)

**Root cause**: The close button (`.pv-close`) has `background: none` with a raw `×` character at 36px font-size, and nav arrows have `padding: 16px 12px` (asymmetric) causing oval shape despite `border-radius: 50%`.

**Fix**:
- Close button: add circular semi-transparent dark background (`rgba(0,0,0,0.5)`), equalize dimensions to 44px circle, center the icon
- Nav arrows: equalize padding to `12px` (symmetric), enforce `width: 48px; height: 48px` for perfect circle
- Favorite button: add matching circular background
- All buttons: consistent `border-radius: 50%; backdrop-filter: blur(4px)` for glass effect matching constitution's "dark glass panels" design language

**Files**: `css/photo-viewer.css` lines 128–212

### Bug 4: Auto-hide timer too aggressive (FR-016)

**Root cause**: Constants `MOBILE_HIDE_MS = 3000` and `DESKTOP_HIDE_MS = 2000` (line 13) cause controls to vanish before users can click.

**Fix**:
- Change both constants to `4000` (4 seconds per clarified spec)
- (Combined with Bug 2 fix: `resetHide()` called on every nav action)

**Files**: `js/photo-viewer.js` line 13

### Bug 5: Desktop zoom targets wrong position (FR-010)

**Root cause**: The `zoomAt()` function (line 261) uses `$wrap.getBoundingClientRect()` to compute the relative mouse position. However, `$wrap` is a flex container that fills the viewport, and during zoom transforms its `getBoundingClientRect()` returns the *transformed* bounds (which shift as the content scales), not the static viewport origin. This causes the zoom anchor point to drift to the middle-right.

**Fix**:
- Replace `$wrap.getBoundingClientRect()` with `$media.getBoundingClientRect()` or compute the offset relative to the *viewport center* since `$media` is always centered in the viewport
- More robustly: use `window.innerWidth / 2` and `window.innerHeight / 2` as the reference point for the un-transformed origin, then compute `mx = cx - vw/2` and `my = cy - vh/2` relative to center
- This ensures the zoom pivot is always the cursor's actual position regardless of current transform state

**Files**: `js/photo-viewer.js` lines 261–273

## Complexity Tracking

> No constitution violations. All fixes are minimal, targeted edits to two existing files.
