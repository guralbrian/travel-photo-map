# Quickstart: Fix Mobile Navigation UX

**Feature**: 012-fix-mobile-nav-ux | **Date**: 2026-03-08

## Prerequisites

- Python 3.10+ (for local server)
- A browser with mobile device emulation (Chrome DevTools recommended)
- Playwright installed for visual checks (see CLAUDE.md)

## Local Development

```bash
# Start local server from project root
python3 -m http.server 8000

# Open in browser
# Navigate to http://localhost:8000
# Use Chrome DevTools device toolbar (Ctrl+Shift+M) to emulate mobile
# Test at 375px width (iPhone SE) and 768px width (breakpoint boundary)
```

## Files to Modify

| File | Purpose |
|------|---------|
| `index.html` | Trip Feed touch handlers (lines 673-768), event listeners (lines 502-522), feed HTML structure (lines 43-55) |
| `css/map.css` | Trip Feed mobile styles (lines 986-1014), drag handle (lines 890-898), toggle button styles |
| `js/photo-wall.js` | Extract shared PanelSnap, add panel coordination events |
| `css/photo-wall.css` | Toggle button positioning, panel state classes |
| `js/region-nav.js` | Wire region select/deselect to panel coordinator (lines 219-222, 268-300) |

## New Files

| File | Purpose |
|------|---------|
| `js/panel-manager.js` | Shared PanelSnap class + mobile panel coordinator |
| `css/panel-shared.css` | Shared panel toggle button styles, drag handle styles |

## Testing Checklist

1. **Touch isolation**: Expand Photo Wall → scroll photos → map must not move
2. **Close buttons**: Tap 'x' on Trip Feed → panel dismisses
3. **Panel switching**: Tap "Feed" toggle → Photo Wall hides, Trip Feed shows
4. **Region flow**: Select region → Trip Feed auto-shows → deselect → Photo Wall returns
5. **Drag handles**: Drag handle upward → panel expands smoothly
6. **Velocity snapping**: Fast swipe down → panel collapses/hides
7. **Desktop unchanged**: Resize to >768px → original desktop layout works

## Visual Verification

After CSS/JS changes, screenshot at both widths per CLAUDE.md:
- Desktop: 1440px
- Mobile: 375px
