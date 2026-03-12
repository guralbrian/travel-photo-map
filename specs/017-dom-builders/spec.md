# Feature Specification: Selective Renderer Cleanup (DOM Builders)

**Feature Branch**: `017-dom-builders`
**Created**: 2026-03-11
**Status**: Draft
**Input**: User description: "Replace the most fragile and risk-prone string-built renderers with safe DOM-builder helpers"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Safe Photo Popup Rendering (Priority: P1)

A visitor clicks on a photo marker on the map. The app displays a popup containing the photo thumbnail, caption, tags, and metadata. Because captions and tags are user-editable text, they must be rendered safely via text nodes rather than raw HTML interpolation to prevent XSS and display corruption from special characters.

**Why this priority**: Photo popups are the most-viewed surface that renders user-editable text (captions and tags). This is the highest XSS risk surface in the app.

**Independent Test**: Can be tested by clicking any photo marker and verifying the popup renders correctly, including photos with captions containing special characters like `<script>`, `&amp;`, or quotes.

**Acceptance Scenarios**:

1. **Given** a photo with a plain-text caption, **When** the user clicks its marker, **Then** the popup displays the caption identically to the previous string-based renderer
2. **Given** a photo with a caption containing HTML-special characters (e.g., `<b>test</b>`, `"quotes"`, `&amp;`), **When** the user clicks its marker, **Then** the characters are displayed literally as text, not interpreted as HTML
3. **Given** a photo with tags, **When** the popup renders, **Then** tags are displayed using text nodes and match the previous visual appearance

---

### User Story 2 - Safe Feed Entry Rendering (Priority: P2)

A visitor opens the trip feed panel. The app builds feed entries showing date labels, city/segment names, thumbnail grids, "+N more" indicators, and narrative slots. These entries are currently assembled as one large HTML string. The refactored version builds them via DOM API calls while preserving the same markup, classes, and visual appearance.

**Why this priority**: Feed entries are a primary navigation surface and contain user-facing text (city names, dates, segment labels) that benefit from safe construction.

**Independent Test**: Can be tested by opening the feed panel and verifying all entries render with correct dates, labels, thumbnails, overflow indicators, and narrative placeholders.

**Acceptance Scenarios**:

1. **Given** trip data with multiple segments, **When** the feed panel renders, **Then** all entries appear with the same structure and styling as the previous string-based renderer
2. **Given** a segment with more photos than the visible thumbnail limit, **When** the entry renders, **Then** the "+N more" indicator displays correctly
3. **Given** a segment with a city name containing special characters, **When** the entry renders, **Then** the name is displayed literally as text

---

### User Story 3 - Safe Narrative Slot Rendering (Priority: P3)

A visitor views feed entries that include narrative text (daily summaries or annotations). The narrative content is rendered into dedicated slots within feed entries. The refactored version uses DOM construction so narrative text is inserted as text nodes rather than via innerHTML.

**Why this priority**: Narrative text is user-authored content that should be treated as untrusted input for rendering purposes.

**Independent Test**: Can be tested by viewing feed entries with narratives and verifying text renders correctly, including narratives with special characters.

**Acceptance Scenarios**:

1. **Given** a feed entry with an associated narrative, **When** narratives are rendered, **Then** the narrative text appears in the correct slot with the same styling as before
2. **Given** a narrative containing HTML-like characters, **When** it renders, **Then** the characters display as literal text

---

### User Story 4 - Safe Annotation Popup Rendering (Priority: P4)

A visitor interacts with an annotation (point of interest) on the map. The annotation popup displays a title, description text, and date. The refactored version builds this popup via DOM construction so that user-authored titles and text are not assembled via raw HTML strings.

**Why this priority**: Annotation popups contain user-editable text but are less frequently viewed than photo popups and feed entries.

**Independent Test**: Can be tested by clicking an annotation marker and verifying the popup renders correctly with proper text escaping.

**Acceptance Scenarios**:

1. **Given** an annotation with a title and description, **When** the user clicks its marker, **Then** the popup renders identically to the previous version
2. **Given** an annotation with special characters in its title, **When** the popup renders, **Then** characters are displayed literally

---

### Edge Cases

- What happens when a photo has no caption or empty tags? The popup should still render correctly with the field absent or empty.
- What happens when a narrative is extremely long? Rendering via DOM nodes should handle long text the same as innerHTML did.
- What happens when a feed entry has zero photos? The entry should still render with date/segment info and no thumbnail grid.
- What happens when annotation text is null or undefined? The popup should render gracefully without errors.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a lightweight DOM-builder helper module exposing at minimum `el(tag, attrs, ...children)` and `text(str)` functions
- **FR-002**: The helper module MUST be accessible to other modules via a global namespace
- **FR-003**: The helper module MUST be loaded by the app before any consuming modules
- **FR-004**: Photo popup rendering MUST be refactored to return a DOM node instead of an HTML string
- **FR-005**: User-editable text in photo popups (captions, tags) MUST be inserted via text nodes, not string concatenation into HTML
- **FR-006**: Feed entry rendering MUST be refactored to build entries via DOM construction instead of HTML string concatenation
- **FR-007**: Feed entry rendering MUST preserve the same CSS classes, element structure, and visual appearance as the current implementation
- **FR-008**: Narrative slot rendering MUST use DOM construction instead of innerHTML for narrative text content
- **FR-009**: Annotation popup rendering MUST be refactored to use DOM construction for titles, text, and dates
- **FR-010**: All refactored renderers MUST produce visually identical output to their string-based predecessors
- **FR-011**: No new external dependencies MUST be introduced
- **FR-012**: No behavioral changes MUST be introduced -- all user interactions, click handlers, and navigation flows MUST remain unchanged

### Key Entities

- **DOM Helper Module**: A minimal utility providing safe element-creation functions that produce real DOM nodes with text content inserted as text nodes
- **Photo Popup**: Map popup showing photo thumbnail, caption, tags, and metadata for a clicked photo marker
- **Feed Entry**: A card-like element in the trip feed showing date, city/segment, thumbnails, overflow count, and narrative slot
- **Narrative Slot**: A container within a feed entry that displays narrative text content
- **Annotation Popup**: Map popup showing title, description, and date for a point of interest

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All four priority renderers (photo popup, feed entry, narrative slot, annotation popup) use DOM construction instead of HTML string concatenation
- **SC-002**: User-editable text containing HTML-special characters (`<`, `>`, `&`, `"`, `'`) renders as literal text in all refactored surfaces
- **SC-003**: Visual output of all refactored renderers is indistinguishable from the previous string-based versions at both desktop and mobile widths
- **SC-004**: No new runtime errors are introduced as verified by browser console inspection
- **SC-005**: The DOM helper module is minimal, keeping the utility focused and small

## Assumptions

- The map library's popup binding accepts DOM elements in addition to HTML strings
- The existing CSS classes and selectors used by the string-based renderers will continue to work when the same classes are applied to DOM-constructed elements
- "User-editable text" refers to captions, tags, narrative text, and annotation titles/descriptions -- fields that originate from user input or external data sources
- Control panel rendering and photo viewer metadata rendering are explicitly out of scope unless trivially low-risk to include
