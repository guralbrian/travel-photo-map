<!--
  Sync Impact Report
  ====================
  Version change: 1.0.0 → 2.0.0
  Modified principles:
    - I. Static-First Deployment → I. Privacy by Default (expanded from old III)
    - II. Zero-Configuration Viewing → folded into II. Static & Zero-Config
    - III. Privacy by Default → I. Privacy by Default (promoted, expanded)
    - IV. Offline Processing Pipeline → moved to Technology Constraints
    - V. Vendored Frontend Dependencies → moved to Technology Constraints
    - VI. Graceful Degradation → moved to Technology Constraints
  Added principles:
    - III. Approachable by Everyone (new)
    - IV. Professional Visual Polish (new)
    - V. Performant at Any Scale (new)
    - VI. Unified Media Experience (new)
    - VII. Map-Centric Integration (new)
  Removed sections: None (same structure retained)
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ aligned
      (Constitution Check section is generic — no principle-specific gates)
    - .specify/templates/spec-template.md ✅ aligned
      (user story format is principle-agnostic)
    - .specify/templates/tasks-template.md ✅ aligned
      (phase structure is principle-agnostic)
  Follow-up TODOs: None
-->

# Travel Photo Map Constitution

## Core Principles

### I. Privacy by Default

Original full-resolution photos and videos MUST NOT be committed to the
repository or deployed to any hosting provider. Only generated thumbnails,
extracted metadata (GPS coordinates, dates, captions), and pre-built JSON
manifests are tracked in version control. The `.gitignore` MUST exclude the
`photos/` directory and any credential files (`token.json`,
`credentials.json`).

Location data MUST be treated as sensitive. The application MUST NOT include
analytics, tracking pixels, or third-party scripts that transmit user
browsing behavior or location data. All data stays in the repository and
the viewer's browser — nowhere else.

**Rationale**: Travel photos encode sensitive location history and personal
imagery. The audience is family — not the public internet. Every design
decision MUST assume the data is private by default.

### II. Static & Zero-Config

All features MUST be deployable as static files servable by any HTTP file
server (GitHub Pages, Netlify, S3, `python -m http.server`, or opening
`index.html` directly). No server-side processing, databases, or backend
APIs are permitted at runtime.

The map MUST work out of the box without API keys, external service accounts,
or environment variables for core functionality. All tile providers MUST be
free and keyless. Optional integrations (e.g., Google Drive sync, Google
Photos links) MUST degrade gracefully when not configured — the viewer
MUST never see an error because of a missing integration.

**Rationale**: The project exists to be trivially hostable and shareable.
Anyone receiving the link — tech-savvy or not — MUST see a working map
without any setup.

### III. Approachable by Everyone

The primary audience is non-technical family members browsing on phones
and tablets. Every user-facing interaction MUST be intuitive without
instructions, tooltips, or technical vocabulary.

Specifically:
- Touch targets MUST be large enough for comfortable phone use.
- Navigation patterns (swipe, pinch, tap) MUST follow platform conventions.
- UI text MUST use plain language — no developer jargon, file paths, or
  error codes visible to viewers.
- The lightbox, favorites, timeline, and controls MUST be discoverable
  through standard UX patterns (icons, gestures, progressive disclosure).

**Rationale**: If a grandparent cannot browse the photos on their phone
without asking for help, the feature has failed.

### IV. Professional Visual Polish

The interface MUST look and feel like a finished product — not a developer
prototype. This means:
- Consistent design language: dark glass panels, smooth transitions, and
  cohesive color usage across all controls and overlays.
- Animations and transitions MUST be smooth (no visible jank or layout
  shifts). CSS transitions are preferred over JavaScript animation where
  possible.
- Typography, spacing, and iconography MUST be deliberate and consistent.
- The map itself is the hero — chrome and controls MUST be minimal and
  unobtrusive, appearing only when needed.

**Rationale**: Visual quality determines whether family members perceive
this as "a real app" or "a tech experiment." Professional polish builds
trust and encourages engagement.

### V. Performant at Any Scale

The application MUST remain responsive with photo collections of any size.
Performance constraints:
- Initial map load (manifest fetch + first render) MUST complete in under
  2 seconds on a 4G connection with a 500-photo collection.
- Map panning and zooming MUST maintain 60fps. Photo markers MUST be
  rendered using viewport-density sampling — never by loading all markers
  at once.
- Image loading MUST be progressive: show thumbnails immediately, swap to
  high-resolution when available and loaded.
- UI interactions (slider drags, filter changes, lightbox navigation) MUST
  use debouncing or throttling to prevent frame drops.

**Rationale**: A slow or janky map destroys the browsing experience.
Performance is a feature, not an optimization to defer.

### VI. Unified Media Experience

Photos and videos are first-class citizens with equal treatment. The
application MUST provide a complete viewing experience without requiring
external tools:
- **View**: Full-screen lightbox with zoom (pinch/wheel/double-tap),
  pan, and keyboard/swipe navigation between media.
- **Favorite**: Users MUST be able to mark favorites that persist across
  sessions (localStorage) and appear prominently on the map.
- **Navigate**: Timeline slider and map interaction MUST work seamlessly
  to browse media by date and location.
- **Access originals**: When a Google Photos/Drive URL is available,
  the viewer MUST be able to reach the full-resolution original via a
  single tap. When not available, the thumbnail experience MUST still
  be complete.

Videos MUST play inline (via iframe or HTML5 video) within the same
lightbox and popup patterns used for photos — no separate video player
or external redirect.

**Rationale**: Family members expect a single, self-contained experience
for viewing and enjoying travel media — like a digital photo album, not
a file browser.

### VII. Map-Centric Integration

The map is the single surface for all interaction. Every feature —
photos, videos, notes, annotations, timeline, travel routes, and
controls — MUST be integrated into the map view. There MUST NOT be
separate pages, screens, or navigation hierarchies.

Specifically:
- Notes and annotations MUST appear as markers or overlays on the map,
  not in a sidebar list or separate editor.
- The timeline MUST filter the map in place, not navigate to a different
  view.
- The control panel MUST overlay the map with minimal footprint and
  collapse when not in use.
- Future features (commenting, tagging, trip editing) MUST follow this
  same pattern: the map is the canvas, features are layers.

**Rationale**: A single-surface design keeps the experience simple and
spatial. Travel memories are inherently geographic — the map is the
natural home for every interaction.

## Technology Constraints

- **Frontend**: Plain HTML, vanilla JavaScript, CSS. No build step, no
  transpilation, no framework. The entry point is `index.html`.
- **Processing**: Python 3.10+ with Pillow for image handling. Dependencies
  declared in `requirements.txt`. All photo/video processing — EXIF
  extraction, GPS parsing, thumbnail generation, and manifest building —
  MUST happen locally before deployment.
- **Mapping**: Leaflet.js with vendored plugins (Leaflet.Photo,
  ViewportSampler). Plugins MUST be committed directly into `js/` and
  `css/` — not managed via npm, CDN links, or package managers.
- **Data format**: JSON manifests (`data/manifest.json`), optional YAML
  annotations (`data/notes.yaml`), and optional trip segments
  (`data/trip_segments.json`). No databases.
- **Supported media**: JPG, JPEG, TIFF, HEIC, HEIF for photos. MP4 and
  Google Drive video streams for video.
- **New frontend dependencies** MUST be vendored into `js/` or `css/`.
- **New Python dependencies** MUST be added to `requirements.txt`.
- **Graceful degradation**: Missing or empty data MUST NOT break the
  application. An empty manifest shows a helpful empty state. Missing
  `notes.yaml`, `annotations.json`, `trip_segments.json`, or
  `timeline.json` MUST be silently tolerated. Photos without GPS EXIF
  data MUST be skipped or interpolated, never crash the processing script.

## Development Workflow

- **Adding photos**: Copy geotagged images into `photos/`, run
  `python scripts/process_photos.py`, verify output in `data/manifest.json`
  and `thumbs/`.
- **Local preview**: `python3 -m http.server 8000` from the project root.
- **Deployment**: Push the repository (with `thumbs/` and `data/`) to a
  static hosting provider. No CI/CD build step is required beyond photo
  processing.
- **Feature development**: Follow the speckit workflow
  (`/speckit.specify` through `/speckit.implement`). All features MUST pass
  the Constitution Check gate before implementation begins.
- **Code style**: Keep JavaScript broadly compatible. Use clear function
  names and minimal abstraction. Prioritize readability over cleverness.
  CSS transitions over JavaScript animation where possible.

## Governance

This constitution is the authoritative source for project development
principles. All feature specifications, implementation plans, and code
reviews MUST verify compliance with these principles.

**Amendment procedure**:
1. Propose changes via `/speckit.constitution` with a description of the
   amendment.
2. Document the rationale for the change.
3. Increment the version according to semantic versioning:
   - MAJOR: Removing or fundamentally redefining a principle.
   - MINOR: Adding a new principle or materially expanding guidance.
   - PATCH: Clarifications, wording refinements, non-semantic fixes.
4. Update the Sync Impact Report and propagate changes to dependent
   templates.

**Compliance review**: Every feature plan MUST include a Constitution Check
section that maps each principle to how the feature complies (or documents
a justified exception in the Complexity Tracking table).

**Version**: 2.0.0 | **Ratified**: 2026-02-15 | **Last Amended**: 2026-02-20
