/**
 * Authentication module for Google sign-in.
 *
 * Depends on firebase-init.js (window.firebaseApp must be set).
 * Exposes window.firebaseAuth with sign-in/out methods and editor state.
 * Dispatches 'auth-state-changed' CustomEvent on window.
 */

import {
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  GoogleAuthProvider,
} from './firebase-auth.js';

const provider = new GoogleAuthProvider();

let _currentUser = null;
let _isEditor = false;
const _callbacks = [];

function _notifyListeners() {
  const detail = { user: _currentUser, isEditor: _isEditor };
  window.dispatchEvent(new CustomEvent('auth-state-changed', { detail }));
  _callbacks.forEach(function (cb) {
    try { cb(detail); } catch (e) { console.error('[auth] callback error:', e); }
  });
}

function _initAuth() {
  if (!window.firebaseApp) return;

  const auth = window.firebaseApp.auth;
  const editors = window.firebaseApp.authorizedEditors || [];

  onAuthStateChanged(auth, function (user) {
    _currentUser = user;
    _isEditor = !!(user && user.email && editors.indexOf(user.email) !== -1);
    _notifyListeners();
  });
}

async function signIn() {
  if (!window.firebaseApp) {
    console.warn('[auth] Firebase not initialized');
    return;
  }
  try {
    await signInWithPopup(window.firebaseApp.auth, provider);
  } catch (e) {
    if (e.code !== 'auth/popup-closed-by-user') {
      console.error('[auth] Sign-in error:', e);
    }
  }
}

async function signOutUser() {
  if (!window.firebaseApp) return;
  try {
    await fbSignOut(window.firebaseApp.auth);
  } catch (e) {
    console.error('[auth] Sign-out error:', e);
  }
}

function onAuthChange(callback) {
  _callbacks.push(callback);
  // Immediately invoke with current state if already resolved
  if (_currentUser !== undefined) {
    callback({ user: _currentUser, isEditor: _isEditor });
  }
}

window.firebaseAuth = {
  signIn: signIn,
  signOut: signOutUser,
  get currentUser() { return _currentUser; },
  get isEditor() { return _isEditor; },
  onAuthChange: onAuthChange,
};

// Initialize when Firebase is ready
if (window.firebaseApp) {
  _initAuth();
} else {
  window.addEventListener('firebase-ready', _initAuth);
}
