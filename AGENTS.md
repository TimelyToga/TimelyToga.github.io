# Repository Instructions

- For simple requests, commit and push to deploy when finished unless the user states at the start that deployment should be held back.
- Commit directly to the default branch (currently `master`); use a separate branch only for investigations or speculative work.
- For every new reading-list entry and every cover audit or fix, use `skills/openlibrary-covers/SKILL.md` first to find and validate a real cover; if no verified cover exists or an external URL fails to load, hand-design a bespoke static SVG cover in `assets/img/covers/<book_id>.svg` using `skills/design-cover/SKILL.md`.
- Prefer validated Open Library `cover_i` URLs in the form `https://covers.openlibrary.org/b/id/<cover_id>-M.jpg`; avoid trusting existing ISBN URLs because they can point at the wrong edition or return a blank 1×1 placeholder.
- Validate Open Library cover URLs with `?default=false`; validate other sources with a successful image response and a title/author match. Validate bespoke SVG covers with `skills/design-cover/scripts/validate_cover.py` and inspect both `300×450` and `80×120` PNG previews.
- Preserve each reading-list entry's existing `alt` text and `class="book-cover-small"` unless the title itself is wrong.
- Run `bundle exec jekyll build` after reading-list content edits.
- Reading-list page content is rendered from `_data/reading/<year>.yml`; keep `_reading/*-reading-list.md` as thin include wrappers.
- Manual order in `_data/reading/<year>.yml` is the reading order. Do not require exact per-book dates.
- Use stable `book_id` values to connect rereads and restarts across years. Set `attempt: reread` for rereads, `attempt: restart` for restarting a previous DNF, and `outcome: dnf` plus `stopped_at` for unfinished books.
