# Research: Cloud Photo Backend

**Feature**: 002-cloud-photo-backend
**Date**: 2026-02-20
**Status**: Complete

## Decision 1: Firebase SDK Loading Strategy

**Decision**: Vendor Firebase ES modules locally from gstatic CDN with import path rewrite.

**Rationale**: The constitution requires vendored frontend dependencies (no CDN at runtime). Firebase v11 provides pre-built ES modules on gstatic that can be downloaded and served locally. Each sub-module has one hardcoded absolute import pointing to `firebase-app.js` on the CDN — a single `sed` command rewrites it to a relative local path.

**Alternatives considered**:
- CDN-only loading: Violates vendoring rule, requires internet for SDK loading
- Firebase REST APIs (no SDK): Avoids SDK entirely but requires manual auth token management, significantly more code
- npm + bundler: Violates no-build-step constraint

**Vendoring script**:
```bash
FIREBASE_VERSION="11.6.0"
BASE="https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}"

curl -o js/firebase-app.js            "${BASE}/firebase-app.js"
curl -o js/firebase-auth.js            "${BASE}/firebase-auth.js"
curl -o js/firebase-firestore-lite.js  "${BASE}/firebase-firestore-lite.js"

for f in js/firebase-auth.js js/firebase-firestore-lite.js; do
  sed -i "s|${BASE}/firebase-app.js|./firebase-app.js|g" "$f"
done
```

**Files and sizes (v11.6.0, minified)**:

| Module | Size (uncompressed) | Size (gzipped est.) |
|--------|-------------------|-------------------|
| firebase-app.js | ~101 KB | ~30 KB |
| firebase-auth.js | ~154 KB | ~45 KB |
| firebase-firestore-lite.js | ~128 KB | ~38 KB |
| **Total** | **~383 KB** | **~113 KB** |

Note: `firebase-storage.js` (~45KB) is NOT needed on the frontend — thumbnails use direct public URLs.

## Decision 2: Firestore Lite vs Full Firestore

**Decision**: Use Firestore Lite.

**Rationale**: Firestore Lite is ~128KB vs ~430KB for full Firestore (70% smaller). It provides all CRUD operations needed (getDoc, setDoc, updateDoc, deleteDoc, getDocs, query). The tradeoffs are acceptable:
- No real-time listeners (`onSnapshot`): Data freshness on page load is sufficient for 1-3 editors
- No built-in offline persistence: Implement simple localStorage queue for pending writes

**Alternatives considered**:
- Full Firestore SDK: Built-in offline support but +300KB JS payload, overkill for this use case
- Firestore REST API: Even lighter but requires manual token management and complex auth handling

## Decision 3: Thumbnail URL Strategy

**Decision**: Upload thumbnails to Firebase Storage with public-read security rules. Store direct public URLs in the manifest.

**Rationale**: With `allow read` in Storage security rules, thumbnails are served via direct URLs that work in `<img src="...">` tags without the Firebase Storage SDK. The URL pattern:
```
https://firebasestorage.googleapis.com/v0/b/{BUCKET}/o/thumbs%2F{FILENAME}?alt=media
```

The Python upload script generates these URLs and writes them into `manifest.json`. The frontend needs zero changes to image loading logic — it already loads from URLs in the manifest.

CORS configuration is NOT required for `<img>` tags (only needed for programmatic fetch/XHR).

**Alternatives considered**:
- Token-based URLs: Adds unnecessary complexity; thumbnails are not sensitive
- Google Cloud Storage public URLs: Requires additional IAM configuration
- Keep thumbnails static: Defeats P1 (cloud-hosted thumbnails)

## Decision 4: Photo Identity Key

**Decision**: Use thumbnail filename stem as the canonical photo ID.

**Rationale**: The thumbnail filename (e.g., `20260129_091401` from `thumbs/20260129_091401.jpg`) is:
- Stable across pipeline re-runs (derived from original filename)
- Unique per photo (each original has a unique name)
- Human-readable
- Valid as a Firestore field key

**Derivation**: `photo.thumbnail.split('/').pop().replace(/\.[^.]+$/, '')`

**Migration from localStorage**: Current favorites use key format `url|lat|lng` (e.g., `photos/20260129_091401.jpg|51.502797|-0.059158`). Migration extracts the filename stem from the url component.

**Alternatives considered**:
- Manifest array index: Not stable (order can change across pipeline runs)
- Hash of lat+lng+datetime: Could collide for burst photos, not human-readable
- Full URL path: Contains local file paths, not suitable for Firestore keys

## Decision 5: Firestore Data Model

**Decision**: Minimal document count — 3 documents total for all data.

**Rationale**: Firebase Spark/Blaze free tier limits Firestore to 50K reads/day. Minimizing document count minimizes reads per page load:
- `config/app`: Authorized editors list (1 read)
- `photoEdits/all`: All photo edits in one document (1 read)
- `favorites/{uid}`: Per-user favorites (1 read)

Total: **3 reads per page load**. At 10 sessions/day = 30 reads/day.

**Alternatives considered**:
- One document per photo edit: N reads per load where N = edited photos. More scalable but unnecessary at <1000 photos
- Nested subcollections: Clean relational model but more reads and complex queries
- Single mega-document for everything: Fewer reads but security rules can't differentiate user access

## Decision 6: Authorization Model

**Decision**: Firestore config document with authorized editor email list, checked in security rules.

**Rationale**: Centralized, manageable via Firebase Console, enforced server-side. Client reads config once to determine UI state. Security rules check `request.auth.token.email in config.authorizedEditors` on every write.

**Alternatives considered**:
- Firebase Auth custom claims: Requires Admin SDK/Cloud Functions to set, can't be changed via Console
- Client-side only: Not secure — users could modify JS to bypass checks
- Hardcoded email in JS: Works for UI but doesn't enforce server-side; changes require redeployment

## Decision 7: Firebase Billing Plan

**Decision**: Upgrade from Spark to Blaze (pay-as-you-go) with budget alert.

**Rationale**: Firebase Cloud Storage requires Blaze plan since October 2024 (Spark no longer supports Storage). The Blaze free tier provides:

| Resource | Free Tier |
|----------|-----------|
| Storage | 5 GB |
| Download egress | 10 GiB/month |
| Firestore reads | 50K/day |
| Firestore writes | 20K/day |
| Firestore storage | 1 GB |
| Auth DAUs | 3,000/day |

These limits far exceed project needs (~14 MB thumbnails, <300 reads/day). A $1 budget alert (minimum) ensures awareness of any unexpected usage.

**Alternatives considered**:
- Remain on Spark, skip Firebase Storage: Loses P1 (cloud-hosted thumbnails)
- Alternative storage (S3, Cloudflare R2): Fragments the Firebase ecosystem, more configuration
- Self-hosted thumbnail server: Adds infrastructure burden, defeats cloud hosting goal

## Decision 8: Offline Write Handling

**Decision**: localStorage queue with sync on reconnect, implemented manually.

**Rationale**: FR-013 requires graceful network interruption handling. With Firestore Lite (no built-in offline persistence), a localStorage-based pending-writes queue:
1. User performs action (favorite, tag edit) while offline
2. Write to Firestore fails
3. Action saved to `photomap_pending_writes` in localStorage
4. On next page load or connectivity change, pending writes replayed to Firestore

**Alternatives considered**:
- Full Firestore SDK with offline persistence: Built-in but +300KB JS payload
- No offline support: Simpler but violates FR-013
- Service Worker caching: Complex to implement for this use case
