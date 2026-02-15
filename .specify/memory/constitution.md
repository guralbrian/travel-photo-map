<!--
  Sync Impact Report
  ====================
  Version change: 0.0.0 (template) → 1.0.0 (initial ratification)
  Modified principles: N/A (initial creation)
  Added sections:
    - Core Principles (6 principles defined)
    - Technology Constraints
    - Development Workflow
    - Governance
  Removed sections: None
  Templates requiring updates:
    - .specify/templates/plan-template.md ✅ aligned (Constitution Check section is generic gate)
    - .specify/templates/spec-template.md ✅ aligned (no principle-specific sections needed)
    - .specify/templates/tasks-template.md ✅ aligned (phase structure fits workflow)
  Follow-up TODOs: None
-->

# Travel Photo Map Constitution

## Core Principles

### I. Static-First Deployment

All features MUST be deployable as static files servable by any HTTP file
server (GitHub Pages, Netlify, S3, `python -m http.server`, or opening
`index.html` directly). No server-side processing, databases, or backend
APIs are permitted at runtime.

**Rationale**: The project exists to be trivially hostable. Introducing
runtime server dependencies would undermine the core value proposition of
"drop photos in, run a script, deploy anywhere."

### II. Zero-Configuration Viewing

The map MUST work out of the box without API keys, external service accounts,
or environment variables for core functionality. All tile providers MUST be
free and keyless. Optional integrations (e.g., Google Photos links) MUST
degrade gracefully when not configured.

**Rationale**: Lowering the barrier to entry ensures anyone can fork, add
photos, and deploy without signing up for third-party services.

### III. Privacy by Default

Original full-resolution photos MUST NOT be committed to the repository or
deployed. Only generated thumbnails and extracted metadata (GPS coordinates,
dates, captions) are tracked in version control. The `.gitignore` MUST
exclude the `photos/` directory.

**Rationale**: Travel photos contain sensitive location history and personal
imagery. Keeping originals local prevents accidental exposure of private data
through public repositories.

### IV. Offline Processing Pipeline

All photo processing — EXIF extraction, GPS parsing, thumbnail generation,
and manifest building — MUST happen locally via Python scripts before
deployment. The browser runtime MUST NOT perform image processing, EXIF
reading, or file system access. The frontend MUST only consume pre-built
JSON manifests and pre-generated thumbnails.

**Rationale**: Offline processing keeps the frontend simple, fast, and
compatible with static hosting. It also avoids shipping large photo files
to the browser.

### V. Vendored Frontend Dependencies

Frontend JavaScript and CSS libraries (Leaflet, MarkerCluster, Leaflet.Photo)
MUST be vendored — committed directly into `js/` and `css/` — rather than
managed via npm, CDN links, or other package managers. New frontend
dependencies MUST be added as vendored files.

**Rationale**: Vendoring ensures the map works offline, survives CDN outages,
and remains buildable without Node.js tooling. It also locks dependency
versions explicitly.

### VI. Graceful Degradation

Missing or empty data MUST NOT break the application. Specifically:
- An empty `data/manifest.json` MUST show a helpful empty state, not errors.
- A missing `data/notes.yaml` MUST be silently tolerated.
- A missing `data/annotations.json` MUST be silently tolerated.
- Photos without GPS EXIF data MUST be skipped or interpolated, never crash
  the processing script.

**Rationale**: Users will encounter partial data states frequently (new setup,
photos without GPS, no captions yet). The application MUST remain usable at
every stage of data completeness.

## Technology Constraints

- **Frontend**: Plain HTML, vanilla JavaScript, CSS. No build step, no
  transpilation, no framework. The entry point is `index.html`.
- **Processing**: Python 3.10+ with Pillow for image handling. Dependencies
  declared in `requirements.txt`.
- **Mapping**: Leaflet.js with MarkerCluster and Leaflet.Photo plugins.
- **Data format**: JSON manifests (`data/manifest.json`) and optional YAML
  annotations (`data/notes.yaml`). No databases.
- **Supported image formats**: JPG, JPEG, TIFF, HEIC, HEIF.
- **New frontend dependencies** MUST be vendored into `js/` or `css/`.
- **New Python dependencies** MUST be added to `requirements.txt`.

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
- **Code style**: Keep JavaScript ES5-compatible for maximum browser support.
  Use clear function names and minimal abstraction. Avoid premature
  optimization.

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

**Version**: 1.0.0 | **Ratified**: 2026-02-15 | **Last Amended**: 2026-02-15
