# Feature Specification: Shared Trip Data Model

**Feature Branch**: `015-shared-trip-model`
**Created**: 2026-03-11
**Status**: Draft
**Input**: User description: "Create js/trip-model.js as the single canonical source for trip region definitions, photo-to-segment assignment, and date indexing — eliminating duplicated logic across landing-page.js, region-nav.js, and app.js."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Single Source of Region Definitions (Priority: P1)

As a developer maintaining this codebase, I need one canonical place that defines the 8 user-facing trip regions so that changes to region labels, groupings, or itinerary mappings only need to happen in one file instead of being updated in parallel across `landing-page.js` and `region-nav.js`.

**Why this priority**: Region definitions are duplicated identically in two files today. This is the core duplication that causes drift risk and is the foundation all other consolidation builds on.

**Independent Test**: After extracting regions into the shared module, both the landing page card grid and the region nav grid render identically to before — same labels, same date ranges, same center coordinates, same ordering.

**Acceptance Scenarios**:

1. **Given** the app loads with itinerary data, **When** the landing page renders region cards, **Then** the cards display the same 8 labels, date ranges, and hero photos as before the refactor.
2. **Given** the app loads with itinerary data, **When** the region nav grid renders, **Then** the grid displays the same 8 region buttons with the same labels and date ranges as before.
3. **Given** the shared model is initialized, **When** a consumer calls the region lookup API, **Then** each region has a stable machine-readable `id`, a display `label`, and the correct `jsonRegions` mapping.
4. **Given** the shared model is initialized, **When** derived region data is requested, **Then** each region includes `center`, `startDate`, `endDate`, and sorted/deduplicated `days` matching what each module previously computed independently.

---

### User Story 2 - Centralized Photo-to-Segment Assignment (Priority: P1)

As a developer, I need the photo-to-segment assignment logic to live in the shared model so that every part of the app (feed sidebar, photo wall, route builder) relies on the same assignment logic and the same enriched photo metadata.

**Why this priority**: This function is currently embedded inside `app.js` and its side effects (mutating photo objects with segment metadata) are consumed by multiple downstream modules. Moving it to the shared model is essential for the model to be a complete data source.

**Independent Test**: After moving assignment logic to the shared model, every photo still receives the same segment annotation values. The feed sidebar, photo wall section headers, and route coloring all remain unchanged.

**Acceptance Scenarios**:

1. **Given** the app loads photos and trip segments, **When** the shared model initializes, **Then** every photo object is annotated with the same segment metadata as the previous inline implementation.
2. **Given** a photo has a datetime field, **When** assignment runs, **Then** the photo is matched to the segment whose time range contains that datetime (same boundary logic as before).
3. **Given** a photo has only a date field (no datetime), **When** assignment runs, **Then** noon is assumed for comparison (unchanged behavior).
4. **Given** a photo has no valid date or datetime, **When** assignment runs, **Then** the photo receives fallback values indicating no segment match.

---

### User Story 3 - Centralized Date Index (Priority: P1)

As a developer, I need the date-grouped photo index to be built by the shared model so that the feed sidebar (and any future date-based views) consume the same canonical grouping without the orchestrator module manually constructing it.

**Why this priority**: The date index is tightly coupled to photo-to-segment assignment (it reads the segment metadata from photos). Moving both together ensures consistency and completes the data model extraction.

**Independent Test**: After the refactor, the feed sidebar renders identically — same date entries, same segment names and colors per date, same photo ordering within each date.

**Acceptance Scenarios**:

1. **Given** photos have been assigned to segments, **When** the date index is built, **Then** photos are grouped by their date field with the first photo's segment metadata setting the entry metadata for that date.
2. **Given** a date has multiple photos, **When** the date index is built, **Then** photos within each date are sorted by datetime (or date as fallback), ascending.
3. **Given** the date index is built, **When** a consumer accesses it, **Then** the structure is identical to the previous inline implementation — a date-keyed object with photos array and segment metadata per entry.

---

### User Story 4 - Consumer Module Integration (Priority: P2)

As a developer, I need the three consumer modules to read from the shared model instead of computing data themselves, completing the deduplication.

**Why this priority**: This is the integration step that realizes the value of the shared model. Without it, the new module exists but the duplication remains.

**Independent Test**: After integration, the old region arrays and assignment functions are removed from their original locations. The app continues to function identically — landing page, region nav, feed, photo wall, route lines all behave the same.

**Acceptance Scenarios**:

1. **Given** the landing page module is refactored, **When** it initializes, **Then** it reads region data (including summary and hero photo) from the shared model instead of building regions from its own local array.
2. **Given** the region nav module is refactored, **When** it initializes, **Then** it reads region sections from the shared model instead of building them from its own local array.
3. **Given** the orchestrator module is refactored, **When** it initializes, **Then** it calls the shared model's initialization and reads the date index and cluster data from it, instead of containing its own assignment and indexing logic.
4. **Given** any consumer module, **When** it needs region data, **Then** it accesses the shared model's read-only API rather than recomputing from raw data.

---

### Edge Cases

- What happens when itinerary data fails to load (null/undefined)? The shared model returns empty region arrays, matching current graceful degradation in both consumer modules.
- What happens when trip segments data is empty? Photo assignment produces no matches — all photos receive fallback segment metadata, matching current behavior.
- What happens when a photo's datetime falls outside all segment boundaries? The photo receives fallback values indicating no segment match — unchanged from current behavior.
- What happens when a region definition references an itinerary region name that doesn't exist in the loaded data? That entry is silently skipped (no days, no coordinates contributed), matching current behavior.
- What happens when the shared model's API is called before initialization? Methods return empty arrays/objects rather than throwing errors.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a single shared module that defines the 8 canonical user-facing trip regions, each with a stable machine-readable identifier, display label, and itinerary-region mapping array.
- **FR-002**: System MUST derive enriched region objects from itinerary data, including averaged center coordinates, date range, sorted/deduplicated days, summary text, and hero photo path.
- **FR-003**: System MUST assign each photo to a trip segment based on datetime matching (same boundary semantics as the existing implementation), annotating each photo with segment index, name, and color.
- **FR-004**: System MUST build a date index grouping photos by calendar date, with segment metadata and chronological ordering within each date — identical structure to the existing implementation.
- **FR-005**: System MUST expose a minimal read-only API for accessing regions, region lookups, date-filtered photos, and the date index.
- **FR-006**: System MUST be loadable via a standard script tag with no build tools, module bundlers, or new dependencies.
- **FR-007**: After integration, the landing page module MUST NOT contain its own region definition array or region-building function.
- **FR-008**: After integration, the region nav module MUST NOT contain its own region definition array or region-building function.
- **FR-009**: After integration, the orchestrator module MUST NOT contain photo-to-segment assignment logic or manual date index construction.
- **FR-010**: System MUST preserve all existing visual and behavioral characteristics — zero user-facing changes.

### Key Entities

- **Region**: A user-facing trip grouping (e.g., "Berlin / Hamburg") that maps one or more itinerary region names to a single navigable section. Has a stable identifier, display label, computed center, date range, and associated days.
- **Trip Segment**: A time-bounded travel leg with name, start/end datetimes, color, and coordinates. Used as the basis for photo assignment.
- **Date Index Entry**: A date-keyed grouping of photos sharing the same calendar date, annotated with the segment metadata of the first photo assigned to that date.
- **Photo (enriched)**: An existing photo object augmented with segment index, segment name, and segment color after assignment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Region definitions exist in exactly one location in the codebase — zero duplication of the region label/mapping arrays.
- **SC-002**: Photo-to-segment assignment logic exists in exactly one location — removed from the orchestrator module.
- **SC-003**: Date index construction logic exists in exactly one location — removed from the orchestrator module.
- **SC-004**: All 8 landing page region cards render with identical labels, date ranges, hero photos, summaries, and photo counts as before the refactor.
- **SC-005**: All 8 region nav grid buttons render with identical labels and date ranges as before.
- **SC-006**: The feed sidebar renders identical date entries with the same segment names, colors, photo counts, and photo ordering as before.
- **SC-007**: Selecting a region in the nav still filters photos and routes to the correct date range and geographic area.
- **SC-008**: The photo wall displays the same section groupings and photo ordering as before.
- **SC-009**: No new files are added beyond the single shared module. No new external dependencies.
- **SC-010**: Visual comparison at desktop (1440px) and mobile (375px) widths shows no differences before vs. after the refactor.

## Assumptions

- The existing 8 region groupings and their itinerary mappings are correct and stable. No new regions need to be added in this phase.
- The summary and hero photo fields from itinerary data are only needed by the landing page detail view. The shared model will include them in derived region data so the landing page can access them without a separate build step.
- The region nav fallback grid (shown when itinerary data is missing) will continue to work by reading the canonical region definitions from the shared model rather than its own local copy.
- The cluster return value from photo assignment is assigned but never read in the orchestrator; its only purpose is the side effect of mutating photo objects. The shared model will still return clusters for compatibility.
- Script loading order will place the shared module before all consumer modules so that its global reference is available when they execute.
