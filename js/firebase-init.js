/**
 * Firebase initialization module.
 *
 * Initializes Firebase app, Auth, and Firestore Lite.
 * Reads the authorizedEditors list from Firestore config/app.
 * Exports to window.firebaseApp and dispatches 'firebase-ready' event.
 *
 * If Firebase config is missing or initialization fails, degrades gracefully:
 * window.firebaseApp is set to null and the app continues in read-only mode.
 */

import { initializeApp } from './firebase-app.js';
import { getAuth } from './firebase-auth.js';
import { getFirestore, doc, getDoc } from './firebase-firestore-lite.js';

// Firebase project configuration — replace with values from Firebase Console.
// If this object is empty or invalid, the app degrades to read-only static mode.
const firebaseConfig = {
  apiKey: "AIzaSyDGTI7v9jGjI3AkMQEbpKllGwS5tiO84xI",
  authDomain: "travel-photo-map-e0bf4.firebaseapp.com",
  projectId: "travel-photo-map-e0bf4",
  storageBucket: "travel-photo-map-e0bf4.firebasestorage.app",
  messagingSenderId: "246099941269",
  appId: "1:246099941269:web:6ce9a14ca21970fcf5089c"
};


(async function initFirebase() {
  try {
    // Check that config has required fields
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.warn('[firebase-init] Firebase config missing — running in static-only mode.');
      window.firebaseApp = null;
      return;
    }

    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    // Read authorized editors from Firestore config/app
    let authorizedEditors = [];
    try {
      const configSnap = await getDoc(doc(db, 'config', 'app'));
      if (configSnap.exists()) {
        authorizedEditors = configSnap.data().authorizedEditors || [];
      }
    } catch (e) {
      console.warn('[firebase-init] Could not read config/app:', e.message);
    }

    window.firebaseApp = { app, auth, db, authorizedEditors };
    window.dispatchEvent(new CustomEvent('firebase-ready'));

  } catch (e) {
    console.warn('[firebase-init] Firebase initialization failed:', e.message);
    window.firebaseApp = null;
  }
})();
