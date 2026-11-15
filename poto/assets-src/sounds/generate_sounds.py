#!/usr/bin/env python3
"""Poto placeholder sounds — all synthesised here, nothing downloaded or sampled.

    python3 assets-src/sounds/generate_sounds.py

Writes:
  assets/sounds/<name>.wav          44.1 kHz, mono, 16-bit, normalised
  prototypes/shared/sounds.js       the same sounds at 22.05 kHz, embedded, for the web prototypes

Cody can replace any WAV with his own recording: keep the file name, keep it short.
Each recipe is a few lines; the numbers at the top of each function are the ones to tweak.
"""
import base64
import io
import wave
from pathlib import Path

import numpy as np

SR = 44100
ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "assets/sounds"
rng = np.random.default_rng(27)


def t(dur):
    return np.arange(int(SR * dur)) / SR


def noise(dur):
    return rng.standard_normal(int(SR * dur))


def band(x, lo, hi, soft=0.25):
    """Band-pass in the frequency domain with soft edges (no scipy needed)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    up = 1 / (1 + np.exp(-(f - lo) / (lo * soft + 1)))
    down = 1 / (1 + np.exp((f - hi) / (hi * soft + 1)))
    return np.fft.irfft(X * up * down, len(x))


def decay(dur, tau, attack=0.0005):
    x = t(dur)
    return np.minimum(x / attack, 1) * np.exp(-x / tau)


def click(dur=0.03, lo=1800, hi=9000, tau=0.004):
    return band(noise(dur), lo, hi) * decay(dur, tau)


def thock(freq, dur=0.08, tau=0.018, bend=0.25):
    x = t(dur)
    f = freq * (1 + bend * np.exp(-x / 0.006))                 # pitch drops fast, like something struck
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * decay(dur, tau)


def place(total, parts):
    """Mix [(start_seconds, samples, gain), ...] into one buffer."""
    out = np.zeros(int(SR * total))
    for start, s, gain in parts:
        i = int(start * SR)
        n = min(len(s), len(out) - i)
        out[i:i + n] += s[:n] * gain
    return out


def fade(x, ms=4):
    n = int(SR * ms / 1000)
    x = x.copy()
    x[:n] *= np.linspace(0, 1, n)
    x[-n:] *= np.linspace(1, 0, n)
    return x


# ---- recipes ---------------------------------------------------------------------------------
def shutter():
    """Leaf shutter: open click, 38 ms later a duller close click, a low body thump, a hint of spring."""
    gap = 0.038
    ring = np.sin(2 * np.pi * 3400 * t(0.06)) * decay(0.06, 0.012)
    return place(0.16, [
        (0.000, click(0.03, 2200, 11000, 0.0035), 1.0),
        (0.000, thock(170, 0.07, 0.014), 0.8),
        (0.002, ring, 0.10),
        (gap, click(0.035, 1300, 7000, 0.006), 0.75),
        (gap, thock(120, 0.09, 0.022), 0.55),
    ])


def advance():
    """Thumb-wheel film advance: ratchet clicks that speed up then settle, over gear whir, ending in a stop."""
    n, total = 11, 0.62
    u = np.linspace(0, 1, n)
    times = 0.02 + 0.46 * (u ** 0.8)                            # slightly front-loaded
    parts = [(tm + rng.uniform(-0.004, 0.004), click(0.02, 2600 + rng.uniform(-300, 300), 9000, 0.0028),
              0.55 + 0.25 * rng.random()) for tm in times]
    whir = band(noise(0.5), 500, 2600) * np.hanning(int(SR * 0.5)) * 0.10
    parts += [(0.02, whir, 1.0), (0.52, thock(150, 0.08, 0.02), 0.9), (0.52, click(0.03, 1200, 6000, 0.006), 0.6)]
    return place(total, parts)


def shimmer():
    """Developing: 2 s of very quiet airy fizz that loops cleanly. Meant to be barely there."""
    dur = 2.0
    x = t(dur)
    air = band(noise(dur), 3500, 9000) * (0.6 + 0.4 * np.sin(2 * np.pi * 1.0 * x) * np.sin(2 * np.pi * 0.5 * x + 1))
    tones = sum(np.sin(2 * np.pi * f * x + p) * (0.5 + 0.5 * np.sin(2 * np.pi * r * x))
                for f, p, r in [(2637, 0, 0.5), (3520, 1, 1.0), (4186, 2, 1.5)])
    return air * 0.8 + tones * 0.05


def whoosh():
    """Postcard flip: a breath of paper moving through air. Rises, peaks at the edge-on moment, falls."""
    dur = 0.42
    n = noise(dur)
    env = np.hanning(int(SR * dur)) ** 1.6
    return (band(n, 300, 1500) * 0.9 + band(n, 1500, 5200) * 0.5 * np.linspace(0.2, 1, len(n))) * env


def pat():
    """Sticker pressed down with a fingertip: soft, low, short."""
    return place(0.12, [(0, thock(95, 0.11, 0.022, 0.5), 1.0), (0, band(noise(0.04), 200, 1600) * decay(0.04, 0.008), 0.5)])


def key(pitch=1.0, bright=1.0):
    """Typewriter key: typebar hits paper + platen (sharp), then the key bottoming out (dull)."""
    return place(0.10, [
        (0.000, click(0.02, 2400 * bright, 12000, 0.0022), 1.0),
        (0.000, thock(310 * pitch, 0.05, 0.010), 0.75),
        (0.001, np.sin(2 * np.pi * 5200 * pitch * t(0.03)) * decay(0.03, 0.005), 0.08),
        (0.016, thock(180 * pitch, 0.06, 0.014), 0.30),
    ])


def space():
    """Space bar: wider, lower, woodier. No typebar strike."""
    return place(0.12, [(0, thock(140, 0.10, 0.022, 0.4), 1.0), (0, click(0.03, 700, 3800, 0.007), 0.55),
                        (0.03, click(0.02, 1500, 5000, 0.004), 0.2)])


def carriage_return():
    """Carriage return: lever clack, the carriage zipping back over its rack, a firm stop."""
    n = 22
    times = 0.05 + 0.30 * np.linspace(0, 1, n) ** 1.25
    parts = [(tm, click(0.012, 3000, 10000, 0.0016), 0.30) for tm in times]
    slide = band(noise(0.36), 900, 3600) * np.hanning(int(SR * 0.36)) * 0.16
    parts += [(0.0, click(0.03, 1500, 8000, 0.005), 0.8), (0.0, thock(220, 0.06, 0.012), 0.5), (0.04, slide, 1.0),
              (0.39, thock(125, 0.10, 0.024), 1.0), (0.39, click(0.03, 1000, 6000, 0.007), 0.7)]
    return place(0.52, parts)


def bell():
    """End-of-line bell: one small struck bell. Inharmonic partials, the high ones die first."""
    dur = 1.1
    x = t(dur)
    f0 = 2250
    s = sum(a * np.sin(2 * np.pi * f0 * r * x) * np.exp(-x / tau)
            for r, a, tau in [(1.0, 1.0, 0.30), (2.76, 0.45, 0.14), (5.40, 0.22, 0.07), (8.93, 0.10, 0.035)])
    return s * np.minimum(x / 0.0008, 1) + place(dur, [(0, click(0.01, 3000, 12000, 0.0015), 0.4)])


def nib():
    """Calligraphy nib on paper: dry scratch in uneven strokes, as the pen speeds up and slows."""
    dur = 0.55
    x = t(dur)
    strokes = np.clip(np.sin(2 * np.pi * 5.5 * x + 0.6) * 0.7 + np.sin(2 * np.pi * 13 * x) * 0.3, 0, 1) ** 0.7
    flutter = 0.7 + 0.3 * band(noise(dur), 20, 120) / 0.05
    return band(noise(dur), 1800, 7500) * strokes * np.clip(flutter, 0.2, 1.4)


# name -> (recipe, peak level 0..1). Quiet sounds are quiet on purpose.
SOUNDS = {
    "shutter": (shutter, 0.89),
    "advance": (advance, 0.80),
    "shimmer": (shimmer, 0.16),
    "whoosh": (whoosh, 0.50),
    "pat": (pat, 0.70),
    "key1": (lambda: key(1.00, 1.00), 0.80),
    "key2": (lambda: key(0.93, 0.90), 0.80),
    "key3": (lambda: key(1.08, 1.10), 0.80),
    "space": (space, 0.75),
    "return": (carriage_return, 0.80),
    "bell": (bell, 0.45),
    "nib": (nib, 0.30),
}


def wav_bytes(x, sr):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes((np.clip(x, -1, 1) * 32767).astype("<i2").tobytes())
    return buf.getvalue()


def half_rate(x):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[f > 10000] = 0                                           # anti-alias before dropping samples
    return np.fft.irfft(X, len(x))[::2]


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    embedded = {}
    for name, (fn, level) in SOUNDS.items():
        x = fn()
        if name == "shimmer":                                  # loop: crossfade the tail into the head
            n = int(SR * 0.25)
            ramp = np.linspace(0, 1, n)
            x[:n] = x[:n] * ramp + x[-n:] * (1 - ramp)
            x = x[:-n]
        else:
            x = fade(x, 2)
        x = x / np.abs(x).max() * level
        (OUT / f"{name}.wav").write_bytes(wav_bytes(x, SR))
        embedded[name] = "data:audio/wav;base64," + base64.b64encode(wav_bytes(half_rate(x), SR // 2)).decode()
        print(f"  {name:8s} {len(x) / SR * 1000:5.0f} ms  peak {level:.2f}")
    js = "// GENERATED by assets-src/sounds/generate_sounds.py. Do not edit by hand.\nwindow.POTO_SOUNDS = {\n"
    js += "".join(f'  "{k}": "{v}",\n' for k, v in embedded.items()) + "};\n"
    (ROOT / "prototypes/shared/sounds.js").write_text(js)
    print("wrote", OUT.relative_to(ROOT), "and prototypes/shared/sounds.js")
