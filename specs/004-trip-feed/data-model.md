# Data Model: Trip Feed / Timeline Sidebar

**Feature**: 004-trip-feed

## Entities

### Feed Entry (runtime, not persisted)

A feed entry is a computed grouping of photos and metadata for a single trip date. Built at page load from existing data sources.

| Field | Source | Type | Description |
|-------|--------|------|-------------|
| date | manifest.json photo.date | string (YYYY-MM-DD) | The date this entry represents |
| cityName | trip_segments.json (via photo.cityName) | string | City/segment name for this date |
| cityColor | trip_segments.json (via photo.cityColor) | string (#hex) | Accent color from trip segment |
| photos | manifest.json (filtered by date) | array | All photos for this date, sorted by datetime |
| narrative | Firestore dailyNarratives/all | string or null | Editor-written text for this date |

**Construction**: Built by iterating `allPhotos` once after `assignPhotosToTripSegments()` runs. Stored in a `dateIndex` object keyed by date string.

```javascript
// dateIndex structure
{
  "2026-01-29": {
    photos: [photo1, photo2, ...],   // sorted by datetime
    segmentName: "London",
    segmentColor: "#E53935",
    segmentIndex: 0
  },
  "2026-01-30": { ... }
}
```

### Daily Narrative (Firestore document)

Editor-written narrative text for trip dates. Stored in a single Firestore document following the existing `photoEdits/all` pattern.

**Firestore path**: `dailyNarratives/all`

| Field Path | Type | Description |
|------------|------|-------------|
| `{date}.text` | string | Narrative text for this date |
| `{date}.updatedAt` | number (timestamp) | Last modification time |
| `{date}.updatedBy` | string (email) | Editor who last modified |

**Example document**:
```json
{
  "2026-01-29": {
    "text": "Explored the Tower of London and walked along the Thames.",
    "updatedAt": 1708444800000,
    "updatedBy": "owner@gmail.com"
  },
  "2026-02-01": {
    "text": "Copenhagen's colorful Nyhavn harbor in the snow.",
    "updatedAt": 1708531200000,
    "updatedBy": "owner@gmail.com"
  }
}
```

**Size estimate**: 22 dates × ~600 bytes = ~13KB (well within Firestore's 1MB document limit)

## Data Flow

```
Page Load:
  1. fetch('data/manifest.json') → allPhotos[]
  2. fetch('data/trip_segments.json') → tripSegments[]
  3. assignPhotosToTripSegments() stamps cityName/cityColor on each photo
  4. Build dateIndex{} from allPhotos (O(n) single pass)
  5. firebase-ready event → cloudData.loadDailyNarratives()
  6. Render feed entries from dateIndex + narratives

Timeline Slider Change:
  1. Get minDate, maxDate from slider
  2. Filter dateIndex keys to [minDate, maxDate]
  3. Re-render feed with filtered entries

Feed Entry Click:
  1. Get date from clicked entry
  2. Compute bounds from dateIndex[date].photos lat/lng
  3. map.flyToBounds(bounds, {paddingTopLeft, paddingBottomRight, duration: 0.8})
  4. Highlight clicked entry in feed

Narrative Edit (editor only):
  1. Editor clicks narrative area → textarea appears
  2. Editor types and blurs/presses Enter
  3. Optimistic update to _dailyNarratives cache
  4. cloudData.saveDailyNarrative(date, text) → updateDoc
  5. On failure → queue to offline write queue
```

## cloud-data.js Additions

```javascript
// New module-level cache
let _dailyNarratives = null;

// New functions to export on window.cloudData:
async function loadDailyNarratives()          // reads dailyNarratives/all, caches
function getDailyNarrative(dateStr)           // returns cached text or ''
async function saveDailyNarrative(dateStr, text) // optimistic update + Firestore write
```

These follow the identical pattern of `loadPhotoEdits` / `getEffectiveCaption` / `savePhotoCaption`.
