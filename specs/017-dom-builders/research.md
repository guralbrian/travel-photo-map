# Research: Selective Renderer Cleanup (DOM Builders)

**Feature Branch**: `017-dom-builders`
**Date**: 2026-03-11

## R1: Leaflet bindPopup DOM Element Support

**Decision**: Use DOM elements directly with `bindPopup()` instead of HTML strings.

**Rationale**: Leaflet 1.9.4 (vendored at `js/leaflet.js`) natively accepts both HTML strings and DOM elements in `bindPopup()`. The `setContent()` method performs internal type checking and handles both. No wrapper or adapter needed.

**Alternatives considered**:
- Convert DOM node to string via `outerHTML` then pass string — rejected, defeats the purpose of safe DOM construction.
- Use Leaflet's `L.popup().setContent(domNode)` manually — unnecessary, `bindPopup(domNode)` delegates correctly.

## R2: buildPopupHTML is Dead Code

**Decision**: Replace `buildPopupHTML` with a DOM-based `createPopupElement` but note that it is **currently unused** — the app migrated to `photo-viewer.js` for photo display. The function still exists at `js/app.js:80-112`.

**Rationale**: The photo viewer replaced popup-based photo viewing, but the function remains as dead code. Refactoring it to DOM construction:
1. Makes it safe if any future code re-enables popups
2. Serves as a reference implementation for the DOM helpers
3. Can be removed entirely if the team prefers — but the spec requests refactoring it

**Alternatives considered**:
- Delete the dead code entirely — valid but the spec explicitly targets it for refactoring
- Leave it as-is since unused — rejected, it still represents an XSS-vulnerable pattern in the codebase

## R3: Feed Entry Builder innerHTML Pattern

**Decision**: Replace `buildFeed()` string concatenation + `innerHTML` (app.js:407-450) with DOM construction using the new helpers.

**Rationale**: The current approach builds a single large HTML string with `+=` operators, then sets `feedEntries.innerHTML = html`. This is the largest string-built surface in the app. Notable patterns:
- Thumbnail `<img>` tags use inline `onload` handler (`this.classList.add('loaded')`) which must be converted to `addEventListener`
- Event listeners are wired via `querySelectorAll` after innerHTML injection — with DOM construction, listeners can be attached during creation
- Data attributes (`data-date`, `data-photo-url`, etc.) are set via string interpolation — will use `setAttribute()` or `dataset`

**Alternatives considered**:
- DocumentFragment batch approach — the helpers produce real nodes which can be appended to a fragment, keeping a single DOM reflow. This is the approach to use.

## R4: Narrative Renderer Already Has Escape Helper

**Decision**: Replace `renderFeedNarratives()` innerHTML pattern (app.js:559-575) with DOM construction, retiring the `_escapeHtml()` helper.

**Rationale**: The existing code already has `_escapeHtml()` (app.js:577-581) which uses `document.createTextNode` internally to escape HTML. With DOM helpers, text nodes are created directly — the escape step becomes unnecessary. The narrative editing flow (textarea creation at line 608-614) already uses `document.createElement` — it just needs the read path to match.

**Alternatives considered**:
- Keep innerHTML with `_escapeHtml()` — safe but inconsistent with the rest of the refactored code

## R5: Annotation Popup — No Escaping Present

**Decision**: Replace annotation popup string builder (app.js:308-312) with DOM construction.

**Rationale**: This is the **only active popup builder** (photo popup is dead code). It concatenates `ann.title`, `ann.date`, and `ann.text` directly into HTML with **no escaping**. Any special characters in annotation data would be interpreted as HTML. The annotation data comes from `data/annotations.json` which is user-authored.

**Alternatives considered**: None — this is a clear fix with no trade-offs.

## R6: DOM Helper Design

**Decision**: Create `js/dom-helpers.js` as an ES5-compatible IIFE exposing `window.domHelpers` with `el()` and `text()` functions.

**Rationale**: Matches the project's existing module pattern (ES5 IIFEs on `window.*`). The `el(tag, attrs, ...children)` pattern is the minimal useful abstraction:
- `el('div', {className: 'foo'}, el('span', null, text('hello')))` → `<div class="foo"><span>hello</span></div>`
- `text(str)` creates a text node — automatically safe
- `attrs` maps to element properties (className, style, dataset, event listeners)

**Alternatives considered**:
- `document.createElement` directly everywhere — too verbose, doesn't add safety for text
- Template literal tag function — ES6+ only, incompatible with project's ES5 requirement
- `h()` hyperscript convention — same concept, `el` is more readable for this team

## R7: Script Load Order

**Decision**: Insert `<script src="js/dom-helpers.js">` early in the load order, after Leaflet but before any consuming modules.

**Rationale**: Current order in `index.html` (lines 90-107):
1. leaflet.js, Leaflet.Photo.js
2. ViewportSampler.js, route-builder.js, app-state.js
3. photo-viewer.js, panel-manager.js, photo-wall.js
4. trip-model.js, region-nav.js
5. landing-page.js, app.js
6. Firebase modules (ES modules)

`dom-helpers.js` should load at position 2 (after Leaflet core, before utilities) since it has no dependencies and is consumed by `app.js`.
