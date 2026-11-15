# Golden images

Made by `assets-src/looks/generate_looks.py`.

- `input.png` — 768x1024 fixed input (sRGB).
- `<slug>.expected.png` — reference render, seed 20261115, date stamp off, light leak forced on (leakAmt = the look's strength, or 0.4 if the look has none).
- Pass: per-channel max abs diff <= 3 on >= 99.9% of pixels, mean abs diff <= 0.6.
- The Display-P3 input variant is made on-device in the app's golden screen (Pillow cannot tag P3 without an ICC file).
