#!/usr/bin/env python3
"""Poto stickers, stamp and postmark — original drawings, generated as SVG.

    python3 assets-src/stickers/build_art.py

Writes:
  assets/stickers/<name>.svg     12 starter stickers
  assets/stamps/stamp-sun.svg    the launch stamp
  assets/stamps/postmark.svg     circular postmark with text slots: #slot-date, #slot-city, #slot-look
  prototypes/shared/art.js       all of the above embedded for the web prototypes / review page

STYLE (change it here and every sticker follows)
  - one stroke weight, round ends, drawn in `ink`
  - a flat colour shape printed slightly off-register underneath (like a cheap two-colour print)
  - every line is nudged by a seeded wobble so nothing is ruler-straight; re-running gives the same drawing
  - three colours only: ink, accent, butter (+ navy on the airmail stripe, + paper as the "white")
"""
import math
import random
from pathlib import Path

INK, ACCENT, BUTTER, PAPER, NAVY = "#1B1B1B", "#C2412D", "#E9B949", "#FFFDF8", "#1F2A44"
STROKE = 3.2          # the one stroke weight (in a 100-unit box)
WOBBLE = 0.9          # how far points drift, in units
OFFSET = (2.2, 2.2)   # how far the colour sits off-register

ROOT = Path(__file__).resolve().parents[2]


def wob(points, rng, amount=WOBBLE):
    return [(x + rng.uniform(-amount, amount), y + rng.uniform(-amount, amount)) for x, y in points]


def smooth(points, closed=False):
    """Catmull-Rom spline through the points, as an SVG path."""
    p = list(points)
    n = len(p)
    get = (lambda i: p[i % n]) if closed else (lambda i: p[max(0, min(n - 1, i))])
    d = f"M{p[0][0]:.1f} {p[0][1]:.1f}"
    for i in range(n if closed else n - 1):
        p0, p1, p2, p3 = get(i - 1), get(i), get(i + 1), get(i + 2)
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f"C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}"
    return d + ("Z" if closed else "")


def poly(points, closed=True):
    return "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in points) + ("Z" if closed else "")


def line(d, color=INK, width=STROKE):
    return f'<path d="{d}" fill="none" stroke="{color}" stroke-width="{width}" stroke-linecap="round" stroke-linejoin="round"/>'


def fill(d, color, dx=OFFSET[0], dy=OFFSET[1], opacity=1):
    op = f' opacity="{opacity}"' if opacity != 1 else ""
    return f'<path d="{d}" fill="{color}" transform="translate({dx} {dy})"{op}/>'


def circle(cx, cy, r, rng, n=10, squash=1.0):
    pts = [(cx + math.cos(a) * r, cy + math.sin(a) * r * squash) for a in [i * 2 * math.pi / n for i in range(n)]]
    return smooth(wob(pts, rng, WOBBLE * 0.7), closed=True)


def svg(body, w=100, h=100, label=""):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w * 2}" height="{h * 2}" role="img" '
            f'aria-label="{label}">{body}</svg>\n')


def heart(r):
    pts = [(50, 86), (22, 58), (14, 36), (26, 20), (42, 22), (50, 36), (58, 22), (74, 20), (86, 36), (78, 58)]
    d = smooth(wob(pts, r), True)
    return svg(fill(d, ACCENT) + line(d), label="heart")


def star(r):
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rad = 40 if i % 2 == 0 else 17
        pts.append((50 + math.cos(a) * rad, 52 + math.sin(a) * rad))
    d = poly(wob(pts, r, 1.4))
    return svg(fill(d, BUTTER) + line(d), label="star")


def sun(r):
    body = circle(50, 50, 19, r)
    rays = ""
    for i in range(9):
        a = i * 2 * math.pi / 9 + 0.2
        r1, r2 = 28 + r.uniform(-1, 1), 40 + r.uniform(-3, 3)
        rays += line(poly(wob([(50 + math.cos(a) * r1, 50 + math.sin(a) * r1), (50 + math.cos(a) * r2, 50 + math.sin(a) * r2)], r, 0.6), False))
    return svg(fill(body, BUTTER) + line(body) + rays, label="sun")


def arrow(r):
    shaft = smooth(wob([(10, 80), (30, 58), (52, 56), (72, 38), (88, 20)], r))
    head = poly(wob([(62, 18), (89, 19), (86, 46)], r, 0.6), False)
    return svg(line(shaft, ACCENT) + line(head, ACCENT), label="arrow")


def squiggle(r):
    pts = [(8 + i * 12, 20 + (8 if i % 2 else -8) + r.uniform(-1.5, 1.5)) for i in range(13)]
    return svg(line(smooth(pts), ACCENT), 160, 40, "squiggle underline")


def tape(r):
    top = [(10 + i * 14, 8 + (0 if i % 2 else 0) + r.uniform(-0.6, 0.6)) for i in range(11)]
    bot = [(150 - i * 14, 34 + r.uniform(-0.6, 0.6)) for i in range(11)]
    left = [(10, 34), (6, 30), (10, 26), (6, 21), (10, 17), (6, 12)]
    right = [(150, 8), (154, 12), (150, 17), (154, 21), (150, 26), (154, 30)]
    d = poly(top + right + bot + left)
    sheen = line(poly([(22, 14), (60, 13)], False), PAPER, 1.6)
    return svg(f'<path d="{d}" fill="{BUTTER}" opacity="0.82"/>' + sheen, 160, 42, "tape strip")


def ticket(r):
    # rounded stub with a bite out of each side, a tear line and a number
    d = (f"M14 22 L146 22 L146 36 A9 9 0 0 0 146 54 L146 68 L14 68 L14 54 A9 9 0 0 0 14 36 Z")
    tear = '<path d="M104 26 L104 64" stroke="%s" stroke-width="2" stroke-dasharray="1 5.5" stroke-linecap="round" fill="none"/>' % INK
    txt = (f'<text x="62" y="49" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-size="9.5" '
           f'letter-spacing="1.2" fill="{INK}">ADMIT ONE</text>'
           f'<text x="126" y="50" text-anchor="middle" font-family="IBM Plex Mono, ui-monospace, monospace" font-size="11" fill="{ACCENT}">27</text>')
    return svg(fill(d, PAPER, 0, 0) + fill(d, BUTTER, 2.2, 2.2, 0.0) + line(d) + tear + txt, 160, 90, "ticket stub")


def plane(r):
    p = wob([(10, 46), (90, 14), (62, 86), (48, 58)], r, 0.8)
    body = poly(p)
    fold = poly([p[3], p[1]], False)
    wing = poly([p[3], (46, 78), (56, 68)], False)
    trail = '<path d="M8 74 Q20 66 30 72" stroke="%s" stroke-width="2.4" stroke-dasharray="1 6" stroke-linecap="round" fill="none"/>' % ACCENT
    return svg(fill(body, PAPER) + line(body) + line(fold) + line(wing) + trail, label="paper plane")


def flower(r):
    petals = ""
    under = ""
    for i in range(5):
        a = -math.pi / 2 + i * 2 * math.pi / 5
        d = circle(50 + math.cos(a) * 21, 46 + math.sin(a) * 21, 14, r, 8)
        under += fill(d, ACCENT)
        petals += line(d)
    c = circle(50, 46, 9, r, 8)
    stem = line(smooth(wob([(50, 70), (48, 82), (52, 94)], r)))
    return svg(under + petals + fill(c, BUTTER, 0, 0) + line(c) + stem, label="flower")


def camera(r):
    body = poly(wob([(14, 34), (36, 34), (42, 24), (62, 24), (68, 34), (86, 34), (86, 78), (14, 78)], r, 0.8))
    lens = circle(50, 56, 15, r)
    inner = circle(50, 56, 7, r, 8)
    button = f'<circle cx="76" cy="44" r="3.2" fill="{ACCENT}"/>'
    strap = line(poly(wob([(20, 34), (20, 28), (28, 28)], r, 0.4), False), INK, 2.4)
    return svg(fill(body, BUTTER) + line(body) + fill(lens, PAPER, 0, 0) + line(lens) + line(inner, INK, 2.4) + button + strap, label="tiny camera")


def wish(r):
    box = poly(wob([(8, 12), (172, 8), (174, 50), (10, 54)], r, 0.8))
    txt = (f'<text x="91" y="38" text-anchor="middle" font-family="\'La Belle Aurore\', \'Homemade Apple\', cursive" font-size="19" '
           f'fill="{INK}" transform="rotate(-1.4 91 32)">wish you were here</text>')
    return svg(fill(box, ACCENT, 2.6, 2.6) + fill(box, PAPER, 0, 0) + line(box) + txt, 182, 62, "wish you were here label")


def airmail(r):
    stripes = ""
    for i in range(-2, 14):
        col = ACCENT if i % 2 == 0 else NAVY
        x = i * 14
        stripes += f'<path d="M{x} 30 L{x + 12} 6 L{x + 21} 6 L{x + 9} 30 Z" fill="{col}"/>'
    clip = '<clipPath id="am"><path d="M6 8 L174 6 L175 28 L7 30 Z"/></clipPath>'
    edge = line(poly(wob([(6, 8), (174, 6), (175, 28), (7, 30)], r, 0.5)), INK, 2.2)
    return svg(f'<defs>{clip}</defs><path d="M6 8 L174 6 L175 28 L7 30 Z" fill="{PAPER}"/><g clip-path="url(#am)">{stripes}</g>{edge}', 182, 36, "airmail stripe")


STICKERS = {"heart": heart, "star": star, "sun": sun, "arrow": arrow, "squiggle": squiggle, "tape": tape, "ticket": ticket,
            "plane": plane, "flower": flower, "camera": camera, "wish": wish, "airmail": airmail}


def stamp():
    """Perforated stamp, 100 x 124: a sun coming up over water, 'POTO', and 27 (the shots on a roll)."""
    r = random.Random(27)
    w, h, pr, step = 100, 124, 3.1, 9.2
    holes = ""
    nx, ny = round(w / step), round(h / step)
    for i in range(nx + 1):
        for y in (0, h):
            holes += f'<circle cx="{i * w / nx:.1f}" cy="{y}" r="{pr}"/>'
    for j in range(1, ny):
        for x in (0, w):
            holes += f'<circle cx="{x}" cy="{j * h / ny:.1f}" r="{pr}"/>'
    mask = f'<mask id="perf"><rect width="{w}" height="{h}" fill="#fff"/><g fill="#000">{holes}</g></mask>'
    sunp = circle(50, 66, 17, r)
    rays = "".join(
        line(poly([(50 + math.cos(a) * 24, 66 + math.sin(a) * 24), (50 + math.cos(a) * 31, 66 + math.sin(a) * 31)], False), ACCENT, 2.4)
        for a in [math.pi + 0.25 + i * (math.pi - 0.5) / 6 for i in range(7)])
    waves = "".join(line(smooth(wob([(16 + k * 4, y) for k in range(18)], r, 1.1)), ACCENT, 2.2) for y in (74, 82, 90))
    body = (f'<g mask="url(#perf)"><rect width="{w}" height="{h}" fill="{PAPER}"/></g>'
            f'<rect x="9" y="9" width="82" height="106" fill="#F6E7CF"/>'
            f'<rect x="9" y="9" width="82" height="106" fill="none" stroke="{ACCENT}" stroke-width="1.6"/>'
            f'<g>{fill(sunp, BUTTER, 0, 0)}{line(sunp, ACCENT, 2.4)}{rays}</g>'
            f'<rect x="10" y="70" width="80" height="26" fill="#F6E7CF"/>{waves}'
            f'<text x="16" y="27" font-family="IBM Plex Mono, ui-monospace, monospace" font-size="11" font-weight="500" letter-spacing="2" fill="{ACCENT}">POTO</text>'
            f'<text x="84" y="109" text-anchor="end" font-family="IBM Plex Mono, ui-monospace, monospace" font-size="15" font-weight="500" fill="{ACCENT}">27</text>')
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w * 2}" height="{h * 2}" role="img" aria-label="Poto stamp: sunrise">'
            f'<defs>{mask}</defs>{body}</svg>\n')


def postmark():
    """Circular postmark, 200 x 120. Text slots have ids so the app can fill them: slot-city, slot-date, slot-look."""
    f = 'font-family="IBM Plex Mono, ui-monospace, monospace" fill="{c}"'.format(c=INK)
    r = random.Random(5)
    lines = "".join(f'<path d="{smooth([(112 + k * 9, y + (2.6 if k % 2 else -2.6)) for k in range(10)])}" fill="none" stroke="{INK}" '
                    f'stroke-width="1.8" stroke-linecap="round"/>' for y in (38, 52, 66, 80))
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120" width="400" height="240" role="img" aria-label="Postmark">'
            f'<defs><path id="pm-top" d="M24 60 A36 36 0 0 1 96 60"/><path id="pm-bot" d="M19 60 A41 41 0 0 0 101 60"/></defs>'
            f'<g opacity="0.78">'
            f'<circle cx="60" cy="60" r="50" fill="none" stroke="{INK}" stroke-width="2"/>'
            f'<circle cx="60" cy="60" r="30" fill="none" stroke="{INK}" stroke-width="1.2"/>'
            f'<text font-size="9.5" letter-spacing="2" {f}><textPath href="#pm-top" startOffset="50%" text-anchor="middle" id="slot-city">SINGAPORE</textPath></text>'
            f'<text font-size="9.5" letter-spacing="2" {f}><textPath href="#pm-bot" startOffset="50%" text-anchor="middle" id="slot-look">SUNDAY</textPath></text>'
            f'<text id="slot-date" x="60" y="57" text-anchor="middle" font-size="9" letter-spacing="0.5" {f}>15 NOV</text>'
            f'<text x="60" y="69" text-anchor="middle" font-size="9" letter-spacing="0.5" {f} id="slot-year">2026</text>'
            f'{lines}</g></svg>\n')


if __name__ == "__main__":
    out_s, out_t = ROOT / "assets/stickers", ROOT / "assets/stamps"
    out_s.mkdir(parents=True, exist_ok=True)
    out_t.mkdir(parents=True, exist_ok=True)
    art = {}
    for i, (name, fn) in enumerate(STICKERS.items()):
        s = fn(random.Random(100 + i))
        (out_s / f"{name}.svg").write_text(s)
        art[name] = s.strip()
    st, pm = stamp(), postmark()
    (out_t / "stamp-sun.svg").write_text(st)
    (out_t / "postmark.svg").write_text(pm)
    import json
    js = ("// GENERATED by assets-src/stickers/build_art.py. Do not edit by hand.\n"
          f"window.POTO_ART = {json.dumps({'stickers': art, 'stamp': st.strip(), 'postmark': pm.strip()})};\n")
    (ROOT / "prototypes/shared/art.js").write_text(js)
    print(f"wrote {len(art)} stickers, stamp, postmark, prototypes/shared/art.js")
