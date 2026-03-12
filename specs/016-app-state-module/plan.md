# Implementation Plan: Lightweight App State Module

**Branch**: `016-app-state-module` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/016-app-state-module/spec.md`

## Summary

Create `js/app-state.js` as an ES5-compatible IIFE exposing `window.appState` — a minimal key-value store for top-level UI coordination state (`activePanel`, `activeRegionId`, `visibleDateRange`, `viewerOpen`, `mapInteractive`, `baseLayer`). Integrate it into the four existing modules that own those values: `panel-manager.js` (panel state), `app.js` (date range), `region-nav.js` (region selection), and `photo-viewer.js` (viewer open/closed). Existing custom events and behavior remain unchanged.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES5-compatible IIFEs)
**Primary Dependencies**: None new — Leaflet.js (existing, vendored)
**Storage**: N/A — in-memory only, no persistence
**Testing**: Manual browser testing via Playwright MCP (screenshot verification)
**Target Platform**: Static web (GitHub Pages), all modern browsers + mobile
**Project Type**: Single static web app
**Performance Goals**: Synchronous state updates within same execution frame; zero overhead on map rendering (60fps unaffected)
**Constraints**: No build step, no transpilation, no external dependencies, ES5-compatible
**Scale/Scope**: 6 managed state keys, 4 module integration points, ~80 lines of new code in app-state.js

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy by Default | **PASS** | No new data collection, storage, or transmission. State is ephemeral in-memory. |
| II. Static & Zero-Config | **PASS** | Pure client-side JS, no server, no API keys. Loads as a static script. |
| III. Approachable by Everyone | **PASS** | No user-facing changes. Internal developer infrastructure only. |
| IV. Professional Visual Polish | **PASS** | No visual changes. FR-009 explicitly requires zero visual/behavioral changes. |
| V. Performant at Any Scale | **PASS** | Synchronous key-value reads/writes. No loops, no DOM queries, no rendering impact. |
| VI. Unified Media Experience | **PASS** | No change to media handling. Viewer tracking is read-only observation. |
| VII. Map-Centric Integration | **PASS** | No new UI surfaces. State module is invisible infrastructure. |
| Technology Constraints | **PASS** | ES5 IIFE, no build step, no npm, vendored in `js/`. |

No violations. Complexity Tracking table not needed.

## Project Structure

### Documentation (this feature)

```text
specs/016-app-state-module/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── app-state-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
js/
├── app-state.js         # NEW — shared state module (this feature)
├── app.js               # MODIFY — integrate visibleDateRange updates
├── panel-manager.js     # MODIFY — integrate activePanel updates
├── region-nav.js        # MODIFY — integrate activeRegionId updates
├── photo-viewer.js      # MODIFY — integrate viewerOpen updates
├── trip-model.js        # NO CHANGE — data model, not coordination state
├── photo-wall.js        # NO CHANGE — reads state, doesn't own coordination state
├── landing-page.js      # NO CHANGE
├── route-builder.js     # NO CHANGE
├── ViewportSampler.js   # NO CHANGE
└── ...

index.html               # MODIFY — add app-state.js script tag before app.js
```

**Structure Decision**: This feature adds one new file (`js/app-state.js`) and modifies four existing files plus `index.html`. No new directories needed. Follows the existing flat `js/` convention.

### Script Load Order (updated)

```text
1. leaflet.js, Leaflet.Photo.js          (mapping)
2. ViewportSampler.js, route-builder.js   (utilities)
3. app-state.js                           (NEW — must load before consumers)
4. photo-viewer.js                        (viewer — writes viewerOpen)
5. panel-manager.js                       (panels — writes activePanel)
6. photo-wall.js                          (photo grid)
7. trip-model.js                          (data model)
8. region-nav.js                          (nav — writes activeRegionId)
9. landing-page.js                        (landing overlay)
10. app.js                                (orchestrator — writes visibleDateRange)
11. firebase-init.js, auth.js, cloud-data.js (ES modules)
```

## Integration Points

### 1. Panel State → `panel-manager.js`

**Current**: `PanelCoordinator._activePanel` (closure variable, line ~134). Updated in `activate(panelId)` method. Dispatches `panel:activate` / `panel:deactivate` custom events.

**Change**: After updating `_activePanel`, also call `window.appState.set('activePanel', panelId)`. On deactivate (when no panel replaces it), call `window.appState.set('activePanel', null)`.

**Compatibility**: Custom events continue to fire as before. `appState` is an additional, non-breaking write.

### 2. Visible Date Range → `app.js`

**Current**: `uniqueDates[]`, `handleMin.value`, `handleMax.value` closure variables. `applyTimelineFilter()` (line ~923) reads the slider values to compute the filtered date range.

**Change**: In `applyTimelineFilter()`, after computing the min/max dates, call `window.appState.set('visibleDateRange', { min: startDate, max: endDate })`. Also set initial range after timeline is built (~line 1157).

### 3. Region Selection → `region-nav.js`

**Current**: `_activeIndex` (closure variable, line 12). Updated in `selectRegion(index)` and `deselectRegion()`. Region ID derived from `_sections[index]`.

**Change**: In `selectRegion()`, after setting `_activeIndex`, call `window.appState.set('activeRegionId', regionId)`. In `deselectRegion()`, call `window.appState.set('activeRegionId', null)`.

### 4. Viewer Open/Closed → `photo-viewer.js`

**Current**: `S.open` (closure variable in photo-viewer IIFE). Set to `true` in open handler, `false` in close handler.

**Change**: After setting `S.open = true`, call `window.appState.set('viewerOpen', true)`. After setting `S.open = false`, call `window.appState.set('viewerOpen', false)`.
