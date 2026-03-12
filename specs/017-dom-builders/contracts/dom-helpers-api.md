# Contract: DOM Helpers API

**Module**: `js/dom-helpers.js`
**Global**: `window.domHelpers`

## Interface

### `domHelpers.el(tag, attrs, ...children)`

Creates an HTML element.

**Parameters**:
- `tag` (string, required): HTML tag name
- `attrs` (object|null, required): Attributes/properties to set on the element
- `...children` (Node|string, variadic): Child nodes; strings are auto-wrapped as text nodes

**Returns**: `HTMLElement`

**Behavior**:
- If `attrs.className` is set, assigns to `element.className`
- If `attrs.style` is an object, merges keys into `element.style`
- If `attrs.dataset` is an object, merges keys into `element.dataset`
- If `attrs` key starts with `on` (e.g., `onclick`), assigns as element property (event handler)
- All other `attrs` keys are set via `element.setAttribute(key, value)`
- String children are converted to text nodes via `document.createTextNode()`
- Falsy children (null, undefined, false) are skipped

### `domHelpers.text(str)`

Creates a safe text node.

**Parameters**:
- `str` (string, required): Text content

**Returns**: `Text` (DOM Text node)

## Usage Example

```javascript
var el = domHelpers.el;
var text = domHelpers.text;

var popup = el('div', {className: 'annotation-popup'},
    el('strong', null, text(ann.title)),
    el('br', null),
    el('span', {className: 'annotation-date'}, text(ann.date)),
    el('p', null, text(ann.text))
);
marker.bindPopup(popup);
```

## Consumers

1. `js/app.js` — `createPopupElement()`, annotation popup, `buildFeed()`, `renderFeedNarratives()`
