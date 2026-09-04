// Small helpers shared by EmDash-backed pages.
import { getEmDashCollection, getEmDashEntry } from 'emdash';

/**
 * Load testimonials for a given page context from the shared `testimonials`
 * collection (one editable "Stimmen" place in the admin — no per-page JSON).
 * Returns the shape TestimonialsBlock expects ({ quote, name }), ordered by the
 * entry's `sort_order`. Returns [] on any error so callers can fall back.
 */
export async function getTestimonials(context: string): Promise<Array<{ quote: string; name: string }>> {
  try {
    const { entries } = await getEmDashCollection('testimonials', { orderBy: { sort_order: 'asc' } });
    return (entries ?? [])
      .filter((e: any) => e.data?.context === context)
      .map((e: any) => ({ quote: e.data?.quote ?? '', name: e.data?.name ?? '' }));
  } catch {
    return [];
  }
}

/**
 * Load info-cards for a given context from the shared `info_cards` collection,
 * so an "Info-Karten" block can be added to any page (the editor picks a context).
 * Returns the shape InfoCardsRow expects ({ eyebrow, body }), ordered by sort_order.
 */
export async function getInfoCards(context: string): Promise<Array<{ eyebrow: string; body: string }>> {
  try {
    const { entries } = await getEmDashCollection('info_cards', { orderBy: { sort_order: 'asc' } });
    return (entries ?? [])
      .filter((e: any) => e.data?.context === context)
      .map((e: any) => ({ eyebrow: e.data?.eyebrow ?? '', body: e.data?.body ?? '' }));
  } catch {
    return [];
  }
}

/**
 * Map an internal link (a `cta_href` like "/praxisangebote/hypnose") to the
 * EmDash collection + slug of the page it points at. Returns null for external
 * links or paths that don't match a known route. The rules mirror src/pages/:
 *   /                          → pages/home
 *   /praxisangebote            → praxisangebote/overview
 *   /praxisangebote/<slug>     → praxisangebote/<slug>
 *   /ausbildung                → pages/ausbildung-overview
 *   /ausbildung/<slug>         → ausbildung_programs/<slug>
 *   /workshops-kurse/<slug>    → workshops/<slug>
 *   /impressum|/datenschutz|/agb → legal/<slug>
 *   /<slug>                    → pages/<slug>  (ueber-uns, kontakt, neuigkeiten)
 */
function routeToEntry(href: string): { collection: string; slug: string } | null {
  if (!href || /^https?:\/\//i.test(href) || href.startsWith('#') || href.startsWith('mailto:')) return null;
  const path = href.split(/[?#]/)[0].replace(/\/+$/, '');
  const seg = path.split('/').filter(Boolean);
  if (seg.length === 0) return { collection: 'pages', slug: 'home' };
  const [first, second] = seg;
  if (first === 'praxisangebote') return { collection: 'praxisangebote', slug: second ?? 'overview' };
  if (first === 'ausbildung') return second ? { collection: 'ausbildung_programs', slug: second } : { collection: 'pages', slug: 'ausbildung-overview' };
  if (first === 'workshops-kurse' && second) return { collection: 'workshops', slug: second };
  if (['impressum', 'datenschutz', 'agb'].includes(first)) return { collection: 'legal', slug: first };
  if (seg.length === 1) return { collection: 'pages', slug: first };
  return null;
}

// Which fields on each collection hold a card's title / description / image.
// First non-empty wins, so a page-specific field can fall back to SEO/hero.
const CARD_FIELDS: Record<string, { title: string[]; desc: string[]; image: string[] }> = {
  pages:               { title: ['hero_title'], desc: ['seo_description', 'hero_subtitle'], image: ['hero_image'] },
  praxisangebote:      { title: ['hero_title'], desc: ['hero_description', 'seo_description'], image: ['hero_image'] },
  ausbildung_programs: { title: ['hero_title'], desc: ['hero_subtitle', 'seo_description'], image: ['hero_image'] },
  workshops:           { title: ['card_title', 'title'], desc: ['card_description', 'hero_description'], image: ['card_image', 'hero_image'] },
  legal:               { title: ['title'], desc: [], image: [] },
};

/**
 * Resolve the title / description / image of the page an internal link points
 * at, so a card can auto-fill from its target ("set the Link, get the rest").
 * Returns null for external/unknown links or a missing entry. Values are
 * whatever the target page already publishes; callers decide what to use.
 */
export async function resolvePageCard(href: string): Promise<{ title: string; description: string; image: string } | null> {
  const target = routeToEntry(href);
  if (!target) return null;
  const map = CARD_FIELDS[target.collection];
  if (!map) return null;
  try {
    const { entry } = await getEmDashEntry(target.collection, target.slug);
    const d: Record<string, any> = entry?.data ?? {};
    const pick = (keys: string[]): any => {
      for (const k of keys) {
        const v = d[k];
        if (v !== null && v !== undefined && v !== '') return v;
      }
      return '';
    };
    // Hero titles/subtitles can carry layout markup (e.g. <br/>); a card wants
    // plain text, so drop tags and collapse whitespace.
    const plain = (v: any): string =>
      String(v ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return {
      title: plain(pick(map.title)),
      description: plain(pick(map.desc)),
      image: imageUrl(pick(map.image)),
    };
  } catch {
    return null;
  }
}

/**
 * Load offer-cards (icon + title + text + CTA) for a context from the shared
 * `offer_cards` collection, so an "Angebots-Karten" block works on any page.
 * Maps cta_text/cta_href → ctaText/ctaHref (the shape OfferCardsBlock expects).
 *
 * Auto-fill: when a card links to an internal page (`cta_href`), any of
 * title / description / icon left blank is filled from that page's own
 * title / description / image — so the editor can set just the Link and let
 * the rest follow. Explicit values on the card always win.
 */
export async function getOfferCards(context: string): Promise<Array<{ icon: string; title: string; description: string; ctaText: string; ctaHref: string; imageIsCover: boolean }>> {
  try {
    const { entries } = await getEmDashCollection('offer_cards', { orderBy: { sort_order: 'asc' } });
    const filtered = (entries ?? []).filter((e: any) => e.data?.context === context);
    return await Promise.all(
      filtered.map(async (e: any) => {
        const d = e.data ?? {};
        let title = d.title ?? '';
        let description = d.description ?? '';
        let icon = imageUrl(d.icon);
        // An explicitly-set icon is a decorative illustration; an image pulled
        // from the linked page is a photo → render it as a full card cover.
        let imageIsCover = false;
        const ctaHref = d.cta_href ?? '';
        if (ctaHref && (!title || !description || !icon)) {
          const page = await resolvePageCard(ctaHref);
          if (page) {
            if (!title) title = page.title;
            if (!description) description = page.description;
            if (!icon && page.image) { icon = page.image; imageIsCover = true; }
          }
        }
        return { icon, title, description, ctaText: d.cta_text ?? '', ctaHref, imageIsCover };
      })
    );
  } catch {
    return [];
  }
}

/**
 * Load value-cards (icon + title + body) for a context from the shared
 * `value_cards` collection, so a "Wert-Karten" block works on any page.
 */
export async function getValueCards(context: string): Promise<Array<{ icon: string; title: string; body: string }>> {
  try {
    const { entries } = await getEmDashCollection('value_cards', { orderBy: { sort_order: 'asc' } });
    return (entries ?? [])
      .filter((e: any) => e.data?.context === context)
      .map((e: any) => ({ icon: imageUrl(e.data?.icon), title: e.data?.title ?? '', body: e.data?.body ?? '' }));
  } catch {
    return [];
  }
}

/**
 * Convert plain-text newlines (as stored in EmDash `text` fields) into <br/>
 * tags so they render correctly in components that use `set:html`.
 * Returns '' for empty/nullish input so callers can do `nl2br(x) || fallback`.
 */
export function nl2br(value?: string | null): string {
  if (!value) return '';
  return value.replace(/\r\n/g, '\n').replace(/\n/g, '<br/>');
}

/**
 * Parse a sub-field that stores a JSON array as text (EmDash repeaters cannot
 * nest, so nested card arrays are stored as JSON strings). Tolerates already
 * parsed arrays and malformed JSON.
 */
export function jsonArray<T = any>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Parse a "one item per line" text field into a string array. Tolerates a legacy
 * JSON-array string (older data) and an already-parsed array, so callers can switch
 * a field from JSON to plain newline-separated text without a hard data cutover.
 */
export function textLines(value: unknown): string[] {
  if (Array.isArray(value)) return value as string[];
  if (typeof value === 'string') {
    const t = value.trim();
    if (!t) return [];
    if (t.startsWith('[')) { try { const p = JSON.parse(t); if (Array.isArray(p)) return p; } catch {} }
    return t.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

/**
 * EmDash `image` fields come back as a plain string when seeded, but as an
 * object `{ id, provider, src }` (or `{ url }`) once edited/saved in the admin.
 * This returns the usable URL string for either form (and '' for empty).
 */
export function imageUrl(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const o = value as Record<string, any>;
    // Seeded/external image objects carry an explicit src/url.
    if (o.src) return o.src;
    if (o.url) return o.url;
    // Images uploaded via the admin media library reference the file by its
    // storage key; the local media provider serves it at this path.
    const key = o.meta?.storageKey || o.storageKey;
    if (key) return `/_emdash/api/media/file/${key}`;
  }
  return '';
}

/**
 * Recursively flatten EmDash image-field objects ({id/provider/src} or {url})
 * into plain URL strings throughout an entry's data, so templates can use the
 * fields directly. Mutates and returns the same object. Only touches values
 * that look like an EmDash media object — leaves repeater rows etc. untouched.
 */
export function normalizeImages<T>(data: T): T {
  const isMediaObj = (v: any) =>
    v && typeof v === 'object' && !Array.isArray(v) &&
    ('src' in v || 'url' in v) && ('id' in v || 'provider' in v);
  const walk = (obj: any): void => {
    if (Array.isArray(obj)) { obj.forEach(walk); return; }
    if (obj && typeof obj === 'object') {
      for (const k of Object.keys(obj)) {
        const v = obj[k];
        if (isMediaObj(v)) obj[k] = v.src || v.url || '';
        else if (v && typeof v === 'object') walk(v);
      }
    }
  };
  walk(data);
  return data;
}

/**
 * Parse a sub-field that stores a JSON object/array as text. Returns the parsed
 * value, the value itself if already an object, or {} on failure. Used for block
 * config that isn't a card array (e.g. newsletter placeholder/submit, CTA pairs).
 */
export function parseJson<T = any>(value: unknown, fallback: T = {} as T): T {
  if (value && typeof value === 'object') return value as T;
  if (typeof value === 'string' && value.trim()) {
    try { return JSON.parse(value) as T; } catch { return fallback; }
  }
  return fallback;
}
