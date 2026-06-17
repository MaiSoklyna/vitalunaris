# VitaLunaris — SEO / GEO Analysis

_Generated during the full-site SEO + GEO pass. Site: Astro (static) → Cloudflare Workers; target domain `vitalunaris.ch`._

## GEO Readiness Score: 82 / 100

| Platform | Score | Notes |
|---|---|---|
| Google AI Overviews | 85 | SSR/static (crawlable), clean H1→H3, FAQ Q&A blocks, LocalBusiness schema, sitemap |
| ChatGPT / OAI-SearchBot | 80 | Allowed in robots; entity (LocalBusiness + founders) present; needs external brand mentions |
| Perplexity | 78 | Allowed; strong on-page facts; would benefit from Reddit/community presence |

## What was implemented this pass

| Item | Status |
|---|---|
| **Sitemap** (`/sitemap-index.xml`) | ✅ added — `@astrojs/sitemap` was installed but never wired into `astro.config` |
| **robots.txt** | ✅ added — allows all + explicitly GPTBot, OAI-SearchBot, ChatGPT-User, ClaudeBot, PerplexityBot, Google-Extended; links sitemap |
| **llms.txt** | ✅ added — structured map of all key pages + business facts for AI engines |
| **LocalBusiness / ProfessionalService JSON-LD** | ✅ added site-wide in `BaseLayout` (name, address Buchs SG, phone, email, founders Theresia & Axel Jansen, `sameAs` socials) |
| **Open Graph / Twitter** | ✅ enhanced — `og:site_name`, `og:locale=de_CH`, absolute `og:image`, `twitter:title/description/image` |
| Canonicals, `lang="de"`, per-page title + description | ✅ already present (good) |
| Server-side rendering (AI crawlers don't run JS) | ✅ static HTML — all content crawlable |

## Technical accessibility
- **SSR/static:** all page content is in the static HTML (no client-only rendering) — fully crawlable by AI bots. ✅
- **Forms** are iframed (Alchemy) — fine, they're not primary content.
- **24 indexable pages, 0 broken internal links, 0 lorem ipsum.** ✅

## Top 5 highest-impact next steps
1. **Real OG share image** — `og:image` is currently the logo SVG; most social/AI platforms ignore SVG. Add a 1200×630 JPG/PNG (branded, with Theresia & Axel) for link previews.
2. **Brand mentions off-site** (correlates ~3× more with AI citations than backlinks): a Google Business Profile for Buchs SG, plus mentions on a couple of Swiss directories / a YouTube intro video.
3. **Per-offer schema** — add `Course` schema to the Soulcoach Level 1/2 pages and `Service` schema to each Praxisangebot for richer AI/SERP understanding.
4. **Self-contained answer blocks** — open key pages (Aufstellen, Hypnose, Ausbildung) with a 40–60 word "Was ist …?" definition; keep answer passages to ~134–167 words (optimal AI-citation length).
5. **Google Business Profile + reviews** — strongest local-intent signal for "systemisches Aufstellen Buchs / St. Gallen" type queries.

## Notes
- Canonicals + sitemap already point to `https://vitalunaris.ch` (correct), so SEO is ready the moment the domain's nameservers go live.
- FAQ structured-data markup intentionally **not** added (Google retired FAQ rich results for non-gov/health sites; the on-page Q&A format is what AI engines extract).
