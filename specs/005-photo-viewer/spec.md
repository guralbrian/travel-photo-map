# Feature Specification: Immersive Photo Viewer

**Feature Branch**: `005-photo-viewer`
**Created**: 2026-03-02
**Status**: Draft
**Input**: User description: "We need to update the photo viewing function, when a photo is clicked on in the map or the tripfeed on mobile or desktop. It doesn't feel immersive or usable. It should just open a new view (low latency) like that of an iPhone in Photos if on mobile or Google Photos if on desktop. There have been bugs with the current setup, including getting stuck on a zoom when pinching the screen on mobile, long load times, and distorted preloading images for videos."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Tap Photo on Mobile for Immersive View (Priority: P1)

A mobile user taps a photo on the map or in the trip feed. The photo opens instantly in a full-screen immersive viewer that feels like the native iPhone Photos app — dark background, photo centered and filling the screen, no visible UI chrome until the user taps. The user can swipe left/right to navigate between photos, pinch to zoom without getting stuck, and swipe down to dismiss the viewer and return to the previous screen.

**Why this priority**: This is the core mobile experience and addresses the most reported bugs (stuck zoom, poor immersion). Mobile is the primary use case for a travel photo map.

**Independent Test**: Can be fully tested by tapping any photo on a mobile device and verifying the full-screen viewer opens instantly, swipe navigation works, pinch-to-zoom works without getting stuck, and swipe-down dismissal returns the user to the map/feed.

**Acceptance Scenarios**:

1. **Given** a user is viewing the map on a mobile device, **When** they tap a photo marker, **Then** the photo expands from its thumbnail position into a full-screen immersive viewer with a dark background, completing the transition within 300ms.
2. **Given** the immersive viewer is open on mobile, **When** the user swipes left or right, **Then** the viewer navigates to the previous or next photo with a smooth sliding transition.
3. **Given** the immersive viewer is open on mobile, **When** the user pinch-zooms in and then releases, **Then** the photo stays at the zoomed level without getting stuck, and the user can pan around the zoomed image or pinch back out.
4. **Given** the immersive viewer is open on mobile and the photo is at 1x zoom, **When** the user swipes down, **Then** the viewer dismisses with a smooth drag-away animation and the user returns to the map or feed.
5. **Given** the immersive viewer is open on mobile, **When** the user taps the screen once (not on a control), **Then** the UI controls (close button, info panel) toggle visibility.

---

### User Story 2 - Click Photo on Desktop for Google Photos-style View (Priority: P1)

A desktop user clicks a photo on the map or in the trip feed. The photo opens in a large, centered overlay viewer inspired by Google Photos — dark translucent backdrop, photo filling the available space, clear navigation arrows on hover, and visible close button. The user can click arrows or use keyboard left/right to navigate, scroll-wheel to zoom, and press Escape or click the backdrop to close.

**Why this priority**: Desktop users need an equally polished experience. The current viewer has long load times and lacks an immersive feel, making the app feel unfinished.

**Independent Test**: Can be fully tested by clicking any photo on desktop and verifying the viewer opens quickly, navigation arrows work, keyboard shortcuts respond, scroll-zoom works, and the viewer closes cleanly.

**Acceptance Scenarios**:

1. **Given** a user is viewing the map on desktop, **When** they click a photo marker or trip feed thumbnail, **Then** the photo expands from its thumbnail position into a large centered viewer overlay with a dark backdrop, completing the transition within 200ms.
2. **Given** the desktop viewer is open, **When** the user hovers on the left or right edge, **Then** navigation arrows appear and clicking them transitions to the adjacent photo.
3. **Given** the desktop viewer is open, **When** the user presses the left/right arrow keys, **Then** the viewer navigates to the previous/next photo.
4. **Given** the desktop viewer is open, **When** the user presses Escape or clicks the dark backdrop area, **Then** the viewer closes and the user returns to the map or feed.
5. **Given** the desktop viewer is open, **When** the user scrolls the mouse wheel over the photo, **Then** the photo zooms in/out centered on the cursor position without any page scrolling.

---

### User Story 3 - Fast Progressive Image Loading (Priority: P2)

When a user opens the photo viewer (mobile or desktop), they see a low-resolution thumbnail instantly while the full-resolution image loads in the background. The transition from thumbnail to full-resolution is seamless (smooth fade, no layout shift). Adjacent photos are preloaded so that swiping/clicking to the next photo shows it immediately.

**Why this priority**: Long load times were called out as a bug. Progressive loading provides perceived instant performance even on slow connections.

**Independent Test**: Can be tested by opening a photo on a throttled connection and verifying the thumbnail appears instantly, the full image loads without layout shift, and adjacent photos are ready when navigated to.

**Acceptance Scenarios**:

1. **Given** a user taps/clicks a photo, **When** the viewer opens, **Then** a thumbnail or low-resolution version of the photo is displayed immediately (within 100ms) while the full-resolution image loads.
2. **Given** the thumbnail is showing, **When** the full-resolution image finishes loading, **Then** it replaces the thumbnail with a smooth crossfade (no pop-in, no layout shift, no size change).
3. **Given** the user is viewing photo N, **When** the full-resolution image for photo N has loaded, **Then** the system begins preloading full-resolution images for photos N-1 and N+1.

---

### User Story 4 - Video Playback in Viewer (Priority: P2)

When a user opens a video from the map or trip feed, the viewer displays it with proper aspect ratio, native playback controls, and no distorted preview image. Videos should show a clean poster frame (not a distorted preload artifact) before playback begins.

**Why this priority**: Distorted preloading images for videos is a reported bug. Videos are part of the travel content and need to display correctly.

**Independent Test**: Can be tested by opening a video in the viewer and verifying it shows a clean poster/thumbnail, plays with correct aspect ratio, and has functional playback controls.

**Acceptance Scenarios**:

1. **Given** a user taps/clicks a video entry, **When** the viewer opens, **Then** the video displays with its correct aspect ratio (no stretching or distortion).
2. **Given** the viewer is showing a video, **When** the video has not yet started playing, **Then** a clean thumbnail is displayed (matching the video's actual aspect ratio) with a visible play indicator.
3. **Given** the viewer is showing a .mov video, **When** the user taps play, **Then** the video plays using native video controls appropriate to the device.
4. **Given** the user is navigating between photos and encounters a video, **When** the video entry loads, **Then** no distorted or stretched preview image is shown at any point during the transition.

---

### User Story 5 - Preserve Existing Functionality (Priority: P3)

All existing viewer features — favoriting photos, viewing captions/dates/tags, and navigating from either the map or the trip feed — continue to work in the new viewer without regression.

**Why this priority**: The new viewer must not break existing features that users rely on. This is a guard rail, not new functionality.

**Independent Test**: Can be tested by verifying each existing feature (favorite toggling, caption display, tag display, opening from map markers, opening from trip feed) works correctly in the new viewer.

**Acceptance Scenarios**:

1. **Given** the viewer is open, **When** the user taps/clicks the favorite button, **Then** the photo's favorite status toggles and persists as it did before.
2. **Given** the viewer is open on a photo with a caption, date, and tags, **When** the user views the info area, **Then** the caption, date, and tags are displayed correctly.
3. **Given** a user is in the trip feed, **When** they tap/click a thumbnail, **Then** the viewer opens to that specific photo and navigation traverses that day's photos.
4. **Given** a user is viewing the map, **When** they tap/click a photo marker, **Then** the viewer opens to that photo and navigation traverses the currently visible/filtered photos on the map.

---

### Edge Cases

- What happens when the user double-taps while already at 2x zoom? The viewer MUST reset to 1x zoom with an animated transition — never entering a stuck state.
- What happens when the user pinch-zooms to the maximum level and continues pinching? The zoom should cap at the maximum and not trigger any browser-level zoom or get stuck.
- What happens when the user is zoomed in and tries to swipe to the next photo? Swipe-to-navigate should only activate when the photo is at 1x zoom; at zoomed levels, swiping should pan the image instead.
- What happens when a photo fails to load (broken URL or network error)? The viewer should display a clear error placeholder and still allow navigation to other photos.
- What happens when the user rapidly swipes through many photos? The viewer should handle rapid navigation gracefully, canceling in-flight image loads for skipped photos and not queuing up stale transitions.
- What happens when the user clicks the next arrow rapidly on desktop and controls auto-hide mid-click? A 300ms click guard after each transition prevents backdrop clicks from closing the viewer. Controls stay visible while the user is actively navigating.
- What happens when there is only one photo available? Navigation arrows/swipe gestures should be hidden or disabled.
- What happens when a video's source URL is invalid? A clear error message should be shown instead of a broken player.
- What happens when the user rotates their mobile device while the viewer is open? The viewer should adapt to the new orientation, re-centering the photo and resetting zoom to fit the new viewport.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST open the photo viewer with an expand-from-thumbnail animation — the photo animates from its on-screen position into the full viewer — completing within 300ms on mobile and 200ms on desktop.
- **FR-002**: System MUST display photos in a full-screen (mobile) or large centered overlay (desktop) viewer with a dark background, replacing the current lightbox. Dismissing should reverse the expand animation (shrink back to source thumbnail).
- **FR-003**: System MUST support swipe-left and swipe-right gestures on mobile to navigate between photos with a smooth sliding animation.
- **FR-004**: System MUST support pinch-to-zoom on mobile with correct zoom behavior — zoom in, pan while zoomed, zoom out — and MUST NOT allow the zoom state to become stuck or unresponsive.
- **FR-005**: System MUST reset pinch-zoom state cleanly when the user lifts all fingers, preventing any stuck-zoom condition.
- **FR-005a**: System MUST support double-tap-to-zoom on mobile that toggles between 1x and 2x zoom at the tap point with an animated transition. A second double-tap MUST always reset to 1x. The zoom state MUST NOT become stuck or persistent after double-tap.
- **FR-006**: System MUST support swipe-down-to-dismiss on mobile when the photo is at 1x zoom, with a drag-away animation.
- **FR-007**: System MUST distinguish between zoom gestures, navigation swipes, and dismiss swipes based on the current zoom level (zoomed = pan/zoom only; 1x = swipe navigates or dismisses).
- **FR-008**: System MUST show navigation arrows on desktop that appear on hover near the left/right edges. All interactive buttons (close, nav arrows, favorite) MUST use a consistent circular style: 44px round semi-transparent dark background (rgba black) with a white icon, no stretched or oval shapes.
- **FR-009**: System MUST support keyboard navigation (left/right arrows for photos, Escape to close).
- **FR-010**: System MUST support scroll-wheel zoom on desktop, centered on the cursor position, without scrolling the underlying page.
- **FR-011**: System MUST progressively load images — show thumbnail instantly, then crossfade to full-resolution when loaded — with no layout shift or size changes.
- **FR-012**: System MUST preload the full-resolution images for the immediately adjacent photos (N-1 and N+1) after the current photo has loaded.
- **FR-013**: System MUST display self-hosted .mov videos with their correct native aspect ratio at all times (thumbnail, poster, and playback). No embedded/iframe video support is required.
- **FR-014**: System MUST show a properly-sized, undistorted thumbnail for video entries in the viewer before playback begins, using native video controls.
- **FR-015**: System MUST NOT attempt to preload full video files for adjacent entries; only preload video thumbnails.
- **FR-016**: System MUST toggle UI controls (close button, info panel, navigation arrows) on a single tap (mobile) or show on mouse movement / hide after inactivity (desktop). Auto-hide delay MUST be 4 seconds on both mobile and desktop. Controls MUST reappear instantly on any interaction (tap, mouse move, keyboard). Any navigation action (arrow click, keyboard nav, swipe) MUST reset the auto-hide timer so controls remain visible during active browsing.
- **FR-016a**: System MUST ignore backdrop clicks for 300ms after a photo transition completes, preventing accidental viewer dismissal during rapid navigation.
- **FR-017**: System MUST preserve existing functionality: favorite toggling, caption display, date display, tag display, and opening from both map markers and trip feed thumbnails.
- **FR-021**: System MUST use context-aware navigation sets: when opened from the trip feed, the viewer navigates through that day's photos; when opened from the map, the viewer navigates through the currently visible/filtered photos.
- **FR-018**: System MUST cancel in-flight image loads when the user navigates away from a photo before it finishes loading.
- **FR-019**: System MUST display an error placeholder for photos or videos that fail to load, while still allowing navigation to other entries.
- **FR-020**: System MUST prevent background page scrolling and map interaction while the viewer is open.

### Key Entities

- **Photo Entry**: A single photo or video from the travel collection, identified by its index in the filtered photo list. Has attributes: thumbnail URL, full-resolution URL, type (photo or video), caption, date, tags, favorite status, location.
- **Viewer State**: The current state of the photo viewer including: open/closed, current photo index, zoom level, pan position, UI visibility, loading status of current and adjacent images.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Photo viewer opens and displays a visible image (thumbnail or full) within 300ms of user interaction on mobile and 200ms on desktop.
- **SC-002**: Pinch-to-zoom on mobile never results in a stuck or unresponsive state — 100% of pinch interactions resolve correctly when fingers are lifted.
- **SC-003**: Navigating to the next/previous photo (swipe or arrow) shows the adjacent image within 200ms when it has been preloaded.
- **SC-004**: Videos in the viewer never display a distorted or incorrectly-sized preview image at any point.
- **SC-005**: All existing features (favorites, captions, tags, opening from map/feed) continue to function without regression.
- **SC-006**: Users can complete a full photo browsing session (open viewer, navigate 5+ photos, zoom in/out, dismiss) without encountering any stuck states or unexpected behavior.

## Clarifications

### Session 2026-03-02

- Q: How should embedded (iframe) vs self-hosted videos be handled? → A: All videos are self-hosted .mov files served via Firebase/Google Drive. No embedded iframe videos exist. The viewer only needs to handle native video playback.
- Q: What opening transition style should the viewer use? → A: Expand-from-thumbnail — the photo animates from its position on the map/feed into the full-screen viewer, matching iPhone Photos and Google Photos behavior.
- Q: What photo collection does the viewer navigate through? → A: Context-aware navigation. From the trip feed, the viewer navigates that day's photos. From the map, the viewer navigates the currently visible/filtered photos.
- Q: How should double-tap zoom behave on mobile? → A: Double-tap toggles between 1x and 2x zoom at the tap point with an animated transition, matching iPhone Photos behavior. A second double-tap always resets to 1x.
- Q: How should the viewer protect against accidental backdrop clicks during rapid navigation? → A: Reset the auto-hide timer on each navigation action, and add a 300ms backdrop click guard after transitions during which backdrop clicks are ignored.
- Q: What visual style should the close and navigation buttons use? → A: Minimal circular semi-transparent dark buttons (rgba black background) with white icons (× for close, ‹/› for nav), consistent 44px touch targets, Google Photos style. No stretched/oval shapes.
- Q: What auto-hide delay should controls use? → A: 4 seconds on both mobile and desktop. Controls reappear instantly on any interaction.

## Assumptions

- The existing thumbnail URLs are already available in the photo manifest and can be used for instant display; no new thumbnail generation is needed.
- The current photo data model (manifest.json) provides all required fields (thumbnail, web_url, type, caption, date, tags, favorite status).
- The solution will replace the existing lightbox implementation entirely rather than augmenting it, as the current implementation has fundamental gesture-handling issues.
- Standard web touch/pointer event handling is sufficient for the gesture system — no third-party gesture libraries are required.
- Video poster frames can be derived from existing video thumbnails in the manifest.
