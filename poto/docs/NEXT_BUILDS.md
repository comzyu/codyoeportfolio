# Poto: next builds

Written 16 Nov 2026 at the end of round two. Agreed so far: gallery white, dark camera, real-object postcards (Cody: "postcard has no issues for now").

## Notes to keep
- **Watermark**: the small mark on the photo front becomes the app's domain, the way Retro uses "retro.app". Placeholder "poto" for now; Cody will pick the domain (e.g. "poto.app").
- **Sound**: still none. Needs real recordings (Cody records on his phone, or sends files with licences).
- **Back of the card is minimal** (Cody, 16 Nov): typed message + handwritten address only. No stamp or postmark by default. A postmark appears only when a card is actually mailed (v0.4, as proof it travelled); stamps become decorations, like stickers. Code keeps both behind `stamp: true`.
- **Handwriting**: v1 = one shared script font plus a choice of ink colours. Next = "sign with your finger": a signature captured as vector strokes (a few KB, no real storage cost) that can be placed on any card. Later, maybe Plus = a personal handwriting font from a filled-in template (heavier: ~70 glyphs, a font build step, ~50 to 200 KB per user).
- **Platen: Paper & Ink** (App Store id6809529696), typewriter reference: no machine on screen; paper, ink and sound carry the feeling. Ink styles Fresh / Seasoned / Worn / Clean, embossed letter mark, corrections crossed out or erased, haptics Soft/Medium/Strong, bell Soft/Normal. Free with limits, one-time "Studio" unlock + small themed packs, no subscription. Use for build 1.
- **Photo finish: matte** (Cody, 16 Nov). The picture itself is always clean and true-colour: no paper texture, greying or reflection on the photo. Texture lives in the border.
- **Diary**: the pile is replaced by a sideways catalogue + film strip. The month view is for a later pass.
- **Share formats**: Story 9:16 (1080x1920, card kept out of the top 250 px and bottom 340 px) and Post 4:5 (1080x1350); front, back or both; description + watermark always visible. Watermark text is a placeholder ("shot on poto · poto.app").
- Cody's reference board: see docs/REFERENCES.md.
- Prototypes live in `prototypes-v2/`. Round one (`prototypes/`, `docs/motion-spec.md` visuals) is superseded.

## Build order (each one is one session)

| # | Build | What it proves | Size |
|---|---|---|---|
| 1 | ✅ **Writing on the card** (done 16 Nov: Write mode, live typewriter strikes with dents and paper-following ink, wrap at 26 columns, 6 lines / 150 chars, capsule marker, bell 5 from the end, keystroke jolt. Not yet: pen mode for the address, crossed-out corrections, sounds) | Live typing on the 3D back: typewriter mode (letters strike into the paper as you type, carriage + bell) and pen mode (writes itself on). Ink/paper code already exists in `lib/paper.js`; this makes it interactive. | M |
| 2 | ✅ (first pass, 16 Nov) **The whole loop, joined up**: camera Keep → newest print on top of the diary pile → tap → 3D postcard of that shot (same zoom and exposure) → write → stickers. Not yet: the print physically flying from camera into the diary, kept prints in the month view, saving what you write. | One flow: camera → develop → Keep → print drops onto the diary pile → tap it → it becomes the 3D postcard → flip → write → sticker. Turns three demos into one app feel. | M |
| 3 | **Load a roll + roll complete, new style** | Choosing a look as picking up a real film box (3D or CSS object), locking it in, and the 27th-shot ending. Last two v0.1 screens not yet in the white/dark style. | M |
| 4 | **Sound pass** | Real recordings for shutter, film advance, card flip, card land, sticker peel/pat, paper slide, typewriter. Wire to the hooks already in place. Develop sound quiet or none. | S (once files exist) |
| 5 | **Diary rethink** | Cody isn't sold on the pile or the folders. Try 2 to 3 alternatives side by side: a contact sheet per roll, a film strip per day, a calendar with prints on it. Keep the frosted folder look as one option. | M |
| 6 | **Look previews on real photos** | Run the three looks (Sunday, Harbour, Flashbulb) on Cody's own six reference photos inside the camera's print, so the look is part of the develop. | S |
| 7 | **Hand-off to the app build** | Freeze the approved feel into an updated motion spec + design tokens, then start v0.1 in Expo per `docs/v0.1-technical-design.md` (spikes S1 to S5 first). Needs the Mac with Xcode/Android SDK. | L |

Recommended order: ~~1~~ → 2 → 4 → 3 → 5 → 6 → 7. Writing and the joined-up loop are what make it feel like a product; sound is cheap once recordings exist.

## Open decisions for Cody
- The watermark domain.
- Develop time: now 4 s with tap-to-skip. Keep, or make skip a setting?
- Diary direction (build 5).
- Fonts: still placeholders (Special Elite, La Belle Aurore, IBM Plex Mono, Inter).


## Build 3 (done 16 Nov 2026): **Rolls and the month**

The two v0.1 pieces that are still round-one style, plus the calendar Cody parked, all built around board quirks 1–3.

1. **Load a roll = pick a canister off a shelf** (#20, #0). The three looks stand as film canisters on a white shelf, labels in the look's colours. Swipe along; the one in front lifts and turns to show its label and a sample print. Tap: it drops into the camera with a click and the counter reads 0 / 27. Reuses the gallery's spine-stack physics.
2. **Roll complete = the roll comes out as a contact strip** (#0, film strip in the diary). The 27th frame advances, the roll rewinds, and the whole roll slides out as a strip of 27 tiny frames you can scrub. It's filed into the diary as a folder with its canister clipped on (frosted folder, quirk 3).
3. **The month as a photo calendar** (#4, #15). Each day shows the best kept print of that day, edge to edge; empty days stay plain. Big lowercase month name, small mono weekday labels, ring binding across the top (#15). Tap a day: its prints fan out like #8. Flip the page to change month (paper page-turn).
4. **Monthly recap share** (#4 "july recap"). The month calendar exported as a 9:16 / 4:5 image using the share renderer from build 2, with a cut-out-label month name (#2).

Not in this build: sound (needs recordings), sending to friends (v0.4).
Open questions for Cody: canister label design per look; whether the month opens on today or on the latest roll.

## Notes from Cody, 16 Nov (round after the share fix)
- **Feel, everywhere:** very premium, scrapbooky with real objects. When a surface isn't a scrapbook object, it's liquid glass: translucent, with fine grain. (Grain is now on every `.glass` surface.)
- **Profile = a desk** (board #3, "Repository of Remnants"): your prints, postcards, stamps and stickers lie on a desk and you arrange them freely, tidy or scrapbook-messy. Build this as the profile page.
- **Stamps cut from your own photo** (board #9): pick a photo, a perforated stamp frame cuts a piece of it out, and that becomes a stamp you can stick on postcards. This is how users make stamps.
- Done this round: the photo disc (board #5) replaced the film strip and spins one frame at a time, synced with the stack; the month is a hero photo over a photo grid (board #15); no wall shadow behind the postcard; stickers cast a shadow while lifted; share backdrop is black and white with grain.

## Build 3, as built
- `rolls.html`: canisters (all CSS, label turns as it comes to the front) on a white ledge, native snap scroll. Load flies the canister into the camera back with a click. Swapping mid-roll files the part-used roll. Finish roll rewinds, then the roll comes out as a contact strip of 27 frames that develop one by one; File it puts it in a frosted folder. State in localStorage `poto.roll` / `poto.rolls`; the camera's film tab and frame counter follow it.
- Five looks for now: Sunday, Harbour, Flashbulb, Silver, Lido (label colours and CSS-filter samples are stand-ins).
- Month recap: `PotoShare.month` in lib/share.js, from the diary's Share the month. Cut-out letters reshuffle with "Cut new letters".
- Still open: canister label design per look (Cody), page-turn between months, tap a day to fan its prints (#8).

## Next build: ask Cody for reference images first
Candidates: the profile desk (#3), stamps cut from your own photo (#9).

## Round after build 3 (Cody, 16 Nov)
- Lag: blend modes and live backdrop blurs inside scrolling lists were the main cost. Glass grain, the camera-back leatherette and folder frost are now baked tiles (lib/texture.js); the disc is one canvas that only rotates; canisters are canvases (label redrawn at an offset to turn).
- Texture: the paper maker from the postcard now textures the disc, calendar pages, canister labels and folder boards; film strip and frames have baked grain.
- Calendar flips like a wall calendar (Aug–Nov 2026): the days page swings up over the rings and its back is next month's photo. Arrows or a sideways swipe.
- Shares fill the frame (only the top bar and reply box kept clear). Month share: no cut-out letters, small "nov." like the app, days on frosted glass, backdrop = another photo from that month, black and white and frosted.
- Next build: profile desk (#3) + stamps cut from your own photo (#9); references are on the Pinterest board.
