# Repository Instructions

- For book-cover fixes in `_reading/*.md`, use `skills/openlibrary-covers/SKILL.md` before editing image URLs.
- Prefer validated Open Library `cover_i` URLs in the form `https://covers.openlibrary.org/b/id/<cover_id>-M.jpg`; avoid trusting existing ISBN URLs because they can point at the wrong edition.
- Validate candidate cover URLs with `?default=false` and require an actual image response before updating the page.
- Preserve each reading-list entry's existing `alt` text and `class="book-cover-small"` unless the title itself is wrong.
- Run `bundle exec jekyll build` after reading-list content edits.
