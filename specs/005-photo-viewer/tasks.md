# Tasks: Immersive Photo Viewer

**Input**: Design documents from `/specs/005-photo-viewer/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: Not requested — no test tasks generated.

**Organization**: Tasks grouped by user story for independent implementation and testing. Phases 1–8 (T001–T039) are the completed initial implementation. Phases 9–12 (T040–T046) are bug fixes from the post-merge clarification session.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to
- Include exact file paths in descriptions

---

## Phase 1: Setup ✅

**Purpose**: Create new module files with skeleton structure

- [x] T001 Create `js/photo-viewer.js` with module skeleton — viewer state object (from data-model.md Viewer State), `window.photoViewer` API stubs (`open`, `close`, `isOpen`), and custom event dispatch helpers (`photoviewer:open`, `photoviewer:close`, `photoviewer:navigate`, `photoviewer:favorite`)
- [x] T002 [P] Create `css/photo-viewer.css` with base overlay styles — fixed fullscreen overlay with dark background (`rgba(0,0,0,0.95)`), flexbox centering for media container, responsive breakpoints for mobile vs desktop layout, `z-index: 2000`, and `will-change: transform` on animated elements

---

## Phase 2: Foundational (Blocking Prerequisites) ✅

**Purpose**: Core viewer lifecycle that ALL user stories depend on

- [x] T003 Implement viewer DOM construction in `js/photo-viewer.js` — create overlay element once on first `open()` call, containing: `.pv-overlay` (backdrop), `.pv-media` (image/video container), `.pv-close` (close button), `.pv-nav-prev` / `.pv-nav-next` (navigation arrows), `.pv-info` (info panel shell for caption/date/tags/link/favorite). Append to `document.body`.
- [x] T004 Implement FLIP expand-from-thumbnail open animation in `js/photo-viewer.js` — on `open(photos, startIndex, sourceElement)`: capture `sourceElement.getBoundingClientRect()`, position the viewer image at source rect using CSS `transform: translate() scale()`, show overlay with `opacity: 0`, then transition to final centered position and `opacity: 1` using CSS transitions (~250ms). Dispatch `photoviewer:open` event.
- [x] T005 Implement close animation and cleanup in `js/photo-viewer.js` — on `close()`: if source element is still in DOM, reverse FLIP animation (shrink back to source rect), otherwise fade out. On transition end: hide overlay, reset zoom/pan state, cancel in-flight preloads, re-enable body scroll, unbind keyboard listeners. Dispatch `photoviewer:close` event.
- [x] T006 Implement `showPhoto(index)` in `js/photo-viewer.js` — update `currentIndex`, set `<img>` src to `photo.thumbnail` for immediate display, update info panel content (caption, date, tags, favorite state, Google Photos link), show/hide nav arrows based on index bounds, reset zoom to 1x. Dispatch `photoviewer:navigate` event.
- [x] T007 Implement background scroll lock in `js/photo-viewer.js` — on open: set `document.body.style.overflow = 'hidden'` and add `pointer-events: none` to `#map` element. On close: restore original values.
- [x] T008 Wire `index.html` entry points — update `onPhotoClick(e)` to call `window.photoViewer.open(filteredPhotos, index, srcEl)`. Update feed thumbnail click to call `window.photoViewer.open(dayPhotos, dayIndex, evt.target)`. Add `<script>` and `<link>` tags for the new module.

**Checkpoint**: Viewer opens from map/feed with expand animation, shows thumbnail, navigates with arrow buttons, closes with shrink animation. ✅

---

## Phase 3: User Story 1 - Tap Photo on Mobile for Immersive View (Priority: P1) ✅ MVP

**Goal**: Full mobile gesture support — pinch-to-zoom (no stuck state), swipe navigation, swipe-down dismiss, tap to toggle controls

**Independent Test**: Tap any photo on a mobile device. Verify: expand animation, swipe left/right navigates, pinch zoom works without getting stuck, swipe down dismisses, single tap toggles UI.

### Implementation for User Story 1

- [x] T009 [US1] Implement gesture FSM core in `js/photo-viewer.js` — create gesture state object with `mode` (IDLE/PINCHING/PANNING/SWIPING_NAV/SWIPING_DISMISS), `pointers` Map for tracking active pointers by ID. Bind `pointerdown`, `pointermove`, `pointerup`, `pointercancel` on `.pv-wrap`. On `pointerdown`: add to pointers map, call `setPointerCapture`. Use 10px movement threshold before committing to a gesture mode.
- [x] T010 [US1] Implement pinch-to-zoom in `js/photo-viewer.js` — in gesture FSM: when 2 pointers active and mode is IDLE, transition to PINCHING. Record initial distance and current scale. On `pointermove`: calculate new distance, compute scale ratio, clamp to 1.0–5.0, call `zoomAt(newScale, midpointX, midpointY)`. On all pointers up: if scale < 1.2 snap back to 1.0 with animation; transition to IDLE.
- [x] T011 [US1] Implement swipe-to-navigate in `js/photo-viewer.js` — when 1 pointer, zoom is 1x, and horizontal movement angle < 30°, transition to SWIPING_NAV. Apply horizontal translate following finger. On pointer up: if distance > 80px or velocity > 0.3px/ms, commit navigation with slide transition. Otherwise snap back.
- [x] T012 [US1] Implement swipe-down-to-dismiss in `js/photo-viewer.js` — when 1 pointer, zoom is 1x, and downward vertical angle > 60°, transition to SWIPING_DISMISS. Apply vertical translate and scale reduction. Reduce backdrop opacity proportionally. On pointer up: if drag > 150px, call `close()`. Otherwise snap back.
- [x] T013 [US1] Implement single-finger pan when zoomed in `js/photo-viewer.js` — when 1 pointer and zoom > 1x, transition to PANNING. Track pointer delta, apply to translate values. On pointer up: transition to IDLE.
- [x] T014 [US1] Implement mobile UI controls toggle in `js/photo-viewer.js` — on single tap (< 200ms, < 10px movement, not on a control): toggle `.pv-controls-visible` class on overlay. Start 3-second auto-hide timer. Clear timer on any interaction.
- [x] T015 [US1] Add mobile-specific CSS in `css/photo-viewer.css` — fullscreen mode (`100vw`/`100dvh`), `touch-action: none` on media container, safe-area padding for notched devices, `.pv-controls-visible` show/hide transitions, large touch targets (min 44px).

**Checkpoint**: Complete mobile photo browsing — expand, swipe nav, pinch zoom (never stuck), swipe dismiss, tap controls. ✅

---

## Phase 4: User Story 2 - Click Photo on Desktop for Google Photos-style View (Priority: P1) ✅

**Goal**: Desktop interaction — hover nav arrows, keyboard shortcuts, scroll-wheel zoom, double-click zoom toggle, backdrop click close

**Independent Test**: Click any photo on desktop. Verify: expand animation, hover edges shows arrows, arrow keys navigate, scroll-wheel zooms at cursor, double-click toggles zoom, Escape closes, backdrop click closes.

### Implementation for User Story 2

- [x] T016 [P] [US2] Implement desktop navigation arrows in `js/photo-viewer.js` — show nav arrows on mouse hover within 80px of left/right viewport edges. Click handlers call `showPhoto(index ± 1)`. Style: semi-transparent background, `border-radius: 50%`, fade in/out.
- [x] T017 [P] [US2] Implement keyboard navigation in `js/photo-viewer.js` — on `open()`: add `keydown` listener to `document`. ArrowLeft → prev, ArrowRight → next, Escape → `close()`. On `close()`: remove listener.
- [x] T018 [US2] Implement scroll-wheel zoom in `js/photo-viewer.js` — add `wheel` event listener on `.pv-wrap` with `{ passive: false }`. Call `evt.preventDefault()`. Calculate zoom factor (1.15x per tick). Call `zoomAt(scale * factor, evt.clientX, evt.clientY)`.
- [x] T019 [US2] Implement double-click zoom toggle in `js/photo-viewer.js` — add `dblclick` listener on `.pv-wrap`. If scale > 1.05: animate reset to 1.0. Else: call `zoomAt(2.5, evt.clientX, evt.clientY)` with CSS transition.
- [x] T020 [US2] Implement mouse-drag pan when zoomed in `js/photo-viewer.js` — on `pointerdown` with scale > 1: track drag start. On `pointermove`: apply translate delta. Track `didDrag` flag to distinguish from click.
- [x] T021 [US2] Implement desktop UI auto-hide in `js/photo-viewer.js` — on `mousemove`: show controls, reset 2-second hide timer. On timer expiry: hide controls with CSS fade.
- [x] T022 [US2] Implement backdrop click to close in `js/photo-viewer.js` — on click on `.pv-overlay` (not children, not during drag): call `close()`. Check `didDrag` flag.
- [x] T023 [US2] Add desktop-specific CSS in `css/photo-viewer.css` — overlay centered layout, cursor states, nav arrow positioning and hover effects, `@media (hover: hover)` queries.

**Checkpoint**: Complete desktop photo browsing — arrows, keyboard, scroll zoom, double-click zoom, pan, backdrop close. ✅

---

## Phase 5: User Story 3 - Fast Progressive Image Loading (Priority: P2) ✅

**Goal**: Thumbnail shown instantly, full-res crossfades in, adjacent photos preloaded, stale loads canceled on navigation

**Independent Test**: Throttle network to Slow 3G. Open a photo — thumbnail appears instantly. Full-res fades in when loaded (no pop-in). Navigate to next — already loaded from preload.

### Implementation for User Story 3

- [x] T024 [US3] Implement progressive loading in `js/photo-viewer.js` — in `showPhoto()`: set `img.src = photo.thumbnail` immediately. Create pending `Image()` for `photo.web_url`. On load: swap src with CSS opacity crossfade (`.pv-loading` class, 0.3s transition). On error: show error placeholder.
- [x] T025 [US3] Implement adjacent preloading in `js/photo-viewer.js` — after current photo's full-res loads: create preload `Image()` for photos N-1 and N+1 (skip videos). Store references for cancellation.
- [x] T026 [US3] Implement in-flight cancellation in `js/photo-viewer.js` — in `showPhoto()` on every navigation: cancel pending loads by setting `src = ''` and nullifying references.
- [x] T027 [US3] Implement error placeholder in `js/photo-viewer.js` and `css/photo-viewer.css` — on `img` or `video` error: show `.pv-error` placeholder. Ensure nav arrows still work.

**Checkpoint**: Progressive loading works on throttled connections — instant thumbnails, smooth crossfade, preloading makes adjacent photos instant. ✅

---

## Phase 6: User Story 4 - Video Playback in Viewer (Priority: P2) ✅

**Goal**: Videos display with correct aspect ratio, clean poster thumbnail, native controls, no distortion at any point

**Independent Test**: Open a video from the map or feed. Verify: clean thumbnail poster (correct aspect ratio), native controls, no distortion during transition.

### Implementation for User Story 4

- [x] T028 [US4] Implement video rendering in `js/photo-viewer.js` — when `photo.type === 'video'`: create `<video>` element with `poster = photo.thumbnail`, `controls`, `playsinline`, `preload="none"`, `src = photo.web_url || photo.url`. Use `object-fit: contain`. Stop previously playing video before switching.
- [x] T029 [P] [US4] Add video-specific CSS in `css/photo-viewer.css` — `.pv-video { object-fit: contain; max-width: 100%; max-height: 100%; }`, poster sizing, native controls visibility.
- [x] T030 [US4] Implement video preloading rules in `js/photo-viewer.js` — skip full-file preload for videos in adjacent preloading. Only preload video thumbnail URLs as images.

**Checkpoint**: Videos play correctly — clean poster, correct aspect ratio, native controls, no distortion. ✅

---

## Phase 7: User Story 5 - Preserve Existing Functionality (Priority: P3) ✅

**Goal**: Favorites, captions, dates, tags, Google Photos link, caption/tag editing all work. Old lightbox code removed.

**Independent Test**: Toggle favorite (star updates), view caption/date/tags, click Google Photos link, edit caption as editor, add/remove tags. Open from both map and feed.

### Implementation for User Story 5

- [x] T031 [US5] Implement info panel content in `js/photo-viewer.js` — in `showPhoto()`: populate `.pv-info` with caption, date, tags as styled chips, Google Photos link.
- [x] T032 [US5] Implement favorite button in `js/photo-viewer.js` — add `.pv-fav` button. Display filled ★ when `photo._isFavorite`, hollow ☆ otherwise. On click: dispatch `photoviewer:favorite` event. Update optimistically.
- [x] T033 [US5] Wire favorite event listener in `index.html` — add `document.addEventListener('photoviewer:favorite', ...)` calling `toggleFavorite()`, `rebuildPhotoLayer()`, `buildPhotoIndex()`.
- [x] T034 [US5] Implement caption/tag editor integration in `js/photo-viewer.js` and `index.html` — if `firebaseAuth.isEditor`: show caption click-to-edit and tag editor UI. Dispatch `photoviewer:caption-edit` and `photoviewer:tag-edit` events. Wire listeners in `index.html` to `cloudData` save methods.
- [x] T035 [US5] Remove old lightbox JavaScript from `index.html` — delete old `openLightbox()`, `closeLightbox()`, `resetZoom()`, and related globals and keyboard listeners.
- [x] T036 [US5] Remove old `.lightbox-*` CSS rules from `css/map.css` — delete all lightbox styles (~lines 644–836).

**Checkpoint**: All existing features work in new viewer. Old lightbox code fully removed. No regressions. ✅

---

## Phase 8: Polish & Cross-Cutting Concerns ✅

**Purpose**: Edge cases, performance, and initial validation

- [x] T037 Handle edge cases in `js/photo-viewer.js` — max zoom cap (no browser-level zoom at 5x), rapid swipe handling (cancel in-flight transitions), single-photo mode (hide nav, disable swipe-nav), orientation change (re-center and reset zoom on `resize`).
- [x] T038 Add `<link>` to `css/photo-viewer.css` in `index.html` `<head>` and verify `<script>` for `js/photo-viewer.js` loads before the inline script block.
- [x] T039 Run initial quickstart.md validation — verify mobile tap/swipe/pinch/dismiss/controls, desktop click/arrows/keyboard/scroll-zoom/double-click/escape, progressive loading, and video playback.

---

## Phase 9: Bug Fix — Trivial One-Line & Simple Fixes

**Purpose**: Independent fixes with no inter-task dependencies — can all run in parallel

**Bugs addressed**: Auto-hide too aggressive (FR-016), Desktop zoom wrong position (FR-010)

- [x] T040 Fix auto-hide timing constants in `js/photo-viewer.js` (line 13) — change `MOBILE_HIDE_MS` from `3000` to `4000` and `DESKTOP_HIDE_MS` from `2000` to `4000` per clarified spec (FR-016: 4 seconds on both platforms)
- [x] T041 [P] Fix scroll-wheel zoom anchor point in `js/photo-viewer.js` `zoomAt()` function (~line 261) — replace `var rect = $wrap.getBoundingClientRect()` with `var rect = $media.getBoundingClientRect()` so the pivot origin is computed relative to the media element's actual center rather than the transformed wrapper bounds; this fixes desktop scroll-wheel zoom targeting the middle-right of the screen instead of the cursor position (FR-010)

**Checkpoint**: Auto-hide waits 4 seconds. Desktop scroll-wheel zoom centers on cursor. Verify: open viewer on desktop, move mouse to edge, scroll — zoom should center on cursor exactly.

---

## Phase 10: Bug Fix — Button Styling

**Purpose**: Restyle all interactive buttons as circular dark glass (FR-008)

**Bug addressed**: Close button and nav arrows display as ugly stretched ovals

- [x] T042 Restyle `.pv-close`, `.pv-nav`, and `.pv-fav` buttons in `css/photo-viewer.css` to circular dark glass style — apply `width: 44px; height: 44px; border-radius: 50%; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); padding: 0; display: flex; align-items: center; justify-content: center;` to all three button classes. Set `font-size: 24px` for close and nav icons (replacing `font-size: 36px` for close, `font-size: 32px` for nav, and removing asymmetric `padding: 16px 12px` from nav that caused oval shape). Set nav buttons to `width: 48px; height: 48px` (slightly larger for edge positioning). Add hover state `background: rgba(255,255,255,0.2)`. Keep mobile responsive overrides consistent with new dimensions.

**Checkpoint**: All buttons are perfect circles with dark semi-transparent backgrounds and white icons. No oval shapes. Verify on both mobile (real device) and desktop.

---

## Phase 11: Bug Fix — Navigation Click-Through Protection

**Purpose**: Prevent accidental viewer close during rapid photo navigation (FR-016a)

**Bug addressed**: Clicking through photos quickly — controls fade, next click hits backdrop and closes viewer

- [x] T043 Add `navGuardUntil` to viewer state in `js/photo-viewer.js` — in the state object `S` (~line 20), add `navGuardUntil: 0`. This timestamp records until when backdrop clicks should be ignored (300ms window after each navigation transition).
- [x] T044 Wire nav guard in backdrop click handler and all navigation triggers in `js/photo-viewer.js`:
  - In the `$ov` click handler (~line 104): add guard check — `if (Date.now() < S.navGuardUntil) return;` before calling `close()`
  - In `nav(dir)` function (~line 631): after calling `showPhoto(ni)`, add `showCtrl(); resetHide(); S.navGuardUntil = Date.now() + 300;`
  - In `commitSwipe(dir)` setTimeout callback (~line 414): after `showPhoto(ni)`, add `showCtrl(); resetHide(); S.navGuardUntil = Date.now() + 300;`
  - In `onKey(e)` handler (~line 623): after ArrowLeft/ArrowRight nav calls, add `showCtrl(); resetHide(); S.navGuardUntil = Date.now() + 300;`

**Checkpoint**: Click a nav arrow 5+ times rapidly — viewer never accidentally closes. Controls stay visible during active navigation. Backdrop click still closes when navigation is idle.

---

## Phase 12: Bug Fix — Double-Tap Zoom on iOS (FR-005a)

**Purpose**: Fix iPhone double-tap locking into a persistent zoom state

**Bug addressed**: Double-tap on iPhone triggers zoom but provides no reliable way back to 1x, leaving user stuck

- [x] T045 Implement reliable double-tap zoom detector in the pointer event FSM in `js/photo-viewer.js`:
  - Add double-tap tracking fields to gesture state `G` (~line 27): `lastTapTime: 0, lastTapX: 0, lastTapY: 0`
  - In `ptrUp()`, in the tap detection branch (~line 390, where single taps toggle controls): check if `Date.now() - G.lastTapTime < 300` AND `Math.abs(e.clientX - G.lastTapX) < 30` AND `Math.abs(e.clientY - G.lastTapY) < 30`
    - If **double-tap**: if `S.scale > 1.05` call `animResetZoom()`, else call `zoomAt(2, e.clientX, e.clientY)` with animated transition. Reset `G.lastTapTime = 0` to prevent triple-tap triggering another cycle.
    - If **first tap**: record `G.lastTapTime = Date.now(); G.lastTapX = e.clientX; G.lastTapY = e.clientY;` and proceed with single-tap toggle-controls action (no delay needed — let single-tap happen immediately; double-tap zoom overrides on second tap)
  - Keep the existing `dblclick` handler (~line 155) for desktop mouse but change its zoom target from 2.5x to 2x to stay consistent with the double-tap spec (FR-005a: toggles 1x ↔ 2x)

**Checkpoint**: On iPhone Safari: double-tap any photo at 1x → zooms to 2x at tap point. Double-tap again → resets to 1x. Rapid double-taps never enter a stuck state. On desktop: `dblclick` toggles 1x ↔ 2x.

---

## Phase 13: Bug Fix Validation

**Purpose**: Confirm all 5 bugs are resolved against the updated quickstart.md checklist

- [x] T046 Run bug fix validation in `specs/005-photo-viewer/quickstart.md` — verify every item in the "Bug fix" checklist entries: (1) double-tap on iPhone toggles zoom and never sticks, (2) rapid clicking through 5+ photos on desktop never closes the viewer, (3) all buttons are circular with dark backgrounds (no oval shapes), (4) controls stay visible for 4 seconds of inactivity, (5) desktop scroll-wheel zoom centers on cursor in both Firefox and Chrome. Document any remaining issues.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phases 1–8 (T001–T039)**: **Complete** ✅ — initial implementation shipped
- **Phase 9 (T040, T041)**: No dependencies on other bug-fix phases — can start immediately, run in parallel with each other
- **Phase 10 (T042)**: No dependencies on other bug-fix phases — can run immediately
- **Phase 11 (T043, T044)**: T043 must complete before T044 (T044 modifies the handler created/identified by T043)
- **Phase 12 (T045)**: No dependencies on other bug-fix phases — can run in parallel with Phases 9–11
- **Phase 13 (T046)**: Depends on Phases 9–12 all complete

### Bug Fix Task Dependencies

- T040, T041, T042, T045 → all independent, run in parallel
- T043 → T044 (sequential within Phase 11)
- T040 + T041 + T042 + T044 + T045 → T046

### Parallel Opportunities (bug fixes)

- T040 (timing constants) and T041 (zoom anchor fix): different functions in same file, no conflicts — run in parallel
- T042 (button CSS): different file entirely — run in parallel with T040, T041, T045
- T045 (double-tap): different function (`ptrUp`) from T041 (`zoomAt`) — run in parallel

---

## Parallel Example: Bug Fix Session

```
# These can all be done in a single pass (no ordering required):
T040 — change 2 constants (1 line)
T041 — fix zoomAt() rect reference (1 line)
T042 — restyle buttons in CSS

# Then:
T043 → T044 — add navGuardUntil state + wire to handlers

# Then (independent):
T045 — implement double-tap detector in ptrUp()

# Finally:
T046 — full validation checklist
```

---

## Implementation Strategy

### Bug Fix Scope (Current Work)

All 5 bugs are targeted at 2 files:
- `js/photo-viewer.js`: T040, T041, T043, T044, T045
- `css/photo-viewer.css`: T042

Recommended order for a single developer: T040 + T041 together (constants + zoom fix, quick wins) → T042 (CSS button restyling) → T043 + T044 (nav guard) → T045 (double-tap) → T046 (validation).

### Original Implementation (Complete)

1. ✅ Phase 1–2: Viewer module skeleton + DOM + lifecycle
2. ✅ Phase 3: Mobile gestures (pinch, swipe, dismiss, tap)
3. ✅ Phase 4: Desktop interactions (arrows, keyboard, scroll zoom)
4. ✅ Phase 5: Progressive loading + preloading
5. ✅ Phase 6: Video playback
6. ✅ Phase 7: Existing features (favorites, captions, tags) + old code removal
7. ✅ Phase 8: Edge cases + initial validation

---

## Notes

- [P] tasks = different files or non-conflicting functions, no shared state dependencies
- All file paths are relative to repository root `/home/bgural/photoMap/travel-photo-map/`
- **Total tasks**: 46 (T001–T046)
- **Completed**: T001–T039 (39 tasks, initial implementation)
- **Remaining**: T040–T046 (7 tasks, bug fixes)
- Commit after Phase 9+10 (quick wins), then again after Phase 11, then after Phase 12+13
