# Tasks: Native Video Playback

**Input**: Design documents from `/specs/013-native-video-playback/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/manifest-schema.json, quickstart.md

**Tests**: Not explicitly requested in the spec — test tasks omitted. Use Playwright MCP for visual verification per CLAUDE.md.

**Organization**: Tasks grouped by user story. Implementation order differs from priority order: US2 (Pipeline, P2) is implemented first because it produces the streaming URLs that US1 (Frontend, P1) consumes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup

**Purpose**: Firebase configuration for video hosting

- [x] T001 Update Firebase Storage rules to allow public read access for `videos/` prefix in `firebase/storage.rules`
- [x] T002 Configure Firebase Storage CORS to allow `Access-Control-Allow-Origin: *` for video downloads (run `gsutil cors set` with JSON config)

---

## Phase 2: User Story 2 — Video Transcoding Pipeline (Priority: P2)

**Goal**: Transcode source videos to web-optimized MP4 variants (720p + full-res) and upload to Firebase Storage, updating the manifest with direct streaming URLs.

**Independent Test**: Run `python3 scripts/process_photos.py`, then verify: (a) `data/manifest.json` video entries have `web_url` pointing to Firebase Storage 720p URL, (b) `web_url_full` points to full-res URL, (c) both URLs are publicly accessible and playable in a browser.

### Implementation

- [x] T003 [US2] Add `transcode_video()` function to `scripts/process_photos.py` — accepts source path + output dir, runs ffmpeg to produce `{stem}_720p.mp4` (H.264 Main, CRF 24, scale=-2:720, AAC 128k, faststart) and `{stem}_full.mp4` (H.264 High, CRF 20, original resolution, AAC 192k, faststart). Returns paths to both output files. Log and skip videos that fail transcoding (FR-010).
- [x] T004 [US2] Add `upload_video_to_firebase()` function to `scripts/process_photos.py` — accepts local MP4 path + storage destination path, uploads to Firebase Storage bucket under `videos/720p/` or `videos/full/` prefix using `firebase-admin` SDK (pattern from existing `scripts/upload_thumbnails.py`). Returns public URL in format `https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{encoded_path}?alt=media`. Set `content_type="video/mp4"`.
- [x] T005 [US2] Integrate transcoding and upload into the main processing loop in `scripts/process_photos.py` — for each video file: check `.process_cache.json` for `transcoded` flag + matching `mtime`/`size`; if not transcoded, call `transcode_video()` then `upload_video_to_firebase()` for both variants; update cache entry with `transcoded: true`, `video_720p_url`, `video_full_url`.
- [x] T006 [US2] Update manifest entry builder in `scripts/process_photos.py` — set `web_url` to the 720p Firebase Storage URL (replacing Google Drive preview URL) and add `web_url_full` field with the full-res Firebase Storage URL. Use cached URLs from `.process_cache.json` when skipping already-transcoded videos.
- [ ] T007 [US2] Run the pipeline on all source videos: execute `python3 scripts/process_photos.py`, verify all video entries in `data/manifest.json` have updated `web_url` and `web_url_full` fields, and spot-check URLs with `curl -I`.

**Checkpoint**: All videos transcoded, uploaded, and manifest updated with streaming URLs. US1 frontend work can now use real URLs.

---

## Phase 3: User Story 1 — One-Click Video Playback (Priority: P1) — MVP

**Goal**: Replace iframe-based video embed with native HTML5 `<video>` element in the lightbox. Poster frame visible immediately, 1-click playback, native controls, quality toggle, and download button.

**Independent Test**: Open any video from map or photo wall; confirm: poster frame appears instantly (no iframe/spinner), play starts within 2s, native controls work, gear icon toggles 720p/full, download button saves active video.

### Implementation

- [x] T008 [P] [US1] Replace `renderVideo()` in `js/photo-viewer.js` — remove iframe creation logic; create a `<video>` element with attributes: `class="pv-video-player"`, `poster` set to `p.thumbnail`, `controls`, `playsinline`, `preload="metadata"`. Add a `<source>` child with `src` set to `p.web_url` (720p default) and `type="video/mp4"`. Keep edge-zone swipe overlays (left/right/top) for touch navigation.
- [x] T009 [P] [US1] Replace iframe/swipe-zone CSS in `css/photo-viewer.css` — remove `.pv-iframe` and related iframe styles; add `.pv-video-player` styles: `width: 100%; max-height: 80vh; object-fit: contain; background: #000;`. Add `touch-action: none` to prevent browser gesture conflicts.
- [x] T010 [US1] Add quality toggle (gear icon) overlay to video player in `js/photo-viewer.js` — create a gear button positioned over the video (top-right area, not obscuring native controls). On click: save `currentTime` and `paused` state, swap `<source>` `src` between `p.web_url` (720p) and `p.web_url_full` (full), call `video.load()`, on `loadedmetadata` restore `currentTime` and resume if was playing. Toggle button label between "720p" and "Full". Hide gear icon if `p.web_url_full` is absent. Reset to 720p on each new video (FR-012).
- [x] T011 [US1] Add download button overlay to video player in `js/photo-viewer.js` — create a download button adjacent to gear icon. On click: create a temporary `<a>` element with `href` set to currently active video URL and `download` attribute, trigger click, remove element. Style consistent with gear icon (dark glass overlay).
- [x] T012 [US1] Add download button for photos in `js/photo-viewer.js` — when viewing a photo in the lightbox, show a download button that saves the photo using `p.web_url` (FR-015). Same styling and position as the video download button.
- [x] T013 [US1] Style gear icon and download button overlays in `css/photo-viewer.css` — dark semi-transparent background, white icons/text, positioned in top-right of video area. Use existing dark-glass design language (matching control panel styling). Ensure overlays do not overlap native video controls (bottom area). Size touch targets for mobile (min 44x44px per III. Approachable by Everyone).
- [x] T014 [US1] Add error handling for video load failures in `js/photo-viewer.js` — listen for `error` event on the `<video>` element; on error, display user-friendly message (e.g., "Video unavailable") with a fallback link to `p.google_photos_url` if available (FR-009). No technical error codes visible to user.
- [x] T015 [US1] Update video cleanup in `js/photo-viewer.js` `finalize()` and navigation functions — when navigating away from a video or closing the lightbox: call `video.pause()`, `video.removeAttribute('src')`, `video.load()` to release resources (FR-007). Remove old iframe cleanup code path.
- [x] T016 [US1] Visual verification with Playwright MCP — screenshot localhost:8000 at 1440px (desktop) and 375px (mobile) showing: (a) video with poster frame in lightbox, (b) native controls visible, (c) gear icon and download button overlays, (d) photo with download button.

**Checkpoint**: One-click native video playback fully functional with quality toggle and download. Core user value delivered.

---

## Phase 4: User Story 3 — Seamless Navigation Between Videos and Photos (Priority: P3)

**Goal**: Smooth transitions when swiping/navigating between mixed photo and video sequences. Video poster frames appear instantly, playback stops on navigation, resources released.

**Independent Test**: In lightbox, navigate through a sequence of mixed photos and videos using swipe and arrow keys. Verify: poster frames appear instantly, no audio overlap, no resource buildup, gesture zones work on mobile.

### Implementation

- [x] T017 [US3] Ensure poster frame preloading for adjacent videos in `js/photo-viewer.js` — when displaying any item in the lightbox, preload thumbnails for the next and previous items (if they are videos) by creating `new Image()` with `src` set to their `thumbnail` URL (FR-008). This ensures poster frames display instantly on navigation.
- [x] T018 [US3] Verify rapid navigation cleanup in `js/photo-viewer.js` — ensure that when `showItem()` is called in quick succession (user rapidly swiping), each call cancels the previous video's load by calling `pause()` + `removeAttribute('src')` + `load()` before replacing `$media.innerHTML`. Verify no audio overlap or resource buildup (edge case from spec).
- [x] T019 [US3] Verify swipe gesture consistency on mobile in `js/photo-viewer.js` — ensure edge-zone swipe overlays for videos match the dimensions and behavior of photo swipe zones (FR-011). Test that the central 70% of the video passes touch events through to native controls while edges capture navigation swipes.
- [x] T020 [US3] Visual verification with Playwright MCP — screenshot at 375px (mobile) showing: (a) video with swipe zones visible, (b) navigation from photo to video, (c) navigation from video to photo.

**Checkpoint**: All user stories complete. Mixed media navigation works smoothly.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases, cleanup, and final verification

- [x] T021 [P] Remove old iframe-based video playback code from `js/photo-viewer.js` — delete the iframe creation logic, Google Drive preview URL handling, and any conditional branches for the old embed approach. Clean up unused CSS in `css/photo-viewer.css` (iframe-specific styles).
- [x] T022 [P] Add buffering indicator styling in `css/photo-viewer.css` — ensure the native video element shows a visible loading/buffering state for large files on slow connections (edge case from spec). The browser provides this natively, but verify styling does not hide it.
- [ ] T023 Run quickstart.md verification checklist — follow all 10 verification steps in `specs/013-native-video-playback/quickstart.md` against localhost:8000. Document any issues.
- [ ] T024 Final Playwright MCP verification at both 1440px and 375px — full end-to-end: open map, click video marker, verify poster + play + controls + gear + download; navigate photo→video→photo; verify cleanup on close.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **US2 Pipeline (Phase 2)**: Depends on Phase 1 (Firebase rules must allow reads for uploaded videos)
- **US1 Frontend (Phase 3)**: Depends on Phase 2 (needs real streaming URLs in manifest)
- **US3 Navigation (Phase 4)**: Depends on Phase 3 (needs native video player implemented)
- **Polish (Phase 5)**: Depends on Phases 3 and 4

### User Story Dependencies

```
Phase 1: Setup
    ↓
Phase 2: US2 (Pipeline) ← produces streaming URLs
    ↓
Phase 3: US1 (Frontend)  ← consumes streaming URLs
    ↓
Phase 4: US3 (Navigation) ← builds on native video player
    ↓
Phase 5: Polish
```

> **Note**: Implementation order differs from priority order. US2 (P2) is implemented before US1 (P1) because the pipeline produces the streaming URLs the frontend needs. US1 delivers the core user value but cannot be end-to-end tested without US2's output.

### Within Each User Story

- Core rendering before overlay controls
- Overlay controls before error handling
- Implementation before visual verification

### Parallel Opportunities

Within Phase 3 (US1):
- T008 (video element in JS) and T009 (video CSS) can run in parallel
- T010 (gear icon) and T011 (download button) can run in parallel after T008/T009
- T012 (photo download) is independent of video tasks

Within Phase 5 (Polish):
- T021 (old code removal) and T022 (buffering styles) can run in parallel

---

## Implementation Strategy

### MVP First (US2 + US1)

1. Complete Phase 1: Setup (Firebase rules + CORS)
2. Complete Phase 2: US2 Pipeline (transcode + upload + manifest update)
3. Complete Phase 3: US1 Frontend (native video player + controls)
4. **STOP and VALIDATE**: Test video playback end-to-end with quickstart checklist
5. Deploy if ready — this delivers the core value (1-click native playback)

### Incremental Delivery

1. Setup + US2 → Pipeline tested independently (URLs work in browser)
2. Add US1 → Native playback tested end-to-end → Deploy (MVP!)
3. Add US3 → Navigation polish → Deploy
4. Polish → Final cleanup → Deploy

---

## Notes

- Total tasks: 24
- US2 (Pipeline): 5 tasks (T003-T007)
- US1 (Frontend): 9 tasks (T008-T016)
- US3 (Navigation): 4 tasks (T017-T020)
- Setup: 2 tasks, Polish: 4 tasks
- Key files modified: `scripts/process_photos.py`, `js/photo-viewer.js`, `css/photo-viewer.css`, `firebase/storage.rules`, `data/manifest.json`
- No new frontend dependencies — uses native `<video>` element
- ffmpeg commands from research.md: CRF 24 for 720p, CRF 20 for full-res, both with `-movflags +faststart`
