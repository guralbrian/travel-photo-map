# Research: Lightweight App State Module

**Feature**: 016-app-state-module
**Date**: 2026-03-11

## R1: Observable Key-Value Store Pattern in ES5

**Decision**: Implement as a plain object with a `_listeners` map (key → callback array). Use `set()` to compare old vs. new value and fire callbacks only on change.

**Rationale**: This is the simplest pattern that satisfies the spec. A closure-scoped state object with a frozen key set prevents dynamic key creation. Shallow equality for primitives, property-level comparison for `visibleDateRange`.

**Alternatives considered**:
- **ES6 Proxy**: Would allow transparent property access (`appState.activePanel`) instead of `get()`/`set()`. Rejected: ES5 incompatible, and explicit get/set makes state mutations visible and traceable.
- **CustomEvent-based**: Dispatch DOM events for each state change. Rejected: Adds DOM coupling to what should be a pure data store. Also, `onChange` callbacks are simpler for consumers.
- **Object.defineProperty with getters/setters**: Would allow `appState.activePanel = 'photo-wall'`. Rejected: Hides mutation behind assignment syntax, harder to grep for state changes.

## R2: Change Detection Strategy for Object Values

**Decision**: For `visibleDateRange` (the only object-typed state), compare `old.min !== new.min || old.max !== new.max`. For all other keys (strings, booleans, null), use strict equality (`===`).

**Rationale**: Deep comparison is unnecessary — the only object value has a fixed two-property shape. Strict equality covers all primitive keys. This avoids JSON.stringify overhead and works correctly with `null` defaults.

**Alternatives considered**:
- **JSON.stringify comparison**: Generic but slow for frequent timeline slider updates. Rejected.
- **Reference equality only**: Would cause false positives (new object with same values triggers callback). Rejected: timeline slider creates new objects on each drag event.

## R3: Callback Error Isolation

**Decision**: Wrap each callback invocation in a try/catch. Log errors to `console.error` but continue executing remaining callbacks.

**Rationale**: One misbehaving listener should not break state propagation for other modules. This matches the DOM event model where one handler's error doesn't prevent others from firing.

**Alternatives considered**:
- **No error isolation**: Simpler but fragile — one broken callback stops all subsequent callbacks. Rejected.
- **setTimeout per callback**: Would make callbacks asynchronous. Rejected: spec requires synchronous updates within the same execution frame (SC-002).

## R4: Invalid Key Handling

**Decision**: `set()` and `onChange()` with unrecognized keys log a `console.warn` and return without effect. `get()` with an unrecognized key returns `undefined` with a `console.warn`.

**Rationale**: Silent failure masks bugs. A console warning helps developers catch typos during development without breaking the app in production.

## R5: Script Load Order Placement

**Decision**: Insert `app-state.js` script tag in `index.html` after utility scripts (ViewportSampler, route-builder) and before UI module scripts (photo-viewer, panel-manager, photo-wall, region-nav, app.js).

**Rationale**: `app-state.js` has no dependencies on other app modules but all four integration targets (photo-viewer, panel-manager, region-nav, app.js) need `window.appState` available at their initialization time. Placing it after utilities ensures Leaflet plugins are loaded first (though app-state doesn't use them).

## R6: Integration Approach — Additive, Not Replacement

**Decision**: Each integration point adds a single `window.appState.set()` call alongside existing logic. Existing closure variables, custom events, and DOM class manipulations remain untouched.

**Rationale**: This feature is about making state observable and shareable, not about refactoring existing code. Keeping the existing mechanisms ensures zero risk of behavioral regression. Future phases can migrate consumers to read from `appState` instead of local state, but that is out of scope here.
