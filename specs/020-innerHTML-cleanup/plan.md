# Plan 020 — innerHTML Cleanup

## Approach
Reuse `window.domHelpers` API (`el()`, `text()`, `formatDateShort()`) from spec 017/018 to replace all innerHTML string builders with safe DOM construction. HTML entities replaced with Unicode equivalents. SVG icons use innerHTML on container elements (safe: static markup, zero user content).

## Implementation Order
1. **control-panel.js** — `buildControlPanel()` sub-builders + main panel tree, `updatePhotoCount()`
2. **landing-page.js** — `renderCardGrid()`, `openDetail()` with places/photo sub-builders, remove `escapeHtml()`
3. **region-nav.js** — `renderRegionGrid()`, `renderItineraryPanel()`, `renderFallbackGrid()`, remove `escapeHtml()`
4. **photo-viewer.js** — `build()` overlay shell, `renderTags()`, `renderTagChips()`, `updFav()`, `errPlaceholder()`, video error handler, `dlBtn`

## Unicode Replacements
| HTML Entity | Unicode | Character |
|---|---|---|
| `&times;` | `\u00D7` | × |
| `&#9734;` / `&#9733;` | `\u2606` / `\u2605` | ☆ / ★ |
| `&#8249;` / `&#8250;` | `\u2039` / `\u203A` | ‹ / › |
| `&#9729;` | `\u2601` | ☁ |
| `&#8681;` | `\u21E9` | ⇩ |
| `&middot;` | `\u00B7` | · |
