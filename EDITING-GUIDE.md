# VitaLunaris — Editing Guide (EmDash CMS)

Every page on the site is editable through the EmDash admin. Nothing requires code.

**Admin login:** `https://vitalunaris.ch/_emdash/admin`
(Local while developing: `http://localhost:4321/_emdash/admin`)

**How editing works:** content is grouped into *collections* in the left sidebar of the admin.
Open a collection → pick the entry → change the fields → **Save**. The live page updates.
Text fields, images, and repeatable cards (FAQ, testimonials, steps…) all have their own editors.

---

## Quick map — page → where to edit it

### Home
| Page | URL | Edit in admin |
|------|-----|---------------|
| Startseite | `/` | **Seiten** → `home` |

### Praxisangebote (6)
| Page | URL | Edit in admin |
|------|-----|---------------|
| Übersicht | `/praxisangebote` | **Praxisangebote** → `overview` |
| 1:1 Aufstellung | `/praxisangebote/aufstellungen` | **Praxisangebote** → `aufstellungen` |
| Hypnose | `/praxisangebote/hypnose` | **Praxisangebote** → `hypnose` |
| Numerologie-Beratung | `/praxisangebote/numerologieberatung` | **Praxisangebote** → `numerologieberatung` |
| Fussreflexzonenmassage | `/praxisangebote/fussreflexzonenbehandlung` | **Praxisangebote** → `fussreflexzonenbehandlung` |
| Jawort by Jansen | `/praxisangebote/jawort-by-jansen` | **Praxisangebote** → `jawort-by-jansen` |

### Systemische Ausbildung (4 + landing)
| Page | URL | Edit in admin |
|------|-----|---------------|
| Ausbildung (Start) | `/ausbildung` | **Seiten** → `ausbildung-overview` |
| Übersicht | `/ausbildung/uebersicht` | **Ausbildung (Programme)** → `uebersicht` |
| Soulcoach Level 1 | `/ausbildung/soulcoach-level-1` | **Ausbildung (Programme)** → `soulcoach-level-1` |
| Soulcoach Level 2 | `/ausbildung/soulcoach-level-2` | **Ausbildung (Programme)** → `soulcoach-level-2` |
| Infoanlässe | `/ausbildung/infoanlaesse` | **Ausbildung (Programme)** → `infoanlaesse` |

### Workshops & Kurse
| Page | URL | Edit in admin |
|------|-----|---------------|
| Aktueller Monatsworkshop *(main page)* | `/workshops-kurse/aktueller-monatsworkshop` | **Workshops & Kurse** → `aktueller-monatsworkshop` |
| Kalender & Übersicht | `/workshops-kurse/kalender-uebersicht` | **Workshops & Kurse** → `kalender-uebersicht` (calendar/cards derive from the monthly workshops below) |
| SoulTap gegen deine Angst | `/workshops-kurse/soultap-gegen-angst` | **Workshops & Kurse** → `soultap-gegen-angst` |
| Im Vagusnerv liegt die Ruhe | `/workshops-kurse/vagusnerv-ruhe` | **Workshops & Kurse** → `vagusnerv-ruhe` |
| Cool down for Christmas | `/workshops-kurse/cool-down-for-christmas` | **Workshops & Kurse** → `cool-down-for-christmas` |
| Advents-Geschichten | `/workshops-kurse/adventsgeschichten` | **Workshops & Kurse** → `adventsgeschichten` |

> **Tip:** to add a new workshop, create a new entry in **Workshops & Kurse**, set its date,
> and it automatically appears on the calendar and in the "Nächste Kurse" cards — no code needed.

### Weitere Seiten
| Page | URL | Edit in admin |
|------|-----|---------------|
| News | `/neuigkeiten` | **Seiten** → `neuigkeiten` |
| Über uns | `/ueber-uns` | **Seiten** → `ueber-uns` |
| Kontakt | `/kontakt` | **Seiten** → `kontakt` |

### Rechtliches
| Page | URL | Edit in admin |
|------|-----|---------------|
| AGB | `/agb` | **Rechtliches** → `agb` |
| Datenschutz | `/datenschutz` | **Rechtliches** → `datenschutz` |
| Impressum | `/impressum` | **Rechtliches** → `impressum` |

### Navigation menu & Footer
Both the top menu and the footer are editable in **Seiten-Einstellungen** (`site_settings`).
| What | Field |
|------|-------|
| Top menu items | `nav_items` — each has a **Beschriftung** (label) + **Link**. For dropdowns, fill **Unterpunkte** with a JSON list, e.g. `[{"label":"Übersicht","href":"/praxisangebote"}]`. Tick **Direkt verlinken** to make a parent jump straight to its link. |
| Footer link columns | `footer_columns` — each column has a **Titel** + **Links** (JSON list of `{label,href}`). |
| Footer legal links | `footer_legal` (Impressum / Datenschutz / AGB). |
| Footer phone numbers | `footer_phones` (name + number). |
| Footer e-mail / address | `contact_email` / `address`. |
| Social links | `social_links` (platform + URL — Facebook & Instagram). |
| Footer copyright line | `footer_copyright`. |

### Team (people, shared across pages)
The three practitioner bios are edited once in **Team** and appear on the matching pages.
Each person has their own uploadable **Portrait** and **Bio-Absätze** — the *Über uns* page now pulls
its team bios straight from here (edit the photo/bio once, it updates everywhere).
| Person | Edit in admin |
|--------|---------------|
| Theresia Jansen | **Team** → `theresia-jansen` |
| Axel Jansen | **Team** → `axel-jansen` |
| Marlen Berger | **Team** → `marlen-berger` |

### Stimmen (testimonials, shared across pages)
All reviews live in one **Stimmen** collection. Each review is one entry with **Zitat**, **Name**,
optional **Foto** (uploadable) and a **Seite / Kontext** tag that decides which page it appears on.
Edit a review once → it updates on every page showing that context.
| Context tag | Shown on |
|-------------|----------|
| `praxis-hypnose` / `praxis-aufstellungen` / `praxis-numerologie` / `praxis-fussreflex` | the matching Praxisangebot |
| `ausbildung` | Ausbildung Start, Übersicht, Soulcoach L1 & L2 |
| `jawort` | Jawort by Jansen |
| `workshop-aktueller` / `workshop-kalender` | the monthly workshop / the calendar page |
| `home` | Startseite |

> **Add a review:** open **Stimmen** → *+ Eintrag* → type the quote + name, pick the context, Save.
> To show it on another page too, add a second entry with that page's context.

---

## ✨ New: every card list is now a proper editor (no more JSON)

Repeating content — **FAQ** (Frage/Antwort), **stage cards**, **info cards**, **value cards**,
**price lists**, **paragraphs**, and the **Jawort photo gallery (22 photos, now with an upload
button per image)** — is edited as a labeled list, not raw JSON. On each page's entry you'll see a
list with an *+ Eintrag* button; fill the labeled fields (and click the image upload where present),
reorder by dragging, delete with the trash icon. Same editor everywhere.

---

## Good to know

- **Booking links** are editable per service (the "Termin buchen" button URL is a field on each Praxisangebot).
- **Contact / newsletter forms** still send by e-mail (`mailto:`). Their labels, placeholders and recipient are editable; real server-side capture is a possible future upgrade.
- **Collections explained:**
  - **Praxisangebote / Ausbildung (Programme) / Workshops & Kurse** = the repeating service pages, each with friendly named fields.
  - **Seiten** = the bespoke landing pages (Home, Über uns, Kontakt, overviews, Jawort…), built from editable sections.
  - **Team** = the three people. **Stimmen** = all testimonials (tagged by page). **Rechtliches** = the legal texts.

## Not yet in the CMS (possible follow-ups)
- A few images still use the design **placeholders** — these image fields are editable, so real photos can be uploaded anytime.
