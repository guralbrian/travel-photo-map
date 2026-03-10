# Quickstart: Native Video Playback

**Branch**: `013-native-video-playback` | **Date**: 2026-03-10

## Prerequisites

- **Python 3.10+** with `firebase-admin` SDK installed (`pip install firebase-admin`)
- **ffmpeg** and **ffprobe** on PATH (used for transcoding and metadata extraction)
- **Firebase service account key** (JSON) for uploading to Firebase Storage
- **Source video files** in the `photos/` directory (synced from Google Drive)

Verify ffmpeg:
```bash
ffmpeg -version   # must support libx264 and aac encoders
ffprobe -version
```

## Processing Pipeline

### Step 1: Transcode videos

The processing script transcodes each source video into two MP4 variants:

```bash
# From project root
python3 scripts/process_photos.py
```

For each video file, this will:
1. Check `.process_cache.json` to see if the video was already transcoded
2. Generate `{stem}_720p.mp4` (1280x720, H.264, CRF 28, faststart)
3. Generate `{stem}_full.mp4` (original resolution, H.264, CRF 23, faststart)
4. Upload both variants to Firebase Storage under the `videos/` prefix
5. Update the manifest entry: `web_url` points to the 720p variant, `web_url_full` points to the full-res variant
6. Update `.process_cache.json` with transcoding status and URLs

### Step 2: Verify the manifest

After processing, check that video entries in `data/manifest.json` have been updated:

```bash
python3 -c "
import json
with open('data/manifest.json') as f:
    manifest = json.load(f)
videos = [e for e in manifest if e.get('type') == 'video']
for v in videos:
    print(f\"{v['url']}:\")
    print(f\"  web_url:      {v.get('web_url', 'MISSING')}\")
    print(f\"  web_url_full: {v.get('web_url_full', 'MISSING')}\")
"
```

Every video should have `web_url` pointing to a `firebasestorage.googleapis.com` URL (not `drive.google.com`).

### Step 3: Verify URLs are accessible

Spot-check a URL in a browser or with curl:

```bash
# Should return video data with Content-Type: video/mp4
curl -I "PASTE_WEB_URL_HERE"
```

## Frontend: Local Testing

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` in a browser.

### Verification checklist

1. Navigate to a region with videos (e.g., Hamburg -- videos from 2026-03-03)
2. Click a video thumbnail on the map or photo wall
3. Confirm: poster frame (thumbnail) appears immediately, no iframe loading
4. Confirm: clicking play starts video within 2 seconds
5. Confirm: native browser controls visible (play/pause, seek, volume, fullscreen)
6. Confirm: gear icon visible on video overlay -- clicking toggles between 720p and full resolution
7. Confirm: download button visible -- clicking downloads the active video file
8. Confirm: swiping/arrow-key navigation between photos and videos works smoothly
9. Confirm: navigating away from a playing video stops playback
10. Test on mobile viewport (375px width) -- swipe zones, controls, and download all functional

### Video entries for testing

Videos in the manifest with filenames like:
- `0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085.MP4` (Hamburg, 2026-03-03)
- `15BCA3E0-7B87-47A8-A652-DA88D5048B1C.MP4`
- `IMG_7419.MOV`, `IMG_7422.MOV`, `IMG_7427.MOV` (Copenhagen, 2026-01-30)

## Key Files to Modify

### Processing pipeline (backend)

| File | Change |
|------|--------|
| `scripts/process_photos.py` | Add `transcode_video()` function (ffmpeg calls for 720p + full variants). Add `upload_video()` function (Firebase Storage upload). Update manifest entry builder to set `web_url` and `web_url_full` to Firebase Storage URLs. Update cache entries with `transcoded`, `video_720p_url`, `video_full_url` fields. |

### Frontend (viewer)

| File | Change |
|------|--------|
| `js/photo-viewer.js` | Replace iframe-based `renderVideo()` with native `<video>` element. Set `src` to `web_url`, `poster` to `thumbnail`. Add gear icon for quality toggle (`web_url` / `web_url_full`). Add download button. Stop video and release resources on navigation. |
| `css/photo-viewer.css` | Replace `.pv-iframe` styles with `<video>` element styles. Add styles for gear icon and download button overlays. Ensure video controls do not conflict with swipe zones. |

### Frontend (other consumers)

| File | Change |
|------|--------|
| `js/photo-wall.js` | No change expected -- photo wall uses thumbnails, not streaming URLs. |
| `js/landing-page.js` | No change expected -- landing page uses thumbnails with play icon overlay. |

### Firebase configuration

| File | Change |
|------|--------|
| Firebase Storage rules | Add `match /videos/{allPaths=**} { allow read; }` for public read access to transcoded videos. |

## Rollback

If issues arise, revert video `web_url` values in the manifest back to Google Drive preview URLs. The iframe-based playback path in `photo-viewer.js` can be restored from the `011-fix-video-playback` branch.
