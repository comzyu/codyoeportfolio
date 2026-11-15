#!/usr/bin/env python3
"""Poto postcard papers: Cream and Kraft. Procedural (noise + fibres), tileable.

    python3 assets-src/papers/generate_papers.py

Writes assets/papers/<name>@2x.jpg (780x1040) and <name>@3x.jpg (1170x1560). Base size is 390x520 pt.
JPEG, not PNG: paper is all noise, so PNG would be ~5 MB per file for no visible gain.
Every edge wraps (the noise is filtered in the frequency domain and fibres are drawn on a torus),
so the texture can also be tiled. Numbers at the top are the ones to tweak.
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

PAPERS = {
    #          base colour      mottle  tooth   fibres  fibre colour (darker / lighter than the paper)   fibre strength
    "cream": dict(color=(243, 235, 221), mottle=0.012, tooth=0.016, fibres=260, fibre_dark=(196, 182, 160), fibre_light=(252, 248, 240), strength=0.35),
    "kraft": dict(color=(193, 158, 116), mottle=0.020, tooth=0.030, fibres=900, fibre_dark=(128, 96, 62), fibre_light=(222, 196, 160), strength=0.55),
}
BASE = (390, 520)
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets/papers"


def wrapped_noise(w, h, rng, softness):
    """Gaussian noise low-passed in the frequency domain: wraps at every edge. softness in px."""
    n = rng.standard_normal((h, w))
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    out = np.fft.ifft2(np.fft.fft2(n) * np.exp(-(fx ** 2 + fy ** 2) * (softness ** 2) * 20)).real
    return out / out.std()


def fibres(w, h, scale, count, rng):
    """Short curved hairs. Returns (dark mask, light mask) as float arrays 0..1. Drawn 9 times so they wrap."""
    masks = []
    for _ in range(2):
        im = Image.new("L", (w, h), 0)
        d = ImageDraw.Draw(im)
        for _ in range(count // 2):
            x, y = rng.uniform(0, w), rng.uniform(0, h)
            ang, ln, bend = rng.uniform(0, np.pi), rng.uniform(6, 26) * scale, rng.uniform(-0.6, 0.6)
            pts = [(x + np.cos(ang + bend * t) * ln * t, y + np.sin(ang + bend * t) * ln * t) for t in np.linspace(0, 1, 6)]
            v = int(rng.uniform(90, 255))
            for ox in (-w, 0, w):
                for oy in (-h, 0, h):
                    d.line([(px + ox, py + oy) for px, py in pts], fill=v, width=max(1, round(0.5 * scale)))
        masks.append(np.asarray(im.filter(ImageFilter.GaussianBlur(0.35 * scale)), float) / 255)
    return masks


def make(name, P, scale):
    w, h = BASE[0] * scale, BASE[1] * scale
    rng = np.random.default_rng({"cream": 11, "kraft": 23}[name])
    base = np.array(P["color"], float) / 255
    mottle = wrapped_noise(w, h, rng, 14 * scale) * P["mottle"]          # slow cloudy unevenness
    tooth = wrapped_noise(w, h, rng, 0.45 * scale) * P["tooth"]          # fine surface grain
    img = base[None, None, :] * (1 + mottle + tooth)[..., None]
    dark, light = fibres(w, h, scale, P["fibres"], rng)
    for mask, col in ((dark, P["fibre_dark"]), (light, P["fibre_light"])):
        a = (mask * P["strength"])[..., None]
        img = img * (1 - a) + (np.array(col, float) / 255) * a
    return Image.fromarray(np.uint8(np.clip(img, 0, 1) * 255), "RGB")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for name, P in PAPERS.items():
        for scale in (2, 3):
            im = make(name, P, scale)
            path = OUT / f"{name}@{scale}x.jpg"
            im.save(path, quality=88, optimize=True)
            print(f"  {path.relative_to(ROOT)}  {im.size[0]}x{im.size[1]}  {path.stat().st_size // 1024} KB")
