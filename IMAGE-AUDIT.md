# VitaLunaris — Image Audit (every image, every page) 🖼️

Goal: confirm **every image** on the site can be changed in EmDash. Result below.

## Two ways an image is edited in EmDash

| Type | How the client changes it | Where it's used |
|---|---|---|
| 🟢 **Uploadable field** | Image field with an **upload/media picker** — click, upload a photo, done. | Hero photos, narrative photos, person photos, the Lehrerin / "Theresia & Axel" bands. |
| 🟡 **Paste-a-URL field** | A **text field**. Upload the photo once in the **Mediathek**, copy its URL, paste it in. | Images **inside repeating cards/sections** (offer cards, gallery, stage cards, event cards, section images). |

> **Why two types?** EmDash's repeating lists (cards, galleries, sections) technically can't host an upload-picker per item. So those images are a text field where you paste a URL. Everything is editable — the only difference is upload-picker vs paste-URL.

🔵 **Decorative** = brand graphics, curve lines, button arrows, the logo. These are part of the design and aren't meant to be changed by the client (not listed below).

---

## Per-page result

### Praxisangebote — services (Hypnose, Aufstellungen, Numerologie, Fussreflex)
| Image | Edit |
|---|---|
| Hero photo | 🟢 upload (`hero_image`) |
| Narrative photo | 🟢 upload (`narrative_image`) |
| Quote photo (Aufstellungen, Fussreflex) | 🟢 upload (`quote_image`) |
| Person photo (begleitende Person) | 🟢 upload (**Team** → image) |

### Praxisangebote — Übersicht / Jawort (block pages)
| Image | Edit |
|---|---|
| Hero graphic, offer-row photos, "Wo Wissen…" photo, Jawort gallery (22), Jawort bio | 🟡 paste-URL (section/card fields) |

### Ausbildung — Soulcoach Level 1 & 2  ✅ *(just fixed)*
| Image | Edit |
|---|---|
| Hero | 🟢 upload (`hero_image`) |
| Narrativ 1 | 🟢 upload (`narrative_image`) |
| **Narrativ 2 (Section 4)** | 🟢 **upload (`narrative2_image`)** — was hardcoded, now editable |
| **Lehrerin-Band** | 🟢 **upload (`lehrerin_image`)** — was hardcoded, now editable |

### Ausbildung — Übersicht / Start (block pages)
| Image | Edit |
|---|---|
| Narrative, Stage-Cards, Lehrerin, Quote, Dark-CTA bg | 🟡 paste-URL (section/card fields) |

### Ausbildung — Infoanlässe
| Image | Edit |
|---|---|
| Hero, Narrativ | 🟡 paste-URL (section fields) |
| **"Theresia & Axel"-Band** | 🟢 **upload (`about_image`)** — was hardcoded, now editable |
| "Weitere Kurse" cards | 🟢 from each Workshop's `card_image` |

### Workshops — the 4 monthly workshops (detail pages)
| Image | Edit |
|---|---|
| Hero | 🟢 upload (`hero_image`) |
| Narrativ | 🟢 upload (`narrative_image`) |
| Card image (calendar + cards) | 🟢 upload (`card_image`) |
| **"Theresia & Axel"-Band** | 🟢 **upload (`about_image`)** — was hardcoded, now editable |

### Workshops — Kalender & Aktueller Monatsworkshop (block pages)
| Image | Edit |
|---|---|
| Featured photo, hero/narrative/about photos | 🟡 paste-URL (section fields) |
| Calendar cards | 🟢 from each Workshop's `card_image` |

### Seiten — Startseite, Über uns, Kontakt, News
| Image | Edit |
|---|---|
| Hero (Start, Kontakt) | 🟢 upload (`hero_image`) |
| **Über uns — 3 team photos** | 🟢 **upload** (`team_image_1/2/3` · Theresia/Axel/Marlen) |
| Narrative photos, offer-card icons, value-card icons, quote, gallery | 🟡 paste-URL (section/card fields) |

### Team & Rechtliches
| Image | Edit |
|---|---|
| Person photos (Theresia, Axel, Marlen) | 🟢 upload (**Team** → image) |
| Legal pages | (no images) |

---

## Summary
- ✅ **Every content image is editable in EmDash.**
- 🟢 All the **main/important images** (heroes, narratives, person photos, and the Lehrerin / "Theresia & Axel" bands I just wired) are **uploadable** with the media picker.
- 🟡 Images **inside cards/galleries/sections** are changed by **pasting a Mediathek URL** (EmDash limitation for repeating lists).
- 🔧 **Fixed in this pass:** the 6 previously-hardcoded band images on Soulcoach L1/L2, Infoanlässe, and the Workshop detail pages are now uploadable fields.

### How to "paste-a-URL" (for the 🟡 images)
1. In the admin, open **Mediathek**, upload your photo.
2. Copy its URL (looks like `/_emdash/api/media/file/….jpg`).
3. Paste it into the image text field of the card/section → **Save**.
