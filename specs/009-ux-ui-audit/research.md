# Research: UX/UI Audit Remediation

**Feature**: 009-ux-ui-audit | **Date**: 2026-03-03

## Research Topics

### 1. Trip Feed CSS Hide Strategy

**Decision**: Use `display: none !important` on `.feed-sidebar` and `.feed-toggle` selectors in `css/map.css`.

**Rationale**: The feed sidebar has complex state management (hidden class, sheet states on mobile, drag handlers in JS). Rather than modifying JS state logic (which would be harder to reverse), a CSS override with `!important` ensures the elements are hidden regardless of JS state changes. This is the most reversible approach — remove two CSS rules to re-enable.

**Implementation**: Add near the existing feed rules in `css/map.css`:
```css
/* Trip Feed hidden — superseded by Photo Wall (re-enable by removing these rules) */
.feed-sidebar,
.feed-toggle { display: none !important; }
```

**Alternatives considered**:
- `visibility: hidden` — rejected because it still occupies layout space
- JS removal of DOM elements — rejected because it's harder to reverse
- Adding `hidden` attribute in HTML — rejected because JS state changes could remove it

### 2. Photo Wall Drag-to-Close — Snap Logic Fix

**Decision**: Add `'hidden'` as a snap target in `_onPointerUp` for velocity-based dismiss from collapsed state.

**Rationale**: The current snap logic in `js/photo-wall.js:291-333` only snaps to `'collapsed'`, `'half'`, or `'full'` during drag. The `'hidden'` state is only reachable via the X close button (`line 515`). The user expects a fast downward flick from the collapsed state to fully dismiss the panel.

**Implementation**: In the velocity > 400 (fast swipe down) branch at line 316:
- Current: `target = (this.currentState === 'full') ? 'half' : 'collapsed';`
- New: `target = (this.currentState === 'full') ? 'half' : (this.currentState === 'half') ? 'collapsed' : 'hidden';`

This chains: full→half, half→collapsed, collapsed→hidden for successive fast downward flicks.

**Alternatives considered**:
- Position-based threshold (below 15vh) — rejected because it could trigger accidentally during slow drags
- Always snap to hidden on any downward velocity from collapsed — rejected because slow drags should return to collapsed per clarification

### 3. Control Panel Default State — Start Closed

**Decision**: Start the control panel with `hidden` class and show the toggle button on page load.

**Rationale**: Currently `index.html:1093` creates the panel with `className = 'control-panel'` (no `hidden` class) and hides the toggle button with `display: 'none'`. The `controlSlideIn` animation at `css/map.css:538-541` auto-plays, causing the panel to animate in on load.

**Implementation**:
1. `index.html:~1093`: Change `panel.className = 'control-panel';` → `panel.className = 'control-panel hidden';`
2. `index.html:~1091`: Remove `toggleBtn.style.display = 'none';` (button should be visible by default)
3. `index.html:~1088`: Change `toggleBtn.className = 'panel-toggle open';` → `toggleBtn.className = 'panel-toggle';` (remove `open` class)

**Alternatives considered**:
- Adding `hidden` via CSS instead of class — rejected because the JS toggle logic already uses the `hidden` class

### 4. Settings Toggle Button — Mobile Repositioning

**Decision**: Override mobile position to top-left (`top: 10px; left: 10px`), matching desktop.

**Rationale**: Currently the mobile media query at `css/map.css:899-904` repositions the button to `bottom: 20px; right: 20px`, where it overlaps with the Photo Wall panel and reopen button.

**Implementation**: In the `@media (max-width: 768px)` block, change:
```css
.panel-toggle {
    top: 10px;
    left: 10px;
    bottom: auto;
    right: auto;
}
```

### 5. Reopen Button Reliability

**Decision**: Ensure the gold reopen button's z-index is set explicitly and that the `visible` class toggle fires for all dismiss paths (X close and drag-to-close).

**Rationale**: The current code at `js/photo-wall.js:816-820` correctly toggles the `visible` class when state changes to `hidden`. The `_onSnapStateChange` callback is called from `snapTo()` (line 249-265), which is used by both the X close button and the new drag-to-close path. No JS changes needed — just verify CSS z-index is sufficient.

**Implementation**:
1. Set explicit z-index on `.photo-wall-reopen-btn` using `var(--z-panel-toggle)` to match other floating buttons
2. Verify button positioning doesn't overlap with settings toggle after repositioning

### 6. Global Font-Family Strategy

**Decision**: Add `font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;` to the `body` selector in `map.css`.

**Rationale**: The Controls panel and Trip Feed both declare this font stack directly on their container elements. The Photo Wall does not, causing it to inherit the browser default (Times New Roman). Setting it on `body` fixes the Photo Wall and provides a safety net for any future components.

**Alternatives considered**:
- Adding `font-family` only to `.photo-wall-panel` — rejected because it doesn't prevent the same issue in future components.
- Creating a separate `base.css` — rejected as unnecessary for a single property addition.

### 7. CSS Custom Properties Scope

**Decision**: Keep all design tokens in the existing `:root` block in `css/photo-wall.css` (line 7), which already defines colors, z-index, font sizes, durations, and easing tokens.

**Rationale**: `css/photo-wall.css` is the canonical token home — it already defines the complete set of shared tokens (colors, z-index layers, font scale, timing). All other CSS files (`map.css`, `photo-viewer.css`) already consume these tokens via `var()`. No file reorganization needed.

**Token scale**:
- **Font sizes**: `--font-xs` (11px), `--font-sm` (12px), `--font-base` (13px), `--font-md` (15px), `--font-lg` (16px), `--font-xl` (20px)
- **Durations**: `--duration-fast` (150ms), `--duration-normal` (250ms), `--duration-slow` (400ms)
- **Easing**: `--easing-standard`, `--easing-decelerate`, `--easing-accelerate`
- **Colors**: Verify and complete existing token set; add missing hover/muted values
- **Z-index**: Already partially defined; verify complete layer stack

### 8. Z-Index Conflict Resolution

**Decision**: Use `pointer-events: none` on non-interactive regions of overlapping panels, combined with `pointer-events: auto` on their interactive children.

**Rationale**: The root cause is that panels are full-width/height containers with `pointer-events: auto` by default. Rather than restructuring z-index values (which risks breaking Leaflet's internal z-index hierarchy from 100-800), the safer approach is to make non-interactive panel regions click-through.

**Specific fixes**:
- **Photo Viewer close button**: Add `pointer-events: none` to `.pv-media` and `pointer-events: auto` to the media element within it.
- **Mobile reopen buttons**: Reposition to avoid overlap after Trip Feed removal simplifies the layout.

### 9. Touch Target Sizing Approach

**Decision**: Use `min-height: 44px` and `min-width: 44px` in mobile media queries, combined with padding increases where needed.

**Rationale**: The 44px minimum follows Apple HIG and Google Material Design guidance. Using `min-height`/`min-width` ensures elements can grow if content demands.

**Elements requiring changes**:
- Panel close buttons: 19.7x20px → 44x44px
- Photo Wall collapse/close buttons: 28x28px → 44x44px (mobile)
- Accordion headers: 34px → 44px
- Radio/checkbox rows: 24px → 44px

### 10. Playwright Parallel Testing Setup

**Decision**: Use two `python3 -m http.server` instances on ports 8000 and 8001 with Playwright MCP switching between them.

**Workflow**:
1. `python3 -m http.server 8000` — desktop testing at 1440x900
2. `python3 -m http.server 8001` — mobile testing at 375x812
3. After each change: navigate to port 8000, resize to 1440x900, screenshot; then navigate to port 8001, resize to 375x812, screenshot
4. Both servers serve identical files — the viewport size is the differentiator

### 11. Legacy Route Code Duplication (NEW — discovered via Playwright)

**Decision**: Remove legacy straight-line route rendering code at `index.html:924-968` and its associated arrow handler at lines 971-979. The smart route builder (`route-builder.js`) becomes the sole route renderer.

**Rationale**: Playwright visual inspection + DOM analysis revealed 28 SVG path elements on the map — exactly double the expected 14. Every route color has 4 polylines (2 smart bg+fg + 2 legacy bg+fg). The legacy code at lines 924-968 draws direct city-to-city straight lines ON TOP of the smart waypoint-based routes from `route-builder.js`. Additionally, line 967 (`travelRouteLayer = routeGroup`) overwrites the smart routes reference, causing the Map Layers toggle to only control legacy routes while smart routes stay permanently visible.

**Implementation**:
1. Delete `index.html` lines 924-979 (legacy route loop, `calcBearing` duplicate, `arrowMarkers` array, zoom-based arrow handler)
2. Keep line 890 (`travelRouteLayer = buildSmartRoutes(...)`) and line 891 (`travelRouteLayer.addTo(map)`) — these set up the smart routes
3. The route toggle at line 1157 (`routeToggle.addEventListener('change', ...)`) references `travelRouteLayer`, which will now correctly point to the smart routes layer
4. `route-builder.js` already handles its own arrow marker zoom visibility (lines 369-377), so the deleted zoom handler is redundant

**Verification**: After removal, confirm:
- 14 SVG path elements (down from 28)
- Route toggle in Map Layers correctly shows/hides smart routes
- No console errors

**Alternatives considered**:
- Keep both behind a toggle: Rejected — user clarification explicitly chose "remove legacy entirely"
- Move smart routes to control both: Over-engineering — the smart route builder already handles the "no transit photos" case with straight city-to-city fallback

### 12. Apple Maps-Style Photo Marker — Icon Anchor

**Decision**: Use `iconAnchor` on `L.Photo.Icon` to position the marker so the pointer stem tip aligns with the GPS coordinate.

**Rationale**: Leaflet's `L.Icon` supports `iconAnchor: [x, y]` — the pixel offset from the top-left of the icon element that sits on the lat/lng point. For stemmed markers: `iconAnchor = [frameWidth/2, frameHeight + stemHeight]`. For stemless (single photo): `iconAnchor = [frameWidth/2, frameHeight/2]`. This is the standard Leaflet pattern for pointer-style markers.

**Alternatives considered**:
- CSS `transform: translateY()` — conflicts with Leaflet's internal pixel positioning during pan/zoom.
- Separate overlay layer for stems — doubles DOM elements, synchronization complexity.

### 13. Pointer Stem Visual Implementation

**Decision**: CSS `::after` pseudo-element on the **outer** container creates the triangle. The white border and photo clip live on `.photo-frame-inner` (the inner div). Shadow uses `filter: drop-shadow` on the outer container so it traces both the frame shape and the triangle.

**Key implementation details**:
- Border (`3px solid white`) and `border-radius: 6px` are on `.photo-frame-inner`, not on `.leaflet-marker-photo`. This prevents the border from wrapping the transparent stem area.
- `filter: drop-shadow(0 2px 6px rgba(0,0,0,0.45))` on `.leaflet-marker-photo` traces the actual alpha shape (frame + triangle) for a unified shadow. Using `box-shadow` instead would only shadow the rectangular bounding box.
- `.photo-frame-inner` requires `z-index: 1` to paint above the `::after` pseudo-element. Without it, the absolutely-positioned `::after` renders on top of the photo in DOM paint order, visually overlapping the bottom of the thumbnail.
- The outer `.leaflet-marker-photo` has `overflow: visible` and no border/shadow of its own.

**Alternatives considered**:
- `box-shadow` on outer container — only shadows the rectangle, stem gets no shadow.
- `filter: drop-shadow` on `::after` directly — pseudo-elements don't support `filter` reliably.
- Inline SVG path — heavier DOM, no benefit for a simple triangle.
- Canvas — requires per-marker JS rendering, incompatible with CSS animations.

### 14. Adaptive Size Tier Configuration

**Decision**: Four fixed tiers (0–3) with predetermined pixel dimensions.

| Tier | Photo Count | Frame (px) | Stem (px) | Total Height | iconAnchor |
|------|-------------|------------|-----------|-------------|------------|
| 0 | 1 | 70×70 | 0 | 70 | [35, 35] |
| 1 | 2–5 | 85×85 | 12 | 97 | [43, 97] |
| 2 | 6–15 | 100×100 | 14 | 114 | [50, 114] |
| 3 | 16+ | 115×115 | 16 | 131 | [58, 131] |

**Rationale**: Current default icon size is 90×90. Tier 2 (85px) is close to the current default. Tier 1 (70px) reduces visual noise for solo photos. Tiers 3–4 progressively emphasize high-density clusters. Stem height scales proportionally.

**Performance note**: Tier calculation is O(1). No impact on viewport sampling performance.

### 15. Favorites Layer Integration

**Decision**: Favorites render as tier-1-style markers (no stem) with gold border. Size is 80px (70 + 10px bonus, consistent with current `currentIconSize + 10`).

**Rationale**: Favorites bypass ViewportSampler — individually placed via `L.Photo`, never clustered. They naturally map to "single photo" behavior. Gold (#d4a853) border replaces white frame border.

### 16. Click Target for Stem Area

**Decision**: The icon element's dimensions include the stem area (height = frame + stem). Leaflet routes clicks to the icon root element, so the full area (frame + stem) responds to clicks.

**Rationale**: No extra event listeners or overlay divs needed. The existing Leaflet click handling works because the root element spans the entire marker height.

### 17. Cluster Count Badge Styling

**Decision**: Badge is positioned inside `.photo-frame-inner` at `bottom: 6px; right: 6px`. No background, no "+" prefix — just the number in bold white with a strong `text-shadow` for legibility against any photo.

**Rationale**: A grey pill background felt cramped and added visual noise at small sizes. Text-shadow (`0 1px 3px rgba(0,0,0,0.95), 0 0 8px rgba(0,0,0,0.7)`) provides sufficient contrast against light and dark thumbnails. Removing the "+" prefix reduces clutter since context (multiple photos visible) is already implied by the marker's stem.

**Alternatives considered**:
- Badge pill at top-right — rejected by user; felt cramped and competed with photo content.
- Keeping "+" prefix — rejected by user; redundant given the visual context.
