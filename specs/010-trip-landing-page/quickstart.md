# Quickstart: Trip Landing Page

**Branch**: `010-trip-landing-page` | **Date**: 2026-03-06

## Prerequisites

- Python 3.10+ (for local server)
- A modern browser (Chrome, Firefox, Safari, Edge)
- Existing project setup with `data/manifest.json`, `data/trip_segments.json`, and `data/itinerary.json`

## Local Development

```bash
# 1. Switch to feature branch
git checkout 010-trip-landing-page

# 2. Start local server
python3 -m http.server 8000

# 3. Open in browser
open http://localhost:8000
```

## Data Setup

Before the landing page will display full content, add two new fields to each region in `data/itinerary.json`:

```json
{
  "name": "UK - London",
  "lat": 51.5074,
  "lng": -0.1278,
  "summary": "Our European adventure started in London with visits to the British Museum, Tower Bridge, and some classic fish and chips.",
  "heroPhoto": "https://example.com/path/to/london-hero.jpg",
  "days": [...]
}
```

- **summary**: 2-3 sentences describing that leg of the trip. Write for friends/family.
- **heroPhoto**: URL to a striking photo from that region. Use `web_url` from a photo in `manifest.json`.

Both fields are optional — the page works without them (color fallback for missing hero, first day's notes for missing summary).

## New Files

| File                  | Purpose                                      |
| --------------------- | -------------------------------------------- |
| `js/landing-page.js`  | Landing page initialization and interactions |
| `css/landing-page.css`| Landing page styles                          |

## Modified Files

| File                      | Change                                                          |
| ------------------------- | --------------------------------------------------------------- |
| `index.html`              | Add landing page HTML container, link CSS, load JS              |
| `data/itinerary.json`     | Add `summary` and `heroPhoto` fields to each region             |
| `js/ViewportSampler.js`   | Refactor from singleton IIFE to constructor function            |
| `js/landing-page.js`      | Replace static mini-map with interactive map + ViewportSampler  |
| `css/landing-page.css`    | Add 50vh map section, two-finger overlay, escalation prompt     |

## Testing

After starting the local server:

1. **Intro screen**: Load `localhost:8000` — should see "42 days, 8 regions, 5 countries" fullscreen.
2. **Auto-transition**: Wait ~3.5 seconds — intro should fade to reveal the card grid.
3. **Skip**: Reload, then click/tap during intro — should skip immediately to the grid.
4. **Card grid**: Verify 8 cards with region names, dates, and hero photos.
5. **Card detail**: Click a card — should expand to fullscreen detail with summary, places/dates, map, and photos.
6. **Photo viewer from detail**: Click a photo thumbnail — immersive photo viewer should open. Swipe/arrow to navigate through the region's photos. Close viewer — should return to the detail view (still expanded).
7. **Interactive detail map**: In the detail view, verify the map shows photo clusters (tier-based markers). Pan and zoom the map — should respond instantly.
8. **Map cluster click**: Click a photo cluster on the detail map — immersive photo viewer should open at that photo. Close viewer — return to detail view.
9. **Mobile two-finger gesture**: On mobile (375px), single-finger drag on the map should scroll the detail view. Two-finger drag should pan the map. Verify "Use two fingers" overlay appears on first single-finger drag.
10. **Out-of-bounds escalation**: Pan the detail map far from the region's photos. A "Explore the full map?" prompt should appear. Accept — should transition to fullscreen main map at the current viewport position.
11. **Overflow button**: If a region has >30 photos, verify the button reads "View on map" (not "+N more"). Click it — should transition to map zoomed to that region.
12. **Close detail**: Click back/close — should collapse back to the grid.
13. **Enter map**: Click "Explore the map" — landing page should hide, revealing the full map app.
14. **Mobile**: Resize to 375px width and repeat steps 1-13.
