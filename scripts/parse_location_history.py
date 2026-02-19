#!/usr/bin/env python3
"""Parse Google Location History export to generate timeline.json for the map.

Creates timeline.json with activity segments (paths) and place visits.
Supports an overrides file for correcting inaccuracies.
"""

import argparse
from datetime import datetime
import json
import re
import sys
from pathlib import Path

import yaml


# Trip date range filter (Jan 27 - Feb 19, 2026)
TRIP_START = datetime(2026, 1, 27, 0, 0, 0)
TRIP_END = datetime(2026, 2, 19, 23, 59, 59)

# Map Google activity types to our normalized types
ACTIVITY_TYPE_MAP = {
    'walking': 'WALKING',
    'running': 'RUNNING',
    'cycling': 'CYCLING',
    'in passenger vehicle': 'DRIVING',
    'in vehicle': 'DRIVING',
    'driving': 'DRIVING',
    'in bus': 'TRANSIT',
    'in train': 'TRANSIT',
    'in subway': 'TRANSIT',
    'in tram': 'TRANSIT',
    'in ferry': 'TRANSIT',
    'flying': 'FLYING',
    'skiing': 'SKIING',
    'sailing': 'SAILING',
    'motorcycling': 'DRIVING',
}


def parse_geo_string(geo_str):
    """Parse 'geo:lat,lng' string to (lat, lng) tuple.

    Args:
        geo_str: String like 'geo:51.5074,-0.1278'

    Returns:
        Tuple of (lat, lng) floats, or None if parsing fails.
    """
    if not geo_str or not geo_str.startswith('geo:'):
        return None
    try:
        coords = geo_str[4:].split(',')
        return (float(coords[0]), float(coords[1]))
    except (ValueError, IndexError):
        return None


def parse_timestamp(ts_str):
    """Parse ISO timestamp string to datetime.

    Args:
        ts_str: ISO format timestamp string.

    Returns:
        datetime object or None.
    """
    if not ts_str:
        return None
    try:
        # Handle various ISO formats
        # Remove colon in timezone offset for Python < 3.11 compatibility
        ts_str = re.sub(r'([+-]\d{2}):(\d{2})$', r'\1\2', ts_str)
        for fmt in [
            '%Y-%m-%dT%H:%M:%S.%f%z',
            '%Y-%m-%dT%H:%M:%S%z',
            '%Y-%m-%dT%H:%M:%S.%fZ',
            '%Y-%m-%dT%H:%M:%SZ',
        ]:
            try:
                return datetime.strptime(ts_str, fmt)
            except ValueError:
                continue
        return None
    except Exception:
        return None


def normalize_activity_type(activity_type):
    """Normalize Google activity type to our standard types.

    Args:
        activity_type: Raw activity type string from Google.

    Returns:
        Normalized activity type string.
    """
    if not activity_type:
        return 'UNKNOWN'
    lower = activity_type.lower().strip()
    return ACTIVITY_TYPE_MAP.get(lower, 'UNKNOWN')


def load_overrides(overrides_path):
    """Load manual overrides from YAML file.

    Override file format:
    ```yaml
    exclude:
      - id: "2026-01-28T10:00:00"  # Exclude by start time
      - start: "2026-01-29T08:00:00"
        end: "2026-01-29T09:00:00"  # Exclude time range

    modify:
      - match:
          start: "2026-01-28T14:30:00"
        set:
          activity: "WALKING"  # Override activity type
          exclude: false

    add_segments:
      - start: "2026-01-30T10:00:00"
        end: "2026-01-30T11:00:00"
        activity: "FLYING"
        points: [[51.5, -0.1], [55.6, 12.5]]
    ```

    Args:
        overrides_path: Path to overrides YAML file.

    Returns:
        Dict with override rules.
    """
    if not overrides_path.exists():
        return {'exclude': [], 'modify': [], 'add_segments': []}

    try:
        with open(overrides_path, 'r') as f:
            data = yaml.safe_load(f)
        if not isinstance(data, dict):
            return {'exclude': [], 'modify': [], 'add_segments': []}
        return {
            'exclude': data.get('exclude', []),
            'modify': data.get('modify', []),
            'add_segments': data.get('add_segments', []),
        }
    except Exception as e:
        print(f"Warning: Could not load overrides: {e}", file=sys.stderr)
        return {'exclude': [], 'modify': [], 'add_segments': []}


def should_exclude(entry, start_dt, overrides):
    """Check if an entry should be excluded based on overrides.

    Args:
        entry: The raw entry from location history.
        start_dt: Parsed start datetime.
        overrides: Loaded overrides dict.

    Returns:
        True if entry should be excluded.
    """
    start_str = entry.get('startTime', '')

    exclude_rules = overrides.get('exclude') or []
    for rule in exclude_rules:
        # Match by exact start time
        if 'id' in rule and start_str.startswith(rule['id']):
            return True

        # Match by time range
        if 'start' in rule and 'end' in rule:
            range_start = parse_timestamp(rule['start'])
            range_end = parse_timestamp(rule['end'])
            if range_start and range_end and start_dt:
                # Make timezone-naive for comparison
                start_naive = start_dt.replace(tzinfo=None) if start_dt.tzinfo else start_dt
                range_start_naive = range_start.replace(tzinfo=None) if range_start.tzinfo else range_start
                range_end_naive = range_end.replace(tzinfo=None) if range_end.tzinfo else range_end
                if range_start_naive <= start_naive <= range_end_naive:
                    return True

    return False


def apply_modifications(entry, activity_type, start_dt, overrides):
    """Apply any modifications from overrides.

    Args:
        entry: The raw entry.
        activity_type: Current activity type.
        start_dt: Parsed start datetime.
        overrides: Loaded overrides dict.

    Returns:
        Modified activity type (or original if no match).
    """
    start_str = entry.get('startTime', '')

    modify_rules = overrides.get('modify') or []
    for rule in modify_rules:
        match = rule.get('match', {})

        # Match by start time prefix
        if 'start' in match and start_str.startswith(match['start']):
            set_rules = rule.get('set', {})
            if 'activity' in set_rules:
                activity_type = set_rules['activity']
            if set_rules.get('exclude'):
                return None  # Signal to exclude

    return activity_type


def parse_location_history(input_path, overrides):
    """Parse Google Location History JSON file.

    Args:
        input_path: Path to location-history.json.
        overrides: Loaded overrides dict.

    Returns:
        Tuple of (segments_list, places_list).
    """
    with open(input_path, 'r') as f:
        data = json.load(f)

    if not isinstance(data, list):
        print("Error: Expected JSON array", file=sys.stderr)
        return [], []

    segments = []
    places = []

    for entry in data:
        start_str = entry.get('startTime', '')
        end_str = entry.get('endTime', '')

        start_dt = parse_timestamp(start_str)
        end_dt = parse_timestamp(end_str)

        # Filter to trip date range
        if start_dt:
            start_naive = start_dt.replace(tzinfo=None) if start_dt.tzinfo else start_dt
            if start_naive < TRIP_START or start_naive > TRIP_END:
                continue

        # Check exclusions
        if should_exclude(entry, start_dt, overrides):
            continue

        # Process activity (travel) entries
        if 'activity' in entry:
            activity = entry['activity']

            raw_type = activity.get('topCandidate', {}).get('type', '')
            activity_type = normalize_activity_type(raw_type)

            # Apply modifications
            activity_type = apply_modifications(entry, activity_type, start_dt, overrides)
            if activity_type is None:
                continue  # Excluded by modification rule

            start_coords = parse_geo_string(activity.get('start'))
            end_coords = parse_geo_string(activity.get('end'))

            if start_coords and end_coords:
                segment = {
                    'activity': activity_type,
                    'start': start_str,
                    'end': end_str,
                    'points': [
                        [start_coords[0], start_coords[1]],
                        [end_coords[0], end_coords[1]]
                    ],
                    'distance_m': activity.get('distanceMeters'),
                    'probability': activity.get('probability'),
                    'raw_type': raw_type,  # Keep for debugging/editing
                }
                segments.append(segment)

        # Process visit (place) entries
        elif 'visit' in entry:
            visit = entry['visit']
            top_candidate = visit.get('topCandidate', {})

            coords = parse_geo_string(top_candidate.get('placeLocation'))
            if coords:
                place = {
                    'lat': coords[0],
                    'lng': coords[1],
                    'start': start_str,
                    'end': end_str,
                    'name': top_candidate.get('semanticType', ''),
                    'placeId': top_candidate.get('placeID', ''),
                    'probability': visit.get('probability'),
                }
                places.append(place)

    # Add manual segments from overrides
    add_segments = overrides.get('add_segments') or []
    for seg in add_segments:
        segments.append({
            'activity': seg.get('activity', 'UNKNOWN'),
            'start': seg.get('start', ''),
            'end': seg.get('end', ''),
            'points': seg.get('points', []),
            'manual': True,
        })

    # Sort by start time
    segments.sort(key=lambda x: x.get('start', ''))
    places.sort(key=lambda x: x.get('start', ''))

    return segments, places


def create_default_overrides(output_path):
    """Create a default overrides template file.

    Args:
        output_path: Path to write the template.
    """
    template = """# Location History Overrides
# Use this file to correct inaccuracies in the parsed location data.

# Exclude entries by start time or time range
exclude:
  # - id: "2026-01-28T10:00:00"  # Exclude entry starting at this time
  # - start: "2026-01-29T08:00:00"
  #   end: "2026-01-29T09:00:00"  # Exclude all entries in this range

# Modify entries (change activity type, etc.)
modify:
  # - match:
  #     start: "2026-01-28T14:30"  # Prefix match on start time
  #   set:
  #     activity: "WALKING"  # Override to: WALKING, DRIVING, CYCLING, TRANSIT, FLYING, etc.

# Manually add segments (e.g., flights not detected)
add_segments:
  # - start: "2026-01-30T10:00:00"
  #   end: "2026-01-30T11:30:00"
  #   activity: "FLYING"
  #   points: [[51.5074, -0.1278], [55.6761, 12.5683]]  # London to Copenhagen

# Activity type reference:
# WALKING  - green (#4CAF50)
# RUNNING  - light green (#8BC34A)
# CYCLING  - orange (#FF9800)
# DRIVING  - blue (#2196F3)
# TRANSIT  - purple (#9C27B0) - bus, train, subway, tram, ferry
# FLYING   - red (#F44336)
# SKIING   - cyan (#00BCD4)
# SAILING  - indigo (#3F51B5)
# UNKNOWN  - gray (#9E9E9E)
"""
    with open(output_path, 'w') as f:
        f.write(template)
    print(f"Created overrides template: {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description='Parse Google Location History to generate timeline.json'
    )
    parser.add_argument(
        '--input', default='data/location-history.json',
        help='Input location history JSON file (default: data/location-history.json)'
    )
    parser.add_argument(
        '--output', default='data/timeline.json',
        help='Output timeline JSON file (default: data/timeline.json)'
    )
    parser.add_argument(
        '--overrides', default='data/location_overrides.yaml',
        help='Overrides YAML file for corrections (default: data/location_overrides.yaml)'
    )
    parser.add_argument(
        '--create-overrides', action='store_true',
        help='Create a template overrides file and exit'
    )
    parser.add_argument(
        '--no-filter', action='store_true',
        help='Skip date range filtering (include all data)'
    )
    parser.add_argument(
        '--dump-raw', action='store_true',
        help='Also output raw parsed data for debugging'
    )
    args = parser.parse_args()

    # Handle date filtering
    global TRIP_START, TRIP_END
    if args.no_filter:
        TRIP_START = datetime(1970, 1, 1)
        TRIP_END = datetime(2100, 1, 1)

    overrides_path = Path(args.overrides)

    # Create template if requested
    if args.create_overrides:
        create_default_overrides(overrides_path)
        return

    # Create overrides template if it doesn't exist
    if not overrides_path.exists():
        create_default_overrides(overrides_path)

    # Load overrides
    overrides = load_overrides(overrides_path)

    # Parse location history
    input_path = Path(args.input)
    if not input_path.exists():
        print(f"Error: Input file not found: {input_path}", file=sys.stderr)
        sys.exit(1)

    print(f"Parsing {input_path}...")
    segments, places = parse_location_history(input_path, overrides)

    print(f"Found {len(segments)} activity segments, {len(places)} place visits")

    # Activity type breakdown
    type_counts = {}
    for seg in segments:
        t = seg.get('activity', 'UNKNOWN')
        type_counts[t] = type_counts.get(t, 0) + 1
    print("Activity breakdown:")
    for t, count in sorted(type_counts.items()):
        print(f"  {t}: {count}")

    # Write output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    timeline_data = {
        'segments': segments,
        'places': places,
        'generated': datetime.now().isoformat(),
    }

    with open(output_path, 'w') as f:
        json.dump(timeline_data, f, indent=2)

    print(f"Written to {output_path}")

    # Dump raw data if requested
    if args.dump_raw:
        raw_path = output_path.with_suffix('.raw.json')
        with open(raw_path, 'w') as f:
            json.dump({'segments': segments, 'places': places}, f, indent=2)
        print(f"Raw data written to {raw_path}")


if __name__ == '__main__':
    main()
