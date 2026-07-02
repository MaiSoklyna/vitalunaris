#!/usr/bin/env node
/*
 * migrate-footer-flat.cjs — de-JSON the footer link columns
 * (site_settings.footer_columns). Sibling of migrate-nav-flat.cjs.
 *
 * BEFORE: footer_columns is a repeater of {title, links} where `links` is a TEXT
 *   field holding a JSON array of [{label,href}] — editors hand-edited JSON.
 *
 * AFTER: one FLAT repeater. Each row is either a column header (has a `label`
 *   = column title, no `parent`) or a link (has `label`+`href`+`parent`, where
 *   `parent` = the column title it belongs under). Footer.astro rebuilds the
 *   columns by grouping link rows under the header row whose `label` they name.
 *   The `title`/`links` sub-fields are replaced by `label`/`href`/`parent`.
 *   No JSON editing remains.
 *
 * Idempotent: skips schema if `parent` already exists; skips data if no row
 *   still carries a `links` blob.
 *
 * Run with Herd's Node 24 (better-sqlite3 ABI):
 *   NODE_PATH=D:/Tanner/vitalunaris/node_modules \
 *     C:/Users/User/.config/herd/bin/nvm/v24.1.0/node.exe scripts/migrate-footer-flat.cjs
 * Restart the dev server afterwards so the schema loader picks up the change.
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = 'D:/Tanner/vitalunaris/data.db';
const tag = 'footerflat';

function backup() {
  const dst = `${DB_PATH}.bak-${tag}`;
  fs.copyFileSync(DB_PATH, dst);
  for (const ext of ['-wal', '-shm']) {
    if (fs.existsSync(DB_PATH + ext)) fs.copyFileSync(DB_PATH + ext, dst + ext);
  }
  console.log(`[backup] ${path.basename(dst)}`);
}

const NEW_SUBFIELDS = [
  { slug: 'label', type: 'string', label: 'Beschriftung (Spaltentitel oder Link-Text)' },
  { slug: 'href', type: 'string', label: 'Link (nur bei Link-Zeilen; bei Spaltentiteln leer)' },
  { slug: 'parent', type: 'string', label: 'Gehört zu Spalte (Spaltentitel – leer = diese Zeile IST ein Spaltentitel)' },
];

const db = new Database(DB_PATH);
db.pragma('busy_timeout = 8000');

function collId(slug) {
  return db.prepare('SELECT id FROM _emdash_collections WHERE slug=?').get(slug).id;
}

function updateSchema() {
  const cid = collId('site_settings');
  const f = db.prepare('SELECT id, validation FROM _emdash_fields WHERE collection_id=? AND slug=?')
    .get(cid, 'footer_columns');
  const v = JSON.parse(f.validation);
  const hasParent = (v.subFields || []).some((s) => s.slug === 'parent');
  const hasLinks = (v.subFields || []).some((s) => s.slug === 'links');
  if (hasParent && !hasLinks) { console.log('  schema already flat — skip'); return; }
  v.subFields = NEW_SUBFIELDS;
  v.maxItems = 40; // was 6 (one row per column); now one row per header + per link
  db.prepare('UPDATE _emdash_fields SET validation=? WHERE id=?').run(JSON.stringify(v), f.id);
  console.log(`  schema updated: sub-fields = ${NEW_SUBFIELDS.map((s) => s.slug).join(', ')}, maxItems=40`);
}

function flattenData() {
  const row = db.prepare('SELECT id, footer_columns FROM ec_site_settings WHERE slug=?').get('settings');
  if (!row) { console.log('  ! settings entry not found'); return; }
  const cols = JSON.parse(row.footer_columns || '[]');
  if (!cols.some((c) => c.links != null)) { console.log('  data already flat — skip'); return; }

  const flat = [];
  for (const c of cols) {
    const title = c.title != null ? c.title : c.label; // header row
    flat.push({ label: title }); // column header (no parent, no href)
    let links = [];
    if (typeof c.links === 'string' && c.links.trim()) {
      try { links = JSON.parse(c.links); } catch { links = []; }
    } else if (Array.isArray(c.links)) {
      links = c.links;
    }
    for (const l of (Array.isArray(links) ? links : [])) {
      flat.push({ label: l.label, href: l.href, parent: title });
    }
  }
  db.prepare('UPDATE ec_site_settings SET footer_columns=? WHERE id=?')
    .run(JSON.stringify(flat), row.id);
  const heads = flat.filter((r) => !r.parent).length;
  console.log(`  data flattened: ${flat.length} rows (${heads} column headers, ${flat.length - heads} links)`);
}

backup();
db.transaction(() => { updateSchema(); flattenData(); })();
console.log('[done] restart the dev server to load the new schema.');
db.close();
