# VitaLunaris

Website for **VitaLunaris** — a systemic & energetic coaching practice and certification school
run by Theresia & Axel Jansen. Built on [EmDash](https://www.npmjs.com/package/emdash) (a
CMS for Astro) so the client can edit every page from an admin dashboard.

- **Live content model:** three audiences routed from the homepage — *Ausbildung* (Systemic
  Soulcoach certification), *Praxisangebote* (1:1 practice offerings), and *Workshops & Kurse*.
- **Not** medical psychotherapy — services are private and not covered by Krankenkasse (a
  deliberate compliance framing kept in the FAQ copy).

## Stack

| Layer      | Tech                                                        |
| ---------- | ----------------------------------------------------------- |
| Framework  | Astro 6 + React 19 (islands) + MDX                          |
| Styling    | Tailwind CSS 4                                              |
| CMS        | EmDash 0.22 (`emdash`, `@emdash-cms/cloudflare`)            |
| Data (dev) | SQLite — `./data.db`                                        |
| Data (prod)| Cloudflare D1 (content) + R2 (media) + KV                   |
| Deploy     | Cloudflare Workers via `wrangler`                           |

## Getting started (local)

> **Node version matters.** Astro/Vite need Node ≥ 22.15 (`module.registerHooks`) and
> `better-sqlite3` is a native module compiled for Node 24's ABI. If you run under the wrong
> Node you'll get `NODE_MODULE_VERSION` errors.

```bash
npm install
npm run dev
```

`npm run dev` runs `scripts/dev.cmd`, a Windows launcher that prepends **Laravel Herd's Node 24**
(`~/.config/herd/bin/nvm/v24*`) to `PATH` before starting `astro dev`, so it works regardless of
the shell's default Node. If your shell is already on Node ≥ 24, `npm run dev:astro` (plain
`astro dev`) also works.

- **Site:** http://localhost:4321
- **Admin dashboard:** http://localhost:4321/_emdash/admin
- **Dev login bypass:** http://localhost:4321/_emdash/api/setup/dev-bypass

### Seeding content

```bash
npm run em:seed       # seed from seed/seed.json (fresh DB)
npm run em:content    # apply seed/content-export.json with --on-conflict=update
npm run em:types      # regenerate EmDash types
```

## Content model

Content lives in EmDash collections, all backed by a single live collection (`src/live.config.ts`
registers `_emdash` via `emdashLoader()`). Main collections:

| Collection          | Holds                                                        |
| ------------------- | ----------------------------------------------------------- |
| `pages`             | Block-built pages (home, kontakt, neuigkeiten, ueber-uns)   |
| `praxisangebote`    | 1:1 offering pages (hypnose, aufstellungen, jawort, …)      |
| `ausbildung_programs` | Certification programs (soulcoach L1/L2, infoanlaesse)    |
| `workshops`         | Workshops & courses                                         |
| `team`              | People (Theresia, Axel, Marlen)                             |
| `testimonials`, `info_cards`, `offer_cards`, `value_cards` | Shared card sets, resolved by *Kontext* |
| `legal`             | agb / impressum / datenschutz                               |

### Querying in pages

```ts
import { getEmDashEntry, getEmDashCollection } from 'emdash';

const { entry } = await getEmDashEntry('praxisangebote', 'hypnose');
const d = entry.data;                    // fields live under entry.data
const faqItems = d.faq_items ?? [];      // e.g. [{ question, answer }]
```

Always provide a **static fallback** for each field. Shared helpers (`nl2br`, `jsonArray`,
`imageUrl`, …) live in `src/lib/cms.ts`.

## Admin customizations

`src/middleware.ts` injects small, self-guarded scripts into the EmDash admin (`/_emdash/admin`)
to add ergonomics the CMS lacks natively. **These are additive** — they only insert their own
marked nodes and drive the form the way a user would (native value setters + input/change events):

- **Scroll-on-add** — scrolls a newly added repeater row into view.
- **Field hints & ordering** — top-to-bottom field order matching the page, plus per-block hints
  ("edit the list below").
- **Row tools** — a per-row **Duplicate** button, and on the FAQ list an **"import from another
  page"** control that copies another page's Q&A into the current page's FAQ list.

The FAQ importer is fed by **`src/pages/api/faq-sets.json`** (read-only), which lists every
entry that has an FAQ so the picker can offer them.

> The importer **copies** items — it does not link them. After import the two pages' FAQs are
> independent (editing one does not update the other).

## Build & deploy

```bash
npm run build      # astro build (Cloudflare adapter)
npm run deploy     # astro build && npx wrangler deploy
```

Prod runs against Cloudflare D1/R2 (`EMDASH_TARGET=cloudflare`).

## Project structure

```
src/
  components/    atoms / molecules / organisms
  pages/         Astro routes (+ pages/api/ endpoints)
  lib/cms.ts     EmDash query helpers
  live.config.ts EmDash live collection registration
  middleware.ts  admin UI enhancements (see above)
seed/            seed + content export JSON
scripts/         dev.cmd / build.cmd launchers (Node 24 via Herd)
```
