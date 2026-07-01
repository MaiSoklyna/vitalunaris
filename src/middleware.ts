import { defineMiddleware, sequence } from 'astro:middleware';
import { sparkEmdash } from 'spark-emdash/middleware';

/**
 * Admin UX enhancement: when an editor clicks "Add Item" in a repeater field,
 * scroll the newly added row into view and focus its first input.
 *
 * The EmDash admin is a third-party SPA (@emdash-cms/admin) served from
 * node_modules, so we can't edit it directly. Instead we inject a tiny client
 * script into the admin HTML shell here — this survives EmDash upgrades because
 * it only depends on the public DOM shape (an "Add Item" button whose repeater
 * renders its rows in a `.space-y-2` list), not on internal package code.
 */
const SCROLL_ON_ADD = `<script>(function(){
  if (window.__emdashScrollAddInstalled) return;
  window.__emdashScrollAddInstalled = true;
  function isAddBtn(b){
    if(!b) return false;
    var t=(b.textContent||'').trim().toLowerCase();
    return t==='add item' || t==='add first item';
  }
  function list(root){
    return root.querySelector(':scope > .space-y-2') || root.querySelector('.space-y-2');
  }
  document.addEventListener('click', function(e){
    var b = e.target && e.target.closest && e.target.closest('button');
    if(!isAddBtn(b)) return;
    var root = b.parentElement && b.parentElement.parentElement;
    if(!root) return;
    var l0 = list(root);
    var before = l0 ? l0.children.length : 0;
    var start = performance.now();
    (function tick(){
      var l = list(root);
      if (l && l.children.length > before) {
        var item = l.children[l.children.length - 1];
        if (item) {
          item.scrollIntoView({ behavior: 'smooth', block: 'center' });
          var f = item.querySelector('input,textarea,select,[contenteditable="true"]');
          if (f) { try { f.focus({ preventScroll: true }); } catch(_){} }
        }
        return;
      }
      if (performance.now() - start < 1000) requestAnimationFrame(tick);
    })();
  }, true);
})();</script>`;

const scrollOnAdd = defineMiddleware(async (context, next) => {
  const res = await next();
  const { pathname } = new URL(context.request.url);
  const contentType = res.headers.get('content-type') || '';

  if (pathname.startsWith('/_emdash/admin') && contentType.includes('text/html')) {
    const html = await res.text();
    if (html.includes('</body>') && !html.includes('__emdashScrollAddInstalled')) {
      const headers = new Headers(res.headers);
      headers.delete('content-length'); // body length changes after injection
      return new Response(html.replace('</body>', SCROLL_ON_ADD + '</body>'), {
        status: res.status,
        statusText: res.statusText,
        headers,
      });
    }
    // Already injected or no body marker — return the (already read) HTML as-is,
    // but drop content-length: spark-emdash (upstream in the sequence) still
    // grows the body by injecting before </head> and reuses these headers.
    const headers = new Headers(res.headers);
    headers.delete('content-length');
    return new Response(html, { status: res.status, statusText: res.statusText, headers });
  }

  return res;
});

/**
 * spark-emdash upgrades the EmDash admin editing experience (wider modals,
 * scrollable forms, JSON/markdown editors, char counts, change tracking,
 * dark mode, and block-card previews). It only injects CSS + a MutationObserver
 * that sets CSS `order`/`grid-column` — it never reparents React-managed nodes,
 * so it survives EmDash upgrades and doesn't fight React reconciliation.
 *
 * The installed spark-emdash@0.6.0 is tuned for VitaLunaris (its card previews
 * know our `on-sky`/`spring-wood` tones). Zero-config for now — the base UX fixes
 * apply to our `sections`-repeater editors out of the box. Add `layouts` /
 * `illustrations` / `previews` here once we confirm exact modal field labels.
 *
 * sequence() runs spark first (injects before </head>), then scrollOnAdd
 * (injects before </body>); each returns a fresh Response, so both patches land.
 */
export const onRequest = sequence(sparkEmdash(), scrollOnAdd);
