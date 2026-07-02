#!/usr/bin/env node
/*
 * migrate-testimonials-tone-all.cjs — extend the selectable Testimonials
 * background to the remaining bespoke pages.
 *
 * Adds a `testimonials_tone` SELECT (gold|spring-wood|purple|cherrywood, default
 * gold) to praxisangebote, workshops, and pages, + column, and seeds the entries
 * that render a Testimonials block to 'gold' (their current look). Also seeds
 * ausbildung_programs/uebersicht to 'gold' (field already exists on that coll).
 *
 * NOTE: emdash JSON.parses default_value (registry.mapFieldRow) — store it
 * JSON-encoded (JSON.stringify).
 *
 * Idempotent. Run with Herd Node 24:
 *   NODE_PATH=D:/Tanner/vitalunaris/node_modules \
 *     C:/Users/User/.config/herd/bin/nvm/v24.1.0/node.exe scripts/migrate-testimonials-tone-all.cjs
 * Restart the dev server afterwards so the schema loader picks up the fields.
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = 'D:/Tanner/vitalunaris/data.db';
const tag = 'testimtoneall';

const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function ulid() {
  let t = Date.now(), time = '';
  for (let i = 0; i < 10; i++) { time = B32[t % 32] + time; t = Math.floor(t / 32); }
  let rand = '';
  for (let i = 0; i < 16; i++) rand += B32[Math.floor(Math.random() * 32)];
  return time + rand;
}
function backup() {
  const dst = `${DB_PATH}.bak-${tag}`;
  fs.copyFileSync(DB_PATH, dst);
  for (const ext of ['-wal', '-shm']) if (fs.existsSync(DB_PATH + ext)) fs.copyFileSync(DB_PATH + ext, dst + ext);
  console.log(`[backup] ${path.basename(dst)}`);
}

const db = new Database(DB_PATH);
db.pragma('busy_timeout = 8000');
const collId = (slug) => db.prepare('SELECT id FROM _emdash_collections WHERE slug=?').get(slug).id;
const fieldExists = (cid, slug) => !!db.prepare('SELECT 1 FROM _emdash_fields WHERE collection_id=? AND slug=?').get(cid, slug);
const columnExists = (table, col) => db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);
const maxSort = (cid) => db.prepare('SELECT COALESCE(MAX(sort_order),0)+1 AS n FROM _emdash_fields WHERE collection_id=?').get(cid).n;

function addToneField(coll) {
  const cid = collId(coll);
  if (!fieldExists(cid, 'testimonials_tone')) {
    const validation = JSON.stringify({ options: ['gold', 'spring-wood', 'purple', 'cherrywood'] });
    const defaultValue = JSON.stringify('gold');
    db.prepare(`INSERT INTO _emdash_fields
      (id, collection_id, slug, label, type, column_type, required, "unique",
       default_value, validation, widget, options, sort_order, created_at, searchable, translatable)
      VALUES (@id,@cid,'testimonials_tone','Stimmen · Hintergrund (Farbverlauf)','select','TEXT',0,0,
       @defaultValue,@validation,NULL,NULL,@sort,datetime('now'),0,0)`)
      .run({ id: ulid(), cid, validation, defaultValue, sort: maxSort(cid) });
    console.log(`  + field ${coll}.testimonials_tone`);
  } else console.log(`  ${coll}.testimonials_tone field exists — skip`);
  if (!columnExists(`ec_${coll}`, 'testimonials_tone')) {
    db.exec(`ALTER TABLE ec_${coll} ADD COLUMN testimonials_tone TEXT`);
    console.log(`  + column ec_${coll}.testimonials_tone`);
  }
}

// Seed only the entries that render a Testimonials block, and only if empty.
function seed(coll, slugs) {
  for (const slug of slugs) {
    const r = db.prepare(`SELECT id, testimonials_tone AS t FROM ec_${coll} WHERE slug=?`).get(slug);
    if (!r) { console.log(`    ! ${coll}/${slug} not found`); continue; }
    if (r.t == null || r.t === '') {
      db.prepare(`UPDATE ec_${coll} SET testimonials_tone='gold' WHERE id=?`).run(r.id);
      console.log(`    -> ${coll}/${slug} = gold`);
    } else console.log(`    = ${coll}/${slug} already '${r.t}' — skip`);
  }
}

backup();
db.transaction(() => {
  addToneField('praxisangebote');
  addToneField('workshops');
  addToneField('pages');
  seed('praxisangebote', ['aufstellungen', 'hypnose', 'numerologieberatung', 'fussreflexzonenbehandlung', 'jawort-by-jansen']);
  // all workshops entries render a Testimonials block (detail [slug] + the two overviews)
  const wsSlugs = db.prepare('SELECT slug FROM ec_workshops').all().map((r) => r.slug);
  seed('workshops', wsSlugs);
  seed('pages', ['ausbildung-overview']);
  seed('ausbildung_programs', ['uebersicht']); // field already existed
})();
console.log('[done] restart the dev server to load the new schema.');
db.close();
