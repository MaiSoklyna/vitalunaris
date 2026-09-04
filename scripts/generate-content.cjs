#!/usr/bin/env node
/* Export ALL live content (every entry in every collection) to a single content
 * seed file matching EmDash's `content` format, so a fresh env gets correct data
 * after the schema seed. Run under Herd Node 24:
 *   emdash seed seed/seed.json          # schema
 *   emdash seed seed/content-export.json  # data (this file)
 */
const fs = require('fs');
const D = require('better-sqlite3');
const DB = 'D:/Tanner/vitalunaris/data.db';
const OUT = 'D:/Tanner/vitalunaris/seed/content-export.json';
const db = new D(DB, { readonly: true });

const colls = db.prepare('SELECT id, slug FROM _emdash_collections').all();
const ORDER = ['site_settings', 'team', 'testimonials', 'praxisangebote', 'ausbildung_programs', 'workshops', 'pages', 'legal'];
const ordered = [...ORDER.filter((s) => colls.find((c) => c.slug === s)), ...colls.map((c) => c.slug).filter((s) => !ORDER.includes(s))];

const isEmpty = (v) => v == null || v === '' || v === '[]' || v === 'null' || (Array.isArray(v) && v.length === 0);

const content = {};
let totalEntries = 0;
for (const slug of ordered) {
  const c = colls.find((x) => x.slug === slug);
  const fields = db.prepare('SELECT slug, type, column_type FROM _emdash_fields WHERE collection_id=? ORDER BY sort_order').all(c.id);
  const rows = db.prepare(`SELECT * FROM ec_${slug} WHERE deleted_at IS NULL ORDER BY slug`).all();
  const entries = [];
  for (const row of rows) {
    const data = {};
    for (const f of fields) {
      let v = row[f.slug];
      if (v == null) continue;
      if (f.column_type === 'JSON' || f.type === 'repeater') {
        try { v = JSON.parse(v); } catch { continue; }
      } else if (f.type === 'boolean') {
        v = !!v; if (!v) continue;
      } else if (f.type === 'integer' || f.type === 'number') {
        v = Number(v);
      } else if (f.type === 'image' && typeof v === 'string' && v.trim().startsWith('{')) {
        try { v = JSON.parse(v); } catch {}
      }
      if (isEmpty(v)) continue;
      data[f.slug] = v;
    }
    entries.push({ id: row.id, slug: row.slug, status: row.status || 'published', data });
    totalEntries++;
  }
  content[slug] = entries;
}

const out = {
  $schema: 'https://emdashcms.com/schema/seed.json',
  version: '1',
  meta: { name: 'VitaLunaris — full content export', description: 'All live entries, exported from the dev DB. Apply after seed.json.' },
  content,
};

// self-validation: round-trip parse + structural assert
const serialized = JSON.stringify(out, null, 2) + '\n';
const reparsed = JSON.parse(serialized);
for (const [coll, arr] of Object.entries(reparsed.content)) {
  for (const e of arr) { if (!e.id || !e.slug || typeof e.data !== 'object') throw new Error(`bad entry in ${coll}: ${JSON.stringify(e).slice(0, 80)}`); }
}
fs.writeFileSync(OUT, serialized);
console.log(`wrote content-export.json: ${totalEntries} entries`);
for (const slug of ordered) console.log(`  ${slug}: ${content[slug].length}`);
db.close();
