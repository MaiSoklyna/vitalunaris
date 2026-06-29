#!/usr/bin/env node
/* Migrate the Blocks-router pages (home, kontakt, neuigkeiten, praxisangebote/overview,
 * ausbildung-overview) off raw-JSON `sections[].items` into top-level fields:
 *   - card lists  -> repeater fields (labeled sub-fields, no JSON)
 *   - config blobs -> scalar fields (newsletter placeholder/submit, contact form, claim CTA)
 * Idempotent: fields skip if present; data fills only when target is empty.
 * Run under Herd Node 24. Restart dev server afterwards. */
const fs = require('fs');
const Database = require('better-sqlite3');
const DB = 'D:/Tanner/vitalunaris/data.db';
fs.copyFileSync(DB, DB + '.bak-blocks');
for (const ext of ['-wal', '-shm']) if (fs.existsSync(DB + ext)) fs.copyFileSync(DB + ext, DB + '.bak-blocks' + ext);
const db = new Database(DB); db.pragma('busy_timeout = 8000');

const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function ulid() { let t = Date.now(), s = ''; for (let i=0;i<10;i++){s=B32[t%32]+s;t=Math.floor(t/32);} for (let i=0;i<16;i++) s+=B32[Math.floor(Math.random()*32)]; return s; }
const collId = (slug) => db.prepare('SELECT id FROM _emdash_collections WHERE slug=?').get(slug).id;
const hasField = (cid, slug) => !!db.prepare('SELECT 1 FROM _emdash_fields WHERE collection_id=? AND slug=?').get(cid, slug);
const hasCol = (t, c) => db.prepare(`PRAGMA table_info(${t})`).all().some(x => x.name === c);

function colType(type) { return type === 'repeater' ? 'JSON' : (type === 'boolean' || type === 'integer') ? 'INTEGER' : 'TEXT'; }
function addField(coll, def) {
  const cid = collId(coll), table = `ec_${coll}`;
  if (!hasField(cid, def.slug)) {
    const validation = def.subFields ? JSON.stringify({ minItems: 0, maxItems: def.maxItems || 20, subFields: def.subFields })
      : def.options ? JSON.stringify({ options: def.options }) : null;
    db.prepare(`INSERT INTO _emdash_fields (id,collection_id,slug,label,type,column_type,required,"unique",default_value,validation,widget,options,sort_order,created_at,searchable,translatable)
      VALUES (@id,@cid,@slug,@label,@type,@ct,0,0,NULL,@validation,NULL,NULL,@sort,datetime('now'),0,1)`)
      .run({ id: ulid(), cid, slug: def.slug, label: def.label, type: def.type, ct: colType(def.type), validation, sort: def.sortOrder });
    console.log(`  + field ${coll}.${def.slug} (${def.type})`);
  } else console.log(`  field ${coll}.${def.slug} exists — skip`);
  if (!hasCol(table, def.slug)) { db.exec(`ALTER TABLE ${table} ADD COLUMN ${def.slug} ${colType(def.type)}`); console.log(`  + column ${table}.${def.slug}`); }
}

// repeater data migration from a section's items[]
function migArr(coll, slug, sectionType, field, mapFn) {
  const table = `ec_${coll}`;
  const row = db.prepare(`SELECT id, sections, ${field} AS target FROM ${table} WHERE slug=?`).get(slug);
  if (!row) return console.log(`    ! ${coll}/${slug} missing`);
  if (row.target && row.target !== '[]' && row.target !== 'null') return console.log(`    = ${coll}/${slug}.${field} populated — skip`);
  let secs = []; try { secs = JSON.parse(row.sections || '[]'); } catch {}
  const sec = secs.find(s => s.type === sectionType); let items = [];
  if (sec && sec.items) { try { items = JSON.parse(sec.items); } catch {} }
  const mapped = (Array.isArray(items) ? items : []).map(mapFn);
  db.prepare(`UPDATE ${table} SET ${field}=? WHERE id=?`).run(JSON.stringify(mapped), row.id);
  if (sec) { sec.items = '[]'; db.prepare(`UPDATE ${table} SET sections=? WHERE id=?`).run(JSON.stringify(secs), row.id); }
  console.log(`    -> ${coll}/${slug}.${field} = ${mapped.length} rows`);
}

// scalar config migration: pull keys from a section's items{} (or section-level keys) into columns
function migScalars(coll, slug, sectionType, mapping, sectionLevel) {
  const table = `ec_${coll}`;
  const row = db.prepare(`SELECT * FROM ${table} WHERE slug=?`).get(slug);
  if (!row) return console.log(`    ! ${coll}/${slug} missing`);
  let secs = []; try { secs = JSON.parse(row.sections || '[]'); } catch {}
  const sec = secs.find(s => s.type === sectionType) || {};
  let cfg = {}; if (sec.items) { try { cfg = JSON.parse(sec.items); } catch {} }
  const src = sectionLevel ? sec : cfg;
  for (const [col, key] of Object.entries(mapping)) {
    if (row[col] != null && row[col] !== '') continue; // don't clobber
    const val = src[key];
    if (val == null) continue;
    db.prepare(`UPDATE ${table} SET ${col}=? WHERE id=?`).run(typeof val === 'string' ? val : JSON.stringify(val), row.id);
    console.log(`    -> ${coll}/${slug}.${col}`);
  }
}

const PARA = [{ slug: 'text', type: 'text', label: 'Absatz' }];

const tx = db.transaction(() => {
  console.log('# schema: pages');
  addField('pages', { slug: 'offer_cards', label: 'Angebots-Karten', type: 'repeater', sortOrder: 16, maxItems: 6, subFields: [
    { slug: 'icon', type: 'string', label: 'Icon-Pfad' }, { slug: 'title', type: 'string', label: 'Titel' },
    { slug: 'description', type: 'text', label: 'Text' }, { slug: 'cta_text', type: 'string', label: 'Button-Text' }, { slug: 'cta_href', type: 'string', label: 'Link' } ] });
  addField('pages', { slug: 'outcomes', label: 'Lernziele', type: 'repeater', sortOrder: 17, maxItems: 8, subFields: [
    { slug: 'title', type: 'string', label: 'Titel' }, { slug: 'description', type: 'text', label: 'Beschreibung' },
    { slug: 'color', type: 'select', label: 'Farbe' } ] });
  addField('pages', { slug: 'stage_cards', label: 'Stufen-Karten', type: 'repeater', sortOrder: 18, maxItems: 6, subFields: [
    { slug: 'icon', type: 'string', label: 'Icon-Pfad' }, { slug: 'eyebrow', type: 'string', label: 'Eyebrow' },
    { slug: 'title', type: 'string', label: 'Titel' }, { slug: 'body', type: 'text', label: 'Text' } ] });
  addField('pages', { slug: 'faq_items', label: 'Häufige Fragen', type: 'repeater', sortOrder: 19, maxItems: 20, subFields: [
    { slug: 'question', type: 'string', label: 'Frage' }, { slug: 'answer', type: 'text', label: 'Antwort' } ] });
  addField('pages', { slug: 'newsletterhero_paragraphs', label: 'Newsletter-Hero · Absätze', type: 'repeater', sortOrder: 20, maxItems: 6, subFields: PARA });
  for (const [slug, label, sort] of [['newsletter_placeholder', 'Newsletter Platzhalter', 21], ['newsletter_submit_text', 'Newsletter Button', 22],
    ['contact_recipient', 'Kontakt Empfänger-E-Mail', 23], ['contact_submit_text', 'Kontakt Button', 24],
    ['contact_email_placeholder', 'Kontakt E-Mail Platzhalter', 25], ['contact_firstname_placeholder', 'Kontakt Vorname Platzhalter', 26],
    ['contact_lastname_placeholder', 'Kontakt Nachname Platzhalter', 27], ['contact_message_placeholder', 'Kontakt Nachricht Platzhalter', 28]])
    addField('pages', { slug, label, type: 'string', sortOrder: sort });

  console.log('# schema: praxisangebote');
  addField('praxisangebote', { slug: 'practice_offers', label: 'Angebots-Reihen', type: 'repeater', sortOrder: 30, maxItems: 8, subFields: [
    { slug: 'eyebrow', type: 'string', label: 'Eyebrow' }, { slug: 'title', type: 'string', label: 'Titel' }, { slug: 'body', type: 'text', label: 'Text' },
    { slug: 'image', type: 'image', label: 'Bild' }, { slug: 'primary_text', type: 'string', label: 'Button 1 Text' }, { slug: 'primary_href', type: 'string', label: 'Button 1 Link' },
    { slug: 'secondary_text', type: 'string', label: 'Button 2 Text' }, { slug: 'secondary_href', type: 'string', label: 'Button 2 Link' } ] });
  for (const [slug, label, sort] of [['newsletter_placeholder', 'Newsletter Platzhalter', 31], ['newsletter_submit_text', 'Newsletter Button', 32],
    ['claim_cta_text', 'Claim Button-Text', 33], ['claim_cta_href', 'Claim Button-Link', 34]])
    addField('praxisangebote', { slug, label, type: 'string', sortOrder: sort });

  console.log('# data');
  migArr('pages', 'home', 'offer_cards', 'offer_cards', (c) => ({ icon: c.icon || '', title: c.title || '', description: c.description || c.body || '', cta_text: c.ctaText || '', cta_href: c.ctaHref || '' }));
  migArr('pages', 'ausbildung-overview', 'outcomes', 'outcomes', (c) => ({ title: c.title || '', description: c.description || '', color: c.color || '' }));
  migArr('pages', 'ausbildung-overview', 'stages', 'stage_cards', (c) => ({ icon: c.icon || '', eyebrow: c.eyebrow || '', title: c.title || '', body: c.body || '' }));
  migArr('pages', 'ausbildung-overview', 'faq', 'faq_items', (c) => ({ question: c.question || '', answer: c.answer || '' }));
  migArr('pages', 'neuigkeiten', 'newsletter_hero', 'newsletterhero_paragraphs', (s) => ({ text: typeof s === 'string' ? s : (s?.text || '') }));
  migArr('praxisangebote', 'overview', 'practice_offers', 'practice_offers', (c) => ({ eyebrow: c.eyebrow || '', title: c.title || '', body: c.body || '', image: c.image || '', primary_text: c.primaryText || '', primary_href: c.primaryHref || '', secondary_text: c.secondaryText || '', secondary_href: c.secondaryHref || '' }));

  // neuigkeiten newsletter_hero paragraphs live under items.paragraphs (object, not array) — handle specially
  {
    const row = db.prepare("SELECT id, sections, newsletterhero_paragraphs AS t FROM ec_pages WHERE slug='neuigkeiten'").get();
    if (row && (!row.t || row.t === '[]')) {
      let secs = []; try { secs = JSON.parse(row.sections || '[]'); } catch {}
      const sec = secs.find(s => s.type === 'newsletter_hero');
      let cfg = {}; if (sec && sec.items) { try { cfg = JSON.parse(sec.items); } catch {} }
      const paras = (cfg.paragraphs || []).map((t) => ({ text: t }));
      db.prepare('UPDATE ec_pages SET newsletterhero_paragraphs=? WHERE id=?').run(JSON.stringify(paras), row.id);
      console.log(`    -> pages/neuigkeiten.newsletterhero_paragraphs = ${paras.length} rows`);
    }
  }

  console.log('# config scalars');
  migScalars('pages', 'home', 'newsletter', { newsletter_placeholder: 'placeholder', newsletter_submit_text: 'submitText' });
  migScalars('pages', 'kontakt', 'contact_form', { contact_recipient: 'recipient', contact_submit_text: 'submitText', contact_email_placeholder: 'emailPlaceholder', contact_firstname_placeholder: 'firstNamePlaceholder', contact_lastname_placeholder: 'lastNamePlaceholder', contact_message_placeholder: 'messagePlaceholder' });
  migScalars('pages', 'neuigkeiten', 'newsletter_hero', { newsletter_placeholder: 'placeholder', newsletter_submit_text: 'submitText' });
  migScalars('pages', 'neuigkeiten', 'newsletter_hero', { hero_eyebrow: 'eyebrow', hero_title: 'title', hero_image: 'image' }, true);
  migScalars('praxisangebote', 'overview', 'newsletter', { newsletter_placeholder: 'placeholder', newsletter_submit_text: 'submitText' });
  migScalars('praxisangebote', 'overview', 'claim_block', { claim_cta_text: 'ctaText', claim_cta_href: 'ctaHref' });
});
tx();
console.log('\n[done] restart dev server to load new schema.');
db.close();
