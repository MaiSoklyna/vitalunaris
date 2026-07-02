#!/usr/bin/env node
/*
 * emdash-migrate.cjs — idempotent schema + data migration runner for the
 * VitaLunaris EmDash content DB (addresses ARCHITECTURE-REVIEW P7).
 *
 * `emdash seed` skips existing collections, so field additions must be applied
 * directly to `_emdash_fields` (+ ALTER TABLE on the ec_<coll> table). This
 * runner does that safely and repeatably:
 *   - ensureField:  insert a field row into _emdash_fields if missing
 *   - ensureColumn: ALTER TABLE ... ADD COLUMN if missing
 *   - migrateData:  fill the new column from existing data ONLY when empty
 *                   (so re-runs never clobber edits the client has made)
 *
 * Run with Herd's Node 24 (better-sqlite3 ABI):
 *   NODE_PATH=D:/Tanner/vitalunaris/node_modules \
 *     C:/Users/User/.config/herd/bin/nvm/v24.1.0/node.exe scripts/emdash-migrate.cjs
 *
 * Usage: pass a tag for the backup file as argv[2] (default: "migrate").
 * Edit the PROMOTIONS array below to define what to migrate, then run.
 * Restart the dev server afterwards so the schema loader picks up new fields.
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = 'D:/Tanner/vitalunaris/data.db';
const tag = process.argv[2] || 'migrate';

// ---- Crockford base32 ULID (matches EmDash id format) -------------------
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function ulid() {
  let t = Date.now();
  let time = '';
  for (let i = 0; i < 10; i++) { time = B32[t % 32] + time; t = Math.floor(t / 32); }
  let rand = '';
  for (let i = 0; i < 16; i++) rand += B32[Math.floor(Math.random() * 32)];
  return time + rand;
}

// ---- backup (incl. WAL/SHM sidecars) ------------------------------------
function backup() {
  const dst = `${DB_PATH}.bak-${tag}`;
  fs.copyFileSync(DB_PATH, dst);
  for (const ext of ['-wal', '-shm']) {
    if (fs.existsSync(DB_PATH + ext)) fs.copyFileSync(DB_PATH + ext, dst + ext);
  }
  console.log(`[backup] ${path.basename(dst)}`);
}

const db = new Database(DB_PATH);
db.pragma('busy_timeout = 8000');

function collId(slug) {
  const r = db.prepare('SELECT id FROM _emdash_collections WHERE slug=?').get(slug);
  if (!r) throw new Error(`collection not found: ${slug}`);
  return r.id;
}
function fieldExists(cid, slug) {
  return !!db.prepare('SELECT 1 FROM _emdash_fields WHERE collection_id=? AND slug=?').get(cid, slug);
}
function columnExists(table, col) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === col);
}

function ensureField(collSlug, def) {
  const cid = collId(collSlug);
  if (fieldExists(cid, def.slug)) { console.log(`  field ${collSlug}.${def.slug} exists — skip`); return; }
  const validation = JSON.stringify({
    minItems: def.minItems ?? 0,
    maxItems: def.maxItems ?? 20,
    subFields: def.subFields,
  });
  db.prepare(`INSERT INTO _emdash_fields
    (id, collection_id, slug, label, type, column_type, required, "unique",
     default_value, validation, widget, options, sort_order, created_at, searchable, translatable)
    VALUES (@id,@cid,@slug,@label,'repeater','JSON',0,0,NULL,@validation,NULL,NULL,@sort,datetime('now'),0,1)`)
    .run({ id: ulid(), cid, slug: def.slug, label: def.label, validation, sort: def.sortOrder });
  console.log(`  + field ${collSlug}.${def.slug} ("${def.label}")  ${def.subFields.map(s=>s.slug+':'+s.type).join(', ')}`);
}

function ensureColumn(collSlug, col) {
  const table = `ec_${collSlug}`;
  if (columnExists(table, col)) { console.log(`  column ${table}.${col} exists — skip`); return; }
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} JSON`);
  console.log(`  + column ${table}.${col}`);
}

// migrate per-entry data from a section-bag items[] JSON into the new repeater
// column, ONLY when the target column is currently empty for that entry.
function migrateFromSectionItems(collSlug, field, sectionType, entrySlugs, mapFn, clearSource) {
  const table = `ec_${collSlug}`;
  for (const slug of entrySlugs) {
    const row = db.prepare(`SELECT id, sections, ${field} AS target FROM ${table} WHERE slug=?`).get(slug);
    if (!row) { console.log(`    ! ${collSlug}/${slug} not found`); continue; }
    if (row.target && row.target !== '[]' && row.target !== 'null') {
      console.log(`    = ${collSlug}/${slug}.${field} already populated — skip`); continue;
    }
    let secs; try { secs = JSON.parse(row.sections || '[]'); } catch { secs = []; }
    const sec = secs.find(s => s.type === sectionType);
    let items = [];
    if (sec && sec.items) { try { items = JSON.parse(sec.items); } catch {} }
    const mapped = (Array.isArray(items) ? items : []).map(mapFn);
    db.prepare(`UPDATE ${table} SET ${field}=? WHERE id=?`).run(JSON.stringify(mapped), row.id);
    console.log(`    -> ${collSlug}/${slug}.${field} = ${mapped.length} rows`);
    if (clearSource && sec) {
      sec.items = '[]';
      db.prepare(`UPDATE ${table} SET sections=? WHERE id=?`).run(JSON.stringify(secs), row.id);
      console.log(`       cleared source sections[${sectionType}].items`);
    }
  }
}

// ========================================================================
// PROMOTIONS — edit this to define migrations, then run.
// ========================================================================
const PARA = [{ slug: 'text', type: 'text', label: 'Absatz' }];
const mapPara = (s) => ({ text: typeof s === 'string' ? s : (s?.text || s?.body || '') });
const id = (x) => x;

const PROMOTIONS = [
  // ---- ausbildung_programs --------------------------------------------------
  { collection: 'ausbildung_programs', sectionType: 'stages', entries: ['uebersicht'], clearSource: true,
    field: { slug: 'stage_cards', label: 'Stufen-Karten', sortOrder: 30, maxItems: 6, subFields: [
      { slug: 'image', type: 'image', label: 'Bild' }, { slug: 'eyebrow', type: 'string', label: 'Eyebrow' },
      { slug: 'title', type: 'string', label: 'Titel' }, { slug: 'body', type: 'text', label: 'Text' },
      { slug: 'cta_text', type: 'string', label: 'Button-Text' }, { slug: 'cta_href', type: 'string', label: 'Link (z. B. /kontakt)' } ] },
    map: (c) => ({ image: c.image || '', eyebrow: c.eyebrow || '', title: c.title || '', body: c.body || '', cta_text: c.ctaText || 'Mehr erfahren', cta_href: c.ctaHref || '' }) },

  { collection: 'ausbildung_programs', sectionType: 'lehrerin', entries: ['uebersicht'], clearSource: true,
    field: { slug: 'lehrerin_paragraphs', label: 'Lehrerin · Absätze', sortOrder: 31, maxItems: 8, subFields: PARA }, map: mapPara },
  { collection: 'ausbildung_programs', sectionType: 'agenda', entries: ['infoanlaesse'], clearSource: true,
    field: { slug: 'agenda_items', label: 'Agenda · Punkte', sortOrder: 32, maxItems: 12, subFields: PARA }, map: mapPara },
  { collection: 'ausbildung_programs', sectionType: 'about', entries: ['infoanlaesse'], clearSource: true,
    field: { slug: 'about_paragraphs', label: 'Über uns · Absätze', sortOrder: 33, maxItems: 8, subFields: PARA }, map: mapPara },
  // reuse existing fields (data-only; ensureField/Column skip)
  { collection: 'ausbildung_programs', sectionType: 'outcomes', entries: ['uebersicht'], clearSource: true,
    field: { slug: 'outcomes', label: 'Lernziele', sortOrder: 12, subFields: [] }, map: id },
  { collection: 'ausbildung_programs', sectionType: 'faq', entries: ['uebersicht', 'infoanlaesse'], clearSource: true,
    field: { slug: 'faq_items', label: 'Häufige Fragen', sortOrder: 25, subFields: [] }, map: id },
  { collection: 'ausbildung_programs', sectionType: 'info_cards', entries: ['infoanlaesse'], clearSource: true,
    field: { slug: 'info_cards', label: 'Info-Karten', sortOrder: 21, subFields: [] }, map: id },

  // ---- workshops ------------------------------------------------------------
  { collection: 'workshops', sectionType: 'about', entries: ['aktueller-monatsworkshop'], clearSource: true,
    field: { slug: 'about_paragraphs', label: 'Über uns · Absätze', sortOrder: 23, maxItems: 8, subFields: PARA }, map: mapPara },
  { collection: 'workshops', sectionType: 'deep', entries: ['kalender-uebersicht'], clearSource: true,
    field: { slug: 'deep_paragraphs', label: 'Vertiefung · Absätze', sortOrder: 24, maxItems: 8, subFields: PARA }, map: mapPara },
  { collection: 'workshops', sectionType: 'hero', entries: ['kalender-uebersicht'], clearSource: true,
    field: { slug: 'category_pills', label: 'Kategorie-Filter', sortOrder: 25, maxItems: 10, subFields: [
      { slug: 'label', type: 'string', label: 'Filter-Label' }, { slug: 'title', type: 'string', label: 'Titel' },
      { slug: 'description', type: 'text', label: 'Beschreibung' }, { slug: 'active', type: 'boolean', label: 'Standard aktiv' } ] },
    map: (c) => ({ label: c.label || '', title: c.title || '', description: c.description || '', active: !!c.active }) },
  { collection: 'workshops', sectionType: 'info_cards', entries: ['aktueller-monatsworkshop'], clearSource: true,
    field: { slug: 'info_cards', label: 'Info-Karten', sortOrder: 8, subFields: [] }, map: id },
  { collection: 'workshops', sectionType: 'faq', entries: ['aktueller-monatsworkshop', 'kalender-uebersicht'], clearSource: true,
    field: { slug: 'faq_items', label: 'Häufige Fragen', sortOrder: 15, subFields: [] }, map: id },

  // ---- praxisangebote -------------------------------------------------------
  { collection: 'praxisangebote', sectionType: 'gallery', entries: ['jawort-by-jansen'], clearSource: true,
    field: { slug: 'gallery', label: 'Galerie', sortOrder: 27, maxItems: 40, subFields: [
      { slug: 'image', type: 'image', label: 'Bild' }, { slug: 'alt', type: 'string', label: 'Alt-Text (Bildbeschreibung)' } ] },
    map: (c) => ({ image: c.src || c.image || '', alt: c.alt || '' }) },
  { collection: 'praxisangebote', sectionType: 'hero', entries: ['jawort-by-jansen'], clearSource: true,
    field: { slug: 'price_list', label: 'Preisliste', sortOrder: 28, maxItems: 8, subFields: [
      { slug: 'label', type: 'string', label: 'Leistung' }, { slug: 'value', type: 'string', label: 'Preis' } ] },
    map: (c) => ({ label: c.label || '', value: c.value || '' }) },
  { collection: 'praxisangebote', sectionType: 'bio', entries: ['jawort-by-jansen'], clearSource: true,
    field: { slug: 'bio_paragraphs', label: 'Bio · Absätze', sortOrder: 29, maxItems: 8, subFields: PARA }, map: mapPara },
  { collection: 'praxisangebote', sectionType: 'faq', entries: ['jawort-by-jansen'], clearSource: true,
    field: { slug: 'faq_items', label: 'Häufige Fragen', sortOrder: 25, subFields: [] }, map: id },

  // ---- pages (ueber-uns) ----------------------------------------------------
  { collection: 'pages', sectionType: 'hero', entries: ['ueber-uns'], clearSource: true,
    field: { slug: 'hero_paragraphs', label: 'Hero · Absätze', sortOrder: 14, maxItems: 8, subFields: PARA }, map: mapPara },
  { collection: 'pages', sectionType: 'values', entries: ['ueber-uns'], clearSource: true,
    field: { slug: 'value_cards', label: 'Werte-Karten', sortOrder: 15, maxItems: 8, subFields: [
      { slug: 'icon', type: 'string', label: 'Icon-Pfad' }, { slug: 'title', type: 'string', label: 'Titel' },
      { slug: 'body', type: 'text', label: 'Text' } ] },
    map: (c) => ({ icon: c.icon || '', title: c.title || '', body: c.body || '' }) },
];

// ---- run ----------------------------------------------------------------
backup();
const tx = db.transaction(() => {
  for (const p of PROMOTIONS) {
    console.log(`\n# ${p.collection}.${p.field.slug}`);
    ensureField(p.collection, p.field);
    ensureColumn(p.collection, p.field.slug);
    migrateFromSectionItems(p.collection, p.field.slug, p.sectionType, p.entries, p.map, p.clearSource);
  }
});
tx();
console.log('\n[done] restart the dev server to load the new schema.');
db.close();
