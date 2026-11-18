"""Full-page emboss height maps from public-domain artworks, and realistic wax seals.
usage: python3 make_emboss.py SCRATCH OUTDIR"""
import sys, os, math, random
import numpy as np
from PIL import Image, ImageFilter, ImageOps, ImageDraw, ImageFont

S, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
W, H = 1120, 1584                       # 2x of the 560-wide preview; postcard proportions

def cover(im, w, h, focus=(0.5, 0.5)):
    k = max(w / im.width, h / im.height); im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    x = round((im.width - w) * focus[0]); y = round((im.height - h) * focus[1]); return im.crop((x, y, x + w, y + h))

def height_from_art(path, focus, rotate=0, detail=10, gain=1.0, crop=None):
    im = Image.open(path).convert('L')
    if crop: im = im.crop(crop)
    if rotate: im = im.rotate(rotate, expand=True)
    im = cover(im, W, H, focus)
    im = ImageOps.autocontrast(im, cutoff=1)
    a = np.asarray(im, np.float32) / 255.0
    inv = 1.0 - a                                     # dark ink lines become raised paper
    blur = np.asarray(Image.fromarray((inv * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(detail)), np.float32) / 255.0
    hp = inv - blur                                   # keep the drawn detail, drop flat areas of tone
    hp = hp + (inv - 0.5) * 0.18                      # a little of the broad shapes, so the composition reads
    hp = np.tanh(hp * 3.2 * gain)
    hp = np.asarray(Image.fromarray(((hp * 0.5 + 0.5) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.9)), np.float32) / 255.0 - 0.5
    # across the whole page, but quieter under the writing so the note stays clear
    yy, xx = np.mgrid[0:H, 0:W]
    write = np.exp(-(((xx - W * 0.28) / (W * 0.30)) ** 2 + ((yy - H * 0.42) / (H * 0.24)) ** 2))
    hp = hp * (1 - 0.45 * write)
    out = np.clip(128 + hp * 2 * 110, 0, 255).astype(np.uint8)
    return Image.fromarray(out, 'L')

ART = [('jp', 'art/jp-big.jpg', (0.66, 0.5), (60, 60, 2945, 2000), 14), ('fr', 'art/fr-big.jpg', (0.52, 0.5), (360, 420, 2650, 1520), 14), ('my', 'art/my.jpg', (0.5, 0.35), (25, 25, 818, 1555), 10)]
for key, p, focus, crop, det in ART:
    height_from_art(os.path.join(S, p), focus, 0, det, 1.0, crop).save(os.path.join(OUT, 'emb-%s.png' % key))

# ---------------- wax seal ----------------
def noise1d(n, octaves, seed):
    r = random.Random(seed); v = np.zeros(n)
    for f, amp in octaves:
        ph = r.random() * 6.28; v += amp * np.sin(np.linspace(0, 2 * math.pi * f, n, endpoint=False) + ph)
    return v

def seal(key, color, mono, seed):
    N = 480; c = N / 2; r = random.Random(seed)
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32); dx, dy = xx - c, yy - c
    rad = np.hypot(dx, dy); ang = (np.arctan2(dy, dx) + math.pi) / (2 * math.pi)
    # outline: a pool of wax with soft lobes where it spread unevenly
    prof = noise1d(720, [(3, 9), (5, 6), (9, 3.5), (17, 1.6), (31, .7)], seed)
    lobes = np.zeros(720)
    for _ in range(4):
        at = r.random(); w = r.uniform(.025, .06); amp = r.uniform(6, 16)
        d = np.minimum(abs(np.linspace(0, 1, 720) - at), 1 - abs(np.linspace(0, 1, 720) - at)); lobes += amp * np.exp(-(d / w) ** 2)
    R0 = 168
    edge = R0 + prof[(ang * 719).astype(int)] + lobes[(ang * 719).astype(int)]
    inside = rad < edge
    # height: a domed pool, a raised rim where the stamp squeezed wax outwards, a flat recessed face, the stamped design raised in it
    t = np.clip((edge - rad) / 26, 0, 1); dome = np.sin(t * math.pi / 2) ** 0.8 * 0.55
    FACE = 112
    rim = np.exp(-((rad - (FACE + 12)) / 9) ** 2) * 0.42
    face = (rad < FACE).astype(np.float32)
    h = dome + rim
    h = np.where(rad < FACE + 2, 0.38 + 0.02 * np.cos(rad / FACE * math.pi), h)
    # stamped design: a fine ring of dots, an inner ring, and the monogram, all raised a little
    design = Image.new('L', (N, N), 0); d = ImageDraw.Draw(design)
    d.ellipse([c - 98, c - 98, c + 98, c + 98], outline=255, width=3)
    for k in range(48):
        a = k / 48 * 2 * math.pi; d.ellipse([c + math.cos(a) * 88 - 2.2, c + math.sin(a) * 88 - 2.2, c + math.cos(a) * 88 + 2.2, c + math.sin(a) * 88 + 2.2], fill=255)
    f = ImageFont.truetype(os.path.join(S, 'fonts/pinyon.ttf'), 132)
    bb = d.textbbox((0, 0), mono, font=f); d.text((c - (bb[0] + bb[2]) / 2, c - (bb[1] + bb[3]) / 2 - 4), mono, font=f, fill=255)
    design = design.filter(ImageFilter.GaussianBlur(1.6))
    h = h + np.asarray(design, np.float32) / 255 * 0.16 * face
    # wax texture: tiny ripples and a few bubbles
    tex = np.asarray(Image.effect_noise((N, N), 40).filter(ImageFilter.GaussianBlur(1.4)), np.float32) / 255 - 0.5
    h = h + tex * 0.025
    for _ in range(14):
        bx, by, br = r.uniform(-150, 150), r.uniform(-150, 150), r.uniform(1.5, 3.8)
        h -= 0.05 * np.exp(-((dx - bx) ** 2 + (dy - by) ** 2) / (br * br))
    h = h * inside
    h = np.asarray(Image.fromarray((np.clip(h, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.1)), np.float32) / 255
    # light it: diffuse + a sharp, glossy highlight (wax is shiny), darker in the hollows
    gy, gx = np.gradient(h * 60)
    nx, ny, nz = -gx, -gy, np.ones_like(h); m = np.sqrt(nx * nx + ny * ny + nz * nz); nx, ny, nz = nx / m, ny / m, nz / m
    L = np.array([-0.5, -0.62, 0.6]); L /= np.linalg.norm(L)
    V = np.array([0, 0, 1.0]); Hh = (L + V) / np.linalg.norm(L + V)
    diff = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    spec = np.clip(nx * Hh[0] + ny * Hh[1] + nz * Hh[2], 0, 1) ** 70 * 0.85 + np.clip(nx * Hh[0] + ny * Hh[1] + nz * Hh[2], 0, 1) ** 12 * 0.12
    ao = np.asarray(Image.fromarray((h * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(10)), np.float32) / 255
    occl = np.clip(1 - (ao - h) * 2.2, 0.55, 1)
    base = np.array(color, np.float32) / 255
    thin = np.clip(h / 0.25, 0, 1)                      # thin wax at the spill edge looks lighter and a bit translucent
    col = base[None, None, :] * (0.28 + 0.92 * diff[..., None]) * occl[..., None]
    col = col * (0.75 + 0.25 * thin[..., None]) + (1 - thin[..., None]) * 0.12 * base[None, None, :]
    col = col + spec[..., None] * np.array([1.0, 0.96, 0.92])
    alpha = np.clip((edge - rad) * 1.4, 0, 1)
    rgba = np.dstack([np.clip(col, 0, 1) * 255, alpha * 255]).astype(np.uint8)
    im = Image.fromarray(rgba, 'RGBA')
    # a soft contact shadow under the wax
    sh = Image.fromarray((alpha * 120).astype(np.uint8)).filter(ImageFilter.GaussianBlur(9))
    canvas = Image.new('RGBA', (N, N), (0, 0, 0, 0)); shadow = Image.new('RGBA', (N, N), (40, 20, 10, 0)); shadow.putalpha(sh)
    canvas.alpha_composite(shadow, (6, 9)); canvas.alpha_composite(im)
    canvas.resize((240, 240), Image.LANCZOS).save(os.path.join(OUT, 'seal-%s.png' % key))

seal('jp', (150, 28, 34), 'J', 3)
seal('fr', (38, 52, 104), 'F', 7)
seal('my', (156, 112, 34), 'M', 11)
seal('sg', (170, 30, 38), 'S', 5)
print('done')
