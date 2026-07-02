#!/usr/bin/env node
/* Regenerate seed/seed.json from the LIVE schema (_emdash_collections + _emdash_fields)
 * so a fresh environment (prod / Cloudflare D1) provisions exactly what dev has.
 * Run under Herd Node 24. Validate afterwards with: npm run em:seed (Node 24). */
const fs = require('fs');
const D = require('better-sqlite3');
const DB = 'D:/Tanner/vitalunaris/data.db';
const SEED = 'D:/Tanner/vitalunaris/seed/seed.json';
const db = new D(DB, { readonly: true });

const existing = JSON.parse(fs.readFileSync(SEED, 'utf8'));
const ORDER = ['site_settings', 'team', 'testimonials', 'praxisangebote', 'ausbildung_programs', 'workshops', 'pages', 'legal'];
const colls = db.prepare('SELECT * FROM _emdash_collections').all();
const bySlug = Object.fromEntries(colls.map((c) => [c.slug, c]));
const ordered = [...ORDER.filter((s) => bySlug[s]), ...colls.map((c) => c.slug).filter((s) => !ORDER.includes(s))];

function fieldDef(f) {
  const fd = { slug: f.slug, label: f.label, type: f.type };
  if (f.required) fd.required = true;
  if (f.unique) fd.unique = true;
  if (f.validation) { try { const v = JSON.parse(f.validation); if (v && Object.keys(v).length) fd.validation = v; } catch {} }
  if (f.options) { try { const o = JSON.parse(f.options); if (o && Object.keys(o).length) fd.options = o; } catch {} }
  if (f.widget) fd.widget = f.widget;
  return fd;
}

const out = { $schema: existing.$schema, version: existing.version, meta: existing.meta, collections: [] };
for (const slug of ordered) {
  const c = bySlug[slug];
  const col = { slug: c.slug, label: c.label };
  if (c.label_singular) col.labelSingular = c.label_singular;
  if (c.description) col.description = c.description;
  const supports = c.supports ? JSON.parse(c.supports) : [];
  if (supports.length) col.supports = supports;
  if (c.has_seo) col.hasSeo = true;
  const fields = db.prepare('SELECT * FROM _emdash_fields WHERE collection_id=? ORDER BY sort_order').all(c.id);
  col.fields = fields.map(fieldDef);
  out.collections.push(col);
}

fs.copyFileSync(SEED, SEED + '.bak-prelive');
fs.writeFileSync(SEED, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote seed.json: ${out.collections.length} collections`);
for (const c of out.collections) console.log(`  ${c.slug}: ${c.fields.length} fields${c.hasSeo ? ' (+seo)' : ''}`);
db.close();
