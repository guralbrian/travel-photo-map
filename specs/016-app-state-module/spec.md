# Feature Specification: Lightweight App State Module

**Feature Branch**: `016-app-state-module`
**Created**: 2026-03-11
**Status**: Draft
**Input**: User description: "Create js/app-state.js — a tiny shared state module that becomes the canonical source for top-level UI coordination state"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Consistent Panel State Tracking (Priority: P1)

As a developer working on the travel photo map, I need a single source of truth for which panel is currently active (photo-wall, trip-feed, control-panel) so that cross-module coordination bugs caused by inconsistent panel state are eliminated.

**Why this priority**: Panel state is the most frequently referenced coordination state. Multiple modules currently infer the active panel through DOM classes and closure variables, leading to desynchronization during mode transitions.

**Independent Test**: Can be tested by opening the app, switching between panels (photo-wall, trip-feed), and verifying that `window.appState.get('activePanel')` always reflects the currently visible panel. Existing panel:activate/panel:deactivate custom events continue to fire normally.

**Acceptance Scenarios**:

1. **Given** the app is loaded, **When** a user opens the photo-wall panel, **Then** `appState.get('activePanel')` returns `'photo-wall'` and the panel:activate event still fires.
2. **Given** the photo-wall panel is active, **When** the user switches to the trip-feed panel, **Then** `appState.get('activePanel')` updates to `'trip-feed'` and panel:deactivate fires for the previous panel.
3. **Given** no panel is active (initial load), **When** `appState.get('activePanel')` is called, **Then** it returns `null`.

---

### User Story 2 - Shared Visible Date Range (Priority: P1)

As a developer, I need the current timeline date range to be stored in a shared location so that any module can read the current filter range without depending on closure variables inside the timeline slider.

**Why this priority**: The visible date range drives photo filtering across multiple modules (photo-wall, map markers). Currently only accessible within the timeline slider's closure, forcing tight coupling.

**Independent Test**: Can be tested by adjusting the timeline slider and verifying that `appState.get('visibleDateRange')` returns the correct `{ min, max }` ISO date strings matching the slider position.

**Acceptance Scenarios**:

1. **Given** the app is loaded with trip data, **When** the timeline slider is adjusted to a date range, **Then** `appState.get('visibleDateRange')` returns `{ min: '<ISO date>', max: '<ISO date>' }` matching the slider.
2. **Given** a visible date range is set, **When** another module reads `appState.get('visibleDateRange')`, **Then** it receives the current range without needing a reference to the timeline slider.

---

### User Story 3 - Region Selection Tracking (Priority: P2)

As a developer, I need the currently selected region to be explicit and accessible so that modules can coordinate around region changes without relying on implicit assumptions.

**Why this priority**: Region selection drives map viewport, photo filtering, and navigation state. Making it explicit prevents bugs when multiple modules need to react to region changes.

**Independent Test**: Can be tested by selecting a region from the navigation and verifying that `appState.get('activeRegionId')` returns the correct region ID from the trip model.

**Acceptance Scenarios**:

1. **Given** the app is loaded, **When** the user selects a region, **Then** `appState.get('activeRegionId')` returns the stable region ID from the trip model.
2. **Given** a region is selected, **When** a different region is selected, **Then** `appState.get('activeRegionId')` updates to the new region ID.
3. **Given** no region is selected (initial load or "all" view), **When** `appState.get('activeRegionId')` is called, **Then** it returns `null`.

---

### User Story 4 - Viewer Open/Closed State (Priority: P2)

As a developer, I need to know whether the photo viewer is currently open so that other modules (especially future mobile gesture handling) can adjust their behavior accordingly.

**Why this priority**: The viewer open/closed state affects whether map interactions should be suppressed and will be critical for upcoming mobile UX work. Centralizing it now prevents future coordination bugs.

**Independent Test**: Can be tested by opening/closing the photo viewer and verifying that `appState.get('viewerOpen')` reflects the current state.

**Acceptance Scenarios**:

1. **Given** the photo viewer is closed, **When** a user opens a photo, **Then** `appState.get('viewerOpen')` returns `true`.
2. **Given** the photo viewer is open, **When** the user closes it, **Then** `appState.get('viewerOpen')` returns `false`.

---

### User Story 5 - Change Subscription (Priority: P2)

As a developer, I need to subscribe to state changes on specific keys so that modules can react to coordination state updates without polling or tight coupling.

**Why this priority**: Without a subscription mechanism, modules would need to poll appState or rely on the same ad-hoc event patterns this feature is meant to improve.

**Independent Test**: Can be tested by registering a callback via `var unsub = appState.onChange('activePanel', callback)`, changing the active panel, verifying the callback fires, then calling `unsub()` and verifying the callback no longer fires on subsequent changes.

**Acceptance Scenarios**:

1. **Given** a callback is registered for `'activePanel'`, **When** the active panel changes, **Then** the callback is invoked with the new value and the previous value.
2. **Given** a callback is registered, **When** the state is set to the same value it already holds, **Then** the callback is NOT invoked (no spurious notifications).
3. **Given** a callback is registered and the returned unsubscribe function is called, **When** the state key changes, **Then** the callback is NOT invoked.

---

### Edge Cases

- What happens when `set()` is called with a key not in the managed state schema? The module should ignore the call or log a warning, not create arbitrary new state keys.
- What happens if `onChange` is called with a key that doesn't exist in the schema? The module should handle gracefully (no-op or console warning).
- What happens if multiple callbacks are registered for the same key? All callbacks should fire in registration order.
- What happens if a callback throws an error? Other registered callbacks for the same key should still execute.

## Clarifications

### Session 2026-03-11

- Q: Should `onChange` return an unsubscribe function, or should a separate `offChange(key, callback)` method be added? → A: `onChange` returns an unsubscribe function.
- Q: Should `app-state.js` be viewport-aware for `mapInteractive` initialization, or should consuming code handle it? → A: Consuming code sets the value; `mapInteractive` defaults to `false`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a `window.appState` global with `get(key)`, `set(key, value)`, `getAll()`, and `onChange(key, callback)` methods. `onChange` MUST return an unsubscribe function that, when called, removes the registered callback from the listener list for that key.
- **FR-002**: System MUST manage these state keys: `activePanel`, `activeRegionId`, `visibleDateRange`, `viewerOpen`, `mapInteractive`, and `baseLayer`.
- **FR-003**: System MUST initialize state with sensible defaults: `activePanel: null`, `activeRegionId: null`, `visibleDateRange: { min: null, max: null }`, `viewerOpen: false`, `mapInteractive: false`, `baseLayer: 'Humanitarian'`.
- **FR-004**: System MUST invoke registered `onChange` callbacks only when a value actually changes (not on no-op sets).
- **FR-005**: System MUST NOT create new state keys dynamically — only the predefined schema keys are allowed.
- **FR-006**: System MUST be implemented as an ES5-compatible IIFE with no external dependencies.
- **FR-007**: Existing `panel:activate` and `panel:deactivate` custom events MUST continue to work alongside the new state tracking.
- **FR-008**: The app MUST integrate appState for `activePanel`, `visibleDateRange`, `activeRegionId`, and `viewerOpen` in the existing modules that manage those values.
- **FR-009**: System MUST NOT introduce any visual or behavioral changes to the end user.
- **FR-010**: `filteredPhotos` MUST remain derived data computed from the trip model plus current filters, NOT stored as canonical app state.

### Key Entities

- **App State**: A singleton key-value store holding top-level UI coordination state. Keys are fixed at initialization. Values represent the current UI mode/context.
- **State Listener**: A callback function registered for a specific state key. Invoked when that key's value changes, receiving the new value and the previous value.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Any module in the app can determine the active panel, selected region, visible date range, and viewer state by reading from a single shared source, without referencing DOM classes or closure variables.
- **SC-002**: Switching panels, changing regions, adjusting the timeline, or opening/closing the viewer updates the shared state within the same execution frame as the user action.
- **SC-003**: All existing app functionality (panel transitions, photo filtering, region navigation, photo viewer) continues to work identically from the end user's perspective.
- **SC-004**: The state module adds no new external dependencies and loads as a single script file.
- **SC-005**: Registered change listeners fire reliably on state transitions and do not fire on no-op updates.

## Assumptions

- The app loads scripts in a defined order where `app-state.js` is loaded before modules that depend on it (i.e., before `app.js` and other UI modules).
- The six managed keys (`activePanel`, `activeRegionId`, `visibleDateRange`, `viewerOpen`, `mapInteractive`, `baseLayer`) are sufficient for the current cross-module coordination needs. `mapInteractive` and `baseLayer` are included in the schema but will be fully integrated in future phases.
- `mapInteractive` defaults to `false`. The app-state module has no viewport awareness; consuming code (e.g., the interaction policy module or `app.js`) is responsible for setting `mapInteractive: true` on desktop viewports during initialization.
- Equality checks for `visibleDateRange` will compare the `min` and `max` properties individually (shallow comparison), not reference equality on the object.
