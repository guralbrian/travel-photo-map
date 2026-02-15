#!/usr/bin/env python3
"""Sync photos from a shared Google Drive folder to local photos/ directory.

Downloads new images, records Drive shareable links in data/notes.yaml,
and tracks sync state to avoid re-downloading.

Requires:
    pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib

One-time setup:
    1. Create Google Cloud project, enable Drive API
    2. Create OAuth 2.0 credentials (Desktop app), download credentials.json
    3. Run: python scripts/sync_google_drive.py --setup
"""

import argparse
import json
import os
import sys
from pathlib import Path

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
IMAGE_MIMETYPES = {
    'image/jpeg', 'image/png', 'image/tiff', 'image/heic', 'image/heif',
    'image/webp', 'image/bmp',
}
VIDEO_MIMETYPES = {
    'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
    'video/x-matroska',
}
MEDIA_MIMETYPES = IMAGE_MIMETYPES | VIDEO_MIMETYPES
# Drive API also uses these for Google-native formats
EXPORT_MIMETYPES = {
    'image/jpeg',
}


def authenticate(credentials_file, token_file):
    """Authenticate with Google Drive API using OAuth 2.0.

    Args:
        credentials_file: Path to OAuth client secrets file.
        token_file: Path to saved token file.

    Returns:
        google.oauth2.credentials.Credentials object.
    """
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials
    from google_auth_oauthlib.flow import InstalledAppFlow

    creds = None
    if os.path.exists(token_file):
        creds = Credentials.from_authorized_user_file(token_file, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(credentials_file):
                print(f"Error: {credentials_file} not found.", file=sys.stderr)
                print("Download OAuth credentials from Google Cloud Console.", file=sys.stderr)
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(credentials_file, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(token_file, 'w') as f:
            f.write(creds.to_json())
        print(f"Token saved to {token_file}")

    return creds


def build_service(creds):
    """Build Google Drive API service.

    Args:
        creds: Authenticated credentials.

    Returns:
        googleapiclient.discovery.Resource for Drive v3.
    """
    from googleapiclient.discovery import build
    return build('drive', 'v3', credentials=creds)


def list_drive_media(service, folder_id):
    """List all image and video files in a Google Drive folder.

    Args:
        service: Drive API service.
        folder_id: Google Drive folder ID.

    Returns:
        List of dicts with id, name, mimeType, modifiedTime, size, webContentLink.
    """
    media = []
    page_token = None
    query = f"'{folder_id}' in parents and trashed = false"

    while True:
        response = service.files().list(
            q=query,
            spaces='drive',
            fields='nextPageToken, files(id, name, mimeType, modifiedTime, size, webContentLink)',
            pageToken=page_token,
            pageSize=1000,
        ).execute()

        for f in response.get('files', []):
            if f.get('mimeType') in MEDIA_MIMETYPES:
                media.append(f)

        page_token = response.get('nextPageToken')
        if not page_token:
            break

    return media


def load_sync_cache(cache_path):
    """Load sync cache tracking previously downloaded files.

    Args:
        cache_path: Path to .drive_sync_cache.json.

    Returns:
        Dict mapping filename to {drive_id, modified_time, size}.
    """
    if not cache_path.exists():
        return {}
    try:
        with open(cache_path, 'r') as f:
            return json.load(f)
    except Exception:
        return {}


def save_sync_cache(cache_path, cache):
    """Save sync cache.

    Args:
        cache_path: Path to .drive_sync_cache.json.
        cache: Dict mapping filename to sync metadata.
    """
    cache_path.parent.mkdir(parents=True, exist_ok=True)
    with open(cache_path, 'w') as f:
        json.dump(cache, f, indent=2)


def download_file(service, file_id, dest_path):
    """Download a file from Google Drive.

    Args:
        service: Drive API service.
        file_id: Google Drive file ID.
        dest_path: Local destination path.
    """
    from googleapiclient.http import MediaIoBaseDownload
    import io

    request = service.files().get_media(fileId=file_id)
    with open(dest_path, 'wb') as f:
        downloader = MediaIoBaseDownload(f, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()


def get_shareable_link(service, file_id):
    """Get or create a shareable link for a Drive file.

    Args:
        service: Drive API service.
        file_id: Google Drive file ID.

    Returns:
        Shareable URL string, or empty string on failure.
    """
    try:
        file_meta = service.files().get(
            fileId=file_id,
            fields='webViewLink'
        ).execute()
        return file_meta.get('webViewLink', '')
    except Exception:
        return ''


def load_notes_yaml(notes_path):
    """Load notes.yaml preserving existing content.

    Args:
        notes_path: Path to notes.yaml.

    Returns:
        Dict with 'photos' and 'annotations' keys.
    """
    import yaml

    if not notes_path.exists():
        return {'photos': {}, 'annotations': []}

    try:
        with open(notes_path, 'r') as f:
            data = yaml.safe_load(f)
        if not isinstance(data, dict):
            return {'photos': {}, 'annotations': []}

        # Handle both old flat format and new structured format
        if 'photos' in data or 'annotations' in data:
            photos = data.get('photos', {})
            if not isinstance(photos, dict):
                photos = {}
            annotations = data.get('annotations', [])
            if not isinstance(annotations, list):
                annotations = []
            return {'photos': photos, 'annotations': annotations}

        # Old flat format — treat entire dict as photos
        return {'photos': data, 'annotations': []}
    except Exception:
        return {'photos': {}, 'annotations': []}


def save_notes_yaml(notes_path, notes_data):
    """Save notes.yaml preserving structure.

    Args:
        notes_path: Path to notes.yaml.
        notes_data: Dict with 'photos' and 'annotations' keys.
    """
    import yaml

    notes_path.parent.mkdir(parents=True, exist_ok=True)
    with open(notes_path, 'w') as f:
        yaml.dump(notes_data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)


def is_new_or_changed(filename, drive_file, cache):
    """Check if a Drive file needs to be downloaded.

    Args:
        filename: Local filename.
        drive_file: Drive file metadata dict.
        cache: Sync cache dict.

    Returns:
        True if the file should be downloaded.
    """
    cached = cache.get(filename)
    if not cached:
        return True
    if cached.get('drive_id') != drive_file['id']:
        return True
    if cached.get('modified_time') != drive_file.get('modifiedTime'):
        return True
    return False


def sync(folder_id, photo_dir, notes_file, credentials_file, token_file,
         dry_run=False, force=False):
    """Main sync logic: list Drive images, download new ones, update notes.yaml.

    Args:
        folder_id: Google Drive folder ID.
        photo_dir: Local directory for downloaded photos.
        notes_file: Path to notes.yaml.
        credentials_file: Path to OAuth credentials.
        token_file: Path to saved OAuth token.
        dry_run: If True, only list what would be downloaded.
        force: If True, re-download everything.
    """
    photo_dir = Path(photo_dir)
    notes_path = Path(notes_file)
    data_dir = notes_path.parent
    cache_path = data_dir / '.drive_sync_cache.json'

    photo_dir.mkdir(parents=True, exist_ok=True)

    print("Authenticating with Google Drive...")
    creds = authenticate(credentials_file, token_file)
    service = build_service(creds)

    print(f"Listing media in folder {folder_id}...")
    drive_images = list_drive_media(service, folder_id)
    print(f"Found {len(drive_images)} media files on Drive.")

    if not drive_images:
        print("No media found. Check the folder ID and sharing permissions.")
        return

    cache = {} if force else load_sync_cache(cache_path)
    notes_data = load_notes_yaml(notes_path)
    new_cache = dict(cache) if not force else {}

    to_download = []
    for df in drive_images:
        filename = df['name']
        if force or is_new_or_changed(filename, df, cache):
            to_download.append(df)

    if not to_download:
        print("All files are up to date. Nothing to download.")
        return

    print(f"\n{len(to_download)} file(s) to {'download' if not dry_run else 'sync'}:")
    for df in to_download:
        size_mb = int(df.get('size', 0)) / (1024 * 1024)
        print(f"  {df['name']} ({size_mb:.1f} MB)")

    if dry_run:
        print("\n(dry run — no files downloaded)")
        return

    downloaded = 0
    errors = 0
    for df in to_download:
        filename = df['name']
        dest = photo_dir / filename
        print(f"Downloading: {filename}...", end=' ', flush=True)

        try:
            download_file(service, df['id'], dest)
            print("OK")
        except Exception as e:
            print(f"FAILED: {e}", file=sys.stderr)
            errors += 1
            continue

        # Get shareable link and update notes.yaml
        link = get_shareable_link(service, df['id'])
        if link:
            if filename not in notes_data['photos']:
                notes_data['photos'][filename] = {}
            notes_data['photos'][filename]['google_photos_url'] = link

        # Update cache
        new_cache[filename] = {
            'drive_id': df['id'],
            'modified_time': df.get('modifiedTime', ''),
            'size': df.get('size', ''),
        }
        downloaded += 1

    # Save updated state
    save_sync_cache(cache_path, new_cache)
    save_notes_yaml(notes_path, notes_data)

    print(f"\nDone: {downloaded} downloaded, {errors} errors, "
          f"{len(drive_images) - len(to_download)} already up to date.")
    print(f"Notes updated: {notes_path}")
    print(f"\nNext step: python scripts/process_photos.py")


def setup(credentials_file, token_file):
    """Run OAuth setup flow (opens browser for consent).

    Args:
        credentials_file: Path to OAuth client secrets file.
        token_file: Path to save the token.
    """
    print("Starting OAuth setup...")
    print(f"Using credentials: {credentials_file}")
    creds = authenticate(credentials_file, token_file)
    # Verify by listing root
    service = build_service(creds)
    about = service.about().get(fields='user').execute()
    user = about.get('user', {})
    print(f"\nAuthenticated as: {user.get('displayName', 'Unknown')} ({user.get('emailAddress', '')})")
    print("Setup complete! You can now run sync commands.")


def main():
    parser = argparse.ArgumentParser(
        description='Sync photos from a shared Google Drive folder.'
    )
    parser.add_argument(
        '--setup', action='store_true',
        help='Run OAuth setup flow (opens browser for consent)'
    )
    parser.add_argument(
        '--folder-id',
        help='Google Drive folder ID to sync from'
    )
    parser.add_argument(
        '--photo-dir', default='photos/',
        help='Local directory for downloaded photos (default: photos/)'
    )
    parser.add_argument(
        '--notes-file', default='data/notes.yaml',
        help='Path to notes.yaml (default: data/notes.yaml)'
    )
    parser.add_argument(
        '--credentials', default='credentials.json',
        help='Path to OAuth client secrets file (default: credentials.json)'
    )
    parser.add_argument(
        '--token', default='token.json',
        help='Path to saved OAuth token (default: token.json)'
    )
    parser.add_argument(
        '--dry-run', action='store_true',
        help='List what would be downloaded without downloading'
    )
    parser.add_argument(
        '--force', action='store_true',
        help='Re-download all files, ignoring cache'
    )
    args = parser.parse_args()

    if args.setup:
        setup(args.credentials, args.token)
        return

    if not args.folder_id:
        parser.error('--folder-id is required (or use --setup for first-time auth)')

    sync(
        folder_id=args.folder_id,
        photo_dir=args.photo_dir,
        notes_file=args.notes_file,
        credentials_file=args.credentials,
        token_file=args.token,
        dry_run=args.dry_run,
        force=args.force,
    )


if __name__ == '__main__':
    main()
