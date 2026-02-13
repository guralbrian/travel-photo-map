#!/usr/bin/env python3
"""Process geotagged photos: extract EXIF GPS data, generate thumbnails, write manifest."""

import argparse
import json
import math
import os
import sys
from pathlib import Path

from PIL import Image, ExifTags

SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.tif', '.tiff'}


def dms_to_decimal(dms, ref):
    """Convert GPS DMS (degrees, minutes, seconds) to decimal degrees.

    Args:
        dms: Tuple of (degrees, minutes, seconds) as IFDRational values.
        ref: Hemisphere reference letter ('N', 'S', 'E', 'W').

    Returns:
        Decimal degrees as float, negative for S/W.
    """
    degrees = float(dms[0])
    minutes = float(dms[1])
    seconds = float(dms[2])
    decimal = degrees + minutes / 60.0 + seconds / 3600.0
    if ref in ('S', 'W'):
        decimal = -decimal
    return decimal


def extract_gps(exif_data):
    """Extract GPS coordinates from EXIF data.

    Args:
        exif_data: PIL Image EXIF object.

    Returns:
        Tuple of (lat, lng) or None if no valid GPS data.
    """
    gps_ifd = exif_data.get_ifd(0x8825)
    if not gps_ifd:
        return None

    # GPS tag IDs within the GPSInfo IFD
    GPS_LAT_REF = 1
    GPS_LAT = 2
    GPS_LNG_REF = 3
    GPS_LNG = 4

    if GPS_LAT not in gps_ifd or GPS_LNG not in gps_ifd:
        return None

    lat_ref = gps_ifd.get(GPS_LAT_REF, 'N')
    lat_dms = gps_ifd[GPS_LAT]
    lng_ref = gps_ifd.get(GPS_LNG_REF, 'E')
    lng_dms = gps_ifd[GPS_LNG]

    try:
        lat = dms_to_decimal(lat_dms, lat_ref)
        lng = dms_to_decimal(lng_dms, lng_ref)
    except (TypeError, ValueError, IndexError, ZeroDivisionError):
        return None

    # Skip null island
    if abs(lat) < 0.001 and abs(lng) < 0.001:
        return None

    return (lat, lng)


def extract_date(exif_data):
    """Extract DateTimeOriginal from EXIF and format as YYYY-MM-DD.

    Args:
        exif_data: PIL Image EXIF object.

    Returns:
        Date string or empty string if not found.
    """
    # Tag 36867 = DateTimeOriginal (lives in the Exif IFD 0x8769)
    exif_ifd = exif_data.get_ifd(0x8769)
    date_str = exif_ifd.get(36867, '')

    if not date_str:
        # Fallback: check base EXIF for DateTime (tag 306)
        date_str = exif_data.get(306, '')

    if date_str:
        # EXIF format: "YYYY:MM:DD HH:MM:SS"
        try:
            date_part = date_str.split(' ')[0]
            return date_part.replace(':', '-')
        except (AttributeError, IndexError):
            return ''
    return ''


def create_thumbnail(image, thumb_path, thumb_width):
    """Create a thumbnail with EXIF orientation applied.

    Args:
        image: PIL Image object.
        thumb_path: Output path for the thumbnail.
        thumb_width: Desired width in pixels.
    """
    # Auto-rotate based on EXIF orientation
    try:
        exif = image.getexif()
        orientation = exif.get(274)  # Tag 274 = Orientation
        if orientation:
            rotate_map = {
                3: 180,
                6: 270,
                8: 90,
            }
            if orientation in rotate_map:
                image = image.rotate(rotate_map[orientation], expand=True)
            elif orientation == 2:
                image = image.transpose(Image.FLIP_LEFT_RIGHT)
            elif orientation == 4:
                image = image.transpose(Image.FLIP_TOP_BOTTOM)
            elif orientation == 5:
                image = image.transpose(Image.FLIP_LEFT_RIGHT).rotate(270, expand=True)
            elif orientation == 7:
                image = image.transpose(Image.FLIP_LEFT_RIGHT).rotate(90, expand=True)
    except (AttributeError, KeyError):
        pass

    # Resize preserving aspect ratio
    w, h = image.size
    ratio = thumb_width / w
    thumb_height = int(h * ratio)
    image = image.resize((thumb_width, thumb_height), Image.LANCZOS)

    # Convert to RGB if necessary (e.g., RGBA or palette mode)
    if image.mode not in ('RGB',):
        image = image.convert('RGB')

    image.save(thumb_path, 'JPEG', quality=85)


def load_notes(data_dir):
    """Load optional notes.yaml for captions and tags.

    Args:
        data_dir: Path to the data directory.

    Returns:
        Dict mapping filename to {caption, tags} or empty dict.
    """
    notes_path = data_dir / 'notes.yaml'
    if not notes_path.exists():
        return {}

    try:
        import yaml
        with open(notes_path, 'r') as f:
            notes = yaml.safe_load(f)
        return notes if isinstance(notes, dict) else {}
    except Exception as e:
        print(f"Warning: Could not parse notes.yaml: {e}", file=sys.stderr)
        return {}


def process_photos(photo_dir, thumb_dir, thumb_width, output_path):
    """Process all photos and generate manifest.

    Args:
        photo_dir: Path to directory containing original photos.
        thumb_dir: Path to directory for generated thumbnails.
        thumb_width: Thumbnail width in pixels.
        output_path: Path for the output manifest JSON.
    """
    photo_dir = Path(photo_dir)
    thumb_dir = Path(thumb_dir)
    output_path = Path(output_path)
    data_dir = output_path.parent

    # Ensure output directories exist
    thumb_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)

    notes = load_notes(data_dir)
    manifest = []

    # Collect image files
    files = sorted([
        f for f in photo_dir.iterdir()
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTENSIONS
    ])

    if not files:
        print("No supported image files found in", photo_dir)
        # Write empty manifest
        with open(output_path, 'w') as f:
            json.dump([], f, indent=2)
        return

    for filepath in files:
        filename = filepath.name
        print(f"Processing: {filename}")

        try:
            image = Image.open(filepath)
        except Exception as e:
            print(f"  Skipping (cannot open): {e}", file=sys.stderr)
            continue

        # Extract EXIF
        try:
            exif_data = image.getexif()
        except Exception:
            print(f"  Skipping (no EXIF data)")
            continue

        # Extract GPS
        coords = extract_gps(exif_data)
        if coords is None:
            print(f"  Skipping (no GPS data)")
            continue

        lat, lng = coords

        # Extract date
        date = extract_date(exif_data)

        # Generate thumbnail
        thumb_filename = filepath.stem + '.jpg'
        thumb_path = thumb_dir / thumb_filename
        try:
            create_thumbnail(image.copy(), thumb_path, thumb_width)
        except Exception as e:
            print(f"  Warning: thumbnail generation failed: {e}", file=sys.stderr)
            continue

        # Merge notes
        file_notes = notes.get(filename, {})
        caption = file_notes.get('caption', '')
        tags = file_notes.get('tags', [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(',')]

        entry = {
            'lat': round(lat, 6),
            'lng': round(lng, 6),
            'url': f'photos/{filename}',
            'thumbnail': f'thumbs/{thumb_filename}',
            'caption': caption,
            'date': date,
            'tags': tags,
        }
        manifest.append(entry)
        print(f"  OK: ({lat:.4f}, {lng:.4f}) {date}")

    # Write manifest
    with open(output_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    print(f"\nDone: {len(manifest)} photos written to {output_path}")


def main():
    parser = argparse.ArgumentParser(
        description='Process geotagged photos for the Travel Photo Map.'
    )
    parser.add_argument(
        '--photo-dir', default='photos/',
        help='Directory containing original photos (default: photos/)'
    )
    parser.add_argument(
        '--thumb-dir', default='thumbs/',
        help='Directory for generated thumbnails (default: thumbs/)'
    )
    parser.add_argument(
        '--thumb-width', type=int, default=200,
        help='Thumbnail width in pixels (default: 200)'
    )
    parser.add_argument(
        '--output', default='data/manifest.json',
        help='Output manifest JSON path (default: data/manifest.json)'
    )
    args = parser.parse_args()

    process_photos(args.photo_dir, args.thumb_dir, args.thumb_width, args.output)


if __name__ == '__main__':
    main()
