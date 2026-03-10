# Implementation Plan: Native Video Playback

**Branch**: `013-native-video-playback` | **Date**: 2026-03-10 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/013-native-video-playback/spec.md`

## Summary

Replace the current Google Drive iframe-based video playback (2 clicks, 3-8s load) with native HTML5 `<video>` elements for 1-click, sub-2-second playback. This requires: (1) an ffmpeg transcoding step in the processing pipeline to produce 720p and full-resolution MP4 variants, (2) uploading both variants to Firebase Storage, (3) recording direct streaming URLs in the manifest, and (4) replacing the iframe rendering in `photo-viewer.js` with a native video player featuring quality toggle (gear icon), download button, and proper resource cleanup on navigation.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES5-compatible IIFEs for frontend), Python 3.10+ (processing pipeline)
**Primary Dependencies**: Leaflet.js (vendored), ffmpeg/ffprobe (CLI, already available for thumbnails), Firebase Storage SDK v11 (vendored)
**Storage**: Firebase Storage (Spark free tier: 5 GB storage, 1 GB/day downloads) for transcoded video files; local `data/manifest.json` for metadata
**Testing**: Playwright MCP (visual browser testing at 1440px + 375px), manual pipeline testing via `python scripts/process_photos.py`
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge) on desktop and mobile
**Project Type**: Static web application with offline processing pipeline
**Performance Goals**: Video playback start < 2 seconds on broadband; poster frame visible immediately on lightbox open; 60fps UI transitions
**Constraints**: Firebase Spark tier (5 GB storage, 1 GB/day bandwidth); ~54 videos; 720p default ~5-8 MB each; total estimated storage ~1.5-2 GB for both tiers
**Scale/Scope**: ~54 video entries in manifest; 2 resolution variants each; single-page map application

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Compliance | Notes |
|-----------|------------|-------|
| **I. Privacy by Default** | PASS | Videos uploaded to Firebase Storage (same as existing thumbnails). No analytics or tracking added. Original full-res files remain excluded from git via `.gitignore`. |
| **II. Static & Zero-Config** | PASS | Frontend remains static files. Video URLs baked into `manifest.json` at build time. No runtime API calls needed beyond fetching the video file itself. Firebase Storage URLs are public and keyless. |
| **III. Approachable by Everyone** | PASS | Native video controls follow platform conventions. 1-click playback reduces friction. Gear icon and download button use standard UX patterns. |
| **IV. Professional Visual Polish** | PASS | Native `<video>` element with poster frame provides polished appearance. Custom overlay controls (gear, download) will match existing dark-glass design language. |
| **V. Performant at Any Scale** | PASS | 720p default (~5-8 MB) enables fast load. Poster frame from existing thumbnail displays instantly. Resource cleanup on navigation prevents memory buildup. |
| **VI. Unified Media Experience** | PASS | Videos become true first-class citizens with native playback, quality switching, and download — matching photo capabilities. Same lightbox, same gestures, same navigation. |
| **VII. Map-Centric Integration** | PASS | No change to map integration. Videos still appear as map markers and in photo wall, opening in the existing lightbox overlay. |

**Gate Result: PASS** — No violations. All principles satisfied.

## Project Structure

### Documentation (this feature)

```text
specs/013-native-video-playback/
├── plan.md              # This file
├── research.md          # Phase 0: ffmpeg transcoding, Firebase Storage, video element patterns
├── data-model.md        # Phase 1: manifest schema changes, transcoded video entity
├── quickstart.md        # Phase 1: developer setup guide
├── contracts/           # Phase 1: manifest schema contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
# Frontend changes (existing files)
js/
├── photo-viewer.js      # Replace renderVideo() iframe with <video> element + controls overlay
├── photo-wall.js         # No changes needed (already handles type=video correctly)
└── landing-page.js       # No changes needed

css/
├── photo-viewer.css      # Replace iframe/swipe-zone styles with native video + overlay styles

# Processing pipeline changes (existing files)
scripts/
├── process_photos.py     # Add ffmpeg transcoding step + Firebase Storage upload
└── upload_videos.py      # NEW: standalone script for uploading transcoded videos to Firebase Storage

# Data changes
data/
└── manifest.json         # Updated entries: web_url → direct streaming URL, add web_url_full

# Firebase config (existing)
firebase/
├── storage.rules         # May need update for video file access
```

**Structure Decision**: This feature modifies existing files in the established project structure. One new script (`upload_videos.py`) is added to the `scripts/` directory for the Firebase Storage upload step, keeping it separate from the main processing script for clarity and independent execution.

## Complexity Tracking

> No violations — table not needed.
