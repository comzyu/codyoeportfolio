# Poto: next builds

Written 16 Nov 2026 at the end of round two. Agreed so far: gallery white, dark camera, real-object postcards (Cody: "postcard has no issues for now").

## Notes to keep
- **Watermark**: the small mark on the photo front becomes the app's domain, the way Retro uses "retro.app". Placeholder "poto" for now; Cody will pick the domain (e.g. "poto.app").
- **Sound**: still none. Needs real recordings (Cody records on his phone, or sends files with licences).
- Prototypes live in `prototypes-v2/`. Round one (`prototypes/`, `docs/motion-spec.md` visuals) is superseded.

## Build order (each one is one session)

| # | Build | What it proves | Size |
|---|---|---|---|
| 1 | **Writing on the card** | Live typing on the 3D back: typewriter mode (letters strike into the paper as you type, carriage + bell) and pen mode (writes itself on). Ink/paper code already exists in `lib/paper.js`; this makes it interactive. | M |
| 2 | **The whole loop, joined up** | One flow: camera → develop → Keep → print drops onto the diary pile → tap it → it becomes the 3D postcard → flip → write → sticker. Turns three demos into one app feel. | M |
| 3 | **Load a roll + roll complete, new style** | Choosing a look as picking up a real film box (3D or CSS object), locking it in, and the 27th-shot ending. Last two v0.1 screens not yet in the white/dark style. | M |
| 4 | **Sound pass** | Real recordings for shutter, film advance, card flip, card land, sticker peel/pat, paper slide, typewriter. Wire to the hooks already in place. Develop sound quiet or none. | S (once files exist) |
| 5 | **Diary rethink** | Cody isn't sold on the pile or the folders. Try 2 to 3 alternatives side by side: a contact sheet per roll, a film strip per day, a calendar with prints on it. Keep the frosted folder look as one option. | M |
| 6 | **Look previews on real photos** | Run the three looks (Sunday, Harbour, Flashbulb) on Cody's own six reference photos inside the camera's print, so the look is part of the develop. | S |
| 7 | **Hand-off to the app build** | Freeze the approved feel into an updated motion spec + design tokens, then start v0.1 in Expo per `docs/v0.1-technical-design.md` (spikes S1 to S5 first). Needs the Mac with Xcode/Android SDK. | L |

Recommended order: 1 → 2 → 4 → 3 → 5 → 6 → 7. Writing and the joined-up loop are what make it feel like a product; sound is cheap once recordings exist.

## Open decisions for Cody
- The watermark domain.
- Develop time: now 4 s with tap-to-skip. Keep, or make skip a setting?
- Diary direction (build 5).
- Fonts: still placeholders (Special Elite, La Belle Aurore, IBM Plex Mono, Inter).
