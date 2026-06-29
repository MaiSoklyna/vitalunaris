import { defineMiddleware } from 'astro:middleware';

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

export const onRequest = defineMiddleware(async (context, next) => {
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
    // Already injected or no body marker — return the (already read) HTML as-is.
    return new Response(html, { status: res.status, statusText: res.statusText, headers: res.headers });
  }

  return res;
});
