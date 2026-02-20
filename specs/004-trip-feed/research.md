# Research: Trip Feed / Timeline Sidebar

**Feature**: 004-trip-feed
**Date**: 2026-02-20

## Decision 1: Sidebar Positioning

**Decision**: Right sidebar (280px) that coexists with the left control panel (300px). On viewports below 1280px, opening one auto-collapses the other. On mobile (<=768px), feed becomes a bottom sheet.

**Rationale**: Two 300px sidebars would leave only ~400px for the map on 1024px screens. A slightly narrower right sidebar and a "one-at-a-time" rule for medium screens ensures the map always has adequate space. The existing control panel pattern (fixed position, dark glass, transform-based show/hide) is reused exactly.

**Alternatives considered**:
- Same-width (300px) both sides: Too cramped below 1280px
- Replacing the control panel with a combined feed+controls panel: Would complicate the existing UI and lose the independent control panel
- Tabs within the existing left panel: Would make both feeds and controls harder to use simultaneously on wide screens

## Decision 2: Feed Data Grouping

**Decision**: Build a `dateIndex` lookup object at page load by iterating all photos once. Each key is a date string, each value contains the photos array and the trip segment metadata (city name, color) already stamped on photo objects by `assignPhotosToTripSegments()`.

**Rationale**: O(n) single pass over ~570 photos, runs in <1ms. Reuses the existing city assignment logic. No new data files needed — manifest.json and trip_segments.json already provide everything. When the timeline slider filters photos, the `dateIndex` keys are simply filtered by date range.

**Alternatives considered**:
- Pre-computed JSON file: Unnecessary overhead for 22 dates
- On-demand grouping per render: Wasteful re-computation on every scroll

## Decision 3: Daily Narrative Storage

**Decision**: Single Firestore document `dailyNarratives/all` with date-keyed fields (e.g., `"2026-01-29": { text, updatedAt, updatedBy }`). Mirrors the existing `photoEdits/all` pattern.

**Rationale**: Consistent with the existing 3-document Firestore model. One read on page load. With 22 dates and ~500 chars each, the document is ~13KB (well under Firestore's 1MB limit). The existing offline write queue, `updateDoc` with dot-notation, and optimistic cache patterns all apply directly.

**Alternatives considered**:
- Individual documents per date: More reads, more complex queries, no benefit at this scale
- Storing in photoEdits/all: Mixing concerns; narratives are per-date, not per-photo

## Decision 4: Mobile Bottom Sheet

**Decision**: Three-state bottom sheet (collapsed peek, half, full) using CSS `transform: translateY()` with touch event handling on a drag handle. Snap to nearest state on release.

**Rationale**: GPU-accelerated transforms for smooth 60fps. Three states give the right UX: collapsed shows a handle + peek text, half shows the current entry with map visible, full allows scrolling all entries. No libraries needed — the existing vanilla JS pattern works. The `cubic-bezier(0.22, 1, 0.36, 1)` easing gives a native-feeling spring animation.

**Alternatives considered**:
- Simple show/hide toggle (like existing control panel): Too basic for a scrollable feed
- CSS scroll-snap: Not suitable for sheet-level positioning
- Third-party bottom sheet library: Constitution prohibits frameworks; vendoring a sheet library is overkill

## Decision 5: Feed-to-Map Animation

**Decision**: Compute day bounds from the `dateIndex` photos' lat/lng. Use `map.flyToBounds()` with asymmetric padding (`paddingTopLeft`/`paddingBottomRight`) that accounts for sidebar widths. Single click pans the map; does NOT narrow the timeline slider.

**Rationale**: `flyToBounds` with sidebar-aware padding ensures the map centers on visible space, not hidden-behind-sidebar space. Keeping the timeline slider unchanged on click avoids surprising the user — they can still see all photos and manually narrow the timeline if desired. Single-photo days get artificial bounds (±0.005°) to prevent infinite zoom.

**Alternatives considered**:
- Auto-narrowing the timeline slider on click: Confusing UX, makes it hard to return to the full view
- Using `map.setView()` instead of `flyToBounds()`: Doesn't handle clusters of photos across an area
- Ignoring sidebar widths in padding: Map would center on the full viewport, placing the focus partially behind a sidebar

## Decision 6: Firestore Security Rules

**Decision**: Add a rule for `dailyNarratives/all` matching the existing `photoEdits/all` pattern: public read, editor-only write (checked against `config/app.authorizedEditors`).

**Rationale**: Same security model as all other cloud data. Narratives are visible to everyone (part of the trip story) but only editable by authorized editors.
