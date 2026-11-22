#!/usr/bin/env python3
"""Validate bespoke SVG book covers and render 300x450 + 80x120 audit PNGs."""
import argparse
import re
import shutil
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path


def validate_svg(svg_path: Path, audit_dir: Path, render_png: bool = True) -> list[str]:
    errors: list[str] = []
    text = svg_path.read_text(encoding="utf-8")
    size_kb = len(text.encode("utf-8")) / 1024

    try:
        root = ET.fromstring(text)
    except ET.ParseError as e:
        return [f"XML parse error: {e}"]

    if not root.tag.endswith("svg"):
        errors.append(f"Root element is {root.tag}, expected <svg>")

    vb = root.attrib.get("viewBox", "")
    if vb != "0 0 300 450":
        errors.append(f'viewBox is "{vb}", expected "0 0 300 450"')

    if re.search(r"<script\b", text, re.I):
        errors.append("SVG must not contain <script> tags")

    if re.search(r"https?://", text):
        # Ignore standard SVG xmlns URIs
        non_ns = re.sub(r'xmlns(?::\w+)?="http://www\.w3\.org/[^"]+"', "", text)
        if re.search(r"https?://", non_ns):
            errors.append("SVG contains external http(s) URL; covers must be 100% self-contained")

    # Check duplicate IDs and broken internal references
    all_ids = re.findall(r'\bid="([^"]+)"', text)
    seen = set()
    dups = set()
    for i in all_ids:
        if i in seen:
            dups.add(i)
        seen.add(i)
    if dups:
        errors.append(f"Duplicate IDs: {sorted(dups)}")

    url_refs = set(re.findall(r"url\(#([^)]+)\)", text))
    href_refs = set(re.findall(r'(?:xlink:)?href="#([^"]+)"', text))
    missing = (url_refs | href_refs) - seen
    if missing:
        errors.append(f"Unresolved internal references: {sorted(missing)}")

    if render_png and not errors and shutil.which("rsvg-convert"):
        audit_dir.mkdir(parents=True, exist_ok=True)
        stem = svg_path.stem
        out_full = audit_dir / f"{stem}_300x450.png"
        out_thumb = audit_dir / f"{stem}_80x120.png"
        subprocess.run(["rsvg-convert", "-w", "300", "-h", "450", str(svg_path), "-o", str(out_full)], check=True)
        subprocess.run(["rsvg-convert", "-w", "80", "-h", "120", str(svg_path), "-o", str(out_thumb)], check=True)
        print(f"OK   {svg_path} ({size_kb:.1f} KB) -> {out_full} & {out_thumb}")
    elif not errors:
        print(f"OK   {svg_path} ({size_kb:.1f} KB)")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("svgs", nargs="+", type=Path, help="SVG file(s) to validate")
    parser.add_argument("--audit-dir", type=Path, default=Path("/tmp/cover-audit"), help="Directory for rendered PNGs")
    parser.add_argument("--no-png", action="store_true", help="Skip rsvg-convert PNG rendering")
    args = parser.parse_args()

    failed = 0
    for svg_path in args.svgs:
        errs = validate_svg(svg_path, args.audit_dir, render_png=not args.no_png)
        if errs:
            failed += 1
            print(f"FAIL {svg_path}:")
            for err in errs:
                print(f"  - {err}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
