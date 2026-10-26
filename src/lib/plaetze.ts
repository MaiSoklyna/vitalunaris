/* Freie Plätze für Angebote mit fester Gruppengrösse.
 *
 * Labs kennt keine Platzzahl. Wir zählen deshalb die bezahlten Bestellungen
 * der zugehörigen Labs-Produkte (Status «paid») und ziehen sie von der
 * Gruppengrösse ab. Der Schlüssel (LABS_ORDERS_KEY) darf im VitaLunaris-
 * Workspace nur lesen; lokal steht er in .env, live als Worker-Secret.
 *
 * Schlägt die Abfrage fehl, liefern wir null: Die Seite zeigt dann keine
 * Platzzahl, die Anmeldung bleibt aber offen (lieber eine Buchung zu viel
 * als eine zu wenig). Ergebnis wird 60 Sekunden zwischengespeichert. */

const API = 'https://opus.alchemy.zuerich';
const WORKSPACE = 'f4005c0a-5105-477d-ba3c-99aaa410f600';
const CACHE_MS = 60_000;

export type Angebot = 'experience' | 'soulwork' | 'soulcoach';

export const ANGEBOTE: Record<Angebot, { max: number; produkte: string[]; extern?: number }> = {
  // Soulwork Experience 2027 (CHF 690)
  experience: { max: 6, produkte: ['88b49953-4e5b-4867-884e-86633f7323d4'] },
  // Systemic Soulwork 2027: Anzahlung CHF 450.–
  soulwork: { max: 6, produkte: ['c6f78cbb-483c-4918-8247-ac57af2e4ab1'] },
  // Systemic Soulcoach Ausbildung 2027: Anzahlung CHF 450.–
  soulcoach: { max: 6, produkte: ['819aacff-c5bd-45e8-b8fc-0ddeb98c36af'] },
};

export interface Plaetze { max: number; belegt: number; frei: number; ausgebucht: boolean }

const cache = new Map<Angebot, { at: number; wert: Plaetze | null }>();

/* Live (Worker mit nodejs_compat) liegt das Secret in process.env, wie bei
   LABS_MAIL_KEY in emdash-plugin.ts; lokal kommt es aus .env. Astro 6 wirft beim
   Zugriff auf locals.runtime.env einen Fehler, darum nur abgesichert als Rückfall. */
function schluessel(locals: unknown): string | undefined {
  // import.meta.env nur in dev: im Build würde Vite den Schlüssel sonst fest einsetzen.
  const ausProzess = (globalThis as any).process?.env?.LABS_ORDERS_KEY
    ?? (import.meta.env.DEV ? import.meta.env.LABS_ORDERS_KEY : undefined);
  if (ausProzess) return ausProzess;
  try {
    return (locals as any)?.runtime?.env?.LABS_ORDERS_KEY;
  } catch {
    return undefined;
  }
}

async function bezahlt(key: string, produkt: string): Promise<number> {
  const res = await fetch(`${API}/api/orders?product_id=${produkt}&status_filter=paid&limit=200`, {
    headers: { 'X-API-Key': key, 'X-Workspace-ID': WORKSPACE },
  });
  if (!res.ok) throw new Error(`Labs ${res.status}`);
  const d: any = await res.json();
  const orders: any[] = Array.isArray(d) ? d : d.orders ?? d.items ?? [];
  return orders.filter((o) => o.status === 'paid').length;
}

export async function freiePlaetze(angebot: Angebot, locals?: unknown): Promise<Plaetze | null> {
  const hit = cache.get(angebot);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.wert;
  const cfg = ANGEBOTE[angebot];
  const key = schluessel(locals);
  let wert: Plaetze | null = null;
  if (key) {
    try {
      const zahlen = await Promise.all(cfg.produkte.map((p) => bezahlt(key, p)));
      const belegt = zahlen.reduce((a, b) => a + b, 0) + (cfg.extern ?? 0);
      const frei = Math.max(0, cfg.max - belegt);
      wert = { max: cfg.max, belegt, frei, ausgebucht: frei === 0 };
    } catch {
      wert = null;
    }
  }
  cache.set(angebot, { at: Date.now(), wert });
  return wert;
}

/** Kurzer Satz für die Seite, z.B. «Noch 4 von 6 Plätzen frei». */
export function plaetzeText(p: Plaetze | null): string {
  if (!p) return '';
  if (p.ausgebucht) return 'Ausgebucht';
  if (p.frei === 1) return `Noch 1 von ${p.max} Plätzen frei`;
  return `Noch ${p.frei} von ${p.max} Plätzen frei`;
}
