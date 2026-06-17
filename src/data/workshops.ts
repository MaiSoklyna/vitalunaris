/* ============================================================
   WORKSHOP SCHEDULE — single source of truth for the calendar.
   Each entry maps a real workshop detail page (/workshops-kurse/<slug>)
   to its date, so the calendar in kalender-uebersicht.astro stays in
   sync with the actual workshops. Add a workshop here and it appears
   on the calendar on the right day, linking to its page.
   ============================================================ */
export type WorkshopColor = 'gold' | 'raspberry' | 'lavender' | 'fire';

/** Workshop category — mirrors the filter pills on the calendar page. */
export type WorkshopCategory =
  | 'Monats-Workshops'
  | 'Systemisches Aufstellen'
  | 'Hypnose'
  | 'Numerologie'
  | 'Infoanlässe';

export interface WorkshopEvent {
  /** Matches the slug in src/pages/workshops-kurse/[slug].astro */
  slug: string;
  /** Short label shown on the calendar chip */
  title: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  color: WorkshopColor;
  /** Category this workshop belongs to — drives the calendar filter pills. */
  category: WorkshopCategory;
  /** Alchemy Commerce product id (product is attached to the form below). */
  productId?: string;
  /** Alchemy Forms embed code — the hosted registration+checkout form. */
  formEmbed?: string;
  /** Display price shown on the page, e.g. 'CHF 66.–'. Omit for free. */
  price?: string;
  /** true = CHF 0 (pay-what-you-want = free registration, no payment step). */
  free?: boolean;
}

export const workshopEvents: WorkshopEvent[] = [
  { slug: 'soultap-gegen-angst',      title: 'SoulTap gegen deine Angst',  date: '2026-09-14', color: 'gold',      category: 'Monats-Workshops', productId: 'b841251e-7e81-40a2-8f96-9524ec9ffcc4', formEmbed: 'CGcMnT548xKfg3bxToApPQ', price: 'CHF 66.–' },
  { slug: 'vagusnerv-ruhe',           title: 'Im Vagusnerv liegt die Ruhe', date: '2026-10-22', color: 'lavender',  category: 'Monats-Workshops', productId: 'f46aa359-15ee-4f24-a127-31925311acfb', formEmbed: 'U1jxil-yQVTQha0hRkObHA', price: 'CHF 66.–' },
  { slug: 'cool-down-for-christmas',  title: 'Cool down for Christmas',     date: '2026-11-24', color: 'raspberry', category: 'Monats-Workshops', productId: '6c346a3f-c4a2-41e6-9b21-8f5761724dc7', formEmbed: 'pfiDTgsxW6feL04yYDLg3w', price: 'CHF 66.–' },
  { slug: 'adventsgeschichten',       title: 'Advents-Geschichten',         date: '2026-12-01', color: 'fire',      category: 'Monats-Workshops', productId: 'bfd1dc0d-a7e1-495c-a165-d4a1c2b545a9', formEmbed: 'URbwPomF2htyOEDv1eYLig', free: true },
];
