# Implementation Plan: Lightweight App State Module

**Branch**: `016-app-state-module` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/016-app-state-module/spec.md`

## Summary

Create `js/app-state.js` — a lightweight, ES5-compatible IIFE that provides a singleton `window.appState` with `get`, `set`, `getAll`, and `onChange` (returning an unsubscribe function) methods for six fixed state keys. Integrate it into four existing modules (`panel-manager.js`, `region-nav.js`, `photo-viewer.js`, `app.js`) with additive `set()` calls alongside existing logic, producing zero behavioral changes for end users.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES5-compatible IIFE)
**Primary Dependencies**: None (standalone module, no framework or library dependencies)
**Storage**: N/A — in-memory only, no persistence
**Testing**: Manual browser testing via console + Playwright screenshots at 375px and 1440px
**Target Platform**: Web browser (GitHub Pages static hosting)
**Project Type**: Single static web application
**Performance Goals**: State updates must complete synchronously within the same execution frame as the triggering action (SC-002)
**Constraints**: No build step, no transpilation, no external dependencies, ES5 compatibility
**Scale/Scope**: 6 fixed state keys, 4 integration points across existing modules

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | How This Feature Complies |
|-----------|--------|--------------------------|
| I. Privacy by Default | PASS | No data leaves the browser. State is ephemeral in-memory. No analytics, no tracking. |
| II. Static & Zero-Config | PASS | Pure client-side JS. No server, no API keys, no build step. Works with any static file server. |
| III. Approachable by Everyone | PASS | FR-009: Zero visual or behavioral changes to end users. Module is developer-facing only. |
| IV. Professional Visual Polish | PASS | No UI changes. Existing transitions and animations unaffected. |
| V. Performant at Any Scale | PASS | Synchronous key-value store. O(n) listener notification where n is registered callbacks per key (expected: 0-3). No overhead on render path. |
| VI. Unified Media Experience | PASS | Photo viewer and panel transitions continue unchanged. `viewerOpen` tracking enables future viewer-aware coordination. |
| VII. Map-Centric Integration | PASS | No navigation changes. Map remains the single surface. `mapInteractive` key reserved for future map interaction policy. |

**Gate result**: All principles pass. No violations to justify.

**Post-Phase 1 re-check**: Design artifacts confirm compliance. No new dependencies, no API contracts, no data persistence. The unsubscribe function addition (from clarification) remains pure in-memory and does not affect any constitution principle.

## Project Structure

### Documentation (this feature)

```text
specs/016-app-state-module/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
js/
├── app-state.js         # NEW — the state module (~90 lines)
├── app.js               # MODIFIED — add appState.set('visibleDateRange', ...)
├── panel-manager.js     # MODIFIED — add appState.set('activePanel', ...)
├── photo-viewer.js      # MODIFIED — add appState.set('viewerOpen', ...)
└── region-nav.js        # MODIFIED — add appState.set('activeRegionId', ...)

index.html               # MODIFIED — add <script> tag for app-state.js
```

**Structure Decision**: Single static web application. All source files live at repository root level. `js/` holds all JavaScript modules loaded via `<script>` tags in `index.html`. No build step, no bundling.

## Complexity Tracking

No constitution violations — table not applicable.
