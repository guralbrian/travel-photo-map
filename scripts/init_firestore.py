#!/usr/bin/env python3
"""Initialize Firestore config/app document with authorized editor emails.

Usage:
    python scripts/init_firestore.py \
        --key service-account-key.json \
        --editors "you@gmail.com,friend@gmail.com"
"""

import argparse
import os
import sys

import firebase_admin
from firebase_admin import credentials, firestore


def main():
    parser = argparse.ArgumentParser(
        description="Create or update Firestore config/app with authorized editors"
    )
    parser.add_argument(
        "--key", required=True, help="Path to Firebase service account key JSON"
    )
    parser.add_argument(
        "--editors",
        required=True,
        help="Comma-separated list of authorized editor email addresses",
    )
    args = parser.parse_args()

    if not os.path.exists(args.key):
        print(f"Error: Service account key not found: {args.key}", file=sys.stderr)
        sys.exit(1)

    editors = [e.strip() for e in args.editors.split(",") if e.strip()]
    if not editors:
        print("Error: No editor emails provided", file=sys.stderr)
        sys.exit(1)

    cred = credentials.Certificate(args.key)
    firebase_admin.initialize_app(cred)
    db = firestore.client()

    doc_ref = db.collection("config").document("app")
    doc_ref.set({"authorizedEditors": editors})

    print(f"Firestore config/app updated with {len(editors)} editor(s):")
    for email in editors:
        print(f"  - {email}")


if __name__ == "__main__":
    main()
