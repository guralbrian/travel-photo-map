# Data Model: Lightweight App State Module

**Feature**: 016-app-state-module
**Date**: 2026-03-11

## Entities

### AppState (singleton)

A fixed-schema key-value store. No persistence — lives only in memory for the duration of the page session.

| Key | Type | Default | Valid Values | Updated By |
|-----|------|---------|-------------|------------|
| `activePanel` | `string \| null` | `null` | `'photo-wall'`, `'trip-feed'`, `'control-panel'`, `null` | `panel-manager.js` |
| `activeRegionId` | `string \| null` | `null` | Any region ID from TripModel, or `null` | `region-nav.js` |
| `visibleDateRange` | `{ min: string \| null, max: string \| null }` | `{ min: null, max: null }` | ISO date strings (`'YYYY-MM-DD'`) or `null` | `app.js` |
| `viewerOpen` | `boolean` | `false` | `true`, `false` | `photo-viewer.js` |
| `mapInteractive` | `boolean` | `false` | `true`, `false` | (future phase) |
| `baseLayer` | `string` | `'Humanitarian'` | Any tile layer name | (future phase) |

### StateListener

A callback registered for a specific key. Not persisted — exists only as function references in memory.

| Attribute | Type | Description |
|-----------|------|-------------|
| `key` | `string` | The state key being observed |
| `callback` | `function(newValue, oldValue)` | Invoked synchronously when the key's value changes |
| `registration order` | `integer` (implicit) | Callbacks fire in the order they were registered |

## Relationships

- **AppState → StateListener**: One-to-many per key. Each key can have 0..N listeners.
- **AppState → TripModel**: `activeRegionId` references region IDs produced by `window.TripModel.getRegions()`. AppState does not validate region IDs — it stores whatever the caller provides.
- **AppState → DOM/Events**: AppState does NOT dispatch DOM events. It uses its own callback mechanism. Existing `panel:activate`/`panel:deactivate` events remain separate and continue to fire.

## State Transitions

```
Initial load:
  activePanel: null → set by PanelCoordinator when user opens a panel
  activeRegionId: null → set by region-nav when user selects a region
  visibleDateRange: {null, null} → set by app.js after timeline builds
  viewerOpen: false → set by photo-viewer on open

Panel switch:
  activePanel: 'trip-feed' → 'photo-wall' (or vice versa)
  (only one panel active at a time on mobile; desktop may differ)

Region select:
  activeRegionId: null → 'region-id-string'
  activeRegionId: 'region-A' → 'region-B'

Region deselect:
  activeRegionId: 'region-id-string' → null

Viewer lifecycle:
  viewerOpen: false → true (on photo open)
  viewerOpen: true → false (on viewer close)

Timeline drag:
  visibleDateRange: {min: 'A', max: 'B'} → {min: 'C', max: 'D'}
```

## Change Detection Rules

| Key | Comparison Method | Rationale |
|-----|------------------|-----------|
| `activePanel` | `===` (strict equality) | String or null — reference equality suffices |
| `activeRegionId` | `===` (strict equality) | String or null |
| `visibleDateRange` | `old.min !== new.min \|\| old.max !== new.max` | Object value — must compare properties, not references |
| `viewerOpen` | `===` (strict equality) | Boolean |
| `mapInteractive` | `===` (strict equality) | Boolean |
| `baseLayer` | `===` (strict equality) | String |
