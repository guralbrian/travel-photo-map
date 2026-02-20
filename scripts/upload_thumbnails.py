#!/usr/bin/env python3
"""Upload local thumbnails to Firebase Storage and update manifest with cloud URLs.

Usage:
    python scripts/upload_thumbnails.py \
        --key service-account-key.json \
        --bucket travel-photo-map-e0bf4.firebasestorage.app \
        --manifest data/manifest.json

Incremental mode: thumbnails already pointing to Firebase Storage URLs are skipped.
"""

import argparse
import json
import os
import sys
import urllib.parse

import firebase_admin
from firebase_admin import credentials, storage


FIREBASE_STORAGE_MARKER = "firebasestorage.googleapis.com"


def build_public_url(bucket_name, storage_path):
    """Build the public download URL for a Firebase Storage object."""
    encoded_path = urllib.parse.quote(storage_path, safe="")
    return (
        f"https://firebasestorage.googleapis.com/v0/b/{bucket_name}"
        f"/o/{encoded_path}?alt=media"
    )


def main():
    parser = argparse.ArgumentParser(
        description="Upload thumbnails to Firebase Storage and update manifest"
    )
    parser.add_argument(
        "--key", required=True, help="Path to Firebase service account key JSON"
    )
    parser.add_argument(
        "--bucket", required=True, help="Firebase Storage bucket name"
    )
    parser.add_argument(
        "--manifest",
        default="data/manifest.json",
        help="Path to manifest.json (default: data/manifest.json)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be uploaded without uploading",
    )
    args = parser.parse_args()

    if not os.path.exists(args.key):
        print(f"Error: Service account key not found: {args.key}", file=sys.stderr)
        sys.exit(1)

    if not os.path.exists(args.manifest):
        print(f"Error: Manifest not found: {args.manifest}", file=sys.stderr)
        sys.exit(1)

    # Initialize Firebase Admin SDK
    cred = credentials.Certificate(args.key)
    firebase_admin.initialize_app(cred, {"storageBucket": args.bucket})
    bucket = storage.bucket()

    # Load manifest
    with open(args.manifest, "r") as f:
        manifest = json.load(f)

    uploaded = 0
    skipped = 0
    errors = 0

    for i, entry in enumerate(manifest):
        thumbnail = entry.get("thumbnail", "")

        # Skip if already a Firebase Storage URL (incremental mode)
        if FIREBASE_STORAGE_MARKER in thumbnail:
            skipped += 1
            continue

        # Resolve local thumbnail path relative to manifest location
        manifest_dir = os.path.dirname(os.path.abspath(args.manifest))
        project_root = os.path.dirname(manifest_dir)
        local_path = os.path.join(project_root, thumbnail)

        if not os.path.exists(local_path):
            print(f"  WARNING: Thumbnail not found: {local_path} (entry {i})")
            errors += 1
            continue

        # Storage path: thumbs/{filename}
        filename = os.path.basename(thumbnail)
        storage_path = f"thumbs/{filename}"

        if args.dry_run:
            cloud_url = build_public_url(args.bucket, storage_path)
            print(f"  [DRY RUN] {thumbnail} -> {cloud_url}")
            uploaded += 1
            continue

        try:
            blob = bucket.blob(storage_path)
            # Determine content type
            ext = os.path.splitext(filename)[1].lower()
            content_type = {
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".png": "image/png",
                ".webp": "image/webp",
                ".gif": "image/gif",
            }.get(ext, "application/octet-stream")

            blob.upload_from_filename(local_path, content_type=content_type)

            cloud_url = build_public_url(args.bucket, storage_path)
            entry["thumbnail"] = cloud_url
            uploaded += 1

            if (uploaded % 50) == 0:
                print(f"  Uploaded {uploaded} thumbnails...")

        except Exception as e:
            print(f"  ERROR uploading {thumbnail}: {e}", file=sys.stderr)
            errors += 1

    # Write updated manifest
    if not args.dry_run and uploaded > 0:
        with open(args.manifest, "w") as f:
            json.dump(manifest, f, indent=2)
        print(f"\nManifest updated: {args.manifest}")

    print(f"\nSummary: {uploaded} uploaded, {skipped} skipped, {errors} errors")
    if errors > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
