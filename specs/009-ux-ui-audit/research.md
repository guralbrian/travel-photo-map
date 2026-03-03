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

**Decision**: Expand the existing `:root` block in `css/map.css` (which already has `--color-accent`, `--z-panel-*`, etc.) to include the complete token set.

**Rationale**: `css/map.css` already defines the primary design tokens in `:root` (lines 1-75). `css/photo-wall.css` also has some `:root` variables. Consolidating all shared tokens into `map.css` (which loads first) and keeping photo-wall-specific tokens in `photo-wall.css` maintains clear ownership.

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
