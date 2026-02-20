# Tasks: Cloud Photo Backend

**Input**: Design documents from `specs/002-cloud-photo-backend/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story. US1 (thumbnails) is deliverable before any JS SDK work since it only needs a Python upload script. Auth (US4) is a prerequisite for US2 and US3.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Firebase project configuration files, Python dependencies, and gitignore rules

- [x] T001 Create firebase/ directory with firestore.rules and storage.rules (copy from specs/002-cloud-photo-backend/contracts/)
- [x] T002 [P] Add `firebase-admin` dependency to requirements.txt
- [x] T003 [P] Add `service-account-key.json` and `*.key.json` to .gitignore alongside existing credential exclusions

---

## Phase 2: User Story 1 - Cloud-Hosted Thumbnails (Priority: P1) MVP

**Goal**: Thumbnails load from Firebase Storage URLs instead of local static files. HD images continue via Google API. No JavaScript changes needed — only a Python upload script that rewrites the manifest.

**Independent Test**: Deploy the app without any local thumbnail files in thumbs/. All map markers should display thumbnails from Firebase Storage URLs. Lightbox HD images should still load from Google API.

### Implementation for User Story 1

- [x] T004 [US1] Create scripts/upload_thumbnails.py — use firebase-admin SDK to authenticate via service account key file; iterate all entries in data/manifest.json; for each entry, upload the thumbnail file from thumbs/{filename} to Firebase Storage at path `thumbs/{filename}`; construct the public URL using pattern `https://firebasestorage.googleapis.com/v0/b/{BUCKET}/o/thumbs%2F{FILENAME}?alt=media`; update the manifest entry's `thumbnail` field with the cloud URL; write updated data/manifest.json. Accept `--key`, `--bucket`, and `--manifest` CLI arguments. Support incremental mode: skip upload if thumbnail field already points to Firebase Storage (contains `firebasestorage.googleapis.com`). Log progress and summary counts.

**Checkpoint**: After running upload_thumbnails.py and deploying, the map should display all thumbnails from Firebase Storage URLs (verify in browser Network tab). HD images load from Google API as before. This is the MVP.

---

## Phase 3: Foundational JS (Firebase SDK + Core Modules)

**Purpose**: Vendor Firebase SDK, create initialization module, and scaffold cloud-data and auth modules. MUST complete before any user story requiring Firebase JS (US4, US2, US3).

**CRITICAL**: US1 does NOT depend on this phase and can be delivered before it.

- [x] T005 Download and vendor Firebase SDK v11.6.0 ES modules into js/ — download firebase-app.js, firebase-auth.js, firebase-firestore-lite.js from `https://www.gstatic.com/firebasejs/11.6.0/`; run sed to rewrite the hardcoded gstatic `firebase-app.js` import path in each sub-module to relative `./firebase-app.js`
- [x] T006 Create js/firebase-init.js — ES module that imports initializeApp from ./firebase-app.js, getAuth from ./firebase-auth.js, getFirestore from ./firebase-firestore-lite.js; initializes Firebase app with project config object (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId — values from Firebase Console); creates auth and db instances; reads Firestore document `config/app` to get authorizedEditors array; exports to `window.firebaseApp = { app, auth, db, authorizedEditors }`; dispatches `'firebase-ready'` CustomEvent on window when initialization completes; if Firebase config is missing or init fails, log warning and set `window.firebaseApp = null` (graceful degradation)
- [x] T007 [P] Create js/cloud-data.js — ES module that imports doc, getDoc, setDoc, updateDoc from ./firebase-firestore-lite.js; implements `getPhotoId(photo)` utility per data-model.md (`photo.url.split('/').pop().replace(/\.[^.]+$/, '')` — uses the stable `url` field which is never rewritten by the upload script, unlike `thumbnail` which becomes a Firebase Storage URL); declares stub functions: `loadPhotoEdits()`, `savePhotoTags(photoId, tags)`, `savePhotoCaption(photoId, caption)`, `loadFavorites(uid)`, `toggleFavorite(uid, photoId)`, `migrateFavorites(uid, localStorageFavs, manifestPhotos)`; exports to `window.cloudData`; stubs return empty defaults (implementations in US2/US3 phases)
- [x] T008 [P] Create scripts/init_firestore.py — use firebase-admin SDK to create or update Firestore document `config/app` with `authorizedEditors` string array; accept `--key` (service account key path) and `--editors` (comma-separated emails) CLI arguments; print confirmation
- [x] T009 Add `<script type="module" src="js/firebase-init.js"></script>`, `<script type="module" src="js/cloud-data.js"></script>` to index.html before the closing `</body>` tag; in existing inline script, add a `window.addEventListener('firebase-ready', ...)` listener that re-initializes any Firebase-dependent features; ensure app still works if firebase-init.js fails to load (graceful degradation for unauthenticated/no-Firebase scenarios)

**Checkpoint**: Firebase SDK loads without errors in browser console. `window.firebaseApp` is populated. `window.cloudData.getPhotoId()` works. Map continues to function normally.

---

## Phase 4: User Story 4 - Owner Authentication (Priority: P2)

**Goal**: Authorized editors sign in with Google. Unauthenticated visitors and non-editors see a read-only map with no edit controls. Auth state persists across page refreshes.

**Independent Test**: Click the sign-in button, complete Google sign-in. If your email is in `authorizedEditors`, the UI shows your avatar and enables edit controls. If not, no edit controls appear. Refresh the page — auth state persists. Sign out — edit controls disappear.

### Implementation for User Story 4

- [x] T010 [US4] Create js/auth.js — ES module that imports signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider from ./firebase-auth.js; on auth state change, check if user's email is in `window.firebaseApp.authorizedEditors`; expose `window.firebaseAuth = { signIn(), signOut(), currentUser, isEditor, onAuthChange(callback) }`; dispatch `'auth-state-changed'` CustomEvent on window with detail `{ user, isEditor }`
- [x] T011 [US4] Add sign-in/sign-out UI to index.html — add a sign-in button in the control panel (`.control-panel` area), positioned prominently but not interfering with existing controls; when signed in, replace with user avatar (small circle image from Google profile), display name, and a sign-out link; listen for `'auth-state-changed'` event to toggle between signed-in and signed-out states
- [x] T012 [P] [US4] Style auth UI elements in css/map.css — sign-in button: dark glass backdrop-filter style matching existing panel controls, white text, subtle border; avatar: 28px circle with border; sign-out link: subtle text link; smooth opacity/transform transitions for state changes
- [x] T013 [US4] Add `<script type="module" src="js/auth.js"></script>` to index.html after firebase-init.js; ensure auth module loads after Firebase is ready
- [x] T014 [US4] Gate edit controls behind editor check in index.html — wrap the existing favorite star toggle (in popup and lightbox) behind `window.firebaseAuth?.isEditor` check so it only appears for authorized editors; for unauthenticated visitors, hide the star toggle entirely (matching spec: "no star toggle, no tag editor, no caption editor" for non-editors)

**Checkpoint**: Sign-in/sign-out works. Editor controls visible only for authorized users. Page refresh preserves auth. Non-editors and visitors see read-only map identical to pre-backend behavior.

---

## Phase 5: User Story 2 - Persistent Favorites Across Devices (Priority: P2)

**Goal**: Favorites persist to Firestore instead of localStorage. Synced across devices on sign-in. Existing localStorage favorites migrated on first sign-in.

**Independent Test**: Sign in on device A, favorite 3 photos. Open on device B, sign in — same 3 photos are favorited. Remove a favorite on device B — it's gone on device A after refresh.

### Implementation for User Story 2

- [x] T015 [US2] Implement `loadFavorites(uid)` and `toggleFavorite(uid, photoId)` in js/cloud-data.js — `loadFavorites` reads `favorites/{uid}` document from Firestore, returns photo ID array (empty array if doc doesn't exist); `toggleFavorite` reads current array, adds or removes photoId, writes back with `setDoc` using merge; update `updatedAt` timestamp; cache loaded favorites in module-level variable to avoid repeated reads
- [x] T016 [US2] Implement `migrateFavorites(uid, manifestPhotos)` in js/cloud-data.js — read localStorage key `'photomap_favorites'` (JSON object where keys are `"url|lat|lng"` format, e.g. `"photos/20260129_091401.jpg|51.502797|-0.059158"`); for each key, split on `'|'`, take first element (the `url` path like `photos/filename.jpg`), extract filename stem by splitting on `'/'`, taking the last segment, and removing the extension — this matches the `getPhotoId()` logic; validate each extracted photoId exists in manifestPhotos array (discard orphans per edge case spec); write array to `favorites/{uid}` in Firestore; back up original localStorage data to `'photomap_favorites_migrated'`; delete original `'photomap_favorites'` key
- [x] T017 [US2] Refactor favorites system in index.html — replace the existing localStorage-based `getFavorites()`, `setFavorites()`, `isFavorite()`, `toggleFavorite()` functions: when user is a signed-in editor, delegate to `window.cloudData` equivalents (loadFavorites/toggleFavorite); on page load for signed-in editors, call `cloudData.loadFavorites(uid)` then refresh map display; on first sign-in, if `'photomap_favorites'` exists in localStorage, trigger `cloudData.migrateFavorites()`; when user is not signed in, continue using localStorage as read-only fallback so existing favorites still display for the owner before they sign in
- [x] T018 [US2] Implement offline write queue for favorites in js/cloud-data.js — wrap Firestore write calls in try/catch; on network error, save the pending operation `{ type: 'toggleFavorite', uid, photoId, timestamp }` to localStorage key `'photomap_pending_writes'` (JSON array); on module initialization and on `window 'online'` event, check for pending writes and replay them to Firestore; on success, remove from pending queue; update local UI immediately regardless of write success (optimistic update)

**Checkpoint**: Favorites sync between devices via Firestore. Existing localStorage favorites are migrated on first sign-in. Offline favorites are queued and synced on reconnect.

---

## Phase 6: User Story 3 - Cloud-Persisted Tags and Captions (Priority: P3)

**Goal**: Editors can add/edit tags and captions directly in the lightbox. Changes persist to Firestore and override manifest defaults (cloud-over-static precedence).

**Independent Test**: Sign in, open a photo in lightbox, add a tag "sunset". Close and reopen — tag persists. Edit the caption. Refresh the page — caption persists. Check on another device — both tag and caption are there.

### Implementation for User Story 3

- [x] T019 [US3] Implement `loadPhotoEdits()`, `savePhotoTags(photoId, tags)`, `savePhotoCaption(photoId, caption)` in js/cloud-data.js — `loadPhotoEdits` reads `photoEdits/all` document from Firestore, caches in module-level variable; provide `getEffectiveTags(photoId, manifestTags)` and `getEffectiveCaption(photoId, manifestCaption)` that return cloud value if present for that photoId, else return manifest default (cloud-over-static precedence per FR-010); `savePhotoTags` and `savePhotoCaption` use `updateDoc` with dot-notation field paths (`${photoId}.tags`, `${photoId}.caption`) so updates to one photo don't overwrite others; also set `${photoId}.updatedAt` and `${photoId}.updatedBy`
- [x] T020 [US3] Integrate cloud-over-static merge into index.html photo display — when building popup content and lightbox content for a photo, call `cloudData.getEffectiveTags(photoId, photo.tags)` and `cloudData.getEffectiveCaption(photoId, photo.caption)` instead of reading directly from the manifest object; derive photoId using `cloudData.getPhotoId(photo)` (which uses `photo.url`); ensure this runs after `cloudData.loadPhotoEdits()` has completed (listen for `'firebase-ready'` or chain on the Firestore read promise)
- [x] T021 [US3] Add tag editor UI to lightbox in index.html — when editor is signed in and lightbox is open, show existing tags as styled chips/badges with an "x" remove button on each; add an input field with placeholder "Add tag..." that creates a new tag on Enter; on add/remove, call `cloudData.savePhotoTags(photoId, updatedTagsArray)`; update the displayed tags immediately (optimistic UI); hide tag editor entirely for non-editors
- [x] T022 [US3] Add caption editor UI to lightbox in index.html — when editor is signed in and lightbox is open, show the caption as click-to-edit text; on click, replace with a textarea pre-filled with the current caption; on blur or Enter, save via `cloudData.savePhotoCaption(photoId, newCaption)` and revert to display mode; hide edit affordance for non-editors (they see caption as plain text)
- [x] T023 [P] [US3] Style tag editor and caption editor in css/map.css — tag chips: small rounded rectangles with dark glass background, white text, "x" button; add-tag input: subtle underline style matching glass aesthetic; caption edit textarea: transparent background with subtle border, matching existing lightbox text style; smooth transitions for edit mode toggle

**Checkpoint**: Tags and captions editable in lightbox for signed-in editors. Cloud edits override manifest defaults. Changes persist across page refreshes and devices.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Error handling, graceful degradation, and final integration quality

- [x] T024 [P] Add thumbnail error handling in index.html — attach `onerror` handler to thumbnail `<img>` elements; when a thumbnail fails to load from Firebase Storage, replace src with a subtle placeholder image (e.g., a gray rectangle with a camera icon); ensure HD images (Google API) in lightbox still load independently of thumbnail failures
- [x] T025 [P] Extend offline write queue in js/cloud-data.js to cover photo edits (tags, captions) in addition to favorites — same pattern: on Firestore write failure, queue `{ type: 'savePhotoTags'|'savePhotoCaption', photoId, value, timestamp }` to `'photomap_pending_writes'` in localStorage; replay on reconnect
- [x] T026 [P] Add pending-writes status indicator in index.html — when `'photomap_pending_writes'` has queued items, show a subtle indicator (e.g., small cloud-with-arrow icon near the auth area) with tooltip "Changes pending sync"; clear indicator when queue is empty after successful sync
- [x] T027 Validate quickstart.md steps end-to-end — walk through each step in specs/002-cloud-photo-backend/quickstart.md; verify the documented setup flow produces a working deployment; verify thumbnail render performance is comparable to local files (SC-002: within 2 seconds); note any discrepancies or missing steps

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup) ─────────→ Phase 2 (US1: Thumbnails) ─── MVP DELIVERABLE
      │
      └──→ Phase 3 (Foundational JS) ──→ Phase 4 (US4: Auth)
                                              │
                                    ┌─────────┴──────────┐
                                    ▼                     ▼
                             Phase 5 (US2:          Phase 6 (US3:
                              Favorites)          Tags/Captions)
                                    │                     │
                                    └─────────┬───────────┘
                                              ▼
                                     Phase 7 (Polish)
```

### User Story Dependencies

- **US1 (P1 - Thumbnails)**: Depends only on Phase 1 (Setup). No JS SDK needed. **Can be delivered as MVP before any other story.**
- **US4 (P2 - Auth)**: Depends on Phase 3 (Foundational JS). No dependency on US1.
- **US2 (P2 - Favorites)**: Depends on US4 (Auth). Builds on auth state and editor checks.
- **US3 (P3 - Tags/Captions)**: Depends on US4 (Auth). Can run in parallel with US2.

### Parallel Opportunities

- **Phase 1**: T002 and T003 can run in parallel
- **Phase 2 + Phase 3**: US1 (thumbnails) and Foundational JS can run in parallel since US1 is Python-only
- **Phase 3**: T007 and T008 can run in parallel (different files)
- **Phase 4**: T012 can run in parallel with other US4 tasks (CSS only)
- **Phase 5 + Phase 6**: US2 and US3 can run in parallel after US4 is complete (different Firestore documents, different UI components)
- **Phase 7**: T024, T025, T026 can all run in parallel

---

## Parallel Example: After Phase 4 (Auth) Completes

```
# These can run simultaneously:
Agent A: Phase 5 — US2 Favorites (T015→T016→T017→T018)
Agent B: Phase 6 — US3 Tags/Captions (T019→T020→T021→T022, T023 parallel)
```

---

## Implementation Strategy

### MVP First (US1 Only — No JS Changes!)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: US1 Thumbnails (T004)
3. **STOP and VALIDATE**: Run upload script, deploy without local thumbs/, verify all thumbnails load from Firebase Storage
4. This is a fully functional MVP with zero frontend code changes

### Incremental Delivery

1. Phase 1 + Phase 2 → **MVP: Cloud thumbnails** (deploy/demo)
2. Phase 3 → Foundation for interactive features
3. Phase 4 → **Auth: Sign-in/sign-out working** (deploy/demo)
4. Phase 5 → **Persistent favorites across devices** (deploy/demo)
5. Phase 6 → **In-app tag and caption editing** (deploy/demo)
6. Phase 7 → **Polish: error handling, offline indicator** (final deploy)

Each increment adds value without breaking previous functionality.

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- US1 is uniquely simple: Python script only, no JS changes, deliverable immediately
- **Photo ID derivation uses `photo.url` (not `photo.thumbnail`)** — the `url` field stays as a stable local path (`photos/filename.jpg`) even after thumbnail URLs are rewritten to Firebase Storage URLs by upload_thumbnails.py
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- All Firestore operations use the 3-document model from data-model.md (config/app, photoEdits/all, favorites/{uid})
