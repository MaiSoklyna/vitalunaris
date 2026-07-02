#!/usr/bin/env node
/*
 * migrate-workshops-fieldorder.cjs — make editing a workshop CARD less confusing.
 *
 * Reorders the workshops collection fields section-by-section, with the
 * "Kalenderkarte" (listing card) group pulled right to the top (just after
 * Titel/Datum/Farbe) so it's the first thing you edit. Also relabels the price
 * to make clear it drives BOTH the hero and the card. Admin-only (sort_order +
 * one label) — no content touched.
 *
 * Idempotent. Run with Herd Node 24:
 *   NODE_PATH=D:/Tanner/vitalunaris/node_modules \
 *     C:/Users/User/.config/herd/bin/nvm/v24.1.0/node.exe scripts/migrate-workshops-fieldorder.cjs
 * Restart the dev server afterwards so the admin picks up the new order.
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = 'D:/Tanner/vitalunaris/data.db';
const tag = 'wsfieldorder';

function backup() {
  const dst = `${DB_PATH}.bak-${tag}`;
  fs.copyFileSync(DB_PATH, dst);
  for (const ext of ['-wal', '-shm']) if (fs.existsSync(DB_PATH + ext)) fs.copyFileSync(DB_PATH + ext, dst + ext);
  console.log(`[backup] ${path.basename(dst)}`);
}

// Section-by-section, with the CARD group first after the basics.
const ORDER = [
  // Grunddaten
  'title', 'date', 'color',
  // Kalenderkarte (die Karte in Übersichten) — zuerst, gut sichtbar
  'card_image', 'card_eyebrow', 'card_title', 'card_description', 'card_duration',
  // Hero (Detailseite)
  'hero_description', 'hero_price', 'hero_image', 'category_meta', 'duration_meta', 'info_cards',
  // Abschnitt
  'narrative_title', 'narrative_body', 'narrative_image', 'narrative_bullet_groups',
  // Vertiefung
  'deep_paragraphs',
  // Über uns
  'about_image', 'about_paragraphs',
  // Stimmen
  'testimonials', 'testimonials_tone',
  // FAQ + Filter + Blöcke
  'faq_items', 'category_pills', 'sections',
];

const db = new Database(DB_PATH);
db.pragma('busy_timeout = 8000');
const cid = db.prepare('SELECT id FROM _emdash_collections WHERE slug=?').get('workshops').id;

backup();
db.transaction(() => {
  const upd = db.prepare('UPDATE _emdash_fields SET sort_order=? WHERE collection_id=? AND slug=?');
  ORDER.forEach((slug, i) => {
    if (upd.run(i, cid, slug).changes === 0) console.log(`  ! ${slug} not found`);
  });
  console.log(`  reordered ${ORDER.length} fields`);
  // Clarify the price drives both hero and card.
  db.prepare("UPDATE _emdash_fields SET label='Preis (Hero & Kalenderkarte)' WHERE collection_id=? AND slug='hero_price'").run(cid);
  console.log("  relabeled hero_price -> 'Preis (Hero & Kalenderkarte)'");
})();
console.log('[done] restart the dev server to load the new order.');
db.close();
