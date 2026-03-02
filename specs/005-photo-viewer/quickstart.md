# Quickstart: Immersive Photo Viewer

**Feature Branch**: `005-photo-viewer` | **Date**: 2026-03-02

## Prerequisites

- Python 3.10+ (for local server)
- A modern browser (Chrome, Safari, Firefox — recent versions)
- No build tools, npm, or package managers required

## Setup

```bash
# Clone and checkout branch
git checkout 005-photo-viewer

# Start local server
python3 -m http.server 8000

# Open in browser
# Desktop: http://localhost:8000
# Mobile: http://<your-local-ip>:8000 (same WiFi network)
```

## Files Modified (bug fixes)

| File | Changes |
|------|---------|
| `js/photo-viewer.js` | Double-tap zoom toggle, nav guard, auto-hide timing, zoom anchor fix |
| `css/photo-viewer.css` | Button restyling (circular dark glass buttons) |

## Testing Checklist

### Mobile (use Chrome DevTools device emulation or real device)

1. Tap a photo on the map → viewer expands from thumbnail
2. Swipe left/right → navigates photos
3. Pinch zoom in → photo zooms, release → stays zoomed (NOT stuck)
4. Pan while zoomed → image moves
5. Pinch back to 1x → photo fits screen
6. Swipe down at 1x → viewer dismisses
7. Tap screen → controls toggle
8. **Double-tap at 1x → zooms to 2x at tap point** (NEW)
9. **Double-tap at 2x → resets to 1x** (NEW)
10. **Double-tap rapidly → never gets stuck in zoom state** (BUG FIX)
11. Open a video → clean thumbnail, correct aspect ratio, plays on tap

### Desktop

1. Click a photo → viewer expands from thumbnail
2. Hover edges → nav arrows appear, click → navigates
3. Arrow keys → navigates
4. **Scroll wheel → zooms centered on cursor position** (BUG FIX)
5. Double-click → toggles 1x/2x zoom
6. Escape or click backdrop → closes
7. **Click next arrow rapidly 5+ times → viewer never accidentally closes** (BUG FIX)
8. **Controls stay visible while actively clicking through photos** (BUG FIX)
9. **Buttons are circular with dark semi-transparent background** (BUG FIX)
10. Favorite button → toggles star
11. Open from trip feed → navigates that day's photos only
12. **Controls auto-hide after 4 seconds (not 2)** (BUG FIX)

### Progressive Loading

1. Throttle network to Slow 3G in DevTools
2. Open a photo → thumbnail appears instantly (< 100ms)
3. Full-res fades in when loaded (no pop-in or layout shift)
4. Navigate to next → already loaded (preloaded)

## Architecture Notes

The viewer is a standalone module that:
- Accepts a photo array + index + source element on `open()`
- Manages its own DOM, events, and state internally
- Exposes `window.photoViewer` for integration with the app
- Uses Pointer Events API for unified gesture handling
- Uses CSS transforms for all animations (GPU-composited)
