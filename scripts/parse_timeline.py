#!/usr/bin/env python3
"""Parse Google Takeout Semantic Location History into timeline.json.

Reads monthly JSON files from Google Takeout and extracts:
- Activity segments (travel paths with waypoints)
- Place visits (time spent at locations)

Output is used by the Travel Photo Map frontend to render travel paths
and visited places as overlays on the Leaflet map.

Usage:
    python scripts/parse_timeline.py \
        --takeout-dir ~/Takeout/Location\ History/Semantic\ Location\ History \
        --output data/timeline.json \
        [--start 2026-01-28] [--end 2026-02-08] \
        [--simplify 0.0001]
"""

import argparse
import json
import math
import os
import sys
from datetime import datetime
from pathlib import Path


def e7_to_decimal(value):
    """Convert E7 coordinate format to decimal degrees.

    Args:
        value: Integer in E7 format (e.g., 515202940 for 51.5202940).

    Returns:
        Float decimal degrees.
    """
    return value / 1e7


def parse_timestamp(ts_str):
    """Parse ISO 8601 timestamp string to datetime.

    Args:
        ts_str: Timestamp string (e.g., '2026-01-28T10:00:00.000Z').

    Returns:
        datetime object or None.
    """
    if not ts_str:
        return None
    # Handle various formats from Takeout
    for fmt in ('%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%SZ',
                '%Y-%m-%dT%H:%M:%S.%f%z', '%Y-%m-%dT%H:%M:%S%z'):
        try:
            return datetime.strptime(ts_str, fmt)
        except ValueError:
            continue
    return None


def format_timestamp(dt):
    """Format datetime to ISO 8601 UTC string.

    Args:
        dt: datetime object.

    Returns:
        ISO 8601 string.
    """
    if dt is None:
        return ''
    return dt.strftime('%Y-%m-%dT%H:%M:%SZ')


def douglas_peucker(points, tolerance):
    """Simplify a polyline using the Douglas-Peucker algorithm.

    Args:
        points: List of [lat, lng] pairs.
        tolerance: Maximum perpendicular distance threshold.

    Returns:
        Simplified list of [lat, lng] pairs.
    """
    if len(points) <= 2:
        return points

    # Find the point with the maximum distance from the line start-end
    start = points[0]
    end = points[-1]
    max_dist = 0
    max_idx = 0

    for i in range(1, len(points) - 1):
        dist = perpendicular_distance(points[i], start, end)
        if dist > max_dist:
            max_dist = dist
            max_idx = i

    if max_dist > tolerance:
        left = douglas_peucker(points[:max_idx + 1], tolerance)
        right = douglas_peucker(points[max_idx:], tolerance)
        return left[:-1] + right
    else:
        return [start, end]


def perpendicular_distance(point, line_start, line_end):
    """Calculate perpendicular distance from a point to a line segment.

    Args:
        point: [lat, lng] of the point.
        line_start: [lat, lng] of line start.
        line_end: [lat, lng] of line end.

    Returns:
        Distance in coordinate units.
    """
    dx = line_end[0] - line_start[0]
    dy = line_end[1] - line_start[1]

    if dx == 0 and dy == 0:
        # Line start and end are the same point
        return math.sqrt((point[0] - line_start[0]) ** 2 +
                         (point[1] - line_start[1]) ** 2)

    t = ((point[0] - line_start[0]) * dx + (point[1] - line_start[1]) * dy) / (dx * dx + dy * dy)
    t = max(0, min(1, t))

    proj_x = line_start[0] + t * dx
    proj_y = line_start[1] + t * dy

    return math.sqrt((point[0] - proj_x) ** 2 + (point[1] - proj_y) ** 2)


def extract_point(location):
    """Extract lat/lng from a Takeout location object.

    Handles both E7 format and direct decimal format.

    Args:
        location: Dict with latitudeE7/longitudeE7 or latLng/lat/lng fields.

    Returns:
        [lat, lng] list or None.
    """
    if not location:
        return None

    # E7 format (most common in Takeout)
    lat_e7 = location.get('latitudeE7')
    lng_e7 = location.get('longitudeE7')
    if lat_e7 is not None and lng_e7 is not None:
        lat = e7_to_decimal(lat_e7)
        lng = e7_to_decimal(lng_e7)
        if abs(lat) < 0.001 and abs(lng) < 0.001:
            return None
        return [round(lat, 6), round(lng, 6)]

    # Direct decimal format
    lat = location.get('lat') or location.get('latitude')
    lng = location.get('lng') or location.get('longitude')
    if lat is not None and lng is not None:
        return [round(float(lat), 6), round(float(lng), 6)]

    # Nested latLng format
    lat_lng = location.get('latLng')
    if lat_lng:
        return extract_point(lat_lng)

    return None


def extract_waypoints(segment):
    """Extract waypoints from an activity segment.

    Tries waypointPath first, falls back to start/end locations.

    Args:
        segment: Activity segment dict from Takeout.

    Returns:
        List of [lat, lng] pairs.
    """
    points = []

    # Start location
    start_loc = segment.get('startLocation')
    start_pt = extract_point(start_loc)
    if start_pt:
        points.append(start_pt)

    # Waypoints from waypointPath
    waypoint_path = segment.get('waypointPath', {})
    waypoints = waypoint_path.get('waypoints', [])
    for wp in waypoints:
        pt = extract_point(wp)
        if pt:
            points.append(pt)

    # Simplified path (alternative format)
    simplified = segment.get('simplifiedRawPath', {})
    raw_points = simplified.get('points', [])
    for rp in raw_points:
        pt = extract_point(rp)
        if pt:
            points.append(pt)

    # End location
    end_loc = segment.get('endLocation')
    end_pt = extract_point(end_loc)
    if end_pt:
        points.append(end_pt)

    return points


def parse_activity_type(activity_type):
    """Normalize activity type string.

    Args:
        activity_type: Raw activity type from Takeout (e.g., 'IN_PASSENGER_VEHICLE').

    Returns:
        Normalized activity string for display.
    """
    mapping = {
        'WALKING': 'WALKING',
        'ON_FOOT': 'WALKING',
        'RUNNING': 'RUNNING',
        'CYCLING': 'CYCLING',
        'ON_BICYCLE': 'CYCLING',
        'IN_PASSENGER_VEHICLE': 'DRIVING',
        'IN_VEHICLE': 'DRIVING',
        'DRIVING': 'DRIVING',
        'IN_BUS': 'TRANSIT',
        'IN_TRAIN': 'TRANSIT',
        'IN_TRAM': 'TRANSIT',
        'IN_SUBWAY': 'TRANSIT',
        'IN_FERRY': 'TRANSIT',
        'FLYING': 'FLYING',
        'IN_FLIGHT': 'FLYING',
        'MOTORCYCLING': 'DRIVING',
        'SKIING': 'SKIING',
        'SAILING': 'SAILING',
        'BOATING': 'SAILING',
    }
    return mapping.get(activity_type, activity_type or 'UNKNOWN')


def parse_duration(duration_obj):
    """Extract start/end timestamps from a Takeout duration object.

    Args:
        duration_obj: Dict with startTimestamp/endTimestamp or
                      startTimestampMs/endTimestampMs.

    Returns:
        Tuple of (start_dt, end_dt) datetime objects (may be None).
    """
    if not duration_obj:
        return None, None

    start_str = duration_obj.get('startTimestamp') or duration_obj.get('startTimestampMs')
    end_str = duration_obj.get('endTimestamp') or duration_obj.get('endTimestampMs')

    start_dt = parse_timestamp(start_str) if isinstance(start_str, str) else None
    end_dt = parse_timestamp(end_str) if isinstance(end_str, str) else None

    return start_dt, end_dt


def in_date_range(dt, start_date, end_date):
    """Check if a datetime falls within a date range.

    Args:
        dt: datetime to check.
        start_date: Inclusive start date (or None).
        end_date: Inclusive end date (or None).

    Returns:
        True if dt is within range.
    """
    if dt is None:
        return True  # Include items without timestamps
    d = dt.date() if hasattr(dt, 'date') else dt
    if start_date and d < start_date:
        return False
    if end_date and d > end_date:
        return False
    return True


def parse_takeout_file(filepath):
    """Parse a single Takeout Semantic Location History JSON file.

    Args:
        filepath: Path to a monthly JSON file (e.g., 2026_JANUARY.json).

    Returns:
        List of timeline objects from the file.
    """
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        print(f"  Warning: Could not parse {filepath.name}: {e}", file=sys.stderr)
        return []

    return data.get('timelineObjects', [])


def process_takeout(takeout_dir, start_date=None, end_date=None, simplify_tolerance=None):
    """Process all Takeout Semantic Location History files.

    Args:
        takeout_dir: Path to the Semantic Location History directory.
        start_date: Optional start date filter.
        end_date: Optional end date filter.
        simplify_tolerance: Douglas-Peucker tolerance (None to skip simplification).

    Returns:
        Dict with 'segments' and 'places' lists.
    """
    takeout_dir = Path(takeout_dir)
    segments = []
    places = []

    # Find all JSON files (may be in year subdirectories or flat)
    json_files = sorted(takeout_dir.rglob('*.json'))

    if not json_files:
        print(f"No JSON files found in {takeout_dir}", file=sys.stderr)
        return {'segments': [], 'places': []}

    print(f"Found {len(json_files)} timeline file(s)")

    for filepath in json_files:
        timeline_objects = parse_takeout_file(filepath)
        if not timeline_objects:
            continue

        file_segments = 0
        file_places = 0

        for obj in timeline_objects:
            # Activity segments (travel paths)
            activity = obj.get('activitySegment')
            if activity:
                duration = activity.get('duration', {})
                start_dt, end_dt = parse_duration(duration)

                if not in_date_range(start_dt, start_date, end_date):
                    continue

                points = extract_waypoints(activity)
                if len(points) < 2:
                    continue

                if simplify_tolerance and len(points) > 2:
                    points = douglas_peucker(points, simplify_tolerance)

                activity_type = parse_activity_type(activity.get('activityType'))

                segment = {
                    'activity': activity_type,
                    'start': format_timestamp(start_dt),
                    'end': format_timestamp(end_dt),
                    'points': points,
                }
                segments.append(segment)
                file_segments += 1

            # Place visits
            visit = obj.get('placeVisit')
            if visit:
                duration = visit.get('duration', {})
                start_dt, end_dt = parse_duration(duration)

                if not in_date_range(start_dt, start_date, end_date):
                    continue

                location = visit.get('location', {})
                point = extract_point(location)
                if not point:
                    continue

                name = location.get('name', '')
                address = location.get('address', '')

                place = {
                    'name': name,
                    'address': address,
                    'lat': point[0],
                    'lng': point[1],
                    'start': format_timestamp(start_dt),
                    'end': format_timestamp(end_dt),
                }
                places.append(place)
                file_places += 1

        if file_segments or file_places:
            print(f"  {filepath.name}: {file_segments} segments, {file_places} places")

    # Sort by start time
    segments.sort(key=lambda s: s.get('start', ''))
    places.sort(key=lambda p: p.get('start', ''))

    return {'segments': segments, 'places': places}


def main():
    parser = argparse.ArgumentParser(
        description='Parse Google Takeout Semantic Location History into timeline.json.'
    )
    parser.add_argument(
        '--takeout-dir', required=True,
        help='Path to Semantic Location History directory from Google Takeout'
    )
    parser.add_argument(
        '--output', default='data/timeline.json',
        help='Output timeline JSON path (default: data/timeline.json)'
    )
    parser.add_argument(
        '--start',
        help='Start date filter (YYYY-MM-DD)'
    )
    parser.add_argument(
        '--end',
        help='End date filter (YYYY-MM-DD)'
    )
    parser.add_argument(
        '--simplify', type=float, default=None,
        help='Douglas-Peucker simplification tolerance (e.g., 0.0001). '
             'Reduces point count for smoother rendering.'
    )
    args = parser.parse_args()

    takeout_dir = Path(args.takeout_dir)
    if not takeout_dir.is_dir():
        print(f"Error: {takeout_dir} is not a directory", file=sys.stderr)
        sys.exit(1)

    start_date = None
    end_date = None
    if args.start:
        try:
            start_date = datetime.strptime(args.start, '%Y-%m-%d').date()
        except ValueError:
            print(f"Error: Invalid start date '{args.start}'. Use YYYY-MM-DD.", file=sys.stderr)
            sys.exit(1)
    if args.end:
        try:
            end_date = datetime.strptime(args.end, '%Y-%m-%d').date()
        except ValueError:
            print(f"Error: Invalid end date '{args.end}'. Use YYYY-MM-DD.", file=sys.stderr)
            sys.exit(1)

    print(f"Parsing Takeout data from: {takeout_dir}")
    if start_date:
        print(f"  Start date: {start_date}")
    if end_date:
        print(f"  End date: {end_date}")
    if args.simplify:
        print(f"  Simplification tolerance: {args.simplify}")

    result = process_takeout(takeout_dir, start_date, end_date, args.simplify)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w') as f:
        json.dump(result, f, indent=2)

    print(f"\nDone: {len(result['segments'])} segments, {len(result['places'])} places")
    print(f"Output: {output_path}")


if __name__ == '__main__':
    main()
