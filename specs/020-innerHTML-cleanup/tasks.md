# Tasks 020 — innerHTML Cleanup

## Phase 1: control-panel.js
- [x] T001 — Convert `buildControlPanel()` segment/boundary/layer loops + panel innerHTML to `el()` tree
- [x] T002 — Convert `updatePhotoCount()` innerHTML to DOM operations

## Phase 2: landing-page.js
- [x] T003 — Convert `renderCardGrid()` card.innerHTML to `el()` calls
- [x] T004 — Convert `openDetail()` places/photo sub-builders + _detailEl.innerHTML to `el()` tree
- [x] T005 — Remove dead `escapeHtml()` function

## Phase 3: region-nav.js
- [x] T006 — Convert `renderRegionGrid()` panel.innerHTML to `el()` calls
- [x] T007 — Convert `renderItineraryPanel()` full innerHTML to DOM construction (SVG via innerHTML on button)
- [x] T008 — Convert `renderFallbackGrid()` panel.innerHTML to `el()` calls
- [x] T009 — Remove dead `escapeHtml()` function

## Phase 4: photo-viewer.js
- [x] T010 — Convert `build()` overlay shell innerHTML to `el()` tree (entities → Unicode)
- [x] T011 — Convert `renderTags()` and `renderTagChips()` innerHTML to `el()` calls with inline handlers
- [x] T012 — Convert `updFav()`, `errPlaceholder()`, `renderVideo()` error handler, and `dlBtn` innerHTML
