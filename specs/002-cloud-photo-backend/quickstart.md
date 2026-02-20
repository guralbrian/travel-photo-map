# Quickstart: Cloud Photo Backend

**Feature**: 002-cloud-photo-backend
**Prerequisites**: Python 3.10+, Google account, Firebase project (`travel-photo-map-e0bf4`)

## 1. Upgrade Firebase to Blaze Plan

Firebase Storage requires the Blaze (pay-as-you-go) plan since October 2024. The free tier covers all expected usage at $0.

1. Go to [Firebase Console](https://console.firebase.google.com/project/travel-photo-map-e0bf4/usage/details)
2. Click **Upgrade** and select **Blaze plan**
3. Link a billing account
4. Set a budget alert:
   - Go to [GCP Billing](https://console.cloud.google.com/billing) > **Budgets & alerts** > **Create budget**
   - Set budget amount to $1 (minimum), alert at 50% and 100%

## 2. Enable Firebase Services

In the [Firebase Console](https://console.firebase.google.com/project/travel-photo-map-e0bf4):

### Authentication
1. Go to **Authentication** > **Sign-in method**
2. Enable **Google** sign-in provider
3. Set the project support email
4. Under **Settings** > **Authorized domains**, add your deployment domain(s)

### Firestore
1. Go to **Firestore Database** > **Create database**
2. Select **production mode** (custom rules will be deployed)
3. Choose a region close to your users (e.g., `us-central1` or `europe-west1`)

### Storage
1. Go to **Storage** > **Get started**
2. Note the bucket name (e.g., `travel-photo-map-e0bf4.firebasestorage.app`)
NOTE: its "gs://travel-photo-map-e0bf4.firebasestorage.app"

## 3. Deploy Security Rules

### Firestore Rules
1. Go to **Firestore** > **Rules**
2. Replace contents with `firebase/firestore.rules` (also in `specs/002-cloud-photo-backend/contracts/`)
3. Click **Publish**

### Storage Rules
1. Go to **Storage** > **Rules**
2. Replace contents with `firebase/storage.rules` (also in `specs/002-cloud-photo-backend/contracts/`)
3. Click **Publish**

## 4. Initialize Firestore Config

### Option A: Firebase Console
1. Go to **Firestore** > **+ Start collection**
2. Collection ID: `config`
3. Document ID: `app`
4. Add field: `authorizedEditors` (array) with your Google email(s)

### Option B: Python Script
```bash
# Download a service account key:
# Firebase Console > Project settings > Service accounts > Generate new private key
# Save as service-account-key.json (this file is gitignored)

python scripts/init_firestore.py \
  --key service-account-key.json \
  --editors "you@gmail.com,friend@gmail.com"
```

## 5. Get Firebase Web Config

1. Go to **Project settings** > **General** > **Your apps**
2. If no web app exists: click **Add app** > **Web** (</>) > Register
3. Copy the `firebaseConfig` object
4. Open `js/firebase-init.js` and uncomment/fill in the config values in the `firebaseConfig` object (lines 19-24)

## 6. Vendor Firebase SDK (Already Done)

The Firebase SDK v11.6.0 is already vendored in `js/` with import paths rewritten. If you need to re-download:

```bash
# From the project root:
FIREBASE_VERSION="11.6.0"
BASE="https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}"

curl -o js/firebase-app.js            "${BASE}/firebase-app.js"
curl -o js/firebase-auth.js            "${BASE}/firebase-auth.js"
curl -o js/firebase-firestore-lite.js  "${BASE}/firebase-firestore-lite.js"

# Rewrite hardcoded CDN import to local relative path
for f in js/firebase-auth.js js/firebase-firestore-lite.js; do
  sed -i "s|${BASE}/firebase-app.js|./firebase-app.js|g" "$f"
done
```

## 7. Install Python Dependencies

```bash
pip install firebase-admin
# Or add to requirements.txt and: pip install -r requirements.txt
```

## 8. Upload Thumbnails

```bash
python scripts/upload_thumbnails.py \
  --key service-account-key.json \
  --bucket travel-photo-map-e0bf4.firebasestorage.app \
  --manifest data/manifest.json
```

This uploads all thumbnails to Firebase Storage and updates `manifest.json` with cloud URLs.

## 9. Local Development

```bash
# ES modules require an HTTP server (file:// protocol won't work)
python3 -m http.server 8000
# Open http://localhost:8000
```

## 10. Verify

1. Map loads with thumbnails from Firebase Storage URLs (check Network tab)
2. Click sign-in > Google sign-in popup > authenticate
3. If your email is in `authorizedEditors`:
   - Star icon appears on photos (favorite toggle)
   - Tag editor appears in lightbox
   - Caption editor appears in lightbox
4. If your email is NOT in the list:
   - No edit controls visible (same as unauthenticated)
5. Open on another device, sign in > favorites and edits are synced
