# Feature Specification: POI Editor

**Feature Branch**: `003-poi-editor`
**Created**: 2026-02-20
**Status**: Draft
**Input**: User description: "Add a system to create/manage POIs for trip annotations, with admin-gated web interface editing. Reference: leaflet-independo-maps for accessible pictogram-based markers."

## Context

The travel photo map currently displays annotations from a static `data/annotations.json` file as simple pin markers. There is no way to add, edit, or remove annotations from the web interface — changes require manually editing JSON and redeploying. The existing Firebase backend (from 002-cloud-photo-backend) provides authentication with an authorized-editors list and Firestore for cloud persistence.

This feature replaces the static annotation system with an interactive POI editor that allows signed-in editors to create, edit, and delete Points of Interest directly on the map. Visitors continue to see POIs as read-only markers. The leaflet-independo-maps library provides accessible, pictogram-based marker display with configurable icons per POI category.

## User Scenarios & Testing

### User Story 1 - View POIs on Map (Priority: P1)

All visitors see Points of Interest displayed on the map as categorized pictogram markers. Clicking a POI marker opens a popup showing the POI's title, description, category icon, and date. POIs are visually distinct from photo markers.

**Why this priority**: Foundational — POIs must be visible to everyone before editing makes sense. This replaces the existing static annotations system with cloud-backed, categorized markers.

**Independent Test**: Load the map with at least 3 POIs of different categories stored in the cloud. All visitors (including unauthenticated) see the POI markers with correct icons. Clicking a marker shows the popup with all fields. Photo markers remain unaffected.

**Acceptance Scenarios**:

1. **Given** POIs exist in cloud storage, **When** a visitor loads the map, **Then** all POIs appear as pictogram markers at their correct coordinates
2. **Given** a POI has a category (e.g., "restaurant", "landmark"), **When** displayed on the map, **Then** the marker uses the corresponding category pictogram icon
3. **Given** a visitor clicks a POI marker, **When** the popup opens, **Then** it shows the title, description, category, and date
4. **Given** no POIs exist, **When** a visitor loads the map, **Then** the map loads normally with no POI markers and no errors

---

### User Story 2 - Create POI on Map (Priority: P1)

A signed-in editor can add a new POI by clicking on the map at the desired location. A form appears where the editor fills in the POI details (title, description, category, date). On save, the POI immediately appears on the map and persists to the cloud.

**Why this priority**: Core editing capability — the primary reason for this feature. Without creation, the POI system has no content source beyond migration.

**Independent Test**: Sign in as an editor, click a location on the map, fill in POI details in the creation form, save. The POI marker appears immediately. Refresh the page — the POI is still there. Open on another device — the POI is visible.

**Acceptance Scenarios**:

1. **Given** an editor is signed in, **When** they click on the map, **Then** a POI creation form appears anchored to the clicked location
2. **Given** the creation form is open, **When** the editor fills in title and category and clicks save, **Then** a new POI marker appears at the clicked coordinates
3. **Given** a POI was just created, **When** the page is refreshed, **Then** the POI persists and displays correctly
4. **Given** a visitor (non-editor) clicks on the map, **When** no editor is signed in, **Then** no creation form appears — the map behaves as before

---

### User Story 3 - Edit and Delete POI (Priority: P2)

A signed-in editor can edit an existing POI's details or delete it. Clicking a POI marker shows an "Edit" button (visible only to editors) that opens the same form pre-filled with current values. A "Delete" button removes the POI after confirmation.

**Why this priority**: Essential for content management but depends on US1 (display) and US2 (creation) being in place first.

**Independent Test**: Sign in as an editor, click an existing POI, click Edit, change the title, save. The popup updates. Click another POI, click Delete, confirm. The marker disappears. Refresh — changes persist.

**Acceptance Scenarios**:

1. **Given** an editor clicks an existing POI marker, **When** the popup opens, **Then** an "Edit" button is visible
2. **Given** the editor clicks "Edit", **When** the edit form opens, **Then** all fields are pre-filled with current values
3. **Given** the editor modifies fields and clicks save, **When** the form closes, **Then** the marker and popup reflect the updated values immediately
4. **Given** the editor clicks "Delete", **When** a confirmation prompt appears and the editor confirms, **Then** the POI marker is removed from the map and deleted from the cloud
5. **Given** a visitor clicks a POI marker, **When** the popup opens, **Then** no Edit or Delete buttons are visible

---

### User Story 4 - Migrate Existing Annotations (Priority: P3)

The existing static annotations from `data/annotations.json` are migrated to the cloud POI system so they appear as POIs with the new display format. After migration, the static file is no longer the source of truth.

**Why this priority**: One-time migration task. Existing annotations should not be lost, but this is a setup step rather than ongoing functionality.

**Independent Test**: Run the migration process. All entries from `annotations.json` appear as POIs on the map with correct titles, descriptions, dates, and coordinates. The system reads POIs from the cloud, not the static file.

**Acceptance Scenarios**:

1. **Given** annotations exist in `data/annotations.json`, **When** the migration runs, **Then** each annotation is created as a cloud POI with matching title, text, date, and coordinates
2. **Given** migration is complete, **When** the map loads, **Then** POIs come from the cloud store, not the static JSON file

---

### Edge Cases

- What happens when an editor tries to place a POI on top of an existing photo marker? The POI is created at the clicked coordinates regardless — POIs and photos coexist at the same location
- What happens when two editors create POIs simultaneously? Each write is independent (different documents), so no conflict occurs
- What happens when an editor creates a POI while offline? The write is queued in the offline write queue (same pattern as favorites/tags) and synced when connectivity returns
- What happens when a POI has no description? The description field is optional — the popup displays the title and category without a description section
- What happens when the POI data fails to load from the cloud? The map loads normally without POI markers and logs a warning (graceful degradation)

## Requirements

### Functional Requirements

- **FR-001**: System MUST display all POIs from cloud storage as pictogram markers on the map, visually distinct from photo markers
- **FR-002**: System MUST support POI categories with corresponding pictogram icons (at minimum: restaurant, landmark, transport, accommodation, activity, shopping, other)
- **FR-003**: System MUST show a popup with title, description, category, and date when a POI marker is clicked
- **FR-004**: Signed-in editors MUST be able to create a new POI by clicking on the map at the desired location
- **FR-005**: The POI creation form MUST collect: title (required), description (optional), category (required, from predefined list), and date (optional, defaults to today)
- **FR-006**: System MUST persist new POIs to cloud storage immediately on save
- **FR-007**: Signed-in editors MUST be able to edit any existing POI's title, description, category, and date
- **FR-008**: Signed-in editors MUST be able to delete a POI after confirming the action
- **FR-009**: All POI create/edit/delete controls MUST be hidden from non-editors and unauthenticated visitors
- **FR-010**: System MUST queue POI writes when offline and sync when connectivity returns, using the existing offline write queue
- **FR-011**: System MUST migrate existing annotations from `data/annotations.json` to the cloud POI store
- **FR-012**: POI markers MUST be toggleable as a map layer (show/hide via the existing control panel)

### Key Entities

- **POI (Point of Interest)**: A geolocated annotation on the map. Attributes: unique ID, latitude, longitude, title, description, category, date, created-by, created-at, updated-at
- **POI Category**: A classification that determines the pictogram icon displayed. Predefined set: restaurant, landmark, transport, accommodation, activity, shopping, other

## Success Criteria

### Measurable Outcomes

- **SC-001**: Editors can create a new POI in under 30 seconds (click location, fill form, save)
- **SC-002**: POI markers load and display within 2 seconds of page load for up to 200 POIs
- **SC-003**: All existing annotations from `annotations.json` are migrated without data loss
- **SC-004**: POI edits persist across devices within 5 seconds (create on device A, visible on device B after refresh)
- **SC-005**: Non-editors see zero editing controls — the map experience is identical to pre-feature behavior for visitors
- **SC-006**: System operates within the free tier of the existing cloud backend (no additional cost for expected usage of under 200 POIs)

## Assumptions

- The existing Firebase backend (project `travel-photo-map-e0bf4`) and auth system from 002-cloud-photo-backend are in place and functional
- The authorized-editors list in Firestore `config/app` gates POI editing — same editors who can edit tags/captions can manage POIs
- POI count will remain under 200 for the foreseeable future (personal travel map)
- The leaflet-independo-maps library will be used for accessible pictogram-based marker rendering
- POI data is stored in Firestore (consistent with the existing cloud architecture)
- The existing offline write queue pattern is reused for POI operations
