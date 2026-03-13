# Implementation Plan: Native Video Playback

**Branch**: `013-native-video-playback` | **Date**: 2026-03-12 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/013-native-video-playback/spec.md`

## Summary

Replace Google Drive iframe embeds with native HTML5 `<video>` elements for 1-click, sub-2-second video playback. The processing pipeline transcodes videos to 720p + full-res H.264 MP4 variants and uploads to Firebase Storage. The frontend lightbox renders native video with a session-persistent quality toggle and download button.

**Current state**: Most of the spec is already implemented. The remaining work is three targeted changes:
1. **Bug fix (FR-016)**: Quality toggle button click-through — center clicks pass through to lightbox close handler
2. **Feature update (FR-012)**: Session-persistent quality preference (currently resets per-video)
3. **UI update (FR-014)**: Gear icon → labeled toggle button ("720p" ↔ "Full")

## Technical Context

**Language/Version**: Vanilla JavaScript (ES5-compatible IIFEs for frontend), Python 3.10+ (processing pipeline)
**Primary Dependencies**: Leaflet.js (vendored), Firebase SDK v11 (vendored), ffmpeg/ffprobe (CLI)
**Storage**: Firebase Storage (Spark free tier: 5 GB storage, 1 GB/day downloads), local JSON manifests
**Testing**: Manual browser testing via Playwright MCP (desktop 1440px + mobile 375px)
**Target Platform**: Web (static hosting, GitHub Pages)
**Project Type**: Web application (static frontend + offline Python processing)
**Performance Goals**: Video playback within 2 seconds of clicking play; 60fps map interaction
**Constraints**: Firebase Spark free tier limits; no build step; no server-side runtime; vanilla JS only
**Scale/Scope**: ~54 videos, ~650 photos; personal travel site

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Compliance |
|-----------|--------|------------|
| I. Privacy by Default | PASS | No new data exposed. Videos already on Firebase Storage. No analytics or tracking added. |
| II. Static & Zero-Config | PASS | All changes are client-side JavaScript. No server-side processing at runtime. Videos served as static files from Firebase Storage. |
| III. Approachable by Everyone | PASS | Labeled toggle button ("720p"/"Full") is more discoverable than a gear icon. Single-click playback reduces complexity. Native browser controls are familiar. |
| IV. Professional Visual Polish | PASS | Toggle button and download button follow existing dark glass panel design language. Smooth transitions on quality switch. |
| V. Performant at Any Scale | PASS | 720p default (~5-8 MB) keeps bandwidth low. Session-persistent toggle avoids repeated full-res loads on toggle-happy users only when intended. `faststart` enables progressive playback. |
| VI. Unified Media Experience | PASS | Videos play inline in the same lightbox as photos. Download works for both media types. Quality toggle is a video-specific enhancement that doesn't break photo UX. |
| VII. Map-Centric Integration | PASS | All changes are within the existing lightbox overlay. No new pages or navigation hierarchies. |

No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/013-native-video-playback/
├── plan.md              # This file
├── research.md          # Phase 0 output (transcoding, Firebase, HTML5 video patterns)
├── data-model.md        # Phase 1 output (manifest schema, transcoded video entity)
├── quickstart.md        # Phase 1 output (processing pipeline + frontend testing)
├── contracts/           # Phase 1 output (not applicable — no API endpoints)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
js/
├── photo-viewer.js      # PRIMARY: Lightbox viewer — video rendering, quality toggle, download, click handling
├── photo-wall.js        # No changes expected (uses thumbnails)
├── landing-page.js      # No changes expected (uses thumbnails)
└── [vendored libs]      # leaflet.js, firebase-*.js, etc. — no changes

css/
├── photo-viewer.css     # Video player styles, toggle button, overlay controls
└── [other styles]       # No changes expected

scripts/
├── process_photos.py    # ALREADY DONE: Video transcoding + Firebase upload
└── upload_thumbnails.py # No changes

data/
├── manifest.json        # ALREADY DONE: web_url + web_url_full fields for videos
└── .process_cache.json  # ALREADY DONE: transcoded + URL cache fields

firebase/
├── storage.rules        # ALREADY DONE: /videos/ public read rule
└── cors.json            # ALREADY DONE: CORS configuration

index.html               # Map popup iframes — OUT OF SCOPE (spec targets lightbox only)
```

**Structure Decision**: No new files or directories needed. All changes are modifications to existing `js/photo-viewer.js` and `css/photo-viewer.css`.

## Already Implemented (Verified by Code Exploration)

The following requirements are fully implemented and working:

| Requirement | Implementation |
|------------|----------------|
| FR-001: Native `<video>` in lightbox | `photo-viewer.js` `renderVideo()` creates `<video>` element |
| FR-002: Poster frame | `<video poster=...>` attribute from thumbnail URL |
| FR-003: Native browser controls | `controls` attribute on `<video>` |
| FR-004: Two-variant transcoding | `process_photos.py` `transcode_video()` — 720p + full |
| FR-005: Upload both variants | Firebase Storage at `videos/720p/` and `videos/full/` |
| FR-006: Manifest dual URLs | `web_url` (720p) + `web_url_full` fields present |
| FR-007: Video cleanup on navigate | `finalize()` — `pause()`, `removeAttribute('src')`, `load()` |
| FR-009: Error message | `video.onerror` handler with fallback link |
| FR-010: Pipeline error handling | try/catch with logging in transcoding |
| FR-011: Swipe navigation | `.pv-swipe-zone` elements for edge touch nav |
| FR-013: Download button (video) | Download button adjacent to quality toggle |

## Remaining Implementation

### Change 1: Fix click-through bug (FR-016)

**Problem**: The quality toggle button (`.pv-video-gear`) has insufficient hit area or missing event propagation handling. Clicking the center of the button causes the click to pass through to the lightbox overlay's close handler (`$ov.addEventListener('click', ...)` at line 120-123 of photo-viewer.js).

**Root cause analysis**: The close handler fires when `e.target === $ov || e.target === $wrap`. The `.pv-ctrl` class buttons use `e.stopPropagation()` to prevent this. The video overlay buttons may not have the `.pv-ctrl` class, or their click area may not fully cover the visual button bounds.

**Fix approach**:
1. Ensure `.pv-video-gear` and `.pv-video-download` have the `.pv-ctrl` class
2. Add `e.stopPropagation()` on their click handlers
3. Increase padding/hit area to ensure clicks anywhere on the visual button are captured
4. In CSS, ensure `pointer-events: auto` on the buttons and their container

### Change 2: Session-persistent quality toggle (FR-012 updated)

**Problem**: Currently, the quality preference resets to 720p when navigating to a different video. The user wants it to persist for the page session.

**Fix approach**:
1. Add a closure-scoped variable in photo-viewer.js: `var qualityPref = '720p'`
2. When user toggles quality, update `qualityPref` to `'full'` or `'720p'`
3. In `renderVideo()`, check `qualityPref` when setting the initial `<source src>`:
   - If `qualityPref === 'full'` and `p.web_url_full` exists → use `p.web_url_full`
   - Otherwise → use `p.web_url` (720p)
4. Update toggle button label to reflect the persisted state
5. On full-res load failure, revert `qualityPref` to `'720p'` and fall back silently

### Change 3: Gear icon → labeled toggle button (FR-014 updated)

**Problem**: The gear icon doesn't clearly communicate the current quality state. Replace with a labeled button.

**Fix approach**:
1. Change the button text from gear icon to "720p" or "Full" based on current state
2. Update CSS for the new button style (pill/badge shape, readable font size)
3. Ensure the button label updates when toggled and when `qualityPref` changes
4. Maintain the `.pv-ctrl` class for proper event handling

### Additional: Photo download button (FR-015)

**Status**: Needs verification. The `.pv-dl` button exists in the DOM but may not be wired for photos. If `renderPhoto()` doesn't show/enable it, add download support using `p.web_url`.

## Complexity Tracking

No constitution violations to justify.
