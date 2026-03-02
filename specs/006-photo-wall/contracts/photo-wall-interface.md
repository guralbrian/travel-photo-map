# Module Interface Contract: PhotoWall

**Module**: `frontend/js/photo-wall.js`
**Branch**: `006-photo-wall` | **Date**: 2026-03-02

> This is a client-side-only feature with no REST API. The "contracts" are the JavaScript module interface and the custom DOM event protocol between the photo wall and the rest of the application.

---

## Module Export

```javascript
// photo-wall.js exports a single class:
export class PhotoWall {
  /**
   * Initialize the photo wall panel.
   * @param {Object} options
   * @param {HTMLElement} options.container  - The panel root element (.photo-wall-panel)
   * @param {Object[]}    options.photos     - Full photo array from manifest.json
   * @param {Object[]}    options.segments   - Trip segments from trip_segments.json
   */
  constructor({ container, photos, segments }) { ... }

  /**
   * Expand the panel to a specific snap state.
   * @param {'collapsed'|'half'|'full'} state
   */
  expand(state) { ... }

  /**
   * Scroll the grid to show the date section containing the given photo.
   * Highlights the photo briefly.
   * @param {Object} photo - A PhotoEntry object from manifest.json
   */
  targetPhoto(photo) { ... }

  /**
   * Scroll the grid to show the date section for the given date string.
   * @param {string} date - YYYY-MM-DD format
   */
  targetDate(date) { ... }

  /**
   * Rebuild the grid layout. Call after a panel width change (window resize).
   */
  relayout() { ... }

  /**
   * Clean up event listeners and DOM elements.
   * Called when the panel is permanently dismissed.
   */
  destroy() { ... }
}
```

---

## DOM Event Protocol

The photo wall communicates with the rest of the application via custom DOM events dispatched on `document`. This decouples `index.html` from `photo-wall.js`.

### Events CONSUMED by PhotoWall (listeners registered in constructor)

#### `photo-wall:target`
Dispatched by `index.html` when a map photo marker is clicked.

```javascript
// Dispatcher (index.html — inside onPhotoClick):
document.dispatchEvent(new CustomEvent('photo-wall:target', {
  detail: {
    photo: { /* PhotoEntry from manifest.json */ }
  }
}));

// Handler behavior:
// 1. If panel is 'collapsed' → expand to 'half'
// 2. Scroll grid to photo's date section
// 3. Highlight photo in grid for 2 seconds
```

#### `photo-wall:target-date`
Dispatched by `index.html` when a trip feed daily entry is clicked.

```javascript
// Dispatcher (index.html — inside feed entry click handler):
document.dispatchEvent(new CustomEvent('photo-wall:target-date', {
  detail: {
    date: 'YYYY-MM-DD'  // e.g., '2026-01-28'
  }
}));

// Handler behavior:
// 1. If panel is 'collapsed' → expand to 'half'
// 2. Scroll grid to the matching DateSection
```

---

### Events DISPATCHED by PhotoWall (for other components to consume)

#### `photo-wall:photo-clicked`
Dispatched when a user clicks a photo in the grid.

```javascript
// Dispatcher (photo-wall.js — inside grid click handler):
document.dispatchEvent(new CustomEvent('photo-wall:photo-clicked', {
  detail: {
    photo: { /* PhotoEntry */ },
    sectionPhotos: [ /* all PhotoEntry objects in the same DateSection */ ],
    indexInSection: 3  // 0-based index of clicked photo within sectionPhotos
  }
}));

// Consumer (index.html):
// 1. Open photo viewer: window.photoViewer.open(sectionPhotos, indexInSection, srcEl)
// 2. Pan map to photo's location: map.panTo([photo.lat, photo.lng])
```

#### `photo-wall:state-changed`
Dispatched when the panel snap state changes (collapsed/half/full).

```javascript
// Dispatcher (photo-wall.js — after snap animation completes):
document.dispatchEvent(new CustomEvent('photo-wall:state-changed', {
  detail: {
    state: 'half'  // 'collapsed' | 'half' | 'full'
  }
}));

// Consumer (index.html — optional):
// May adjust map padding or other UI elements based on panel height.
```

---

## HTML Structure Contract

The following HTML must be present in `index.html` for `PhotoWall` to mount:

```html
<!-- Photo wall panel — added to index.html body -->
<div class="photo-wall-panel" id="photo-wall-panel">
  <div class="photo-wall-handle" id="photo-wall-handle">
    <div class="photo-wall-handle-bar"></div>
  </div>
  <div class="photo-wall-header" id="photo-wall-header">
    <span class="photo-wall-title">Photos</span>
    <span class="photo-wall-date-label" id="photo-wall-date-label"></span>
    <button class="photo-wall-collapse-btn" id="photo-wall-collapse-btn" aria-label="Collapse photo wall">↓</button>
  </div>
  <div class="photo-wall-scroll" id="photo-wall-scroll">
    <div class="photo-wall-spacer" id="photo-wall-spacer"></div>
    <!-- Virtual grid items rendered here as position:absolute children -->
  </div>
  <div class="photo-wall-scrubber" id="photo-wall-scrubber">
    <div class="photo-wall-scrubber-thumb" id="photo-wall-scrubber-thumb"></div>
    <div class="photo-wall-scrubber-tooltip" id="photo-wall-scrubber-tooltip"></div>
  </div>
</div>
```

---

## CSS Class Contract

`photo-wall.css` defines the following classes that control panel state:

| Class | Applied to | Effect |
|-------|-----------|--------|
| `.photo-wall-panel` | Panel root | Base styles: fixed, bottom: 0, full-width |
| `.photo-wall-panel--collapsed` | Panel root | Height = `var(--wall-collapsed-height, 30vh)` |
| `.photo-wall-panel--half` | Panel root | Height = `var(--wall-half-height, 50vh)` |
| `.photo-wall-panel--full` | Panel root | Height = `100vh` |
| `.photo-wall-panel--animating` | Panel root | Enables CSS transition on height |
| `.photo-wall-item` | Grid photo tile | Position: absolute; overflow: hidden |
| `.photo-wall-item--highlight` | Grid photo tile | 2s pulse animation (glow border) |
| `.photo-wall-item--video` | Grid photo tile | Shows play icon overlay |
| `.photo-wall-section-header` | Date separator | Sticky within section; shows date + city |
| `.photo-wall-section-header--sticky` | Date separator | Applied via JS when header reaches panel top |

---

## Initialization Contract

`photo-wall.js` must be loaded as an ES module from `index.html`, after manifest and segments are fetched:

```javascript
// In index.html — after Promise.all([manifestFetch, segmentsFetch]):
import('./js/photo-wall.js').then(({ PhotoWall }) => {
  window.photoWall = new PhotoWall({
    container: document.getElementById('photo-wall-panel'),
    photos: allPhotos,       // from manifest.json
    segments: tripSegments   // from trip_segments.json
  });
});
```

---

## Performance Contracts

| Metric | Requirement |
|--------|------------|
| Panel snap animation | Completes within 250ms (CSS transition) |
| Grid scroll to targeted date | Visible within 400ms of event receipt |
| DOM nodes in grid at any time | ≤ 100 rendered photo tiles (virtual scroll) |
| Layout computation (all photos) | < 50ms for 600 photos (synchronous, single pass) |
| Thumbnail load | Progressive: placeholder → fade-in when loaded |
