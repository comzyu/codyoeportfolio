# Poto — Handover back from the Fable session

> 15 Nov 2026. Covers Parts A, B and C of `docs/POTO_FABLE_HANDOVER.md`. **No app code, no Expo project.**
> Rule 0a note: Cody said "execute straight", so the four H2 questions were answered with the suggested defaults (monoline stickers in ink + accent; synthesised sounds; generated test images; decisions + targeted code sketches).

## 1. What was made, and where

Everything is under `poto/` on branch `claude/eager-einstein-62kdg5` of `comzyu/codyoeportfolio` (a separate folder; the portfolio site is untouched).

| Part | What | Where |
|---|---|---|
| A | **v0.1 technical design** (the blueprint for the app build) | `docs/v0.1-technical-design.md` |
| C | **Motion, sound and haptics spec** (what gets built) | `docs/motion-spec.md` |
| C | 10 phone prototypes + index, each with a tweak panel, mute and "Copy values" | `prototypes/index.html`, `01-developing.html` … `10-stickers.html` |
| C | Shared prototype code: tokens, chrome, sound engine, tweak panel, embedded sounds / art / sample photos | `prototypes/shared/` |
| B1 | Design tokens → `theme.ts` and `tokens.css` | `assets-src/theme/tokens.json`, `build_theme.py` → `assets/theme/theme.ts` |
| B2 | 3 looks: `.cube`, `.lut.png`, preset `.json`; shared grain tile; preview grid; golden images | `assets-src/looks/generate_looks.py` → `assets/looks/` |
| B2 | Draft looks Ink + Peach (not shipped) | `assets-src/looks/drafts/` |
| B3 | Papers: Cream, Kraft at 2× and 3× | `assets-src/papers/generate_papers.py` → `assets/papers/` |
| B4 | Inks + edge-bleed parameters (Sepia, Red as drafts) | `assets/inks/inks.json` |
| B5 | Stamp + postmark with text slots (`#slot-city`, `#slot-date`, `#slot-year`, `#slot-look`) | `assets-src/stickers/build_art.py` → `assets/stamps/` |
| B6 | 12 stickers | same script → `assets/stickers/` |
| B7 | Typewriter illustration with layers `keys`, `typebars`, `carriage`, `bell`, `paper` | `prototypes/shared/typewriter.js` → `assets/typewriter/typewriter.svg` |
| B8 | 12 synthesised sounds | `assets-src/sounds/generate_sounds.py` → `assets/sounds/` |
| B9 | Licences and font candidates | `assets-src/LICENSES.md` |
| B10 | Review page (looks, papers, inks, stamp, postmark, stickers, typewriter, sound buttons; light/dark) | `assets-src/review/index.html` |
| — | The original handover + full plan, kept with the work | `docs/POTO_FABLE_HANDOVER.md` |

To view on a phone: the published artifact link from the session, or serve the folder (`cd poto && python3 -m http.server`) and open `/prototypes/`.

## 2. Part A in five lines

1. **Pipeline = LENS → FILM → PRINT.** Native decode + resize (nitro-image) → one Skia shader pass (`film.sksl`: flash, LUT, vignette, leak, grain) on an sRGB offscreen surface → date stamp → JPEG. Everything in sRGB-encoded values; the Python renderer in `generate_looks.py` is the reference the shader must match.
2. **The LUT is a 1089×33 strip** (33 slices; blue picks the slice, red across, green down), sampled with GPU bilinear + a manual blend between two blue slices, coordinates in highp `float`. Grain is a texture and randomness is a seeded integer PRNG, so iOS and Android match; a golden-image test proves it and is the first thing built.
3. **The UI never waits for the camera or the pipeline.** The exposure is committed and the developing card starts rising on the press itself; processing hides inside the card's blank hold; a late image stretches the hold, never the reveal.
4. **SQLite is the source of truth** with a photo state machine (`captured → processing → developing → kept / tossed`), atomic file writes and a launch-time recovery table: a tossed shot keeps its exposure, a failed capture is refunded, a photo is never lost.
5. **Minimal app shell:** Expo Router stack, the developing card as an overlay (not a route), no state library, lenses as plug-in shader files behind a hidden dev menu, config as local defaults that a remote table can later override.

### Open questions for Cody (full table with reasons: tech design §9)

| # | Question | Recommended |
|---|---|---|
| Q1 | Cap originals at 12 MP even on 48–200 MP phones? | Yes |
| Q2 | Phone held sideways: landscape photo, or always the 3:4 portrait frame? | Always 3:4 portrait |
| Q3 | Camera fails to capture: refund the exposure? | Refund |
| Q4 | App killed mid-reveal: replay, or find it in the diary as kept? | Kept, no replay |
| Q5 | Slow phone not ready when the hold ends: stretch the wait or shorten the reveal? | Stretch |
| Q6 | Light leaks: random and rare per look, or never? | Random, rare, subtle |
| Q7 | Approve new dependency `expo-media-library` for "Save to photos"? | Approve |
| Q8 | Date-stamp format `'26 11 15`? | Yes |
| Q9 | Double exposure: show a 35 % ghost of shot 1 while framing shot 2? | Yes |
| Q10 | Android: sounds follow media volume + an in-app Sounds toggle? | Yes |
| Q11 | Pause the camera while the developing card is up? | Yes |
| Q12 | Allow swiping the card away to keep shooting during a reveal (photo is kept)? | Allow — needs a feel-check |

Two more that came up in Part C: **developing variant** A / B / C (recommended A), and **camera layout** A Drawer / B Edge (recommended A).

## 3. Verified vs unverified

**Verified on 15 Nov 2026** (npm registry latest tags + the published package type definitions, read directly):
`expo` 58.0.25 · `react-native` 0.88.1 · `react-native-vision-camera` 5.2.4 (a full Nitro rewrite — `usePhotoOutput`, `capturePhoto(settings, callbacks)`, `Photo.toImageAsync / saveToFileAsync`, `CameraDevice` zoom / flash fields, `Camera` props were all read from source) · `@shopify/react-native-skia` 2.14.0 (`Surface.MakeOffscreen(w, h, { colorSpace })`, `Image.MakeImage`, `encodeToBytes`, runtime-effect child shaders) · `react-native-reanimated` 4.7.1 · `react-native-worklets` 0.13.1 · `react-native-gesture-handler` 3.5.0 (version only) · `expo-sqlite` 58.0.17 · `expo-file-system` 58.0.13 · `expo-audio` 58.0.12 · `expo-haptics` 58.0.8 · `expo-router` 58.0.31 (version only).

**Unverified** — the API exists, its *behaviour* is untested; each is a spike in tech design §7:
U1 Skia offscreen rendering on a background worklet runtime · U2 `toImageAsync` orientation/mirroring on both platforms · U3 the zoom-value convention on virtual multi-camera devices · U4 `expo-audio` latency on Android · U5 automatic Display-P3 → sRGB conversion in Skia · U6 the Expo SDK 58 compatibility matrix (use `npx expo install`).

**Not verifiable in this session:** anything on a real device. The shader was never run — only its Python twin. Sounds were checked by waveform and spectrum, **not by ear**. Prototypes were tested in headless Chromium at phone sizes (light, dark, reduce-motion, 360×640), not on a physical iPhone or Android; the phone keyboard behaviour of prototype 08 in particular needs a real device.

## 4. How to regenerate

Needs Python 3 with `numpy` and `Pillow`, and Node. Run from `poto/`:

```
python3 assets-src/theme/build_theme.py          # tokens.json -> assets/theme/theme.ts + prototypes/shared/tokens.css
python3 assets-src/looks/generate_looks.py       # looks, grain, previews, golden images, prototype sample photos (~40 s; --fast skips golden)
python3 assets-src/papers/generate_papers.py     # papers
python3 assets-src/stickers/build_art.py         # stickers, stamp, postmark + prototypes/shared/art.js
python3 assets-src/sounds/generate_sounds.py     # sounds + prototypes/shared/sounds.js
node    assets-src/typewriter/export.js          # typewriter.svg
```

- **Tune a look:** edit the numbers at the top of `generate_looks.py`, or drop an edited `<slug>.cube` (33 points) into `assets-src/looks/` — it replaces the generated LUT.
- **Use real photos:** put the 6 reference photos in `assets-src/looks/reference/` and re-run; they replace the test scenes in the grid.
- `assets/inks/inks.json` is hand-written (no script).

## 5. What is a draft or placeholder

Everything is a first draft. Specifically:

- **Looks** — tuned by eye on synthetic scenes only. They will shift on real photos. Sunday's blues go a little grey; Flashbulb's hot-spot is deliberately strong.
- **Test scenes** — flat synthetic drawings, not photographs. They show colour behaviour, not skin or texture.
- **Sounds** — synthetic placeholders, unheard. Expect to replace shutter, advance and typewriter keys with real recordings.
- **Date stamp in previews** — drawn seven-segment bars, not the DSEG7 font.
- **Papers, stickers, stamp, postmark, typewriter** — draft art. Two stickers (ticket, wish) use live text and need outlining once fonts are approved.
- **Colours** — the plan's placeholder palette, plus a few tokens I added and marked `(added)` in `tokens.json` (card, scrim, photo paper, blank film, date stamp, dark-mode `inkSoft`/`accent`). Canister label colours in prototypes 03/04 are placeholders too.
- **Fonts** — none bundled. Licence *type* confirmed upstream; every row is still "to verify".
- **v0.2 prototypes (07–10)** — design previews only. They don't change v0.1 scope.
- **Prototype 08** shows only the message area of the card (not the whole portrait back) so the machine fits above the keyboard.

## 6. Prototypes: tuned vs awaiting

**None have been tuned by Cody yet.** All ten are at my defaults and marked "awaiting Cody" in `docs/motion-spec.md` §11.

To tune: open a prototype → **Tweak** → adjust → **Copy values** → paste the line (it looks like `poto/developing {"develop_seconds":8,...}`) back to Claude, who writes it into `docs/motion-spec.md` and marks it approved.

## 7. Cody's review checklist

Prototypes (`prototypes/index.html`):
- [ ] **01** Does the developing reveal feel like magic? Which variant wins: A Chemistry, B Bloom, C Tray? Is 8 s right?
- [ ] **02** Does the shutter feel mechanical? Curtain or blink? Fire on release or on press?
- [ ] **03** Does loading a roll feel intentional, not like a settings screen? Is the canister moment too long?
- [ ] **04** Is "Roll complete" small and satisfying?
- [ ] **05** Is the camera screen quiet enough? Layout A (Drawer) or B (Edge)? Text chips instead of icons — yes?
- [ ] **06** Does the diary feel like prints on a table? Too loose, or not enough?
- [ ] **07** Does the flip feel like card?
- [ ] **08** Is the typewriter charming? Does it keep up with your thumbs?
- [ ] **09** Does the calligraphy feel written? Letter-by-letter or word-by-word?
- [ ] **10** Is peel-and-place satisfying? Is the crookedness right?

Assets (`assets-src/review/index.html`):
- [ ] Do the 3 looks feel distinct and "film"? (Best judged after adding your reference photos.)
- [ ] Are the papers right?
- [ ] Is the sticker style right?
- [ ] Do the sounds feel tactile? Which need real recordings first?
- [ ] Stamp and postmark?

Decisions: the 12 questions in §2, plus the H6 questions in the original handover (ask at the start of the app build).

## Suggestions for later (not built)

- Screen-brightness boost for the front screen-flash (`expo-brightness`).
- "Unload roll early" for someone who regrets a look.
- Re-render kept photos when a look is re-tuned (`pipeline_version` is already in the schema).
- A low-latency audio library if the Android latency spike fails.
- Display-P3 output; Android ringer-mode awareness.
- Outline the text in the ticket and wish stickers; draw the date stamp with DSEG7 in previews once approved.
- Remove the pulled-forward v0.2 prototypes' sample copy once real postcards exist.

## Next session

Starts the v0.1 **app** build on the Mac / other device: ask the H6 questions, then follow `docs/v0.1-technical-design.md` §8 (spikes S1–S5 first).
