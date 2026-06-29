const Database = require('better-sqlite3');
const db = new Database('D:/Tanner/vitalunaris/data.db', { readonly: true });
for (const coll of ['pages', 'praxisangebote']) {
  const rows = db.prepare(`SELECT slug, sections FROM ec_${coll}`).all();
  for (const r of rows) {
    let secs = []; try { secs = JSON.parse(r.sections || '[]'); } catch {}
    if (!secs.length) continue;
    console.log(`\n=== ${coll}/${r.slug} (${secs.length} sections) ===`);
    secs.forEach((s, i) => {
      let n = '';
      if (s.items) { try { const a = JSON.parse(s.items); n = Array.isArray(a) ? `items[${a.length}]` : `items{obj}`; } catch { n = 'items(raw)'; } }
      console.log(`  ${i}. type=${s.type}  title="${(s.title||'').slice(0,40)}"  ${n}`);
    });
  }
}
