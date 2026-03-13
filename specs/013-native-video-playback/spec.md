# Feature Specification: Native Video Playback

**Feature Branch**: `013-native-video-playback`
**Created**: 2026-03-10
**Status**: Draft
**Input**: User description: "Videos currently require 2 clicks and 3-8 seconds to play because we embed Google Drive's entire preview page in an iframe. Goal: reduce to 1-click instant playback using native video elements with direct streamable URLs."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - One-Click Video Playback (Priority: P1)

A visitor browsing the travel map clicks a video thumbnail (from the map marker or photo wall). Instead of waiting for a heavy third-party preview page to load inside an embedded frame, a native video player appears immediately in the lightbox with a poster frame visible. The visitor clicks the play button once and the video begins playing within 2 seconds. They can pause, seek, adjust volume, and enter fullscreen using standard browser video controls.

**Why this priority**: This is the core problem being solved. The current 2-click, 3-8 second flow is the primary pain point. Eliminating the intermediary embed and providing instant native playback delivers the most user value.

**Independent Test**: Can be tested by opening any video in the lightbox and verifying single-click playback with native controls, without any third-party embed frame loading.

**Acceptance Scenarios**:

1. **Given** a video entry visible on the map or photo wall, **When** the user clicks its thumbnail, **Then** the lightbox opens showing a poster frame (thumbnail) with a play button overlay — no loading spinner or third-party embed is shown.
2. **Given** the lightbox is open showing a video poster frame, **When** the user clicks the play button, **Then** video playback begins within 2 seconds on a broadband connection.
3. **Given** a video is playing in the lightbox, **When** the user interacts with the video, **Then** native browser controls (play/pause, seek bar, volume, fullscreen) are available and functional.
4. **Given** a video is displayed in the lightbox, **When** the user clicks the quality toggle button, **Then** it switches between 720p and full resolution, the button label updates to reflect the new state, and playback resumes at the same position.
5. **Given** a video is displayed in the lightbox, **When** the user clicks the download button, **Then** the currently active video file (at the selected resolution) downloads to their device.

---

### User Story 2 - Video Transcoding in Processing Pipeline (Priority: P2)

When new trip media is processed through the existing pipeline, video files are converted to a web-optimized format and uploaded to cloud storage alongside their thumbnails. The manifest is updated with a direct streaming URL so the frontend can use a native video element without relying on third-party embed URLs.

**Why this priority**: Without a reliable source of directly streamable video URLs, the frontend cannot use native video elements. This pipeline change is the enabler for P1, but is separated because it can be developed and tested independently against the processing scripts.

**Independent Test**: Can be tested by running the processing pipeline on a set of videos and verifying that (a) optimized video files are uploaded to cloud storage, (b) the manifest contains direct streaming URLs, and (c) those URLs are publicly accessible and playable.

**Acceptance Scenarios**:

1. **Given** a new video file is added to the media source folder, **When** the processing pipeline runs, **Then** the video is transcoded to a web-optimized format and uploaded to cloud storage.
2. **Given** a video has been processed and uploaded, **When** the manifest is generated, **Then** the video entry includes a direct streaming URL pointing to the cloud-hosted file.
3. **Given** a direct streaming URL from the manifest, **When** accessed in a browser, **Then** the video streams and plays without requiring authentication or third-party page loads.

---

### User Story 3 - Seamless Navigation Between Videos and Photos (Priority: P3)

A visitor is swiping through media in the lightbox. When they swipe from a photo to a video (or vice versa), the transition is smooth. The video shows its poster frame immediately, and adjacent media thumbnails are preloaded. Swiping away from a playing video stops playback and releases resources. The experience is consistent whether navigating on desktop or mobile.

**Why this priority**: Navigation continuity is important for the overall UX but builds on the P1 and P2 foundations. Users expect the same swipe/arrow-key behavior regardless of media type.

**Independent Test**: Can be tested by navigating a sequence of mixed photos and videos in the lightbox, verifying smooth transitions, poster frame display, and proper cleanup of video playback on navigation.

**Acceptance Scenarios**:

1. **Given** the user is viewing a photo in the lightbox, **When** they swipe/click to navigate to a video, **Then** the video poster frame appears immediately without a loading delay.
2. **Given** a video is actively playing, **When** the user swipes to the next or previous item, **Then** video playback stops, resources are released, and the next media item loads cleanly.
3. **Given** the user is on a mobile device viewing a video, **When** they use swipe gestures on the edge zones, **Then** navigation works identically to photo navigation (no gesture interception issues).

---

### Edge Cases

- What happens when a video's streaming URL becomes unavailable or returns an error? The viewer should display a user-friendly error message with a fallback option (e.g., link to the original source).
- What happens with very large video files (>500 MB) on slow connections? The player should show a buffering indicator and remain responsive; it should not appear frozen.
- What happens when a video format is not supported by the user's browser? The system should detect unsupported formats and display a clear message rather than a blank player.
- How does the system handle videos that fail transcoding in the pipeline? Failed videos should be logged and excluded from the manifest (or flagged) rather than producing broken entries.
- What happens when the user rapidly swipes through multiple videos? Each navigation should cancel the previous video load/playback to avoid resource buildup and audio overlap.
- What happens when the full-resolution variant fails to load after toggling? The player silently falls back to 720p, continues playback uninterrupted, and the toggle reverts to "720p".

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The lightbox MUST render videos using a native browser video player instead of a third-party embed frame.
- **FR-002**: The video player MUST display the video's thumbnail as a poster frame before playback begins.
- **FR-003**: The video player MUST provide native browser controls: play/pause, seek, volume, and fullscreen.
- **FR-004**: The processing pipeline MUST transcode each video into two variants: a 720p compressed version (~5-8 MB average) as the default, and a full-resolution version for optional high-quality playback.
- **FR-005**: The processing pipeline MUST upload both video variants to cloud storage and record both streaming URLs in the manifest.
- **FR-006**: The manifest MUST include direct streaming URLs for both the 720p and full-resolution variants of each video entry.
- **FR-012**: The video player MUST default to 720p on initial page load and provide a quality toggle allowing the user to switch between 720p and full resolution. The selected quality preference MUST persist for the duration of the page session (i.e., until the user refreshes or navigates away from the page entirely). All subsequent videos opened in the lightbox MUST use the last-selected quality.
- **FR-016**: The quality toggle button MUST capture click/tap events across its entire hit area. Clicks on the center of the toggle MUST NOT propagate to the lightbox close handler. (Bug fix: currently, only edge clicks register on the button; center clicks pass through and dismiss the lightbox.)
- **FR-013**: The video player MUST display a download button (adjacent to the quality toggle) that saves the currently active video file (whichever resolution is selected) to the user's device.
- **FR-014**: The quality toggle button (displaying "720p" or "Full") and download button MUST be visible on the video player overlay without obscuring playback, consistent with standard video player control placement.
- **FR-015**: The lightbox MUST display a download button for photos as well, allowing users to save the currently viewed photo to their device.
- **FR-007**: Navigating away from a video (swipe, arrow key, close) MUST stop playback and release video resources.
- **FR-008**: The viewer MUST preload poster frames (thumbnails) for adjacent videos during lightbox navigation.
- **FR-009**: The system MUST display a user-friendly error message when a video fails to load or is unsupported.
- **FR-010**: The processing pipeline MUST log and handle videos that fail transcoding without breaking the overall processing run.
- **FR-011**: Swipe navigation in the lightbox MUST work consistently for both photos and videos on touch devices.

### Key Entities

- **Video Manifest Entry**: Represents a video in the data manifest. Key attributes: geographic coordinates, 720p streaming URL, full-resolution streaming URL, thumbnail/poster URL, original source URL, date/time metadata, and media type designation.
- **Transcoded Video**: A web-optimized version of the original video file stored in cloud storage. Each video has two variants (720p and full-resolution). Attributes: storage URL, resolution tier, format, file size, original source reference.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can begin video playback with a single click/tap from the lightbox (reduced from 2 clicks today).
- **SC-002**: Video playback begins within 2 seconds of clicking play on a broadband connection (reduced from 3-8 seconds today).
- **SC-003**: 100% of videos in the lightbox use native browser controls (play/pause, seek, volume, fullscreen) with no third-party embed frames.
- **SC-004**: Video poster frames (thumbnails) are visible immediately when a video is selected, with no loading spinner required before the poster appears.
- **SC-005**: Swipe and keyboard navigation between mixed photo/video sequences in the lightbox works without delays or gesture conflicts.
- **SC-006**: All videos processed through the pipeline are available via direct streaming URLs that work across major browsers (Chrome, Firefox, Safari, Edge).

## Clarifications

### Session 2026-03-12

- Q: What should the default quality be on page load for the session-persistent toggle? → A: Default to 720p; user toggles to full res and it persists for the session.
- Q: What happens when clicking the center of the quality button? → A: Bug fix — center clicks currently pass through to the lightbox close handler. The button must capture clicks across its entire hit area.
- Q: Should the quality control be a gear icon or a toggle button? → A: Replace gear icon with a labeled toggle button showing "720p" or "Full" for immediate state visibility.
- Q: What happens if the full-res variant fails to load after toggling? → A: Silently fall back to 720p, continue playback, toggle reverts to "720p".

### Session 2026-03-10

- Q: Cloud storage tier and cost tolerance? → A: Stay on Firebase Spark (free) tier; aggressively compress videos to minimize bandwidth (~5-8 MB average per video).
- Q: Compression quality vs. file size tradeoff? → A: Default to 720p with moderate bitrate; provide a user-facing toggle in the viewer to switch to full (original) resolution.
- Q: Resolution toggle placement and additional controls? → A: ~~Small gear icon~~ **Updated 2026-03-12**: Labeled toggle button (showing "720p" or "Full") on the video player overlay for quality switching; adjacent download button to save the currently active video file.
- Q: Should download also work for photos? → A: Yes, add download button for both photos and videos in the lightbox for consistency.
- Q: Should quality preference persist? → A: ~~No, reset to 720p for each new video.~~ **Updated 2026-03-12**: Yes, persist for the page session. Default to 720p on initial load; once toggled to full res, all subsequent videos use full res until the page is refreshed.

## Assumptions

- **Cloud storage**: Videos will be hosted on Firebase Storage (Spark free tier: 5 GB storage, 1 GB/day downloads). Aggressive compression is required to stay within free tier limits.
- **Video format**: MP4 with H.264 video and AAC audio is the target transcoding format, as it has near-universal browser support. Two variants per video: (1) 720p compressed (~5-8 MB average, served by default) and (2) full-resolution (original quality, opt-in). Total storage for 54 videos at both tiers estimated ~1.5-2 GB, within the 5 GB Spark limit. The 720p default keeps typical daily bandwidth well within the 1 GB/day download cap (~125-200 views/day).
- **File sizes**: Most trip videos are short clips (under 2 minutes). The system does not need adaptive bitrate streaming (HLS/DASH) for this use case, though this could be added later if needed.
- **Processing tooling**: ffmpeg is already available in the processing environment (used for thumbnail extraction) and can handle transcoding.
- **Existing manifest structure**: The manifest's `web_url` field will be repurposed to contain direct streaming URLs instead of third-party embed URLs. No new fields are required.
- **Backward compatibility**: Once migrated, the old iframe-based playback path can be removed. There is no requirement to support both approaches simultaneously in production.
