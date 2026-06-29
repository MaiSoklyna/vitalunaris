#!/usr/bin/env node
/* Wave 3 — admin polish:
 *   1. collection descriptions (help text shown atop each collection in the admin)
 *   2. required alt-text on the Jawort gallery images (a11y)
 *   3. remove dead fields (unused schema bloat)
 * Idempotent. Run under Herd Node 24, then restart dev. */
const fs = require('fs');
const D = require('better-sqlite3');
const DB = 'D:/Tanner/vitalunaris/data.db';
fs.copyFileSync(DB, DB + '.bak-wave3');
const db = new D(DB); db.pragma('busy_timeout = 8000');
const cid = (s) => db.prepare('SELECT id FROM _emdash_collections WHERE slug=?').get(s)?.id;

// 1. collection descriptions ------------------------------------------------
const DESCRIPTIONS = {
  site_settings: 'Globale Einstellungen: Navigation, Footer und Kontaktdaten. Änderungen wirken sich auf die ganze Website aus.',
  team: 'Die Personen (Theresia, Axel, Marlen). Foto und Bio werden hier einmal gepflegt und erscheinen automatisch auf allen passenden Seiten (z. B. «Über uns»).',
  testimonials: 'Alle Kundenstimmen an einem Ort. Jede Stimme hat einen «Seite / Kontext»-Tag, der bestimmt, auf welcher Seite sie erscheint.',
  praxisangebote: 'Die Praxisangebote-Seiten (Hypnose, Aufstellung, Numerologie, Fussreflex, Jawort) plus die Übersicht. Jede Karte/Stimme hat eigene Felder — kein JSON nötig.',
  ausbildung_programs: 'Die Ausbildungs-Seiten (Soulcoach Level 1 & 2, Übersicht, Infoabend). Texte, Karten und Bilder sind als beschriftete Felder editierbar.',
  workshops: 'Workshops & Kurse. Lege einen neuen Workshop als Eintrag an (mit Datum) — er erscheint automatisch im Kalender und in den «Nächste Kurse»-Karten.',
  pages: 'Die einzelnen Seiten (Start, Über uns, Kontakt, News, Übersichten). Jede Liste/Karte ist ein beschriftetes Feld.',
  legal: 'Rechtstexte (AGB, Datenschutz, Impressum). Der ganze Text steht im Feld «Inhalt (Markdown)».',
};
console.log('# collection descriptions');
for (const [slug, desc] of Object.entries(DESCRIPTIONS)) {
  const r = db.prepare('UPDATE _emdash_collections SET description=? WHERE slug=?').run(desc, slug);
  console.log(`  ${slug}: ${r.changes ? 'set' : 'not found'}`);
}

// 2. required alt-text on gallery ------------------------------------------
console.log('# required alt-text');
{
  const f = db.prepare("SELECT id,validation FROM _emdash_fields WHERE collection_id=? AND slug='gallery'").get(cid('praxisangebote'));
  if (f) {
    const v = JSON.parse(f.validation);
    const alt = v.subFields.find((s) => s.slug === 'alt');
    if (alt && !alt.required) { alt.required = true; db.prepare('UPDATE _emdash_fields SET validation=? WHERE id=?').run(JSON.stringify(v), f.id); console.log('  gallery.alt -> required'); }
    else console.log('  gallery.alt already required / missing');
  }
}

// 3. remove dead fields -----------------------------------------------------
console.log('# remove dead fields');
const DEAD = {
  workshops: ['further_courses'],
  site_settings: ['newsletter_eyebrow', 'newsletter_title', 'newsletter_body', 'newsletter_placeholder', 'newsletter_submit_text', 'site_description', 'default_og_image', 'contact_phone'],
};
for (const [coll, slugs] of Object.entries(DEAD)) {
  const id = cid(coll), table = `ec_${coll}`;
  const cols = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  for (const slug of slugs) {
    const del = db.prepare('DELETE FROM _emdash_fields WHERE collection_id=? AND slug=?').run(id, slug);
    if (cols.includes(slug)) { try { db.exec(`ALTER TABLE ${table} DROP COLUMN ${slug}`); } catch (e) { console.log(`    (keep column ${table}.${slug}: ${e.message})`); } }
    console.log(`  ${coll}.${slug}: ${del.changes ? 'removed' : 'not present'}`);
  }
}
db.close();
console.log('\n[done] restart dev server.');
