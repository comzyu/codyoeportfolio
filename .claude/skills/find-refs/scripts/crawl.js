// Logged-out Pinterest sweep (step 1 when no logged-in browser is available).
// usage: node crawl.js OUT_DIR [chips per search=3] [board path, e.g. /user/board/]
// reads OUT_DIR/queries.json (list of searches); writes OUT_DIR/pins.json (appends, de-duplicated) — safe to re-run.
// Logged out, Pinterest won't open single pins, so "click a pin -> More like this" is approximated two ways:
//  1. a board's "More ideas" feed (Pinterest's own "similar to this board"), if a board path is given
//  2. each search's refinement chips (Dark, Mobile, Ux...), followed one level down = tighter clusters of similar images
// Off-topic chips happen (a "glass" search offered "Fast food"): list their "via" values in OUT_DIR/offtopic.json before pack.py.
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = process.argv[2];
const QUERIES = JSON.parse(fs.readFileSync(OUT + '/queries.json', 'utf8'));
const CHIPS = +process.argv[3] || 3;
const seen = new Map();
if (fs.existsSync(OUT + '/pins.json')) for (const p of JSON.parse(fs.readFileSync(OUT + '/pins.json', 'utf8'))) seen.set(p.img, p);
const save = () => fs.writeFileSync(OUT + '/pins.json', JSON.stringify([...seen.values()]));
function harvest(obj, tag, via, sink) {
  const walk = (o, d) => {
    if (!o || typeof o !== 'object' || d > 16) return;
    if (Array.isArray(o)) { o.forEach((x) => walk(x, d + 1)); return; }
    if (o.images && o.images['474x'] && (o.type === 'pin' || o.node_id)) {
      const s = o.images['474x'];
      sink.push({ img: (o.images['736x'] || s).url, small: s.url, w: s.width, h: s.height, color: o.dominant_color || '', title: (o.grid_title || o.title || '').slice(0, 120), tag, via });
    }
    for (const k in o) if (k !== 'images') walk(o[k], d + 1);
  };
  walk(obj, 0);
}
async function load(page, url, tag, via, scrolls, want) {
  const got = [];
  const on = async (r) => { const u = r.url(); if (!want.some((w) => u.includes(w))) return; try { harvest(JSON.parse(await r.text()), tag, via, got); } catch (e) {} };
  page.on('response', on);
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); await page.waitForTimeout(6000);
    for (let i = 0; i < scrolls; i++) { await page.mouse.wheel(0, 2600); await page.waitForTimeout(1800); }
  } catch (e) { console.log('fail', url.slice(0, 90), e.message.slice(0, 60)); }
  page.off('response', on);
  return got;
}
const add = (arr) => { let n = 0; for (const p of arr) if (!seen.has(p.img)) { seen.set(p.img, p); n++; } return n; };
(async () => {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  const b = await chromium.launch({ proxy: proxy ? { server: proxy } : undefined });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 1600 }, userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36' });
  const page = await ctx.newPage();
  // 1. more like a board (optional)
  if (process.argv[4]) { const board = await load(page, 'https://www.pinterest.com' + process.argv[4], 'More like your board', 'board ideas', 6, ['BoardContentRecommendationResource']);
    console.log('board ideas', add(board), 'total', seen.size); save(); }
  // 2. searches, then one level down through their chips
  for (const q of QUERIES) {
    const url = (t) => 'https://www.pinterest.com/search/pins/?q=' + encodeURIComponent(t);
    const res = await load(page, url(q), q, 'search', 2, ['BaseSearchResource']);
    const chips = await page.evaluate(() => [...document.querySelectorAll('[data-test-id="one-bar-pill"]')].map((e) => e.innerText.trim()).filter((t) => t && !/less ai|all pins/i.test(t)));
    console.log('search', q, '+' + add(res), 'chips:', chips.slice(0, CHIPS).join(', '), 'total', seen.size); save();
    for (const c of chips.slice(0, CHIPS)) {
      const r2 = await load(page, url(q + ' ' + c), q, 'chip: ' + c, 2, ['BaseSearchResource']);
      console.log('   ', c, '+' + add(r2), 'total', seen.size); save();
    }
  }
  await b.close();
})();
