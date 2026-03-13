# Data Model: Selective Renderer Cleanup (DOM Builders)

**Feature Branch**: `017-dom-builders`
**Date**: 2026-03-11

## Overview

This feature introduces no new data entities or persistence. It refactors rendering code from string-based HTML construction to DOM API construction. The data model describes the **module interface** of the new DOM helper utility.

## DOM Helper Module Interface

### `window.domHelpers`

Global namespace for the helper module. Exposed as an ES5-compatible IIFE.

#### `el(tag, attrs, ...children)` → `HTMLElement`

Creates an HTML element with attributes and children.

| Parameter  | Type                            | Required | Description                                     |
| ---------- | ------------------------------- | -------- | ----------------------------------------------- |
| `tag`      | `string`                        | Yes      | HTML tag name (e.g., `'div'`, `'span'`, `'img'`)  |
| `attrs`    | `object` or `null`              | Yes      | Element attributes/properties (see below)        |
| `children` | `Node` or `string` (variadic)  | No       | Child nodes or strings (strings become text nodes) |

**Attrs object keys**:
- Standard DOM properties: `className`, `id`, `title`, `href`, `src`, `alt`, `type`, etc.
- `style`: object of CSS properties (e.g., `{color: '#fff', fontSize: '14px'}`)
- `dataset`: object of data attributes (e.g., `{date: '2024-01-15'}` → `data-date="2024-01-15"`)
- Event listeners: `onclick`, `onload`, `onblur`, etc. — assigned as element properties
- Boolean attributes: `controls`, `allowfullscreen`, etc.

#### `text(str)` → `Text`

Creates a safe text node. Returns `document.createTextNode(str)`.

| Parameter | Type     | Required | Description        |
| --------- | -------- | -------- | ------------------ |
| `str`     | `string` | Yes      | Text content       |

## Existing Data Structures (Read-Only, No Changes)

### Photo Object (from `data/manifest.json`)
Fields used by popup renderer: `type`, `web_url`, `url`, `thumbnail`, `caption`, `date`, `tags`, `google_photos_url`, `lat`, `lng`

### Annotation Object (from `data/annotations.json`)
Fields used by annotation popup: `lat`, `lng`, `title`, `text`, `date`

### Date Index Entry (from `TripModel.getDateIndex()`)
Fields used by feed builder: `photos[]`, `segmentName`, `segmentColor`

### Daily Narrative (from `cloudData.getDailyNarrative()`)
Returns: plain text string for a given date
