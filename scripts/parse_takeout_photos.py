#!/usr/bin/env python3
"""Parse Google Takeout photo metadata to extract location timeline."""

import argparse
from datetime import datetime
import glob
import json
from pathlib import Path


# Trip date range filter (Jan 27 - Feb 19, 2026)
TRIP_START = datetime(2026, 1, 27, 0, 0, 0)
TRIP_END = datetime(2026, 2, 19, 23, 59, 59)


def parse_timestamp(timestamp_str):
    """Convert Unix timestamp string to datetime object.

    Args:
        timestamp_str: Unix timestamp as string.

    Returns:
        datetime object or None if parsing fails.
    """
    try:
        return datetime.fromtimestamp(int(timestamp_str))
    except (ValueError, TypeError):
        return None


def parse_metadata_file(filepath):
    """Extract location and timestamp from a Google Photos supplemental metadata file.

    Args:
        filepath: Path to the .supplemental-metadata.json file.

    Returns:
        Dict with lat, lng, timestamp, source or None if no valid data.
    """
    try:
        with open(filepath, 'r') as f:
            data = json.load(f)
    except (json.JSONDecodeError, FileNotFoundError):
        return None

    # Extract geo data
    geo_data = data.get('geoData', {})
    lat = geo_data.get('latitude')
    lng = geo_data.get('longitude')

    # Skip if no valid coordinates or null island
    if lat is None or lng is None:
        return None
    if abs(lat) < 0.001 and abs(lng) < 0.001:
        return None

    # Extract photo taken time
    photo_time = data.get('photoTakenTime', {})
    timestamp_str = photo_time.get('timestamp')
    dt = parse_timestamp(timestamp_str)

    if dt is None:
        return None

    # Get source filename from title
    source = data.get('title', Path(filepath).stem.replace('.supplemental-metadata', ''))

    return {
        'lat': round(lat, 6),
        'lng': round(lng, 6),
        'timestamp': dt.isoformat(),
        'source': source
    }


def find_takeout_metadata(base_path):
    """Find all supplemental metadata files in Google Takeout directories.

    Args:
        base_path: Base directory to search (e.g., /home/user/photoMap).

    Returns:
        List of file paths.
    """
    patterns = [
        f'{base_path}/takeout-*/Takeout/Google Photos/**/*.supplemental-metadata.json',
        f'{base_path}/Takeout/Google Photos/**/*.supplemental-metadata.json',
    ]

    files = []
    for pattern in patterns:
        files.extend(glob.glob(pattern, recursive=True))
    return files


def main():
    parser = argparse.ArgumentParser(
        description='Parse Google Takeout photo metadata for location timeline.'
    )
    parser.add_argument(
        '--takeout-dir', default='/home/bgural/photoMap',
        help='Directory containing takeout-* folders (default: /home/bgural/photoMap)'
    )
    parser.add_argument(
        '--output', default='data/takeout_locations.json',
        help='Output JSON path (default: data/takeout_locations.json)'
    )
    parser.add_argument(
        '--no-filter', action='store_true',
        help='Skip date range filtering'
    )
    args = parser.parse_args()

    # Find metadata files
    files = find_takeout_metadata(args.takeout_dir)
    print(f"Found {len(files)} metadata files")

    # Parse each file
    points = []
    for filepath in files:
        point = parse_metadata_file(filepath)
        if point is None:
            continue

        # Filter to trip date range
        if not args.no_filter:
            dt = datetime.fromisoformat(point['timestamp'])
            if dt < TRIP_START or dt > TRIP_END:
                continue

        points.append(point)

    # Sort by timestamp
    points.sort(key=lambda p: p['timestamp'])

    # Deduplicate by source (keep first occurrence)
    seen = set()
    unique_points = []
    for p in points:
        if p['source'] not in seen:
            seen.add(p['source'])
            unique_points.append(p)

    print(f"Extracted {len(unique_points)} location points within trip date range")

    # Write output
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    output_data = {
        'points': unique_points,
        'generated': datetime.now().isoformat(),
        'trip_start': TRIP_START.isoformat(),
        'trip_end': TRIP_END.isoformat()
    }

    with open(output_path, 'w') as f:
        json.dump(output_data, f, indent=2)

    print(f"Written to {output_path}")


if __name__ == '__main__':
    main()
