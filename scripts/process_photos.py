#!/usr/bin/env python3
"""Process geotagged photos: extract EXIF GPS data, generate thumbnails, write manifest."""

import argparse
from datetime import datetime
import json
import math
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ExifTags
from pillow_heif import register_heif_opener

# Register HEIC/HEIF support so Pillow can open .heic files
register_heif_opener()

SUPPORTED_EXTENSIONS = {'.jpg', '.jpeg', '.tif', '.tiff', '.heic', '.heif'}
VIDEO_EXTENSIONS = {'.mp4', '.mov', '.avi', '.mkv', '.webm'}

# Google Drive lh3 proxy base URL
LH3_BASE = 'https://lh3.googleusercontent.com/d/'
LH3_SUFFIX = '=w2400'
DRIVE_FILE_ID_RE = re.compile(r'/d/([a-zA-Z0-9_-]+)')


def derive_web_url(google_photos_url):
    """Derive an lh3.googleusercontent.com URL from a Google Drive share URL.

    Args:
        google_photos_url: A Google Drive URL like
            https://drive.google.com/file/d/FILE_ID/view?usp=drivesdk

    Returns:
        lh3 proxy URL string, or empty string if extraction fails.
    """
    if not google_photos_url:
        return ''
    m = DRIVE_FILE_ID_RE.search(google_photos_url)
    if not m:
        return ''
    return LH3_BASE + m.group(1) + LH3_SUFFIX


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


def is_video(filepath):
    """Check if a file is a video based on extension."""
    return Path(filepath).suffix.lower() in VIDEO_EXTENSIONS


def parse_iso6709(location_str):
    """Parse GPS coordinates from ISO 6709 format.

    Handles formats like '+48.8584+002.2945/' or '+48.8584+002.2945+035.000/'.

    Args:
        location_str: ISO 6709 location string.

    Returns:
        Tuple of (lat, lng) or None if parsing fails.
    """
    if not location_str:
        return None
    # Match signed decimal lat/lng, optional altitude
    m = re.match(r'([+-]\d+\.?\d*)\s*([+-]\d+\.?\d*)', location_str)
    if not m:
        return None
    try:
        lat = float(m.group(1))
        lng = float(m.group(2))
    except ValueError:
        return None
    if abs(lat) < 0.001 and abs(lng) < 0.001:
        return None
    return (lat, lng)


def extract_video_gps(filepath):
    """Extract GPS coordinates from video metadata using ffprobe.

    Looks for com.apple.quicktime.location.ISO6709 or location tags.

    Args:
        filepath: Path to the video file.

    Returns:
        Tuple of (lat, lng) or None.
    """
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', str(filepath)],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            return None
        meta = json.loads(result.stdout)
        tags = meta.get('format', {}).get('tags', {})
        # Try Apple QuickTime location tag first
        loc = tags.get('com.apple.quicktime.location.ISO6709', '')
        if loc:
            return parse_iso6709(loc)
        # Try generic location tag
        loc = tags.get('location', '')
        if loc:
            return parse_iso6709(loc)
    except Exception:
        pass
    return None


def extract_video_date(filepath):
    """Extract creation date from video metadata as YYYY-MM-DD string.

    Args:
        filepath: Path to the video file.

    Returns:
        Date string or empty string.
    """
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', str(filepath)],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            return ''
        meta = json.loads(result.stdout)
        tags = meta.get('format', {}).get('tags', {})
        creation = tags.get('creation_time', '')
        if creation:
            # Typical format: 2026-01-29T19:14:19.000000Z
            return creation[:10]
    except Exception:
        pass
    return ''


def extract_video_datetime(filepath):
    """Extract creation datetime from video metadata as a datetime object.

    Args:
        filepath: Path to the video file.

    Returns:
        datetime object or None.
    """
    try:
        result = subprocess.run(
            ['ffprobe', '-v', 'quiet', '-print_format', 'json', '-show_format', str(filepath)],
            capture_output=True, text=True, timeout=30
        )
        if result.returncode != 0:
            return None
        meta = json.loads(result.stdout)
        tags = meta.get('format', {}).get('tags', {})
        creation = tags.get('creation_time', '')
        if creation:
            # Try parsing ISO format
            for fmt in ('%Y-%m-%dT%H:%M:%S.%fZ', '%Y-%m-%dT%H:%M:%SZ', '%Y-%m-%dT%H:%M:%S'):
                try:
                    return datetime.strptime(creation, fmt)
                except ValueError:
                    continue
    except Exception:
        pass
    return None


def create_video_thumbnail(filepath, thumb_path, thumb_width):
    """Extract a frame from a video to use as thumbnail.

    Uses ffmpeg to grab a frame at 1 second into the video.

    Args:
        filepath: Path to the video file.
        thumb_path: Output path for the thumbnail JPEG.
        thumb_width: Desired width in pixels.
    """
    subprocess.run(
        [
            'ffmpeg', '-y', '-ss', '1', '-i', str(filepath),
            '-vframes', '1',
            '-vf', f'scale={thumb_width}:-1',
            str(thumb_path)
        ],
        capture_output=True, timeout=60
    )
    if not Path(thumb_path).exists():
        # Fallback: try frame at 0s for very short videos
        subprocess.run(
            [
                'ffmpeg', '-y', '-ss', '0', '-i', str(filepath),
                '-vframes', '1',
                '-vf', f'scale={thumb_width}:-1',
                str(thumb_path)
            ],
            capture_output=True, timeout=60
        )


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
    entry['web_url'] = derive_web_url(entry['google_photos_url'])
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

    # Check ffmpeg availability for video support
    has_ffmpeg = shutil.which('ffmpeg') is not None and shutil.which('ffprobe') is not None
    if not has_ffmpeg:
        print("Warning: ffmpeg/ffprobe not found. Videos will be skipped.", file=sys.stderr)

    # Cache setup
    cache_path = data_dir / '.process_cache.json'
    cache = {} if force else load_cache(cache_path)
    existing_manifest = {} if force else load_existing_manifest(output_path)
    new_cache = {}

    # Collect media files (images + videos)
    all_extensions = SUPPORTED_EXTENSIONS | VIDEO_EXTENSIONS
    files = sorted([
        f for f in photo_dir.iterdir()
        if f.is_file() and f.suffix.lower() in all_extensions
    ])

    if not files:
        print("No supported media files found in", photo_dir)
        # Write empty manifest
        with open(output_path, 'w') as f:
            json.dump([], f, indent=2)
        save_cache(cache_path, {})
        return

    skipped = 0
    processed = 0
    interpolated = 0
    no_gps_files = []  # (filepath, image_or_none, exif_or_none, is_vid) for second pass

    # Pass 1: Process files with native GPS, collect GPS references for interpolation
    gps_references = []  # (datetime, lat, lng) sorted later

    for filepath in files:
        filename = filepath.name
        file_is_video = is_video(filepath)

        # Skip videos if ffmpeg not available
        if file_is_video and not has_ffmpeg:
            print(f"  Skipping video (no ffmpeg): {filename}")
            continue

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
            if file_is_video:
                coords = extract_video_gps(filepath)
                dt = extract_video_datetime(filepath)
            else:
                try:
                    image = Image.open(filepath)
                    exif_data = image.getexif()
                    coords = extract_gps(exif_data)
                    dt = extract_datetime(exif_data)
                except Exception:
                    coords = None
                    dt = None
            if coords and dt:
                gps_references.append((dt, coords[0], coords[1]))
            skipped += 1
            continue

        print(f"Processing: {filename}")

        if file_is_video:
            # Video processing path
            coords = extract_video_gps(filepath)
            if coords is None:
                # Defer to pass 2 for GPS interpolation
                no_gps_files.append((filepath, None, None, True))
                continue

            lat, lng = coords
            date = extract_video_date(filepath)

            # Collect GPS reference for interpolation
            dt = extract_video_datetime(filepath)
            if dt:
                gps_references.append((dt, lat, lng))

            # Generate thumbnail from video frame
            thumb_filename = filepath.stem + '.jpg'
            thumb_path = thumb_dir / thumb_filename
            try:
                create_video_thumbnail(filepath, thumb_path, thumb_width)
                if not thumb_path.exists():
                    print(f"  Warning: video thumbnail generation failed for {filename}", file=sys.stderr)
                    continue
            except Exception as e:
                print(f"  Warning: video thumbnail generation failed: {e}", file=sys.stderr)
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
                'web_url': derive_web_url(google_photos_url),
                'type': 'video',
            }
            manifest.append(entry)
            new_cache[filename] = {'mtime': file_mtime, 'size': file_size}
            processed += 1
            print(f"  OK (video): ({lat:.4f}, {lng:.4f}) {date}")
        else:
            # Image processing path
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
                no_gps_files.append((filepath, image, exif_data, False))
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
                'web_url': derive_web_url(google_photos_url),
                'type': 'photo',
            }
            manifest.append(entry)
            new_cache[filename] = {'mtime': file_mtime, 'size': file_size}
            processed += 1
            print(f"  OK: ({lat:.4f}, {lng:.4f}) {date}")

    # Pass 2: Interpolate GPS for media without native coordinates
    gps_references.sort(key=lambda x: x[0])

    for filepath, image, exif_data, file_is_video in no_gps_files:
        filename = filepath.name
        photo_url = f'photos/{filename}'

        if file_is_video:
            dt = extract_video_datetime(filepath)
        else:
            dt = extract_datetime(exif_data)

        if dt is None:
            print(f"  Skipping {filename} (no GPS, no timestamp for interpolation)")
            continue

        match = find_nearest_gps(dt, gps_references)
        if match is None:
            print(f"  Skipping {filename} (no GPS, no nearby reference)")
            continue

        lat, lng, gap = match

        if file_is_video:
            date = extract_video_date(filepath)
        else:
            date = extract_date(exif_data)

        # Generate thumbnail
        thumb_filename = filepath.stem + '.jpg'
        thumb_path = thumb_dir / thumb_filename
        try:
            if file_is_video:
                create_video_thumbnail(filepath, thumb_path, thumb_width)
                if not thumb_path.exists():
                    print(f"  Warning: video thumbnail generation failed for {filename}", file=sys.stderr)
                    continue
            else:
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
            'web_url': derive_web_url(google_photos_url),
            'type': 'video' if file_is_video else 'photo',
        }
        manifest.append(entry)
        stat = filepath.stat()
        new_cache[filename] = {'mtime': stat.st_mtime, 'size': stat.st_size}
        interpolated += 1
        gap_min = int(gap // 60)
        label = 'video, ' if file_is_video else ''
        print(f"  OK (interpolated, {label}{gap_min}m gap): ({lat:.4f}, {lng:.4f}) {date}")

    # Write manifest
    with open(output_path, 'w') as f:
        json.dump(manifest, f, indent=2)

    # Save cache
    save_cache(cache_path, new_cache)

    # Write annotations
    annotations_path = data_dir / 'annotations.json'
    with open(annotations_path, 'w') as f:
        json.dump(annotations, f, indent=2)

    print(f"\nDone: {len(manifest)} entries in manifest ({processed} processed, {interpolated} interpolated, {skipped} cached)")
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
