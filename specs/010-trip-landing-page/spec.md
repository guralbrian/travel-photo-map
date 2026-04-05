# Feature Specification: Trip Landing Page

**Feature Branch**: `010-trip-landing-page`
**Created**: 2026-03-06
**Status**: Draft
**Input**: User description: "Add a landing page that orients friends and family to the trip with a full-page stats intro that transitions to a region card grid, where cards flip open to show leg summaries, itineraries, maps, and photos."

## Clarifications

### Session 2026-03-06

- Q: Detail view presentation style? → A: Full-page takeover — card animates to fill the viewport, grid is hidden behind it.
- Q: Region summary content source? → A: Hand-authored — short summary per region written by the user, stored as a new field in itinerary.json.
- Q: Card visual content? → A: Hero photo background — each card uses a representative photo picked by the user, stored in itinerary.json.
- Q: Navigation model between landing page and map? → A: Same page, show/hide — landing page and map live in the same HTML; transitioning hides one, shows the other.
- Q: Photo display format in detail view? → A: Thumbnail grid — compact grid of photo thumbnails, scrollable if many.

### Session 2026-03-07

- Q: What happens when user closes the photo viewer opened from a region detail thumbnail? → A: Return to region detail view — the detail stays open behind the viewer.
- Q: What should happen to the "+N more" overflow button now that thumbnails open the viewer? → A: Keep it as a "View on map" shortcut only — navigates to the map zoomed to that region.
- Q: How should the landing page build the photo array for the viewer? → A: Filter manifest.json photos by region date range — same source the map uses, ensuring format compatibility.

### Session 2026-04-04

- Q: When should the detail map begin background loading? → A: During intro animation — the map instance and photo data pre-initialize while the 3.5s intro plays, so it is ready before users reach the card grid.
- Q: What happens when user taps a photo cluster on the detail map? → A: Open photo viewer — same behavior as the main map, tapping a cluster opens the immersive photo viewer at that photo.
- Q: How much vertical space should the detail map occupy? → A: ~50% viewport height — balanced split giving substantial map interaction area while leaving room to scroll to other content sections.
- Q: How to resolve scroll vs. map drag conflict on mobile? → A: Two-finger to pan map — single-finger scrolls the detail view; two-finger gesture pans/zooms the map, with a "Use two fingers to move the map" overlay hint.
- Q: Can users pan/zoom the detail map beyond the region? → A: Yes, but panning too far beyond the region's photo bounds triggers a prompt to switch to fullscreen main map view with all photos — a natural escalation from region preview to full experience.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Trip Stats Intro Screen (Priority: P1)

A first-time visitor arrives at the site and sees a full-page, cinematic introduction screen displaying the headline stats of the trip: "42 days, 8 regions, and 5 countries." This immediately sets the scale and excitement of the journey. After a brief pause, the screen transitions smoothly to reveal the region card grid.

**Why this priority**: This is the entry point and first impression. Without it, the landing page has no hook. It orients visitors to the scope of the trip before they start exploring.

**Independent Test**: Can be fully tested by loading the site URL and observing the intro animation. Delivers immediate emotional context about the trip.

**Acceptance Scenarios**:

1. **Given** a visitor loads the site for the first time, **When** the page finishes loading, **Then** a full-page intro screen appears displaying "42 days, 8 regions, and 5 countries" in large, readable text.
2. **Given** the intro screen is visible, **When** a short delay passes (approximately 3-4 seconds) or the user taps/clicks/scrolls, **Then** the screen transitions smoothly to reveal the region card grid.
3. **Given** a returning visitor loads the site, **When** the page finishes loading, **Then** the intro screen still appears (no skip-on-return behavior for this foundation version).

---

### User Story 2 - Region Card Grid (Priority: P1)

After the intro transition, the visitor sees a full-page grid of evenly sized, visually striking cards — one per region. Each card shows the region name and dates at a glance. The grid layout is balanced and attractive, giving a birds-eye overview of the full trip structure.

**Why this priority**: This is the core navigation surface of the landing page. It replaces the current compact region grid with a full-page, visually rich experience that invites exploration.

**Independent Test**: Can be fully tested by navigating past the intro screen and verifying all 8 region cards are visible, evenly sized, and display correct names and date ranges.

**Acceptance Scenarios**:

1. **Given** the intro screen has transitioned away, **When** the region grid is visible, **Then** all 8 regions are displayed as evenly sized cards in a balanced grid layout.
2. **Given** the region grid is visible on a desktop screen, **When** looking at the grid, **Then** cards are arranged in a visually appealing layout (e.g., 4x2 or similar) with consistent sizing.
3. **Given** the region grid is visible on a mobile screen, **When** looking at the grid, **Then** cards stack or reflow appropriately to remain readable and tappable (e.g., 2-column or single-column).
4. **Given** any card in the grid, **When** viewing it, **Then** it displays the region name and the date range for that leg.

---

### User Story 3 - Region Card Detail View (Priority: P1)

When a visitor clicks or taps a region card, it "flips out" (expands with an engaging animation) into a full-page takeover that fills the viewport, hiding the card grid behind it. This expanded view shows: a hand-authored plain-language summary of that trip leg, a list of places visited and when, a map showing the location, and a compact thumbnail grid of the photos from that leg.

**Why this priority**: This is the payoff — the reason the cards exist. Without this, the cards are decorative but non-functional.

**Independent Test**: Can be fully tested by clicking a region card and verifying the expanded view contains all four content sections with correct data.

**Acceptance Scenarios**:

1. **Given** the region card grid is visible, **When** the visitor clicks a region card, **Then** the card expands with a smooth animation into a full-page takeover that fills the viewport and hides the card grid.
2. **Given** a region detail view is open, **When** looking at the content, **Then** it displays a plain-language summary describing that leg of the trip.
3. **Given** a region detail view is open, **When** looking at the content, **Then** it includes a list of places visited with corresponding dates.
4. **Given** a region detail view is open, **When** looking at the content, **Then** it displays an interactive map with photo clusters centered on that region, supporting pan/zoom/pinch. The map responds instantly (no loading delay) because it was pre-initialized during the intro animation.
5. **Given** a region detail view is open, **When** looking at the content, **Then** it shows a compact, scrollable thumbnail grid of the photos taken during that leg of the trip.
5a. **Given** a region detail view is open, **When** the visitor clicks a photo thumbnail, **Then** the immersive photo viewer opens showing that photo with the ability to navigate through the region's photos.
5b. **Given** the photo viewer was opened from a region detail thumbnail, **When** the visitor closes the photo viewer, **Then** they return to the region detail view which remains in its expanded state.
6. **Given** a region detail view is open, **When** the visitor clicks a close/back control, **Then** the full-page takeover collapses and the card grid is restored with a smooth animation.

---

### User Story 4 - Transition to Full Map Experience (Priority: P2)

The visitor can navigate from the landing page into the full interactive map experience (the existing app). This ensures the landing page serves as an entry point, not a dead end.

**Why this priority**: Important for site cohesion, but the landing page has standalone value even without this transition.

**Independent Test**: Can be tested by locating and clicking the "Explore the map" (or equivalent) control from the landing page and verifying the full map app loads.

**Acceptance Scenarios**:

1. **Given** the visitor is on the landing page (either card grid or detail view), **When** they click a clearly visible control to enter the full map, **Then** the landing page is hidden and the existing interactive map experience is revealed within the same page.
2. **Given** the visitor is viewing a region detail, **When** they click a "view on map" control within the detail, **Then** the landing page is hidden and the map is revealed, zoomed to that region.

---

### Edge Cases

- What happens if a region has no photos yet? The detail view shows the summary, places/dates, and map, but the photo section displays a graceful "No photos yet" message.
- What happens on very slow connections? The intro screen and card grid load first (text/layout); photos load progressively in card details.
- What happens if the browser window is resized while viewing? The grid reflows and detail views adjust to the new viewport.
- What happens if a visitor navigates directly to a URL hash/deep link? For this foundation version, deep linking is not supported — the landing page always starts from the intro.
- What happens when a mobile user single-finger drags the detail map? The detail view scrolls normally (map does not pan). A "Use two fingers to move the map" overlay hint appears briefly on the first attempt, then dismisses.
- What happens when the user pans the detail map far from the region? A prompt appears offering to switch to the fullscreen main map with all photos. Accepting transitions smoothly; dismissing the prompt lets the user continue panning freely.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST display a full-page intro screen on load showing "42 days, 8 regions, and 5 countries" as the primary headline.
- **FR-002**: The intro screen MUST transition to the region card grid either automatically after a brief delay (3-4 seconds) or when the user interacts (click, tap, or scroll).
- **FR-003**: The region card grid MUST display exactly 8 cards, one per trip region, all with equal visual sizing.
- **FR-004**: Each region card MUST display the region name and date range.
- **FR-005**: Each card MUST display a user-selected hero photo as its background image, creating a visually striking grid.
- **FR-006**: Clicking a region card MUST trigger an animated expansion ("flip out") into a full-page takeover that fills the viewport and hides the card grid.
- **FR-007**: The detail view MUST include a hand-authored, plain-language summary of that trip leg (stored as a dedicated field per region in the itinerary data).
- **FR-008**: The detail view MUST include a list of places visited with dates.
- **FR-009**: The detail view MUST include an interactive map displaying the region's photo clusters (using ViewportSampler with the same tier-based markers as the main map). The map MUST support pan, zoom, and pinch gestures consistent with the main map's interaction rules.
- **FR-009a**: A hidden Leaflet map instance MUST begin pre-initializing (tiles, manifest data, ViewportSampler) during the intro animation so that the detail map is interactive immediately when a card opens.
- **FR-009b**: Tapping a photo cluster marker on the detail map MUST open the immersive photo viewer (`window.photoViewer.open`) at the tapped photo, consistent with the main map's click behavior. Closing the viewer MUST return to the detail view.
- **FR-009c**: The detail map MUST occupy approximately 50% of the viewport height, providing a balanced layout with scrollable content (summary, places/dates, photos) above or below.
- **FR-009d**: On mobile, the detail map MUST require a two-finger gesture to pan/zoom (single-finger scrolls the detail view). A dismissible "Use two fingers to move the map" overlay hint MUST appear on the first single-finger drag attempt. On desktop, standard click-drag panning and scroll-wheel zoom MUST work normally.
- **FR-009e**: The detail map MUST start fitted to the region's photo bounds. If the user pans or zooms such that the viewport moves significantly beyond the region's photo extent, a prompt MUST appear offering to switch to the fullscreen main map view with all photos loaded. Accepting the prompt closes the detail view and reveals the main map at the current viewport position.
- **FR-010**: The detail view MUST display photos from that trip leg as a compact, scrollable thumbnail grid.
- **FR-010a**: Clicking a photo thumbnail in the detail view MUST open the existing immersive photo viewer (`window.photoViewer.open`) with the region's photo array, starting at the clicked photo. Closing the viewer MUST return the user to the region detail view (detail remains expanded).
- **FR-010b**: When a region has more than 30 photos, the overflow button MUST read "View on map" (not "+N more") and navigate to the map view zoomed to that region.
- **FR-011**: The detail view MUST provide a way to close/collapse back to the card grid.
- **FR-012**: The landing page MUST provide a clear way to navigate into the full interactive map experience via a same-page show/hide transition (landing hides, map reveals).
- **FR-013**: The landing page MUST be responsive across desktop (1440px+) and mobile (375px+) viewports.
- **FR-014**: The landing page MUST be the default entry point when visitors load the site (replaces the current direct-to-map load).

### Key Entities

- **Region**: A named leg of the trip with a date range, geographic center, daily itinerary, associated photos, a hand-authored summary, and a user-selected hero photo. There are 8 regions: UK - London, Copenhagen Pt. 01, Baden-Wurttemberg, Munich, Prague, Dresden / Meissen, Berlin / Hamburg, Copenhagen Pt. 02.
- **Trip Summary**: The aggregate stats for the entire trip: 42 days, 8 regions, 5 countries.
- **Region Detail**: The expanded content for a single region — includes a narrative summary, place/date list, map view, and photo collection.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of first-time visitors see the trip stats intro before any other content.
- **SC-002**: All 8 region cards render with equal sizing and correct names/dates within 2 seconds of the intro transition completing.
- **SC-003**: Clicking any region card opens its detail view with all 4 content sections (summary, places/dates, map, photos) within 1 second.
- **SC-004**: The landing page is fully usable on both desktop (1440px) and mobile (375px) without horizontal scrolling or overlapping elements.
- **SC-005**: A visitor can navigate from the landing page to the full map experience in 1 click/tap.
- **SC-006**: The intro-to-grid transition and card expand/collapse animations are smooth (no visible jank or flicker).

## Assumptions

- The trip stats ("42 days, 8 regions, 5 countries") are treated as fixed content for this version, not dynamically calculated.
- Each region will have a hand-authored plain-language summary stored as a new `summary` field per region in `itinerary.json`. The user will write these (~2-3 sentences each).
- Each region will have a user-selected hero photo stored as a new `heroPhoto` field per region in `itinerary.json`, referencing a photo from that leg's date range.
- This is a "foundation" version intended to be built upon. Features like deep linking, skip-intro for returning visitors, and richer card content are deferred to future iterations.
- The existing map experience remains fully intact and accessible from the landing page via a same-page show/hide transition (both coexist in the same HTML document).
