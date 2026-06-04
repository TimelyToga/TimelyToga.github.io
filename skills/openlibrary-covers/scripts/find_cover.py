#!/usr/bin/env python3
"""Find validated Open Library cover URLs for a title and author."""

from __future__ import annotations

import argparse
import json
import sys
import urllib.parse
import urllib.request
from urllib.error import HTTPError, URLError


FIELDS = ",".join(
    [
        "key",
        "title",
        "author_name",
        "first_publish_year",
        "cover_i",
        "isbn",
        "editions",
        "editions.key",
        "editions.title",
        "editions.isbn",
        "editions.cover_i",
    ]
)


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "TimelyToga-openlibrary-covers/1.0"},
    )
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def cover_url(key: str, value: str, size: str) -> str:
    return f"https://covers.openlibrary.org/b/{key}/{value}-{size}.jpg"


def validates(url: str) -> bool:
    separator = "&" if "?" in url else "?"
    request = urllib.request.Request(
        f"{url}{separator}default=false",
        headers={"User-Agent": "TimelyToga-openlibrary-covers/1.0"},
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            content_type = response.headers.get("content-type", "")
            return response.status == 200 and content_type.startswith("image/")
    except (HTTPError, URLError, TimeoutError):
        return False


def search(title: str, author: str | None, limit: int) -> list[dict]:
    params = {
        "title": title,
        "fields": FIELDS,
        "limit": str(limit),
    }
    if author:
        params["author"] = author
    url = "https://openlibrary.org/search.json?" + urllib.parse.urlencode(params)
    return fetch_json(url).get("docs", [])


def candidate_urls(doc: dict, size: str) -> list[tuple[str, str]]:
    candidates: list[tuple[str, str]] = []
    seen: set[tuple[str, str]] = set()

    def add(source: str, key: str, value: object) -> None:
        if value is None:
            return
        normalized = str(value).strip()
        if not normalized:
            return
        marker = (key, normalized)
        if marker in seen:
            return
        seen.add(marker)
        candidates.append((source, cover_url(key, normalized, size)))

    add("work cover_i", "id", doc.get("cover_i"))

    editions = doc.get("editions") or {}
    for edition in editions.get("docs") or []:
        add("edition cover_i", "id", edition.get("cover_i"))

    for isbn in doc.get("isbn") or []:
        add("isbn fallback", "isbn", isbn)

    for edition in editions.get("docs") or []:
        for isbn in edition.get("isbn") or []:
            add("edition isbn fallback", "isbn", isbn)

    for edition in editions.get("docs") or []:
        key = edition.get("key")
        if isinstance(key, str) and key.startswith("/books/"):
            add("edition olid fallback", "olid", key.rsplit("/", 1)[-1])

    return candidates


def authors(doc: dict) -> str:
    return ", ".join(doc.get("author_name") or [])


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Find validated Open Library cover URLs for a book."
    )
    parser.add_argument("--title", required=True)
    parser.add_argument("--author", default=None)
    parser.add_argument("--limit", type=int, default=8)
    parser.add_argument("--size", choices=["S", "M", "L"], default="M")
    args = parser.parse_args()

    docs = search(args.title, args.author, args.limit)
    if not docs:
        print("No Open Library search results found.", file=sys.stderr)
        return 1

    valid_count = 0
    for index, doc in enumerate(docs, start=1):
        print(
            f"\nResult {index}: {doc.get('title', '')} | {authors(doc)} | "
            f"{doc.get('first_publish_year', '')} | {doc.get('key', '')}"
        )
        for source, url in candidate_urls(doc, args.size):
            ok = validates(url)
            print(f"  {'OK ' if ok else 'BAD'} {source}: {url}")
            valid_count += int(ok)

    if valid_count == 0:
        print("\nNo validated Open Library cover URLs found.", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
