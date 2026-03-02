# Data Model: Smart Route Lines

**Feature Branch**: `007-smart-route-lines` | **Date**: 2026-03-02

## Overview

This feature introduces no new persistent data. All route computation happens client-side at render time using existing data sources. The data model below describes the runtime entities created during route calculation.

## Existing Data Sources (Read-Only)

### Photo Entry (from `data/manifest.json`)

| Field | Type | Used By Route Builder |
|-------|------|----------------------|
| `lat` | number (nullable) | Yes — GPS latitude for waypoint calculation |
| `lng` | number (nullable) | Yes — GPS longitude for waypoint calculation |
| `datetime` | string (ISO 8601) | Yes — chronological ordering and time-gap clustering |
| `date` | string (YYYY-MM-DD) | Fallback if `datetime` missing |
| `url` | string | No |
| `thumbnail` | string | No |
| `caption` | string | No |
| `tags` | string[] | No |
| `type` | string | No |

**Validation**: Photos with `lat === null`, `lng === null`, or missing `datetime` are excluded from route calculations.

### Trip Segment (from `data/trip_segments.json`)

| Field | Type | Used By Route Builder |
|-------|------|----------------------|
| `name` | string | Yes — route popup labels |
| `start` | string (ISO 8601) | Yes — segment boundary for transit detection |
| `end` | string (ISO 8601) | Yes — segment boundary for transit detection |
| `color` | string (hex) | Yes — route line color |
| `lat` | number | Yes — city centroid as route start/end point |
| `lng` | number | Yes — city centroid as route start/end point |

## Runtime Entities (Computed, Not Persisted)

### PhotoCluster

A group of chronologically and spatially adjacent photos merged into a single geographic point.

| Field | Type | Description |
|-------|------|-------------|
| `lat` | number | Centroid latitude (mean of cluster member latitudes) |
| `lng` | number | Centroid longitude (mean of cluster member longitudes) |
| `datetime` | string | Earliest datetime in the cluster (for ordering) |
| `count` | number | Number of photos in the cluster |

**Identity**: Clusters are ephemeral — recomputed on each page load. No unique ID needed.

**Creation rule**: Sequential photos within 15 km distance AND 4 hours time gap are merged into the same cluster.

### SmartRoute

An ordered sequence of waypoints representing the travel path between two adjacent trip segments.

| Field | Type | Description |
|-------|------|-------------|
| `from` | TripSegment | Origin city segment |
| `to` | TripSegment | Destination city segment |
| `waypoints` | LatLng[] | Ordered coordinates: [origin centroid, ...intermediate points, destination centroid] |
| `color` | string | Inherited from `from.color` |

**Lifecycle**:
1. Created during initial map render (after manifest + segments load)
2. Used to construct `L.polyline` and arrow markers
3. Added to `travelRouteLayer` (L.layerGroup)
4. Discarded after rendering (polylines hold the data)

**Waypoint count constraint**: Maximum 15 waypoints per route after simplification (per SC-002).

## Entity Relationships

```
TripSegment[N] ──── SmartRoute ──── TripSegment[N+1]
                        │
                    waypoints[]
                        │
                  PhotoCluster[]
                        │
                    Photo[] (from manifest.json)
```

## State Transitions

No state machines. Routes are computed once during page load and rendered as static map layers. The only state change is visibility (toggle on/off via existing checkbox).
