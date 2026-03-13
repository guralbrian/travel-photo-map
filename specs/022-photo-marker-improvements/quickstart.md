# Quickstart: Photo Marker Improvements

**Branch**: `022-photo-marker-improvements`

## Local Preview

```bash
cd /home/bgural/photoMap/travel-photo-map
python3 -m http.server 8000
# Open http://localhost:8000
```

## Testing Checklist

### P1 — Pan Stability

1. Load the map at a zoom level showing several photo markers.
2. Pan (drag) the map across a populated area.
3. **Pass**: Existing markers move with the map; no flash or blank-map period during or immediately after the drag.
4. Pan slowly to bring a new area into view.
5. **Pass**: New markers fade in at the edges; already-visible markers are unaffected.

### P2 — Zoom Stability

1. Scroll or pinch-zoom in on a cluster.
2. **Pass**: Clusters reform once, cleanly, after the zoom animation ends — no repeated flicker.
3. Rapidly zoom in and out several times.
4. **Pass**: Each zoom level settles to a stable layout without ongoing flash.

### P3 — Visual Size

1. Compare markers to screenshots of the current design (or the `main` branch).
2. **Pass**: Markers are noticeably smaller at every tier.
3. **Pass**: Frame border appears thinner (1px thinner than before).
4. Zoom into a city with many photos.
5. **Pass**: Multiple photo markers are visible simultaneously without total occlusion.
6. **Pass**: The geographic trail through the city is readable from marker positions.

### Regression — Sliders Still Work

1. Open the control panel.
2. Drag the Photo Density slider to the left (more dense) and right (less dense).
3. **Pass**: Marker count changes accordingly.
4. Drag the Photo Size slider.
5. **Pass**: Marker sizes respond (legacy slider behavior preserved).

## Playwright Screenshots

Test at both breakpoints:
- Desktop: 1440 × 900
- Mobile: 375 × 812
