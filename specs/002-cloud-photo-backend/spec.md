# Feature Specification: Cloud Photo Backend

**Feature Branch**: `002-cloud-photo-backend`
**Created**: 2026-02-20
**Status**: Draft
**Input**: User description: "Host photos and user-generated data (favorites, tags) on Firebase cloud backend for the travel photo map. Firebase project: travel-photo-map-e0bf4 (Spark/free plan)."

## Clarifications

### Session 2026-02-20

- Q: Should Firebase Storage host both thumbnails and HD images, or only thumbnails (keeping HD on Google API)? → A: Thumbnails only on Firebase Storage; HD images continue to be served via the existing Google API (`lh3.googleusercontent.com`).
- Q: Should the photo manifest move to the cloud, or remain a static deployed file? → A: Keep manifest as a static deployed file. Cloud database stores only user data (favorites, tags, captions).
- Q: How should the system identify who has edit access? → A: Allow a list of authorized Google emails in a config file. Only those emails get edit access when signed in.
- Q: When cloud edits and the static manifest both have tags/captions for a photo, which wins? → A: Cloud edits always win. If a cloud edit exists for a photo's tags or caption, it overrides the static manifest value.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cloud-Hosted Thumbnails (Priority: P1)

A visitor opens the travel photo map in their browser. Photo thumbnails on the map load from cloud storage rather than from local static files. Full-resolution images continue to load via the existing Google API when the lightbox opens. The map experience feels the same as before — markers appear with thumbnails, clicking opens the lightbox with progressive HD loading — but the thumbnail files no longer need to be deployed alongside the app.

**Why this priority**: This is the foundation of the entire feature. Without cloud-hosted thumbnails, the app requires local thumbnail files to be deployed with every update. Moving thumbnails to cloud storage enables the map to be shared via a single URL with no static file dependencies. HD images already work via Google API and do not need to move.

**Independent Test**: Can be fully tested by deploying the app without any local thumbnail files and verifying all map markers display thumbnails from cloud storage URLs, while lightbox HD images continue loading from Google API.

**Acceptance Scenarios**:

1. **Given** thumbnails have been uploaded to cloud storage via the processing pipeline, **When** a user opens the map in a browser, **Then** photo thumbnails load from cloud storage URLs and display on the map within the current performance expectations.
2. **Given** a user clicks a photo marker on the map, **When** the lightbox opens, **Then** the thumbnail loads from cloud storage and the HD image loads from the existing Google API, maintaining the current progressive loading behavior.
3. **Given** the app is deployed without any local thumbnail files, **When** a user browses the map, **Then** all thumbnails render correctly from cloud URLs with no broken images, and all HD images load from Google API as before.

---

### User Story 2 - Persistent Favorites Across Devices (Priority: P2)

The map owner signs in and favorites several photos by clicking the star icon. Later, they open the same map on a different device (phone, tablet, or another computer), sign in, and see all the same favorites already starred. Favorites are no longer lost when clearing browser data or switching devices.

**Why this priority**: Favorites currently live in localStorage, which is device-specific and easily lost. Persisting favorites to a cloud database is the first user-interaction feature that demonstrates the value of a backend. It directly improves the owner's experience without requiring complex data models.

**Independent Test**: Can be tested by favoriting photos on one device, then opening the map on another device after signing in, and confirming all favorites appear.

**Acceptance Scenarios**:

1. **Given** a signed-in user favorites a photo, **When** they open the map on a different device and sign in, **Then** the favorited photo appears with the star icon.
2. **Given** a signed-in user removes a favorite, **When** they check on another device, **Then** the photo is no longer marked as a favorite.
3. **Given** an existing user has favorites in localStorage from before this feature, **When** they sign in for the first time, **Then** their existing localStorage favorites are migrated to the cloud and preserved.

---

### User Story 3 - Cloud-Persisted Tags and Captions (Priority: P3)

The map owner wants to add or edit tags and captions for their photos directly in the map interface, without manually editing a YAML file. After signing in, they click a photo, add a tag (e.g., "sunset", "food", "landmark"), and optionally edit the caption. These changes are saved to the cloud and reflected immediately across all devices.

**Why this priority**: Tags and captions are currently maintained in a static `notes.yaml` file that requires manual editing outside the app. Enabling in-app editing with cloud persistence makes the map a self-contained tool for curating travel memories. This builds on the authentication and data persistence established in P2.

**Independent Test**: Can be tested by adding a tag to a photo on one device, then verifying the tag appears on the photo when viewed on another device.

**Acceptance Scenarios**:

1. **Given** a signed-in user opens a photo in the lightbox, **When** they add a new tag, **Then** the tag is saved to the cloud and immediately visible on that photo.
2. **Given** a signed-in user edits a photo's caption, **When** they close and reopen the lightbox, **Then** the updated caption persists.
3. **Given** tags were previously defined in the static notes file, **When** the cloud backend is initialized, **Then** existing tags and captions from the static file are displayed as defaults.
4. **Given** an editor has modified a photo's tags or caption via the app, **When** the processing pipeline is re-run and the manifest is redeployed, **Then** the cloud-stored edits continue to take precedence over the updated static values.

---

### User Story 4 - Owner Authentication (Priority: P2)

A user signs in using their Google account. If their email is in the authorized-editors list (a config file), they gain access to editing features (favorites, tags, captions). Unauthenticated visitors and signed-in users not on the list can view the map and photos but cannot modify any data. The sign-in flow is simple — a single button that opens Google sign-in.

**Why this priority**: Authentication is an enabler for all persistent user data features (P2 and P3). It must be implemented alongside or before persistent favorites. It is grouped at P2 because it has no standalone user value without the data features it enables.

**Independent Test**: Can be tested by verifying that the sign-in button appears, Google sign-in completes successfully, and the UI reflects the authenticated state (e.g., showing the user's name/avatar and enabling edit controls).

**Acceptance Scenarios**:

1. **Given** an unauthenticated visitor opens the map, **When** they browse and click photos, **Then** they can view everything but see no edit controls (no star toggle, no tag editor, no caption editor).
5. **Given** a user signs in with a Google account that is NOT in the authorized-editors list, **When** the page loads, **Then** they see no edit controls, identical to an unauthenticated visitor.
2. **Given** a user clicks the sign-in button, **When** they complete Google sign-in, **Then** the UI updates to show their identity and enable editing features.
3. **Given** a signed-in user refreshes the page, **When** the page reloads, **Then** they remain signed in without needing to re-authenticate.
4. **Given** a signed-in user clicks sign out, **When** the page updates, **Then** editing features are hidden and the map returns to view-only mode.

---

### Edge Cases

- What happens when cloud storage (thumbnails) is temporarily unavailable? The app should show a user-friendly error or placeholder image for thumbnails while HD images (served via Google API) remain unaffected.
- What happens when the Firebase Blaze plan free-tier egress limit (10 GiB/month for Storage) is exceeded? Since only thumbnails are hosted on cloud storage (~14 MB total for ~700 photos), this limit is unlikely to be reached under normal usage. If exceeded, the app should display placeholder thumbnails rather than failing silently; HD images remain available via Google API.
- What happens when a user favorites a photo while offline or during a network interruption? The favorite should be queued locally and synced when connectivity returns.
- What happens when localStorage favorites reference photos that no longer exist in the manifest? Orphaned favorites should be silently discarded during migration.
- What happens when two devices simultaneously edit the same photo's tags? The most recent write should win (last-write-wins), and both devices should converge to the same state within a short period.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST serve photo thumbnails from cloud storage rather than local static files. Full-resolution (HD) images MUST continue to load via the existing Google API.
- **FR-002**: System MUST provide a processing pipeline step that uploads thumbnails to cloud storage and updates the manifest with cloud thumbnail URLs. HD image URLs (Google API) remain unchanged.
- **FR-003**: System MUST allow users to authenticate via Google sign-in.
- **FR-004**: System MUST restrict data modification (favorites, tags, captions) to authenticated users whose Google email appears in a configurable authorized-editors list.
- **FR-005**: Unauthenticated visitors MUST be able to view the map, photos, and all metadata in read-only mode.
- **FR-006**: System MUST persist user favorites to a cloud database, replacing localStorage as the primary storage.
- **FR-007**: System MUST migrate existing localStorage favorites to the cloud database on the user's first sign-in.
- **FR-008**: System MUST allow the authenticated user to add, edit, and remove tags on individual photos.
- **FR-009**: System MUST allow the authenticated user to edit captions on individual photos.
- **FR-010**: System MUST use static manifest tags and captions as default values, but cloud-stored edits MUST take precedence whenever they exist for a given photo. Re-running the processing pipeline MUST NOT overwrite cloud edits.
- **FR-011**: System MUST sync user data changes across devices within a reasonable timeframe (near real-time when online).
- **FR-012**: System MUST operate within the free-tier usage limits of the Firebase Blaze plan (required for Cloud Storage since October 2024; free tier covers expected usage at $0).
- **FR-013**: System MUST handle network interruptions gracefully by queuing writes locally and syncing when connectivity returns.

### Key Entities

- **Photo**: A geotagged image with location (latitude, longitude), date, cloud-hosted thumbnail URL, Google API HD URL, caption, tags, and type (image or video). Thumbnails are uploaded to cloud storage by the processing pipeline; HD URLs are derived from Google Drive share links. Photo metadata is read-only to the web app.
- **UserPreferences**: Per-user data associated with photos, including favorited photos and user-added tags/captions. Linked to a specific authenticated user and specific photos.
- **User**: An authenticated identity (via Google sign-in). Contains display name, email, avatar, and unique identifier. Edit access is determined by whether the user's email appears in the authorized-editors config list.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All thumbnails load from cloud storage URLs and all HD images load from Google API, with no local file dependencies at runtime. Zero broken images when the app is deployed as a standalone web page.
- **SC-002**: Photo thumbnails on the map begin rendering within 2 seconds of the map viewport settling, comparable to the current local-file experience.
- **SC-003**: A user can sign in with Google in under 10 seconds (from clicking sign-in to seeing authenticated UI state).
- **SC-004**: Favorites saved on one device appear on another device within 5 seconds of signing in.
- **SC-005**: Tags and captions edited in the app persist across page refreshes and device switches with no data loss.
- **SC-006**: The app remains fully functional on the Firebase Blaze plan free tier for typical personal use (fewer than 1,000 photos, fewer than 10 daily active sessions).
- **SC-007**: Unauthenticated visitors experience identical map browsing performance and functionality (minus editing) compared to the pre-backend version.

## Assumptions

- **Authorized-editors model**: This is a personal travel photo map with a configurable list of authorized Google emails that have edit access. All other visitors (including signed-in users not on the list) are read-only viewers. Collaborative editing (multiple editors working simultaneously) is out of scope, but granting edit access to a small number of trusted people is supported.
- **Split hosting model**: Thumbnails are hosted on cloud storage (uploaded by the Python processing pipeline). HD images continue to be served via the existing Google API (`lh3.googleusercontent.com`) from Google Drive share links. There is no web-based photo upload UI in this feature.
- **Python pipeline uploads thumbnails only**: Photos continue to be processed locally via the existing Python scripts (`process_photos.py`). A new upload step pushes generated thumbnails to cloud storage and updates the manifest with cloud thumbnail URLs. HD URLs remain Google-derived and unchanged.
- **Blaze plan free tier**: Firebase Storage requires the Blaze (pay-as-you-go) plan since October 2024. The Blaze free tier (5 GB Storage, 10 GiB/month egress, 50K Firestore reads/day) covers expected usage at $0. A budget alert should be set to prevent unexpected charges.
- **Google sign-in**: Google is the authentication provider since the project already uses Google Cloud and the owner has a Google account. No other auth methods are needed.
- **Static manifest**: The photo manifest (`manifest.json`) remains a static file deployed with the app, generated by the Python processing pipeline. It is not stored in the cloud database. The manifest is the source of truth for photo structural data (GPS coordinates, dates, thumbnail URLs, HD URLs). Only user-generated data (favorites, tags, captions) lives in the cloud database.
- **Cloud-over-static precedence**: The static manifest (generated from `notes.yaml` and EXIF data) provides default tags and captions. Once an editor modifies a photo's tags or caption via the app, the cloud version takes precedence permanently for that photo, even if the pipeline is re-run. The processing pipeline remains the source of truth for structural photo metadata (GPS, dates, URLs) which is not editable in the app.
- **No real-time collaboration**: Since this is single-owner, there are no concurrent editing conflicts to resolve beyond the owner's own multi-device usage (last-write-wins is acceptable).
