# EmDash Migration — Final Report (VitaLunaris)

**Date:** 2026-06-26
**Status:** ✅ Complete and verified locally (all 24 routes return HTTP 200). Dev server runs on `localhost:4321`.

> **TL;DR** — The whole site is now editable by Theresia through clean, labeled fields in the EmDash admin. **No raw JSON anywhere.** Testimonials and team are single shared sources. Design values are tokenized. Accessibility + performance basics are in. Schema and content can be re-seeded into a fresh environment in two commands. Nothing is broken; what remains is optional polish (listed at the bottom).

---

## 1. What was done

### 1.1 Core goal — kill JSON editing for the client
Every repeating content list (cards, galleries, FAQs, paragraphs, testimonials, price lists, info cards, stage cards, value cards, offer cards, practice-offer rows) used to be edited as **raw JSON** pasted into a text box. They are now **proper repeater fields with labeled inputs** (Frage/Antwort, Titel/Text, Button-Text/Link, etc.) and an **image upload button per item** where relevant.

- Discovered EmDash 0.22 actually **supports `image` sub-fields in repeaters** (the architecture review had wrongly assumed otherwise — corrected in `ARCHITECTURE-REVIEW.md`).
- Built a reusable, idempotent migration runner (`scripts/emdash-migrate.cjs`) so future field changes are repeatable, not hand-written SQL.
- Removed the generic catch-all `items` (JSON-Array) sub-field from the `sections` repeater in all collections → **the admin no longer shows a JSON box anywhere.**
- Last JSON pocket (bullet lists) converted to **one-bullet-per-line text**.

### 1.2 Shared collections (single source of truth)
- **`testimonials`** (NEW) — all 33 reviews live in one place, tagged by a `Seite / Kontext` dropdown (praxis-hypnose, ausbildung, jawort, workshop-aktueller, home, …). Edit a review once; it shows wherever that context is used. Reads via `getTestimonials(context)` in `src/lib/cms.ts`.
- **`team`** — über-uns now pulls the 3 bios + photos straight from the Team collection (removed the duplicated team JSON blob).

### 1.3 Pages converted (no JSON, verified rendering)
- **Typed/section-bag pages:** uebersicht, infoanlaesse, jawort, aktueller-monatsworkshop, kalender-uebersicht, ueber-uns.
- **Block-router pages:** home, kontakt, neuigkeiten, praxisangebote (overview), ausbildung (overview).
- **Jawort 22-photo gallery** is now uploadable (image + alt per photo).

### 1.4 Wave 3 — admin polish
- Client-facing **description on every collection** (shown in the admin; EmDash 0.22 has no per-field help text, so guidance lives in labels + collection descriptions).
- **Required alt-text** on gallery images (accessibility).
- **Removed dead fields:** `workshops.further_courses` + 8 unused `site_settings` fields (`newsletter_*`, `site_description`, `default_og_image`, `contact_phone`).

### 1.5 Wave 4 — design-system tokens (`src/styles/global.css`)
- Interaction colors: `--c-cherrywood-dark` (button hover), `--c-spring-wood-dark`, `--c-cherrywood-tint`.
- Brand gradients tokenized (`--gradient-header` now references color tokens; added `--gradient-spring-gold`).
- Full radius scale: `--radius-pill`, `--radius-card-sm/-card/-card-lg`, `--radius-md/-sm/-xs` — **117 hardcoded `border-radius` values + 4 button hovers swept to tokens by exact value (zero visual change).**

### 1.6 Wave 5 — accessibility + Core Web Vitals
- **a11y:** skip-link (`Zum Inhalt springen`), `prefers-reduced-motion` support. Verified already-good: landmarks, all form labels, icon-button aria-labels, and **all 45 `<img>` have alt**.
- **CWV:** LCP hero images now `fetchpriority="high"` (Hero, CourseHero, AboutHero); `NarrativeBlock` images set to `loading="lazy"`. Fonts preloaded; CSS `aspect-ratio` already prevents layout shift.

### 1.7 Seeds reconciled (fresh-environment ready)
- `seed/seed.json` regenerated from the live schema (8 collections, 147 fields) and validated.
- `seed/content-export.json` exports all 61 live entries.
- **Verified end-to-end on a throwaway DB:** schema + content seed → all 61 entries, gallery 22 photos, home testimonials 4. Old per-area `content-*.json` files deleted.

---

## 2. What still needs fixing / improving

### 2.1 ⚠️ Before a fresh production / Cloudflare D1 cutover
1. **Uploaded media binaries.** Content seeds reference admin-uploaded images by storage key but **do not carry the files**. The `./uploads` folder (local) / R2 bucket (prod) must be copied alongside the seed. Images that are plain paths (`/images/...`) need nothing extra.
2. **Run order matters:** `npm run em:seed` (schema) **then** `npm run em:content` (data). Both must run under **Herd Node 24** (better-sqlite3 ABI).
3. **`seed.json.bak-prelive`** and the `data.db.bak-*` files are backups — safe to delete once you're confident.

### 2.2 Should do soon (quality)
1. **Real Lighthouse / axe audit** in Chrome DevTools. The structural pieces are in place, but actual scores + color-contrast ratios need a browser run (I can't run headless Lighthouse from here). Check cherrywood-on-pale-gold and white-on-lavender contrast in particular.
2. **`[slug].astro` workshop testimonials** are still a hardcoded array in code (not wired to the `testimonials` collection). Low urgency — they're not client-edited JSON, but they're also not editable. Decide whether each monthly workshop needs its own reviews (→ add a context per workshop) or should share one set.
3. **`seed.json` vs live drift:** the live DB is the source of truth. If you change schema again, regenerate with `scripts/generate-seed.cjs` so a fresh env stays in parity.

### 2.3 Nice-to-have (optional polish)
1. **Responsive images** (`srcset`/`sizes`) — images are currently single-size; biggest remaining performance win for slow connections.
2. **Wave 4 long-tail:** box-shadow tokens (a few unique shadows) and a spacing scale (paddings/gaps are bespoke per component — high effort, low payoff).
3. A couple of one-off radii left intentionally (dark-CTA `67.66px` button, vw-based positioned media).
4. **Navigation's decorative 5-stop gradient** uses 3 non-palette colors — left as-is (tokenizing only part of it would be inconsistent).
5. **`TestimonialCard` star** uses an SVG `fill="#601D1D"` attribute (CSS vars don't resolve in SVG presentation attributes) — left as a literal on purpose.

### 2.4 Known harmless noise
- `emdash seed` prints `[object-cache] epoch bump failed … reading 'DEV'` warnings in CLI context. **Harmless** — the seed still applies.

---

## 3. How to run / deploy

```bash
# Local dev (Herd Node 24 is required; the launcher handles it)
npm run dev                 # → http://localhost:4321  (admin: /_emdash/admin, dev-bypass link on first load)

# Fresh environment (prod / Cloudflare D1) — two steps, under Node 24:
npm run em:seed             # schema  (8 collections, 147 fields)
npm run em:content          # data    (61 entries)  — then copy uploads/ or R2 media
```

---

## 4. Reference

### Migration scripts (`scripts/`, run under Herd Node 24)
| Script | Purpose |
|---|---|
| `emdash-migrate.cjs` | Config-driven, idempotent repeater-field migrator (the reusable tool) |
| `seed-testimonials.cjs` | Seeded the testimonials collection from existing per-page data |
| `migrate-blocks.cjs` | Converted the block-router pages' JSON to top-level fields |
| `wave3.cjs` | Collection descriptions, required alt, dead-field removal |
| `generate-seed.cjs` | Regenerates `seed/seed.json` from the live schema |
| `generate-content.cjs` | Exports all live entries to `seed/content-export.json` |

### Key files
- `src/lib/cms.ts` — helpers: `getTestimonials()`, `imageUrl()`, `textLines()`, `nl2br()`, `jsonArray()`, `parseJson()`.
- `src/styles/global.css` — design tokens (`:root`), skip-link, reduced-motion.
- `src/components/layouts/BaseLayout.astro` — `<html lang>`, `<main>`, skip-link, head/SEO, font preload.
- `seed/seed.json` (schema) · `seed/content-export.json` (data).
- `EDITING-GUIDE.md` — client-facing "where do I edit X" guide. `ARCHITECTURE-REVIEW.md` — the design rationale (with the EmDash 0.22 correction).

### DB backups created this session
`data.db.bak-{stagecards, cardlists, seedtestimonials, blocks, dropitems, wave3, bullets}` — each taken before a schema/data change. Safe to delete once confident.

### Guardrails (do not undo)
- Do **not** restructure/regroup the admin sidebar collections (client directive).
- Do **not** touch Soulcoach Level 1 / Level 2 — built by the user.
- Always back up `data.db` and run migrations under **Herd Node 24** (`C:\Users\User\.config\herd\bin\nvm\v24.1.0\node.exe`), not the system Node 22.

---

*Generated at the end of the 2026-06-26 working session. Sleep well — everything is in a working, verified state.*
