#!/usr/bin/env node
/**
 * Restrict the addable block types on the Blocks-router pages so editors can
 * only add components that actually render from what they can fill in.
 *
 * Why: the `sections` repeater has ONE shared sub-field set (eyebrow/title/
 * body/image/tone/context). Types whose real content is a nested list or a
 * CTA config can't store that in the repeater (EmDash repeaters don't nest),
 * so they render empty when freshly added. We keep only:
 *   - fully inline-editable:  narrative, featured, overview_hero
 *   - context-resolved cards: testimonials, info_cards, offer_cards, value_cards
 * and drop the injection-only/broken ones from the `type` dropdown.
 *
 * Existing sections of a removed type are NOT touched (their stored value and
 * rendering are unchanged) — this only changes what the "+ Add" dropdown offers.
 *
 * Local (dev SQLite): `node scripts/restrict-section-types.cjs`  (needs Node >= 24)
 * Prod (Cloudflare D1): run with `--print-sql` and paste the output into
 *   `npx wrangler d1 execute <db> --remote --command "..."`.
 * A dev restart is required for the admin to pick up the new schema.
 */
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data.db');
const PRINT_SQL = process.argv.includes('--print-sql');

// Allowed `type` options per Blocks-router collection.
const ALLOWED = {
  pages: ['narrative', 'featured', 'overview_hero', 'testimonials', 'info_cards', 'offer_cards', 'value_cards'],
  // Keep gallery/price_list: jawort-by-jansen renders them as bespoke section types.
  praxisangebote: ['narrative', 'featured', 'overview_hero', 'testimonials', 'info_cards', 'offer_cards', 'value_cards', 'gallery', 'price_list'],
};

const Database = require('better-sqlite3');
const db = new Database(DB_PATH);

function currentTypeOptions(collId) {
  const row = db.prepare('SELECT validation FROM _emdash_fields WHERE collection_id=? AND slug=?').get(collId, 'sections');
  if (!row) return null;
  const v = JSON.parse(row.validation || '{}');
  const t = (v.subFields || []).find((s) => s.slug === 'type');
  return { validation: v, typeSub: t, raw: row.validation };
}

if (!PRINT_SQL) {
  const backup = DB_PATH + '.bak-typerestrict';
  fs.copyFileSync(DB_PATH, backup);
  console.log('Backup written:', backup);
}

for (const [coll, allowed] of Object.entries(ALLOWED)) {
  const c = db.prepare('SELECT id FROM _emdash_collections WHERE slug=?').get(coll);
  if (!c) { console.log(`\n${coll}: (collection missing, skipped)`); continue; }
  const cur = currentTypeOptions(c.id);
  if (!cur || !cur.typeSub) { console.log(`\n${coll}: (no sections.type field, skipped)`); continue; }

  const before = cur.typeSub.options || [];
  // Preserve any allowed option that isn't in our list only if it already exists,
  // and keep our order; drop everything not allowed.
  const after = allowed.filter((o) => true);
  const removed = before.filter((o) => !after.includes(o));

  cur.typeSub.options = after;
  const newValidation = JSON.stringify(cur.validation);

  console.log(`\n### ${coll}.sections.type`);
  console.log('  before:', before.join(', '));
  console.log('  after :', after.join(', '));
  console.log('  removed:', removed.join(', ') || '(none)');

  if (PRINT_SQL) {
    const esc = newValidation.replace(/'/g, "''");
    console.log(`  D1 SQL:\n    UPDATE _emdash_fields SET validation='${esc}' WHERE collection_id='${c.id}' AND slug='sections';`);
  } else {
    db.prepare('UPDATE _emdash_fields SET validation=? WHERE collection_id=? AND slug=?').run(newValidation, c.id, 'sections');
  }
}

if (!PRINT_SQL) console.log('\nDone. Restart the dev server for the admin to load the new options.');
db.close();
