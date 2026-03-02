# Data Model: Immersive Photo Viewer

**Feature Branch**: `005-photo-viewer` | **Date**: 2026-03-02

## Entities

### Photo Entry (existing — no changes)

The viewer consumes the existing photo object from `manifest.json`, augmented at runtime with trip segment data and cloud edits.

```
Photo Entry
├── lat: number              # GPS latitude (-90 to +90)
├── lng: number              # GPS longitude (-180 to +180)
├── date: string             # "YYYY-MM-DD"
├── datetime: string         # ISO 8601 "YYYY-MM-DDTHH:MM:SS"
├── url: string              # Stable local path "photos/YYYYMMDD_HHMMSS.ext"
├── thumbnail: string        # Firebase Storage thumbnail URL
├── web_url: string          # Google Drive high-res URL
├── type: string             # "photo" | "video"
├── caption: string          # User-added text (may be overridden by cloud edit)
├── tags: string[]           # Tag labels (may be overridden by cloud edit)
├── google_photos_url: string # Direct Google Photos/Drive link
├── cityIndex: number        # Runtime: index into trip_segments (-1 = unmatched)
├── cityName: string         # Runtime: segment name ("London", "Unknown")
├── cityColor: string        # Runtime: hex color ("#E53935")
└── _isFavorite: boolean     # Runtime: set during rebuildPhotoLayer()
```

**Identity**: `url + "|" + lat + "|" + lng` (used as key in `photoIndex`)
**Photo ID** (for cloud operations): filename stem extracted from `url` (e.g., `"20260129_091401"`)

### Viewer State (new)

Internal state managed by the photo viewer module.

```
Viewer State
├── isOpen: boolean           # Whether the viewer overlay is visible
├── photos: Photo[]           # The current navigation set (context-dependent)
├── currentIndex: number      # Index into photos[] (-1 = none)
├── sourceElement: Element    # The DOM element the viewer expanded from (for animation)
│
├── Zoom State
│   ├── scale: number         # Current zoom level (1.0 to 5.0)
│   ├── translateX: number    # Pan offset X in pixels
│   ├── translateY: number    # Pan offset Y in pixels
│   └── MIN_SCALE: 1.0       # Constant
│   └── MAX_SCALE: 5.0       # Constant
│
├── Gesture State (FSM)
│   ├── mode: enum            # IDLE | PINCHING | PANNING | SWIPING_NAV | SWIPING_DISMISS
│   ├── pointers: Map<id, {x, y}>  # Active pointer positions
│   ├── initialDistance: number     # Pinch: initial finger distance
│   ├── initialScale: number       # Pinch: scale at gesture start
│   ├── initialMidpoint: {x, y}    # Pinch: midpoint at gesture start
│   ├── startX: number             # Swipe/Pan: start X
│   ├── startY: number             # Swipe/Pan: start Y
│   ├── startTranslateX: number    # Pan: translate at gesture start
│   └── startTranslateY: number    # Pan: translate at gesture start
│
├── Loading State
│   ├── currentLoaded: boolean       # Whether current photo's full-res is loaded
│   ├── pendingImage: Image | null   # In-flight Image() for current photo
│   ├── preloadPrev: Image | null    # In-flight preload for N-1
│   └── preloadNext: Image | null    # In-flight preload for N+1
│
├── Double-Tap State
│   ├── lastTapTime: number          # Timestamp of last single-tap (for double-tap detection)
│   ├── lastTapX: number             # X position of last single-tap
│   └── lastTapY: number             # Y position of last single-tap
│
└── UI State
    ├── controlsVisible: boolean     # Whether close/info/nav controls are shown
    ├── hideTimer: number | null     # Timeout ID for auto-hide (4000ms)
    └── navGuardUntil: number        # Timestamp until which backdrop clicks are ignored (300ms after nav)
```

### Navigation Context (new concept)

Not a stored entity — a runtime parameter passed to `photoViewer.open()`.

| Entry Point | Photos Array | Source Element |
|-------------|-------------|----------------|
| Map marker click | `filteredPhotos` (current viewport/date filter) | The clicked Leaflet marker's image element |
| Feed thumbnail click | `dateIndex[date].photos` (that day's photos) | The clicked `<img>` thumbnail element |

## State Transitions

### Viewer Lifecycle

```
CLOSED → OPENING → OPEN → CLOSING → CLOSED
         (expand    (viewing,   (shrink
          animation)  navigating) animation)
```

### Gesture FSM

```
         ┌─────────────────────────────────┐
         │              IDLE               │
         └──┬────┬────┬────┬──────────────┘
            │    │    │    │
  2 ptrs    │    │    │    │  1 ptr + zoom>1
    ┌───────▼┐   │    │   ┌▼───────────┐
    │PINCHING│   │    │   │  PANNING   │
    └───┬────┘   │    │   └──────┬─────┘
        │        │    │          │
  all up│   1ptr+│    │1ptr+     │all up
        │  horiz │    │vert      │
        │  ┌─────▼┐  ┌▼──────┐  │
        │  │SWIPE │  │SWIPE  │  │
        │  │ NAV  │  │DISMISS│  │
        │  └──┬───┘  └──┬────┘  │
        │     │          │      │
        ▼     ▼          ▼      ▼
         ┌─────────────────────────┐
         │     IDLE (cleanup)      │
         └─────────────────────────┘
```

All transitions to IDLE trigger: reset gesture-specific state, finalize any in-progress animation.
