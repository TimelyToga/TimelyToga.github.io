---
name: openlibrary-covers
description: Find, validate, and format Open Library book cover URLs. Use when Codex needs to search Open Library for a book, choose the correct edition or cover, fix wrong Open Library cover images, generate covers.openlibrary.org URLs, or update reading-list HTML/Markdown book covers.
---

# Open Library Covers

## Overview

Use Open Library search results to identify the right book and cover, then build a `covers.openlibrary.org` image URL. Prefer cover IDs from search results when available because they avoid ISBN mismatch issues across editions.

Official docs:

- Covers API: `https://openlibrary.org/dev/docs/api/covers`
- Search API: `https://openlibrary.org/dev/docs/api/search`

## Workflow

1. Search for the book with enough fields to evaluate identity and cover data.

```sh
curl -sG 'https://openlibrary.org/search.json' \
  --data-urlencode 'title=The Power Broker' \
  --data-urlencode 'author=Robert A. Caro' \
  --data-urlencode 'fields=key,title,author_name,first_publish_year,cover_i,isbn,editions,editions.key,editions.title,editions.isbn,editions.cover_i' \
  --data-urlencode 'limit=5'
```

2. Choose the result by matching title, author, and edition context. Do not blindly trust an ISBN already in a file; stale or wrong ISBNs can point to unrelated covers.

3. Prefer identifiers in this order for final cover URLs:

- `cover_i` / `editions.cover_i` -> `https://covers.openlibrary.org/b/id/<cover_id>-M.jpg`
- exact ISBN for the edition -> `https://covers.openlibrary.org/b/isbn/<isbn>-M.jpg`
- edition OLID from `/books/OL...M` -> `https://covers.openlibrary.org/b/olid/OL...M-M.jpg`

4. Verify the chosen URL exists by appending `?default=false`. A 200 means Open Library has an actual cover. A 404 means the normal URL would return a blank placeholder.

```sh
curl -I 'https://covers.openlibrary.org/b/id/240727-M.jpg?default=false'
```

5. For site pages, use the display-size URL directly in the image source:

```html
<img src="https://covers.openlibrary.org/b/id/240727-M.jpg" alt="Book Title" class="book-cover-small">
```

## Cover URL Reference

Book cover pattern:

```text
https://covers.openlibrary.org/b/<key>/<value>-<size>.jpg
```

Supported book keys:

- `id` for Open Library internal cover IDs, usually from `cover_i`
- `olid` for edition IDs like `OL7440033M`
- `isbn`
- `oclc`
- `lccn`

Sizes:

- `S` small thumbnail
- `M` medium display image
- `L` large image

Use `M` for reading-list covers unless the local page design requires a different size.

## Practical Search Commands

Search by title and author, returning compact rows:

```sh
curl -sG 'https://openlibrary.org/search.json' \
  --data-urlencode 'title=Alien Clay' \
  --data-urlencode 'author=Adrian Tchaikovsky' \
  --data-urlencode 'fields=title,author_name,first_publish_year,cover_i,isbn,key' \
  --data-urlencode 'limit=10' \
| jq -r '.docs[] | [.title, (.author_name // [] | join(", ")), .first_publish_year, .cover_i, ((.isbn // [])[0]), .key] | @tsv'
```

Search all text when title/author fields miss:

```sh
curl -sG 'https://openlibrary.org/search.json' \
  --data-urlencode 'q=Alien Clay Adrian Tchaikovsky' \
  --data-urlencode 'fields=title,author_name,first_publish_year,cover_i,isbn,key' \
  --data-urlencode 'limit=10'
```

Validate several candidate cover URLs:

```sh
for url in \
  'https://covers.openlibrary.org/b/id/123-M.jpg?default=false' \
  'https://covers.openlibrary.org/b/isbn/9780000000000-M.jpg?default=false'
do
  printf '%s -> ' "$url"
  curl -s -o /dev/null -w '%{http_code}\n' "$url"
done
```

## Selection Rules

- Prefer a `cover_i` from the matching work or edition when the current ISBN returns the wrong cover.
- If search returns multiple plausible works, verify using the Open Library work page (`https://openlibrary.org/works/OL...W`) or edition page (`https://openlibrary.org/books/OL...M`) before editing files.
- Keep `alt` text as the local book title, not the Open Library result title, if the local title is intentionally styled or expanded.
- Do not crawl or bulk-download covers. The Covers API is rate-limited for non-cover-ID lookups and intended for public page display.
- Include a courtesy link to Open Library when adding broader attribution surfaces; for simple existing reading-list image fixes, keep the established site style unless asked to redesign attribution.
