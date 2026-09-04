import type { APIRoute } from 'astro';
import { getEmDashCollection } from 'emdash';

/**
 * Lists every entry that has an FAQ list, grouped for the admin "FAQ importieren"
 * picker (src/middleware.ts ROW_TOOLS). Each set carries its Q&A so the editor can
 * copy another page's FAQ into the current page's inline list. Read-only.
 */
const COLLS = ['pages', 'praxisangebote', 'ausbildung_programs', 'workshops'] as const;
const COLL_LABEL: Record<string, string> = {
  pages: 'Seiten',
  praxisangebote: 'Praxisangebote',
  ausbildung_programs: 'Ausbildung',
  workshops: 'Workshops',
};

const clean = (s: unknown) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

export const GET: APIRoute = async () => {
  const sets: Array<{ label: string; slug: string; collection: string; items: Array<{ question: string; answer: string }> }> = [];
  for (const coll of COLLS) {
    try {
      const { entries } = await getEmDashCollection(coll, {});
      for (const e of entries ?? []) {
        const raw = (e as any).data?.faq_items;
        if (!Array.isArray(raw) || !raw.length) continue;
        const items = raw
          .map((q: any) => ({ question: clean(q?.question), answer: (q?.answer ?? '').toString() }))
          .filter((q) => q.question);
        if (!items.length) continue;
        const name = clean((e as any).data?.hero_title || (e as any).data?.title || (e as any).slug || (e as any).id) || (e as any).slug;
        sets.push({ label: `${name} · ${COLL_LABEL[coll] || coll}`, slug: (e as any).slug ?? (e as any).id, collection: coll, items });
      }
    } catch {
      /* skip a collection that fails to load */
    }
  }
  sets.sort((a, b) => a.label.localeCompare(b.label));
  return new Response(JSON.stringify({ sets }), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
