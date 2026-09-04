#!/usr/bin/env node
/*
 * migrate-faq-block.cjs — make FAQ an addable, writable block on any block page.
 *
 * Mirrors the testimonials/info_cards pattern:
 *   1. Adds a shared `faq` collection to seed.json (Frage / Antwort / context /
 *      sort_order). Run `npx emdash seed seed/seed.json` AFTER this to create it.
 *   2. Adds 'faq' to the addable `sections.type` options on the Blocks-rendered
 *      collections (pages + praxisangebote) so a FAQ block can be added on every
 *      block page (home/kontakt/neuigkeiten/praxisangebote-overview). The bespoke
 *      pages already have their own editable faq_items list.
 *
 * Code side (done separately): getFaq(context) in cms.ts + faq resolution in
 * Blocks.astro (case 'faq' already renders <Faq>).
 *
 * Idempotent. Run with Herd Node 24:
 *   NODE_PATH=D:/Tanner/vitalunaris/node_modules \
 *     C:/Users/User/.config/herd/bin/nvm/v24.1.0/node.exe scripts/migrate-faq-block.cjs
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = 'D:/Tanner/vitalunaris/data.db';
const SEED = 'seed/seed.json';
const CONTEXTS = ['praxis-hypnose', 'praxis-aufstellungen', 'praxis-numerologie', 'praxis-fussreflex',
  'ausbildung', 'jawort', 'workshop-aktueller', 'workshop-kalender', 'home', 'kontakt',
  'neuigkeiten', 'praxisangebote-overview'];

// ---- 1. add faq collection to seed.json ---------------------------------
function addToSeed() {
  const seed = JSON.parse(fs.readFileSync(SEED, 'utf8'));
  if (seed.collections.some((c) => c.slug === 'faq')) { console.log('  seed: faq collection already present — skip'); return; }
  seed.collections.push({
    slug: 'faq',
    label: 'FAQ (Häufige Fragen)',
    labelSingular: 'FAQ-Eintrag',
    description: 'Frage-Antwort-Paare für «FAQ»-Blöcke. Jeder Eintrag hat einen «Seite / Kontext»-Tag, '
      + 'der bestimmt, auf welcher Seite er erscheint — füge auf einer Seite einen FAQ-Block hinzu und '
      + 'wähle denselben Kontext.',
    supports: ['drafts', 'revisions'],
    fields: [
      { slug: 'question', label: 'Frage', type: 'string' },
      { slug: 'answer', label: 'Antwort', type: 'text' },
      { slug: 'context', label: 'Seite / Kontext', type: 'select', validation: { options: CONTEXTS } },
      { slug: 'sort_order', label: 'Reihenfolge', type: 'integer' },
    ],
  });
  fs.writeFileSync(SEED, JSON.stringify(seed, null, 2) + '\n');
  console.log('  seed: + faq collection (run `npx emdash seed seed/seed.json` next)');
}

// ---- 2. add 'faq' to the addable section-type dropdowns ------------------
function addFaqType() {
  const db = new Database(DB_PATH);
  db.pragma('busy_timeout = 8000');
  const dst = `${DB_PATH}.bak-faqblock`;
  fs.copyFileSync(DB_PATH, dst);
  for (const ext of ['-wal', '-shm']) if (fs.existsSync(DB_PATH + ext)) fs.copyFileSync(DB_PATH + ext, dst + ext);
  console.log(`  [backup] ${path.basename(dst)}`);
  db.transaction(() => {
    for (const coll of ['pages', 'praxisangebote']) {
      const cid = db.prepare('SELECT id FROM _emdash_collections WHERE slug=?').get(coll).id;
      const f = db.prepare('SELECT id, validation FROM _emdash_fields WHERE collection_id=? AND slug=?').get(cid, 'sections');
      const v = JSON.parse(f.validation);
      const t = v.subFields.find((s) => s.slug === 'type');
      if (t && !t.options.includes('faq')) {
        // insert 'faq' right after 'testimonials' for a sensible dropdown order
        const i = t.options.indexOf('testimonials');
        if (i > -1) t.options.splice(i + 1, 0, 'faq'); else t.options.push('faq');
        db.prepare('UPDATE _emdash_fields SET validation=? WHERE id=?').run(JSON.stringify(v), f.id);
        console.log(`  + ${coll}.sections.type option 'faq'`);
      } else console.log(`  ${coll}.sections.type already has 'faq' — skip`);
    }
  })();
  db.close();
}

addToSeed();
addFaqType();
console.log('[done] now run: npx emdash seed seed/seed.json  (creates the faq collection), then restart dev.');
