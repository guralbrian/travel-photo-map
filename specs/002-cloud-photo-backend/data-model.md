# Data Model: Cloud Photo Backend

**Feature**: 002-cloud-photo-backend
**Date**: 2026-02-20

## Overview

The data model uses 3 Firestore documents to store all user-generated data. The static `manifest.json` remains the source of truth for photo metadata (GPS, dates, URLs). Cloud data covers only user preferences and edits.

## Photo Identity

**Canonical Photo ID**: Filename stem, derived from the manifest's `url` field (which remains a stable local path even after thumbnail URLs are rewritten to Firebase Storage).

| Manifest `url` | Photo ID |
|-----------------|----------|
| `photos/20260129_091401.jpg` | `20260129_091401` |
| `photos/IMG_4521.jpg` | `IMG_4521` |

**Derivation function**:
```javascript
function getPhotoId(photo) {
  return photo.url.split('/').pop().replace(/\.[^.]+$/, '');
}
```

## Firestore Documents

### 1. `config/app`

Configuration document. Created during initial setup via Firebase Console or `init_firestore.py`.

| Field | Type | Description |
|-------|------|-------------|
| `authorizedEditors` | `string[]` | Google email addresses with edit access |

**Example**:
```json
{
  "authorizedEditors": ["owner@gmail.com", "friend@gmail.com"]
}
```

**Security**: Readable by all. Writable only via Admin SDK or Firebase Console.
**Size estimate**: ~100 bytes per email. At 10 editors = ~1KB.

---

### 2. `photoEdits/all`

All user-generated photo edits in a single document. Each top-level key is a photo ID; the value contains the edited fields.

| Field | Type | Description |
|-------|------|-------------|
| `{photoId}` | `object` | Container for a specific photo's edits |
| `{photoId}.tags` | `string[]` | User-added tags (overrides manifest tags) |
| `{photoId}.caption` | `string` | User-edited caption (overrides manifest caption) |
| `{photoId}.updatedAt` | `number` | Unix timestamp (ms) of last edit |
| `{photoId}.updatedBy` | `string` | Email of the editor who last modified |

**Example**:
```json
{
  "20260129_091401": {
    "tags": ["sunset", "thames", "landmark"],
    "caption": "Sunset over the Thames from Tower Bridge",
    "updatedAt": 1708444800000,
    "updatedBy": "owner@gmail.com"
  },
  "20260130_143256": {
    "caption": "London Bridge at dusk",
    "updatedAt": 1708531200000,
    "updatedBy": "friend@gmail.com"
  }
}
```

**Security**: Readable by all. Writable by authorized editors only.
**Size estimate**: ~200 bytes per edited photo. At 1000 edited photos = ~200KB (within 1MB doc limit).

**Update pattern** (field-level, no overwrite of other photos):
```javascript
import { updateDoc, doc } from './firebase-firestore-lite.js';

await updateDoc(doc(db, 'photoEdits', 'all'), {
  [`${photoId}.tags`]: ['sunset', 'food'],
  [`${photoId}.caption`]: 'Beautiful sunset',
  [`${photoId}.updatedAt`]: Date.now(),
  [`${photoId}.updatedBy`]: user.email
});
```

---

### 3. `favorites/{uid}`

Per-user favorites. One document per authenticated user containing an array of favorited photo IDs.

| Field | Type | Description |
|-------|------|-------------|
| `photos` | `string[]` | Photo IDs that this user has favorited |
| `updatedAt` | `number` | Unix timestamp (ms) of last change |

**Example**:
```json
{
  "photos": ["20260129_091401", "20260129_191642", "20260130_143256"],
  "updatedAt": 1708444800000
}
```

**Security**: Readable by all (favorites affect public map display — starred photos are always visible and larger). Writable only by the owning user if they are an authorized editor.
**Size estimate**: ~30 bytes per favorite. At 500 favorites = ~15KB.

---

## Data Flow

### Page Load (Read Path)

```
1. Fetch manifest.json (static HTTP)
   → photo metadata: lat, lng, date, thumbnail URL, web_url, tags, caption

2. Read config/app from Firestore (1 read)
   → authorizedEditors list
   → Determine if signed-in user is an editor

3. Read photoEdits/all from Firestore (1 read)
   → Cloud tag/caption overrides for edited photos

4. Read favorites/{uid} from Firestore (1 read, if signed in)
   → User's favorited photo IDs

5. For each photo displayed:
   Thumbnail URL  → manifest (Firebase Storage URL)
   HD URL         → manifest web_url (Google API — unchanged)
   Tags           → cloud edit if exists, else manifest default
   Caption        → cloud edit if exists, else manifest default
   Favorite       → true if photo ID in user's favorites array
```

### Edit (Write Path)

```
1. Toggle favorite
   → Update favorites/{uid}.photos array in Firestore
   → If offline: save to localStorage pending queue

2. Edit tags
   → Update photoEdits/all.{photoId}.tags in Firestore
   → If offline: save to localStorage pending queue

3. Edit caption
   → Update photoEdits/all.{photoId}.caption in Firestore
   → If offline: save to localStorage pending queue
```

### Migration (First Sign-in)

```
1. Read localStorage 'photomap_favorites'
   Format: {"photos/20260129_091401.jpg|51.502797|-0.059158": true, ...}

2. For each entry, extract photo ID:
   "photos/20260129_091401.jpg|51.502797|-0.059158"
   → split on '|', take first element
   → extract filename stem: "20260129_091401"

3. Build photo ID array from extracted filenames

4. Write to favorites/{uid}.photos in Firestore

5. Clear localStorage favorites (keep backup in photomap_favorites_migrated)
```

## Relationship to Static Manifest

```
manifest.json (static, deployed with app)
  ├── lat, lng, date, datetime, type    → read-only, never stored in Firestore
  ├── thumbnail (Firebase Storage URL)  → read-only, set by upload_thumbnails.py
  ├── web_url (Google API HD URL)       → read-only, set by process_photos.py
  ├── tags (default values)             → overridden by photoEdits/all.{id}.tags
  └── caption (default value)           → overridden by photoEdits/all.{id}.caption

Firestore (cloud, user-generated data only)
  ├── config/app                        → authorized editors list
  ├── photoEdits/all                    → tag & caption overrides (cloud-over-static)
  └── favorites/{uid}                   → per-user favorite photo IDs
```
