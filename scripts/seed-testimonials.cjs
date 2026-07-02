#!/usr/bin/env node
/* Seed the `testimonials` collection from existing per-page review data.
 * Idempotent: skips entries whose slug already exists. Run under Node 24. */
const fs = require('fs');
const Database = require('better-sqlite3');
const DB = 'D:/Tanner/vitalunaris/data.db';
fs.copyFileSync(DB, DB + '.bak-seedtestimonials');
const db = new Database(DB);
db.pragma('busy_timeout = 8000');

const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function ulid() { let t = Date.now(), s = ''; for (let i=0;i<10;i++){s=B32[t%32]+s;t=Math.floor(t/32);} for (let i=0;i<16;i++) s+=B32[Math.floor(Math.random()*32)]; return s; }

const cols = new Set(db.prepare('PRAGMA table_info(ec_testimonials)').all().map(c => c.name));
const tmpl = db.prepare("SELECT locale, status, version FROM ec_team LIMIT 1").get() || { locale: 'en', status: 'published', version: 1 };

function getTyped(coll, slug) {
  const r = db.prepare(`SELECT testimonials FROM ec_${coll} WHERE slug=?`).get(slug);
  try { return JSON.parse(r?.testimonials || '[]'); } catch { return []; }
}
function getSection(coll, slug) {
  const r = db.prepare(`SELECT sections FROM ec_${coll} WHERE slug=?`).get(slug);
  let secs = []; try { secs = JSON.parse(r?.sections || '[]'); } catch {}
  const t = secs.find(s => s.type === 'testimonials');
  try { return JSON.parse(t?.items || '[]'); } catch { return []; }
}

const SOURCES = [
  { context: 'praxis-hypnose',        data: getTyped('praxisangebote', 'hypnose') },
  { context: 'praxis-aufstellungen',  data: getTyped('praxisangebote', 'aufstellungen') },
  { context: 'praxis-numerologie',    data: getTyped('praxisangebote', 'numerologieberatung') },
  { context: 'praxis-fussreflex',     data: getTyped('praxisangebote', 'fussreflexzonenbehandlung') },
  { context: 'ausbildung',            data: getTyped('ausbildung_programs', 'soulcoach-level-1') }, // canonical shared set
  { context: 'jawort',                data: getSection('praxisangebote', 'jawort-by-jansen') },
  { context: 'workshop-aktueller',    data: getSection('workshops', 'aktueller-monatsworkshop') },
  { context: 'workshop-kalender',     data: getSection('workshops', 'kalender-uebersicht') },
  { context: 'home',                  data: getSection('pages', 'home') },
];

const exists = db.prepare('SELECT 1 FROM ec_testimonials WHERE slug=?');
let inserted = 0, skipped = 0;
const tx = db.transaction(() => {
  for (const src of SOURCES) {
    src.data.forEach((t, i) => {
      const slug = `${src.context}-${i + 1}`;
      if (exists.get(slug)) { skipped++; return; }
      const row = {
        id: ulid(), slug, status: tmpl.status || 'published', locale: tmpl.locale || 'en', version: tmpl.version || 1,
        created_at: null, updated_at: null, published_at: null,
        quote: t.quote || t.text || '', name: t.name || t.author || '', role: t.role || '',
        photo: null, context: src.context, featured: 0, sort_order: i,
      };
      const keys = Object.keys(row).filter(k => cols.has(k));
      const sql = `INSERT INTO ec_testimonials (${keys.join(',')}) VALUES (${keys.map(k => ['created_at','updated_at','published_at'].includes(k) ? "datetime('now')" : '@'+k).join(',')})`;
      const params = {}; for (const k of keys) if (!['created_at','updated_at','published_at'].includes(k)) params[k] = row[k];
      db.prepare(sql).run(params);
      inserted++;
    });
  }
});
tx();
console.log(`testimonials columns: ${[...cols].join(', ')}`);
console.log(`inserted ${inserted}, skipped ${skipped}`);
console.log('by context:');
for (const r of db.prepare('SELECT context, COUNT(*) n FROM ec_testimonials GROUP BY context').all()) console.log(`  ${r.context}: ${r.n}`);
db.close();
