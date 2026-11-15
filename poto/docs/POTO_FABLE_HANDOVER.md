# POTO — Handover for the Fable session (phone)

> Written 15 Nov 2026 by the Opus session on Cody's Mac. This file is self-contained: the handover comes first, and the **full build plan is copied unchanged below it** (from "POTO — Full Build Plan").

---

## H1. Where things stand

- **Nothing has been built yet.** The Mac project folder (`~/Documents/poto app`) is empty.
- Cody's Mac has Node 26, Python 3.14 and git. It does **not** have Xcode or the Android SDK, so the Expo app itself will be built later on another device.
- **This session has three jobs. All of them are pure files.** There is no app code and no Expo project.
  - **Part A, the v0.1 technical design:** the hard engineering thinking, written as docs.
  - **Part B, the asset drafts:** plan Section 7 + the design tokens from Section 4.
  - **Part C, motion and aesthetics:** interactive animation prototypes and screen mockups that Cody can feel on his phone, plus a motion spec the app build will copy exactly. **Cody specifically wants Fable on this.** Everything that is look, feel or motion belongs here.
- Why do these now: none of them need native tooling. Part A becomes the "plan + overview" (rule 0b) for the app-build session. Parts B and C are Cody's taste work, and they get settled before any app code exists.
- **Work order:** Part A → Part B tasks 1–2 (tokens and looks, since C uses them) → **Part C** → the rest of Part B.
- Cody's Fable allowance resets soon. If time runs short, protect Part A and Part C. The stickers, papers, inks and sounds in Part B are fine on Opus later.

## H2. Rule 0a still applies: ask Cody these first

Ask these in one go, wait for his answers, then show a short plan and wait for "go". Suggested defaults are in brackets. If he says "defaults", use them all.

1. **Sticker style:** monoline hand-drawn doodles in `ink` plus `accent` red, with one stroke weight throughout? [yes]
2. **Sounds:** synthesise placeholders in code (no downloads), so Cody can replace them with his own recordings later? [yes]
3. **Look previews:** use generated test images (gradients, grey ramp, skin-tone and colour patches, a simple synthetic scene) until Cody sends his 6 reference photos? [yes]
4. **Design-doc depth:** decisions with short reasoning and code sketches only where they remove ambiguity? Or full module-level code sketches? [decisions + targeted sketches]

Any genuine taste decision that comes up while writing Part A goes in an "Open questions for Cody" list at the end of the doc, each with a recommended answer. Don't stall the session waiting on those.

## H3. Part A — v0.1 technical design (do first)

Write `docs/v0.1-technical-design.md`. It's the blueprint the app-build session will follow, so be concrete: name the modules, data shapes, numbers and failure cases.

**Verify before you assume.** Check current docs for Expo SDK, `react-native-vision-camera`, `@shopify/react-native-skia`, `expo-sqlite`, `expo-file-system`, `expo-audio`, `react-native-reanimated` and `react-native-gesture-handler`, if this session can browse. Record the version and the date you checked. If you can't browse, mark every version and API claim **"unverified"**.

Cover these sections:

1. **Image processing pipeline (the core).**
   - The path from capture to saved JPEG: shutter → photo file → decode → GPU render offscreen in Skia → encode → write. Say which steps run on which thread, and how the UI stays at 60 fps throughout.
   - **The LUT shader:** a Skia RuntimeEffect (SkSL) that samples the 2D LUT texture with correct trilinear interpolation (blending between slices).
     - Define the texture layout **once**, and make Part B's `generate_looks.py` write exactly that layout.
     - Include the SkSL itself, since this is the part most likely to be subtly wrong.
     - Cover sRGB vs linear handling.
   - **Effects in order:** exposure-compensation bake (if any), LUT, flash/vignette, light leak, grain (seeded per photo, so it can be re-rendered identically), and the date stamp (font, position, glow).
   - **Double exposure:** how two captures are held and blended, and which settings come from which shot.
   - **Sizes:** what full-resolution original vs the 2048 display render means for memory on a mid-range Android. Estimate the peak MB, and say how to avoid out-of-memory crashes (downscale on decode, release textures).
   - **Cross-platform sameness:** how to guarantee iOS and Android produce matching output. Specify a golden-image test: fixed input + seed → compare pixel output within a tolerance.
   - **Timing budget:** the shutter → developing card must appear in under 300 ms, and processing must finish before the reveal ends (default 8 s). Give the target time for each stage.
2. **Lens system architecture (built, not shipped).**
   - A plug-in interface for post-capture effects (fisheye, prism, starburst, colour flash, soft focus, half-frame).
   - The framing-guide overlay contract.
   - How a lens composes with a look in the pipeline.
   - How the hidden dev menu enables lenses.
3. **Camera layer.**
   - What `react-native-vision-camera` gives you, and its known pitfalls: device/format selection, 0.5×/1×/2× zoom across iPhone and Android (virtual multi-camera devices vs switching physical lenses), flash vs torch, front-camera mirroring and screen flash, timer, grid, the 3:4 crop, orientation/EXIF rotation.
   - Fallbacks for each pitfall.
4. **Local data model + offline robustness.**
   - SQLite schema for `rolls`, `photos` and `app_config`. Shape it like plan Section 6 so v0.3 sync slots in: client-generated UUIDs, `created_at`/`updated_at`, status enums.
   - The file layout on disk.
   - **Exposure counting:** it must be atomic, and a tossed shot still uses an exposure.
   - **Crash recovery:** the app is killed mid-processing, or the battery dies during a reveal. Write a state machine for a photo (`captured → processing → developing → kept/tossed`) and say what happens on relaunch from each state.
   - The roll lifecycle and the locked look.
5. **Developing, sound and haptics.**
   - The developing-card animation approach (Reanimated + Skia), its timing, and reduce-motion handling.
   - Audio preloading for low-latency shutter and advance sounds.
   - Silent-mode behaviour on iOS vs Android.
6. **App structure.**
   - The Expo Router screen map: load roll, camera, developing, diary month, diary day, full view, permissions.
   - The folder structure.
   - The state management choice: keep it minimal and justify it.
   - The config/feature-flag shape: local defaults now, remote in v0.3+.
7. **Risks and spikes.**
   - The top risks, ranked, each with a cheap spike to de-risk it **first** in the app build. Likely candidates: SkSL LUT parity, Android memory at full resolution, the 0.5× lens, audio latency.
8. **Build order + test plan.**
   - A step-by-step order for the v0.1 app build, each step with a small commit and how to verify it.
   - Map the acceptance criteria from plan v0.1 to concrete tests.
9. **Open questions for Cody**, each with a recommended answer.

Keep it tight: decisions and reasons, not essays. Where a library can't do something cleanly, say so plainly and give the simplest workaround.

## H3c. Part C — Motion and aesthetics

**Goal:** Cody should be able to *feel* every important moment of Poto on his phone before any app code exists, and react to it ("slower", "less bounce", "warmer").

**Format:**
- Self-contained HTML/CSS/SVG/JS prototypes in `prototypes/`, with no build step, that run in the phone browser at phone size.
- One index page links them all.
- Use the design tokens from Part B task 1. Use the generated look LUT output where a photo is shown, or a sample image with the look baked in.
- Add sound using Web Audio, with the synthesised sounds where they exist. Every prototype has a mute toggle.
- Respect `prefers-reduced-motion`.
- Each prototype has a small **tweak panel** (sliders for duration, easing and intensity), plus a "copy values" button so Cody can send back the numbers he likes.

**Prototypes, in priority order.** v0.1 moments come first. v0.2 moments are **design previews only**, so label them "v0.2 preview" and don't let them change v0.1 scope.

1. **Developing reveal (v0.1, the signature moment).**
   - A blank card → a soft chemical fade-in over `develop_seconds` (default 8, adjustable).
   - Subtle grain shimmer, with highlights arriving before shadows, like real chemistry rather than a linear opacity fade.
   - Tapping shows "Developing…". When the reveal finishes, the Keep / Toss actions appear.
   - **Try 2–3 variants side by side** for Cody to choose from.
2. **Shutter + film advance (v0.1).**
   - The shutter press (button squash, a viewfinder blink or curtain), the click sound, then the advance sound and the exposure counter ticking ("14/27" → "15/27").
   - Show where the haptic would fire.
3. **Load a roll (v0.1).**
   - Look cards to choose from → the confirm modal ("This roll is locked to SUNDAY. 27 shots.") → a small loading moment, such as the roll sliding in or a canister click.
   - It should feel intentional, not like a settings screen.
4. **Roll complete (v0.1).** The "roll complete" moment, then the prompt to load a new roll.
5. **Camera home mockup (v0.1).**
   - The static and interactive layout: plain viewfinder, shutter, counter, look name, and the tucked-away controls (exposure, flash, timer, grid, flip, zoom steps, date stamp, double exposure).
   - Show how the controls open and close and stay out of the way. Give 2 layout options.
6. **Diary month and day mockup (v0.1).** The month grid with tiny thumbnails, a slightly loose and human layout, the transition into a day, and the transition into a full photo with its caption line.
7. **Postcard flip (v0.2 preview).** A 3D Y-axis flip (~600 ms, ease-in-out) with a paper-whoosh sound, and a hint of card thickness and shadow.
8. **Typewriter mode (v0.2 preview).**
   - **Own the typewriter illustration here** (moves from Part B task 7). It's an original minimal front-view vector with layered parts: `keys`, `typebars`, `carriage`, `bell`, `paper`.
   - Typing on the phone keyboard animates a key press → typebar strike → carriage step, with a sound for each key, the space bar and the carriage return.
   - The bell rings near the end of a line.
   - It must keep up with fast typing; cap sound polyphony at about 4.
   - The text gets a subtly uneven baseline and ink pressure.
9. **Calligraphy reveal (v0.2 preview).** A left-to-right writing reveal per letter or word, with a nib-scratch sound. It replays when the card is reopened.
10. **Sticker peel and place (v0.2 preview).** Peel from the tray → drag → pinch/rotate → place with a soft "pat", and a slight crookedness is allowed. Dragging to a bin deletes.

**Also write `docs/motion-spec.md`** as the single source of truth for the app build. For every moment above, record:
- the trigger
- the durations and delays
- the easing curves as exact values (cubic-bezier or spring params), mapped to Reanimated `withTiming` / `withSpring` configs
- the order of the layers
- the sound cue timestamps
- the haptic type and timing (`expo-haptics` names)
- the reduce-motion fallback
- the silent-mode behaviour
- the tweak-panel defaults Cody approved, or "awaiting Cody" if he hasn't yet

The web prototypes are for *feel*. The spec is what gets built.

**Aesthetic guardrails** (plan Section 4):
- Photo first, quiet interface, tactile delight.
- Loose and human, not rigid. No pressure.
- When unsure, choose less.
- Motion should feel physical (paper, chemistry, mechanics), never bouncy-app or flashy.
- No look-alikes of competitor apps or real camera brands.

## H3b. Part B — Asset drafts (in this order)

Folder layout: sources and scripts go in `/assets-src/...`, generated outputs in `/assets/...`. Every output must be reproducible by re-running its script.

1. **Design tokens:** `assets-src/theme/tokens.json` holding the colours (light and dark) from Section 4, the 4-pt spacing scale and the type sizes. Also generate `theme.ts` from it. Keep all colours in this one place so Cody can swap the palette.
2. **Film looks (7.1):** `assets-src/looks/generate_looks.py` (numpy + Pillow is fine).
   - Outputs per look, for **Sunday**, **Harbour** and **Flashbulb**:
     - `assets/looks/<slug>.cube` (33×33×33).
     - `<slug>.lut.png`: the LUT as a 2D texture for Skia, in **exactly the layout defined in Part A §1**. Document it in the script header too.
     - `<slug>.json` preset: `lut`, `grain`, `lightLeak`, `vignette`, `flash`, `dateStampDefault`, `name`, `description`.
   - Look parameters live at the top of the script so Cody can tweak them. The script must also accept Cody's own `.cube` exports dropped into `assets-src/looks/`; those override the generated LUT.
   - Preview grid: every look applied to every test image → `assets/looks/previews/grid.jpg`.
   - Drafts **Ink** (B&W) and **Peach** (pastel) go to `assets-src/looks/drafts/`. They are not shipped.
   - Never use real film-stock or camera brand names.
3. **Papers (7.2):** Cream and Kraft. They are procedural (noise + fibres), tileable, at 2× and 3× (base 390×520 pt → 780×1040 and 1170×1560 px).
4. **Inks (7.3):** `assets/inks/inks.json` with Black #1E1E1E and Navy #1F2A44, plus the edge-bleed parameters. Add Sepia and Red as drafts.
5. **Stamp + postmark (7.4):** one original perforated stamp (a camera or sun illustration) as an SVG, plus a circular postmark SVG with named text slots (`date`, `city`, `look`).
6. **12 stickers (7.5):**
   - The set: heart, star, sun, arrow, squiggle underline, tape strip, ticket stub, paper plane, flower, tiny camera, "wish you were here" label, airmail stripe.
   - All SVG, with a consistent stroke and 2–3 palette colours.
   - Slightly imperfect and hand-drawn, never clip-art.
7. **Typewriter illustration (7.7):** moved to Part C prototype 8. Export the final SVG to `assets/typewriter/typewriter.svg`.
8. **Sounds (7.6):** synthesised WAVs (44.1 kHz mono, short, normalised).
   - The set: shutter, film advance, developing shimmer, flip whoosh, sticker pat, typewriter key ×3 variants, space, carriage return, bell, nib scratch.
   - One script generates them all.
9. **`assets-src/LICENSES.md`:**
   - States that every generated asset is original.
   - Lists the font candidates (Inter, IBM Plex Mono, DSEG7 for the date stamp, Special Elite / Courier Prime, Dancing Script / La Belle Aurore / Homemade Apple) with their licences. Mark each one **"to verify"** unless you actually checked the licence text.
10. **Review page:** `assets-src/review/index.html`, one static page Cody can open on his phone.
    - Shows the look grid, papers, inks on sample text, stamp, postmark, all stickers, the typewriter and play buttons for every sound.
    - Light and dark backgrounds.

## H4. Constraints

- No brand names, no logos, no copyrighted or look-alike designs.
- Only free, open-source Python/Node packages. Ask before anything paid, and don't download third-party assets.
- **Don't** create the Expo app, and don't start any later version. If you think of something extra, list it under "Suggestions for later".
- Keep everything small and simple. These are first drafts for Cody to react to.

## H5. Finish and hand back

1. **Save the work somewhere that survives:** commit and push to a GitHub repo if this session has one. Otherwise package everything (`docs/`, `prototypes/`, `assets-src/`, `assets/`) as `poto-v0.1-prep.zip` for Cody to download. If even that isn't possible, at least give him `docs/v0.1-technical-design.md` as a downloadable file, because it's the most valuable output.
2. **Write `HANDOVER_BACK.md`** at the root, covering:
   - what was made, and where each file is
   - a 5-line summary of the key Part A decisions, plus its open questions for Cody
   - which library versions and APIs were verified, and which are still "unverified"
   - how to regenerate each asset (commands)
   - what is a draft or placeholder
   - which prototypes Cody has tuned (with his values copied into `docs/motion-spec.md`), and which still await him
   - **Cody's review checklist:** Does the developing reveal feel like magic, and which variant wins? Does the shutter feel mechanical? Does loading a roll feel intentional? Is the camera screen quiet enough? Do the 3 looks feel distinct and "film"? Are the papers right? Is the sticker style right? Do the sounds feel tactile? Is the typewriter charming?
3. Stop there. The next session (on the Mac/other device) starts the v0.1 **app** build.

## H6. Still open for the v0.1 app build (later, not this session)

Ask Cody these at the start of the app build:
- **Setup:** local or EAS cloud builds; exact test phone models; bundle ID and display name [`app.poto.camera` / `poto`]; whether to git init and copy this plan into `/docs`.
- **Look and feel:** UI font [Inter]; caption mono font [IBM Plex Mono]; date-stamp font [DSEG7, orange]; how to get from the camera to the diary [corner button + swipe up]; dark mode [follow system].
- **Camera:**
  - double exposure [1 exposure, screen blend]
  - front camera [unmirrored, white-screen flash]
  - Toss [immediate, brief undo]
  - leaving the developing card without choosing [Keep]
  - camera-roll saving [in-app only + manual save]
  - lens test menu [hidden dev menu]
- **The other device needs:** full Xcode (`sudo xcode-select -s /Applications/Xcode.app`), Android Studio + SDK, the EAS CLI and an Expo account.

---

# POTO — Full Build Plan (for Claude Code)

> Owner: Cody (designer/founder). Builder: Claude Code.
> This document is the single source of truth. Build **one version at a time**, stop at the end of each version, and wait for Cody to test, tweak and say "go" before starting the next.

---

## 0. Rules for Claude Code (read first)

0. **Ask first, then plan, then build.** At the start of every version:
   - **a. Questions first.** Before planning or writing any code, list anything you are unsure about or anything that needs Cody's taste, judgement or a human decision (design choices, copy, look/feel, pricing, wording, trade-offs, missing assets, unclear requirements). Ask Cody these questions and **wait for his answers**. Do not guess on decisions that are his to make.
   - **b. Plan + overview.** Then present a short plan for the version: what you will build, in what order, which files/screens are affected, any new dependencies, risks, and how Cody will test it. **Wait for Cody to say "go"** before executing.
   - **c. Mid-build questions.** If something new comes up during the build that needs his input, stop and ask instead of assuming.
1. **One version at a time.** Finish the current version's scope and acceptance criteria, then STOP and hand over a short test checklist. Do not start the next version until Cody says "go".
2. **No scope creep.** Do not add features that are not in the current version. If something seems missing, list it under "Suggestions for later" in your handover — don't build it.
3. **Ask before adding a dependency** that is not listed in Section 5, and before any paid service.
4. **Use the latest stable versions** of every library at build time and check their docs. Do not trust version numbers in this file; verify.
5. **Both platforms, always.** Every feature must work on iOS **and** Android. Test on a real device for camera, haptics, audio, widgets and uploads (simulators lie).
6. **Design is the product.** Follow the design system in Section 4 exactly. When unsure, choose less: fewer elements, more space, smaller text.
7. **Generated assets are drafts.** Film looks, stickers, papers, inks and stamps you generate are first drafts for Cody to review and tweak. Keep them in `/assets-src` with the scripts that produce them so they can be regenerated.
8. **Keep it simple.** Prefer platform features and listed libraries over custom infrastructure. Shortest working solution wins.
9. **Secrets** live in environment variables / EAS secrets, never in the repo.
10. **Commit in small steps** with clear messages, one feature per commit where possible.
11. At the end of every version, update `CHANGELOG.md` and the "Status" table in Section 12.
12. **Security by default:** follow Section 13 in every version — server-side enforcement, RLS on every new table, no trusting the client.

---

## 1. What Poto is

**One-liner:** A film camera for your days, your friends and your trips.

You **load a roll** with one film look (locked for that roll), shoot through a plain viewfinder (no live filter preview — like real film), watch the photo **develop** a few seconds later, and every photo becomes a **postcard**: a clean, minimal front, and a creative back where you write with an animated typewriter or calligraphy pen and add stickers. Share with friends, keep a daily streak, get a Sunday recap, and run **Shared Rolls** for trips, parties and weddings where everyone shoots into one roll and the host reveals them together.

**The feel (most important brief):** **no pressure.** Poto is not about perfect, curated or "good" photos. Take a photo of anything — a messy desk, a bus window, your lunch, a blurry friend — and the film look makes it feel like a memory. Nothing in the app should make people feel judged, graded or like they need to perform: no public like counts, no "best shots", no perfection prompts, no rigid layouts. Loose, warm, casual, human. When in doubt, choose the option that makes shooting feel lighter.

**Goal of the app:** shareability. Every output (postcard, recap, event reveal, milestone) should be beautiful enough that people post it, and branded (small postmark) so viewers ask "what app is that?" The app should market itself.

**Business goal:** ~S$5k/month (≈1,340 annual Plus subscribers at $39.99) first; scale later.

**Audience:** 13+, global. People who post photo dumps, close-friends stories, travel with friends, go to weddings/parties. iOS and Android from day one.

**Main competitors (do not copy their look):** Retro (weekly friends photo journal, camera-roll based), Locket (widget photos), Dazz Cam (film looks, no social), POV/Lense (event disposable camera apps).

**Differentiation:** a real-feeling film camera + postcard back with animated typewriter/calligraphy + Shared Rolls for events + limited "drops" of new looks, papers and inks.

---

## 2. Product decisions (locked)

| Area | Decision |
|---|---|
| Camera viewfinder | **No live filter.** Plain viewfinder. Look is applied after capture. |
| Film looks | Chosen when **loading a roll**; **locked** until the roll is finished. Choosing is intentional. The roll = the film stock. |
| Camera controls | Like Dazz Cam, but simple: per-shot controls (exposure compensation, flash on/off/auto, timer, grid, front/back, zoom steps 0.5×/1×/2× where supported, date stamp on/off, double exposure). Lens effects (fisheye, prism, starburst, colour flash, soft focus, half-frame) are **collectible lenses released as drops**. Lens effects are applied after capture; viewfinder only shows a framing guide. No ISO/shutter manual mode at launch (possible Plus "manual mode" later). |
| Public sharing | Friends-only by default. Users can **opt in to a public profile** (shareable link) and choose **per photo** what is public. A small **Featured** section, hand-picked by Cody, shows inspiring public rolls/profiles. No algorithmic public feed and no public like counts at launch. Users aged 13–17 default to friends-only. |
| Roll size | Personal roll = **27 exposures** (config value). When finished, user loads a new roll (can pick a new look). |
| Developing | After the shutter, the photo shows as a blank developing card for **~6–10 seconds** (config), with an animation, then reveals with the look. **No hours-long delay** for personal photos. |
| Bad shots | After developing, the user can **Keep**, **Share to friends**, or **Toss** (delete). Tossed shots still use an exposure (like real film). No editing of the photo itself. |
| Live-only | Photos in rolls and Shared Rolls must be taken in-app. |
| Import | Free. Imported photos go to the personal **diary/calendar only**, tagged "imported". Never in the friends feed, rolls, mail or Shared Rolls, and **film looks/lenses can never be applied to imported photos** (prevents Poto being used as a filter service). |
| Postcard front | Clean and minimal: thin white border, one small caption line (`look · date · place`), small Poto postmark/watermark. Keep it quiet — the photo talks. |
| Postcard back | The creative side: message (≤150 chars), **two text styles** — (1) typewriter with an animated typewriter machine + full sound, (2) calligraphy/handwritten with an animated writing reveal; stickers (max 5); paper; ink; stamp; postmark. Editable anytime. |
| Options at launch | **Few on purpose** (exclusivity). Launch with 3 looks, 2 papers, 2 inks, 1 stamp, 12 stickers. New items arrive as **Drops**. |
| Drops | Timed releases of looks/papers/inks/sticker packs/stamps, with a countdown. Controlled by a remote catalog, no app update needed. |
| Shared Rolls (events) | **Core v1 feature.** Trips (2+ people), parties, weddings (hundreds). QR + room code to join; **guests must download the app**. Host sets shots per person, prompts, reveal time. iOS and Android guests shoot into the same cloud roll. Photos upload immediately but stay hidden until the host reveals. |
| Streaks | Daily shot streak, friend streaks, group roll streaks, free freezes, milestone cards (7/30/100 days). Never sell streak repairs. |
| Friends | Friends see your profile (pinned photos, albums, hosted events) and photos you share. No public feed, no follower counts, no public likes. |
| Photos of you | When a friend tags you in a photo, it is delivered to you ("You showed up in 3 photos this week"). |
| Sunday recap | Auto-built weekly postcard stack + "how your friends saw you". Shareable to Stories. |
| Pricing | Free + **Poto Plus $4.99/month or $39.99/year**. Shared Rolls priced **per roll by guest tier** (host pays, guests always free); Plus includes 25-guest rolls and 20% off bigger tiers. Add-on drop packs $0.99–1.99. All values in remote config. |
| Lock-in | **No hostage lock-in.** Users can always export their photos. |
| Age | 13+ only (age gate at sign-up). |

---

## 3. Core user loops

**Daily loop**
1. Open app → camera (home) with current roll loaded and exposures left (e.g. "14/27").
2. Shoot → developing card → reveal → Keep / Share / Toss.
3. Optional: flip → write the back → stickers.
4. Streak ticks up. Friends get the photo in feed + widget.

**Weekly loop**
- Sunday: recap is ready (push notification) → flip through → share to Stories.

**Event loop (Shared Roll)**
1. Host creates roll → chooses type (trip/party/wedding/custom), look, shots per person, prompts, reveal time, guest limit.
2. Host shows QR / code → guests download Poto → enter code → shoot.
3. Host sees only a counter ("142 shots taken") until reveal.
4. Reveal → every guest gets a notification; host gets the full gallery + a "film reel" slideshow; guests get their own shots + the album (host decides visibility).
5. Host can curate, download all, share the reel, make an album public to members.

**Growth loops**
- Shared postcard/recap/milestone exports carry the postmark → viewers download.
- Every Shared Roll forces installs (2–500 people).
- Public profiles + Featured give people a page to be proud of and share outside the app.
- Postcards sent directly to friends pull non-users in (the recipient needs the app to open it).
- Friend streaks + photos-of-you pull friends in.
- Drops give people a reason to come back and post ("new look just dropped").

---

## 4. Design system

**Principles:** photo first, quiet interface, tactile delight, **no pressure**. Clean and minimal but loose and human, never rigid or over-curated. Small moments of joy (sound, haptics, animation). Layouts can feel slightly imperfect (a sticker a bit crooked, a postcard stack slightly askew) — like real paper, not a template.

**Colours:** final palette to be decided by Cody later. Use the tokens below as placeholders and keep all colours in one theme file so they can be swapped.

**Colour tokens (draft — Cody will tweak)**
- `paper` #F7F4EE (app background, off-white)
- `ink` #1B1B1B (primary text)
- `ink-soft` #6B6B6B (secondary text)
- `line` #E4DFD6 (hairlines)
- `accent` #C2412D (postmark red, used sparingly)
- Dark mode: `paper` #121212, `ink` #F2EFE9, `line` #2A2A2A (photos stay unchanged)

**Typography**
- UI: a clean sans (e.g. Inter or system font).
- Caption line + postmark: a monospaced/date-stamp style.
- Postcard back style 1 (typewriter): an open-licence typewriter font (candidates: Special Elite, Courier Prime). **Verify the licence allows app embedding.**
- Postcard back style 2 (calligraphy): an open-licence script font (candidates: Dancing Script, La Belle Aurore, Homemade Apple). **Verify licence.**
- Record every font + licence in `/assets-src/LICENSES.md`.

**Spacing:** 4-pt grid. Generous margins (≥20 pt on phone edges).

**Postcard front spec**
- Photo with a **thin white border** (≈3–4% of width; bottom border slightly thicker to fit the caption).
- Caption line under the photo, small (≈10–11 pt), `ink-soft`: `LOOK NAME · 15 NOV 2026 · SINGAPORE` (place optional, off by default).
- Postmark/watermark: small "poto" mark bottom-right of the border, low contrast. Always the same position.
- Aspect ratios: 3:4 default; 4:5 and 1:1 later.

**Postcard back spec**
- Paper texture background (kraft / cream at launch).
- Stamp top-right, postmark circle partly over the stamp (shows date + city + look).
- Message area left/centre; optional "to:" line.
- Stickers on top layer, draggable, rotatable, resizable, max 5.
- Ink colours: 2 at launch (black, navy). Ink applies to the message text.

**Motion & sound**
- Shutter: mechanical click sound + medium haptic.
- Developing: blank card → soft chemical fade-in of the image over ~6–10 s, subtle grain shimmer. Tap to see a "developing…" label; no skip at first (test with Cody whether to allow skip).
- Flip: 3D Y-axis rotation (~600 ms, ease-in-out), paper "whoosh" sound.
- Typewriter mode: animated typewriter illustration at the bottom of the screen; each character typed shows key press + typebar strike + carriage move; sounds per key, space, carriage return, end-of-line bell. Mute toggle.
- Calligraphy mode: text appears with a left-to-right writing reveal (mask reveal per word/letter) with a soft nib-scratch sound. Playback re-runs when someone opens the back.
- Stickers: peel-and-place animation + soft "pat" sound + light haptic.
- Respect system "reduce motion" and silent mode (haptics only).

---

## 5. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| App | React Native + Expo (latest stable SDK), TypeScript, Expo Router | Dev builds via EAS (custom native modules needed). |
| Camera | `react-native-vision-camera` (v5) | Capture only. **No frame processors / live filters.** |
| Image processing | `@shopify/react-native-skia` | Offscreen render of the captured still: apply 3D LUT (from `.cube`, converted to a LUT PNG/texture), grain, light-leak, date stamp, flash/vignette; export JPEG. Same pipeline on iOS/Android. |
| Animation | `react-native-reanimated`, `react-native-gesture-handler` | Flip, develop, stickers, typewriter. |
| Audio | `expo-audio` | Low-latency short sounds (preload). |
| Haptics | `expo-haptics` | |
| Local storage | `expo-file-system` + `expo-sqlite` | Offline-first queue for photos and edits. |
| Backend | Supabase (Postgres, Auth, Row Level Security, Edge Functions, Realtime) | Free tier during build; Pro ($25/mo) at public launch (free projects pause after 7 days inactive). |
| Photo storage | Cloudflare R2 | Uploads via presigned URLs from a Supabase Edge Function. Store original + display size + thumbnail. |
| Auth | Sign in with Apple, Google, email magic link | Apple sign-in required on iOS if other social logins offered. |
| Push | Expo Notifications | |
| Payments | RevenueCat (`react-native-purchases`) | Free until $2,500 monthly tracked revenue. Webhook → Supabase `entitlements`. |
| Widgets | iOS: WidgetKit via an Expo target (e.g. `expo-apple-targets`). Android: `react-native-android-widget` (or native Glance) | Verify current best option at build time. |
| Share | Native share sheet + Instagram Stories share (verify Meta's current Stories sharing requirements, may need a Facebook App ID) | |
| Video export | Spike in v0.7 (see that version) | |
| Analytics | PostHog (verify free tier) or a Supabase `events` table | Must not include photo content. |
| Remote config | Supabase table `app_config` + `catalog_items` | Drops, prices, limits, develop time. |
| Join web page | Tiny static page (Cloudflare Pages or Supabase hosting) at `poto.app/j/CODE` | Detects iOS/Android → store link; shows code to type after install. |

---

## 6. Data model (Supabase / Postgres)

All tables have `id uuid pk`, `created_at`, `updated_at`. RLS on every table.

- **profiles**: user_id (auth), username (unique), display_name, avatar_url, birth_year_confirmed_13plus bool, bio (≤80), pinned_photo_ids uuid[], streak_current int, streak_best int, freezes_left int, timezone, is_plus bool (derived), is_public bool (default false), is_minor bool (13–17, derived from age gate), profile_style jsonb (cover, paper, header stickers), deleted_at.
- **friendships**: requester_id, addressee_id, status (pending/accepted/blocked).
- **rolls**: owner_id, type (personal | shared), look_id, exposures_total, exposures_used, status (loaded | finished), for shared: title, kind (trip/party/wedding/custom), shots_per_person, guest_limit, prompts text[], reveal_at timestamptz, revealed bool, join_code (6 chars, unique), visibility_after_reveal (host_only | members), cover_photo_id.
- **roll_members**: roll_id, user_id, role (host | guest), shots_used, joined_at.
- **photos**: owner_id, roll_id (nullable for imports), source (camera | import), look_id, taken_at, place_label (nullable, opt-in), r2_key_original, r2_key_display, r2_key_thumb, width, height, status (developing | kept | shared | tossed), visibility (private | friends | public | roll), hidden_until_reveal bool, lens_id (nullable), settings jsonb (exposure, flash, zoom, double_exposure), featured_until (nullable, admin only).
- **mail_envelopes**: sender_id, note (≤150), stamp_id, created_at, recalled_at (nullable).
- **mail_items**: envelope_id, photo_id, recipient_id (or invite_token for non-users), delivered_at, opened_at, recipient_copy_key (R2 copy owned by recipient), pinned bool, display_public_allowed bool (snapshot of sender setting).
- **photo_tags**: photo_id, tagged_user_id (photos of you).
- **postcards**: photo_id (1:1), message (≤150), text_style (typewriter | calligraphy), ink_id, paper_id, stamp_id, to_user_id (nullable), stickers jsonb ([{sticker_id, x, y, scale, rotation, z}] max 5), updated_at.
- **catalog_items**: kind (look | lens | paper | ink | sticker_pack | stamp | weekly_theme | daily_prompt), slug, name, asset_urls jsonb, tier (free | plus | paid_addon), price_product_id (nullable), drop_at, available_until (nullable), sort, is_active.
- **user_items**: user_id, item_id, acquired_via (default | drop | purchase | milestone).
- **streak_days**: user_id, day (date in user tz), photos_count. (Friend/group streaks derived via views.)
- **recaps**: user_id, week_start, photo_ids uuid[], featured_by_friends uuid[], generated_at, shared bool.
- **reports**: reporter_id, target_type (photo | user | postcard | roll), target_id, reason, status.
- **blocks**: blocker_id, blocked_id.
- **entitlements**: user_id, entitlement (plus), expires_at, source (revenuecat).
- **roll_purchases**: roll_id, buyer_id, product_id, guest_limit_granted.
- **app_config**: key, value jsonb (develop_seconds, roll_size, free_shared_guest_limit, prices, feature flags).
- **events** (if not using PostHog): user_id, name, props jsonb, ts.

**Key RLS rules**
- Photos with `hidden_until_reveal = true` are readable **only by their owner** until the roll is revealed. Host can read the **count** only (via a SECURITY DEFINER function), never the images.
- Friends can read photos with visibility `friends` from accepted friends who haven't blocked them.
- Roll members can read revealed roll photos according to `visibility_after_reveal`.
- R2 keys are never public; the app gets short-lived signed URLs from an Edge Function that checks the same rules.

---

## 7. Assets Claude Code generates (drafts for Cody)

Put source + scripts in `/assets-src`, outputs in `/assets`.

### 7.1 Film looks (launch: 3)
Write a script (Python or Node) that generates 33×33×33 `.cube` LUTs + a preview grid on 6 reference photos (Cody will supply references; use neutral test images until then). Each look = LUT + grain amount + optional light-leak + date stamp default + flash/vignette setting, stored as a JSON preset.

Draft looks (names are placeholders, no brand names):
1. **Sunday** — warm, soft highlights, lifted blacks, gentle grain, slight yellow-orange cast. Everyday look.
2. **Harbour** — cool, green-cyan shadows, muted reds, medium grain. Travel/city.
3. **Flashbulb** — 2000s digicam: punchy contrast, slight overexposed centre, harsh flash feel, orange date stamp ON by default, light vignette.

Keep 2–3 extra drafts (e.g. **Ink** B&W, **Peach** pastel) in `/assets-src/looks/drafts` for future drops — not shipped.

Rules: never name or describe looks after real film stocks or camera brands (trademarks).

### 7.2 Papers (launch: 2)
Generate procedural textures (noise + fibres) at 2× and 3×: **Cream** and **Kraft**. Drafts for later: Airmail (striped border), Blueprint.

### 7.3 Inks (launch: 2)
Black (#1E1E1E) and Navy (#1F2A44), with a subtle edge-bleed effect on text. Drafts for later: Sepia, Red.

### 7.4 Stamps & postmark (launch: 1 stamp + postmark)
SVG: one original postage stamp design (perforated edge, simple illustration of a camera or sun) and a circular postmark with date/city/look text slots.

### 7.5 Starter stickers (launch: 12)
Original SVG doodles in a consistent hand-drawn style (single stroke weight, 2–3 colours from the palette): heart, star, sun, arrow, squiggle underline, tape strip, ticket stub, paper plane, flower, tiny camera, "wish you were here" label, airmail stripe. No brand logos, characters, or copyrighted designs.

### 7.6 Sounds
Shutter, film advance, developing shimmer, flip whoosh, sticker pat, typewriter (key ×3 variants, space, carriage return, bell), nib scratch. Source **CC0** sounds (list source + licence in `LICENSES.md`) or synthesise; Cody may replace with his own recordings. Keep each file short and normalised.

### 7.7 Typewriter illustration
An original, minimal vector typewriter (front view, keys + typebars + carriage), animatable parts as separate layers.

---

## 8. Monetization (all values remote-configurable)

**Free**
- Camera with the 3 launch looks (plus any free drops)
- Personal rolls, developing, postcards (both text styles), 2 papers, 2 inks, 12 stickers
- Friends, feed, widget, photos of you, streaks, recaps
- Shared Rolls up to **8 guests** (config `free_shared_guest_limit`) — perfect for trips and dinners, the growth engine
- Export with postmark

**Poto Plus — $4.99/month, $39.99/year** (RevenueCat entitlement `plus`)
- Plus-tier drops (looks, papers, inks, stickers) as they release
- Unlimited Shared Rolls up to **25 guests** included, and **20% off** bigger roll tiers
- Plus-tier lenses as they drop
- Unlimited cloud history & backup (free tier: config, e.g. last 12 months visible; export always free)
- Option to hide postmark on exports (default ON for everyone — test whether to offer this at all)
- Yearly book PDF (v2)

**Shared Roll tiers (one-time per roll, host pays, guests always free — Kahoot-style)**

| Tier | Guests | Price (placeholder, remote config) | Product ID |
|---|---|---|---|
| Free | up to 8 | $0 | — |
| Party | up to 25 | $4.99 (free with Plus) | `roll_25` |
| Big Party | up to 50 | $9.99 | `roll_50` |
| Event | up to 100 | $19.99 | `roll_100` |
| Wedding | up to 250 | $39.99 | `roll_250` |
| Wedding+ | up to 500 | $59.99 | `roll_500` |

- Host can upgrade a roll's tier later (pays the difference — implement as buying the higher tier with a credit, or simply the higher tier; confirm approach with Cody).
- Positioning: nicer than POV and cheaper at the top end (POV is ~$89.99 for 250 guests).
- Plus discount (20%) implemented as separate discounted products or offer codes — check what RevenueCat/stores support and ask Cody.

**Add-ons**
- Limited drop packs $0.99–1.99.

**Never**
- Sell streak repairs, paywall friends' photos, hold photos hostage, ads.

Paywall appears: when tapping a Plus item, when a Shared Roll exceeds the free limit, and once after the user's first Sunday recap (soft, dismissible). Use RevenueCat paywall or a custom one matching the design system.

---

## 9. Build versions

Each version: **Goal → Scope → Out of scope → Technical notes → Acceptance criteria → Cody's test checklist.**

---

### v0.1 — Foundations + Camera (offline, solo)

**Goal:** A beautiful camera that feels like loading and shooting a real film roll. Everything local, no accounts.

**Scope**
- Expo project (TypeScript, Expo Router), EAS dev builds for iOS + Android, folder structure, lint/format, design tokens (Section 4), fonts loaded.
- Asset pipeline: generate the 3 launch looks (7.1) with preview grids; sounds placeholder set.
- **Load a roll** screen: choose 1 of 3 looks (big preview cards, name, one-line description). Confirm modal: "This roll is locked to SUNDAY for 27 shots."
- **Camera** (home): plain viewfinder (no filter), shutter button, exposures counter ("14/27"), current look name. Shutter sound + haptic. Film-advance sound after each shot.
- **Camera controls (per shot, tucked away so the camera stays simple):** exposure compensation slider, flash on/off/auto, timer (3s/10s), grid toggle, front/back switch, zoom steps (0.5×/1×/2× where the device supports them), date stamp on/off, double exposure (take two shots → blended). Controls must be one tap away but not clutter the viewfinder.
- **Lens system (architecture only in v0.1):** build lenses as post-capture effects in the Skia pipeline (fisheye, prism, starburst, colour flash, soft focus, half-frame), each with a framing guide overlay for the viewfinder. Ship **no lenses enabled** at v0.1 except for internal testing; they release later as drops (v0.8).
- **Processing pipeline (Skia, offscreen):** apply LUT + grain + vignette/flash + optional date stamp to the captured still; save original + processed JPEG locally.
- **Developing card:** blank card → reveal over `develop_seconds` (default 8). Then actions: Keep / Toss. (Share comes in v0.4.)
- Roll finished state: "Roll complete" → load new roll.
- **Diary/Calendar:** month view with tiny thumbnails per day; tap day → that day's photos; tap photo → full view (postcard front, see v0.2 — for now plain photo with caption line).
- Local DB (SQLite) for rolls and photos.
- Permissions flow (camera, photo library save) with friendly copy.

**Out of scope:** accounts, cloud, friends, postcards back, stickers, streaks, events.

**Technical notes**
- Capture at full resolution; process a display version (e.g. long edge 2048) and keep the original.
- Processing must not block the UI; show the developing card immediately.
- Store looks as JSON presets referencing LUT assets so drops can add looks later.

**Acceptance criteria**
- Shoot 27 shots on both platforms; counter correct; roll locks; new roll can be loaded with a different look.
- Processed photos look identical on iOS and Android for the same look (compare test images).
- Time from shutter to developing card < 300 ms; processing finishes before the reveal ends on a mid-range phone.
- App works fully offline.

**Cody's test checklist**
- Use it daily for 3+ days. Does loading a roll feel intentional? Do the 3 looks feel distinct and "film"? Is 8 s develop too long/short? Do Keep/Toss feel right?
- Tweak looks: Cody edits LUTs in Photoshop/Lightroom → re-export `.cube` → drop into `/assets-src/looks` → re-run script.

---

### v0.2 — The Postcard

**Goal:** Every photo becomes a postcard: minimal front, creative back with animated typewriter and calligraphy.

**Scope**
- **Front:** white border, caption line (`look · date · place?`), postmark watermark (Section 4).
- **Flip** interaction (tap or swipe) with 3D animation + sound.
- **Back editor:**
  - Message input ≤150 chars, optional "to:" line.
  - **Typewriter style:** animated typewriter illustration (7.7) reacts to each keystroke; per-key sounds; bell near line end; carriage return on newline; mute toggle. Text renders in typewriter font with ink colour and subtle uneven baseline/pressure for realism.
  - **Calligraphy style:** script font; on save and when viewed, text plays a writing reveal animation with nib sound.
  - Paper picker (Cream, Kraft), ink picker (Black, Navy), stamp (1), postmark auto-filled.
  - Stickers: tray of 12; drag, pinch to scale, rotate; max 5; delete by dragging to bin; peel animation + sound.
  - Edit anytime; autosave locally.
- **Export (stills):** front only, back only, or front+back side by side; save to photos / native share sheet / Instagram Stories (9:16 canvas with the postcard centred on `paper` background).
- Locked item states: show "dropping soon" placeholders in pickers (non-interactive) to tease drops.

**Out of scope:** video export (v0.7), cloud, friends.

**Technical notes**
- Render postcard back as a Skia scene (paper, text, stickers, stamp) so it can be exported at high resolution and later turned into video frames.
- Typewriter animation must keep up with fast typing (debounce sounds, max polyphony ~4).

**Acceptance criteria**
- Flip smooth (60 fps on mid-range devices).
- Exported images crisp (≥1080 px wide for Stories) and identical in layout to on-screen.
- Calligraphy reveal plays on open; typewriter sounds sync with keys; mute works; silent mode respected.

**Cody's test checklist**
- Is the front quiet enough? Does the back feel delightful? Typewriter/calligraphy feel real? Sticker art style right? Would you post the export?
- Tweak: fonts, sizes, paper textures, sticker art, sound choices.

---

### v0.3 — Accounts + Cloud Sync

**Goal:** Photos and postcards are safely backed up and sync across devices.

**Scope**
- Supabase project; auth with Apple, Google, email magic link.
- Onboarding: welcome → **age gate (13+)** → username (unique) + display name → avatar (optional) → permissions → load first roll.
- Upload pipeline: offline-first queue; upload original + display + thumbnail to R2 via presigned URLs; retry with backoff; works after app restart; progress indicator in diary.
- Sync postcards (back content) and rolls.
- Settings: account, privacy, **export all my photos** (zip or save to device), **delete account** (in-app, deletes data + R2 objects via Edge Function), sign out, licences, terms, privacy policy links.
- Free import into diary (tagged "imported", never shareable to feed/rolls).

**Out of scope:** friends, feed, events.

**Technical notes**
- RLS everywhere from day one. Signed URLs short-lived.
- Image sizes: original (as captured), display long edge 2048, thumb 400.

**Acceptance criteria**
- Kill the app mid-upload, reopen → uploads resume and finish.
- New device sign-in → full diary restores.
- Delete account removes DB rows and R2 objects (verify).

**Cody's test checklist**
- Sign up flow < 60 seconds? Anything confusing? Try airplane mode → shoot → reconnect.

---

### v0.4 — Friends, Feed, Profiles, Photos of You

**Goal:** Share with real friends.

**Scope**
- Add friends: by username, by invite link (`poto.app/u/username`), by contacts (optional, hashed, ask permission), by QR on profile.
- Friend requests, accept, remove, **block**, **report** (user/photo/postcard).
- After develop: **Share to friends** action (plus Keep / Toss). Choose: all friends or close friends list (simple list).
- **Feed:** chronological, friends only, postcards (tap to flip, see back with animation). Reactions: a small set of stamps/emoji (private to the poster, no public counts). Comments: short text, visible to poster + commenter only (keep simple).
- **Profiles:** avatar, name, streak flame, pinned photos (up to 6), albums (shared rolls they hosted/joined, if visibility allows), "hosted events" row. Profile should feel personal and decorated (choose cover postcard, paper style, a few stickers on the profile header) — a page people are proud to share.
- **Public profiles (opt-in):** toggle "Make my profile public" → shareable link `poto.app/@username` (simple web page showing the public postcards with flip). Per-photo visibility: Private / Friends / Public. Default Friends. Users 13–17 default to friends-only and see an extra confirmation before going public.
- **Featured (curated, no algorithm):** a small section showing public rolls/profiles hand-picked by Cody via an admin flag (`featured_until`). Chronological within Featured. No public like counts anywhere.
- **Mail (send postcards to friends):**
  - Sender picks **one or more postcards** (up to 10 per envelope, config) and **one or more friends**, writes an optional short note on the envelope, picks a stamp → "sealing" animation + sound → sent.
  - Recipient gets a push ("You've got mail from Dana 📮"). In their **Mailbox**, an envelope slides in; tap to open → postcards slide out one by one → each flips to show its back, with the typewriter/calligraphy playback.
  - **Ownership:** the recipient gets their own copy, kept even if the sender later deletes the original. They can **pin received postcards to a "Received" wall on their profile**, each marked with a small "from @dana" stamp.
  - **Unsend:** sender can recall an envelope while it is still **unopened**.
  - **Public display consent:** received postcards only show on a public profile if the sender allows it (setting "Let friends display my postcards publicly"; asked once when the sender's profile is friends-only, on by default if the sender's profile is public).
  - **Send to non-users:** generates a private link ("Dana sent you a postcard"); the web page shows only the envelope + a blurred teaser; opening requires the app. Link token is unguessable, single-recipient and expires (config, e.g. 30 days).
  - Both ways of sharing exist: **Feed** = broadcast to all/close friends; **Mail** = personal, to specific people.
- **Photos of you:** tag friends in a photo → they get it ("Dana captured you") in a "Of you" tab on their profile (private to them unless they pin it).
- Push notifications: friend request, new photo from close friend (batched), tagged in photo, reaction, postcard received.
- **Ask for push permission only after the user's first developed photo** (with a soft pre-prompt explaining why). Cap at ~1 push per day per user (config), quiet hours at night.
- Moderation for public content: report on any public photo/profile, host/admin removal, and an admin queue (simple Supabase view is fine for now).

**Out of scope:** events, streaks, recaps, widgets.

**Acceptance criteria**
- Two accounts on iOS + Android can friend each other, share, react, tag, block, report.
- Blocked users can't see each other anywhere.
- No public counts anywhere.

**Cody's test checklist**
- Do this with 2–3 friends for a week. Does the feed feel personal? Is sharing one tap? Do tagged photos feel special?

---

### v0.5 — Shared Rolls (Events, Trips, Weddings)

**Goal:** Everyone at an event shoots into one roll; the host reveals them together. Core viral loop.

**Scope**
- **Create Shared Roll** (host): title, kind (Trip / Party / Wedding / Custom), look (locked), shots per person (e.g. 5/10/15/27/unlimited for Plus), optional prompts (host writes up to 10; loose, fun suggestions provided per kind), reveal time (at a time / when host taps reveal), guest tier (Free 8 / Party 25 / Big Party 50 / Event 100 / Wedding 250 / Wedding+ 500 — see Section 8), visibility after reveal (host only / all members), cover.
- **Invite:** big QR + 6-char code + share link `poto.app/j/CODE`. Printable QR card (PDF/PNG) for tables and signage, in Poto style.
- **Join web page** (`/j/CODE`): shows roll title + host name + cover, detects platform → App Store / Play Store button; tells guest to enter code after install (and copies code to clipboard).
- **In-app join:** "Join a roll" → enter code (or paste/scan QR) → roll card → join. Works for brand-new users right after onboarding (prompt "Got a roll code?").
- **Guest camera mode:** roll banner (title, shots left, current prompt), prompts rotate/tap to see next.
- **Uploads:** each shot uploads immediately (offline queue), stored `hidden_until_reveal = true`. Guest sees their own shots as "developing — reveals at 9 PM".
- **Host dashboard:** live counters (guests joined, shots taken, per-prompt counts), no previews. Reveal button / scheduled reveal. Extend reveal time. Remove guest. Lock roll (no new joins). Rotate join code. Optional "approve guests" mode.
- **Upgrade when full (pay the difference):** when the guest limit is reached, new joiners see "Asking the host to make room…" and the host gets a prompt: "4 more people are trying to join. Make room?" → one-tap upgrade to the next tier. Host pays only the difference (implemented in v0.8 as one-step upgrade products; placeholder button in v0.5).
- **Reveal:** push to all members; animated reveal screen ("The roll has developed"); host gallery (all photos, filter by guest/prompt), select favourites, download all (zip / save), share selected; guests get their own photos + album per visibility setting.
- **Film reel (in-app only):** auto slideshow of the roll with film transitions + film sound, viewable in the app. Hosts share selected photos as stills. No reel video export for now.
- Cross-platform: iOS and Android guests in the same roll — test explicitly.
- Abuse: host can remove photos; members can report.

**Out of scope:** web gallery for non-users, App Clip, video export.

**Technical notes**
- Reveal is enforced server-side (RLS + signed URL function), not just hidden in the UI.
- Scheduled reveal via a Supabase scheduled function/cron.
- Large events: paginate gallery; thumbnails first.
- Guest limit and shots-per-person enforced server-side.

**Acceptance criteria**
- 1 host + ≥3 guests (mix iOS/Android) complete a full event: join via QR, shoot offline and online, reveal, everyone sees the right photos.
- No way for host or guests to see hidden photos before reveal (try via API).
- Guest limit enforcement and paywall trigger point exist (paywall itself in v0.8 — for now show a placeholder; free tier = 8 guests).

**Cody's test checklist**
- Run a real dinner/trip with friends. How long does joining take from QR scan to first shot? Is the reveal moment exciting? Would the host share the reel?

---

### v0.6 — Streaks + Sunday Recap

**Goal:** Daily habit and weekly shareable moment.

**Scope**
- **Daily shot streak:** ≥1 kept shot per local day. Streak flame on camera screen and profile.
- **Freezes:** 2 free per month (config), auto-used on a missed day; shown in UI.
- **Friend streak:** with any friend, both shoot on the same day; shown on their profile/feed.
- **Group roll streak:** for Shared Rolls of type Trip lasting multiple days (everyone shot that day).
- **Bug protection:** if uploads failed due to app/server errors, streak is restored automatically.
- **Milestone cards** at 7/30/100/365 days: special postcard design + a milestone **stamp** unlocked (user_items). Shareable.
- Gentle reminder push in the evening if no shot yet today (user can turn off). No guilt copy.
- **Photo prompt of the day (optional, playful, low-stakes):** e.g. "something blue", "what's on your table". Never required for the streak. Can be turned off.
- **Weekly theme:** one loose theme per week (e.g. "windows"); friends' takes reveal together on Sunday inside the recap. Themes from remote config.
- **Monthly contact sheet:** first of each month, an auto contact sheet (grid of the month's frames like a film contact sheet) — shareable still.
- **On this day:** in the diary, resurface photos from the same date in past months/years (shows once the user has history).
- **Roll finished moment:** when a 27-shot roll ends, a small "roll developed" celebration showing the full roll as a strip, then prompt to load the next roll.
- **Sunday recap:** generated Sunday morning (user tz): stack of the week's kept/shared postcards + "how your friends saw you" (photos they were tagged in). Flip-through viewer. Share to Stories as stills (a single 9:16 image of the stacked postcards, plus individual cards). No recap video for now. Push "Your week developed."

**Acceptance criteria**
- Streak math correct across time zones and DST; freezes work; restore works.
- Recap generated for test users with correct photos.

**Cody's test checklist**
- Does the streak motivate without stress? Is the recap worth posting?

---

### v0.7 — Widgets + Postcard Flip Video

**Goal:** Presence on the home screen and the single most shareable format: the postcard flip video.

**Scope**
- **Widgets (iOS + Android):** small = latest friend postcard; medium = 3 latest; tap opens photo. Also "your streak" small widget. Refresh via push/background where the OS allows.
- **Video export spike first (1–3 days):** choose the approach and document it in `/docs/video-export.md`:
  - (a) Render Skia frames on device and encode with native encoders (AVAssetWriter on iOS, MediaCodec on Android) through a small native module, or
  - (b) An existing maintained RN library that encodes image sequences to MP4 (verify maintenance), or
  - (c) Fallback: export animated stills only.
- Then build **only the postcard flip video** (3–4 s, 9:16, front → flip → back with writing/typing animation → postmark). Include subtle sound (flip/typewriter or nib). Small "poto" end card (1 s).
- Share to Stories / TikTok / save.
- **Not in this version:** recap video and event film reel video. Recaps and event reels export as stills only for now (see "Later").

**Acceptance criteria**
- Exports play correctly on both platforms and upload to Instagram/TikTok without re-encoding issues; file size reasonable (< 15 MB for 4 s).

**Cody's test checklist**
- Would you post these? Is the end card too much or just right?

---

### v0.8 — Plus, Paywall, Drops

**Goal:** Revenue and exclusivity.

**Scope**
- RevenueCat setup (iOS + Android products): `plus_monthly` $4.99, `plus_annual` $39.99, consumables `roll_25`, `roll_50`, `roll_100`, `roll_250`, `roll_500` (+ Plus-discounted variants if needed), drop packs. Webhook → `entitlements` / `roll_purchases`.
- **Roll upgrade products (pay the difference):** one-step upgrade consumables `up_8_25` ($4.99), `up_25_50` ($4.99), `up_50_100` ($9.99), `up_100_250` ($19.99), `up_250_500` ($19.99) — prices = difference between tiers, rounded to store price points, all in remote config. Multi-step jumps: offer combined upgrade products or chain steps (ask Cody). Validate every purchase server-side via RevenueCat before raising the limit.
- **Lens drops:** enable the lens system from v0.1 — lenses appear in a lens tray on the camera, released through the drops catalog (kind `lens`), some free, some Plus, some limited.
- Paywall screen in Poto's design (or RevenueCat Paywalls themed). Restore purchases. Manage subscription link.
- Gate Plus features (Section 8) and Shared Roll guest tiers (Free 8 → Wedding+ 500), with the tier chosen at roll creation and upgradable later.
- **Drops system:**
  - `catalog_items` drives looks/papers/inks/stickers/stamps; app fetches catalog on launch.
  - "Drops" section: next drop card with countdown, past drops; locked items visible as "coming soon" teasers.
  - On drop: push notification "New look dropped: HARBOUR NIGHT"; item appears in pickers per tier (free / plus / paid add-on / limited-time).
  - Assets download on demand and cache.
- Remote config for prices/limits.

**Acceptance criteria**
- Sandbox purchases work on both stores, entitlements sync, restore works, expiry removes access gracefully (photos already made keep their look).
- A drop can be scheduled from the database and appears at the right time without an app update.

**Cody's test checklist**
- Does the paywall feel premium and honest? Do drops feel exciting? Pricing feel right?

---

### v0.9 — Safety, Polish, Analytics, Store Prep, Beta

**Goal:** Ready for 30–50 beta testers (10–15 friend groups).

**Scope**
- **Run the full security audit in Section 13** and deliver `/docs/security-audit.md`.
- Safety: report flows reviewed, block everywhere, content moderation queue (simple admin view in Supabase or a tiny web admin), contact email in app, community guidelines page.
- Privacy: privacy policy + terms (Cody to review; plain language for 13–17), PDPA-friendly consent copy, data export + deletion verified, location off by default, no ads/tracking SDKs.
- Apple Guideline 1.2 (UGC) checklist: filter/report/block/contact info. Age rating questionnaires (App Store + Play).
- Analytics events (no photo content): onboarding_completed, roll_loaded, shot_taken, shot_kept, shot_tossed, photo_shared, postcard_written, sticker_used, export_shared (type, destination), friend_added, tag_sent, shared_roll_created, shared_roll_joined (platform, time_to_first_shot), shared_roll_revealed, recap_viewed, recap_shared, streak_day, paywall_viewed, purchase_completed, drop_viewed.
- Performance pass (cold start, memory on long galleries), accessibility (VoiceOver/TalkBack labels, dynamic type where sensible, reduce motion).
- Store assets: icon, screenshots (lead with the postcard flip), preview video, descriptions, keywords ("film camera", "disposable camera", "photo journal", "wedding photo sharing", "postcard"), privacy labels / data safety form.
- TestFlight + Google Play closed testing; in-app feedback button.
- Crash reporting (e.g. Sentry free tier — ask first).

**Acceptance criteria**
- Zero known crashers; all flows pass on 2 iOS + 2 Android devices (incl. one older/mid-range Android).
- Store submissions pass review in TestFlight/closed testing.

---

### v1.0 — Public Launch

**Scope**
- Fix beta feedback (only what testers hit most).
- Supabase Pro plan on (Cody approves cost).
- Production builds submitted to App Store + Google Play.
- Launch-day drop (a new look) to create a moment.
- Monitoring dashboard for Section 11 metrics.

---

### Later (v1.x / v2 — do not build now)
- Recap video and event film reel video exports (reuse the v0.7 video pipeline).
- **Explore:** browse public postcards by look, place or theme (chronological or curated, still no public like counts). Algorithmic recommendations only if data shows demand.
- **Manual mode** (ISO/shutter) as a Plus feature.
- Yearly book PDF → printed books via a print partner.
- Video clips in rolls; lightweight editor.
- App Clip / instant join; web gallery for non-users.
- Couples / group Plus plan.
- More aspect ratios; more text styles; handwriting from your own font.
- Seasonal events (Lunar New Year, Christmas stamp packs).

---

## 10. Copy guidelines
- Short, warm, lowercase-friendly, no hype.
- Examples: "Load a roll." · "This roll is locked to SUNDAY. 27 shots." · "Developing…" · "Your week developed." · "You showed up in 3 photos this week." · "The roll has developed." · "New look dropped."
- Never guilt-trip about streaks ("No pressure — your freeze has you covered.").
- Encourage shooting anything, never "great" or "perfect" photos: "Shoot anything." · "Doesn't have to be good. It's film." · "Your lunch counts." Avoid words like best, perfect, top, rate, score.

---

## 11. Metrics (targets are guesses to validate in beta)

| Metric | Beta target |
|---|---|
| Users shooting ≥4 days/week | ≥30% |
| Day-30 retention | ≥15% |
| Recap shared to Stories | ≥15% of weekly actives |
| Invites/joins generated per new user | ≥1 |
| Shared Roll: QR scan → first shot | < 3 minutes median |
| Shared Roll guests still active after 2 weeks | ≥10% |
| Paywall conversion | ≥2% |

**Decision after 6 weeks of beta:** if D30 < 10% and recap share rate is near zero → rethink. If Shared Rolls perform but daily use doesn't → consider leading with events.

---

## 12. Status (Claude Code updates this)

| Version | Status | Notes |
|---|---|---|
| v0.1 Foundations + Camera | not started | |
| v0.2 Postcard | not started | |
| v0.3 Accounts + Cloud | not started | |
| v0.4 Friends + Feed | not started | |
| v0.5 Shared Rolls | not started | |
| v0.6 Streaks + Recap | not started | |
| v0.7 Widgets + Postcard Flip Video | not started | |
| v0.8 Plus + Drops | not started | |
| v0.9 Beta prep | not started | |
| v1.0 Launch | not started | |

---

## 13. Security, privacy & abuse (apply in every version; full audit in v0.9)

**Golden rule:** the client is never trusted. Limits, entitlements, reveals, drops availability and streaks are enforced **server-side** (RLS, Edge Functions, server timestamps).

### Monetization exploits
| Exploit | Fix |
|---|---|
| Plus user mails photos to free friends so they "get" Plus looks | Allowed and fine: the look is baked into the photo; the friend can't **shoot** with it. Received postcards show "Shot on HARBOUR · Plus look" as a soft upsell. |
| Free user sends their photos to a Plus friend to process | Looks/lenses can only be applied at capture inside a roll, never to imports or received photos. |
| Plus host creates a never-ending 2-person Shared Roll so a free friend can use Plus looks forever | Shared Rolls have a max duration (config, e.g. 14 days) and per-person shot caps; max active Shared Rolls per host (config, e.g. 3). Plus looks in someone else's roll are a taste, not a free subscription. |
| Host splits a 200-guest wedding into many free 8-guest rolls | Max active free Shared Rolls per host (config, e.g. 2); one code per roll; rate-limit roll creation. Accept small leakage. |
| Buy a wedding tier, then refund through the store after the event | RevenueCat refund webhook → roll reverts to the paid tier's limits being frozen: no new joins, no "download all" in full resolution; existing photos stay viewable. Confirm the exact policy with Cody. |
| Fake purchase / tampered app unlocking Plus | Entitlements only from RevenueCat server data → Supabase `entitlements`; never from client flags. Plus assets served via signed URLs that check entitlement. |
| Getting limited drops early/late by changing the phone clock | Drop availability decided by server time; assets only downloadable when the server says they're live. |
| Account sharing of Plus | Low priority. Store subscriptions are tied to the store account; accept. |

### Product/integrity exploits
| Exploit | Fix |
|---|---|
| Faking "live" photos (virtual camera, emulator, jailbreak) | Can't be fully prevented. Basic checks (capture source flags, emulator detection where cheap); don't over-engineer. |
| Streak cheating by changing clock/timezone | Streak days computed from server timestamps + the user's saved timezone; timezone changes rate-limited (e.g. once per 24 h). |
| Seeing Shared Roll photos before reveal | RLS + signed-URL function check `revealed`; thumbnails also hidden; R2 keys random and unguessable; signed URLs expire in minutes. Test via direct API calls. |
| Guessing join codes | 6+ character codes from a large alphabet, rate-limited join attempts per device/IP, host can lock/rotate code or require approval. |
| Mail spam / harassment | Only accepted friends can mail; per-user daily send caps; block stops all mail instantly; report on any envelope. |
| Non-user postcard links forwarded/leaked | Token single-use to claim, expires, web shows only blurred teaser; full image only inside the app after claiming. |
| Bots abusing free storage | Daily upload caps for free users (config), account age limits on Shared Roll creation, Apple/Google sign-in reduces fake accounts. |

### Privacy
- **Strip GPS/EXIF location** from every uploaded and exported image. Place labels are opt-in and city-level only.
- **Minors (13–17):** friends-only by default, extra confirmation before going public, can only receive mail from accepted friends, not shown in Featured unless Cody explicitly approves.
- **Screenshots:** Poto *wants* sharing, so don't block screenshots by default. Protection comes from the postmark on exports, low-resolution images on public web pages, and "from @user" stamps. Optional later: screenshot alerts on mail (iOS can detect after the fact; Android can block via FLAG_SECURE) — ask Cody before adding, as it may conflict with the no-pressure feel.
- **Photo stealing / reposting:** public web pages serve watermarked, reduced-size images; report flow includes "someone reposted my photo" and impersonation.
- **Deletion:** deleting an account removes the user's photos, postcards and R2 objects. Copies already delivered by mail belong to recipients (state this clearly in the privacy policy and in the delete confirmation).
- **Data minimisation:** no ads SDKs, no tracking, analytics without photo content.

### Security audit task (v0.9)
Claude Code runs a full review before beta: RLS policy tests for every table, attempt every exploit above via direct API calls, dependency vulnerability scan, secret scan of the repo, rate-limit tests on Edge Functions, and a written report in `/docs/security-audit.md` for Cody.

---

## 14. Things Cody must do (not Claude Code)
- Confirm the name **Poto**: App Store, Play Store, Instagram/TikTok handles, domain (e.g. poto.app).
- Apple Developer account ($99/yr) and Google Play Console (one-time fee — verify amount).
- Review and tweak every generated look, paper, ink, stamp, sticker, sound.
- Supply 6 reference photos for look previews.
- Approve fonts and their licences.
- Review privacy policy/terms (ideally a quick legal check).
- Start content: 3–5 posts/week (roll reveals, postcard flips, build-in-public), waitlist page, recruit 10–15 friend groups for beta.
