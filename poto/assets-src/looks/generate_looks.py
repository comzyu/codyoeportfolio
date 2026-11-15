#!/usr/bin/env python3
"""Poto film looks: LUTs, presets, grain tile, previews, golden images.

    python3 assets-src/looks/generate_looks.py            # everything
    python3 assets-src/looks/generate_looks.py --fast     # skip golden images

Needs numpy + Pillow only.

WHAT IT WRITES
  assets/looks/<slug>.cube          33x33x33 LUT (editable in Photoshop / Lightroom)
  assets/looks/<slug>.lut.png       the same LUT as a 2D texture for Skia (layout below)
  assets/looks/<slug>.json          the look preset
  assets/looks/grain.png            512x512 tileable grain tile (shared by all looks)
  assets/looks/previews/grid.jpg    every shipped look on every test image
  assets/looks/golden/              input.png + <slug>.expected.png (parity test, tech design 1.9)
  assets-src/looks/drafts/          Ink and Peach (not shipped) + their own grid
  assets-src/looks/test-images/     the generated neutral test images
  prototypes/shared/img/            small sample photos for the web prototypes
  prototypes/shared/develop-img.js  four of them embedded, for the developing prototype

CODY'S OWN FILES (both optional)
  assets-src/looks/<slug>.cube      drop an edited .cube here: it REPLACES the generated LUT for that look
  assets-src/looks/reference/*.jpg  drop reference photos here: they REPLACE the generated test images

LUT TEXTURE LAYOUT (must match docs/v0.1-technical-design.md 1.3 and film.sksl)
  1089 x 33 px, 8-bit RGB, sRGB-encoded, no colour profile, no alpha.
  33 slices of 33x33 side by side. For input (r, g, b), each an integer 0..32:
      x = b * 33 + r      blue picks the slice, red runs across it
      y = g               green runs down, row 0 is g = 0
  Pixel (x, y) holds the output colour for input (r/32, g/32, b/32).

No look is named after, or modelled on, a real film stock or camera brand.
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

# ----------------------------------------------------------------------------------------------
# LOOK PARAMETERS — tweak here, re-run, look at assets/looks/previews/grid.jpg
# ----------------------------------------------------------------------------------------------
# Colour grade (baked into the LUT):
#   wb          per-channel gain in linear light (R, G, B). >1 on R and <1 on B = warmer.
#   exposure    stops. +0.2 = a little brighter.
#   contrast    -0.3 (flat) .. +0.4 (punchy). 0 = unchanged.
#   black/white where pure black / pure white end up (0..1). black 0.06 = lifted, matte shadows.
#   shoulder    0..1 how gently highlights roll off (1 = very soft).
#   saturation  1 = unchanged.
#   mute_reds   0..1 pulls saturation out of reds only.
#   shadow_tint / highlight_tint   colour added to the darks / the brights (R, G, B), small numbers.
#   mono        0..1 mix toward black-and-white (uses mono_mix as the channel weights).
# Print settings (stored in the preset JSON, applied by the film shader, not the LUT):
#   grain 0..1 | vignette 0..1 | flash 0..1 | light_leak chance + strength | date_stamp default
LOOKS = {
    "sunday": dict(
        name="Sunday",
        description="Warm and soft. For any old day.",
        wb=(1.06, 1.00, 0.92), exposure=0.08, contrast=-0.03, black=0.045, white=0.970,
        shoulder=0.70, saturation=1.04, mute_reds=0.0,
        shadow_tint=(0.012, 0.004, -0.014), highlight_tint=(0.030, 0.014, -0.030),
        grain=0.040, vignette=0.14, flash=0.0,
        light_leak=dict(chance=0.12, strength=0.55, color="#FF9A4D"), date_stamp=False,
    ),
    "harbour": dict(
        name="Harbour",
        description="Cool shadows, quiet reds. For going places.",
        wb=(0.955, 1.00, 1.045), exposure=0.0, contrast=0.10, black=0.035, white=0.975,
        shoulder=0.55, saturation=0.90, mute_reds=0.28,
        shadow_tint=(-0.034, 0.020, 0.016), highlight_tint=(0.012, 0.010, -0.008),
        grain=0.060, vignette=0.20, flash=0.0,
        light_leak=dict(chance=0.06, strength=0.40, color="#FFB070"), date_stamp=False,
    ),
    "flashbulb": dict(
        name="Flashbulb",
        description="Loud, bright, a little too much flash.",
        wb=(1.00, 1.00, 1.03), exposure=0.06, contrast=0.24, black=0.0, white=1.0,
        shoulder=0.45, saturation=1.08, mute_reds=0.0,
        shadow_tint=(-0.012, 0.000, 0.016), highlight_tint=(0.006, 0.004, 0.0),
        grain=0.030, vignette=0.34, flash=0.40,
        light_leak=dict(chance=0.0, strength=0.0, color="#FFFFFF"), date_stamp=True,
    ),
}
DRAFTS = {
    "ink": dict(
        name="Ink",
        description="Black and white with some bite.",
        wb=(1.0, 1.0, 1.0), exposure=0.05, contrast=0.22, black=0.030, white=0.985,
        shoulder=0.5, saturation=1.0, mute_reds=0.0, mono=1.0, mono_mix=(0.40, 0.48, 0.12),
        shadow_tint=(0.006, 0.003, -0.004), highlight_tint=(0.010, 0.006, -0.008),
        grain=0.075, vignette=0.22, flash=0.0,
        light_leak=dict(chance=0.0, strength=0.0, color="#FFFFFF"), date_stamp=False,
    ),
    "peach": dict(
        name="Peach",
        description="Pale, pastel, slightly sunburnt.",
        wb=(1.05, 0.99, 0.95), exposure=0.22, contrast=-0.16, black=0.105, white=0.975,
        shoulder=0.9, saturation=0.80, mute_reds=0.0,
        shadow_tint=(0.020, -0.004, 0.012), highlight_tint=(0.034, 0.008, -0.010),
        grain=0.045, vignette=0.06, flash=0.0,
        light_leak=dict(chance=0.2, strength=0.5, color="#FFB199"), date_stamp=False,
    ),
}

N = 33                      # LUT size
GOLDEN_SEED = 20261115      # fixed seed for the golden images
PREVIEW_SEED = 7
W, H = 768, 1024            # test-image size (3:4)

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / "assets/looks"
DRAFT_OUT = HERE / "drafts"
TEST_DIR = HERE / "test-images"
REF_DIR = HERE / "reference"
PROTO_IMG = ROOT / "prototypes/shared/img"


# ----------------------------------------------------------------------------------------------
# Colour maths
# ----------------------------------------------------------------------------------------------
def srgb_to_lin(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def lin_to_srgb(x):
    x = np.clip(x, 0, None)
    return np.where(x <= 0.0031308, x * 12.92, 1.055 * x ** (1 / 2.4) - 0.055)


LUMA = np.array([0.299, 0.587, 0.114])


def grade(rgb, P):
    """sRGB-encoded float array (..., 3) in 0..1 -> graded, same shape. This is what the LUT bakes."""
    x = np.clip(rgb.astype(np.float64), 0, 1)
    # white balance + exposure in linear light, with a soft shoulder so highlights roll off
    lin = srgb_to_lin(x) * np.array(P["wb"]) * (2.0 ** P["exposure"])
    k = P["shoulder"]
    knee = 1.0 - 0.45 * k                       # where the roll-off starts (linear light)
    over = np.clip(lin - knee, 0, None)
    span = 1.0 - knee + 1e-9
    lin = np.where(lin > knee, knee + span * (1 - np.exp(-over / span)), lin) if k > 0 else np.clip(lin, 0, 1)
    x = lin_to_srgb(np.clip(lin, 0, 1))
    # contrast: S-curve around mid grey (blend toward smoothstep), or flatten when negative
    c = P["contrast"]
    if c >= 0:
        s = x * x * (3 - 2 * x)
        x = x + (s - x) * min(c * 2.2, 1.0)
        x = 0.5 + (x - 0.5) * (1 + 0.25 * c)
    else:
        x = 0.5 + (x - 0.5) * (1 + c)
    x = np.clip(x, 0, 1)
    # optional black & white
    m = P.get("mono", 0.0)
    if m > 0:
        g = (x * np.array(P.get("mono_mix", LUMA))).sum(-1, keepdims=True)
        x = x + (g - x) * m
    # saturation, then pull reds
    l = (x * LUMA).sum(-1, keepdims=True)
    x = l + (x - l) * P["saturation"]
    if P["mute_reds"] > 0:
        redness = np.clip(x[..., 0:1] - np.maximum(x[..., 1:2], x[..., 2:3]), 0, 1)
        l = (x * LUMA).sum(-1, keepdims=True)
        x = l + (x - l) * (1 - P["mute_reds"] * np.clip(redness * 3.0, 0, 1))
    # split toning
    l = np.clip((x * LUMA).sum(-1, keepdims=True), 0, 1)
    x = x + np.array(P["shadow_tint"]) * (1 - l) ** 2 * 4 + np.array(P["highlight_tint"]) * l ** 2 * 1.6
    # black / white points (the matte, "lifted" feel)
    x = P["black"] + np.clip(x, 0, 1) * (P["white"] - P["black"])
    return np.clip(x, 0, 1)


# ----------------------------------------------------------------------------------------------
# LUT in / out
# ----------------------------------------------------------------------------------------------
def make_lut(P):
    """Returns lut[b, g, r] = output rgb, float, shape (33, 33, 33, 3)."""
    v = np.linspace(0, 1, N)
    b, g, r = np.meshgrid(v, v, v, indexing="ij")
    return grade(np.stack([r, g, b], -1), P)


def write_cube(lut, path, title):
    lines = [f'TITLE "{title}"', "# Poto look. Original; not based on any film stock or camera.",
             f"LUT_3D_SIZE {N}", "DOMAIN_MIN 0.0 0.0 0.0", "DOMAIN_MAX 1.0 1.0 1.0", ""]
    flat = lut.reshape(-1, 3)                    # [b, g, r] order == red changes fastest, as .cube wants
    lines += [f"{p[0]:.6f} {p[1]:.6f} {p[2]:.6f}" for p in flat]
    path.write_text("\n".join(lines) + "\n")


def read_cube(path):
    size, rows = None, []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.upper().startswith("LUT_3D_SIZE"):
            size = int(line.split()[1])
            continue
        parts = line.split()
        if len(parts) == 3:
            try:
                rows.append([float(p) for p in parts])
            except ValueError:
                pass                             # TITLE / DOMAIN lines
    if size != N:
        sys.exit(f"{path.name}: LUT_3D_SIZE is {size}; Poto needs {N}. Re-export at 33 points.")
    if len(rows) != N ** 3:
        sys.exit(f"{path.name}: expected {N**3} rows, found {len(rows)}.")
    return np.clip(np.array(rows).reshape(N, N, N, 3), 0, 1)


def lut_to_png(lut, path):
    strip = np.zeros((N, N * N, 3))
    for b in range(N):
        strip[:, b * N:(b + 1) * N] = lut[b]     # lut[b] is [g, r] -> rows = g, cols = r
    Image.fromarray(np.round(strip * 255).astype(np.uint8), "RGB").save(path, optimize=True)


def apply_lut(img, lut):
    """Trilinear lookup. img float (h, w, 3) 0..1. Same maths as lut3d() in film.sksl."""
    p = np.clip(img, 0, 1) * (N - 1)
    i0 = np.floor(p).astype(int)
    i1 = np.minimum(i0 + 1, N - 1)
    f = p - i0
    r0, g0, b0 = i0[..., 0], i0[..., 1], i0[..., 2]
    r1, g1, b1 = i1[..., 0], i1[..., 1], i1[..., 2]
    fr, fg, fb = f[..., 0:1], f[..., 1:2], f[..., 2:3]

    def L(b, g, r):
        return lut[b, g, r]
    c00 = L(b0, g0, r0) * (1 - fr) + L(b0, g0, r1) * fr
    c01 = L(b0, g1, r0) * (1 - fr) + L(b0, g1, r1) * fr
    c10 = L(b1, g0, r0) * (1 - fr) + L(b1, g0, r1) * fr
    c11 = L(b1, g1, r0) * (1 - fr) + L(b1, g1, r1) * fr
    return (c00 * (1 - fg) + c01 * fg) * (1 - fb) + (c10 * (1 - fg) + c11 * fg) * fb


def quantised(lut):
    """The LUT as the app sees it: 8-bit, from the PNG."""
    return np.round(lut * 255) / 255


# ----------------------------------------------------------------------------------------------
# Seeded randomness — identical to src/pipeline/seed.ts (mulberry32)
# ----------------------------------------------------------------------------------------------
def mulberry32(seed):
    state = [seed & 0xFFFFFFFF]

    def rand():
        state[0] = (state[0] + 0x6D2B79F5) & 0xFFFFFFFF
        t = state[0]
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return rand


def seed_params(seed, preset):
    """Draw order is part of the spec (tech design 1.5). Always four groups, in this order."""
    rand = mulberry32(seed)
    grain_off = (int(rand() * 512), int(rand() * 512))
    has_leak = rand() < preset["lightLeak"]["chance"]
    side, along = int(rand() * 4), rand()
    leak_pos = [(along, 0.0), (1.0, along), (along, 1.0), (0.0, along)][side]
    leak_amt = preset["lightLeak"]["strength"] * (0.6 + 0.4 * rand()) if has_leak else 0.0
    return grain_off, leak_pos, leak_amt


# ----------------------------------------------------------------------------------------------
# Reference renderer — the numpy twin of film.sksl. If they disagree, the shader is wrong.
# ----------------------------------------------------------------------------------------------
def hex_rgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def make_grain_tile():
    """512x512 tileable grey noise with slightly clumpy structure. Mean 0.5."""
    rng = np.random.default_rng(1234)
    n = rng.standard_normal((512, 512))
    fy = np.fft.fftfreq(512)[:, None]
    fx = np.fft.fftfreq(512)[None, :]
    soft = np.fft.ifft2(np.fft.fft2(n) * np.exp(-(fx ** 2 + fy ** 2) * 55)).real   # wraps, so it tiles
    g = 0.55 * n / n.std() + 0.45 * soft / soft.std()
    g = g / g.std() * 0.17 + 0.5
    return np.clip(g, 0, 1)


def render_film(img, lut, preset, seed, date_stamp=None, force_leak=None):
    """img: float (h, w, 3) sRGB-encoded 0..1, already at output size (the LENS stage is done)."""
    h, w = img.shape[:2]
    grain_off, leak_pos, leak_amt = seed_params(seed, preset)
    if force_leak is not None:
        leak_amt = force_leak
    yy, xx = np.mgrid[0:h, 0:w]
    xy = np.stack([xx + 0.5, yy + 0.5], -1)                      # pixel centres, like SkSL
    size = np.array([w, h], float)
    p = (xy - 0.5 * size) / (0.5 * np.hypot(w, h))
    r2 = (p ** 2).sum(-1, keepdims=True)
    c = np.clip(img, 0, 1)
    c = np.clip(c * (1 + 0.6 * preset["flash"] * np.exp(-5 * r2)), 0, 1)       # LENS: flash hot-spot
    c = apply_lut(c, lut)                                                       # FILM
    t = np.clip((np.sqrt(r2) - 0.30) / (1.05 - 0.30), 0, 1)
    c = c * (1 - preset["vignette"] * t * t * (3 - 2 * t))                      # PRINT: vignette
    q = xy / size - np.array(leak_pos)
    leak = leak_amt * np.exp(-(q ** 2).sum(-1, keepdims=True) * 7)
    c = 1 - (1 - c) * (1 - hex_rgb(preset["lightLeak"]["color"]) * leak)        # PRINT: light leak
    gx = (np.floor(xy[..., 0] + grain_off[0]) % 512).astype(int)
    gy = (np.floor(xy[..., 1] + grain_off[1]) % 512).astype(int)
    g = GRAIN[gy, gx][..., None] - 0.5
    lum = (c * LUMA).sum(-1, keepdims=True)
    c = c + g * preset["grain"]["amount"] * 2 * (1 - 0.7 * np.abs(2 * lum - 1))  # PRINT: grain
    c = np.clip(c, 0, 1)
    if date_stamp:
        c = draw_date_stamp(c, date_stamp)
    return c


# Seven-segment digits drawn from scratch (no font file needed for previews).
SEGS = {"0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc", "5": "afgcd",
        "6": "afgedc", "7": "abc", "8": "abcdefg", "9": "abfgcd", " ": "", "'": "'"}


def draw_date_stamp(c, text):
    h, w = c.shape[:2]
    S = 4                                                   # supersample
    dh = w * 0.034 * S                                      # digit height
    dw, gap, t = dh * 0.52, dh * 0.24, dh * 0.13
    layer = Image.new("L", (w * S, h * S), 0)
    d = ImageDraw.Draw(layer)
    total = len(text) * dw + (len(text) - 1) * gap
    x = w * S - w * 0.05 * S - total
    y = h * S - w * 0.05 * S - dh
    for ch in text:
        if ch == "'":
            d.polygon([(x + dw * 0.45, y), (x + dw * 0.75, y), (x + dw * 0.5, y + dh * 0.22)], fill=255)
        else:
            m = t * 0.25
            seg = dict(a=(x + m, y, x + dw - m, y + t), g=(x + m, y + dh / 2 - t / 2, x + dw - m, y + dh / 2 + t / 2),
                       d=(x + m, y + dh - t, x + dw - m, y + dh), f=(x, y + m, x + t, y + dh / 2 - m),
                       b=(x + dw - t, y + m, x + dw, y + dh / 2 - m), e=(x, y + dh / 2 + m, x + t, y + dh - m),
                       c=(x + dw - t, y + dh / 2 + m, x + dw, y + dh - m))
            for s in SEGS[ch]:
                d.rounded_rectangle(seg[s], radius=t * 0.45, fill=255)
        x += dw + gap
    crisp = np.asarray(layer.resize((w, h), Image.LANCZOS), float)[..., None] / 255
    glow = np.asarray(layer.resize((w, h), Image.LANCZOS).filter(ImageFilter.GaussianBlur(w * 0.0035)), float)[..., None] / 255
    c = 1 - (1 - c) * (1 - hex_rgb("#FF5A00") * np.clip(glow * 1.6, 0, 1) * 0.7)     # glow: screen
    return c * (1 - crisp * 0.92) + hex_rgb("#FF8A1F") * crisp * 0.92               # digits: over


# ----------------------------------------------------------------------------------------------
# Neutral test images (used until Cody supplies 6 reference photos)
# ----------------------------------------------------------------------------------------------
def _np(img):
    return np.asarray(img.convert("RGB"), float) / 255


def _noise(strength=0.012, seed=0):
    return np.random.default_rng(seed).standard_normal((H, W, 1)) * strength


def _vgrad(stops):
    """Vertical gradient from [(pos 0..1, (r, g, b) 0..255), ...]."""
    ys = np.linspace(0, 1, H)
    pos = [s[0] for s in stops]
    out = np.stack([np.interp(ys, pos, [s[1][i] for s in stops]) for i in range(3)], -1) / 255
    return np.repeat(out[:, None, :], W, 1)


def scene_dusk():
    img = _vgrad([(0, (38, 62, 120)), (0.32, (120, 130, 170)), (0.52, (244, 170, 120)), (0.585, (255, 214, 160)),
                  (0.59, (70, 96, 128)), (1, (18, 34, 58))])
    yy, xx = np.mgrid[0:H, 0:W]
    sx, sy = W * 0.62, H * 0.545
    d = np.hypot(xx - sx, yy - sy)
    sun = np.exp(-(d / 26) ** 4)[..., None] * (yy < H * 0.588)[..., None]
    glow = np.exp(-d / 150)[..., None] * 0.55
    img = img + glow * np.array([1.0, 0.62, 0.3]) * (yy < H * 0.588)[..., None] + glow * 0.25 * np.array([1, .6, .3])
    img = img * (1 - sun) + np.array([1.0, 0.95, 0.82]) * sun
    # sun path on the water
    rng = np.random.default_rng(3)
    for i in range(160):
        y = int(H * 0.60 + (i / 160) ** 1.6 * H * 0.4)
        half = 6 + (y - H * 0.59) * 0.22
        x0 = int(sx + rng.normal(0, half * 0.6))
        wdt = int(rng.uniform(8, 20 + half * 0.5))
        img[y:y + 2, max(0, x0 - wdt):x0 + wdt] += np.array([0.55, 0.38, 0.2]) * rng.uniform(0.3, 1)
    # ripples
    img[int(H * 0.59):] *= (1 + 0.06 * np.sin(yy[int(H * 0.59):] ** 1.35 * 0.55))[..., None]
    pil = Image.fromarray(np.uint8(np.clip(img, 0, 1) * 255))
    d = ImageDraw.Draw(pil)
    d.polygon([(0, H * 0.59), (0, H * 0.50), (W * 0.10, H * 0.475), (W * 0.2, H * 0.515), (W * 0.33, H * 0.55),
               (W * 0.42, H * 0.59)], fill=(26, 34, 52))
    d.polygon([(W * 0.80, H * 0.622), (W * 0.93, H * 0.622), (W * 0.915, H * 0.634), (W * 0.815, H * 0.634)], fill=(16, 22, 36))
    d.line([(W * 0.865, H * 0.622), (W * 0.865, H * 0.582)], fill=(16, 22, 36), width=3)
    d.polygon([(W * 0.868, H * 0.585), (W * 0.868, H * 0.618), (W * 0.905, H * 0.618)], fill=(226, 214, 200))
    return np.clip(_np(pil.filter(ImageFilter.GaussianBlur(1.2))) + _noise(seed=1), 0, 1)


def scene_table():
    yy, xx = np.mgrid[0:H, 0:W]
    wood = np.array([176, 128, 84]) / 255 * (1 + 0.05 * np.sin(xx * 0.045 + np.sin(yy * 0.012) * 2.5))[..., None]
    wood = wood * (1 + 0.035 * np.sin(xx * 0.6 + yy * 0.02))[..., None]
    pil = Image.fromarray(np.uint8(np.clip(wood, 0, 1) * 255))
    sh = Image.new("L", (W, H), 0)
    ds = ImageDraw.Draw(sh)
    items = [(W * 0.50, H * 0.42, 250), (W * 0.74, H * 0.80, 96), (W * 0.2, H * 0.8, 70)]
    for cx, cy, r in items:
        ds.ellipse([cx - r + 16, cy - r + 22, cx + r + 16, cy + r + 22], fill=150)
    ds.rectangle([W * 0.06 + 10, H * 0.08 + 14, W * 0.30 + 10, H * 0.2 + 14], fill=110)
    sh = sh.filter(ImageFilter.GaussianBlur(16))
    pil = Image.composite(Image.new("RGB", (W, H), (70, 44, 26)), pil, sh)
    d = ImageDraw.Draw(pil)
    d.rectangle([W * 0.06, H * 0.08, W * 0.30, H * 0.2], fill=(222, 214, 198))                 # napkin
    cx, cy = W * 0.50, H * 0.42
    d.ellipse([cx - 250, cy - 250, cx + 250, cy + 250], fill=(240, 236, 226))                  # plate
    d.ellipse([cx - 196, cy - 196, cx + 196, cy + 196], fill=(230, 225, 213))
    d.ellipse([cx - 170, cy - 110, cx + 60, cy + 150], fill=(232, 198, 140))                   # rice / toast
    d.ellipse([cx - 60, cy - 150, cx + 150, cy + 20], fill=(250, 246, 232))                    # egg white
    d.ellipse([cx + 4, cy - 104, cx + 86, cy - 22], fill=(246, 178, 46))                       # yolk
    for i, (ox, oy) in enumerate([(70, 70), (118, 104), (64, 128), (128, 52)]):
        d.ellipse([cx + ox - 30, cy + oy - 30, cx + ox + 30, cy + oy + 30], fill=(206, 52, 40))  # tomatoes
    for ox, oy, rr in [(-120, 110, 44), (-64, 150, 36), (-150, 40, 34)]:
        d.ellipse([cx + ox - rr, cy + oy - rr * 0.7, cx + ox + rr, cy + oy + rr * 0.7], fill=(74, 138, 66))  # greens
    cx, cy = W * 0.74, H * 0.80
    d.ellipse([cx - 96, cy - 96, cx + 96, cy + 96], fill=(236, 232, 224))                      # cup
    d.ellipse([cx - 76, cy - 76, cx + 76, cy + 76], fill=(74, 44, 28))                         # coffee
    d.ellipse([cx - 40, cy - 52, cx + 10, cy - 20], fill=(120, 80, 54))
    cx, cy = W * 0.2, H * 0.8
    d.ellipse([cx - 70, cy - 70, cx + 70, cy + 70], fill=(238, 150, 44))                       # orange
    d.ellipse([cx - 8, cy - 14, cx + 8, cy + 2], fill=(96, 110, 50))
    img = _np(pil.filter(ImageFilter.GaussianBlur(1.6)))
    light = 0.72 + 0.5 * np.exp(-(((xx - W * 0.2) / (W * 0.9)) ** 2 + ((yy - H * 0.1) / (H * 0.8)) ** 2))
    return np.clip(img * light[..., None] + _noise(seed=2), 0, 1)


def scene_night():
    img = _vgrad([(0, (10, 14, 34)), (0.55, (30, 30, 62)), (0.72, (52, 40, 70)), (0.73, (16, 16, 26)), (1, (8, 8, 14))])
    pil = Image.fromarray(np.uint8(img * 255))
    d = ImageDraw.Draw(pil)
    rng = np.random.default_rng(5)
    x = 0
    while x < W:
        bw = int(rng.uniform(70, 150))
        top = int(H * rng.uniform(0.16, 0.46))
        d.rectangle([x, top, x + bw - 6, H * 0.73], fill=tuple(int(v) for v in rng.uniform(14, 34, 3)))
        for wy in range(top + 16, int(H * 0.69), 30):
            for wx in range(x + 12, x + bw - 24, 24):
                if rng.random() < 0.42:
                    col = [(250, 206, 120), (255, 232, 170), (150, 200, 230)][int(rng.integers(0, 3))]
                    d.rectangle([wx, wy, wx + 12, wy + 16], fill=col)
        x += bw
    d.rectangle([W * 0.12, H * 0.60, W * 0.38, H * 0.635], fill=(240, 52, 70))                 # red sign
    d.rectangle([W * 0.60, H * 0.56, W * 0.66, H * 0.70], fill=(40, 220, 210))                 # cyan sign
    d.ellipse([W * 0.83, H * 0.07, W * 0.83 + 54, H * 0.07 + 54], fill=(236, 232, 214))        # moon
    base = _np(pil)
    refl = base[int(H * 0.46):int(H * 0.73)][::-1]
    road = base[int(H * 0.73):].copy()
    n = min(len(refl), len(road))
    road[:n] = road[:n] * 0.5 + refl[:n] * 0.55 * np.linspace(1, 0.25, n)[:, None, None]
    base[int(H * 0.73):] = road
    pil = Image.fromarray(np.uint8(np.clip(base, 0, 1) * 255))
    bloom = _np(pil.filter(ImageFilter.GaussianBlur(14)))
    img = np.clip(_np(pil.filter(ImageFilter.GaussianBlur(1.0))) + bloom * 0.55, 0, 1)
    yy, xx = np.mgrid[0:H, 0:W]
    for cx, cy, r, col in [(W * .2, H * .86, 46, (1, .6, .3)), (W * .52, H * .9, 60, (.4, .9, .9)), (W * .8, H * .84, 38, (1, .3, .4))]:
        m = np.clip(1 - np.abs(np.hypot(xx - cx, yy - cy) - r * 0.2) / r, 0, 1)[..., None] * (np.hypot(xx - cx, yy - cy) < r)[..., None]
        img = 1 - (1 - img) * (1 - np.array(col) * m * 0.22)
    return np.clip(img + _noise(0.016, seed=3), 0, 1)


def scene_window():
    """A desk by a window with a plant and a mug: everyday, indoor, mixed light."""
    yy, xx = np.mgrid[0:H, 0:W]
    wall = np.array([214, 204, 188]) / 255 * (0.82 + 0.3 * np.exp(-((xx - W * 0.35) / (W * 0.7)) ** 2))[..., None]
    pil = Image.fromarray(np.uint8(np.clip(wall, 0, 1) * 255))
    d = ImageDraw.Draw(pil)
    d.rectangle([W * 0.10, H * 0.07, W * 0.62, H * 0.52], fill=(250, 248, 240))                # window frame
    sky = _vgrad([(0, (150, 196, 236)), (0.5, (214, 232, 244)), (1, (236, 240, 236))])
    win = Image.fromarray(np.uint8(sky * 255)).crop((0, 0, int(W * 0.48), int(H * 0.41)))
    pil.paste(win, (int(W * 0.12), int(H * 0.085)))
    d.rectangle([W * 0.355, H * 0.085, W * 0.365, H * 0.495], fill=(250, 248, 240))
    d.rectangle([W * 0.12, H * 0.285, W * 0.60, H * 0.293], fill=(250, 248, 240))
    d.ellipse([W * 0.14, H * 0.36, W * 0.34, H * 0.56], fill=(104, 150, 96))                   # tree outside
    d.rectangle([0, H * 0.66, W, H], fill=(150, 104, 70))                                      # desk
    d.rectangle([0, H * 0.66, W, H * 0.672], fill=(182, 136, 96))
    px, py = W * 0.76, H * 0.66
    d.polygon([(px - 62, py - 110), (px + 62, py - 110), (px + 48, py), (px - 48, py)], fill=(196, 104, 70))   # pot
    for ang, ln in [(-70, 190), (-100, 220), (-125, 170), (-50, 160), (-88, 150)]:
        a = np.radians(ang)
        ex, ey = px + np.cos(a) * ln, py - 110 + np.sin(a) * ln
        d.line([(px, py - 110), (ex, ey)], fill=(52, 96, 56), width=7)
        d.ellipse([ex - 44, ey - 24, ex + 44, ey + 24], fill=(60, 122, 66))
    mx, my = W * 0.30, H * 0.66
    d.rectangle([mx - 56, my - 104, mx + 56, my], fill=(226, 84, 60))                          # mug
    d.ellipse([mx + 40, my - 84, mx + 96, my - 28], outline=(226, 84, 60), width=14)
    d.rectangle([W * 0.42, H * 0.71, W * 0.70, H * 0.86], fill=(244, 240, 230))                # notebook
    d.line([(W * 0.45, H * 0.75), (W * 0.66, H * 0.75)], fill=(120, 130, 150), width=3)
    d.line([(W * 0.45, H * 0.78), (W * 0.62, H * 0.78)], fill=(120, 130, 150), width=3)
    d.ellipse([W * 0.08, H * 0.78, W * 0.22, H * 0.90], fill=(246, 208, 74))                   # lemon
    img = _np(pil.filter(ImageFilter.GaussianBlur(1.5)))
    beam = np.clip(1 - np.abs((xx - W * 0.25) - (yy - H * 0.66) * 0.9) / (W * 0.28), 0, 1) * (yy > H * 0.66)
    img = img * (0.86 + 0.34 * beam)[..., None]
    return np.clip(img + _noise(seed=4), 0, 1)


def chart_patches():
    img = np.full((H, W, 3), 0.5)
    pil = Image.fromarray(np.uint8(img * 255))
    d = ImageDraw.Draw(pil)
    for i in range(11):                                                         # grey steps
        v = int(i / 10 * 255)
        d.rectangle([W * i / 11, 0, W * (i + 1) / 11, H * 0.12], fill=(v, v, v))
    cols = [(115, 82, 68), (194, 150, 130), (98, 122, 157), (87, 108, 67), (133, 128, 177), (103, 189, 170),
            (214, 126, 44), (80, 91, 166), (193, 90, 99), (94, 60, 108), (157, 188, 64), (224, 163, 46),
            (56, 61, 150), (70, 148, 73), (175, 54, 60), (231, 199, 31), (187, 86, 149), (8, 133, 161)]
    for i, c in enumerate(cols):
        x, y = i % 6, i // 6
        d.rectangle([W * x / 6 + 8, H * (0.15 + y * 0.14) + 8, W * (x + 1) / 6 - 8, H * (0.15 + (y + 1) * 0.14) - 8], fill=c)
    skin = [(255, 224, 196), (241, 194, 160), (224, 172, 132), (198, 134, 96), (160, 102, 70), (118, 74, 50), (84, 52, 36), (58, 36, 26)]
    for i, c in enumerate(skin):
        d.rectangle([W * i / 8 + 6, H * 0.60, W * (i + 1) / 8 - 6, H * 0.76], fill=c)
    img = _np(pil)
    ramp = np.linspace(0, 1, W)[None, :, None]
    for i, ch in enumerate([(1, 0, 0), (0, 1, 0), (0, 0, 1), (1, 1, 1)]):       # smooth ramps
        y0 = int(H * (0.79 + i * 0.0525))
        img[y0:y0 + int(H * 0.045)] = ramp * np.array(ch)
    return img


def chart_gradient():
    yy, xx = np.mgrid[0:H, 0:W]
    hue, val = xx / W, 1 - yy / H
    h6 = hue * 6
    rgb = np.stack([np.clip(np.abs(h6 - 3) - 1, 0, 1), np.clip(2 - np.abs(h6 - 2), 0, 1), np.clip(2 - np.abs(h6 - 4), 0, 1)], -1)
    sat = np.clip(1.4 - np.abs(val - 0.5) * 2.4, 0, 1)[..., None]
    return np.clip((0.5 + (rgb - 0.5) * sat) * (val[..., None] * 1.6) ** 0.9, 0, 1)


TEST_IMAGES = {"dusk": scene_dusk, "table": scene_table, "window": scene_window, "night": scene_night,
               "patches": chart_patches, "gradient": chart_gradient}


def load_test_images():
    refs = sorted(p for p in REF_DIR.glob("*") if p.suffix.lower() in (".jpg", ".jpeg", ".png")) if REF_DIR.exists() else []
    if refs:
        print(f"using {len(refs)} reference photo(s) from {REF_DIR.relative_to(ROOT)}")
        out = {}
        for p in refs:
            im = Image.open(p).convert("RGB")
            w, h = im.size
            tw = min(w, h * 3 // 4)
            th = tw * 4 // 3
            im = im.crop(((w - tw) // 2, (h - th) // 2, (w + tw) // 2, (h + th) // 2)).resize((W, H), Image.LANCZOS)
            out[p.stem] = _np(im)
        return out
    TEST_DIR.mkdir(parents=True, exist_ok=True)
    out = {}
    for name, fn in TEST_IMAGES.items():
        out[name] = fn()
        save(out[name], TEST_DIR / f"{name}.png")
    return out


def save(arr, path, quality=90):
    path.parent.mkdir(parents=True, exist_ok=True)
    im = Image.fromarray(np.uint8(np.round(np.clip(arr, 0, 1) * 255)), "RGB")
    if path.suffix == ".png":
        im.save(path, optimize=True)
    else:
        im.save(path, quality=quality, optimize=True, progressive=True)


def build_look(slug, P, out_dir):
    out_dir.mkdir(parents=True, exist_ok=True)
    override = HERE / f"{slug}.cube"
    if override.exists():
        lut = read_cube(override)
        print(f"  {slug}: using Cody's {override.name}")
    else:
        lut = make_lut(P)
    write_cube(lut, out_dir / f"{slug}.cube", f"Poto {P['name']}")
    lut_to_png(lut, out_dir / f"{slug}.lut.png")
    preset = dict(
        slug=slug, name=P["name"], description=P["description"],
        lut=f"{slug}.lut.png", cube=f"{slug}.cube",
        grain=dict(amount=P["grain"], tile="grain.png"),
        lightLeak=P["light_leak"], vignette=P["vignette"], flash=P["flash"],
        dateStampDefault=P["date_stamp"], pipelineVersion=1,
    )
    (out_dir / f"{slug}.json").write_text(json.dumps(preset, indent=2) + "\n")
    return quantised(lut), preset


def grid(images, looks, path, title_h=0, scale=0.5):
    tw, th = int(W * scale), int(H * scale)
    pad = 10
    cols = 1 + len(looks)
    sheet = Image.new("RGB", (pad + cols * (tw + pad), pad + len(images) * (th + pad) + 26), (247, 244, 238))
    d = ImageDraw.Draw(sheet)
    for ci, label in enumerate(["ORIGINAL"] + [p["name"].upper() for _, p in looks.values()]):
        d.text((pad + ci * (tw + pad) + 2, 8), label, fill=(27, 27, 27))
    for ri, (iname, img) in enumerate(images.items()):
        tiles = [img] + [render_film(img, lut, preset, PREVIEW_SEED + ri,
                                     date_stamp="'26 11 15" if preset["dateStampDefault"] else None)
                         for lut, preset in looks.values()]
        for ci, t in enumerate(tiles):
            im = Image.fromarray(np.uint8(np.round(np.clip(t, 0, 1) * 255))).resize((tw, th), Image.LANCZOS)
            sheet.paste(im, (pad + ci * (tw + pad), 26 + pad + ri * (th + pad)))
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path, quality=88)


if __name__ == "__main__":
    fast = "--fast" in sys.argv
    GRAIN = make_grain_tile()
    OUT.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.uint8(np.round(GRAIN * 255)), "L").save(OUT / "grain.png", optimize=True)
    GRAIN = np.round(GRAIN * 255) / 255                    # use exactly what the PNG holds

    # self-check: an identity LUT must leave an image untouched (catches layout / interpolation bugs)
    v = np.linspace(0, 1, N)
    b, g, r = np.meshgrid(v, v, v, indexing="ij")
    ident = np.stack([r, g, b], -1)
    probe = np.random.default_rng(0).random((64, 64, 3))
    assert np.abs(apply_lut(probe, ident) - probe).max() < 1e-9, "identity LUT check failed"

    print("looks:")
    shipped = {s: build_look(s, P, OUT) for s, P in LOOKS.items()}
    drafts = {s: build_look(s, P, DRAFT_OUT) for s, P in DRAFTS.items()}
    images = load_test_images()
    grid(images, shipped, OUT / "previews/grid.jpg")
    grid(images, drafts, DRAFT_OUT / "grid.jpg")

    # sample photos for the prototypes (small files)
    for iname in ("dusk", "table", "window", "night"):
        if iname not in images:
            continue
        small = lambda a: np.asarray(Image.fromarray(np.uint8(np.clip(a, 0, 1) * 255)).resize((600, 800), Image.LANCZOS), float) / 255
        save(small(images[iname]), PROTO_IMG / f"{iname}-raw.jpg", 80)
        for slug, (lut, preset) in shipped.items():
            stamp = "'26 11 15" if preset["dateStampDefault"] else None
            save(small(render_film(images[iname], lut, preset, PREVIEW_SEED, date_stamp=stamp)), PROTO_IMG / f"{iname}-{slug}.jpg", 82)

    # the developing prototype reads pixels, which browsers block for files opened from disk,
    # so its photos are embedded as data URIs
    import base64, io
    rows = []
    for iname in ("window", "dusk", "table", "night"):
        if iname not in images:
            continue
        lut, preset = shipped["sunday"]
        arr = render_film(images[iname], lut, preset, PREVIEW_SEED)
        buf = io.BytesIO()
        Image.fromarray(np.uint8(np.clip(arr, 0, 1) * 255)).resize((300, 400), Image.LANCZOS).save(buf, "JPEG", quality=78)
        rows.append(f'  "{iname}": "data:image/jpeg;base64,{base64.b64encode(buf.getvalue()).decode()}",\n')
    (PROTO_IMG.parent / "develop-img.js").write_text(
        "// GENERATED by assets-src/looks/generate_looks.py. Sunday look, 300x400.\nwindow.POTO_DEVELOP_IMG = {\n" + "".join(rows) + "};\n")

    if not fast:
        # golden images: fixed input + fixed seed -> expected pixels (tech design 1.9). Leak forced on.
        gold = OUT / "golden"
        top = np.concatenate([images.get("patches", chart_patches()), images.get("gradient", chart_gradient())], 1)
        bot = np.concatenate([images.get("table", scene_table()), images.get("night", scene_night())], 1)
        big = Image.fromarray(np.uint8(np.round(np.concatenate([top, bot], 0) * 255)))
        inp = np.asarray(big.resize((W, H), Image.LANCZOS), float) / 255       # 768 x 1024: small files, same maths
        save(inp, gold / "input.png")
        for slug, (lut, preset) in shipped.items():
            save(render_film(inp, lut, preset, GOLDEN_SEED, force_leak=preset["lightLeak"]["strength"] or 0.4),
                 gold / f"{slug}.expected.png")
        (gold / "README.md").write_text(
            "# Golden images\n\nMade by `assets-src/looks/generate_looks.py`.\n\n"
            f"- `input.png` — 768x1024 fixed input (sRGB).\n- `<slug>.expected.png` — reference render, seed {GOLDEN_SEED}, "
            "date stamp off, light leak forced on (leakAmt = the look's strength, or 0.4 if the look has none).\n"
            "- Pass: per-channel max abs diff <= 3 on >= 99.9% of pixels, mean abs diff <= 0.6.\n"
            "- The Display-P3 input variant is made on-device in the app's golden screen (Pillow cannot tag P3 without an ICC file).\n")
    print("done ->", OUT.relative_to(ROOT))
