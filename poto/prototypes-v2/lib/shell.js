/* Poto shell layer. Every page loads this first. On its own (the prototype hub) it does nothing.
   Inside the app it joins the page to the app around it, which is either
   - the phone app (React Native WebView), or
   - the browser app (app.html, which holds each page in a frame and exposes window.PotoShell).
   What it adds:
   - one glass bar (the one from Home) on every tab page
   - navigator.vibrate -> the phone's haptics (in the phone app)
   - PotoNative.call(name, args) -> a promise answered by the app (camera, saving shots)
   - potoGo(url): moving to another page goes through the app (switch tab, open the postcard, close)
   - in the browser app, photos you took (shots/<id>.jpg) are served from the browser's storage */
(function () {
  var RN = window.ReactNativeWebView, SHELL = null;
  if (!RN) { try { if (window.parent !== window && window.parent.PotoShell) SHELL = window.parent.PotoShell; } catch (e) {} }
  window.potoGo = function (url) { location.href = url; };
  if (!RN && !SHELL) return;

  var page = (location.pathname.split('/').pop() || '').replace('.html', '') || 'home-min';
  var root = document.documentElement;
  root.classList.add('in-app', 'pg-' + page, RN ? 'on-phone' : 'on-web');
  var post = RN ? function (m) { try { RN.postMessage(JSON.stringify(m)); } catch (e) {} } : function (m) { SHELL.receive(window, m); };

  if (RN) navigator.vibrate = function (p) { var ms = Array.isArray(p) ? p[0] : p; post({ type: 'haptic', ms: +ms || 0 }); return true; };

  var waits = {}, n = 0;
  window.PotoNative = {
    inApp: true,
    platform: RN ? 'phone' : 'web',
    post: post,
    call: function (name, args) {
      return new Promise(function (res, rej) { var id = ++n; waits[id] = [res, rej]; post({ type: 'call', id: id, name: name, args: args || {} }); });
    },
    _done: function (id, ok, val) { var w = waits[id]; if (!w) return; delete waits[id]; (ok ? w[0] : w[1])(val); },
    // the page is on screen again: undo the "leaving" animations it played before handing off (e.g. a print opening into the postcard)
    _shown: function () {
      document.getAnimations().forEach(function (a) { try { if (a.effect && a.effect.getComputedTiming().fill === 'forwards' && a.playState === 'finished') a.cancel(); } catch (e) {} });
      if (window.PotoNative.onShown) window.PotoNative.onShown();
    },
  };

  // moving between pages: tell the app instead of loading the page here
  window.potoGo = function (url) {
    var m = String(url).match(/([a-z0-9-]+)\.html(?:\?([^#]*))?/);
    if (!m) { location.href = url; return; }
    post({ type: 'nav', page: m[1], query: m[2] || '' });
  };
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.getAttribute('href');
    if (!/\.html(\?|#|$)/.test(href) || /^[a-z]+:/i.test(href)) return;
    e.preventDefault(); window.potoGo(href);
  }, true);

  // the browser app: your shots live in the browser's storage, so their addresses are swapped for it as pages ask for them
  if (SHELL) {
    var swap = function (v) { return (typeof v === 'string' && v.indexOf('shots/') !== -1 && SHELL.shotURL(v)) || v; };
    var d = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    Object.defineProperty(HTMLImageElement.prototype, 'src', { configurable: true, enumerable: true, get: d.get, set: function (v) { d.set.call(this, swap(v)); } });
    var fix = function (img) { var s = img.getAttribute('src'); if (s && s.indexOf('shots/') !== -1) { var u = swap(s); if (u !== s) img.setAttribute('src', u); } };
    new MutationObserver(function (list) {
      list.forEach(function (r) {
        if (r.type === 'attributes') { if (r.target.tagName === 'IMG') fix(r.target); return; }
        r.addedNodes.forEach(function (nd) { if (nd.nodeType !== 1) return; if (nd.tagName === 'IMG') fix(nd); nd.querySelectorAll && nd.querySelectorAll('img').forEach(fix); });
      });
    }).observe(root, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
  }

  // the bar
  var TABS = { postcards: 'home', 'home-min': 'home', home: 'calendar', rolls: 'rolls', profile: 'desk' };
  var tab = TABS[page];
  if (!tab) return;
  var I = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M8 7h8v7H8z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
    rolls: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><rect x="7" y="5" width="10" height="15" rx="2"/><path d="M9 3h6v2H9zM9 20h6v1.5H9z"/></svg>',
    desk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="9" r="3.5"/><path d="M5 20c1.3-3.6 4-5.2 7-5.2s5.7 1.6 7 5.2"/></svg>',
  };
  var B = [['home', 'Postcards'], ['calendar', 'Calendar'], ['camera', 'Camera'], ['rolls', 'Rolls'], ['desk', 'Desk']];
  function addBar() {
    var nav = document.createElement('nav');
    nav.className = 'potobar'; nav.setAttribute('aria-label', 'Poto');
    var btn = function (b) { return '<button type="button" data-t="' + b[0] + '" class="' + (b[0] === tab ? 'on' : '') + '" aria-label="' + b[1] + '"' + (b[0] === tab ? ' aria-current="page"' : '') + '>' + I[b[0]] + '<span class="lab">' + b[1] + '</span></button>'; };
    nav.innerHTML = '<div class="tabs">' + B.filter(function (b) { return b[0] !== 'camera'; }).map(btn).join('') + '</div>' +
      '<button type="button" data-t="camera" class="camb" aria-label="Camera"><i class="shut"></i><span class="lab">Camera</span></button>';
    document.body.appendChild(nav);
    nav.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('pointerdown', function () { b.classList.add('say'); clearTimeout(b.t); b.t = setTimeout(function () { b.classList.remove('say'); }, 900); });
      b.addEventListener('click', function () { var t = b.dataset.t; try { navigator.vibrate && navigator.vibrate(4); } catch (e) {} post(t === 'camera' ? { type: 'camera' } : { type: 'tab', name: t }); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBar); else addBar();
})();
