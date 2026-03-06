# Implementation Plan: UX/UI Audit Remediation + Apple Maps-Style Markers

**Branch**: `009-ux-ui-audit` | **Date**: 2026-03-06 | **Spec**: `specs/009-ux-ui-audit/spec.md`
**Input**: Feature specification from `/specs/009-ux-ui-audit/spec.md`

## Summary

Two-part remediation: (1) fix existing UX/UI audit issues (design tokens, touch targets, z-index, close-button bug, legacy code removal) and (2) redesign photo map markers to an Apple Maps-style with white-bordered frames, downward pointer stems for clusters, and 4-tier adaptive sizing based on photo density.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+), CSS3, HTML5
**Primary Dependencies**: Leaflet.js (vendored in `js/`), no new libraries
**Storage**: N/A — reads `data/manifest.json` + `data/trip_segments.json` at runtime
**Testing**: Playwright MCP screenshots at 1440px (desktop) and 375px (mobile)
**Target Platform**: Modern browsers (static hosting, `python -m http.server`)
**Project Type**: web (frontend-only static site)
**Performance Goals**: 60fps map panning, <300ms marker rebuild on viewport change, smooth fade animations
**Constraints**: No build step, no npm, no new external dependencies. All changes are CSS + vanilla JS within vendored Leaflet.Photo plugin and ViewportSampler.
**Scale/Scope**: ~500 photos in manifest, ~50 visible markers at any zoom level

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy by Default | PASS | No new data collection, no external services. Photo thumbnails already exist. |
| II. Static & Zero-Config | PASS | All changes are CSS + JS in static files. No backend, no API keys. |
| III. Approachable by Everyone | PASS | Apple Maps-style markers are universally recognized. Touch targets remain ≥44px. Pointer stems visually clarify photo location. |
| IV. Professional Visual Polish | PASS | Core goal of this feature — white frames, consistent sizing tiers, smooth transitions. |
| V. Performant at Any Scale | PASS | ViewportSampler density sampling unchanged. Marker DOM complexity increases marginally (one extra SVG/CSS element for stem). Size tiers are O(1) lookup. |
| VI. Unified Media Experience | PASS | Click behavior unchanged — markers still open photo viewer. Video badges preserved. |
| VII. Map-Centric Integration | PASS | All changes are on the map surface. No new pages or navigation. |
| Tech Constraints | PASS | No new dependencies. All code in vendored `js/` and `css/` files. |

## Project Structure

### Documentation (this feature)

```text
specs/009-ux-ui-audit/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── spec.md              # Feature specification
└── tasks.md             # Phase 2 output (from /speckit.tasks)
```

### Source Code (repository root)

```text
css/
├── Leaflet.Photo.css    # MODIFY: marker frame, pointer stem, tier sizes, favorites gold border
├── map.css              # MODIFY: design tokens (already partially tokenized), legacy color fixes
├── photo-wall.css       # MODIFY: design tokens root (source of truth for tokens)
└── photo-viewer.css     # NO CHANGE (already uses tokens)

js/
├── Leaflet.Photo.js     # MODIFY: createIcon() to build frame + stem DOM structure, accept tier/cluster options
├── ViewportSampler.js   # MODIFY: pass hiddenCount to icon, compute size tier, set iconAnchor for stem offset
└── photo-wall.js        # MODIFY: close button bug fix (FR-002)

index.html               # MODIFY: remove legacy route code, pass tier info to favorites layer
```

**Structure Decision**: Existing flat structure with vendored JS/CSS. No new files needed — all changes modify existing files.

## Complexity Tracking

No constitution violations to justify.

---

## Phase 0: Research

### R1: Leaflet Icon Anchor for Pointer Stem

**Decision**: Use `iconAnchor` to offset the marker so the stem tip (bottom center of the total marker element) aligns with the GPS coordinate.

**Rationale**: Leaflet's `L.Icon` and `L.DivIcon` support `iconAnchor: [x, y]` which controls which pixel of the icon element sits at the marker's lat/lng. By setting `iconAnchor` to `[width/2, totalHeight]` (where totalHeight = frame height + stem height), the stem tip will land exactly on the GPS point. For single-photo markers (no stem), `iconAnchor` is `[width/2, height/2]` (centered).

**Alternatives considered**:
- CSS `transform: translate()` on the icon element — rejected because Leaflet positions icons via absolute pixel offsets and transform would fight with Leaflet's internal positioning.
- Separate overlay layer for stems — rejected as over-complex and would double DOM elements.

### R2: Pointer Stem Implementation

**Decision**: Use a CSS pseudo-element (`::after`) on the marker container to create the triangular pointer stem. The stem is a CSS triangle (border trick) in white, matching the frame border color.

**Rationale**: CSS triangles are the lightest-weight approach — zero extra DOM elements, pure CSS, works in all browsers. The marker `overflow: hidden` will be changed to `overflow: visible` to allow the stem to extend below the frame.

**Alternatives considered**:
- Inline SVG for stem — heavier DOM, more complexity for no visual benefit.
- Canvas drawing — requires JS per marker, incompatible with CSS transitions.
- Extra `<div>` child element — works but CSS pseudo-element achieves same result with less DOM.

### R3: Adaptive Size Tiers

**Decision**: Four discrete tiers based on total photos in cell (hiddenCount + 1):

| Tier | Photo Count | Frame Size (px) | Stem Height (px) |
|------|-------------|-----------------|-------------------|
| 1 (small) | 1 | 70×70 | 0 (no stem) |
| 2 (medium) | 2–5 | 85×85 | 12 |
| 3 (large) | 6–15 | 100×100 | 14 |
| 4 (x-large) | 16+ | 115×115 | 16 |

**Rationale**: Current default is 90×90. The new tiers bracket this value. Smallest tier (single photo, no cluster) is 70px to reduce clutter. Largest is 115px to clearly signal high-density clusters. Stem heights scale proportionally. These values can be tuned during visual testing.

**Alternatives considered**:
- Continuous linear scaling — rejected per spec (discrete tiers chosen).
- Only 2 sizes — rejected per spec (4 tiers chosen).

### R4: Favorites Integration

**Decision**: Favorites use the same frame/stem structure but with gold (#d4a853) border instead of white. Since favorites are always rendered via `L.Photo` (not ViewportSampler), they always show as single-photo markers (tier 1, no stem) unless we change the favorites layer to also report cluster info. Per current architecture, favorites are individual markers — they get the white-to-gold border swap but no stem (they're never clustered).

**Rationale**: Favorites bypass ViewportSampler and are always visible. They don't cluster, so they naturally fall into tier 1 (no stem). The gold border preserves their distinct visual identity.

### R5: Click Target for Stem

**Decision**: The CSS pseudo-element (`::after`) for the stem is not inherently clickable in Leaflet's hit detection. To make the entire marker (frame + stem) clickable, we increase the icon element's explicit dimensions to include the stem area and use `iconAnchor` to position correctly. The `overflow: visible` on the container plus Leaflet's click detection on the icon element will cover both frame and stem.

**Rationale**: Leaflet routes click events to the icon's root element. If the root element's bounding box includes the stem space (by setting the element height to frame + stem), clicks on the stem area will register. The actual photo thumbnail remains at the top, with transparent space below for the stem pseudo-element.

---

## Phase 1: Design

### Data Model

No new data entities. The existing `manifest.json` photo objects and ViewportSampler cell buckets are sufficient. The only new computed value is the **size tier** (1–4), derived at render time from `hiddenCount + 1`.

### Tier Calculation (pure function)

```javascript
function getSizeTier(totalPhotos) {
    if (totalPhotos <= 1) return 1;
    if (totalPhotos <= 5) return 2;
    if (totalPhotos <= 15) return 3;
    return 4;
}
```

### Marker DOM Structure (new)

**Clustered marker (tier 2–4):**
```html
<div class="leaflet-marker-photo marker-tier-2" style="width:85px; height:97px">
  <img src="thumb.jpg" style="width:85px; height:85px">
  <!-- badges: video, favorite, notes, cluster-count -->
  <!-- ::after pseudo-element creates the pointer stem -->
</div>
```
- Element height = frame height + stem height (85 + 12 = 97px for tier 2)
- `iconAnchor` = [42, 97] (center-x, bottom of stem)

**Single-photo marker (tier 1):**
```html
<div class="leaflet-marker-photo marker-tier-1" style="width:70px; height:70px">
  <img src="thumb.jpg" style="width:70px; height:70px">
  <!-- badges -->
</div>
```
- `iconAnchor` = [35, 35] (centered)

### CSS Changes (Leaflet.Photo.css)

1. **White border frame**: Add `border: 3px solid white` and `border-radius: 6px` to `.leaflet-marker-photo`
2. **Overflow visible**: Change `overflow: hidden` → `overflow: visible` (img gets its own `overflow: hidden` + `border-radius`)
3. **Pointer stem via `::after`**: Tier-specific CSS classes (`.marker-tier-2`, `.marker-tier-3`, `.marker-tier-4`) add the `::after` triangle
4. **Favorite gold border**: `.photo-marker-favorite` keeps gold border `#d4a853` (already exists, just ensure it overrides white)
5. **Tier size tokens**: CSS custom properties or direct class-based sizing

### JS Changes

**Leaflet.Photo.js** — `L.Photo.Icon.createIcon()`:
- Accept new options: `tier` (1–4), `stemHeight` (0/12/14/16)
- Set element dimensions to `[frameWidth, frameHeight + stemHeight]`
- Add `marker-tier-N` class to element
- Set `iconAnchor` based on tier

**ViewportSampler.js** — `createMarker()`:
- Compute `totalPhotos = hiddenCount + 1`
- Call `getSizeTier(totalPhotos)` to determine tier
- Look up frame size and stem height from tier config
- Pass `tier`, `stemHeight`, and tier-appropriate `iconSize` to `L.Photo.Icon`
- Set `iconAnchor` on the Leaflet marker

**ViewportSampler.js** — `updateBadge()`:
- When `hiddenCount` changes on an existing marker, check if tier changed
- If tier changed, rebuild the marker icon (size change requires new icon)

**index.html** — `rebuildPhotoLayer()`:
- Favorites layer: pass `tier: 1` explicitly (no stem, gold border)
- Favorites size: use tier 1 frame size (70px) + 10px bonus = 80px

### Contracts

No API contracts needed — this is a pure frontend visual change.

### Quickstart

After implementation:
1. `python3 -m http.server 8000` from project root
2. Open `http://localhost:8000` at 1440px width — verify markers have white frames
3. Zoom into a dense area — verify clustered markers show pointer stems pointing down
4. Verify cluster markers are larger than single-photo markers (4 visible size tiers)
5. Check favorite markers have gold borders with same frame style
6. Click on a marker (frame or stem area) — photo viewer should open
7. Resize to 375px mobile — verify markers still render correctly

---

## Implementation Phases (for /speckit.tasks)

### Phase A: Design Token Foundation (existing audit items)
- Consolidate design tokens in `:root` (already partially done in photo-wall.css)
- Fix legacy colors, font consistency
- Bug fixes (Photo Wall close button, z-index conflicts)

### Phase B: Apple Maps-Style Marker Redesign
1. Add tier config constants and `getSizeTier()` to ViewportSampler
2. Modify `L.Photo.Icon.createIcon()` for frame + stem DOM structure
3. Update `ViewportSampler.createMarker()` to compute and pass tier info
4. Update `ViewportSampler.updateBadge()` to handle tier changes
5. Add CSS: white border, pointer stem pseudo-elements, tier classes
6. Update favorites layer in index.html for new tier system
7. Visual verification at both viewports

### Phase C: Legacy Cleanup
- Remove legacy route rendering code from index.html
- Hide Trip Feed via CSS
