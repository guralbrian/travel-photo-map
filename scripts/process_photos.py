#!/usr/bin/env python3
"""Process geotagged photos: extract EXIF GPS data, generate thumbnails, write manifest."""

import argparse
from datetime import datetime
import json
import math
import os
import sys
from pathlib import Path

from PIL import Image, ExifTags
from pillow_heif import register_heif_opener

# Register HEIC/HEIF support so Pillow can open .heic files
register_heif_opener()

SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.tif', '.tiff', '.heic', '.heif'}


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


def extract_datetime(exif_data):
    """Extract full DateTimeOriginal as a datetime object.

    Args:
        exif_data: PIL Image EXIF object.

    Returns:
        datetime object or None if not found/parseable.
    """
    exif_ifd = exif_data.get_ifd(0x8769)
    date_str = exif_ifd.get(36867, '')
    if not date_str:
        date_str = exif_data.get(306, '')
    if date_str:
        try:
            return datetime.strptime(date_str, '%Y:%m:%d %H:%M:%S')
        except (ValueError, AttributeError):
            pass
    return None


def find_nearest_gps(dt, gps_references, max_gap_seconds=7200):
    """Find the nearest geotagged photo by timestamp.

    Args:
        dt: datetime of the photo without GPS.
        gps_references: List of (datetime, lat, lng) sorted by datetime.
        max_gap_seconds: Maximum time gap to allow interpolation (default 2h).

    Returns:
        Tuple of (lat, lng, gap_seconds) or None if no match within threshold.
    """
    best = None
    best_gap = float('inf')
    for ref_dt, lat, lng in gps_references:
        gap = abs((ref_dt - dt).total_seconds())
        if gap < best_gap:
            best_gap = gap
            best = (lat, lng, gap)
    if best and best_gap <= max_gap_seconds:
        return best
    return None


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
    """Load optional notes.yaml for captions, tags, and annotations.

    Supports both old flat format (filename -> metadata) and new format
    with 'photos' and 'annotations' top-level keys.

    Args:
        data_dir: Path to the data directory.

    Returns:
        Tuple of (photo_notes_dict, annotations_list).
    """
    notes_path = data_dir / 'notes.yaml'
    if not notes_path.exists():
        return {}, []

    try:
        import yaml
        with open(notes_path, 'r') as f:
            notes = yaml.safe_load(f)
        if not isinstance(notes, dict):
            return {}, []

        # New format: has 'photos' and/or 'annotations' top-level keys
        if 'photos' in notes or 'annotations' in notes:
            photo_notes = notes.get('photos', {})
            if not isinstance(photo_notes, dict):
                photo_notes = {}
            annotations = notes.get('annotations', [])
            if not isinstance(annotations, list):
                annotations = []
            return photo_notes, annotations

        # Old flat format: entire dict is filename -> metadata
        return notes, []
    except Exception as e:
        print(f"Warning: Could not parse notes.yaml: {e}", file=sys.stderr)
        return {}, []


def load_cache(cache_path):
    """Load the processing cache file.

    Args:
        cache_path: Path to .process_cache.json.

    Returns:
        Dict mapping filename to {mtime, size}.
    """
    if not cache_path.exists():
        return {}
    try:
        with open(cache_path, 'r') as f:
            return json.load(f)
    except Exception:
        return {}


def save_cache(cache_path, cache):
    """Write the processing cache file.

    Args:
        cache_path: Path to .process_cache.json.
        cache: Dict mapping filename to {mtime, size}.
    """
    with open(cache_path, 'w') as f:
        json.dump(cache, f, indent=2)


def load_existing_manifest(output_path):
    """Load existing manifest.json into a dict keyed by url.

    Args:
        output_path: Path to manifest.json.

    Returns:
        Dict mapping photo url (e.g. 'photos/IMG_001.HEIC') to manifest entry.
    """
    if not output_path.exists():
        return {}
    try:
        with open(output_path, 'r') as f:
            entries = json.load(f)
        return {e['url']: e for e in entries}
    except Exception:
        return {}


def merge_notes_into_entry(entry, notes, filename):
    """Re-apply notes.yaml fields onto a cached manifest entry.

    Args:
        entry: Existing manifest entry dict (will be mutated).
        notes: Photo notes dict from notes.yaml.
        filename: The photo filename key.

    Returns:
        Updated entry.
    """
    file_notes = notes.get(filename, {})
    entry['caption'] = file_notes.get('caption', '')
    tags = file_notes.get('tags', [])
    if isinstance(tags, str):
        tags = [t.strip() for t in tags.split(',')]
    entry['tags'] = tags
    entry['google_photos_url'] = file_notes.get('google_photos_url', '')
    return entry


def process_photos(photo_dir, thumb_dir, thumb_width, output_path, force=False):
    """Process all photos and generate manifest.

    Args:
        photo_dir: Path to directory containing original photos.
        thumb_dir: Path to directory for generated thumbnails.
        thumb_width: Thumbnail width in pixels.
        output_path: Path for the output manifest JSON.
        force: If True, bypass cache and reprocess everything.
    """
    photo_dir = Path(photo_dir)
    thumb_dir = Path(thumb_dir)
    output_path = Path(output_path)
    data_dir = output_path.parent

    # Ensure output directories exist
    thumb_dir.mkdir(parents=True, exist_ok=True)
    data_dir.mkdir(parents=True, exist_ok=True)

    notes, annotations = load_notes(data_dir)
    manifest = []

    # Cache setup
    cache_path = data_dir / '.process_cache.json'
    cache = {} if force else load_cache(cache_path)
    existing_manifest = {} if force else load_existing_manifest(output_path)
    new_cache = {}

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
        save_cache(cache_path, {})
        return

    skipped = 0
    processed = 0
    interpolated = 0
    no_gps_files = []  # (filepath, image, exif_data) for second pass

    # Pass 1: Process files with native GPS, collect GPS references for interpolation
    gps_references = []  # (datetime, lat, lng) sorted later

    for filepath in files:
        filename = filepath.name
        stat = filepath.stat()
        file_mtime = stat.st_mtime
        file_size = stat.st_size

        # Check cache: skip if file unchanged and already in manifest
        cached_entry = cache.get(filename)
        photo_url = f'photos/{filename}'
        if (not force
                and cached_entry
                and cached_entry.get('mtime') == file_mtime
                and cached_entry.get('size') == file_size
                and photo_url in existing_manifest):
            # Reuse cached entry but re-merge notes for caption/tag changes
            entry = existing_manifest[photo_url].copy()
            entry = merge_notes_into_entry(entry, notes, filename)
            manifest.append(entry)
            new_cache[filename] = {'mtime': file_mtime, 'size': file_size}
            # Still add to GPS references for interpolation
            try:
                image = Image.open(filepath)
                exif_data = image.getexif()
                coords = extract_gps(exif_data)
                dt = extract_datetime(exif_data)
                if coords and dt:
                    gps_references.append((dt, coords[0], coords[1]))
            except Exception:
                pass
            skipped += 1
            continue

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
            # Defer to pass 2 for GPS interpolation
            no_gps_files.append((filepath, image, exif_data))
            continue

        lat, lng = coords
        date = extract_date(exif_data)

        # Collect GPS reference for interpolation
        dt = extract_datetime(exif_data)
        if dt:
            gps_references.append((dt, lat, lng))

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
        google_photos_url = file_notes.get('google_photos_url', '')

        entry = {
            'lat': round(lat, 6),
            'lng': round(lng, 6),
            'url': photo_url,
            'thumbnail': f'thumbs/{thumb_filename}',
            'caption': caption,
            'date': date,
            'tags': tags,
            'google_photos_url': google_photos_url,
        }
        manifest.append(entry)
        new_cache[filename] = {'mtime': file_mtime, 'size': file_size}
        processed += 1
        print(f"  OK: ({lat:.4f}, {lng:.4f}) {date}")

    # Pass 2: Interpolate GPS for photos without native coordinates
    gps_references.sort(key=lambda x: x[0])

    for filepath, image, exif_data in no_gps_files:
        filename = filepath.name
        photo_url = f'photos/{filename}'
        dt = extract_datetime(exif_data)
        if dt is None:
            print(f"  Skipping {filename} (no GPS, no timestamp for interpolation)")
            continue

        match = find_nearest_gps(dt, gps_references)
        if match is None:
            print(f"  Skipping {filename} (no GPS, no nearby reference photo)")
            continue

        lat, lng, gap = match
        date = extract_date(exif_data)

        # Generate thumbnail
        thumb_filename = filepath.stem + '.jpg'
        thumb_path = thumb_dir / thumb_filename
        try:
            create_thumbnail(image.copy(), thumb_path, thumb_width)
        except Exception as e:
            print(f"  Warning: thumbnail generation failed for {filename}: {e}", file=sys.stderr)
            continue

        # Merge notes
        file_notes = notes.get(filename, {})
        caption = file_notes.get('caption', '')
        tags = file_notes.get('tags', [])
        if isinstance(tags, str):
            tags = [t.strip() for t in tags.split(',')]
        google_photos_url = file_notes.get('google_photos_url', '')

        entry = {
            'lat': round(lat, 6),
            'lng': round(lng, 6),
            'url': photo_url,
            'thumbnail': f'thumbs/{thumb_filename}',
            'caption': caption,
            'date': date,
            'tags': tags,
            'google_photos_url': google_photos_url,
        }
        manifest.append(entry)
        stat = filepath.stat()
        new_cache[filename] = {'mtime': stat.st_mtime, 'size': stat.st_size}
        interpolated += 1
        gap_min = int(gap // 60)
        print(f"  OK (interpolated, {gap_min}m gap): ({lat:.4f}, {lng:.4f}) {date}")

    # Write manifest
    with open(output_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    # Save cache
    save_cache(cache_path, new_cache)

    # Write annotations
    annotations_path = data_dir / 'annotations.json'
    with open(annotations_path, 'w') as f:
        json.dump(annotations, f, indent=2)

    print(f"\nDone: {len(manifest)} photos in manifest ({processed} processed, {interpolated} interpolated, {skipped} cached)")
    if annotations:
        print(f"  {len(annotations)} annotations written to {annotations_path}")


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
    parser.add_argument(
        '--force', action='store_true',
        help='Bypass cache and reprocess all photos'
    )
    args = parser.parse_args()

    process_photos(args.photo_dir, args.thumb_dir, args.thumb_width, args.output, args.force)


if __name__ == '__main__':
    main()
