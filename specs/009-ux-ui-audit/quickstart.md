# Quickstart: UX/UI Audit Remediation

**Branch**: `009-ux-ui-audit`

## Prerequisites

- Python 3 (for local dev servers)
- Chrome/Chromium (for Playwright visual verification)

## Local Development — Dual Server Setup

Two local servers run in parallel for simultaneous desktop and mobile testing:

```bash
cd /home/bgural/photoMap/travel-photo-map

# Terminal 1: Desktop testing server
python3 -m http.server 8000

# Terminal 2: Mobile testing server
python3 -m http.server 8001
```

| Server | URL | Viewport | Purpose |
|--------|-----|----------|---------|
| Port 8000 | http://localhost:8000 | 1440x900 | Desktop visual verification |
| Port 8001 | http://localhost:8001 | 375x812 | Mobile visual verification |

## Files to Modify

| File | What Changes |
|------|-------------|
| `css/map.css` | Trip Feed hide, body font-family, settings toggle position (mobile), control panel default state, design tokens, legacy color replacement, touch targets, z-index fixes |
| `css/photo-wall.css` | Token consumption, reopen button z-index, drag handle, collapsed height, header padding, close button sizing |
| `css/photo-viewer.css` | Token consumption, close button pointer-events fix, touch targets |
| `css/Leaflet.Photo.css` | Popup color fixes (legacy #666/#333 replacement) |
| `js/photo-wall.js` | Drag-to-close snap logic (add 'hidden' target for fast flick from collapsed) |
| `index.html` | Control panel default state, **remove legacy route code (lines 924-979)** |

## Verification Checklist

After each phase, use Playwright MCP to screenshot both servers:

### Bug Fixes (Phase 1)
- [ ] Trip Feed not visible on desktop (port 8000) or mobile (port 8001)
- [ ] Settings panel closed on initial load (both viewports)
- [ ] Settings toggle button at top-left on mobile
- [ ] Photo Wall X close → reopen button appears (both viewports)
- [ ] Photo Wall fast flick down from collapsed → snaps to hidden
- [ ] Photo Wall slow drag down from collapsed → snaps back to collapsed
- [ ] Gold reopen button visible and tappable after any close action
- [ ] Only 14 route polylines rendered (not 28) — legacy route code removed
- [ ] Route toggle in Map Layers controls smart routes

### Design Tokens (Phase 2)
- [ ] All panels render in system font (no Times New Roman)
- [ ] No legacy #666/#333 colors visible
- [ ] Gold hover states use consistent color

### Touch Targets & Z-Index (Phase 3)
- [ ] All mobile touch targets >= 44px
- [ ] No panel buttons blocked by overlapping elements
- [ ] Reopen buttons don't overlap on mobile
- [ ] Photo Viewer close button clickable

### Visual Polish (Phase 4)
- [ ] Photo Wall shows 2+ photo rows when collapsed on mobile
- [ ] Drag handle visually discoverable
- [ ] Header padding consistent across panels

## Implementation Order

1. **Phase 1**: Bug fixes — Trip Feed hide, settings defaults, Photo Wall close/reopen cycle, legacy route removal
2. **Phase 2**: Design tokens — `:root` token definitions, body font, legacy color replacement
3. **Phase 3**: Touch targets + z-index fixes
4. **Phase 4**: Visual polish — collapsed height, drag handle, padding consistency
