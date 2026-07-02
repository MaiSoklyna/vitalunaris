#!/usr/bin/env node
/*
 * migrate-fieldorder-pages-praxis.cjs — make the admin field order match the
 * frontend section order for the `praxisangebote` and `pages` collections
 * (part of the "native + strict page order" editor reorg). Admin-only:
 * sort_order changes, no content touched. Combined with the per-page field
 * hiding (middleware), each entry then shows its fields top-to-bottom in the
 * same order they appear on the page.
 *
 * Orders derived from the frontend render order of the bespoke pages:
 *   praxis service pages: Hero → Narrative → ProcessSteps → Quote → Testimonials
 *                         → BrandCTA → FAQ
 *   jawort:               Hero → (Preisliste) → Narrative → Gallery → Testimonials
 *                         → Bio → FAQ
 *   ueber-uns:            Hero → Absätze → Team → Werte → Newsletter
 *   ausbildung-overview:  Hero → Outcomes → Stufen → Testimonials → FAQ → Newsletter
 * A single shared sort_order can't be perfect for every entry in a collection,
 * so it's a sensible reading-order superset; per-page hiding shows each page's
 * own subset in this order.
 *
 * Idempotent (just sets sort_order). Run with Herd Node 24:
 *   NODE_PATH=D:/Tanner/vitalunaris/node_modules \
 *     C:/Users/User/.config/herd/bin/nvm/v24.1.0/node.exe scripts/migrate-fieldorder-pages-praxis.cjs
 * Restart the dev server afterwards so the admin picks up the new order.
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = 'D:/Tanner/vitalunaris/data.db';
const tag = 'fieldorder2';

function backup() {
  const dst = `${DB_PATH}.bak-${tag}`;
  fs.copyFileSync(DB_PATH, dst);
  for (const ext of ['-wal', '-shm']) if (fs.existsSync(DB_PATH + ext)) fs.copyFileSync(DB_PATH + ext, dst + ext);
  console.log(`[backup] ${path.basename(dst)}`);
}

// praxisangebote — service pages + jawort, section by section.
const PRAXIS = [
  'seo_title', 'seo_description',
  'hero_category', 'hero_title', 'hero_description', 'hero_duration', 'hero_price', 'hero_note', 'hero_image', 'hero_cta_text', 'hero_cta_href',
  'price_list',                          // jawort: price list sits with the hero/offer
  'narrative_title', 'narrative_body', 'narrative_image', 'narrative_bullet_groups',
  'gallery',                             // jawort: gallery after the narrative
  'process_steps',                       // services: after the narrative
  'quote_text', 'quote_attribution', 'quote_image',
  'testimonials', 'testimonials_tone',   // tone right next to the testimonials
  'bio_paragraphs',                      // jawort: bio after testimonials
  'practitioner',
  'brand_cta_title', 'brand_cta_body', 'brand_cta_text', 'brand_cta_href',
  'faq_items',
  // Overview (block page) extras — hidden on the bespoke pages:
  'sections', 'practice_offers', 'newsletter_placeholder', 'newsletter_submit_text', 'claim_cta_text', 'claim_cta_href',
];

// pages — shared by block pages (home/kontakt/neuigkeiten) + bespoke (ueber-uns,
// ausbildung-overview). Reading-order superset.
const PAGES = [
  'seo_title', 'seo_description',
  'hero_eyebrow', 'hero_title', 'hero_subtitle', 'hero_image',
  'hero_primary_cta_text', 'hero_primary_cta_href', 'hero_secondary_cta_text', 'hero_secondary_cta_href',
  'hero_paragraphs',                     // ueber-uns: intro paragraphs after hero
  'sections',                            // block builder (home/kontakt/neuigkeiten)
  'team_image_1', 'team_image_2', 'team_image_3',  // ueber-uns: team
  'value_cards',                         // ueber-uns: "Was uns antreibt"
  'outcomes', 'stage_cards',             // ausbildung-overview: Lernziele → Stufen
  'offer_cards',                         // (dead top-level field; kept low)
  'testimonials_tone',                   // ausbildung-overview: testimonials area
  'faq_items',                           // ausbildung-overview: FAQ before newsletter
  'newsletterhero_paragraphs', 'newsletter_placeholder', 'newsletter_submit_text',
  'contact_recipient', 'contact_submit_text', 'contact_email_placeholder',
  'contact_firstname_placeholder', 'contact_lastname_placeholder', 'contact_message_placeholder',
];

const db = new Database(DB_PATH);
db.pragma('busy_timeout = 8000');
const collId = (slug) => db.prepare('SELECT id FROM _emdash_collections WHERE slug=?').get(slug).id;

function reorder(coll, order) {
  const cid = collId(coll);
  const upd = db.prepare('UPDATE _emdash_fields SET sort_order=? WHERE collection_id=? AND slug=?');
  let missing = 0, applied = 0;
  order.forEach((slug, i) => { const r = upd.run(i, cid, slug); if (r.changes) applied++; else { missing++; console.log(`  ! ${coll}.${slug} not found`); } });
  // Any field not in the list keeps its old sort but gets pushed after the list.
  const rest = db.prepare('SELECT slug FROM _emdash_fields WHERE collection_id=? AND sort_order < ? ORDER BY sort_order').all(cid, order.length)
    .filter((r) => !order.includes(r.slug));
  rest.forEach((r, i) => upd.run(order.length + i, cid, r.slug));
  console.log(`  ${coll}: ordered ${applied} fields${missing ? ` (${missing} missing)` : ''}${rest.length ? `, ${rest.length} extra pushed after` : ''}`);
}

backup();
db.transaction(() => { reorder('praxisangebote', PRAXIS); reorder('pages', PAGES); })();
console.log('[done] restart the dev server to load the new order.');
db.close();
