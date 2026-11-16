"""Step 2 of a reference sweep: download every crawled pin, drop near-duplicates, keep one 474 px copy per reference.

usage: python3 pack.py OUT_DIR
reads   OUT_DIR/pins.json          (from crawl.js or the logged-in browser sweep)
        OUT_DIR/offtopic.json      optional: list of "via" values to drop entirely (e.g. "chip: Logo")
writes  OUT_DIR/cut/<key>.jpg      one image per reference, 474 px wide
        OUT_DIR/refs.json          [{n, key, w, h, q (search), via, title}]  numbered in crawl order
Images are fetched through the session's HTTPS proxy (urllib picks it up from the environment)."""
import json, os, sys, concurrent.futures as cf, urllib.request
from PIL import Image

OUT = sys.argv[1]
pins = json.load(open(os.path.join(OUT, 'pins.json')))
off_p = os.path.join(OUT, 'offtopic.json')
OFF = set(json.load(open(off_p))) if os.path.exists(off_p) else set()
pins = [p for p in pins if p.get('via') not in OFF]
for d in ('raw', 'cut'): os.makedirs(os.path.join(OUT, d), exist_ok=True)
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'}
key = lambda p: p['small'].split('/')[-1].split('.')[0]

def fetch(p):
    path = os.path.join(OUT, 'raw', key(p) + '.jpg')
    if not os.path.exists(path):
        try: open(path, 'wb').write(urllib.request.urlopen(urllib.request.Request(p['small'], headers=UA), timeout=30).read())
        except Exception: return p, None
    return p, path

def dhash(im, n=12):
    g = im.convert('L').resize((n + 1, n), Image.LANCZOS); px = list(g.getdata()); bits = 0
    for y in range(n):
        for x in range(n): bits = (bits << 1) | (px[y * (n + 1) + x] > px[y * (n + 1) + x + 1])
    return bits

with cf.ThreadPoolExecutor(12) as ex: got = list(ex.map(fetch, pins))
refs, hashes = [], []
for p, path in got:
    if not path: continue
    try: im = Image.open(path).convert('RGB')
    except Exception: continue
    if im.width < 200 or im.height < 150: continue
    h = dhash(im)
    if any(bin(h ^ o).count('1') <= 10 for o in hashes): continue      # the same image pinned twice, or a crop of it
    hashes.append(h)
    w = 474; hh = round(im.height * w / im.width)
    if hh > 1300: im = im.crop((0, 0, im.width, round(im.width * 1300 / w))); hh = 1300   # very long screenshots: keep the top
    k = key(p); im.resize((w, hh), Image.LANCZOS).save(os.path.join(OUT, 'cut', k + '.jpg'), quality=86)
    refs.append({'n': len(refs) + 1, 'key': k, 'w': w, 'h': hh, 'q': p.get('tag', ''), 'via': p.get('via', ''), 'title': p.get('title', ''), 'img': p.get('img', '')})
json.dump(refs, open(os.path.join(OUT, 'refs.json'), 'w'))
print('pins', len(pins), 'downloaded', sum(1 for _, x in got if x), 'unique', len(refs))
