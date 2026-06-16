/* ============================================================
   WORKSHOP SCHEDULE — single source of truth for the calendar.
   Each entry maps a real workshop detail page (/workshops-kurse/<slug>)
   to its date, so the calendar in kalender-uebersicht.astro stays in
   sync with the actual workshops. Add a workshop here and it appears
   on the calendar on the right day, linking to its page.
   ============================================================ */
export type WorkshopColor = 'gold' | 'raspberry' | 'lavender' | 'fire';

export interface WorkshopEvent {
  /** Matches the slug in src/pages/workshops-kurse/[slug].astro */
  slug: string;
  /** Short label shown on the calendar chip */
  title: string;
  /** ISO date, YYYY-MM-DD */
  date: string;
  color: WorkshopColor;
}

export const workshopEvents: WorkshopEvent[] = [
  { slug: 'soultap-gegen-angst',      title: 'SoulTap gegen deine Angst',  date: '2026-09-14', color: 'gold' },
  { slug: 'vagusnerv-ruhe',           title: 'Im Vagusnerv liegt die Ruhe', date: '2026-10-22', color: 'lavender' },
  { slug: 'cool-down-for-christmas',  title: 'Cool down for Christmas',     date: '2026-11-24', color: 'raspberry' },
  { slug: 'adventsgeschichten',       title: 'Advents-Geschichten',         date: '2026-12-01', color: 'fire' },
];
