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

The map includes a layer switcher (top-right corner) with four base map styles:

| Layer | Provider | Description |
|-------|----------|-------------|
| Street Map | OpenStreetMap | Standard street map (default) |
| Terrain | OpenTopoMap | Topographic map with contour lines |
| Satellite | Esri World Imagery | Satellite/aerial photography |
| CartoDB Voyager | CartoDB | Clean, modern cartographic style |

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
│   └── notes.yaml             # Optional captions/tags
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
│   └── process_photos.py      # Photo processing script
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
