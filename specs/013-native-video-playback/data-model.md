# Data Model: Native Video Playback

**Feature**: 013-native-video-playback
**Date**: 2026-03-10

## Overview

This feature repurposes the manifest's `web_url` field for videos to contain a direct Firebase Storage streaming URL (instead of a Google Drive preview URL). A new `web_url_full` field is added for the full-resolution variant. The processing pipeline gains a transcoding and upload stage. No Firestore changes are required.

## Entities

### 1. Video Manifest Entry (updated)

The manifest entry for videos (`type: "video"`) gains new semantics for `web_url` and a new optional field `web_url_full`. Photo entries are unchanged.

| Field | Type | Change | Description |
|-------|------|--------|-------------|
| `lat` | `number` | Unchanged | Latitude |
| `lng` | `number` | Unchanged | Longitude |
| `url` | `string` | Unchanged | Local path to source file (e.g., `photos/0CDD9EF3.MP4`) |
| `thumbnail` | `string` | Unchanged | Firebase Storage URL for the video's poster frame |
| `caption` | `string` | Unchanged | Caption text |
| `date` | `string` | Unchanged | Date in `YYYY-MM-DD` format |
| `datetime` | `string` | Unchanged | ISO 8601 datetime |
| `tags` | `string[]` | Unchanged | Tag array |
| `google_photos_url` | `string` | Unchanged | Original Google Drive view URL |
| `web_url` | `string` | **Repurposed** | Direct Firebase Storage streaming URL for the **720p** MP4 variant. Previously a Google Drive `/preview` URL. |
| `web_url_full` | `string` | **New** | Direct Firebase Storage streaming URL for the **full-resolution** MP4 variant. Optional but expected for all processed videos. |
| `type` | `string` | Unchanged | `"video"` discriminator |

**Before** (Google Drive embed):
```json
{
  "lat": 53.55,
  "lng": 9.9964,
  "url": "photos/0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085.MP4",
  "thumbnail": "https://firebasestorage.googleapis.com/v0/b/.../thumbs%2F0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085.jpg?alt=media",
  "caption": "",
  "date": "2026-03-03",
  "datetime": "2026-03-03T20:08:35",
  "tags": [],
  "google_photos_url": "https://drive.google.com/file/d/abc123/view?usp=drivesdk",
  "web_url": "https://drive.google.com/file/d/abc123/preview",
  "type": "video"
}
```

**After** (native playback):
```json
{
  "lat": 53.55,
  "lng": 9.9964,
  "url": "photos/0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085.MP4",
  "thumbnail": "https://firebasestorage.googleapis.com/v0/b/.../thumbs%2F0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085.jpg?alt=media",
  "caption": "",
  "date": "2026-03-03",
  "datetime": "2026-03-03T20:08:35",
  "tags": [],
  "google_photos_url": "https://drive.google.com/file/d/abc123/view?usp=drivesdk",
  "web_url": "https://firebasestorage.googleapis.com/v0/b/.../videos%2F0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085_720p.mp4?alt=media",
  "web_url_full": "https://firebasestorage.googleapis.com/v0/b/.../videos%2F0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085_full.mp4?alt=media",
  "type": "video"
}
```

**Validation rules**:
- Videos MUST have `web_url` pointing to a streamable MP4 URL (not a Google Drive preview). The URL must be publicly accessible without authentication.
- `web_url_full` is optional but expected for all processed videos. If absent, the quality toggle in the viewer is hidden.
- For photos, `web_url` continues to point to `lh3.googleusercontent.com` CDN URLs. The `web_url_full` field is not used for photos.

---

### 2. Transcoded Video (new processing artifact)

Each source video produces two transcoded MP4 files optimized for web streaming.

| Variant | Filename Pattern | Resolution | Target Size | Codec |
|---------|-----------------|------------|-------------|-------|
| 720p (default) | `{stem}_720p.mp4` | 1280x720 (scaled, preserving aspect) | ~5-8 MB | H.264 + AAC |
| Full | `{stem}_full.mp4` | Original resolution | Varies | H.264 + AAC (re-muxed/transcoded) |

**Storage location**: Firebase Storage under `videos/` prefix.

```
videos/
  0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085_720p.mp4
  0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085_full.mp4
  15BCA3E0-7B87-47A8-A652-DA88D5048B1C_720p.mp4
  15BCA3E0-7B87-47A8-A652-DA88D5048B1C_full.mp4
  ...
```

**Access**: Public read via Firebase Storage rules (matching existing `thumbs/` pattern).

**Transcoding parameters** (720p variant):
- Video: H.264, `-vf scale=-2:720`, `-crf 28`, `-preset slow`, `-movflags +faststart`
- Audio: AAC, `-b:a 128k`
- Container: MP4 with `faststart` flag for progressive download / streaming

**Transcoding parameters** (full variant):
- Video: H.264, original resolution, `-crf 23`, `-preset slow`, `-movflags +faststart`
- Audio: AAC, `-b:a 192k`
- Container: MP4 with `faststart` flag

The `faststart` flag is critical: it moves the MP4 moov atom to the beginning of the file so browsers can begin playback before the full file is downloaded.

---

### 3. Processing Cache (updated)

The existing `.process_cache.json` (`data/.process_cache.json`) tracks file processing state by filename, mtime, and size. It is extended to track video transcoding and upload status.

**Current entry** (photo or video):
```json
{
  "0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085.MP4": {
    "mtime": 1772916284.06,
    "size": 45550485
  }
}
```

**Updated entry** (video with transcoding status):
```json
{
  "0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085.MP4": {
    "mtime": 1772916284.06,
    "size": 45550485,
    "transcoded": true,
    "video_720p_url": "https://firebasestorage.googleapis.com/v0/b/.../videos%2F0CDD9EF3_720p.mp4?alt=media",
    "video_full_url": "https://firebasestorage.googleapis.com/v0/b/.../videos%2F0CDD9EF3_full.mp4?alt=media"
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `mtime` | `number` | Existing: file modification time |
| `size` | `number` | Existing: file size in bytes |
| `transcoded` | `boolean` | New: whether transcoding + upload completed successfully |
| `video_720p_url` | `string` | New: Firebase Storage URL for 720p variant |
| `video_full_url` | `string` | New: Firebase Storage URL for full-resolution variant |

Photo entries remain unchanged (no new fields). The new fields are only added for video files.

**Re-processing logic**: A video is re-transcoded if `transcoded` is missing/false, or if `mtime` or `size` has changed (indicating the source file was updated).

---

## Data Flow

### Processing Pipeline (Write Path)

```
1. process_photos.py identifies video files (is_video() check)

2. For each video, check .process_cache.json:
   - If transcoded == true AND mtime/size unchanged → skip
   - Otherwise → transcode

3. Transcode with ffmpeg:
   source.MP4 → {stem}_720p.mp4  (720p H.264, ~5-8 MB)
   source.MP4 → {stem}_full.mp4  (full-res H.264)

4. Upload both variants to Firebase Storage under videos/ prefix
   → Returns public download URLs

5. Update .process_cache.json with transcoded=true and URLs

6. Write manifest entry:
   web_url = 720p Firebase Storage URL
   web_url_full = full-res Firebase Storage URL
```

### Frontend (Read Path)

```
1. Fetch manifest.json

2. For video entries (type == "video"):
   - Lightbox renders <video> element instead of <iframe>
   - video.src = entry.web_url (720p by default)
   - video.poster = entry.thumbnail
   - Quality toggle switches video.src to entry.web_url_full
   - Download button uses currently active URL

3. For photo entries (type == "photo"):
   - No change; web_url still points to Google CDN
```

## Relationship to Static Manifest

```
manifest.json (static, deployed with app)
  ├── For photos:
  │   └── web_url → lh3.googleusercontent.com CDN URL (unchanged)
  │
  └── For videos:
      ├── web_url → Firebase Storage 720p streaming URL (CHANGED from Google Drive preview)
      ├── web_url_full → Firebase Storage full-res streaming URL (NEW)
      ├── thumbnail → Firebase Storage poster frame (unchanged)
      └── google_photos_url → Google Drive view URL (unchanged, kept for reference)
```

## Firebase Storage Rules Update

Add read access for the `videos/` prefix, matching existing `thumbs/` pattern:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /thumbs/{allPaths=**} {
      allow read;
    }
    match /videos/{allPaths=**} {
      allow read;
    }
  }
}
```

## Storage Budget

| Item | Count | Size Each | Total |
|------|-------|-----------|-------|
| 720p variants | ~54 | ~5-8 MB | ~270-430 MB |
| Full variants | ~54 | ~15-30 MB | ~810 MB-1.6 GB |
| Thumbnails (existing) | ~650 | ~50-100 KB | ~50 MB |
| **Total** | | | **~1.1-2.1 GB** |

Firebase Spark free tier: 5 GB storage, 1 GB/day downloads. The 720p default keeps typical daily bandwidth well within the download cap.
