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
  /* Soulwork Impulsabende 2027 (Jahresplanung Theresia) */
  { slug: 'grenzen-setzen', title: 'Muss ich mir das bieten lassen?', date: '2027-01-05', color: 'gold', category: 'Monats-Workshops', productId: '28e2a86b-7184-4ab4-a055-0beee429db32', formEmbed: '-hTihzWPFFBvHSmsNOxLRQ', price: 'CHF 66.–' },
  { slug: 'raus-aus-der-anpassung', title: 'Raus aus der Anpassung', date: '2027-02-02', color: 'lavender', category: 'Monats-Workshops', productId: '14b09fdd-1d07-4640-98ce-1f9ee6fd8a6a', formEmbed: 'TNYq8j1nqtv-PG3wsoAFTQ', price: 'CHF 66.–' },
  { slug: 'sichtbar-werden', title: 'Sichtbar werden', date: '2027-03-02', color: 'raspberry', category: 'Monats-Workshops', productId: '49ab3d8a-8747-420a-ab96-bfb145ec3d4c', formEmbed: 'JhV1FI74A57hgDBKkjUP9w', price: 'CHF 66.–' },
  { slug: 'in-die-groesse-kommen', title: 'In die Grösse kommen', date: '2027-04-06', color: 'fire', category: 'Monats-Workshops', productId: '436a0674-a299-4a15-bb9c-e8663ed281f4', formEmbed: 'MJU9GUcc-GAMteCJMnTkwQ', price: 'CHF 66.–' },
  { slug: 'energieraeuber', title: 'Umgang mit Energieräubern', date: '2027-05-04', color: 'gold', category: 'Monats-Workshops', productId: 'e70b3250-69b9-4364-a2e6-d913a0d6da00', formEmbed: 'A16GE9cYiCmjIvXoPde-NA', price: 'CHF 66.–' },
  { slug: 'mutterwunde-vaterpraegung', title: 'Mutterwunde & Vaterprägung', date: '2027-06-01', color: 'lavender', category: 'Monats-Workshops', productId: '5d2cb822-0891-40e6-8a1d-8323fe7d0431', formEmbed: 'H02yvCZ19SZtjEsNUsC8qg', price: 'CHF 66.–' },
  { slug: 'soultap-wut-ohnmacht', title: 'SoulTap bei Wut & Ohnmacht', date: '2027-07-06', color: 'raspberry', category: 'Monats-Workshops', productId: '9d8832cb-f6b0-452d-a073-8cfbfc4440ca', formEmbed: 'JJU6MbFjfLnE9K4ZV2pS1w', price: 'CHF 66.–' },
  { slug: 'online-aufstellung-erleben', title: 'Online-Aufstellung erleben', date: '2027-08-03', color: 'fire', category: 'Monats-Workshops', productId: '00e236a7-42f0-44f1-98d2-df733b16b3a3', formEmbed: 'L6jZUOpTuuH3gpIQROPGHA', price: 'CHF 66.–' },
  { slug: 'mentale-staerke', title: 'Mentale Stärke', date: '2027-09-07', color: 'gold', category: 'Monats-Workshops', productId: '45631af9-2728-4efd-bf15-beb31b7fff36', formEmbed: 'KHEyaSgKAOA8EWEUilBktQ', price: 'CHF 66.–' },
  { slug: 'in-der-ruhe-liegt-die-kraft', title: 'In der Ruhe liegt die Kraft', date: '2027-10-05', color: 'lavender', category: 'Monats-Workshops', productId: 'e581ffec-01e2-4110-8f26-1186d951bd38', formEmbed: 'bLKS2_RUdaAuhPNd93fvYg', price: 'CHF 66.–' },
  { slug: 'cool-down-for-christmas-2027', title: 'Cool down for Christmas', date: '2027-11-02', color: 'raspberry', category: 'Monats-Workshops', productId: '08c5f692-dd5c-488c-b816-1de78a023f2d', formEmbed: 'ztceh0nkMIaPwGR17h00Fg', price: 'CHF 66.–' },
  { slug: 'jahresabschluss', title: 'Jahresabschluss', date: '2027-12-07', color: 'fire', category: 'Monats-Workshops', productId: '67187d80-4e26-4f41-9cfa-c523098a1368', formEmbed: 'w30Vq4nDBaEXQk6BNDlE3g', price: 'CHF 66.–' },
];
