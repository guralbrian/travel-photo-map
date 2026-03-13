# Quickstart: Selective Renderer Cleanup (DOM Builders)

**Feature Branch**: `017-dom-builders`

## Prerequisites

- Git checkout of `017-dom-builders` branch
- A browser (Chrome/Firefox)
- `python3 -m http.server 8000` from project root for local preview

## Files to Create

| File              | Purpose                           |
| ----------------- | --------------------------------- |
| `js/dom-helpers.js` | DOM builder utility module        |

## Files to Modify

| File           | Change                                                    |
| -------------- | --------------------------------------------------------- |
| `index.html`   | Add `<script>` tag for `dom-helpers.js`                   |
| `js/app.js`    | Refactor 4 renderers to use DOM construction              |

## Implementation Order

1. Create `js/dom-helpers.js` with `el()` and `text()` helpers
2. Add script tag to `index.html` (after Leaflet, before app.js)
3. Refactor `buildPopupHTML()` → `createPopupElement()` (app.js:80-112)
4. Refactor annotation popup builder (app.js:308-312)
5. Refactor `buildFeed()` (app.js:407-450)
6. Refactor `renderFeedNarratives()` (app.js:559-575)
7. Remove `_escapeHtml()` helper if no longer used (app.js:577-581)

## Verification

```bash
# Start local server
python3 -m http.server 8000

# Test in browser:
# 1. Open map — verify feed entries render correctly
# 2. Click annotation marker — verify popup renders
# 3. Check browser console for errors
# 4. Test at 1440px and 375px widths
```

## Key Constraints

- ES5-compatible IIFE pattern (matches existing modules)
- No new dependencies
- Visual output must be identical to current
- No behavioral changes
