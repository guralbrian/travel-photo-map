# Implementation Plan: Selective Renderer Cleanup (DOM Builders)

**Branch**: `017-dom-builders` | **Date**: 2026-03-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/017-dom-builders/spec.md`

## Summary

Replace four string-built HTML renderers in `js/app.js` with safe DOM-construction equivalents powered by a new `js/dom-helpers.js` utility module. This eliminates XSS risk from unescaped user-editable text (captions, tags, annotation titles, narrative content) by using text nodes instead of HTML string interpolation. The refactoring is purely internal — visual output and behavior remain identical.

## Technical Context

**Language/Version**: Vanilla JavaScript (ES5-compatible IIFEs)
**Primary Dependencies**: Leaflet.js 1.9.4 (vendored), no new dependencies
**Storage**: N/A — reads existing JSON manifests at runtime
**Testing**: Manual browser verification + Playwright screenshots at desktop (1440px) and mobile (375px)
**Target Platform**: Static web (GitHub Pages), all modern browsers
**Project Type**: Single-page web application (no build step)
**Performance Goals**: No measurable regression — DOM construction via DocumentFragment keeps reflow count the same as innerHTML
**Constraints**: ES5-compatible, no new external dependencies, visually identical output
**Scale/Scope**: 4 renderers in 1 file (`js/app.js`), 1 new utility file (`js/dom-helpers.js`), 1 HTML change (`index.html` script tag)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
| --------- | ------ | ----- |
| I. Privacy by Default | PASS | No new data collection, no external scripts, no analytics |
| II. Static & Zero-Config | PASS | No server-side processing, no API keys, pure static JS |
| III. Approachable by Everyone | PASS | No user-facing changes — visual output identical |
| IV. Professional Visual Polish | PASS | No visual changes — same markup, classes, and styles |
| V. Performant at Any Scale | PASS | DOM construction via fragment is equivalent to innerHTML for reflow; no regression |
| VI. Unified Media Experience | PASS | Photo/video popup structure preserved identically |
| VII. Map-Centric Integration | PASS | All rendering stays on the map surface, no new pages/views |

**Technology Constraints**:
- Plain HTML, vanilla JS, CSS — PASS (no framework, no build step)
- New dependency vendored into `js/` — PASS (`dom-helpers.js` is project code, not an external dep)
- ES5-compatible — PASS (IIFE pattern, no arrow functions/const/let)

**Post-Phase 1 Re-check**: All principles still satisfied. No data model changes, no new surfaces, no behavior changes.

## Project Structure

### Documentation (this feature)

```text
specs/017-dom-builders/
├── plan.md              # This file
├── research.md          # Phase 0: codebase research findings
├── data-model.md        # Phase 1: DOM helper interface spec
├── quickstart.md        # Phase 1: implementation guide
├── contracts/
│   └── dom-helpers-api.md  # Phase 1: helper module contract
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
js/
├── dom-helpers.js       # NEW — DOM builder utility (el, text)
├── app.js               # MODIFIED — 4 renderers refactored
├── leaflet.js           # UNCHANGED — Leaflet 1.9.4
├── Leaflet.Photo.js     # UNCHANGED
├── ViewportSampler.js   # UNCHANGED
├── route-builder.js     # UNCHANGED
├── app-state.js         # UNCHANGED
├── photo-viewer.js      # UNCHANGED
├── panel-manager.js     # UNCHANGED
├── photo-wall.js        # UNCHANGED
├── trip-model.js        # UNCHANGED
├── region-nav.js        # UNCHANGED
└── landing-page.js      # UNCHANGED

index.html               # MODIFIED — add dom-helpers.js script tag
```

**Structure Decision**: Flat `js/` directory matches existing project layout. Single new file added alongside existing modules.

## Detailed Design

### 1. DOM Helper Module (`js/dom-helpers.js`)

ES5-compatible IIFE exposing `window.domHelpers` with two functions:

**`el(tag, attrs, ...children)`** — Creates an HTMLElement. Handles:
- `className` → `element.className`
- `style` (object) → merge into `element.style`
- `dataset` (object) → merge into `element.dataset`
- `on*` keys → assign as event handler properties
- Boolean attrs (`controls`, `allowfullscreen`) → `setAttribute`
- All other attrs → `setAttribute(key, value)`
- String children → auto-wrapped as text nodes
- Falsy children (null, undefined, false) → skipped (enables conditional rendering)

**`text(str)`** — Returns `document.createTextNode(str)`. The core safety mechanism.

### 2. Photo Popup Refactor (`createPopupElement`)

Replace `buildPopupHTML()` (app.js:80-112) with `createPopupElement()` that returns an `HTMLElement`:
- Media section: `el('img', {...})` or `el('iframe', {...})` or `el('video', {controls: true}, el('source', {...}))`
- Caption: `el('p', {className: 'popup-caption'}, text(caption))` — text node, not string interpolation
- Tags: `el('div', {className: 'popup-tags'}, ...tags.map(t => el('span', {className: 'popup-tag'}, text(t))))`
- Date: `el('p', {className: 'popup-date'}, text(photo.date))`
- Google Photos link: `el('a', {href: url, target: '_blank', rel: 'noopener noreferrer', className: 'photo-link'}, text('View on Google Photos'))`

Note: This function is currently dead code (photo viewer replaced popups) but remains as a safe reference implementation.

### 3. Annotation Popup Refactor

Replace inline string builder (app.js:308-312) with DOM construction:
```
var popup = el('div', {className: 'annotation-popup'},
    ann.title ? el('strong', null, text(ann.title)) : null,
    ann.date ? el('br', null) : null,
    ann.date ? el('span', {className: 'annotation-date'}, text(ann.date)) : null,
    ann.text ? el('p', null, text(ann.text)) : null
);
marker.bindPopup(popup);
```

Falsy child skipping enables the same conditional field rendering as the current `if` checks.

### 4. Feed Entry Refactor (`buildFeed`)

Replace string concatenation (app.js:407-450) with DOM construction:
- Build each entry as a DOM node tree using `el()`
- Collect entries in a `DocumentFragment` for single-reflow insertion
- Replace inline `onload="this.classList.add('loaded')"` with `{onload: function() { this.classList.add('loaded'); }}`
- Attach click listeners during creation instead of post-hoc `querySelectorAll` wiring
- Set `feedEntries.innerHTML = ''` then `feedEntries.appendChild(fragment)`

### 5. Narrative Slot Refactor (`renderFeedNarratives`)

Replace innerHTML pattern (app.js:559-575) with DOM construction:
- Clear slot: `slot.textContent = ''` (or `while (slot.firstChild) slot.removeChild(slot.firstChild)`)
- Narrative text: `slot.appendChild(el('p', {className: 'feed-narrative', dataset: isEditor ? {date: date} : {}}, text(narrativeText)))`
- Add note prompt: `slot.appendChild(el('span', {className: 'feed-add-note', dataset: {date: date}}, text('Add note...')))`
- Remove `_escapeHtml()` helper (app.js:577-581) since text nodes handle escaping inherently

### 6. Script Loading

Add to `index.html` after Leaflet, before utility modules:
```html
<script src="js/dom-helpers.js"></script>
```
Position: after `Leaflet.Photo.js`, before `ViewportSampler.js` (between current lines ~92 and ~94).
