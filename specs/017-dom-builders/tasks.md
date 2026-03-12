# Tasks: Selective Renderer Cleanup (DOM Builders)

**Input**: Design documents from `/specs/017-dom-builders/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/dom-helpers-api.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create the DOM helper module and wire it into the app

- [x] T001 [P] Create `js/dom-helpers.js` — ES5-compatible IIFE exposing `window.domHelpers` with `el(tag, attrs, ...children)` and `text(str)` functions per contract in `specs/017-dom-builders/contracts/dom-helpers-api.md`. The `el` function must handle: `className` → element property, `style` object → merge into element.style, `dataset` object → merge into element.dataset, `on*` keys → assign as event handler properties, all other attrs → `setAttribute()`. String children auto-wrap as text nodes. Falsy children (null, undefined, false) are skipped.
- [x] T002 [P] Add `<script src="js/dom-helpers.js"></script>` to `index.html` after the `Leaflet.Photo.js` script tag (currently ~line 92) and before `ViewportSampler.js` (~line 94). This ensures dom-helpers loads before any consuming module.

**Checkpoint**: `window.domHelpers.el` and `window.domHelpers.text` are accessible in the browser console after page load.

---

## Phase 2: User Story 1 - Safe Photo Popup Rendering (Priority: P1) 🎯 MVP

**Goal**: Replace the string-based `buildPopupHTML()` with a DOM-based `createPopupElement()` that returns an HTMLElement instead of an HTML string. Captions and tags are inserted via text nodes.

**Independent Test**: Open the app in a browser. The function is currently dead code (photo viewer replaced popups), so verify no runtime errors on load. If testing directly, call `createPopupElement(photo)` in the console with a mock photo object and inspect the returned DOM node.

**Note**: Research (R2) confirmed `buildPopupHTML` is defined but never called. Refactoring it ensures the pattern is safe if future code re-enables popups.

### Implementation for User Story 1

- [x] T003 [US1] Refactor `buildPopupHTML()` → `createPopupElement()` in `js/app.js` (lines 80–112). Replace string concatenation with `domHelpers.el()` and `domHelpers.text()` calls. The function must return an HTMLElement instead of a string. Use `var el = domHelpers.el, text = domHelpers.text;` at the top of the IIFE for convenience. Specific mappings: video iframe → `el('iframe', {className: 'popup-video-iframe', src: photo.web_url, allow: 'autoplay; encrypted-media', allowfullscreen: true})`, image → `el('img', {src: photo.thumbnail, alt: caption || 'Photo', onerror: [error handler function]})`, caption → `el('p', {className: 'popup-caption'}, text(caption))`, tags → `el('div', {className: 'popup-tags'}, ...tagsArray)` where each tag is `el('span', {className: 'popup-tag'}, text(tagText))`, date → `el('p', {className: 'popup-date'}, text(photo.date))`, Google Photos link → `el('a', {href: url, target: '_blank', rel: 'noopener noreferrer', className: 'photo-link'}, text('View on Google Photos'))`. Preserve all conditional rendering (only show caption if present, only show tags if non-empty, etc.).

**Checkpoint**: Page loads without errors. `createPopupElement` exists and returns a DOM node.

---

## Phase 3: User Story 2 - Safe Feed Entry Rendering (Priority: P2)

**Goal**: Replace the string concatenation + `innerHTML` pattern in `buildFeed()` with DOM construction using a DocumentFragment for single-reflow insertion.

**Independent Test**: Open the feed panel and verify all entries render with correct dates, city labels, segment colors, thumbnail images (with load animation), "+N more" indicators, and empty narrative slots. Compare visually to the previous version.

### Implementation for User Story 2

- [x] T004 [US2] Refactor `buildFeed()` in `js/app.js` (lines 407–450). Replace the HTML string builder with DOM construction. Build each feed entry as a DOM tree: outer `div.feed-entry` with `dataset.date` and `style.setProperty('--entry-color', color)`, inner `div.feed-entry-header` containing `span.feed-entry-date` and `span.feed-entry-city` (with inline color style), `div.feed-narrative-slot` with `dataset.date`, `div.feed-thumbnails` containing `img.feed-thumbnail` elements and optional `span.feed-more-indicator`. Replace inline `onload="this.classList.add('loaded')"` with `{onload: function() { this.classList.add('loaded'); }}`. Attach click listeners (`onFeedEntryClick`, `onFeedThumbnailClick`) directly during creation instead of post-hoc querySelectorAll wiring. Use a DocumentFragment to collect all entries, then `feedEntries.innerHTML = ''; feedEntries.appendChild(fragment)` for single reflow. Thumbnail data attributes (`data-photo-url`, `data-photo-lat`, `data-photo-lng`) must use the `dataset` property.

**Checkpoint**: Feed panel renders identically to before. Clicking entries flies to map location. Clicking thumbnails opens photo viewer.

---

## Phase 4: User Story 3 - Safe Narrative Slot Rendering (Priority: P3)

**Goal**: Replace `renderFeedNarratives()` innerHTML pattern with DOM construction. Remove the now-unnecessary `_escapeHtml()` helper.

**Independent Test**: If Firebase/cloud data is configured, verify narratives appear in feed slots. If not, verify editor "Add note..." prompts appear when authenticated. Verify no console errors.

### Implementation for User Story 3

- [x] T005 [US3] Refactor `renderFeedNarratives()` in `js/app.js` (lines 559–575). Replace `innerHTML = html` with DOM construction. For each slot: clear with `slot.textContent = ''`, then if narrative text exists append `el('p', {className: 'feed-narrative', dataset: isEditor ? {date: date} : {}}, text(narrativeText))`, else if editor append `el('span', {className: 'feed-add-note', dataset: {date: date}}, text('Add note...'))`. The `_wireNarrativeEditing()` call at the end must remain unchanged.
- [x] T006 [US3] Remove the `_escapeHtml()` function from `js/app.js` (lines 577–581). It is no longer needed because text nodes inherently escape HTML. Verify no other callers reference `_escapeHtml` in the file before removing.

**Checkpoint**: Narratives render in feed slots. Editor controls (click-to-edit, "Add note...") still work. No console errors.

---

## Phase 5: User Story 4 - Safe Annotation Popup Rendering (Priority: P4)

**Goal**: Replace the annotation popup string builder with DOM construction. This is the only *active* popup builder and currently has **no HTML escaping** — the highest real-world XSS risk.

**Independent Test**: Click an annotation marker (pushpin emoji) on the map and verify the popup displays title, date, and description text correctly.

### Implementation for User Story 4

- [x] T007 [US4] Refactor annotation popup builder in `js/app.js` (lines 308–312). Replace the `popupHTML` string concatenation with DOM construction: `var popup = el('div', {className: 'annotation-popup'}, ann.title ? el('strong', null, text(ann.title)) : null, ann.date ? el('br', null) : null, ann.date ? el('span', {className: 'annotation-date'}, text(ann.date)) : null, ann.text ? el('p', null, text(ann.text)) : null)`. Change `marker.bindPopup(popupHTML)` to `marker.bindPopup(popup)`. Leaflet 1.9.4 accepts DOM elements directly in `bindPopup()` (confirmed in research R1).

**Checkpoint**: Annotation popups render identically. Special characters in annotation data display as literal text.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Visual verification and cleanup across all refactored renderers

- [x] T008 [P] Take Playwright screenshots at desktop (1440px) and mobile (375px) widths showing: feed panel with entries, an annotation popup, and general map view. Verify visual output matches pre-refactor appearance. Serve locally via `python3 -m http.server 8000`.
- [x] T009 [P] Check browser console for any new runtime errors after all refactors. Navigate through all surfaces: open feed panel, scroll entries, click annotation markers, resize to mobile width. Confirm zero new errors or warnings.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **US1 (Phase 2)**: Depends on Phase 1 (needs dom-helpers.js loaded)
- **US2 (Phase 3)**: Depends on Phase 1 only (independent of US1)
- **US3 (Phase 4)**: Depends on Phase 3 (US2) since narrative slots are rendered into feed entries built by `buildFeed()`
- **US4 (Phase 5)**: Depends on Phase 1 only (independent of US1–US3)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Phase 1 → US1 (independent)
- **User Story 2 (P2)**: Phase 1 → US2 (independent)
- **User Story 3 (P3)**: Phase 1 → US2 → US3 (narrative slots live inside feed entries)
- **User Story 4 (P4)**: Phase 1 → US4 (independent)

### Within Each User Story

- All US tasks modify `js/app.js` at different line ranges — execute sequentially within each story
- T005 must complete before T006 (remove helper only after its last caller is refactored)

### Parallel Opportunities

- T001 and T002 can run in parallel (different files: js/dom-helpers.js vs index.html)
- US1, US2, and US4 can run in parallel after Phase 1 (independent code sections in app.js, non-overlapping line ranges)
- T008 and T009 can run in parallel (different verification methods)

---

## Parallel Example: Setup Phase

```text
# These two tasks touch different files and can run simultaneously:
Task T001: "Create js/dom-helpers.js"
Task T002: "Add script tag to index.html"
```

## Parallel Example: User Stories (after Phase 1)

```text
# These three stories touch non-overlapping sections of app.js:
Task T003 [US1]: "Refactor photo popup (lines 80-112)"
Task T004 [US2]: "Refactor feed builder (lines 407-450)"
Task T007 [US4]: "Refactor annotation popup (lines 308-312)"
# Then sequentially: T005-T006 [US3] after T004 [US2] completes
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001, T002)
2. Complete Phase 2: User Story 1 (T003)
3. **STOP and VALIDATE**: Page loads without errors, `createPopupElement` returns DOM node
4. This proves the dom-helpers module works end-to-end

### Incremental Delivery

1. Phase 1 → dom-helpers module ready
2. US1 → photo popup refactored (MVP proves helpers work)
3. US4 → annotation popup refactored (fixes only active XSS risk)
4. US2 → feed entries refactored (largest surface)
5. US3 → narrative slots refactored + _escapeHtml removed (depends on US2)
6. Polish → visual verification at both widths

### Recommended Execution Order (Single Developer)

For a single developer, the most efficient order is:
1. T001 + T002 (setup)
2. T003 (US1 — prove helpers work with simplest case)
3. T007 (US4 — fix the real XSS risk, small change)
4. T004 (US2 — largest refactor)
5. T005 + T006 (US3 — depends on US2)
6. T008 + T009 (polish)

---

## Notes

- All renderers are in `js/app.js` — coordinate line-range changes carefully
- ES5 only: no `const`, `let`, arrow functions, template literals, or `Array.from`
- Use `var el = domHelpers.el, text = domHelpers.text;` at the top of the app.js IIFE for concise usage
- Leaflet `bindPopup()` accepts DOM elements natively (research R1)
- `buildPopupHTML` is dead code (research R2) but still worth refactoring per spec
- The inline `onload` handler on feed thumbnails must become an event handler property
- Commit after each phase checkpoint for easy rollback
