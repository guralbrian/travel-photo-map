# Europe 2026 — Travel Photo Map

An interactive map of Brian and Rachel's 42-day trip across London, Copenhagen, Heidelberg, Munich, Prague, Dresden, Berlin, and Hamburg. 429 photos, 35 videos, 9 regions, 5 countries — January 26 to March 9, 2026.

**[Explore the map](https://guralbrian.github.io/travel-photo-map/)**

---

## Contents

- [How to Explore](#how-to-explore)
- [The Route](#the-route)
- [Features](#features)
- [For Developers](#for-developers)
  - [Architecture](#architecture)
  - [Tech Stack](#tech-stack)
  - [Project Structure](#project-structure)
  - [Local Setup](#local-setup)
  - [Data Pipeline](#data-pipeline)
  - [Cloud Backend](#cloud-backend)
  - [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)
- [Map Layers](#map-layers)

---

## How to Explore

**Landing page** — When you open the app you'll see trip stats and a grid of region cards with hero photos. Tap any region to see its photos, places, and day-by-day notes, or hit "Explore the Map" to jump straight to the map.

**The map** — Photos appear as markers on an interactive map. The app intelligently thins them out so the map doesn't get cluttered — zoom in and more appear. Click any photo marker to open it full-screen.

**Photo viewer** — Swipe left and right to flip through photos. Pinch to zoom in (up to 5x), double-tap to quick-zoom, swipe down to close. Videos play inline with a loading preview. On desktop, use arrow keys and scroll to zoom.

**Photo wall** — Drag up the bottom panel to see every photo in a scrollable chronological grid organized by date. Use the scrubber on the right edge to jump to a specific date. Tap any photo to fly to its location on the map.

**Regions sidebar** — Open the sidebar to browse by city. Each region expands into a day-by-day itinerary with notes about what we did, who we met, and where we went.

**Map styles** — Switch between 10 map styles (satellite, terrain, dark mode, and more) using the controls panel. Toggle travel route lines and Google Timeline paths on and off.

---

## The Route

| # | Region | Dates | Highlights |
|---|--------|-------|------------|
| 1 | London | Jan 27–29 | Festival of Genomics at ExCeL, networking |
| 2 | Copenhagen (1) | Jan 30 – Feb 3 | Ashnikko concert, waterfront hot baths, –20°C |
| 3 | Heidelberg | Feb 3–8 | EMBL, Philosophenweg, Bürgstadt & Miltenberg |
| 4 | Munich | Feb 9–13 | Helmholtz visit, Lost Weekend, long walks |
| 5 | Prague | Feb 13–15 | Naplavka market, Charles Bridge, Petrin Hill |
| 6 | Dresden / Meissen | Feb 16–17 | Zwinger, porcelain Manufactory, Cathedral |
| 7 | Berlin / Hamburg | Feb 17–19 | Kreuzberg, Schanzenviertel thrifting |
| 8 | Copenhagen (2) | Feb 20 – Mar 9 | KU/CBMR networking, BII, long stay |

---

## Features

- Landing page with animated intro, region cards, and hero slideshow
- Viewport-based photo density sampling (adapts to zoom level, Apple Maps style)
- Immersive photo viewer with pinch zoom (5x), swipe navigation, and FLIP open/close animations
- Video playback via Google Drive iframe embeds with thumbnail loading state and spinner
- Draggable photo wall — justified chronological grid with date scrubber
- Region navigation sidebar with day-by-day itinerary notes
- Smart route lines between cities (chronological clustering + RDP simplification)
- Google Timeline overlay — walking, driving, cycling, and transit paths from Location History
- 10 map tile layers (street, satellite, terrain, dark, topo, and more)
- Cloud backend for favorites, captions, and tags (Firebase Auth + Firestore)
- Fully responsive — mobile-first touch targets with desktop hover enhancements

---

## For Developers

### Architecture

Single-page app with no build tools, no bundler, and no framework. The UI is vanilla JavaScript split between ES5-compatible IIFEs (photo viewer, landing page, region nav) and ES2020 modules (cloud data, Firebase SDK). All third-party dependencies are vendored in `js/` — there's no `package.json` or `node_modules`. The whole thing deploys as static files.

Each feature is a self-contained module that attaches to the Leaflet map instance or global state. `ViewportSampler.js` handles intelligent photo density on the map. `route-builder.js` generates travel polylines between cities. `cloud-data.js` manages Firestore reads/writes with an offline localStorage queue.

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Map | Leaflet.js 1.9 + MarkerCluster (vendored) |
| UI | Vanilla JavaScript, CSS3, HTML5 |
| Fonts | Inter (Google Fonts CDN) |
| Backend | Firebase Auth + Firestore Lite SDK v11.6.0 (vendored) |
| Data pipeline | Python 3.10+ (Pillow, PyYAML, google-api-python-client) |
| Hosting | Static files — GitHub Pages, Netlify, any web server |

### Project Structure

```
travel-photo-map/
├── index.html                    # Single-page app entry point
├── css/
│   ├── map.css                   # Map controls, timeline slider, layout
│   ├── photo-viewer.css          # Fullscreen photo/video viewer
│   ├── photo-wall.css            # Bottom-panel photo grid
│   ├── landing-page.css          # Landing page + region cards
│   ├── leaflet.css               # Vendored Leaflet styles
│   ├── Leaflet.Photo.css         # Photo marker styles
│   └── MarkerCluster*.css        # Cluster marker styles
├── js/
│   ├── landing-page.js           # Trip intro, region cards, detail views
│   ├── photo-viewer.js           # Viewer: zoom, swipe, video, FLIP animations
│   ├── photo-wall.js             # Draggable panel with justified photo grid
│   ├── region-nav.js             # Sidebar: trip legs, itinerary, region filtering
│   ├── route-builder.js          # Smart route polylines between cities
│   ├── ViewportSampler.js        # Viewport-based photo density sampling
│   ├── Leaflet.Photo.js          # Custom photo marker Leaflet plugin
│   ├── cloud-data.js             # Firestore CRUD: favorites, captions, tags
│   ├── auth.js                   # Firebase Auth UI + session handling
│   ├── firebase-*.js             # Vendored Firebase SDK modules
│   ├── leaflet.js                # Vendored Leaflet
│   └── leaflet.markercluster.js  # Vendored MarkerCluster plugin
├── data/
│   ├── manifest.json             # 464 photo/video entries (auto-generated)
│   ├── trip_segments.json        # 8 city segments with dates + colors
│   ├── itinerary.json            # Day-by-day notes for 9 regions
│   ├── annotations.json          # Map annotation markers
│   ├── notes.yaml                # Captions, tags, Google Drive links
│   ├── timeline.json             # Google Timeline paths (gitignored)
│   └── location_overrides.yaml   # Manual lat/lng corrections
├── scripts/
│   ├── process_photos.py         # Extract EXIF GPS, generate thumbnails, build manifest
│   ├── sync_google_drive.py      # Sync photos from shared Drive folder
│   ├── parse_timeline.py         # Parse Google Takeout location history
│   ├── init_firestore.py         # Seed Firestore collections
│   └── upload_thumbnails.py      # Upload thumbnails to Firebase Storage
├── firebase/
│   ├── firestore.rules           # Firestore security rules
│   └── storage.rules             # Cloud Storage security rules
├── hero/                          # Hero images for landing page region cards
├── thumbs/                        # Generated thumbnails
├── photos/                        # Original photos (gitignored)
├── specs/                         # Feature specification documents
└── requirements.txt               # Python dependencies
```

### Local Setup

The app works out of the box — all data files are already committed. No Python needed unless you want to process new photos.

```bash
git clone https://github.com/guralbrian/travel-photo-map.git
cd travel-photo-map
python3 -m http.server 8000
# Open http://localhost:8000
```

### Data Pipeline

#### Processing Photos

Extract GPS coordinates from EXIF data, generate thumbnails, and build `data/manifest.json`:

```bash
pip install -r requirements.txt
python scripts/process_photos.py
```

Options: `--photo-dir` (default: `photos/`), `--thumb-dir` (default: `thumbs/`), `--thumb-width` (default: 200), `--output` (default: `data/manifest.json`).

#### Google Drive Sync

Sync photos from a shared Google Drive folder instead of copying them manually.

**One-time setup:**
1. Create a project in [Google Cloud Console](https://console.cloud.google.com) and enable the Google Drive API
2. Create OAuth 2.0 Desktop credentials, download `credentials.json` to the project root
3. Run `python scripts/sync_google_drive.py --setup` to authorize

**Syncing:**
```bash
python scripts/sync_google_drive.py --folder-id YOUR_FOLDER_ID
python scripts/sync_google_drive.py --folder-id YOUR_FOLDER_ID --dry-run   # preview
python scripts/sync_google_drive.py --folder-id YOUR_FOLDER_ID --force     # re-download all
python scripts/process_photos.py                                            # then rebuild manifest
```

#### Google Timeline Overlay

Display travel paths and visited places from Google Location History:

1. Export Location History from [Google Takeout](https://takeout.google.com) (JSON format)
2. Parse and generate `data/timeline.json`:

```bash
python scripts/parse_timeline.py \
    --takeout-dir ~/Takeout/Location\ History/Semantic\ Location\ History

# Filter by date range
python scripts/parse_timeline.py \
    --takeout-dir ~/Takeout/... \
    --start 2026-01-28 --end 2026-02-08

# Simplify paths for smoother rendering
python scripts/parse_timeline.py \
    --takeout-dir ~/Takeout/... \
    --simplify 0.0001
```

The map renders colored polylines by activity type (green = walking, blue = driving, orange = cycling, purple = transit) and pink circle markers for visited places. Both can be toggled on/off. If `timeline.json` is missing, the map works normally without it.

#### Captions and Tags

Add captions and tags to photos via `data/notes.yaml`:

```yaml
IMG_1234.jpg:
  caption: Sunset over the Vltava
  tags: [prague, sunset]
  google_photos_url: https://photos.app.goo.gl/example123
```

### Cloud Backend

The app uses Firebase for optional cloud features (favorites, caption editing, tag editing). The Firebase config file (`js/firebase-config.js`) is gitignored — copy from the example and fill in your project credentials. Without it, the app runs fine in read-only mode with all local data.

### Deployment

No build step. Push to GitHub and enable Pages:

1. Go to Settings > Pages
2. Set source to "Deploy from a branch", select `main` / `/ (root)`
3. Live at `https://<username>.github.io/<repo-name>/`

Works equally well on Netlify, Vercel, or any static file host. Just make sure `thumbs/` and `data/manifest.json` are up to date before deploying.

---

## Troubleshooting

**No markers appear on the map** — Make sure photos have GPS EXIF data. Check with: `python -c "from PIL import Image; img=Image.open('photos/test.jpg'); print(img.getexif().get_ifd(0x8825))"`. Photos at (0, 0) are automatically skipped.

**Thumbnails appear rotated** — The processing script reads the EXIF orientation tag and auto-rotates. If a photo has no orientation tag, the thumbnail matches the raw pixel orientation.

**Large photo collection** — Original photos in `photos/` are gitignored. Only thumbnails and the manifest are tracked. Adjust `--thumb-width` for quality vs. file size.

---

<details>
<summary><strong>Map Layers</strong></summary>

The map includes 10 base map styles, all free with no API key required:

| Layer | Provider | Description |
|-------|----------|-------------|
| Street Map | OpenStreetMap | Standard street map (default) |
| Humanitarian | OSM France / HOT | Humanitarian-focused style |
| Terrain | OpenTopoMap | Topographic with contour lines |
| Satellite (Esri) | Esri World Imagery | Satellite/aerial photography |
| Esri Street | Esri | Detailed street map |
| CartoDB Positron | CARTO | Light, minimal style |
| CartoDB Dark Matter | CARTO | Dark theme |
| CartoDB Voyager | CARTO | Modern cartographic style |
| USGS Topo | U.S. Geological Survey | US topographic map |
| USGS Imagery | U.S. Geological Survey | US satellite imagery |

</details>
