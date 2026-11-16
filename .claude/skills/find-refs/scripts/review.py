"""Step 3 of a reference sweep: contact sheets for Claude to review by eye. Nothing goes on the board unreviewed.

usage: python3 review.py OUT_DIR [per_sheet=48]
writes OUT_DIR/review/sheetNN.jpg  a grid of references, each labelled with its number (n) and search, big enough to judge
Claude reads every sheet, then writes OUT_DIR/reject.json: [n, n, ...] for anything off-brief (see SKILL.md, "Curate")."""
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1]; PER = int(sys.argv[2]) if len(sys.argv) > 2 else 48
refs = json.load(open(os.path.join(OUT, 'refs.json')))
os.makedirs(os.path.join(OUT, 'review'), exist_ok=True)
cols, cw, ch = 8, 200, 300
try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
except Exception: font = ImageFont.load_default()
for s in range(0, len(refs), PER):
    grp = refs[s:s + PER]; rows = (len(grp) + cols - 1) // cols
    sheet = Image.new('RGB', (cols * cw, rows * ch), (245, 245, 242)); d = ImageDraw.Draw(sheet)
    for i, r in enumerate(grp):
        im = Image.open(os.path.join(OUT, 'cut', r['key'] + '.jpg')); im.thumbnail((cw - 8, ch - 26))
        x, y = (i % cols) * cw + 4, (i // cols) * ch + 22
        sheet.paste(im, (x, y)); d.rectangle((x, y - 20, x + 60, y - 2), fill=(20, 20, 22)); d.text((x + 4, y - 19), str(r['n']), fill='white', font=font)
        d.text((x + 66, y - 18), (r['q'] or '')[:18], fill=(110, 110, 110), font=ImageFont.load_default())
    sheet.save(os.path.join(OUT, 'review', 'sheet%02d.jpg' % (s // PER + 1)), quality=78)
print('review sheets', (len(refs) + PER - 1) // PER)
