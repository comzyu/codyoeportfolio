"""One clear, iconic image per country, drawn as clean line art and turned into an emboss height map.
Coordinates are in the postcard's own 1024 x 1448 space; output is 1120 x 1584 (white raised, 50% grey flat).
usage: python3 make_icons.py OUTDIR"""
import sys, os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
TW, TH, W, H = 1024, 1448, 1120, 1584
SS = 2                                                     # draw at 2x then shrink, for smooth lines

def canvas():
    im = Image.new('L', (TW * SS, TH * SS), 0); return im, ImageDraw.Draw(im)
P = lambda pts: [(x * SS, y * SS) for x, y in pts]
def line(d, pts, w, v=255): d.line(P(pts), fill=v, width=int(w * SS), joint='curve')
def poly(d, pts, v): d.polygon(P(pts), fill=v)
def circle(d, cx, cy, r, w=None, fill=None, v=255):
    box = [(cx - r) * SS, (cy - r) * SS, (cx + r) * SS, (cy + r) * SS]
    if fill is not None: d.ellipse(box, fill=fill)
    if w: d.ellipse(box, outline=v, width=int(w * SS))

def finish(im, key, soft=3.0, raise_=0.85):
    a = im.resize((W, H), Image.LANCZOS).filter(ImageFilter.GaussianBlur(soft))
    h = np.asarray(a, np.float32) / 255.0
    out = np.clip(128 + h * 127 * raise_, 0, 255).astype(np.uint8)
    Image.fromarray(out, 'L').save(os.path.join(OUT, 'icon-%s.png' % key))

# ---------- Japan: Mount Fuji under a rising sun, a band of clouds at its foot ----------
im, d = canvas()
circle(d, 640, 520, 190, w=7)                                # the sun: a raised ring
circle(d, 640, 520, 150, fill=70)                            # and a gently raised disc inside
base_y = 1260
fuji = [(60, base_y), (300, 900), (420, 760), (470, 735), (560, 738), (610, 760), (720, 900), (980, base_y)]
poly(d, fuji, 95)                                            # the mountain, raised a little
line(d, fuji, 6)
cap = [(420, 760), (470, 735), (560, 738), (610, 760), (640, 800), (600, 830), (575, 805), (540, 845), (505, 805), (470, 840), (445, 800), (395, 825), (420, 760)]
poly(d, cap, 190); line(d, cap, 4)                           # the snow cap, raised higher
for k, (y, x0, x1) in enumerate([(1180, 120, 520), (1215, 520, 900), (1250, 60, 420)]):   # clouds, three soft bands with curled ends
    line(d, [(x0, y), (x1, y)], 5)
    circle(d, x1 + 18, y - 18, 18, w=5)
finish(im, 'jp')

# ---------- France: the Eiffel Tower, tall down the right side ----------
im, d = canvas()
cx = 700
top, l1, l2, base = 260, 760, 1010, 1330                    # tip, first and second platforms, ground
def leg(side):                                               # the curved outer edge of the tower
    pts = []
    for i in range(41):
        t = i / 40; y = top + 60 + (base - top - 60) * t
        x = cx + side * (8 + 250 * t ** 2.2)
        pts.append((x, y))
    return pts
L, R = leg(-1), leg(1)
line(d, L, 7); line(d, R, 7)
line(d, [(cx, top), (cx, top + 60)], 5); circle(d, cx, top + 66, 9, fill=255)
def width_at(y): t = (y - top - 60) / (base - top - 60); return 8 + 250 * t ** 2.2
for y in (l1, l2):                                           # platforms
    w = width_at(y) + 26; poly(d, [(cx - w, y - 12), (cx + w, y - 12), (cx + w, y + 8), (cx - w, y + 8)], 230)
# the arch between the legs
arch = [(cx - width_at(base) + 40 + (2 * (width_at(base) - 40)) * i / 40, base - 40 - 170 * math.sin(math.pi * i / 40)) for i in range(41)]
line(d, arch, 6)
# lattice: sparse crosses between platforms, so it reads as iron without getting busy
for y0, y1 in ((top + 80, l1 - 20), (l1 + 20, l2 - 20), (l2 + 20, base - 220)):
    n = 5 if y0 < l1 else 4
    for j in range(n):
        a, b = y0 + (y1 - y0) * j / n, y0 + (y1 - y0) * (j + 1) / n
        line(d, [(cx - width_at(a) + 6, a), (cx + width_at(b) - 6, b)], 2.6, 200)
        line(d, [(cx + width_at(a) - 6, a), (cx - width_at(b) + 6, b)], 2.6, 200)
line(d, [(120, base + 2), (980, base + 2)], 4, 180)          # the ground
finish(im, 'fr')

# ---------- Malaysia: the Petronas Towers, with the skybridge ----------
im, d = canvas()
def tower(cx):
    tiers = [(1330, 120), (1000, 112), (840, 98), (700, 82), (590, 64), (500, 46), (440, 28)]
    for (y0, w0), (y1, w1) in zip(tiers, tiers[1:]):
        poly(d, [(cx - w0 / 2, y0), (cx + w0 / 2, y0), (cx + w1 / 2, y1 + 0), (cx - w1 / 2, y1)], 90)
        line(d, [(cx - w0 / 2, y0), (cx - w1 / 2, y1), (cx + w1 / 2, y1), (cx + w0 / 2, y0)], 5)
        for f in (-0.25, 0, 0.25):                            # vertical ribs
            line(d, [(cx + f * w0, y0 - 6), (cx + f * w1, y1 + 6)], 2.4, 200)
    line(d, [(cx, 440), (cx, 240)], 5); circle(d, cx, 236, 7, fill=255)
tower(380); tower(680)
poly(d, [(430, 860), (630, 860), (630, 884), (430, 884)], 220)    # the skybridge
line(d, [(440, 884), (480, 960)], 4); line(d, [(620, 884), (580, 960)], 4)
line(d, [(120, 1332), (920, 1332)], 4, 180)
finish(im, 'my')

# ---------- Singapore: the Vanda Miss Joaquim orchid, a spray down the right ----------
im, d = canvas()
stem = [(940, 1380), (900, 1180), (850, 980), (800, 760), (770, 560), (760, 380)]
line(d, stem, 6)
def orchid(cx, cy, s, rot):
    def pt(dx, dy):
        c, sn = math.cos(rot), math.sin(rot); return (cx + (dx * c - dy * sn) * s, cy + (dx * sn + dy * c) * s)
    def petal(ang, ln, wd, v):
        pts = []
        for i in range(40):
            t = i / 39 * 2 * math.pi; x, y = math.cos(t) * ln / 2 + ln / 2, math.sin(t) * wd / 2
            a = math.radians(ang); pts.append(pt(x * math.cos(a) - y * math.sin(a), x * math.sin(a) + y * math.cos(a)))
        poly(d, pts, v); line(d, pts + [pts[0]], 3)
    for ang in (-90, -18, 54, 126, 198):                      # five petals and sepals
        petal(ang, 120, 64, 110)
    lip = [pt(-40, 20), pt(40, 20), pt(52, 90), pt(0, 130), pt(-52, 90)]   # the big rounded lip
    poly(d, lip, 170); line(d, lip + [lip[0]], 4)
    circle(d, *pt(0, 0), 14 * s, fill=230)
orchid(760, 460, 1.0, 0.15); orchid(830, 760, 0.92, -0.25); orchid(900, 1060, 0.85, 0.1)
for (x, y) in [(770, 300), (790, 250)]:                       # two buds at the tip
    circle(d, x, y, 16, w=4)
finish(im, 'sg')
print('done')
