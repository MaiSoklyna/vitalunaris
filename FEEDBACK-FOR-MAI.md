# Review feedback — `feat/emdash-backend` (EmDash migration)

**Reviewer:** Dimitri (with Claude)  ·  **Date:** 2026-07-22
**Branch reviewed:** `origin/feat/emdash-backend` (tip `893f696`) against `main` (`0a0c20e`)
**Live reference:** `https://vitalunaris.ch` — **this is the single source of truth.**

## TL;DR

The migration to EmDash is a big, mostly-solid piece of work — it builds, runs, and the
admin/collection model is sensible. But it is **not deployable as-is**, and the core
problem is that **the migrated site does not reproduce the live site**. A CMS migration's
job is to reproduce the current site exactly (1:1) at cut-over; content editing happens
in the CMS afterwards. Right now, when the real production seed is applied,
**0 of 24 pages match live**. Below is what needs to be corrected, most important first.

---

## 1. The rendered site does not match live (the whole point of the migration)

I diffed the **visible text** of every page, live vs. the branch, two ways:

- **Pure template fallbacks (empty DB):** 11 of 20 pages already diverge from live.
  That means the divergence is **baked into the rewritten `.astro` templates**, not just
  the database. The fallbacks were supposed to be verbatim transcriptions of the live copy.
- **Real production seed applied (`seed.json` + `content-export.json`):** **24 of 24**
  pages diverge, because the seeded `nav_items` is wrong (see §3) and overrides the
  otherwise-correct fallback nav on every page.

Concrete content divergences from live (not exhaustive):
- **Homepage:** testimonials truncated ("…Lebensfreude." vs live "…Lebensfreude. Dafür bin
  ich von Herzen dankbar."), the "Wie können wir dir helfen?" intro copy shortened, the
  newsletter blurb cut.
- **Soulcoach Level 1 / Level 2:** substantially **rewritten** paragraphs (different
  wording than live), plus start dates changed (`1.8.2026` vs live `2.9.2026`) and a
  re-introduced "Präsenztage jeden Donnerstag" line that live no longer has.
- **Praxis pages (aufstellungen, fussreflex, hypnose, numerologie), Jawort:** dropped
  sentences and reworded testimonials throughout.

**What correct looks like:** each page must render **byte-for-byte the same copy as live**.
Fallbacks and seed content must be exact transcriptions of `vitalunaris.ch`, not edits.

## 2. Typography was silently changed site-wide

The rewrite substitutes **curly quotes `" "`** for the live site's **straight quotes `" "`**,
and in places **en-dashes `–`** for live's **em-dashes `—`**. This shows up on almost every
page. A faithful migration keeps the source text character-for-character. (If curly quotes
are actually wanted, that's a *content decision for Theresia after launch* — not something
to introduce during the migration.)

## 3. Navigation labels in the seed are wrong

`ec_site_settings.nav_items` (in `content-export.json`) ships:
- "Systemischer Soulcoach – Level 1" and "Systemischer Soulcoach – Level 2"
  — live says **"Systemic Soulwork Level 1"** and **"Systemic Soulcoach Level 2"**.
- **drops** "Begleitung & Circle"
- **adds** "Aktueller Monatsworkshop"

It currently looks fine *only by accident*: in the empty-DB case the template's
`FALLBACK_NAV` (which is correct) renders. As soon as the real seed populates the row, the
wrong nav goes live on **every page**. Fix the data to match live exactly.

## 4. Placeholder / test junk left in the dev database

`data.db` contains literal placeholder text that renders to visitors:
- `ffff ddddddd ddddddddddddddd` — in the homepage FAQ
- `qqqqqqqqqqqq ehee … dssssssssssssssss … jjjjjjjjjjjjj` — on the Kontakt page
- an unfinished **"Ich bin der Titel des Kurses" / "Kostenlos :)"** placeholder workshop
  card that appears across 8+ pages (info evening, calendar grid, every workshop cross-sell)

This junk is **not** in `content-export.json` — which means the dev DB and the exported
seed **have drifted apart** (§6). Neither is a clean, complete source of truth.

## 5. Missing content vs live

- Homepage "Wie können wir dir helfen?" offer section is shortened/incomplete.
- Workshop detail pages are **missing the Anmeldung / checkout block** (the `zahls.ch`
  buy flow present on live) — that's a conversion regression, not just a copy diff.

## 6. Two sources of truth that disagree (`data.db` vs `content-export.json`)

- Production is seeded from **`content-export.json`** (generated from `data.db` via
  `scripts/generate-content.cjs`).
- But `data.db` has newer edits **and** the junk from §4, while `content-export.json` is an
  older, cleaner snapshot. They are out of sync. There is no single artifact that is both
  clean and complete. Pick one source, make it correct, and regenerate the other from it.

## 7. Verification was done against the wrong artifact

`EMDASH-FINAL-REPORT.md` claims "all 24 routes return HTTP 200… verified locally." That was
against the **dev DB**, not the deploy artifact. Verification has to be run against a
**fresh DB seeded from `content-export.json`** — i.e. exactly what production gets —
otherwise seed gaps and nav/content drift are invisible.

## 8. Repo hygiene

- **Binaries committed:** `data.db` (2.6 MB) **plus ~15 `data.db.bak-*` files** are checked
  into git. The `.bak-*` files are even listed in `.gitignore` yet were force-committed.
  Databases and backups don't belong in version control.
- **Windows-only tooling:** `scripts/dev.cmd` / `scripts/build.cmd` are Windows batch files;
  `package.json`'s `dev`/`start`/`build:local` point at them, so they don't run on
  macOS/Linux/CI without the `dev:astro` fallback.
- **Hardcoded absolute paths:** `scripts/generate-content.cjs` hardcodes
  `D:/Tanner/vitalunaris/data.db` and `…/seed/content-export.json`. Not portable — it only
  runs on your machine.

## 9. Deploy config is left unfinished

- `wrangler.jsonc` still has `"database_id": "FILL_IN_AFTER_CREATE"` — the D1 database was
  never provisioned, so `npm run deploy` can't work as-is.
- No verified D1 seeding path is documented (the local `emdash seed` CLI ignores
  `EMDASH_DATABASE_URL` — it needs the `-d <path>` flag; worth documenting for the D1 flow).
- `RESEND_API_KEY` is only in `.dev.vars.example`; the prod secret step isn't wired.

---

## The checklist to run against this

Most of the above is already codified in our internal **EmDash Launch Check**
(`philosophers_stone/guides/emdash-launch-check.md`). Two sections matter most here:

- **Section F — "the intern checklist"** is *literally born from the VitaLunaris build*. Its
  `F1` placeholder grep even includes `ich bin der titel` — the exact stub we're still
  shipping. Run F1–F6 (placeholder content, dead component-default links, canonical domain,
  fabricated/inconsistent facts, fonts+tokens, real forms/assets) before any handoff.
- **Sections A–E** are the D1/Cloudflare gotchas for when we actually cut over: the
  `context.cache` save-crash (needs patch-package or `experimental.cache`), `version = NULL`
  rows being uneditable, seed creating `locale=en` rows on a `de` site, and **`emdash:site_url`
  must be the production domain** (magic-link/passkey are origin-bound — this also means the
  admin won't log in against a `*.workers.dev` preview URL).

## What "done" means

1. Every page renders **byte-identical content to `vitalunaris.ch`** (fallbacks *and* seed).
2. `nav_items`, typography, testimonials, and all copy match live exactly.
3. No placeholder/test text anywhere.
4. One clean, complete seed (`content-export.json`) that is **verified against a fresh DB**
   to reproduce all 24 pages — not the dev DB.
5. Repo cleaned of committed DBs/backups; scripts made path-portable.
6. `wrangler.jsonc` completed and the D1 + R2 + secret + seed steps documented and tested.

Happy to pair on any of this. The bones are good — it mainly needs to stop *editing* the
site and start *reproducing* it.
