# Spec 020 — innerHTML Cleanup

## Goal
Convert remaining high-priority innerHTML string builders in `control-panel.js`, `landing-page.js`, `region-nav.js`, and `photo-viewer.js` to safe `domHelpers.el()`/`text()` calls, eliminating XSS surface for user-editable content (tags, captions, region labels, day notes) and improving maintainability.

## Prerequisite
Branch rebased onto 018-split-app-js so `js/dom-helpers.js` (`el()`, `text()`, `formatDateShort()`) and `js/control-panel.js` exist.

## In Scope
| File | Functions |
|---|---|
| `js/control-panel.js` | `buildControlPanel()`, `updatePhotoCount()` |
| `js/landing-page.js` | `renderCardGrid()`, `openDetail()`, remove `escapeHtml()` |
| `js/region-nav.js` | `renderRegionGrid()`, `renderItineraryPanel()`, `renderFallbackGrid()`, remove `escapeHtml()` |
| `js/photo-viewer.js` | `build()`, `renderTags()`, `renderTagChips()`, `updFav()`, `errPlaceholder()`, `renderVideo()` error handler, `dlBtn` |

## Out of Scope
- `app.js` — already cleaned in 017
- `feed-controller.js` — already uses dom-helpers
- `photo-wall.js` — minimal innerHTML, low priority
- `$media.innerHTML = ''` clears — safe (just clearing, no string building)

## Key Decisions
- HTML entities → Unicode characters (text nodes don't interpret entities)
- SVG markup kept as innerHTML (static, no user content; `createElement` doesn't work for SVG)
- `$media.innerHTML = ''` clears kept as-is (idiomatic clearing)
- querySelector ref pattern preserved in photo-viewer `build()` for minimal diff
