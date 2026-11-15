# Poto prototypes, round two

Rebuilt from Cody's reference picks (16 Nov 2026): **gallery white**, **dark camera**, real objects.
Supersedes the look and motion of `../prototypes/` and the placeholder art in `../assets/`. The technical design (`../docs/v0.1-technical-design.md`) still stands; `../docs/motion-spec.md` is now out of date for anything visual.

| File | What |
|---|---|
| `postcard.html` | The postcard as a 3D object (three.js r160 from cdnjs). Drag to turn, tap to flip, peel/lift/press stickers. |
| `camera.html` | Dark camera, liquid-glass controls, print that develops and tilts. CSS + canvas. |
| `home.html` | Diary in gallery white: print pile, month, rolls as frosted folders. CSS. |
| `lib/paper.js` | Draws every paper/ink/stamp/sticker texture at load: colour, roughness and height (-> normal map). |
| `lib/postcard3d.js` | The scene, lighting, card, sticker peel shader, holographic foil, interaction. |
| `lib/ui.css` | Tokens and the liquid-glass recipe. |
| `img/` | Placeholder photographs + `CREDITS.md`. |

Run: `python3 -m http.server` in this folder, open `/index.html`. Add `?lite` to `postcard.html` for a lighter render.

Round 2 fixes (16 Nov, Cody's feedback): matte thin card with rounded soft edges; paper tooth and ink that follows it; yaw-only turning with limited tilt; stickers back-only, flush, contact shadow follows the peel, carried under the finger; pile handles rapid taps; exposure (tap + slide) on the camera, baked into the print.

Round 3 (16 Nov): stickers stack (newest on top, peel top-first), develop 4 s with tap-to-skip, one folder open at a time. Watermark should become the app domain (see ../docs/NEXT_BUILDS.md).

Not done yet: sound (hooks exist: `onFlip`, `onLand`, `onPeelStart`, `onLift`, `onPress`), typewriter and calligraphy as live input on the 3D card, load-a-roll and roll-complete in the new style, Cody's own sticker artwork (any transparent image can replace `PotoPaper.sticker`).
Picks this was built from: Y3, L1, L9, R1, R4, R5, R7, R8, T1, P1, P2, P3, P5, D1, D3, D5, C2, C4, O1, O2, O5, J4, S2, M3 · W1 · dark camera.
