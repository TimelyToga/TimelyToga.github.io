---
name: design-cover
description: Hand-design a bespoke, regal static SVG book cover when Open Library and reliable external cover searches fail or an existing cover URL is broken.
---

# Design Cover (Bespoke Static SVG Book Jackets)

## When To Use This Skill

Always run `skills/openlibrary-covers/SKILL.md` **first** to look for a verified real edition cover (preferring Open Library `cover_i` URLs verified with `?default=false`, or a clean direct publisher/bookseller cover).

Use this skill **only when**:
1. A thorough search yields no verified cover for the book, **or**
2. An existing cover URL in `_data/reading/*.yml` fails to load (HTTP error, blank 1×1 placeholder, or hotlink rot) and no reliable replacement edition cover exists.

Output static SVG files into `assets/img/covers/<book_id>.svg` and point the YAML `cover:` field at `/assets/img/covers/<book_id>.svg`. Preserve the entry's existing `alt` text and `class="book-cover-small"` in `_includes/reading_entry.html`.

---

## Creative Philosophy (Folio Society / Fine-Press Standard)

**Never use a procedural template or cookie-cutter grid.** Treat every missing book as a singular, one-of-one commissioned collector's edition.

1. **Research the book first.** Before drawing a single line, gather:
   - The book's actual thesis, plot, historical era, and signature artifacts/scenes (via web search + the owner's `notes` in `_data/reading/<year>.yml`).
   - **One unmistakable physical object or visual metaphor** from the book's content — e.g., a zero-albedo black sphere cutting through Gridfire (*Excession*), a fire-scorched cracked cuneiform tablet (*1177 B.C.*), a terraced open-pit copper mine descending into lithium brine (*Material World*), a brass astrolabe centered on a crimson-laced nutmeg (*A Splendid Exchange*), a gilt price curve blooming into a Semper Augustus tulip whose stem cracks a ledger floor (*Manias, Panics, and Crashes*), or a seven-string lute rim-lit in cold blue fire (*The Name of the Wind*).
2. **One central focal idea + restrained narrative micro-details.**
   - Avoid crowded collages or generic stock icons. Let negative space, dark cloth/vellum/slate ground, and chiaroscuro lighting give the object gravitas.
   - Add one subtle, book-specific "insider" detail that rewards close inspection at full size (e.g., an unsigned `"I RESIGN"` stamp, a `"LEGIBLE"` cadastral mark, a `TOP SECRET / ULTRA` seal, hairline telemetry coordinates, or a single fallen petal).
3. **Design for dual scale (`300×450` showcase AND `80×120px` thumbnail).**
   - At `80×120px` (the inline reading-list size on the `#11100e` dark obsidian site), the cover MUST still read instantly as **one bold, iconic silhouette + crisp high-contrast title**.
   - Avoid tiny sub-8px body clutter or low-contrast mid-tone text over busy lines.
   - Keep a subtle dark board edge so even a pale parchment/clay/vellum cover sits crisply against `#11100e`.
4. **Physical book object continuity (the only shared layer).**
   - Every bespoke cover shares a restrained physical book finish via `skills/design-cover/scripts/bench.py`:
     - Soft left-edge spine hinge groove (`hinge` gradient, ~16–18px wide)
     - Subtle board-edge bevel & top-left light falloff
     - Faint paper, linen, or buckram micro-grain (`feTurbulence` overlay)
   - Everything inside the board — composition, palette, framing, illustration craft, typography voice — is bespoke to that book.

---

## Color, Typography & SVG Technical Contract

- **Canvas & Aspect Ratio:** Exact `viewBox="0 0 300 450"` (`width="300" height="450"`), exact `2:3` ratio matching `.book-cover-small` (`80×120`) and `.book-grid .book-cover`.
- **Site Harmony:** The reading list sits on `#11100e` warm obsidian with `#ece4da` cream text and `#d98757` terracotta accents. Rich dark boards (deep obsidian, oxblood, Prussian indigo, forest buckram, espresso, dark basalt) work naturally; warm light boards (kiln clay, ledger parchment, surveyor vellum) are welcome when grounded by the book's material and framed with a crisp dark border & spine shadow.
- **Typography Stacks (100% offline-safe — no external `@import` or remote fonts):**
  - Display / Regal Serif: `'Playfair Display', 'Bodoni 72', 'Didot', 'Baskerville', 'Georgia', serif`
  - Book Serif: `'Merriweather', 'Baskerville', 'Hoefler Text', 'Georgia', serif`
  - Clean Modernist Sans: `'Inter', 'Avenir Next', 'Futura', 'Helvetica Neue', sans-serif`
  - Technical / Archival Mono: `'JetBrains Mono', 'Menlo', 'Courier New', monospace`
  - Split subtitles on `:` and trailing parenthetical editions like `(Revised and Updated)` cleanly so the primary title commands space without cramped wrapping.
- **Collision-Free Scoped IDs:** Prefix every `id="..."` inside `<book_id>.svg` with a unique per-book prefix (e.g., `dc-<short-slug>-`) so multiple SVGs never collide if inlined on one page.
- **Accessible & Self-Contained:** Include `<title>` and `<desc>` with `role="img" aria-labelledby="..."`, properly XML-escaped text, zero external image/font URLs, and zero `<script>` tags.
- **Reasonable Weight:** Aim for **10–65 KB** per SVG (rich vector craft without excessive redundant DOM nodes).

---

## Workflow

1. **Confirm no real cover exists** using `skills/openlibrary-covers/SKILL.md`.
2. **Gather book dossier:** Read the entry's `title`, `author`, and `notes` from `_data/reading/<year>.yml`, and briefly research the book's thesis/plot/artifacts via web search if you don't already know it intimately.
3. **Author the bespoke SVG:**
   - Either hand-write `assets/img/covers/<book_id>.svg` directly or write a dedicated generator script using the helpers in `skills/design-cover/scripts/bench.py` (spine hinge, board bevel, linen/paper grain, XML escaping).
   - Keep temporary authoring scripts out of the published site assets (or under `/tmp` during creation); commit only the clean static SVG at `assets/img/covers/<book_id>.svg`.
4. **Validate & Visually Self-Audit (Mandatory):**
   Run the validation and PNG preview helper:
   ```sh
   python3 skills/design-cover/scripts/validate_cover.py assets/img/covers/<book_id>.svg
   ```
   This verifies:
   - Strict XML parsing and exact `viewBox="0 0 300 450"`
   - Unique IDs (no duplicates) and every `url(#...)` / `href="#..."` resolves
   - Renders both `300×450` showcase PNG and `80×120` thumbnail PNG via `rsvg-convert` into `/tmp/cover-audit/`

   **Inspect BOTH rendered PNGs** (at `300×450` and `80×120`) before finishing. Fix any:
   - Clipped, colliding, or cramped title/author text
   - Weak contrast at `80×120px` thumbnail size
   - Unintended geometry overlaps, harsh gradients, or flat/muddy silhouettes
5. **Wire into `_data/reading/<year>.yml` and rebuild:**
   ```yaml
   cover: '/assets/img/covers/<book_id>.svg'
   ```
   (Update every occurrence of that `book_id` across years/sections if it appears in `favorites`, `unfinished`, or as a reread/restart.)
   Then verify the site builds cleanly:
   ```sh
   bundle exec jekyll build
   ```
