# Implementation Plan: UX/UI Audit Remediation

**Branch**: `009-ux-ui-audit` | **Date**: 2026-03-03 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/009-ux-ui-audit/spec.md`

## Summary

Remediate all issues found during a comprehensive UX/UI audit across desktop (1440px) and mobile (375px) viewports. The work falls into six categories: (1) design token consolidation, (2) typography and color consistency, (3) touch target accessibility, (4) z-index and layering fixes, (5) Photo Wall interaction bug fixes, and (6) removal of duplicate route rendering code. All changes are pure frontend — CSS modifications, minor JS event wiring, and dead code removal. No new dependencies, data models, or backend changes.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+), CSS3, HTML5
**Primary Dependencies**: Leaflet.js (vendored), no new dependencies
**Storage**: N/A — pure visual changes, no data persistence
**Testing**: Playwright MCP visual regression (dual-viewport: 1440px desktop, 375px mobile)
**Target Platform**: Static web app (any HTTP server, GitHub Pages)
**Project Type**: Single-page web application
**Performance Goals**: 60fps transitions, no layout shifts
**Constraints**: No build step, no transpilation, no frameworks. System font stack only.
**Scale/Scope**: ~7 CSS files (~2,200 lines), 1 HTML file, 3 JS files touched

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Compliance |
|-----------|--------|------------|
| I. Privacy by Default | PASS | No analytics, tracking, or external data transmission added |
| II. Static & Zero-Config | PASS | All changes are CSS/JS edits to existing static files. No new dependencies, APIs, or build steps |
| III. Approachable by Everyone | PASS | Core goal — enlarging touch targets, improving discoverability, fixing non-functional buttons |
| IV. Professional Visual Polish | PASS | Core goal — design tokens, consistent typography, unified color palette, smooth transitions |
| V. Performant at Any Scale | PASS | Removing duplicate route rendering (28→14 polylines) improves performance. CSS custom properties have negligible overhead |
| VI. Unified Media Experience | PASS | Photo Viewer close button fix (FR-009) restores full viewing workflow |
| VII. Map-Centric Integration | PASS | All changes are overlays/panels on the single map surface. Route line cleanup keeps map as hero element |
| Technology Constraints | PASS | Vanilla JS + CSS only. No new vendored libs. No build step. |

**Gate result**: ALL PASS — no violations.

## Project Structure

### Documentation (this feature)

```text
specs/009-ux-ui-audit/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (minimal — no new entities)
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (files touched)

```text
css/
├── photo-wall.css       # Design tokens (already partially defined here), wall styling
├── map.css              # Controls panel, feed sidebar, timeline, toggles, popups
├── photo-viewer.css     # Viewer overlay, close/nav buttons, info panel
├── Leaflet.Photo.css    # Photo markers, cluster badges
├── MarkerCluster.css    # Cluster animations (minor)
└── MarkerCluster.Default.css  # Cluster colors (minor)

js/
├── photo-wall.js        # Photo Wall close/reopen/drag behavior
├── photo-viewer.js      # Viewer open/close, pointer-events fix
└── route-builder.js     # Smart routes (sole renderer after cleanup)

index.html               # Controls panel, feed sidebar, route toggle, legacy route removal
```

**Structure Decision**: Existing single-page structure. No new files created — all work is edits to existing CSS and JS files. Design tokens are centralized in `css/photo-wall.css` `:root` block and consumed via `var()` references across all CSS files.

## Implementation Approach

### Layer 1: Design Token Foundation (FR-006, FR-014)

**Current state**: Design tokens partially exist in `photo-wall.css` `:root`:
- Colors: `--color-accent`, `--color-text`, `--color-bg-panel`, etc.
- Z-index: `--z-panel` through `--z-viewer-controls`
- Timing: `--duration-fast/normal/slow`, `--easing-enter/standard`

**Needed**: Extend token coverage and migrate all hardcoded values:
1. **Move tokens to a shared location** — keep in `photo-wall.css` `:root` since it loads first and is already the token home
2. **Add missing tokens**: font-size scale (rationalize 12 sizes → 6), spacing scale, border-radius
3. **Migrate consumers**: Replace hardcoded hex colors, font-sizes, transitions in `map.css`, `photo-viewer.css`, `Leaflet.Photo.css` with `var()` references
4. **Scope exclusions**: Route segment colors from `trip_segments.json` remain data-driven (per clarification)

**Font size scale** (rationalized from 12 to 6):
```css
--font-xs: 0.7rem;    /* ~11px — badges, timestamps */
--font-sm: 0.8rem;    /* ~13px — secondary text, labels */
--font-base: 0.875rem; /* 14px — body text, controls */
--font-md: 1rem;       /* 16px — section headers, panel titles */
--font-lg: 1.125rem;   /* 18px — panel headings */
--font-xl: 1.25rem;    /* 20px — overlay titles (rare) */
```

### Layer 2: Typography & Color Consistency (FR-001, FR-007, FR-011)

1. **Global font-family on `body`** — already declared in `map.css` on `html, body`. Verify propagation to Photo Wall (currently inherits correctly after token work)
2. **Font-family unification** — `photo-viewer.css` uses a slightly different stack (includes Roboto). Normalize to single stack
3. **Legacy color removal** — search for `#666`, `#333`, and replace with token equivalents
4. **Gold hover unification** — standardize `#e0b86a` vs `#e0b862` drift to single `--color-accent-hover`

### Layer 3: Touch Target Accessibility (FR-003, FR-004, FR-005)

**Current state**: Most touch targets already at 44px from previous work (commit `ecb157e`). Verify:
- Panel close buttons: 44px on mobile ✓
- Accordion headers: `min-height: 44px` on mobile ✓
- Layer option rows: `min-height: 44px` on mobile ✓
- Photo popup link ("View on Google Photos"): needs verification

**Remaining**: Audit any elements missed in previous pass. Photo Wall collapse/close buttons are 28px on desktop but 44px on mobile — this is intentional (desktop has mouse precision).

### Layer 4: Z-Index & Layering Fixes (FR-008, FR-009, FR-010)

**Current token hierarchy**:
```
--z-panel:          1000  (feed sidebar, controls panel)
--z-panel-controls: 1001  (internal panel controls)
--z-panel-toggle:   1002  (toggle buttons)
--z-panel-full:     1003  (photo wall full-screen)
--z-viewer:         2000  (photo viewer overlay)
--z-viewer-controls:2001  (photo viewer UI)
```

**Fixes needed**:
1. Trip Feed z-index conflict with Photo Wall → resolved by hiding Trip Feed (FR-017)
2. Photo Viewer close button intercepted by media container → add `pointer-events: none` to media wrapper, `pointer-events: auto` on close button
3. Mobile reopen button overlap → ensure stacking context separates Controls toggle and Photo Wall reopen button positions

### Layer 5: Photo Wall Interaction Fixes (FR-002, FR-020, FR-021)

**Close button** (FR-002): Already wired in `photo-wall.js:512-517` — verify it triggers `snapTo('hidden')` and the reopen button gets `.visible` class

**Velocity-based drag-to-close** (FR-020):
- Photo Wall PanelSnap already implements drag with snap points
- Need to add velocity detection: track pointer positions over time, compute velocity on pointerup
- If velocity > 400px/s downward past collapsed state → `snapTo('hidden')`
- If slow drag below collapsed → snap back to `collapsed`

**Gold reopen button** (FR-021): Already in `photo-wall.js:520-525` — verify `.visible` class toggles correctly and button is not obscured by z-index conflicts

### Layer 6: Route Rendering Cleanup (FR-023)

**The bug**: `index.html` contains two route-rendering systems:
1. Line 890: `buildSmartRoutes()` → smart waypoint-based routes (14 polylines)
2. Lines 924-968: Legacy straight city-to-city lines (14 more polylines)

Both are added to the map simultaneously (28 total SVG paths). Line 967 overwrites `travelRouteLayer` with legacy routes, so the Map Layers toggle only controls legacy routes while smart routes stay permanently visible.

**Fix**:
1. Delete lines 924-968 (legacy route code + `calcBearing` duplicate + `arrowMarkers` array)
2. Delete the zoom-based arrow handler that references the now-deleted `arrowMarkers` (lines 971-979) — this is handled inside `route-builder.js` already
3. `travelRouteLayer` remains set from line 890 (smart routes) — the route toggle at line 1157 will correctly control smart routes
4. Verify: 14 polylines rendered (not 28), toggle works

### Layer 7: Panel Visibility Defaults (FR-017, FR-018, FR-019)

1. **Hide Trip Feed** (FR-017): Add `display: none` to `#feed-sidebar` and `#feed-toggle` in CSS
2. **Controls toggle position** (FR-018): Verify top-left placement on both viewports
3. **Controls closed on load** (FR-019): Already starts with `hidden` class — verify

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Token migration breaks existing styles | Medium | High | Incremental migration with Playwright screenshots after each file |
| Velocity drag calculation inaccurate | Low | Medium | Use pointer event timestamps; test with Playwright slow/fast gestures |
| Removing legacy routes breaks toggle | Low | High | Verify `travelRouteLayer` reference chain before and after deletion |
| Z-index changes create new conflicts | Low | Medium | Test all panel combinations at both viewports |

## Complexity Tracking

> No constitution violations — table not needed.
