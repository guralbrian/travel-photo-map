# Travel Photo Map

A static Leaflet map that displays your geotagged travel photos as clustered markers. Drop photos in, run a script, and deploy anywhere as static files (GitHub Pages, Netlify, etc.).

## Prerequisites

- Python 3.10+
- Geotagged photos (JPG/TIFF with GPS EXIF data)

## Quick Start

```bash
# Install Python dependencies
pip install -r requirements.txt

# Add geotagged photos to the photos/ directory
cp ~/my-photos/*.jpg photos/

# Process photos (extract GPS, generate thumbnails, build manifest)
python scripts/process_photos.py

# Preview locally
python3 -m http.server 8000
# Open http://localhost:8000
```

## Google Drive Photo Sync

Instead of manually copying photos, you can sync from a shared Google Drive folder. This is useful when multiple people upload to a shared folder.

### One-Time Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com), create a project
2. Enable the **Google Drive API**
3. Create OAuth 2.0 credentials (Application type: **Desktop app**)
4. Download `credentials.json` to the project root
5. Run the setup flow:

```bash
python scripts/sync_google_drive.py --setup
```

This opens a browser for OAuth consent and saves `token.json` locally. Both files are gitignored.

### Syncing Photos

```bash
# Sync from a shared Drive folder (find the folder ID in the Drive URL)
python scripts/sync_google_drive.py --folder-id YOUR_FOLDER_ID

# Preview what would be downloaded
python scripts/sync_google_drive.py --folder-id YOUR_FOLDER_ID --dry-run

# Force re-download everything
python scripts/sync_google_drive.py --folder-id YOUR_FOLDER_ID --force

# Then process as usual
python scripts/process_photos.py
```

The sync script downloads new photos to `photos/` and records Drive shareable links in `data/notes.yaml` under `google_photos_url`.

## Google Timeline Overlay

Display your travel paths and visited places on the map using Google Timeline data.

### Export from Google Takeout

1. Go to [Google Takeout](https://takeout.google.com)
2. Select **Location History** only
3. Choose JSON format
4. Download and extract the archive

### Parse and Display

```bash
# Parse all timeline data
python scripts/parse_timeline.py \
    --takeout-dir ~/Takeout/Location\ History/Semantic\ Location\ History

# Filter by date range
python scripts/parse_timeline.py \
    --takeout-dir ~/Takeout/Location\ History/Semantic\ Location\ History \
    --start 2026-01-28 --end 2026-02-08

# Simplify paths for smoother rendering
python scripts/parse_timeline.py \
    --takeout-dir ~/Takeout/Location\ History/Semantic\ Location\ History \
    --simplify 0.0001
```

This creates `data/timeline.json`. The map automatically renders:
- **Travel Paths**: Colored polylines by activity type (green=walking, blue=driving, orange=cycling, purple=transit)
- **Visited Places**: Pink circle markers with name, address, and duration

Both overlays can be toggled on/off via the layer control (top-right corner). If `timeline.json` is missing, the map works normally without timeline data.

## Adding Captions and Tags

Create `data/notes.yaml` to add captions and tags to your photos:

```yaml
IMG_1234.jpg:
  caption: Sunset over Santorini
  tags: [greece, sunset, travel]
  google_photos_url: https://photos.app.goo.gl/example123

DSC_5678.jpg:
  caption: Street food in Bangkok
  tags: [thailand, food]
```

If a `google_photos_url` is provided, clicking the popup image will open the full-resolution photo on Google Photos in a new tab.

## Map Layers

The map includes a layer switcher (top-right corner) with ten base map styles:

| Layer | Provider | Description |
|-------|----------|-------------|
| Street Map | OpenStreetMap | Standard street map (default) |
| Humanitarian | OpenStreetMap France / HOT | Humanitarian-focused style |
| Terrain | OpenTopoMap | Topographic map with contour lines |
| Satellite (Esri) | Esri World Imagery | Satellite/aerial photography |
| Esri Street | Esri | Detailed street map |
| CartoDB Positron | CARTO | Light, minimal style |
| CartoDB Dark Matter | CARTO | Dark theme |
| CartoDB Voyager | CARTO | Modern cartographic style |
| USGS Topo | U.S. Geological Survey | US topographic map |
| USGS Imagery | U.S. Geological Survey | US satellite imagery |

All tile providers are free and require no API key.

## Script Options

```
python scripts/process_photos.py --help

  --photo-dir    Directory with original photos (default: photos/)
  --thumb-dir    Directory for thumbnails (default: thumbs/)
  --thumb-width  Thumbnail width in pixels (default: 200)
  --output       Output manifest path (default: data/manifest.json)
```

## Project Structure

```
travel-photo-map/
├── index.html                 # Map page
├── photos/                    # Original photos (gitignored)
├── thumbs/                    # Generated thumbnails
├── data/
│   ├── manifest.json          # Photo metadata (auto-generated)
│   ├── annotations.json       # Annotation markers (auto-generated)
│   ├── notes.yaml             # Optional captions/tags
│   └── timeline.json          # Timeline overlay (auto-generated, gitignored)
├── js/                        # Vendored JS libraries
│   ├── leaflet.js
│   ├── leaflet.markercluster.js
│   └── Leaflet.Photo.js
├── css/                       # Vendored CSS + custom styles
│   ├── leaflet.css
│   ├── MarkerCluster.css
│   ├── MarkerCluster.Default.css
│   ├── Leaflet.Photo.css
│   ├── map.css
│   └── images/                # Leaflet marker icons
├── scripts/
│   ├── process_photos.py      # Photo processing script
│   ├── sync_google_drive.py   # Google Drive sync script
│   └── parse_timeline.py      # Google Timeline parser
├── requirements.txt
└── .gitignore
```

## Deploying to GitHub Pages

1. Push this repo to GitHub
2. Go to Settings > Pages
3. Set source to "Deploy from a branch", select `main` / `/ (root)`
4. Your map will be live at `https://<username>.github.io/<repo-name>/`

Make sure to run `process_photos.py` before pushing so that `thumbs/` and `data/manifest.json` are up to date.

## Troubleshooting

**No markers appear on the map**
- Ensure your photos have GPS EXIF data. Check with: `python -c "from PIL import Image; img=Image.open('photos/test.jpg'); print(img.getexif().get_ifd(0x8825))"`
- Photos at (0, 0) (null island) are automatically skipped

**Thumbnails appear rotated**
- The script reads the EXIF orientation tag and auto-rotates. If a photo has no orientation tag, the thumbnail matches the raw pixel orientation.

**Large photo collection**
- Original photos in `photos/` are gitignored by default. Only thumbnails and the manifest are tracked.
- For very large collections, consider increasing `--thumb-width` for better quality or decreasing it for smaller file sizes.
