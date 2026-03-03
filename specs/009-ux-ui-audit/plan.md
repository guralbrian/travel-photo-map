# Implementation Plan: UX/UI Audit Remediation

**Branch**: `009-ux-ui-audit` | **Date**: 2026-03-03 | **Spec**: `specs/009-ux-ui-audit/spec.md`
**Input**: Feature specification from `/specs/009-ux-ui-audit/spec.md`

## Summary

Remediate 6 bug-level issues and 20+ visual/usability issues discovered during a UX/UI audit. The work is pure frontend (CSS + vanilla JS) with no data model, backend, or dependency changes. Key deliverables: hide Trip Feed, fix Photo Wall close/reopen/drag-to-close cycle, reposition settings button, default settings panel to closed, establish CSS custom property design tokens, fix typography inheritance, enlarge mobile touch targets, resolve z-index conflicts, and replace legacy light-theme colors.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+), CSS3, HTML5
**Primary Dependencies**: Leaflet.js (existing, vendored) — no new dependencies
**Storage**: N/A — pure visual changes, no data persistence
**Testing**: Playwright MCP visual screenshots on two parallel local servers
**Target Platform**: Web — desktop (1440px) and mobile (375px) viewports
**Project Type**: Single static web application
**Performance Goals**: 60fps on map interactions; no layout shifts during panel transitions
**Constraints**: No build step; no frameworks; all changes in vanilla CSS/JS; static-file deployable
**Scale/Scope**: 4 CSS files modified, 1 JS file modified, 1 HTML file modified

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy by Default | PASS | No data changes; no external services added |
| II. Static & Zero-Config | PASS | Pure CSS/JS changes; remains static-file deployable |
| III. Approachable by Everyone | PASS | Directly improves: 44px touch targets, discoverable reopen buttons, intuitive panel behavior |
| IV. Professional Visual Polish | PASS | Core focus: design tokens, consistent typography, unified transitions |
| V. Performant at Any Scale | PASS | CSS custom properties have zero runtime cost; no new JS computations |
| VI. Unified Media Experience | PASS | Photo Wall and Photo Viewer interaction fixes improve media browsing |
| VII. Map-Centric Integration | PASS | Controls remain as map overlays; panels minimize to preserve map view |

No violations. No complexity tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/009-ux-ui-audit/
├── plan.md              # This file
├── research.md          # Phase 0 output — code audit findings
├── data-model.md        # Phase 1 output — N/A (no data changes)
├── quickstart.md        # Phase 1 output — testing setup guide
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (files to modify)

```text
css/
├── map.css              # Design tokens, panel-toggle position, control-panel defaults,
│                        #   feed hiding, z-index fixes, touch targets, legacy color replacement
├── photo-wall.css       # Photo Wall token consumption, reopen button z-index,
│                        #   drag handle visibility, typography fixes
├── photo-viewer.css     # Close button pointer-events fix, token consumption
└── Leaflet.Photo.css    # Popup color fixes (legacy #666/#333 replacement)

js/
└── photo-wall.js        # Drag-to-close (hidden snap target), reopen button reliability

index.html               # Control panel default state (add 'hidden' class),
                         #   toggle button initial display
```

**Structure Decision**: No new files created. All changes are modifications to existing CSS/JS/HTML files. Design tokens are defined as CSS custom properties in `css/map.css` `:root` block (already partially exists with `--color-accent`, `--z-*` variables).

## Change Inventory

### Group A: Bug Fixes (P0 — must ship)

| ID | File(s) | Change | FR |
|----|---------|--------|----|
| A1 | `css/map.css` | Hide Trip Feed: add `display:none!important` to `.feed-sidebar`, `.feed-toggle` | FR-017 |
| A2 | `js/photo-wall.js` | Drag-to-close: in `_onPointerUp`, when `currentState === 'collapsed'` and velocity > 400 downward, snap to `'hidden'` instead of staying at `'collapsed'` | FR-020 |
| A3 | `js/photo-wall.js` | Ensure reopen button visibility toggle fires reliably in `_onSnapStateChange` for all close paths | FR-002, FR-021 |
| A4 | `css/map.css`, `index.html` | Control panel defaults to closed: add `hidden` class to panel element, show toggle button by default | FR-019 |
| A5 | `css/map.css` | Move `.panel-toggle` to top-left on mobile (override `bottom`/`right` with `top: 10px; left: 10px`) | FR-018 |
| A6 | `css/photo-wall.css` | Ensure `.photo-wall-reopen-btn` z-index is above all other bottom-positioned elements | FR-021 |

### Group B: Design Token System (P1)

| ID | File(s) | Change | FR |
|----|---------|--------|----|
| B1 | `css/map.css` | Define complete `:root` token set: colors, font sizes (6-tier scale), transition durations, easing functions, z-index layers | FR-006 |
| B2 | `css/map.css`, `css/photo-wall.css`, `css/photo-viewer.css` | Replace all hardcoded values with token references | FR-006 |
| B3 | `css/map.css` | Declare `font-family` on `body` using system font stack | FR-001 |
| B4 | `css/map.css`, `css/Leaflet.Photo.css` | Replace legacy `#666`, `#333` with dark-theme token values | FR-007 |
| B5 | All CSS files | Unify gold hover color to single `--color-accent-hover` token | FR-011 |

### Group C: Touch Target & Accessibility (P1)

| ID | File(s) | Change | FR |
|----|---------|--------|----|
| C1 | `css/map.css` | Accordion `<summary>` elements: `min-height: 44px; padding` | FR-004 |
| C2 | `css/map.css` | Radio/checkbox label rows: `min-height: 44px` | FR-005 |
| C3 | `css/photo-wall.css`, `css/photo-viewer.css` | Close buttons: ensure 44x44px minimum on mobile | FR-003 |

### Group D: Z-Index & Layering (P2)

| ID | File(s) | Change | FR |
|----|---------|--------|----|
| D1 | `css/map.css` | Define z-index token scale: map(0) < markers(100) < panels(1000) < controls(1001) < viewer(1100) | FR-008 |
| D2 | `css/photo-viewer.css` | Fix close button `pointer-events` so media container doesn't intercept clicks | FR-009 |
| D3 | `css/map.css`, `css/photo-wall.css` | Ensure reopen buttons don't overlap on mobile | FR-010 |

### Group E: Visual Polish (P3)

| ID | File(s) | Change | FR |
|----|---------|--------|----|
| E1 | `css/photo-wall.css` | Header left padding matches control panel header | FR-012 |
| E2 | All CSS files | Unify transition durations to token values | FR-013 |
| E3 | `css/photo-wall.css` | Increase drag handle visual presence (taller bar, more opacity) | FR-016 |
| E4 | `css/photo-wall.css` | Increase collapsed state height on mobile for 2+ thumbnail rows | FR-015 |

## Implementation Order

```
Phase 1: Bug Fixes (A1–A6)
  ├── A1 (Trip Feed hide) — independent
  ├── A4 + A5 (Settings panel + button) — independent
  └── A2 + A3 + A6 (Photo Wall close/reopen cycle) — dependent chain

Phase 2: Design Tokens (B1–B5)
  ├── B1 (Define tokens) — must come first
  ├── B3 (Body font-family) — independent
  └── B2 + B4 + B5 (Token consumption) — depends on B1

Phase 3: Touch Targets (C1–C3) — independent of Phase 2

Phase 4: Z-Index & Layering (D1–D3) — should follow B1 for token references

Phase 5: Visual Polish (E1–E4) — should follow B1 for token references
```

## Testing Strategy

**Dual-server parallel testing** per FR-022:

| Server | Viewport | Purpose |
|--------|----------|---------|
| `localhost:8000` | Desktop 1440x900 | Desktop visual verification |
| `localhost:8001` | Mobile 375x812 | Mobile visual verification |

**Test after each phase:**
1. Screenshot both viewports via Playwright MCP
2. Verify phase-specific acceptance criteria
3. Test panel open/close/reopen cycle on both viewports
4. Confirm no regressions in unmodified panels

**Key interaction tests:**
- Photo Wall: X close → reopen button appears → click reopen → wall returns to collapsed
- Photo Wall: drag down fast from collapsed → snaps to hidden → reopen button appears
- Photo Wall: drag down slow from collapsed → snaps back to collapsed (not hidden)
- Settings: page load → panel closed → click toggle → panel opens → click toggle → closes
- Settings button: visible at top-left on both desktop and mobile, no overlap with Photo Wall

## Complexity Tracking

No constitution violations. No complexity justifications needed.
