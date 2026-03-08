# Data Model: Fix Mobile Navigation UX

**Feature**: 012-fix-mobile-nav-ux | **Date**: 2026-03-08

This feature is purely UI/UX — no persistent data model changes. This document describes the runtime state entities.

## Panel State

Each bottom panel maintains the following runtime state:

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `currentState` | string | `hidden`, `collapsed`, `half`, `full` | Current snap state of the panel |
| `isActive` | boolean | `true`, `false` | Whether this panel is the currently active (visible) panel on mobile |

### State Transitions

```
hidden ──(toggle button tap)──→ collapsed
collapsed ──(drag up / swipe up)──→ half
half ──(drag up / swipe up)──→ full
full ──(drag down / swipe down)──→ half
half ──(drag down / swipe down)──→ collapsed
collapsed ──(swipe down fast)──→ hidden
any ──(close button tap)──→ hidden
hidden ──(other panel closes + this is default)──→ collapsed
```

### Panel Exclusivity (Mobile Only)

At most one panel can have `isActive === true` on viewports < 768px. When Panel A becomes active, Panel B must transition to `hidden`.

## Panel Coordinator

Lightweight event-driven coordinator, not a persistent entity.

| Event | Detail | Description |
|-------|--------|-------------|
| `panel:activate` | `{ panel: 'photo-wall' \| 'trip-feed' }` | Request to make a panel active |
| `panel:deactivate` | `{ panel: 'photo-wall' \| 'trip-feed' }` | Panel has been hidden |
| `photo-wall:state-changed` | `{ state: string }` | Existing event, preserved |
| `trip-feed:state-changed` | `{ state: string }` | New event, mirrors Photo Wall pattern |

## Toggle Buttons

| Field | Type | Description |
|-------|------|-------------|
| `panelId` | string | Which panel this button controls (`photo-wall` or `trip-feed`) |
| `visible` | boolean | Shown when the associated panel is NOT the active panel |
| `label` | string | Button text: "Photos" or "Feed" |
