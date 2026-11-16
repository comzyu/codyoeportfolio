"""Step 4 of a reference sweep: build the board from the reviewed references.

usage: python3 build.py BOARD_DIR BOARD_ID SWEEP_DIR[:Sweep name] [SWEEP_DIR[:name] ...]
each SWEEP_DIR has refs.json + cut/ (pack.py), reject.json (review), themes.json ({search: theme}, optional)
writes BOARD_DIR/refs.html and BOARD_DIR/refs/sheetNNN.jpg (18 references per sheet, so a board stays within artifact file limits)
Publish BOARD_DIR's refs.html and refs/*.jpg into the artifact (Artifact tool: root=BOARD_DIR, capabilities {db: {}})."""
import json, os, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
BOARD, BID, sweeps = sys.argv[1], sys.argv[2], sys.argv[3:]
os.makedirs(os.path.join(BOARD, 'refs'), exist_ok=True)
for f in os.listdir(os.path.join(BOARD, 'refs')): os.remove(os.path.join(BOARD, 'refs', f))
allrefs = []
for arg in sweeps:
    d, _, name = arg.partition(':'); name = name or os.path.basename(d.rstrip('/'))
    refs = json.load(open(os.path.join(d, 'refs.json')))
    rej = set(json.load(open(os.path.join(d, 'reject.json')))) if os.path.exists(os.path.join(d, 'reject.json')) else set()
    themes = json.load(open(os.path.join(d, 'themes.json'))) if os.path.exists(os.path.join(d, 'themes.json')) else {}
    order = list(dict.fromkeys(themes.values()))
    keep = [r for r in refs if r['n'] not in rej]
    keep.sort(key=lambda r: (order.index(themes[r['q']]) if r['q'] in themes else len(order), r['n']))
    for r in keep: allrefs.append(dict(r, theme=themes.get(r['q'], r['q'] or 'Other'), sweep=name, src=d))
out, PER = [], 18
for i in range(0, len(allrefs), PER):
    grp = allrefs[i:i + PER]; H = sum(r['h'] for r in grp); sheet = Image.new('RGB', (474, H), 'white'); y = 0
    f = 'refs/sheet%03d.jpg' % (i // PER + 1)
    for r in grp:
        sheet.paste(Image.open(os.path.join(r['src'], 'cut', r['key'] + '.jpg')), (0, y))
        out.append({'n': len(out) + 1, 'f': f, 'y': y, 'sh': H, 'w': r['w'], 'h': r['h'], 'theme': r['theme'], 'q': r['q'], 'via': r['via'], 'sweep': r['sweep'], 'key': r['key']}); y += r['h']
    for o in out[-len(grp):]: o['sh'] = H
    sheet.save(os.path.join(BOARD, f), quality=82, progressive=True, optimize=True)
json.dump(out, open(os.path.join(BOARD, 'index.json'), 'w'))      # board number -> image key/search, for reading picks back later
slim = [{k: r[k] for k in ('n', 'f', 'y', 'sh', 'w', 'h', 'theme', 'q', 'via', 'sweep')} for r in out]
html = open(os.path.join(HERE, 'board-template.html')).read().replace('/*REFS*/[]', json.dumps(slim, separators=(',', ':'))).replace("/*BOARD*/'references'", json.dumps(BID))
open(os.path.join(BOARD, 'refs.html'), 'w').write(html)
print('board', len(out), 'references in', (len(out) + PER - 1) // PER, 'sheets')
