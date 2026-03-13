# API Contract: window.appState

**Module**: `js/app-state.js`
**Exposure**: `window.appState` (global)
**Pattern**: ES5 IIFE, singleton key-value store with change observation

## Methods

### `get(key) → value`

Returns the current value for the given state key.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | `string` | yes | One of the managed state keys |

**Returns**: The current value for the key, or `undefined` if key is not in schema (with console.warn).

**Example**:
```js
var panel = window.appState.get('activePanel'); // → 'photo-wall' or null
```

---

### `set(key, value) → void`

Updates a state key. Fires registered `onChange` callbacks if the value actually changed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | `string` | yes | One of the managed state keys |
| `value` | `any` | yes | New value for the key |

**Behavior**:
- If `key` is not in the schema: logs `console.warn`, returns without effect.
- If value is unchanged (see Change Detection): returns without firing callbacks.
- If value changed: updates internal state, then fires all registered callbacks for that key synchronously, in registration order. Each callback is wrapped in try/catch.

**Change detection**:
- `visibleDateRange`: compares `old.min !== new.min || old.max !== new.max`
- All other keys: strict equality (`===`)

**Example**:
```js
window.appState.set('activePanel', 'trip-feed');
window.appState.set('visibleDateRange', { min: '2025-06-01', max: '2025-06-15' });
```

---

### `getAll() → object`

Returns a shallow copy of the entire state object.

**Returns**: Plain object with all managed keys and their current values.

**Example**:
```js
var state = window.appState.getAll();
// → { activePanel: null, activeRegionId: null, visibleDateRange: { min: null, max: null }, viewerOpen: false, mapInteractive: false, baseLayer: 'Humanitarian' }
```

---

### `onChange(key, callback) → void`

Registers a callback to be invoked when the specified key's value changes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `key` | `string` | yes | One of the managed state keys |
| `callback` | `function(newValue, oldValue)` | yes | Called synchronously on change |

**Behavior**:
- If `key` is not in the schema: logs `console.warn`, does not register.
- Multiple callbacks per key are allowed; they fire in registration order.
- Callback receives `(newValue, oldValue)`.
- If a callback throws, the error is logged via `console.error` and remaining callbacks still execute.

**Example**:
```js
window.appState.onChange('viewerOpen', function(isOpen, wasOpen) {
  console.log('Viewer state changed:', wasOpen, '→', isOpen);
});
```

## Managed State Schema

| Key | Type | Default | Owner Module |
|-----|------|---------|-------------|
| `activePanel` | `string \| null` | `null` | `panel-manager.js` |
| `activeRegionId` | `string \| null` | `null` | `region-nav.js` |
| `visibleDateRange` | `{ min: string \| null, max: string \| null }` | `{ min: null, max: null }` | `app.js` |
| `viewerOpen` | `boolean` | `false` | `photo-viewer.js` |
| `mapInteractive` | `boolean` | `false` | (future phase) |
| `baseLayer` | `string` | `'Humanitarian'` | (future phase) |

## Error Behavior

| Scenario | Behavior |
|----------|----------|
| `get('unknownKey')` | Returns `undefined`, logs `console.warn` |
| `set('unknownKey', val)` | No-op, logs `console.warn` |
| `onChange('unknownKey', fn)` | No-op, logs `console.warn` |
| `set('activePanel', sameValue)` | No-op, no callbacks fired |
| Callback throws | Error logged via `console.error`, remaining callbacks still execute |
