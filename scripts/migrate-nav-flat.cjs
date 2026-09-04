#!/usr/bin/env node
/*
 * migrate-nav-flat.cjs — de-JSON the nav dropdown editing (site_settings.nav_items).
 *
 * BEFORE: nav_items is a repeater whose `children` sub-field is a TEXT field
 *   holding a JSON array string of dropdown links — editors had to hand-edit JSON
 *   (EmDash repeaters can't nest, so a dropdown-inside-a-nav-row had no other home).
 *
 * AFTER: one flat repeater. Each row is a single link. A new `parent` sub-field
 *   holds the href of the parent nav item (empty = top-level). Navigation.astro
 *   rebuilds the tree by grouping rows whose `parent` == a top-level `href`.
 *   The `children` JSON sub-field is removed. No JSON editing remains.
 *
 * Idempotent: skips the schema change if `parent` already exists; skips the data
 *   flatten if no row still carries a `children` blob.
 *
 * Run with Herd's Node 24 (better-sqlite3 ABI):
 *   NODE_PATH=D:/Tanner/vitalunaris/node_modules \
 *     C:/Users/User/.config/herd/bin/nvm/v24.1.0/node.exe scripts/migrate-nav-flat.cjs
 * Restart the dev server afterwards so the schema loader picks up the new sub-field.
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = 'D:/Tanner/vitalunaris/data.db';
const tag = 'navflat';

function backup() {
  const dst = `${DB_PATH}.bak-${tag}`;
  fs.copyFileSync(DB_PATH, dst);
  for (const ext of ['-wal', '-shm']) {
    if (fs.existsSync(DB_PATH + ext)) fs.copyFileSync(DB_PATH + ext, dst + ext);
  }
  console.log(`[backup] ${path.basename(dst)}`);
}

const NEW_SUBFIELDS = [
  { slug: 'label', type: 'string', label: 'Beschriftung' },
  { slug: 'href', type: 'string', label: 'Link' },
  { slug: 'parent', type: 'string', label: 'Untermenü von (Link des Hauptpunkts – leer = oberste Ebene)' },
  { slug: 'navigate_on_click', type: 'boolean', label: 'Direkt verlinken (Klick öffnet die Seite statt des Dropdowns)' },
  { slug: 'disabled', type: 'boolean', label: 'Versteckt' },
];

const db = new Database(DB_PATH);
db.pragma('busy_timeout = 8000');

function collId(slug) {
  return db.prepare('SELECT id FROM _emdash_collections WHERE slug=?').get(slug).id;
}

// ---- schema: replace nav_items sub-fields (add `parent`, drop `children`) ----
function updateSchema() {
  const cid = collId('site_settings');
  const f = db.prepare('SELECT id, validation FROM _emdash_fields WHERE collection_id=? AND slug=?')
    .get(cid, 'nav_items');
  const v = JSON.parse(f.validation);
  const hasParent = (v.subFields || []).some((s) => s.slug === 'parent');
  const hasChildren = (v.subFields || []).some((s) => s.slug === 'children');
  if (hasParent && !hasChildren) { console.log('  schema already flat — skip'); return; }
  v.subFields = NEW_SUBFIELDS;
  db.prepare('UPDATE _emdash_fields SET validation=? WHERE id=?').run(JSON.stringify(v), f.id);
  console.log(`  schema updated: sub-fields = ${NEW_SUBFIELDS.map((s) => s.slug).join(', ')}`);
}

// ---- data: flatten children JSON into sibling rows tagged with `parent` -------
function flattenData() {
  const row = db.prepare('SELECT id, nav_items FROM ec_site_settings WHERE slug=?').get('settings');
  if (!row) { console.log('  ! settings entry not found'); return; }
  const items = JSON.parse(row.nav_items || '[]');
  if (!items.some((it) => it.children != null)) { console.log('  data already flat — skip'); return; }

  const flat = [];
  for (const it of items) {
    const { children, ...rest } = it;
    flat.push(rest); // top-level row (parent left unset)
    let kids = [];
    if (typeof children === 'string' && children.trim()) {
      try { kids = JSON.parse(children); } catch { kids = []; }
    } else if (Array.isArray(children)) {
      kids = children;
    }
    for (const k of (Array.isArray(kids) ? kids : [])) {
      const child = { label: k.label, href: k.href, parent: it.href };
      if (k.disabled) child.disabled = true;
      flat.push(child);
    }
  }
  db.prepare('UPDATE ec_site_settings SET nav_items=? WHERE id=?')
    .run(JSON.stringify(flat), row.id);
  const tops = flat.filter((r) => !r.parent).length;
  console.log(`  data flattened: ${flat.length} rows (${tops} top-level, ${flat.length - tops} children)`);
}

backup();
db.transaction(() => { updateSchema(); flattenData(); })();
console.log('[done] restart the dev server to load the new schema.');
db.close();
