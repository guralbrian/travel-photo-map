# Quickstart: Trip Feed / Timeline Sidebar

**Feature**: 004-trip-feed
**Prerequisites**: Working travel-photo-map with Firebase backend (002-cloud-photo-backend complete)

## 1. Deploy Updated Firestore Rules

1. Open `firebase/firestore.rules`
2. Add the `dailyNarratives/all` rule from `specs/004-trip-feed/contracts/firestore-rules-addition.txt`
3. Go to [Firestore Console > Rules](https://console.firebase.google.com/project/travel-photo-map-e0bf4/firestore/rules)
4. Replace contents with the updated rules file
5. Click **Publish**

## 2. Local Development

```bash
# Serve the project (ES modules require HTTP server)
python3 -m http.server 8000
# Open http://localhost:8000
```

## 3. Verify Feed Display

1. Load the map — the feed sidebar should appear on the right (desktop) or as a bottom sheet peek (mobile)
2. Scroll through the feed — daily entries should show dates, city names with color accents, and photo thumbnails
3. Click a feed entry — the map should smoothly pan/zoom to that day's photos
4. Click a photo thumbnail in the feed — the lightbox should open

## 4. Verify Narrative Editing

1. Sign in with an authorized editor email
2. Click the "Add note..." area on any daily entry
3. Type a narrative and click away (blur) or press Enter
4. Refresh the page — the narrative should persist
5. Open on another device — the narrative should be visible

## 5. Verify Responsive Layout

1. **Desktop (>1280px)**: Both left control panel and right feed sidebar visible simultaneously
2. **Desktop (768px-1280px)**: Opening one sidebar collapses the other
3. **Mobile (<=768px)**: Feed is a bottom sheet — swipe up to expand, tap entry to pan map, swipe down to minimize

## 6. Verify Timeline Integration

1. Narrow the timeline slider to a 3-day range
2. The feed should update to show only entries within that date range
3. Expand the timeline back — all feed entries return
