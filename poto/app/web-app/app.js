/* Poto in-app layer. Loaded first on every page inside the app (never in the browser prototypes).
   - one glass bar (the one from Home) on every tab page
   - navigator.vibrate -> the phone's haptics, so every tap the prototypes already make is felt
   - PotoNative.call(name, args) -> a promise answered by the phone (camera shots, zoom, flip)
   Links between pages are caught by the app itself (it switches tabs or opens the postcard), not here. */
(function () {
  var RN = window.ReactNativeWebView;
  if (!RN) return;
  var page = (location.pathname.split('/').pop() || '').replace('.html', '') || 'home-min';
  var root = document.documentElement;
  root.classList.add('in-app', 'pg-' + page);
  var post = function (m) { try { RN.postMessage(JSON.stringify(m)); } catch (e) {} };

  navigator.vibrate = function (p) { var ms = Array.isArray(p) ? p[0] : p; post({ type: 'haptic', ms: +ms || 0 }); return true; };

  var waits = {}, n = 0;
  window.PotoNative = {
    inApp: true,
    post: post,
    call: function (name, args) {
      return new Promise(function (res, rej) { var id = ++n; waits[id] = [res, rej]; post({ type: 'call', id: id, name: name, args: args || {} }); });
    },
    _done: function (id, ok, val) { var w = waits[id]; if (!w) return; delete waits[id]; (ok ? w[0] : w[1])(val); },
    // the phone tells a page it's on screen again (another tab may have changed what's stored)
    _shown: function () { if (window.PotoNative.onShown) window.PotoNative.onShown(); },
  };

  var TABS = { 'home-min': 'home', home: 'calendar', rolls: 'rolls', profile: 'desk' };
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
    nav.innerHTML = B.map(function (b) {
      var icon = b[0] === 'camera' ? '<i class="shut"></i>' : I[b[0]];
      return '<button type="button" data-t="' + b[0] + '" class="' + (b[0] === tab ? 'on' : '') + (b[0] === 'camera' ? ' cam' : '') + '" aria-label="' + b[1] + '">' + icon + '<span class="lab">' + b[1] + '</span></button>';
    }).join('');
    document.body.appendChild(nav);
    nav.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('pointerdown', function () { b.classList.add('say'); clearTimeout(b.t); b.t = setTimeout(function () { b.classList.remove('say'); }, 900); });
      b.addEventListener('click', function () { var t = b.dataset.t; navigator.vibrate(4); post(t === 'camera' ? { type: 'camera' } : { type: 'tab', name: t }); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addBar); else addBar();
})();
