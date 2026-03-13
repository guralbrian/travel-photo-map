# Research: Native Video Playback

**Feature**: 013-native-video-playback | **Date**: 2026-03-10 | **Updated**: 2026-03-12

## 1. ffmpeg Transcoding for Web

### 1.1 Optimal ffmpeg Flags for 720p Web-Optimized Output

**Decision**: Use single-pass CRF-based encoding with H.264 Baseline/Main profile and AAC audio, targeting 720p at CRF 23-26 to land in the 5-8 MB range for clips under 2 minutes.

**Recommended command**:

```bash
ffmpeg -i input.mov \
  -c:v libx264 -preset slow -crf 24 -profile:v main -level 3.1 \
  -vf "scale=-2:720" \
  -c:a aac -b:a 128k -ac 2 \
  -movflags +faststart \
  -pix_fmt yuv420p \
  -y output_720p.mp4
```

Flag breakdown:
- `-c:v libx264`: H.264 codec, near-universal browser support.
- `-preset slow`: Better compression efficiency at the cost of longer encode time. For a one-time batch of ~54 videos this is acceptable (roughly 2-4x realtime on modern hardware). `-preset medium` is a reasonable fallback if encode time matters.
- `-crf 24`: Constant Rate Factor. Range is 0-51; 18 is visually lossless, 23 is the libx264 default. CRF 24 provides good quality for travel footage at compact file sizes. Increase to 26 if files are still too large; decrease to 22 for higher quality at the cost of larger files.
- `-profile:v main -level 3.1`: Main profile at level 3.1 ensures compatibility with older mobile devices and embedded players. Baseline profile would further increase compatibility but disables B-frames, hurting compression.
- `-vf "scale=-2:720"`: Scale to 720p height, width auto-calculated and rounded to nearest even number (required by H.264).
- `-c:a aac -b:a 128k -ac 2`: AAC audio at 128 kbps stereo. Sufficient for ambient travel audio. `-ac 2` forces stereo downmix from multi-channel sources.
- `-pix_fmt yuv420p`: Required for broad compatibility. Some source files may use yuv422p or yuv444p which will not play in Safari or many mobile browsers.
- `-movflags +faststart`: Moves the moov atom to the beginning of the file (see section 1.2).

**Rationale**: CRF-based encoding is the standard approach for fixed-quality output where file size is a soft target rather than a hard constraint. For short travel clips (under 2 minutes), CRF 24 at 720p typically produces files in the 4-8 MB range depending on motion complexity. This hits the 5-8 MB target specified in the spec without requiring two-pass encoding.

**Alternatives considered**:
- **CRF 23 (libx264 default)**: Slightly higher quality, slightly larger files (~6-10 MB). Could overshoot the 8 MB target for high-motion clips.
- **CRF 26-28**: Smaller files but visible quality loss on detailed scenes (architecture, landscapes). Not worth the savings when total storage is well within the 5 GB Spark limit.
- **`-preset medium`**: Faster encode but ~10-15% larger files at the same CRF. Acceptable tradeoff if batch processing time is a concern.

### 1.2 Fast-Start (moov Atom Placement)

**Decision**: Always use `-movflags +faststart` on all transcoded output.

**Rationale**: By default, ffmpeg writes the moov atom (the MP4 metadata index containing frame offsets, timestamps, and codec info) at the end of the file. This means a browser must download the entire file before it can begin playback, or issue a range request to seek to the end first, adding latency. The `+faststart` flag runs a post-processing step that moves the moov atom to the beginning, enabling progressive playback as the file downloads. This is critical for the sub-2-second playback start target (SC-002). The overhead is negligible: ffmpeg rewrites the file after encoding, adding a few seconds to the total encode time.

**Alternatives considered**:
- **Fragmented MP4 (`-movflags frag_keyframe+empty_moov`)**: Used for DASH/HLS streaming. Unnecessary complexity for short clips served as static files. Would require a streaming manifest (MPD/M3U8) and a compatible player library.
- **No fast-start, rely on HTTP range requests**: The browser can request the moov atom via a range request to the end of the file, but this adds an extra round trip (100-300ms) and not all CDN/storage configurations handle range requests optimally.

### 1.3 Full-Resolution Re-encode for Web Compatibility

**Decision**: Re-encode source videos at their original resolution to H.264+AAC MP4 for the "full resolution" variant, rather than serving original MOV/HEVC files directly.

**Recommended command**:

```bash
ffmpeg -i input.mov \
  -c:v libx264 -preset slow -crf 20 -profile:v high -level 4.1 \
  -c:a aac -b:a 192k -ac 2 \
  -movflags +faststart \
  -pix_fmt yuv420p \
  -y output_full.mp4
```

Key differences from the 720p variant:
- No `-vf scale` flag: preserves original resolution (typically 1080p or 4K from iPhone footage).
- `-crf 20`: Higher quality target since this is the "full resolution" option.
- `-profile:v high -level 4.1`: High profile enables better compression features; level 4.1 supports up to 1080p60 or 4K30.
- `-b:a 192k`: Slightly higher audio bitrate for the premium variant.

**Rationale**: Source videos from iPhones are commonly HEVC (H.265) in MOV containers. HEVC has limited browser support: Chrome added support only in 2023 (and only on hardware-capable devices), Firefox does not support it at all, and Safari supports it only on macOS/iOS. Re-encoding to H.264 guarantees playback across all target browsers (Chrome, Firefox, Safari, Edge) per SC-006. The file size increase from H.264 vs HEVC at the same quality is roughly 25-40%, but for a ~54-video collection this is manageable within the 5 GB storage limit.

**Alternatives considered**:
- **Serve original MOV/HEVC files directly**: Would save encoding time but breaks Firefox and older Chrome. Unacceptable given the cross-browser requirement.
- **Use VP9/WebM**: Good compression and broad desktop support, but Safari support is limited (only Safari 16.4+ on macOS Ventura+). H.264 remains the safest cross-browser choice.
- **AV1**: Superior compression but encoding is extremely slow (10-50x slower than H.264) and browser support, while growing, is not yet universal on mobile devices.

### 1.4 Two-Pass vs Single-Pass Encoding

**Decision**: Use single-pass CRF encoding for both variants.

**Rationale**: Two-pass encoding targets a specific bitrate, which is useful for streaming services that need predictable bandwidth. For this project, the goal is consistent visual quality (not a specific bitrate), and file sizes are a soft target. CRF achieves this directly: ffmpeg allocates more bits to complex scenes and fewer to simple ones, producing better visual quality per byte than a fixed bitrate. Two-pass encoding would add significant complexity to the pipeline (double the encoding time, temporary log files) with no meaningful benefit for short static-file clips.

**Alternatives considered**:
- **Two-pass ABR (Average Bitrate)**: Guarantees a target file size. Useful if the 8 MB ceiling were a hard constraint, but CRF with reasonable values naturally stays within range for sub-2-minute clips. Not worth the 2x encode time.
- **Constrained CRF (`-crf 24 -maxrate 2M -bufsize 4M`)**: Adds a bitrate ceiling to CRF encoding. A reasonable middle ground if any individual video produces an unexpectedly large file. Worth considering as a safety valve but not needed as the default.

---

## 2. Firebase Storage for Video Hosting

### 2.1 Programmatic Upload via Python (firebase-admin SDK)

**Decision**: Use the existing `firebase-admin` SDK pattern established in `scripts/upload_thumbnails.py`, creating a parallel `scripts/upload_videos.py` script.

The upload pattern is already proven in the codebase:

```python
import firebase_admin
from firebase_admin import credentials, storage

cred = credentials.Certificate("service-account-key.json")
firebase_admin.initialize_app(cred, {"storageBucket": "travel-photo-map-e0bf4.firebasestorage.app"})
bucket = storage.bucket()

blob = bucket.blob("videos/720p/FILENAME.mp4")
blob.upload_from_filename("/local/path/to/video.mp4", content_type="video/mp4")
```

Key implementation notes:
- The Admin SDK bypasses Storage Security Rules entirely, so the upload will succeed regardless of rule configuration.
- Set `content_type="video/mp4"` explicitly; the default `application/octet-stream` may cause browsers to download rather than stream.
- For large files (>50 MB full-res variants), the SDK automatically uses resumable uploads. No special handling needed.
- Implement incremental mode (skip already-uploaded files) by checking if the manifest entry already has a Firebase Storage URL, matching the pattern in `upload_thumbnails.py`.

**Rationale**: Reuses the exact SDK and authentication pattern already working in the project. No new dependencies needed. The `upload_thumbnails.py` script serves as a direct template.

**Alternatives considered**:
- **gsutil CLI**: Google Cloud's CLI tool. Would work but adds a dependency not currently in the project and requires separate auth setup.
- **REST API direct upload**: More complex, requires manual OAuth token handling. No benefit over the Admin SDK.
- **Upload from the frontend**: Not viable for a static site; would require user authentication and expose write credentials.

### 2.2 Public URL Generation

**Decision**: Use the same public URL format already established for thumbnails.

URL format:
```
https://firebasestorage.googleapis.com/v0/b/{BUCKET}/o/{ENCODED_PATH}?alt=media
```

Example for a 720p video:
```
https://firebasestorage.googleapis.com/v0/b/travel-photo-map-e0bf4.firebasestorage.app/o/videos%2F720p%2FEXAMPLE.mp4?alt=media
```

The `build_public_url()` helper in `upload_thumbnails.py` already implements this correctly with proper URL encoding via `urllib.parse.quote()`. This function should be extracted to a shared utility or duplicated in the new upload script.

**Rationale**: This URL format is deterministic (can be constructed from the bucket name and storage path without querying Firebase), permanent (does not expire like signed URLs), and already proven to work for thumbnails in the project.

**Alternatives considered**:
- **Signed URLs**: Expire after a configurable period. Unnecessary since the content is intentionally public. Would require regenerating URLs periodically.
- **`blob.public_url`**: Returns a `storage.googleapis.com` URL that requires the object to have public ACLs set at the GCS level. The `?alt=media` URL works through Firebase's own access layer and is governed by Storage Rules.
- **Firebase Hosting CDN proxy**: Could serve videos through Firebase Hosting for CDN benefits, but adds configuration complexity and Hosting has its own bandwidth limits.

### 2.3 Spark Tier Limits

**Decision**: Proceed with Spark (free) tier. Budget analysis shows the project fits within limits.

| Resource | Spark Limit | Estimated Usage | Headroom |
|----------|-------------|-----------------|----------|
| Storage | 5 GB | ~1.5-2 GB (54 videos x 2 variants + thumbnails) | 3-3.5 GB |
| Download bandwidth | 1 GB/day | ~125-200 views/day at 720p default | Comfortable for a personal travel site |

Storage breakdown estimate (54 videos):
- 720p variants: 54 x ~6 MB average = ~324 MB
- Full-res variants: 54 x ~20 MB average = ~1,080 MB
- Existing thumbnails: ~50 MB
- **Total: ~1.45 GB**

Bandwidth analysis:
- At 720p default (~6 MB per video view), 1 GB/day supports ~166 video views/day.
- Mixed browsing (photos + videos) will have much lower per-session video consumption.
- Full-res views are opt-in and expected to be rare.

Risk mitigation:
- If approaching storage limits, re-encode full-res variants at a higher CRF (22-24) to reduce size.
- If approaching bandwidth limits, the site degrades gracefully (Firebase returns 402/429 errors). A future upgrade to the Blaze tier ($0.026/GB) is straightforward.

**Rationale**: The numbers work. No reason to pay for Blaze tier at current scale.

**Alternatives considered**:
- **Blaze (pay-as-you-go) tier**: Removes limits but introduces billing. Unnecessary at current scale (~54 videos, personal travel site).
- **Cloudflare R2**: Zero egress fees, 10 GB free storage. Would require new infrastructure setup and a different upload pipeline. Worth considering if the project scales significantly.
- **GitHub LFS / GitHub Pages**: GitHub Pages has a 1 GB site limit and 100 GB/month bandwidth. LFS has a 1 GB storage / 1 GB bandwidth free tier. Too restrictive.

### 2.4 Storage Rules for Public Read Access

**Decision**: Add a `/videos/{allPaths=**}` rule matching the existing `/thumbs/` pattern.

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /thumbs/{allPaths=**} {
      allow read: if true;
      allow write: if false;
    }

    match /videos/{allPaths=**} {
      allow read: if true;
      allow write: if false;
    }

    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

**Rationale**: Mirrors the existing thumbs pattern exactly. Videos are public content (same as the photos and thumbnails already served). Write is denied because all uploads go through the Admin SDK which bypasses rules. The default deny-all catch-all remains in place for any other paths.

**Alternatives considered**:
- **Single wildcard rule for both thumbs and videos**: e.g., `match /{folder}/{allPaths=**}` with a condition `if folder == 'thumbs' || folder == 'videos'`. Slightly more DRY but less readable and harder to add folder-specific rules later.
- **No rule change (rely on Admin SDK for reads too)**: Would require signed URLs or a proxy. Unnecessarily complex for public content.

### 2.5 Storage Path Structure

**Decision**: Use `videos/720p/{filename}.mp4` and `videos/full/{filename}.mp4` as the storage paths.

Example:
```
videos/720p/0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085.mp4
videos/full/0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085.mp4
```

**Rationale**: Clear separation by resolution tier. Filenames match the existing convention (UUID-style names from the source media, already used for thumbnails). Keeping both under `videos/` allows a single storage rule to cover both tiers.

**Alternatives considered**:
- **Flat structure (`videos/{filename}_720p.mp4`)**: Mixes resolution variants in one folder. Harder to manage (e.g., bulk delete one tier).
- **Per-video folders (`videos/{filename}/720p.mp4`)**: Over-structured for this scale. Only two variants per video does not justify per-video directories.

---

## 3. HTML5 Video Element Patterns

### 3.1 Poster Frame with Native Controls

**Decision**: Use the `<video>` element's native `poster` attribute pointing to the existing thumbnail URL, with the `controls` attribute for native browser controls.

```html
<video
  class="pv-video-player"
  poster="https://firebasestorage.../thumbs/EXAMPLE.jpg"
  controls
  playsinline
  preload="metadata">
  <source src="https://firebasestorage.../videos/720p/EXAMPLE.mp4" type="video/mp4">
</video>
```

Key attributes:
- `poster`: Displays the thumbnail immediately, before any video data loads. This satisfies SC-004 (poster visible without loading spinner).
- `controls`: Provides native play/pause, seek, volume, and fullscreen (FR-003). No custom control bar needed.
- `playsinline`: Prevents iOS Safari from hijacking playback into fullscreen mode. Essential for the lightbox UX.
- `preload="metadata"`: Downloads only enough of the file to determine duration and dimensions. Avoids downloading full video data until the user hits play. With `faststart`, this is a small initial fetch.

**Rationale**: Native controls are accessible, familiar, and require zero custom JavaScript. The poster attribute provides instant visual feedback using thumbnails that are already loaded/cached from the map and photo wall views.

**Alternatives considered**:
- **Custom video controls**: Full control over appearance but significant implementation effort (play/pause button, seek bar, volume slider, fullscreen toggle, progress indicator). Not justified when native controls meet all requirements. Can be added later if visual customization becomes important.
- **`preload="auto"`**: Would start downloading the full video immediately. Wasteful if the user is just swiping through. `metadata` is the right balance.
- **`preload="none"`**: Would not even load metadata, so the browser cannot display duration. `metadata` is better since the moov atom fetch is fast with `faststart`.

### 3.2 Programmatic Play/Pause/Cleanup

**Decision**: Manage video lifecycle through the existing `photo-viewer.js` navigation and cleanup flow.

```javascript
// On navigation away from a video or lightbox close:
var vid = $media.querySelector('video');
if (vid) {
    vid.pause();
    vid.removeAttribute('src');
    vid.load();  // Forces resource release
}
```

This pattern already exists in the `finalize()` function of `photo-viewer.js` (line 237-239). The current code already handles `<video>` cleanup alongside iframe cleanup. The iframe cleanup path (lines 240-242) can be removed once the migration is complete.

For rapid navigation (edge case: user quickly swipes through multiple videos):
- Each call to `showItem()` replaces `$media.innerHTML`, which removes the previous video element from the DOM.
- Calling `pause()` + `removeAttribute('src')` + `load()` before removal ensures the browser stops network requests and releases media resources.

**Rationale**: The existing cleanup pattern is correct and already handles videos. The main change is removing the iframe path and ensuring the new `<video>` element follows the same cleanup protocol.

**Alternatives considered**:
- **`vid.srcObject = null`**: Only relevant for MediaStream sources (webcam, WebRTC). Not applicable here.
- **Just `vid.pause()`**: Stops playback but does not release the network connection or decoded buffers. Insufficient for rapid navigation scenarios.
- **`URL.revokeObjectURL()`**: Only relevant for blob URLs. Not applicable since we use direct Firebase Storage URLs.

### 3.3 Quality Switching (Changing src Without Losing Position)

**Decision**: Swap the `<source>` `src` attribute and call `load()`, then seek to the saved `currentTime`.

```javascript
function switchQuality(videoEl, newSrc) {
    var currentTime = videoEl.currentTime;
    var wasPlaying = !videoEl.paused;

    videoEl.querySelector('source').src = newSrc;
    videoEl.load();

    videoEl.addEventListener('loadedmetadata', function onMeta() {
        videoEl.removeEventListener('loadedmetadata', onMeta);
        videoEl.currentTime = currentTime;
        if (wasPlaying) {
            videoEl.play().catch(function() { /* autoplay may be blocked */ });
        }
    });
}
```

Implementation notes:
- The gear icon toggles between 720p and full-res URLs stored in the manifest entry.
- Per the spec, quality preference resets to 720p for each new video (no persistence).
- There will be a brief interruption during the switch (new source must buffer). This is acceptable and standard behavior.
- The `loadedmetadata` event fires once the new source's metadata is available, at which point `currentTime` can be set.

**Rationale**: This is the standard pattern for quality switching with native `<video>`. It is simpler than maintaining multiple `<source>` elements or using Media Source Extensions (MSE). The brief interruption is expected behavior that users understand from platforms like YouTube.

**Alternatives considered**:
- **Media Source Extensions (MSE)**: Allows seamless quality switching by appending segments. Massive implementation overhead for this use case. MSE is the foundation of DASH/HLS players like dash.js and hls.js, but those are designed for long-form adaptive streaming.
- **Two `<video>` elements (preloaded swap)**: Preload the alternate quality in a hidden video element, then swap visibility. Doubles bandwidth usage and memory. Not justified for an opt-in quality toggle.
- **Multiple `<source>` elements with different `type` attributes**: The browser selects the first compatible source; there is no API to switch between them at runtime. Does not solve the quality toggle requirement.

### 3.4 Download Button Implementation

**Decision**: Use a hidden `<a>` element with the `download` attribute, triggered programmatically.

```javascript
function downloadVideo(url, filename) {
    var a = document.createElement('a');
    a.href = url;
    a.download = filename || '';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
```

Important caveat: The `download` attribute only works for same-origin URLs or URLs with appropriate CORS headers. Firebase Storage URLs are cross-origin. Two approaches:

1. **Firebase Storage CORS configuration** (preferred): Configure the storage bucket to include `Access-Control-Allow-Origin: *` on responses. Firebase Storage supports CORS configuration via `gsutil cors set`:
   ```json
   [{"origin": ["*"], "method": ["GET"], "maxAgeSeconds": 3600}]
   ```
   With CORS configured, the `download` attribute will work and the browser will save the file with the specified filename rather than navigating to the URL.

2. **Fallback: `window.open(url)`**: If CORS is not configured, open the video URL in a new tab. The browser will play or download it depending on settings. Less clean UX but functional.

For photos, the same pattern applies. The `web_url` for photos already points to Google APIs which may have different CORS behavior. Testing will determine if CORS configuration is needed for photo downloads as well.

**Rationale**: The `<a download>` approach is the standard web pattern for triggering downloads. Firebase Storage CORS configuration is a one-time setup that benefits both video and photo downloads.

**Alternatives considered**:
- **Fetch + Blob URL**: Fetch the entire file into memory, create a blob URL, then trigger download. Works regardless of CORS but requires loading the entire file into browser memory first. Unacceptable for large video files (could be 50+ MB for full-res).
- **Server-side proxy**: Route downloads through a backend that sets `Content-Disposition: attachment`. Not viable for a static site.
- **`Content-Disposition` header on Firebase Storage**: Firebase Storage does not support setting custom headers per-object. The CORS approach is the correct solution.

### 3.5 Cross-Browser Compatibility

**Decision**: Target H.264+AAC in MP4 container, which has universal support across all target browsers.

Browser support matrix for H.264 MP4:
| Browser | Desktop | Mobile |
|---------|---------|--------|
| Chrome | Full support | Full support |
| Firefox | Full support (since Firefox 35, via OS decoders) | Full support |
| Safari | Full support | Full support (iOS) |
| Edge | Full support | Full support |

Key browser-specific considerations:
- **Safari (iOS)**: Requires `playsinline` attribute to prevent automatic fullscreen. Requires `yuv420p` pixel format (not yuv422p). Does not support HEVC in `<video>` on older devices.
- **Firefox**: Uses OS-provided H.264 decoders. On Linux without appropriate codecs installed, H.264 may not work, but this is rare in consumer contexts.
- **Chrome (Android)**: Hardware-accelerated H.264 playback. No issues expected.
- **Edge**: Uses Chromium engine; behavior matches Chrome.

**Rationale**: H.264+AAC is the only codec combination with true universal browser support. This is why the spec chose it and why re-encoding from HEVC source is necessary.

**Alternatives considered**:
- **VP9/WebM**: 93%+ browser support but Safari gaps on older versions. Not worth the compatibility risk.
- **AV1**: Growing support but not yet universal, especially on mobile.
- **Serving multiple formats with `<source>` fallbacks**: Unnecessary when H.264 alone covers all targets. Would double storage requirements for no practical benefit.

### 3.6 Mobile Touch Considerations

**Decision**: Use the existing edge-zone swipe overlay pattern from the current iframe video implementation. Add `touch-action: none` on the video element to prevent browser default gestures from conflicting with the lightbox.

The current `photo-viewer.js` already creates edge-zone swipe overlays for videos (visible in `renderVideo()` at line 549+). These transparent divs sit on top of the left and right edges of the video, capturing horizontal swipe gestures for lightbox navigation while allowing the central area to pass through to the video controls.

```css
.pv-video-player {
    touch-action: none;  /* Prevent browser pan/zoom on the video itself */
}
```

Gesture zones:
- **Left/right 15% edges**: Capture swipe for prev/next navigation (existing behavior).
- **Central 70%**: Pass through to native video controls (play/pause tap, seek scrub, etc.).
- **Top edge**: Reserved for close gesture (existing behavior).

**Rationale**: The edge-zone pattern is already implemented and tested for the iframe approach. Native `<video>` controls (seek bar, play button) are in the central/bottom area, so the edge zones do not interfere. The `playsinline` attribute prevents iOS from entering fullscreen on tap, keeping gestures within the lightbox context.

**Alternatives considered**:
- **Custom gesture handler on the video**: Intercept all touches and decide whether to route to video controls or lightbox navigation. Complex and error-prone; would need to reimplement tap-to-play, seek scrubbing, etc.
- **Disable swipe on videos entirely**: Simpler but breaks the unified navigation experience (FR-011, SC-005). Users expect consistent swipe behavior across all media types.
- **Fullscreen-only video playback**: Sidesteps the gesture conflict entirely by removing the lightbox context. But this breaks the unified media experience principle and removes the quality/download overlay controls.

---

## 4. Manifest Schema Evolution

### 4.1 Current Schema

Current video entries in `data/manifest.json`:

```json
{
  "lat": 53.55,
  "lng": 9.9964,
  "url": "photos/0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085.MP4",
  "thumbnail": "thumbs/0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085.jpg",
  "caption": "",
  "date": "2026-03-03",
  "datetime": "2026-03-03T20:08:35",
  "tags": [],
  "google_photos_url": "https://drive.google.com/file/d/.../view?usp=drivesdk",
  "web_url": "https://drive.google.com/file/d/.../preview",
  "type": "video"
}
```

Key fields:
- `web_url`: Currently a Google Drive `/preview` iframe embed URL for videos, or a `lh3.googleusercontent.com` direct image URL for photos.
- `thumbnail`: Already migrated to Firebase Storage URLs for photos; still local paths for some videos.
- `url`: Local file path to the original media. Used by the processing pipeline, not served to browsers.
- `google_photos_url`: Original Google Drive view link. Kept as a reference/fallback.

### 4.2 Schema Decision: Repurpose `web_url` + Add `web_url_full`

**Decision**: Repurpose `web_url` to hold the 720p streaming URL (default playback). Add a new `web_url_full` field for the full-resolution streaming URL.

Updated video entry:

```json
{
  "lat": 53.55,
  "lng": 9.9964,
  "url": "photos/0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085.MP4",
  "thumbnail": "https://firebasestorage.googleapis.com/v0/b/travel-photo-map-e0bf4.firebasestorage.app/o/thumbs%2F0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085.jpg?alt=media",
  "caption": "",
  "date": "2026-03-03",
  "datetime": "2026-03-03T20:08:35",
  "tags": [],
  "google_photos_url": "https://drive.google.com/file/d/.../view?usp=drivesdk",
  "web_url": "https://firebasestorage.googleapis.com/v0/b/travel-photo-map-e0bf4.firebasestorage.app/o/videos%2F720p%2F0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085.mp4?alt=media",
  "web_url_full": "https://firebasestorage.googleapis.com/v0/b/travel-photo-map-e0bf4.firebasestorage.app/o/videos%2Ffull%2F0CDD9EF3-DB6C-4E61-944A-C2F3C5FE4085.mp4?alt=media",
  "type": "video"
}
```

Changes:
- `web_url`: Changes from Google Drive preview URL to Firebase Storage 720p streaming URL. This is the default playback source.
- `web_url_full` (new): Firebase Storage full-resolution streaming URL. Used when the user toggles quality via the gear icon.
- `thumbnail`: Updated to Firebase Storage URL (may already be done for some entries).
- `google_photos_url`: Retained as-is for reference. Could serve as a last-resort fallback.

**Rationale**: Repurposing `web_url` minimizes frontend changes. The existing `photo-viewer.js` already reads `p.web_url` as the media source (line 516). The `renderVideo()` function just needs to create a `<video>` element instead of an `<iframe>` with the same URL. Adding `web_url_full` as a new field is the minimal schema addition needed for the quality toggle feature. The spec assumption (section "Existing manifest structure") explicitly states `web_url` will be repurposed.

**Alternatives considered**:
- **New fields `video_url_720p` and `video_url_full`**: More explicit naming, but requires updating every frontend reference to `web_url` for videos. Since `web_url` already serves as "the URL the browser uses to display this media," repurposing it is semantically correct and less disruptive.
- **Nested object `video_urls: { "720p": "...", "full": "..." }`**: Cleaner for future extensibility (e.g., adding 480p, 1080p tiers) but breaks the flat structure convention used throughout the manifest. Over-engineering for a two-tier system.
- **Keep `web_url` as Google Drive URL, add separate fields**: Preserves backward compatibility but the old iframe embed path is being explicitly removed per the spec ("the old iframe-based playback path can be removed"). No need to maintain backward compatibility.

### 4.3 Photo Entries: No Changes

Photo entries already use `web_url` as a direct image URL (Google Photos `lh3.googleusercontent.com` links). No changes needed for photos. The download button for photos (FR-015) will use the existing `web_url` value.

---

## 5. Implementation State Assessment (2026-03-12 Update)

### 5.1 Already Implemented

**Decision**: Most of the original spec is already working in production. Focus remaining work on three targeted changes.

**Evidence**: Code exploration of `photo-viewer.js` and `process_photos.py` confirms:

| Requirement | Status | Location |
|------------|--------|----------|
| FR-001: Native `<video>` in lightbox | Done | `photo-viewer.js` `renderVideo()` lines 533-639 |
| FR-002: Poster frame | Done | `<video poster=...>` attribute |
| FR-003: Native browser controls | Done | `controls` attribute on `<video>` |
| FR-004: Two-variant transcoding | Done | `process_photos.py` `transcode_video()` |
| FR-005: Upload both variants | Done | Firebase Storage `videos/720p/` and `videos/full/` |
| FR-006: Manifest dual URLs | Done | `web_url` + `web_url_full` in manifest |
| FR-007: Cleanup on navigate | Done | `finalize()` stops video, removes src |
| FR-009: Error message | Done | `video.onerror` handler |
| FR-010: Pipeline error handling | Done | try/catch in transcoding |
| FR-011: Swipe navigation | Done | `.pv-swipe-zone` elements |
| FR-013: Download button | Done | Adjacent to quality toggle |

**Rationale**: No need to re-implement working code. The remaining changes are surgical modifications to existing, well-structured code.

### 5.2 Click-Through Bug (FR-016)

**Decision**: The quality toggle button's center clicks propagate to the lightbox close handler. Fix by ensuring proper event propagation and hit area coverage.

**Root cause**: The lightbox close handler (`photo-viewer.js` lines 120-123) fires when `e.target === $ov || e.target === $wrap`. Control buttons with `.pv-ctrl` class call `e.stopPropagation()` to prevent this. The video overlay buttons (`.pv-video-gear`, `.pv-video-download`) may lack:
1. The `.pv-ctrl` class assignment
2. Sufficient padding for full hit-area coverage
3. Explicit `e.stopPropagation()` in their click handlers

**Fix**: Ensure `.pv-ctrl` class is present, add `stopPropagation()`, and increase padding/hit area in CSS.

**Alternatives considered**:
- Adding a separate transparent click-blocking overlay behind the buttons — more complex than fixing the buttons directly.
- Changing the close handler to exclude video overlay descendants — fragile, as it couples the close logic to the video overlay structure.

### 5.3 Session-Persistent Quality Toggle

**Decision**: Store quality preference in a module-scoped closure variable (`qualityPref`). No `localStorage` or `sessionStorage` needed.

**Rationale**: The spec says "persist for the page session" (until refresh). A closure variable within the photo-viewer IIFE survives across lightbox open/close cycles within a single page load but resets on refresh. This is the simplest approach with zero side effects.

**Implementation**:
1. Add `var qualityPref = '720p'` in the IIFE state
2. Update on toggle: `qualityPref = (qualityPref === '720p') ? 'full' : '720p'`
3. `renderVideo()` reads `qualityPref` to select initial source
4. On full-res load failure, revert to `'720p'` silently

**Alternatives considered**:
- `localStorage`: Persists across refreshes — exceeds spec requirements, could surprise users with bandwidth
- `sessionStorage`: Works but unnecessarily heavy for a single in-memory boolean

### 5.4 Gear Icon → Labeled Toggle Button

**Decision**: Replace the gear icon with a labeled button showing "720p" or "Full" text.

**Rationale**: A label immediately communicates the current state. A gear icon implies a settings menu (extra interaction step) and doesn't indicate which quality is active. The labeled button aligns with Constitution Principle III (Approachable by Everyone).

**Implementation**: Change the button text content from gear icon to "720p"/"Full". Update CSS for pill/badge styling with readable font. Toggle updates label on click.

**Alternatives considered**:
- Keep gear icon with tooltip — tooltips don't work on mobile (no hover), violating Principle III
- Gear icon that cycles on click — no visual feedback of current state without reading the tooltip
