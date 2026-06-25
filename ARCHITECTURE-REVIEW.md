# EmDash CMS — Architecture Review (VitaLunaris)

*Based on the actual codebase in `D:\Tanner\vitalunaris` (the CMS we built), not a generic template.*

---

## 0. Current state (ground truth)

**Collections (7):**
| Collection | Entries | Model |
|---|---|---|
| `praxisangebote` | 6 | **mixed** — 4 typed services + `overview` & `jawort` (sections) |
| `ausbildung_programs` | 4 | **mixed** — `soulcoach-level-1/2` (typed) + `uebersicht`, `infoanlaesse` (sections) |
| `workshops` | 6 | **mixed** — 4 monthly (typed) + `kalender-uebersicht`, `aktueller-monatsworkshop` (sections) |
| `pages` | 5 | block pages (sections) |
| `team` | 3 | people (typed, uploadable photo) |
| `legal` | 3 | markdown body |
| `site_settings` | 1 | nav + footer singleton |

**Three different rendering patterns are in use:**
1. **Typed pages** — praxis services (4), soulcoach L1/L2: named fields (`hero_image`, `narrative_body`…) + fixed bespoke JSX.
2. **`sec()` "section-bag"** — `uebersicht`, `jawort`, `ueber-uns`, `infoanlaesse`, `aktueller-monatsworkshop`, `kalender-uebersicht`, `ausbildung.astro`: read sections by a magic `type` string.
3. **`Blocks.astro` router** — `index`, `kontakt`, `neuigkeiten`, `praxisangebote` (overview): generic `sections[]` → component router.

**Content storage:** single images = top-level `image` fields (uploadable); card/section images = `string` sub-fields (paste-URL); repeating cards (offer cards, gallery, stage cards, practice offers, value cards, per-section testimonials) = **JSON strings inside repeater `items` sub-fields** (12 `jsonArray()` parse sites). Every page also carries a **full inline `FALLBACK` copy** of its content (10+ pages).

---

## 1. What's wrong / not optimal

### P1 — Two content models mixed inside one collection *(biggest structural smell)*
`praxisangebote` holds 4 **typed** service entries (~28 fields) **and** 2 **block** entries (`overview`, `jawort`) that only use `sections`. Same in `ausbildung_programs` and `workshops`.
→ In the admin, **every entry shows every field**. A service shows an empty `sections`; an overview shows empty `hero_category`, `process_steps`, `quote_image`, `narrative2_image`… ~25 irrelevant fields. Confusing for Theresia, no schema meaning, no validation value.
*(This is the cost of the earlier "put all 6 under one collection" change — it improved sidebar grouping but mixed two models.)*

### P2 — Repeating cards stored as JSON blobs *(root UX problem)*
Offer cards, stage cards, practice offers, the 22-photo Jawort gallery, value cards, and per-section testimonials are JSON strings in `items` sub-fields. The client edits **raw JSON**; there's no validation; **card images can't be uploaded** (string only). This is *forced* by EmDash (repeater sub-fields are scalar-only — no nesting, no `image` type), so the fix is architectural, not cosmetic.

### P3 — Content duplicated (CMS **and** inline fallback)
10+ pages carry a full `FALLBACK_SECTIONS` / inline copy of their content. The same text lives in the DB **and** the `.astro` file → they drift, and "no hardcoded content in the frontend" is violated by design.

### P4 — Three inconsistent rendering models
Typed templates, `sec()`-bag, and `Blocks` router. Three mental models, three ways to add a page, three places bugs hide.

### P5 — `sec()`-bag is *fake* flexibility
It reads sections by hardcoded `type` (`'hero'`, `'lehrerin'`, `'quote'`…) into a **fixed** JSX layout. If the client reorders/removes a section in the admin, the page does **not** reorder — it just loses that text (falls back). It looks like a block builder but isn't one: worst of both (JSON-ish data + rigid layout).

### P6 — Reusable data isn't shared via collections
- Team bios live in the `team` collection **and** are duplicated as JSON in `ueber-uns` (`sections.team` + the `team_image_1/2/3` hack).
- The same testimonials are copy-pasted across `soulcoach`, `kalender`, `aktueller`… with no shared source.
- FAQ sets are duplicated.
→ Editing one testimonial means editing it in N places.

### P7 — Schema changes are manual SQL
`emdash seed seed.json` **skips existing collections** (it won't add fields — "0 updated"), so every field addition was a hand-written `better-sqlite3` migration (`ALTER TABLE` + `_emdash_fields` INSERT). Error-prone (e.g. the `seo_title`-on-`workshops` failure). No repeatable migration path.

### P8 — Image value shapes are inconsistent
`imageUrl()` must handle 3 shapes: plain string, `{src}` (seeded), `{meta.storageKey}` (uploaded). Because images live in 3 different places (top-level / section-string / formerly-hardcoded), there's no single rule.

---

## 2. The one constraint that should drive the whole design

> **EmDash repeater sub-fields are scalar-only** (`string | text | number | integer | boolean | datetime | select`). No nested objects. No `image` sub-field.

Two consequences:
1. **Any repeating content that needs an image or structure must be its own Collection entry** — not an inline repeater/JSON. This single rule dissolves **P2, P6, and most of P8**.
2. A generic "page builder" (arbitrary reorderable blocks, each with an uploadable image) is **not achievable** in EmDash. Don't fight it — pick the model that fits a **fixed-design** site.

---

## 3. Recommended architecture — 3 clean layers

**Collections = data · Pages = which data + layout · Blocks = how it looks.**
Text and images come from Collections or top-level Page fields. Nothing hardcoded. Cards become Collection entries (uploadable, validated).

### Layer 1 — Collections (dynamic, reusable data)
One collection per *kind of thing*; each entry self-contained with its **own uploadable image**:
- `services` (today's praxisangebote, the 4) — typed.
- `programs` (ausbildung L1/L2) — typed.
- `workshops` (monthly) — typed. *(already correct)*
- `team` (3 people) — **the single source** for any person shown anywhere.
- `testimonials` **(NEW)** — each review an entry, tagged by context.
- `faq` **(NEW, optional)** — each Q&A tagged by category.
- `legal` (3) — markdown. *(fine as-is)*
- **Remove** the overview/landing entries from the typed collections.

### Layer 2 — Pages (templates: layout + references to collections)
A `pages` collection holds only real pages (home, ueber-uns, the 3 overviews, jawort, kalender, aktueller, kontakt, news). Each page = SEO + a **small set of named, typed fields** for its fixed layout. For repeating content, the page **references a collection + filter**, never inline JSON:
- `ueber-uns` → renders the `team` collection (no team JSON, no `team_image_*`).
- `kalender` → renders `workshops` *(already does)*.
- any "Stimmen" section → a `testimonials_context` select → renders matching `testimonials`.

Single images (hero / narrative / band photos) = **top-level `image` fields** (uploadable). For a fixed design + non-technical client, this is the right call.

### Layer 3 — Blocks (presentational components, in code)
Keep the Astro organisms (`NarrativeBlock`, `TestimonialsBlock`, `OfferCardsBlock`…). They're already reusable. A page template maps its fields → these components. Keep **one** `Blocks.astro` router only if you want a couple of genuinely flexible pages; otherwise prefer explicit templates.

---

## 4. Example schemas

### `testimonials` (NEW collection)
```json
{ "slug": "testimonials", "label": "Stimmen", "supports": ["drafts"],
  "fields": [
    { "slug": "quote",   "type": "text" },
    { "slug": "name",    "type": "string" },
    { "slug": "role",    "type": "string" },
    { "slug": "photo",   "type": "image" },                       // uploadable
    { "slug": "context", "type": "select",
      "validation": { "options": ["praxis","ausbildung","workshop","jawort","general"] } },
    { "slug": "featured","type": "boolean" }
  ] }
```
A "Stimmen" block becomes **one field** on the page — `context` (select). Render:
```ts
const { entries } = await getEmDashCollection('testimonials', { where: { context }, orderBy:{ featured:'desc' } });
```
Edit a quote once → it updates on every page that shows that context.

### `team` block — reference, not JSON
`ueber-uns` keeps **no** team data. It just renders the collection:
```ts
const { entries: team } = await getEmDashCollection('team', { orderBy:{ sort_order:'asc' } });
```
Photos are uploadable via the `team` collection. Delete `sections.team` + `team_image_1/2/3`.

### Clean page template (e.g. `ueber-uns`) — named fields, no JSON, no inline fallback
```
seo_title, seo_description,
hero_eyebrow, hero_title, hero_image(image), hero_paragraphs(repeater:{text}),
intro_title, intro_body, intro_image(image),
quote_text, quote_attribution, quote_image(image),
newsletter_title, newsletter_body
+ team comes from the team collection
+ values: a small `value_cards` repeater (text-only) OR a tiny `values` collection if icons need upload
```

### Gallery (Jawort 22 photos) → a `gallery` collection
Each photo an entry `{ image(upload), alt, album(select), sort_order }`, filtered by album. Uploadable, reorderable.

---

## 5. Actionable steps (prioritized)

**P0 — highest value, low risk**
1. **Create `testimonials` collection**, migrate all reviews in with a `context` tag, and replace every hardcoded/seeded testimonial set with `getEmDashCollection('testimonials',{context})`. Kills the biggest duplication (P3/P6).
2. **`ueber-uns` renders the `team` collection**; delete the team JSON + `team_image_1/2/3`. One source for people (P6).

**P1**
3. **Un-mix the collections.** Either: (a) move `overview/jawort/uebersicht/infoanlaesse/kalender/aktueller` into proper **page templates** in `pages` (cleanest), or (b) if you want to keep them grouped in the sidebar, use EmDash **field-groups/conditional fields** so a service doesn't show `sections` and an overview doesn't show 25 service fields (P1).
4. **Convert JSON-blob cards to small collections** (offer cards, stage cards, practice offers, gallery, value cards) referenced by the page → uploadable images + validated fields (P2/P8).

**P2**
5. **Delete inline `FALLBACK` content.** One source of truth (CMS). Pages render CMS or a tiny neutral placeholder — not a full copy (P3).
6. **Standardize on one rendering model** (named typed templates) and retire `sec()`-bag (P4/P5).
7. **Add a real migration workflow:** keep the schema in `seed/seed.json` and write one idempotent `migrate.cjs` that diffs `seed.json` against `_emdash_fields` and applies `ALTER`/`INSERT`. Field changes become repeatable, not ad-hoc (P7).

**P3**
8. Keep `imageUrl()` as the single image accessor; use `image`-type fields anywhere a single image is needed (P8).

---

## 6. Trade-off (be explicit)
This moves **away from a generic page-builder** toward **structured typed templates + collections**. For a fixed-design, non-technical-client site like VitaLunaris that's the right trade: cleaner admin, uploadable images, validation, no JSON, no duplication. The only thing you give up is **arbitrary block reordering** — which this site doesn't use.

## 7. If I had to pick the top 3 to do first
1. `testimonials` collection (removes the most duplication, instantly reusable).
2. `ueber-uns` → read the `team` collection (removes a whole class of duplicate-people bugs).
3. The `migrate.cjs` workflow (makes every future schema change safe and repeatable).
