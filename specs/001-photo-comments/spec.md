# Feature Specification: Photo Comments

**Feature Branch**: `001-photo-comments`
**Created**: 2026-02-20
**Status**: Draft
**Input**: User description: "Add a commenting system so family members can leave comments on individual photos"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Comments on a Photo (Priority: P1)

A family member opens the map, taps a photo to open the lightbox, and sees
comments left by other family members beneath the photo. Each comment shows
the commenter's name, the comment text, and when it was posted. Comments
appear in chronological order, oldest first.

**Why this priority**: Displaying existing comments is the foundation —
without it, there is no reason to leave comments. This delivers immediate
value even if comments are initially seeded by the map owner.

**Independent Test**: Can be fully tested by adding sample comments to the
comments data file and verifying they render correctly in the lightbox for
any photo.

**Acceptance Scenarios**:

1. **Given** a photo has 3 comments in the data file, **When** a viewer
   opens that photo in the lightbox, **Then** all 3 comments appear below
   the photo with author name, text, and relative timestamp.
2. **Given** a photo has no comments, **When** a viewer opens the lightbox,
   **Then** the comment area shows an inviting empty state (e.g., "No
   comments yet") rather than being hidden entirely.
3. **Given** a photo has more than 5 comments, **When** a viewer opens the
   lightbox, **Then** comments are scrollable without pushing the photo
   off-screen.

---

### User Story 2 - Leave a Comment on a Photo (Priority: P2)

A family member is viewing a photo in the lightbox and wants to share a
reaction or memory. They tap a "Leave a comment" button, enter their name
(remembered from last time) and comment text, and submit it. The comment
appears immediately in their local view and is [NEEDS CLARIFICATION: How
are comments shared with other viewers given the static-first constraint?
The project has no backend — comments cannot be written to a shared file
at runtime. This fundamentally affects whether commenting is a local-only
experience, a curated workflow, or requires an external service].

**Why this priority**: This is the core interactive feature — enabling
family members to actively participate rather than passively view. It
depends on the display foundation from US1.

**Independent Test**: Can be tested by opening a photo, entering a name
and comment text, submitting, and verifying the comment appears in the
comment list for that photo.

**Acceptance Scenarios**:

1. **Given** a viewer is in the lightbox, **When** they tap the comment
   button, **Then** a comment input area appears with a name field and a
   text field.
2. **Given** a viewer previously entered their name, **When** they open
   the comment input again, **Then** their name is pre-filled from their
   last session.
3. **Given** a viewer types a comment and submits, **When** submission
   completes, **Then** the comment appears immediately in the comment list
   for that photo.
4. **Given** a viewer submits a comment with an empty text field, **When**
   they tap submit, **Then** the system prevents submission and indicates
   the text field is required.

---

### User Story 3 - Browse Photos with Comment Indicators (Priority: P3)

A family member browsing the map can see at a glance which photos have
comments. Photos with comments display a small comment count badge on
their thumbnail marker, similar to how favorites are visually
distinguished. This encourages exploration and engagement.

**Why this priority**: This is an enhancement that improves discoverability
but is not required for core commenting functionality. It builds on US1
and US2.

**Independent Test**: Can be tested by having some photos with comments
and some without, then verifying that only commented photos show a badge
with the correct count.

**Acceptance Scenarios**:

1. **Given** a photo has 4 comments, **When** the map renders its marker,
   **Then** a small badge shows "4" on the marker.
2. **Given** a photo has no comments, **When** the map renders its marker,
   **Then** no comment badge appears.
3. **Given** the viewer is zoomed out and photos are sampled by the
   viewport density system, **When** a sampled photo has comments, **Then**
   the badge still appears on the visible marker.

---

### Edge Cases

- What happens when a comment contains special characters, HTML tags, or
  very long text? Comments MUST be sanitized to prevent display issues.
  Text MUST be truncated or wrapped at a reasonable length (500 characters
  maximum per comment).
- What happens when two family members use the same name? The system treats
  them as the same person — no uniqueness enforcement on names.
- What happens when the comments data file is missing or malformed? The
  photo display MUST work normally with no comment section errors. Comments
  gracefully degrade to the empty state.
- What happens on a slow connection? Comment display MUST NOT block photo
  loading. Comments load after the photo is visible.
- What happens when a viewer has not entered a name? The name field MUST be
  required before submission. A placeholder like "Your name" guides the
  user.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display comments associated with a photo
  when the photo is opened in the lightbox.
- **FR-002**: Each displayed comment MUST show the author's name, comment
  text, and a human-readable relative timestamp (e.g., "2 days ago").
- **FR-003**: Comments MUST appear in chronological order, oldest first.
- **FR-004**: The system MUST provide a "Leave a comment" interaction
  accessible from the lightbox view.
- **FR-005**: The comment input MUST require both a name and comment text
  before allowing submission.
- **FR-006**: The system MUST remember the viewer's name across sessions
  so they do not need to re-enter it each time.
- **FR-007**: Comments MUST be limited to 500 characters maximum, with a
  visible character counter.
- **FR-008**: Comment text MUST be sanitized to prevent rendering of HTML
  or script content — plain text only.
- **FR-009**: The system MUST display a comment count badge on photo
  markers that have one or more comments.
- **FR-010**: Missing or malformed comments data MUST NOT break photo
  display or any existing map functionality.
- **FR-011**: The comment input area MUST be usable on mobile devices with
  appropriately sized touch targets and a keyboard-friendly layout.
- **FR-012**: The system MUST support comments on both photos and videos
  with the same interface.

### Key Entities

- **Comment**: A single comment left on a photo. Attributes: photo
  identifier (filename), author name, comment text, timestamp (ISO 8601).
  A photo can have zero or many comments. Comments are ordered by
  timestamp.
- **Photo Identifier**: The unique key linking a comment to a specific
  photo, using the photo's filename (e.g., `IMG_1234.jpg`) which is
  already the canonical identifier in the manifest.

## Assumptions

- **Identity is name-based**: Family members identify themselves by
  entering a display name. There is no authentication, login, or account
  system. This is appropriate because the audience is a trusted family
  group, not the public internet.
- **Name persistence**: The viewer's name is remembered locally on their
  device between sessions. They can change it at any time.
- **Comment length**: 500 characters is sufficient for reactions and short
  memories. This is a photo album, not a discussion forum.
- **No editing or deletion by viewers**: Once submitted, a comment cannot
  be edited or deleted by the viewer. The map owner can curate comments
  in the data file directly.
- **No threading or replies**: Comments are a flat list per photo. Reply
  threading adds complexity without clear value for a family photo album.
- **No notifications**: There is no system to notify other family members
  when a new comment is posted.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Family members can read all comments on a photo within 1
  second of opening the lightbox.
- **SC-002**: A first-time visitor can leave their first comment in under
  30 seconds (including entering their name).
- **SC-003**: Returning visitors can leave a comment in under 15 seconds
  (name pre-filled).
- **SC-004**: The comment system works on mobile devices — all touch
  targets meet minimum 44x44 point sizing.
- **SC-005**: Photos with no comments load identically to the current
  experience — zero regression in load time or behavior.
- **SC-006**: The map remains fully functional when the comments data
  source is missing or empty.
