// Small helpers shared by EmDash-backed pages.
import { getEmDashCollection } from 'emdash';

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
