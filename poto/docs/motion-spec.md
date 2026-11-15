# Poto — Motion, Sound and Haptics Spec

> The single source of truth for the app build. The web prototypes in `/prototypes` are for *feel*; **this document is what gets built.**
> Written 15 Nov 2026. Every "Defaults" block is **awaiting Cody** until he sends back a `Copy values` line from that prototype; when he does, replace the numbers here and mark the block approved with the date.

## 0. Shared rules

### 0.1 Easing curves

One named set, used everywhere. Same numbers as `Poto.curves` in `prototypes/shared/poto.js`.

| Name | cubic-bezier | Reanimated | Use |
|---|---|---|---|
| `standard` | (0.2, 0, 0, 1) | `Easing.bezier(0.2, 0, 0, 1)` | Most UI moves: sheets, drawers, screen changes. Quick start, long soft landing. |
| `paper` | (0.3, 0.7, 0.2, 1) | `Easing.bezier(0.3, 0.7, 0.2, 1)` | A light thing settling on a table: cards rising, prints dealt out. |
| `mechanical` | (0.5, 0, 0.3, 1) | `Easing.bezier(0.5, 0, 0.3, 1)` | Gears: counter digits, film winding, carriage. Firm start, firm stop. |
| `chemical` | (0.35, 0, 0.25, 1) | `Easing.bezier(0.35, 0, 0.25, 1)` | The develop curve. Slow to wake, never rushes. |
| `inOut` | (0.45, 0, 0.55, 1) | `Easing.bezier(0.45, 0, 0.55, 1)` | Symmetric moves: the postcard flip. |
| `out` | (0, 0, 0.2, 1) | `Easing.bezier(0, 0, 0.2, 1)` | Press-in, things arriving under a finger. |
| `in` | (0.6, 0, 1, 1) | `Easing.bezier(0.6, 0, 1, 1)` | Things leaving or dropping under gravity. |
| `sprung` | (0.3, 1.5, 0.5, 1) | `withSpring(to, { mass: 1, stiffness: 420, damping: 22 })` | The **only** overshoot allowed: a sprung button or lid returning. One small overshoot, never a bounce. |

All timed animations are `withTiming(to, { duration, easing })`. `withSpring` is used only where this spec names `sprung`. No other springs, no bounce, no elastic.

### 0.2 Reduce motion (`useReducedMotion()`)

- Movement becomes a cross-fade of ≤ 200 ms or an instant change.
- Waits that *are* the product (the develop time) stay; only their decoration goes.
- Sounds and haptics are unchanged (they are not motion).

### 0.3 Sound and silent mode

- Sounds are the files in `assets/sounds/`. Volumes below are 0–1 gain on the file.
- iOS: `playsInSilentMode: false` → the ring/silent switch mutes all Poto sounds. Android: sounds follow media volume. Both: an in-app **Sounds** toggle mutes everything. (Tech design §5.3.)
- When sound is muted by any of these, **haptics still fire**. "Silent mode behaviour" is therefore the same for every moment below — *sounds off, haptics on, animation unchanged* — and is only listed where a moment differs.
- Shutter and advance never wait for anything; they are triggered in the press handler.

### 0.4 Haptics (`expo-haptics`)

| Spec name | Call |
|---|---|
| Light / Medium / Heavy / Soft / Rigid | `Haptics.impactAsync(ImpactFeedbackStyle.X)` |
| Selection | `Haptics.selectionAsync()` |
| Success | `Haptics.notificationAsync(NotificationFeedbackType.Success)` |

On Android, where a row says so, prefer `performAndroidHapticsAsync(AndroidHaptics.X)` (crisper on most devices) and fall back to the impact call.

---

## 1. Developing reveal (v0.1) — `01-developing.html`

**Trigger:** shutter press (the card belongs to the same gesture as §2). Processing runs behind it (tech design §1.2).

**Layers, bottom to top:** paused viewfinder (dimmed 40 %) → card shadow → card (photo paper `#FFFDF8`, border 3.6 % of card width on top and sides, 10.5 % bottom) → image canvas (blank film `#E9E4DA`) → "Developing…" label → caption line.

**Timeline** (t = ms after press; D = `develop_seconds` × 1000, H = `hold` × D):

| t | What | Curve |
|---|---|---|
| 120 | Card rises from below the screen (translateY 70 % of screen height → 0), ending at a random rest tilt of ±0.8° | `paper`, 440 ms |
| 120 → H | **Blank hold.** Card is plain blank film. Processing happens here. | — |
| H | Shimmer sound starts (loop) | — |
| H → D | **Develop.** `p` runs 0 → 1 | `chemical` |
| D | Image is final. Shimmer fades out over 500 ms. Haptic. Caption line fades in (600 ms). | — |
| D + 0 / + 60 | Toss, then Keep, fade and rise 6 px into place (350 ms) | `standard` |

If the processed image isn't ready at H, the hold continues and the develop phase still takes its full D − H.

**The develop shader (variant A, "Chemistry" — recommended).** Per pixel, with final colour `I`, blank colour `F`, luminance `L` of `I`:

```
late   = 1 - L                                   // dark pixels start later: highlights arrive first
p0     = late * stagger / (1 + stagger)          // when this pixel starts
a      = smoothstep(0, 1, (p - p0) / (1 - p0))   // every pixel still finishes exactly at p = 1
c      = smoothstep(0, 1, (p - colour_delay) / (1 - colour_delay))      // colour arrives late
mono   = L * (1.04, 1.00, 0.90)                  // warm monochrome first
target = mix(mono, I, c)
out    = mix(F, target, a) + grain * shimmer * sin(pi * p) * (0.35 + 0.65 * a)
```

Grain is the look's grain tile, re-offset ~12 times a second (every 85 ms) so it fizzes rather than flickers; amplitude peaks mid-develop and is exactly 0 at p = 0 and p = 1.

- Variant B "Bloom": `late = clamp(0.5 * blotch + 0.25 * (1 - L) + 0.55 * distanceFromCentre)`, where `blotch` is a smooth low-frequency noise (5×6 control points). Develops outward and unevenly, like liquid spreading.
- Variant C "Tray": `late = 0.9 * L`. Shadows first, like a print in a darkroom tray. Included as the contrast case.

**Interactions:** tap on the card while developing → "Developing…" fades in (250 ms), stays 1.2 s, fades out. No skip.

**Keep:** card shrinks toward the diary corner — translate to the corner, scale 0.16, rotate 8°, opacity → 0.2 — 380 ms `standard`. Haptic Light. No sound.
**Toss:** card flies off left — translateX −110 % of screen width, rotate −22° — 420 ms `in`. Whoosh at rate 1.3, volume 0.5. Haptic Rigid. "Undo" shows for 4 s; undo returns the card along the same path in 360 ms `paper`, Haptic Light.

| Cue | Sound | Haptic |
|---|---|---|
| H (develop starts) | `shimmer.wav` loop, volume 0.9 (the file is already quiet), fade out 500 ms at D | — |
| D (done) | — | Light |
| Keep | — | Light |
| Toss | `whoosh.wav` rate 1.3, vol 0.5 | Rigid |

**Reduce motion:** no rise (card fades in, 150 ms). No shimmer grain. The image cross-fades in linearly over the **last 600 ms** of D. Same total wait.

**Defaults — awaiting Cody** (`poto/developing`):
`develop_seconds 8` · `hold 22 %` · `stagger 0.85` · `colour_delay 0.35` · `shimmer 0.45` · `easing chemical` · `rise_ms 440` · variant **A**

---

## 2. Shutter and film advance (v0.1) — `02-shutter.html`

**Trigger:** the shutter button. It **fires on release** (touch-up inside), like a phone camera; press-in is the half-press. (Tweakable to fire on press.)

**Layers:** viewfinder → grid/guides → curtain blades (two black rects, top and bottom) → controls → developing card (§1) on top.

| t (ms) | What | Curve |
|---|---|---|
| press-in | Inner disc scales 1 → 0.86 | `out`, 60 ms |
| **0 = release** | Haptic. Click sound. Disc springs back to 1. Exposure committed (tech design §4.3). | `sprung`, ~220 ms |
| 0 → 150 | **Curtain:** blades close to meet at the middle by 57 ms (38 %), stay shut until 82 ms (55 %), open by 150 ms | close `ease-in`, open linear |
| 120 | Developing card starts to rise (§1) | |
| 180 | Film-advance sound starts (620 ms long) | |
| 260 | Counter rolls: old digit slides up and out, new slides in from below; units digit first, tens 40 ms later | `mechanical`, 280 ms |
| 700 | Soft haptic as the advance stops (180 + 520) | |

Alternative viewfinder treatments in the prototype: `blink` (opacity to black: in by 30 %, hold to 50 %, out; min 90 ms) and `none`.

| Cue | Sound | Haptic |
|---|---|---|
| 0 | `shutter.wav`, vol 1, pitch randomised ±25 cents | Medium (Android: `AndroidHaptics.Confirm` if it feels better on device) |
| 180 | `advance.wav`, vol 0.9, ±20 cents | — |
| 700 | — | Soft |

Two players per sound, alternated, so a fast second shot never cuts the first one's tail.

**Reduce motion:** no squash animation, no curtain (a 90 ms opacity blink instead), digits swap without rolling. Sounds and haptics unchanged.

**Defaults — awaiting Cody** (`poto/shutter`):
`fire_on release` · `squash 0.86` · `squash_ms 60` · `spring_ms 220` · `blink curtain` · `blink_ms 150` · `advance_delay 180` · `tick_at 260` · `tick_ms 280`

---

## 3. Load a roll (v0.1) — `03-load-roll.html`

**Trigger:** app start with no loaded roll, or "Load a new roll" after §4.

**Look cards.** Horizontal, snap to centre. Each card is a print (photo + mono caption `LOOK · 27 SHOTS`), name, one-line description. The centred card is full size and opacity with a rest tilt of ±1.25° (alternating sign per card); neighbours are scale 0.92, opacity 0.55, no tilt. Change is 300 ms `standard`. Haptic **Selection** each time a new card becomes centred. The button reads `Load <LOOK>`.

**Confirm sheet.** Scrim fades in 250 ms; sheet rises from the bottom 340 ms `standard`. Copy: **"This roll is locked to SUNDAY. 27 shots."** / "No switching halfway. That's the fun part." Buttons: *Not yet* · **Load it**.

**Loading moment** (t = ms after "Load it"; the sheet and cards are replaced by a plain paper screen with the camera-back drawing):

| t | What | Curve | Sound | Haptic |
|---|---|---|---|---|
| 0 → 380 | Canister (label in the look's colour, name printed on it) drops into the well from 150 px above, rotating −7° → 0°, fading in over the first 30 % | `in` | — | — |
| 380 | Seats: nudges down 3 px and back (140 ms, ease-out) | | `pat.wav` rate 1.5 + `key2.wav` rate 0.7 vol 0.5 (a clack) | Rigid |
| 640 → 1360 | Film leader is drawn across to the take-up spool (strip width 0 → 160 units; sprocket holes appear as it passes). Status: "Winding on…" | `mechanical`, 720 ms | `advance.wav` at rate 620 / wind_ms | — |
| 1360 | Leader arrives | | — | Soft |
| 1480 → 1780 | Camera back slides shut from the right | `in`, 300 ms | — | — |
| 1780 | Door lands: 2 px recoil (120 ms) | | `shutter.wav` rate 0.62, vol 0.9 (a latch) | Medium |
| 1940 | `SUNDAY · 0/27` fades in on the door (300 ms). Status: "Loaded. Shoot anything." | | — | — |
| 2290 | App goes to the camera (prototype shows a button instead) | 300 ms fade | — | — |

Beats between steps are `pause_ms` (120). Label colours (placeholders): Sunday `#E2A93B`, Harbour `#3E7C80`, Flashbulb `#D8553F`.

**Reduce motion:** skip steps 1–3; show the closed door with the label immediately, latch sound + Medium haptic once, then go to the camera.

**Defaults — awaiting Cody** (`poto/load-roll`): `tilt 1.25°` · `drop_ms 380` · `wind_ms 720` · `door_ms 300` · `pause_ms 120`

---

## 4. Roll complete (v0.1) — `04-roll-complete.html`

**Trigger:** the 27th photo leaves the developing card (kept or tossed).

| t (ms) | What | Curve | Sound | Haptic |
|---|---|---|---|---|
| 0 → 300 | A beat. Camera screen, counter reads 27/27, shutter hidden. | — | — | — |
| 300 → 1600 | **Rewind.** Counter runs 27 → 00 | `mechanical`, 1300 ms | `advance.wav` looped at rate 1.9, vol 0.7; stop with a 60 ms fade | Selection, at most every 160 ms while the number changes |
| 1600 | Stop | | `shutter.wav` rate 0.6, vol 0.8 | Medium |
| 1820 → 2240 | Camera screen lifts away upward to reveal the paper screen | `standard`, 420 ms | — | — |
| 2240 → 2700 | Finished canister rises 60 px out of its slot | `sprung`, 460 ms | — | — |
| 2700 | Canister settles | | `pat.wav` rate 1.3 | Success |
| 2780 + n × 90 | "Roll complete." → "27 shots on SUNDAY. They're in your diary." → **Load a new roll** → secondary link, each fading up 8 px (380 ms) | `standard` | — | — |

No confetti, no stats, no "best shot". The fuller "contact strip" celebration is v0.6 scope and is deliberately not here.

**Reduce motion:** no rewind animation or screen lift; cut straight to the paper screen with the canister in place; one `pat` + Success.

**Defaults — awaiting Cody** (`poto/roll-complete`): `beat_ms 300` · `rewind_ms 1300` · `wipe_ms 420` · `eject_ms 460` · `stagger_ms 90`

---

## 5. Camera home (v0.1) — `05-camera.html`

Static layout plus how the controls open, close and stay out of the way. Two options; **Cody picks one.**

**Common to both:** 3:4 viewfinder, plain. Zoom steps (`.5 · 1× · 2`) as one small pill at the bottom edge of the viewfinder, always visible (shown only where the device supports them). Below: look name left, counter right (mono caps). Shutter centred; last photo as a small tilted print bottom-left (opens the diary). Controls are **text chips in mono caps that show their state**, not icons: `FLASH OFF/AUTO/ON` · `TIMER OFF/3S/10S` · `GRID` · `DATE` · `DOUBLE` · `FLIP`. Off = soft grey text; on = full ink and a stronger outline.

**Option A — Drawer (recommended).** A `···` button bottom-right opens a tray *between* the viewfinder and the shutter (never over the image): exposure slider on top, chips in a 3 × 2 grid below.
- Open/close: tray height 0 ↔ 118 pt, 260 ms `standard`. Haptic Light on the button.
- Closes on: `···` again, a tap on the viewfinder, the shutter, or 4 s without a touch.

**Option B — Edge.** Chips sit in a column on the right edge of the viewfinder at 30 % opacity; an exposure line sits on the left edge.
- Any tap on the viewfinder wakes them to 100 % (300 ms). The first tap on a dim chip only wakes; the second acts.
- Drag up/down within 56 pt of the left edge = exposure (full range ±2 EV over 46 % of the viewfinder height), Selection haptic at each half-stop.
- They dim again after 4 s without a touch.

**Shared behaviour:**
- Chip tap: Haptic Selection; state text changes instantly (no animation).
- Zoom step: the viewfinder scales to the new framing over 280 ms `standard`; Haptic Selection.
- Flip: curtain blink (§2, 150 ms), camera swaps behind it.
- Grid: fades in/out 200 ms.
- Timer: big mono numeral in the viewfinder counting down, Selection haptic each second; any tap cancels. Then §2.
- Double exposure: after shot 1 the corner reads `1 OF 2` → `2 OF 2`, and shot 1 shows as a ghost at 35 % (screen blend, 300 ms fade in). **Counter ticks on shot 1** (the exposure is spent); **the advance sound plays after shot 2.**
- Shutter always closes the drawer / dims the edge controls first.

**Reduce motion:** drawer and zoom changes are instant; no curtain.

**Defaults — awaiting Cody** (`poto/camera`): `tray_ms 260` · `idle_s 4` · `dim 0.3` · layout **A or B: awaiting Cody**

---

## 6. Diary: month → day → photo (v0.1) — `06-diary.html`

**Month.** 7 columns, Monday first. Day number top-left of each cell (10 pt, soft; today in accent, semibold; future days at 40 %). A day with photos shows up to 3 tiny prints, loosely stacked: each offset 2.5 pt right / 1.5 pt up from the one above it and rotated by its own stored tilt × 1.6. More than 3 → `+N` in mono. Each photo gets a random tilt in −1…1 and nudge in −1…1 **once, stored** (derive from the photo's `seed`), so the layout is loose but never changes between visits.

**Month → day.** Trigger: tap a day with photos. Haptic Light.
- The month is replaced by the day sheet: a 2-column grid of prints (a single photo: one column at 72 % width), even-numbered prints dropped 26 pt, each rotated by `tilt × 2.25°` and nudged `dx × 3 pt`.
- Each print animates **from the tapped cell's thumbnail rect to its place** (position and scale; starting rotation −6° + 3° × index): 420 ms `paper`, staggered 45 ms per print. Header fades in 260 ms.

**Day → month.** "November" button. Month fades in from 40 % (220 ms); the cell you came from pulses 1.12 → 1 (300 ms `paper`).

**Day → photo.** Trigger: tap a print. Haptic Light.
- The print grows from its rect to the full view (centred, width = min(86 % of screen, 46 % of screen height)), un-rotating as it goes: 380 ms `standard`. Background fades to paper over 70 % of that.
- Caption line fades in after the print lands (starts at 60 % of 580 ms): `LOOK · 15 NOV 2026` left, small `poto` mark right.

**Photo → day.** Tap the photo or "Close": reverse path, 80 % of the duration.

No sounds anywhere in the diary. It is the quiet room.

**Reduce motion:** all three transitions become instant swaps (prints appear in place).

**Defaults — awaiting Cody** (`poto/diary`): `tilt 2.25°` · `deal_ms 420` · `stagger_ms 45` · `zoom_ms 380`

---

## 7. Postcard flip (v0.2 preview) — `07-flip.html`

**Trigger:** tap the card, or drag sideways.

**Layers:** soft ground shadow → card (front face, back face at rotateY 180°, both `backface-visibility: hidden`) → a 2.5 pt edge sliver, visible only near edge-on.

With flip angle `a` (0° front, 180° back) and `u = |sin a|` (0 flat, 1 edge-on):

```
card:    perspective(1100) rotateY(a) rotateX(u * 3.5deg) scale(1 + u * 0.05)
shadow:  scaleX(1 - 0.82u), translateY(10u), opacity 1 - 0.45u
edge:    shown when u > 0.6
```

- **Tap:** `a` goes to the next multiple of 180° in 600 ms `inOut`.
- **Drag:** `a` follows the finger: 180° per card-width of travel. On release, go to the nearest side — or the next side if the release velocity is over 0.35 pt/ms — in `600 × remaining° / 180` ms (min 160 ms), same curve.

| Cue | Sound | Haptic |
|---|---|---|
| Flip start | `whoosh.wav`, vol 0.8, rate = clamp(600 / duration, 0.6, 2), ±30 cents | — |
| Landing | `pat.wav` vol 0.35 rate 1.6 (card touching down) | Light |

**Reduce motion:** no rotation; 200 ms cross-fade between faces. No whoosh. Light haptic stays.

**Defaults — awaiting Cody** (`poto/flip`): `flip_ms 600` · `easing inOut` · `perspective 1100` · `lift 0.05` · `tilt 3.5°` · `thick 2.5`

---

## 8. Typewriter mode (v0.2 preview) — `08-typewriter.html`

**Trigger:** each character from the system keyboard. The machine sits directly above the keyboard; the postcard's message area is above the machine.

**Illustration layers** (`assets/typewriter/typewriter.svg`): `#carriage` (contains `#paper`, platen, knobs, return lever, scale) · body · `#typebars` (`#bar-0…25`) · `#bell` · `#keys` (`#key-A…Z`, `#key-space`, `#key-return`, `#key-back`).

| Event | Animation | Sound | Haptic |
|---|---|---|---|
| Letter / digit / punctuation | Key drops 2.6 units instantly, returns in 90 ms (ease-out). Its typebar's tip snaps to the print point (180, 84) and back after **55 ms**, no tween. Carriage steps left one column, instantly. | one of `key1/2/3.wav` at random, vol 0.8, ±60 cents | Light |
| Space | Space bar drops; carriage steps | `space.wav`, vol 0.8 | Light |
| Delete | Back key drops; carriage steps right | `space.wav` vol 0.48, rate 1.4 | — |
| 5 characters before the line's end (once per line) | Bell rocks −9° → 6° → −3° → 0° about its base, 420 ms ease-out | `bell.wav`, vol 0.7 | Soft |
| Return key, or the line fills | Return key drops; carriage slides back to the start in 340 ms `mechanical` | `return.wav`, vol 0.8 | Rigid |

- Carriage position: `x = (0.5 − col / cols) × 26 × step`, `step` = 2.6 units. It travels left as the line fills; the paper rides on it.
- Line length is measured from the card (characters that fit), so the bell and the return match what the card shows.
- Letters map to typebars A = 0 … Z = 25; other characters to `charCode mod 26`.

**Keeping up with fast typing:** animations are per-key and never queued: a new keystroke never waits for the previous one. At most **4 sounds at once**; a fifth cuts the oldest. The bell and the return are exempt from being cut by keys (give them their own players).

**The text.** Typewriter font, in the chosen ink. Each character gets, seeded by its index (so nothing shimmers while typing): vertical offset ±0.7 pt, rotation ±0.63°, opacity 1 − 0.24 × (0…1). Plus the ink's edge bleed (`assets/inks/inks.json`).

**Mute toggle** in the editor silences the machine (haptics stay). **Silent mode:** as §0.3.
**Reduce motion:** no typebar, carriage or bell animation; keys still dip. Text effects stay (they are static).

**Defaults — awaiting Cody** (`poto/typewriter`): `strike_ms 55` · `step 2.6` · `return_ms 340` · `bell_at 5` · `wobble 0.7` · `pressure 0.24` · `voices 4` · `volume 0.8`

---

## 9. Calligraphy reveal (v0.2 preview) — `09-calligraphy.html`

**Trigger:** every time the back of a calligraphy card comes into view (after the flip lands), and on save in the editor.

| Step | Timing |
|---|---|
| Wait after the card opens | 380 ms |
| Each letter | revealed left → right by a clip mask, **62 ms per letter**, linear |
| Between words (pen lift) | 110 ms |
| At a line end | 220 ms |

- A small nib mark rides the reveal edge, bobbing ~5 pt per letter (down-up-down); it fades out during lifts and when done.
- **Sound:** one `nib.wav` per word, started with the word, rate = clamp(550 / word duration, 0.7, 2.4), volume 0.7 × (0.7…1.0 random), ±120 cents. Max 3 at once.
- **Haptic:** Soft, once, when the last word finishes. None during writing.
- Ink: edge bleed 0.45 pt (`inks.json`).
- Alternative unit `word`: the whole word is revealed by one mask over (letters × 62) ms with ease (0.3, 0, 0.6, 1).

**Reduce motion:** no writing; the whole message fades in over 300 ms. No nib sound.

**Defaults — awaiting Cody** (`poto/calligraphy`): `unit letter` · `letter_ms 62` · `word_pause 110` · `line_pause 220` · `start_delay 380` · `bleed 0.45` · `nib yes` · `volume 0.7`

---

## 10. Sticker peel and place (v0.2 preview) — `10-stickers.html`

**Trigger:** drag a sticker **upward** out of the tray (sideways drags scroll the tray). Max 5 on a card.

| Moment | Animation | Sound | Haptic |
|---|---|---|---|
| Peel (leaves the tray) | Scale 1 → 1.14 in 140 ms `out`; tilts to −6°; shadow grows to 11 pt offset / ~10 pt blur at 30 % | — | Light |
| Carry | Follows the finger 1:1. Second finger: pinch = scale (0.5–2.6), twist = rotation. | — | — |
| Place (released over the card) | Rotation gets a random extra ±5° (it never lands straight). **Pat:** scale → 0.95 over the first 45 % (`in`), then → 1 (`out`), 170 ms total. Shadow collapses to a hairline (160 ms). | `pat.wav`, vol 0.9, ±80 cents — on release | Light — on release |
| Pick up a placed sticker | Same lift as peel, no tilt. A "Drop here to remove" pill appears at the top (200 ms). | — | — |
| Over the bin | Pill fills with accent and scales 1.08 | — | Selection (on entering) |
| Released on the bin, or off the card | Sticker shrinks to 0.6 and fades, 160 ms | `whoosh.wav` rate 1.8 vol 0.35 (bin only) | Rigid (bin only) |
| Re-placing a moved sticker | Pat as above; extra crookedness is a quarter as much (±1.25°) | `pat.wav` | Light |
| Sixth sticker attempted | Tray dims to 35 %; counter reads "5 of 5 · that's the lot" | — | Rigid |

**Reduce motion:** no lift scale or pat squash (shadow change only). Sound and haptics unchanged.

**Defaults — awaiting Cody** (`poto/stickers`): `peel_scale 1.14` · `lift 11` · `peel_tilt 6°` · `crooked 5°` · `pat_ms 170` · `pat_squash 0.95`

---

## 11. Approval log

| Moment | Status | Date | Values line |
|---|---|---|---|
| 1 Developing reveal | awaiting Cody (and variant A / B / C) | | |
| 2 Shutter + advance | awaiting Cody | | |
| 3 Load a roll | awaiting Cody | | |
| 4 Roll complete | awaiting Cody | | |
| 5 Camera home | awaiting Cody (and layout A / B) | | |
| 6 Diary | awaiting Cody | | |
| 7 Postcard flip | awaiting Cody | | |
| 8 Typewriter | awaiting Cody | | |
| 9 Calligraphy | awaiting Cody | | |
| 10 Stickers | awaiting Cody | | |
