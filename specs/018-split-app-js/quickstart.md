# Quickstart: Split app.js — Extract Feed Controller & Control Panel

**Feature Branch**: `018-split-app-js`

## Prerequisites

- Git checkout of `018-split-app-js` branch
- A browser (Chrome/Firefox)
- `python3 -m http.server 8000` from project root for local preview

## Files to Create

| File | Purpose |
| ---- | ------- |
| `js/feed-controller.js` | Feed sidebar subsystem (~320 lines) |
| `js/control-panel.js` | Control panel subsystem (~215 lines) |

## Files to Modify

| File | Change |
| ---- | ------ |
| `js/dom-helpers.js` | Add `formatDateShort` function to exports |
| `js/region-nav.js` | Remove local `formatDateShort`, use `domHelpers.formatDateShort` |
| `index.html` | Add 2 `<script>` tags after landing-page.js, before app.js |
| `js/app.js` | Remove extracted code, add init calls, update cross-module references |

## Implementation Order

1. Add `formatDateShort` to `js/dom-helpers.js`
2. Update `js/region-nav.js` to use `domHelpers.formatDateShort`
3. Create `js/feed-controller.js` — extract feed sidebar logic from app.js lines 362–679
4. Create `js/control-panel.js` — extract control panel logic from app.js lines 682–917 + slider handlers
5. Update `index.html` — add script tags after landing-page.js, before app.js
6. Update `js/app.js` — remove extracted code, add feedController/controlPanel init calls, update references

## Verification

```bash
# Start local server
python3 -m http.server 8000

# Test in browser at http://localhost:8000:

# Feed verification:
# 1. Feed entries render with correct dates, cities, colors, thumbnails
# 2. Click feed entry → map flies to that date's photo bounds
# 3. Click thumbnail → photo viewer opens with day-scoped photos
# 4. Narratives display (if Firebase configured)
# 5. PanelSnap works on mobile (drag, snap to half/full/hidden)

# Control panel verification:
# 1. Panel toggle opens/closes
# 2. Base layer radio buttons switch map tiles
# 3. Travel route checkbox toggles route layer
# 4. Auth section works (if Firebase configured)
# 5. Density slider adjusts photo clustering
# 6. Size slider adjusts photo icon size

# Timeline verification:
# 7. Photo count updates when dragging timeline sliders
# 8. Feed entries show/hide when timeline range changes

# formatDateShort verification:
# 9. Feed dates display as "Mon DD" (e.g., "Mar 15")
# 10. Region nav dates display correctly
# 11. Timeline labels display correctly

# Cross-cutting:
# 12. No console errors at 1440px desktop width
# 13. No console errors at 375px mobile width
```

## Key Constraints

- ES5-compatible IIFE pattern (matches existing modules)
- No new dependencies
- Zero behavior change — visual output and interactions identical
- Getter functions for filteredPhotos/photoIndex (stale reference problem)
- Setter callback for _cloudFavoritesLoaded
