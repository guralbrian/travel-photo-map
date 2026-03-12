# Quickstart: Lightweight App State Module

**Feature**: 016-app-state-module

## What This Feature Does

Adds `js/app-state.js` — a tiny shared state module that centralizes top-level UI coordination state (active panel, selected region, visible date range, viewer open/closed) into a single readable/observable source.

## Files Changed

| File | Change |
|------|--------|
| `js/app-state.js` | **NEW** — the state module (~80 lines) |
| `index.html` | Add `<script>` tag for app-state.js |
| `js/panel-manager.js` | Add `appState.set('activePanel', ...)` in activate/deactivate |
| `js/app.js` | Add `appState.set('visibleDateRange', ...)` in timeline filter |
| `js/region-nav.js` | Add `appState.set('activeRegionId', ...)` in select/deselect |
| `js/photo-viewer.js` | Add `appState.set('viewerOpen', ...)` in open/close |

## How to Test

1. Start local server: `python3 -m http.server 8000`
2. Open `http://localhost:8000` in browser
3. Open browser console

### Verify state reads:
```js
window.appState.getAll()
// → { activePanel: null, activeRegionId: null, visibleDateRange: { min: '...', max: '...' }, viewerOpen: false, mapInteractive: false, baseLayer: 'Humanitarian' }
```

### Verify panel tracking:
```js
// Open photo-wall panel, then:
window.appState.get('activePanel')  // → 'photo-wall'
```

### Verify change subscription + unsubscribe:
```js
var unsub = window.appState.onChange('viewerOpen', function(newVal, oldVal) {
  console.log('viewer:', oldVal, '→', newVal);
});
// Click a photo to open viewer → logs "viewer: false → true"
// Close viewer → logs "viewer: true → false"

unsub(); // Remove listener
// Open/close viewer again → no log output
```

### Verify no behavioral changes:
- All panel transitions work as before
- Timeline slider filters photos normally
- Region navigation works
- Photo viewer opens/closes normally
- Custom events (`panel:activate`, `panel:deactivate`) still fire

## API Reference

```js
window.appState.get(key)              // → current value
window.appState.set(key, value)       // → updates value, fires listeners if changed
window.appState.getAll()              // → shallow copy of all state
window.appState.onChange(key, callback) // → returns unsubscribe function
                                       //   callback(newValue, oldValue)
                                       //   var unsub = onChange(...); unsub();
```

## Managed Keys

| Key | Type | Default |
|-----|------|---------|
| `activePanel` | string/null | `null` |
| `activeRegionId` | string/null | `null` |
| `visibleDateRange` | `{min, max}` | `{min: null, max: null}` |
| `viewerOpen` | boolean | `false` |
| `mapInteractive` | boolean | `false` |
| `baseLayer` | string | `'Humanitarian'` |
