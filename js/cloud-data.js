/**
 * Cloud data module for Firestore CRUD operations.
 *
 * Provides:
 * - getPhotoId(photo): Canonical photo ID from manifest entry
 * - Favorites: loadFavorites, toggleFavorite, migrateFavorites
 * - Photo edits: loadPhotoEdits, savePhotoTags, savePhotoCaption,
 *                getEffectiveTags, getEffectiveCaption
 * - Offline queue: pending writes stored in localStorage
 *
 * Exports to window.cloudData.
 */

import { doc, getDoc, setDoc, updateDoc } from './firebase-firestore-lite.js';

// Module-level caches
let _favorites = null;       // Array of photo ID strings
let _photoEdits = null;      // Object keyed by photoId
let _db = null;               // Firestore instance (set on firebase-ready)

/**
 * Derive canonical photo ID from a manifest photo entry.
 * Uses photo.url (stable local path like "photos/20260129_091401.jpg")
 * rather than photo.thumbnail (which gets rewritten to Firebase Storage URLs).
 */
function getPhotoId(photo) {
  return photo.url.split('/').pop().replace(/\.[^.]+$/, '');
}

function _getDb() {
  if (!_db && window.firebaseApp) {
    _db = window.firebaseApp.db;
  }
  return _db;
}

// ---------------------------------------------------------------------------
// Favorites
// ---------------------------------------------------------------------------

async function loadFavorites(uid) {
  var db = _getDb();
  if (!db || !uid) return [];
  try {
    var snap = await getDoc(doc(db, 'favorites', uid));
    _favorites = snap.exists() ? (snap.data().photos || []) : [];
  } catch (e) {
    console.warn('[cloud-data] loadFavorites error:', e.message);
    _favorites = [];
  }
  return _favorites;
}

function isFavoriteById(photoId) {
  return _favorites ? _favorites.indexOf(photoId) !== -1 : false;
}

async function toggleFavorite(uid, photoId) {
  if (!_favorites) _favorites = [];
  var idx = _favorites.indexOf(photoId);
  if (idx === -1) {
    _favorites.push(photoId);
  } else {
    _favorites.splice(idx, 1);
  }

  var db = _getDb();
  if (!db || !uid) return;

  try {
    await setDoc(doc(db, 'favorites', uid), {
      photos: _favorites,
      updatedAt: Date.now()
    });
  } catch (e) {
    console.warn('[cloud-data] toggleFavorite write failed, queuing:', e.message);
    _queuePendingWrite({ type: 'toggleFavorite', uid: uid, photoId: photoId, timestamp: Date.now() });
  }
}

async function migrateFavorites(uid, manifestPhotos) {
  var raw;
  try {
    raw = JSON.parse(localStorage.getItem('photomap_favorites') || '{}');
  } catch (e) {
    return;
  }
  var keys = Object.keys(raw);
  if (keys.length === 0) return;

  // Build a set of valid photo IDs from manifest for orphan detection
  var validIds = {};
  if (manifestPhotos) {
    for (var i = 0; i < manifestPhotos.length; i++) {
      validIds[getPhotoId(manifestPhotos[i])] = true;
    }
  }

  var migratedIds = [];
  for (var k = 0; k < keys.length; k++) {
    // Key format: "photos/20260129_091401.jpg|51.502797|-0.059158"
    var urlPart = keys[k].split('|')[0];
    var filename = urlPart.split('/').pop();
    var photoId = filename.replace(/\.[^.]+$/, '');
    // Discard orphans (photos no longer in manifest)
    if (Object.keys(validIds).length > 0 && !validIds[photoId]) continue;
    if (migratedIds.indexOf(photoId) === -1) migratedIds.push(photoId);
  }

  if (migratedIds.length === 0) return;

  var db = _getDb();
  if (!db || !uid) return;

  try {
    // Merge with any existing cloud favorites
    var existing = await loadFavorites(uid);
    for (var m = 0; m < migratedIds.length; m++) {
      if (existing.indexOf(migratedIds[m]) === -1) existing.push(migratedIds[m]);
    }
    await setDoc(doc(db, 'favorites', uid), {
      photos: existing,
      updatedAt: Date.now()
    });
    _favorites = existing;

    // Backup and clear localStorage
    localStorage.setItem('photomap_favorites_migrated', JSON.stringify(raw));
    localStorage.removeItem('photomap_favorites');
    console.log('[cloud-data] Migrated ' + migratedIds.length + ' favorites to cloud');
  } catch (e) {
    console.warn('[cloud-data] Migration failed:', e.message);
  }
}

// ---------------------------------------------------------------------------
// Offline write queue
// ---------------------------------------------------------------------------

var PENDING_KEY = 'photomap_pending_writes';

function _queuePendingWrite(op) {
  var queue = [];
  try { queue = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch (e) { /* ignore */ }
  queue.push(op);
  localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('pending-writes-changed'));
}

async function _replayPendingWrites() {
  var queue;
  try { queue = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]'); } catch (e) { return; }
  if (queue.length === 0) return;

  var db = _getDb();
  if (!db) return;

  var remaining = [];
  for (var i = 0; i < queue.length; i++) {
    var op = queue[i];
    try {
      if (op.type === 'toggleFavorite') {
        // Re-load and apply
        var favs = await loadFavorites(op.uid);
        var idx = favs.indexOf(op.photoId);
        if (idx === -1) favs.push(op.photoId);
        else favs.splice(idx, 1);
        await setDoc(doc(db, 'favorites', op.uid), { photos: favs, updatedAt: Date.now() });
        _favorites = favs;
      } else if (op.type === 'savePhotoTags') {
        await _writePhotoEdit(op.photoId, 'tags', op.value);
      } else if (op.type === 'savePhotoCaption') {
        await _writePhotoEdit(op.photoId, 'caption', op.value);
      }
    } catch (e) {
      remaining.push(op);
    }
  }
  localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
  window.dispatchEvent(new CustomEvent('pending-writes-changed'));
}

async function _writePhotoEdit(photoId, field, value) {
  var db = _getDb();
  if (!db) throw new Error('No Firestore connection');
  var user = window.firebaseAuth && window.firebaseAuth.currentUser;
  var data = {};
  data[photoId + '.' + field] = value;
  data[photoId + '.updatedAt'] = Date.now();
  if (user && user.email) data[photoId + '.updatedBy'] = user.email;
  await updateDoc(doc(db, 'photoEdits', 'all'), data);
}

// Replay on init and on coming back online
if (typeof window !== 'undefined') {
  window.addEventListener('online', function () { _replayPendingWrites(); });
  window.addEventListener('firebase-ready', function () {
    setTimeout(_replayPendingWrites, 2000);
  });
}

// ---------------------------------------------------------------------------
// Photo edits
// ---------------------------------------------------------------------------

async function loadPhotoEdits() {
  var db = _getDb();
  if (!db) return {};
  try {
    var snap = await getDoc(doc(db, 'photoEdits', 'all'));
    _photoEdits = snap.exists() ? snap.data() : {};
  } catch (e) {
    console.warn('[cloud-data] loadPhotoEdits error:', e.message);
    _photoEdits = {};
  }
  return _photoEdits;
}

async function savePhotoTags(photoId, tags) {
  // Optimistic update to cache
  if (!_photoEdits) _photoEdits = {};
  if (!_photoEdits[photoId]) _photoEdits[photoId] = {};
  _photoEdits[photoId].tags = tags;

  try {
    await _writePhotoEdit(photoId, 'tags', tags);
  } catch (e) {
    console.warn('[cloud-data] savePhotoTags failed, queuing:', e.message);
    _queuePendingWrite({ type: 'savePhotoTags', photoId: photoId, value: tags, timestamp: Date.now() });
  }
}

async function savePhotoCaption(photoId, caption) {
  // Optimistic update to cache
  if (!_photoEdits) _photoEdits = {};
  if (!_photoEdits[photoId]) _photoEdits[photoId] = {};
  _photoEdits[photoId].caption = caption;

  try {
    await _writePhotoEdit(photoId, 'caption', caption);
  } catch (e) {
    console.warn('[cloud-data] savePhotoCaption failed, queuing:', e.message);
    _queuePendingWrite({ type: 'savePhotoCaption', photoId: photoId, value: caption, timestamp: Date.now() });
  }
}

function getEffectiveTags(photoId, manifestTags) {
  if (_photoEdits && _photoEdits[photoId] && _photoEdits[photoId].tags !== undefined) {
    return _photoEdits[photoId].tags;
  }
  return manifestTags || [];
}

function getEffectiveCaption(photoId, manifestCaption) {
  if (_photoEdits && _photoEdits[photoId] && _photoEdits[photoId].caption !== undefined) {
    return _photoEdits[photoId].caption;
  }
  return manifestCaption || '';
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

window.cloudData = {
  getPhotoId,
  loadFavorites,
  isFavoriteById,
  toggleFavorite,
  migrateFavorites,
  loadPhotoEdits,
  savePhotoTags,
  savePhotoCaption,
  getEffectiveTags,
  getEffectiveCaption,
  getPendingWritesCount: function () {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]').length; } catch (e) { return 0; }
  },
};
