# Quickstart: Photo Wall Album View

**Branch**: `006-photo-wall` | **Date**: 2026-03-02

---

## Overview

The photo wall is a full-width bottom panel that shows all trip photos in a justified chronological grid — like the Google Photos album view. It appears at the bottom of the screen in a collapsed strip and can be dragged upward to expand to half or full screen.

---

## How to Run Locally

```bash
# From the project root
cd frontend
python3 -m http.server 8000
# Open http://localhost:8000
```

No build step. No npm install. No environment variables for core functionality.

---

## New Files Added by This Feature

| File | Purpose |
|------|---------|
| `frontend/js/photo-wall.js` | PhotoWall module — grid layout, virtual scroll, snap panel, scrubber |
| `frontend/css/photo-wall.css` | Panel and grid styles |

---

## Files Modified by This Feature

| File | What Changed |
|------|-------------|
| `frontend/index.html` | Added `.photo-wall-panel` HTML structure; wired `photo-wall:target` event in `onPhotoClick`; wired `photo-wall:target-date` in feed entry click handler; imported `photo-wall.js` after manifest loads |

---

## Key Architecture: How the Panel Works

The photo wall uses the **same fixed-overlay pattern** as the existing trip feed bottom sheet on mobile. The `#map` always fills the full viewport; the photo wall overlays the bottom portion.

**Snap states**:
- **Collapsed** (default, `~30vh`): A preview strip of the most recent photos is visible at the bottom
- **Half** (`~50vh`): Triggered automatically when a map photo is clicked; shows the grid without covering the whole map
- **Full** (`100vh`): Covers the entire screen; accessed by dragging up or swiping up

**Drag to expand/collapse**: A drag handle at the top of the panel accepts pointer/touch events. Velocity detection snaps to the nearest state on release (same logic as existing trip feed).

---

## Key Architecture: How the Grid Works

The grid uses a **justified layout** (Google Photos album style):

1. Photos are sorted by `date` and `datetime` from `manifest.json`
2. They're grouped into `DateSection` objects, each with a sticky date header
3. Within each section, photos are packed into rows where all photos in a row have the same height, and the total row width fills the panel width exactly
4. A date scrubber on the right edge allows fast jumping between dates

**Virtual scroll**: Only photo tiles near the visible area are in the DOM at any time. A large spacer `div` maintains the correct scroll height. Grid items are `position: absolute` children of the scroll container.

---

## Key Architecture: Map Integration

When a user clicks a photo marker on the map:

1. `index.html`'s `onPhotoClick` handler dispatches `photo-wall:target` event
2. PhotoWall receives the event, expands to `half` if collapsed, and scrolls to that photo's date section
3. The photo is briefly highlighted in the grid (1–2s glow animation)

When a user clicks a photo in the wall:

1. PhotoWall dispatches `photo-wall:photo-clicked` event
2. `index.html` receives it, opens the existing immersive photo viewer, and pans the map to the photo's location

---

## Testing the Feature

### Manual test: Panel snap behavior
1. Open the app
2. Verify a collapsed strip is visible at the very bottom (photo preview thumbnails)
3. Drag the strip handle upward — panel should grow, map shrinks in view
4. Release at ~50% — panel should snap to half-screen
5. Drag up further — panel should snap to full-screen
6. Drag down to collapse

### Manual test: Map-to-wall navigation
1. Click any photo marker on the map
2. Verify the photo wall panel expands to at least half-screen
3. Verify the grid scrolls to that photo's date (section header visible)
4. Verify the photo is briefly highlighted (glow border)

### Manual test: Grid browsing
1. Expand the wall to full-screen
2. Scroll up and down — photos should flow in justified rows
3. Date section headers should be sticky at the top of the panel as you scroll
4. Drag the scrubber on the right edge — grid should jump to the corresponding date

### Manual test: Photo click
1. Click a photo in the grid
2. The immersive photo viewer should open for that photo
3. The map should pan to that photo's map marker (visible when viewer is dismissed)

### Manual test: Trip feed integration (desktop)
1. Open the trip feed sidebar (toggle button, top-right)
2. Click a daily entry in the feed
3. Verify the map pans (existing behavior) AND the photo wall scrolls to that date

---

## Common Issues

**Panel not showing**: Check that `photo-wall-panel` div is present in `index.html` and that `photo-wall.js` is imported in the module script block.

**Grid items not rendering**: Check browser console for layout calculation errors. Ensure `manifest.json` loaded successfully (check Network tab).

**Aspect ratios all wrong**: Photos will initially use the 4:3 default until thumbnails load. After thumbnails load, affected rows recalculate. This is expected behavior.

**Panel overlaps feed sidebar**: Verify that the photo wall's z-index is `1000` (below feed's `1001`) in collapsed/half states, and `1003` (above feed) only in full-screen state.
