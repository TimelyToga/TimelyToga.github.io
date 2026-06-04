# Repository Instructions

- For book-cover fixes in `_reading/*.md`, use `skills/openlibrary-covers/SKILL.md` before editing image URLs.
- Prefer validated Open Library `cover_i` URLs in the form `https://covers.openlibrary.org/b/id/<cover_id>-M.jpg`; avoid trusting existing ISBN URLs because they can point at the wrong edition.
- Validate candidate cover URLs with `?default=false` and require an actual image response before updating the page.
- Preserve each reading-list entry's existing `alt` text and `class="book-cover-small"` unless the title itself is wrong.
- Run `bundle exec jekyll build` after reading-list content edits.
- Reading-list page content is rendered from `_data/reading/<year>.yml`; keep `_reading/*-reading-list.md` as thin include wrappers.
- Manual order in `_data/reading/<year>.yml` is the reading order. Do not require exact per-book dates.
- Use stable `book_id` values to connect rereads and restarts across years. Set `attempt: reread` for rereads, `attempt: restart` for restarting a previous DNF, and `outcome: dnf` plus `stopped_at` for unfinished books.
