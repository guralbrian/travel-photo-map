# Implementation Plan: Cloud Photo Backend

**Branch**: `002-cloud-photo-backend` | **Date**: 2026-02-20 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `specs/002-cloud-photo-backend/spec.md`

## Summary

Add a Firebase backend to the travel photo map: thumbnails hosted on Firebase Storage, user data (favorites, tags, captions) persisted in Firestore, authorized editors authenticated via Google sign-in. The static manifest and Google API HD images remain unchanged. Unauthenticated visitors retain full read-only map access.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES2020+ modules), Python 3.10+
**Primary Dependencies**: Leaflet.js (existing, vendored), Firebase JS SDK v11 (Auth + Firestore Lite, vendored), firebase-admin (Python)
**Storage**: Firebase Storage (thumbnails), Firestore (user data: favorites, tags, captions), static manifest.json (photo metadata)
**Testing**: Manual browser testing, Python script smoke tests
**Target Platform**: Web browser (desktop + mobile), Python CLI (processing pipeline)
**Project Type**: Static web app + Python processing pipeline
**Performance Goals**: 2s initial map render on 4G, 60fps map interaction, 3 Firestore reads per page load
**Constraints**: Firebase Blaze plan free tier (5GB Storage, 10GiB/month egress, 50K Firestore reads/day, 1GB Firestore storage), no build step, vendored dependencies
**Scale/Scope**: <1,000 photos, <10 daily sessions, 1-3 authorized editors

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Privacy by Default | Justified Exception | User data (favorites, tags) stored on Firebase (Google servers). Original photos NOT uploaded — only thumbnails. No analytics or tracking added. Firebase project is user-owned. |
| II. Static & Zero-Config | Justified Exception | Firebase introduces runtime cloud services (Auth, Firestore, Storage). This is the core feature purpose. Mitigation: unauthenticated viewers get full read-only experience; Firebase only required for thumbnails and editing. |
| III. Approachable by Everyone | Compliant | Sign-in optional for viewers. Edit controls hidden for non-editors. Google sign-in is a single button. |
| IV. Professional Visual Polish | Compliant | New UI elements (sign-in button, tag/caption editors) follow existing dark glass aesthetic. |
| V. Performant at Any Scale | Compliant | Firestore Lite (~128KB) keeps SDK lightweight. Only 3 Firestore reads per page load. Firebase Storage CDN-backed. |
| VI. Unified Media Experience | Compliant | Tag/caption editing integrated into existing lightbox. Favorites unchanged. |
| VII. Map-Centric Integration | Compliant | All editing within map/lightbox UI. No separate pages or navigation. |
| Tech: No databases | Justified Exception | Firestore required for cross-device persistent user data. localStorage-only doesn't sync. |
| Tech: Vendored dependencies | Compliant | Firebase SDK modules downloaded from gstatic CDN, vendored into `js/`, import paths rewritten to local. |
| Tech: No build step | Compliant | ES module imports via `<script type="module">`. No bundler needed. |
| Tech: Graceful degradation | Compliant | Missing Firebase config degrades to read-only static app. Missing Firestore falls back to manifest defaults. |

**Gate Result**: PASS with justified exceptions documented in Complexity Tracking.

### Post-Design Re-Check (Phase 1 Complete)

| Concern | Verified |
|---------|----------|
| Vendored Firebase SDK satisfies vendoring constraint | Yes — download + sed rewrite of 1 import path per module |
| Firestore Lite keeps performance within bounds | Yes — ~128KB vs ~430KB full; 3 reads/page load |
| 3-document data model minimizes reads | Yes — config + photoEdits + favorites = 3 reads total |
| Public Storage URLs don't leak sensitive data | Yes — thumbnails are inherently public (same as current static hosting) |
| Authorized-editors model provides adequate security | Yes — Firestore security rules enforce server-side; client-side is UI-only |
| Blaze plan free tier covers expected usage | Yes — ~14MB thumbnails, <300 reads/day, <50 writes/day |

## Project Structure

### Documentation (this feature)

```text
specs/002-cloud-photo-backend/
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions
├── data-model.md        # Phase 1: Firestore document schemas
├── quickstart.md        # Phase 1: Developer setup guide
├── contracts/           # Phase 1: Security rules and schemas
│   ├── firestore.rules
│   ├── storage.rules
│   └── data-schema.json
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
travel-photo-map/
├── index.html                      # Modified: add module imports, auth UI, editing UI
├── css/
│   └── map.css                     # Modified: auth button, tag/caption editor styles
├── js/
│   ├── leaflet.js                  # Existing (unchanged)
│   ├── Leaflet.Photo.js            # Existing (unchanged)
│   ├── ViewportSampler.js          # Existing (unchanged)
│   ├── firebase-app.js             # NEW: Vendored Firebase core (~101KB)
│   ├── firebase-auth.js            # NEW: Vendored Firebase Auth (~154KB)
│   ├── firebase-firestore-lite.js  # NEW: Vendored Firestore Lite (~128KB)
│   ├── firebase-init.js            # NEW: Firebase config + initialization
│   ├── auth.js                     # NEW: Sign-in/out, auth state, editor role check
│   └── cloud-data.js               # NEW: Firestore CRUD for favorites, tags, captions
├── data/
│   └── manifest.json               # Modified: thumbnail field → Firebase Storage URLs
├── scripts/
│   ├── process_photos.py           # Existing (unchanged)
│   ├── upload_thumbnails.py        # NEW: Upload thumbs to Firebase Storage, update manifest
│   └── init_firestore.py           # NEW: Seed Firestore config (authorized editors)
├── firebase/                       # NEW: Firebase project configuration
│   ├── firestore.rules             # Firestore security rules
│   ├── storage.rules               # Storage security rules
│   └── cors.json                   # CORS config for Storage bucket
└── requirements.txt                # Modified: add firebase-admin
```

**Structure Decision**: The project retains its existing flat static-app layout. Firebase SDK modules are vendored into `js/` alongside Leaflet (matching the established pattern). New JS modules (`firebase-init.js`, `auth.js`, `cloud-data.js`) follow the existing pattern of standalone script files. Python scripts go in `scripts/`. Firebase project configuration files go in a new `firebase/` directory.

## Complexity Tracking

> **Justified violations of Constitution principles**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Principle II: Runtime cloud services (Firebase Auth, Firestore, Storage) | Core feature: cloud photo hosting and persistent user data require cloud services at runtime | localStorage-only approach doesn't sync across devices and loses data on browser clear |
| Tech constraint: No databases at runtime | Cross-device persistent user data (favorites, tags, captions) requires a database | File-based notes.yaml requires manual editing outside the app and can't sync across devices |
| Spark → Blaze plan upgrade required | Firebase Storage requires Blaze plan since Oct 2024 | Blaze free tier covers all expected usage at $0; budget alerts prevent unexpected charges; no free alternative for Firebase Storage exists |
