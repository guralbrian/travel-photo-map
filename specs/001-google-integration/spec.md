# Feature 001: Google Integration

## Overview

Adds Google Drive photo sync and Google Timeline overlay to the Travel Photo Map.

## User Stories

### US1 (P1): Google Drive Photo Sync

**As a** trip organizer,
**I want to** sync photos from a shared Google Drive folder,
**So that** our group doesn't have to manually copy photos or remember URLs.

**Implementation:** `scripts/sync_google_drive.py`

**Acceptance Criteria:**
- [ ] OAuth 2.0 setup flow works (--setup flag opens browser)
- [ ] Lists images in a shared Drive folder by folder ID
- [ ] Downloads new/changed images to photos/
- [ ] Records Drive shareable links in data/notes.yaml as google_photos_url
- [ ] Tracks sync state in data/.drive_sync_cache.json to avoid re-downloading
- [ ] --dry-run shows what would be downloaded without downloading
- [ ] --force re-downloads everything ignoring cache
- [ ] credentials.json and token.json are gitignored

**Dependencies:** google-api-python-client, google-auth-httplib2, google-auth-oauthlib

### US2 (P2): Google Timeline Overlay

**As a** traveler,
**I want to** see my Google Timeline travel paths and visited places on the map,
**So that** I can visualize my trip route alongside my photos.

**Implementation:** `scripts/parse_timeline.py` + `index.html` + `css/map.css`

**Acceptance Criteria:**
- [ ] Parses Google Takeout Semantic Location History JSON files
- [ ] Extracts activity segments (travel paths with waypoints)
- [ ] Extracts place visits (locations with duration)
- [ ] Supports date range filtering (--start, --end)
- [ ] Supports Douglas-Peucker path simplification (--simplify)
- [ ] Outputs data/timeline.json
- [ ] Frontend renders segments as colored polylines by activity type
- [ ] Frontend renders places as circle markers with name/address/duration
- [ ] Layer control has "Travel Paths" and "Visited Places" toggles
- [ ] Map works normally when timeline.json is missing (graceful degradation)

**Dependencies:** None (stdlib only)

## Files Changed

| File | Action | Story |
|------|--------|-------|
| scripts/sync_google_drive.py | Created | US1 |
| scripts/parse_timeline.py | Created | US2 |
| index.html | Modified — timeline overlay + refactored layer control | US2 |
| css/map.css | Modified — timeline popup styles | US2 |
| requirements.txt | Modified — added google-api-python-client, google-auth-* | US1 |
| .gitignore | Modified — added credentials, token, timeline.json | Both |
| README.md | Modified — added Google Drive + Timeline docs | Both |
| specs/001-google-integration/spec.md | Created — this file | Setup |

## Constitution Compliance

- **Static-First:** Pass — offline scripts generate static data, no runtime APIs
- **Zero-Config Viewing:** Pass — no API keys needed to view the map
- **Privacy:** Pass — OAuth credentials gitignored, timeline data user-specific
- **Offline Pipeline:** Pass — all processing happens locally
- **Vendored Deps:** Pass — no new JS libraries added
- **Graceful Degradation:** Pass — missing files don't break the app
