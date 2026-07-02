#!/usr/bin/env node
/*
 * migrate-testimonials-tone.cjs — selectable Testimonials background + tidy
 * field order on ausbildung_programs.
 *
 * 1. Adds a `testimonials_tone` SELECT field to ausbildung_programs
 *    (gold | spring-wood | purple | cherrywood) + column; seeds L1/L2 to
 *    'spring-wood' (their current look). TestimonialsBlock reads it via the page.
 * 2. Reorders ALL ausbildung_programs fields so each section's fields sit
 *    together top-to-bottom (moves the stranded trailing repeaters next to
 *    their section) — admin-only `sort_order`, no data touched.
 * 3. Adds 'cherrywood' to the shared `sections.tone` select on pages +
 *    praxisangebote so block-page Testimonials blocks can pick it too.
 *
 * Idempotent. Run with Herd Node 24:
 *   NODE_PATH=D:/Tanner/vitalunaris/node_modules \
 *     C:/Users/User/.config/herd/bin/nvm/v24.1.0/node.exe scripts/migrate-testimonials-tone.cjs
 * Restart the dev server afterwards so the schema loader picks up the changes.
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = 'D:/Tanner/vitalunaris/data.db';
const tag = 'testimtone';

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

// --- 1. testimonials_tone field on ausbildung_programs -----------------------
function addToneField() {
  const cid = collId('ausbildung_programs');
  if (!fieldExists(cid, 'testimonials_tone')) {
    const validation = JSON.stringify({ options: ['gold', 'spring-wood', 'purple', 'cherrywood'] });
    // NOTE: emdash JSON.parses default_value (registry.mapFieldRow) — it must be
    // JSON-encoded, so a plain string default is stored as '"spring-wood"'.
    const defaultValue = JSON.stringify('spring-wood');
    db.prepare(`INSERT INTO _emdash_fields
      (id, collection_id, slug, label, type, column_type, required, "unique",
       default_value, validation, widget, options, sort_order, created_at, searchable, translatable)
      VALUES (@id,@cid,'testimonials_tone','Stimmen · Hintergrund (Farbverlauf)','select','TEXT',0,0,
       @defaultValue,@validation,NULL,NULL,27,datetime('now'),0,0)`)
      .run({ id: ulid(), cid, validation, defaultValue });
    console.log('  + field ausbildung_programs.testimonials_tone (gold|spring-wood|purple|cherrywood)');
  } else console.log('  field testimonials_tone exists — skip');
  if (!columnExists('ec_ausbildung_programs', 'testimonials_tone')) {
    db.exec('ALTER TABLE ec_ausbildung_programs ADD COLUMN testimonials_tone TEXT');
    console.log('  + column ec_ausbildung_programs.testimonials_tone');
  }
  // Seed L1/L2 to their current look (spring-wood) only if empty.
  for (const slug of ['soulcoach-level-1', 'soulcoach-level-2']) {
    const r = db.prepare('SELECT id, testimonials_tone AS t FROM ec_ausbildung_programs WHERE slug=?').get(slug);
    if (r && (r.t == null || r.t === '')) {
      db.prepare('UPDATE ec_ausbildung_programs SET testimonials_tone=? WHERE id=?').run('spring-wood', r.id);
      console.log(`    -> ${slug}.testimonials_tone = spring-wood`);
    }
  }
}

// --- 2. reorder ausbildung_programs fields (section-by-section) ---------------
const ORDER = [
  'seo_title', 'seo_description',
  'hero_eyebrow', 'hero_title', 'hero_subtitle', 'hero_primary_cta_text', 'hero_primary_cta_href', 'hero_image',
  'narrative_title', 'narrative_body', 'narrative_image',
  'outcomes_title', 'outcomes', 'stage_cards',
  'narrative2_title', 'narrative2_body', 'narrative2_image',
  'lehrerin_eyebrow', 'lehrerin_title', 'lehrerin_body', 'lehrerin_image', 'lehrerin_paragraphs',
  'about_image', 'about_paragraphs',
  'info_cards', 'schedule_caption',
  'testimonials', 'testimonials_tone',
  'teacher', 'faq_items',
  'infoanlass_eyebrow', 'infoanlass_title', 'infoanlass_body', 'agenda_items',
  'sections',
];
function reorderFields() {
  const cid = collId('ausbildung_programs');
  const upd = db.prepare('UPDATE _emdash_fields SET sort_order=? WHERE collection_id=? AND slug=?');
  ORDER.forEach((slug, i) => {
    const r = upd.run(i, cid, slug);
    if (r.changes === 0) console.log(`    ! ${slug} not found (skipped)`);
  });
  console.log(`  reordered ${ORDER.length} fields on ausbildung_programs`);
}

// --- 3. add 'cherrywood' to shared sections.tone options ---------------------
function extendToneOptions() {
  for (const coll of ['pages', 'praxisangebote']) {
    const cid = collId(coll);
    const f = db.prepare('SELECT id, validation FROM _emdash_fields WHERE collection_id=? AND slug=?').get(cid, 'sections');
    const v = JSON.parse(f.validation);
    const tone = (v.subFields || []).find((s) => s.slug === 'tone');
    if (tone && !tone.options.includes('cherrywood')) {
      tone.options.push('cherrywood');
      db.prepare('UPDATE _emdash_fields SET validation=? WHERE id=?').run(JSON.stringify(v), f.id);
      console.log(`  + ${coll}.sections.tone option 'cherrywood'`);
    } else console.log(`  ${coll}.sections.tone already has 'cherrywood' — skip`);
  }
}

backup();
db.transaction(() => { addToneField(); reorderFields(); extendToneOptions(); })();
console.log('[done] restart the dev server to load the new schema.');
db.close();
