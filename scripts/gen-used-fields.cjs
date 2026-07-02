#!/usr/bin/env node
/**
 * Generate src/lib/used-fields.json — a map of which TOP-LEVEL entry fields each
 * page actually reads. The admin middleware (src/middleware.ts) uses it to show only
 * the fields a given entry's page renders, hiding the rest of the shared-schema
 * clutter. Safe: hiding is display-only + a "Weitere Felder" toggle reveals all, and
 * the middleware also always shows any field that currently holds data.
 *
 * Re-run whenever a page starts/stops reading a field:
 *   node scripts/gen-used-fields.cjs      (needs Node >= 24 for better-sqlite3)
 *
 * How it works: for each .astro under src/pages it finds the entry it renders
 * (getEmDashEntry('coll','slug')), the variable bound to entry.data (usually `d`,
 * sometimes `w`), and every `<var>.<field>` access — then maps field slugs to their
 * admin labels via the live schema. [slug] template pages feed a per-collection
 * "dynamic" fallback used for entries without an explicit page.
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const ROOT = path.join(__dirname, '..');
const PAGES = path.join(ROOT, 'src', 'pages');
const OUT = path.join(ROOT, 'src', 'lib', 'used-fields.json');
const db = new Database(path.join(ROOT, 'data.db'), { readonly: true });

const COLLS = ['pages', 'praxisangebote', 'ausbildung_programs', 'workshops'];
const labelOf = {};
for (const coll of COLLS) {
  const c = db.prepare('SELECT id FROM _emdash_collections WHERE slug=?').get(coll);
  labelOf[coll] = {};
  db.prepare('SELECT slug,label FROM _emdash_fields WHERE collection_id=?').all(c.id)
    .forEach((f) => (labelOf[coll][f.slug] = f.label || f.slug));
}

function walk(dir) {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(walk(p));
    else if (e.name.endsWith('.astro')) out.push(p);
  }
  return out;
}

const explicit = {};
const dynamic = {};
const shared = {}; // coll -> fields read from ANY entry of the collection (e.g. calendar cards)

for (const file of walk(PAGES)) {
  const src = fs.readFileSync(file, 'utf8');
  const entryM = [...src.matchAll(/getEmDashEntry\(\s*['"]([^'"]+)['"]\s*,\s*['"]([^'"]+)['"]/g)];
  const collM = [...src.matchAll(/getEmDash(?:Collection|Entries)\(\s*['"]([^'"]+)['"]/g)];
  const vars = new Set();
  for (const m of src.matchAll(/const\s+(\w+)\s*(?::[^=]*)?=\s*entry\??\.data/g)) vars.add(m[1]);
  if (vars.size === 0) vars.add('d');
  const fields = new Set();
  for (const v of vars) {
    const re = new RegExp('\\b' + v + '\\??\\.([a-z_][a-z0-9_]*)', 'gi');
    for (const m of src.matchAll(re)) fields.add(m[1]);
  }
  // Fields read off collection items (e.g. `e.data.card_image` in the calendar loop)
  // are used by the collection as a whole — surface them on every entry of it.
  const dataFields = new Set();
  for (const m of src.matchAll(/\.data\??\.([a-z_][a-z0-9_]*)/g)) dataFields.add(m[1]);
  const isDynamic = /\[slug\]/.test(file) || /getStaticPaths/.test(src);
  for (const m of entryM) {
    const [, coll, slug] = m;
    if (!COLLS.includes(coll)) continue;
    const key = `${coll}/${slug}`;
    explicit[key] = explicit[key] || new Set();
    fields.forEach((f) => explicit[key].add(f));
  }
  for (const m of collM) {
    const coll = m[1];
    if (!COLLS.includes(coll)) continue;
    shared[coll] = shared[coll] || new Set();
    dataFields.forEach((f) => shared[coll].add(f));
    if (isDynamic) {
      dynamic[coll] = dynamic[coll] || new Set();
      fields.forEach((f) => dynamic[coll].add(f));
    }
  }
}
// merge collection-shared fields into every entry + dynamic bucket of that collection
for (const key of Object.keys(explicit)) {
  const coll = key.split('/')[0];
  if (shared[coll]) shared[coll].forEach((f) => explicit[key].add(f));
}
for (const coll of Object.keys(dynamic)) {
  if (shared[coll]) shared[coll].forEach((f) => dynamic[coll].add(f));
}

function toLabels(coll, slugs) {
  const forced = ['sections', 'seo_title', 'seo_description'];
  const labels = [];
  for (const s of new Set([...slugs, ...forced])) {
    if (labelOf[coll] && labelOf[coll][s]) labels.push(labelOf[coll][s]);
  }
  return labels.sort();
}

const out = { explicit: {}, dynamic: {} };
for (const key of Object.keys(explicit)) out.explicit[key] = toLabels(key.split('/')[0], explicit[key]);
for (const coll of Object.keys(dynamic)) out.dynamic[coll] = toLabels(coll, dynamic[coll]);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n');
console.log(`Wrote ${OUT}: ${Object.keys(out.explicit).length} entries, ${Object.keys(out.dynamic).length} dynamic collections.`);
db.close();
