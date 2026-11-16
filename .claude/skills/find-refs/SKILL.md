---
name: find-refs
description: Find design references on Pinterest for Cody and put them on a selectable board (grid + spreadsheet) in his Poto artifact. Use when Cody says "find refs", "find references", "/find-refs", "look on Pinterest for…", or asks for reference images for any part of the app.
---

# find-refs: a reference sweep for Cody

Cody wants references found the way he browses Pinterest: search, open a pin he'd like, scroll to **More like this**, take the good ones, go back, repeat. Then everything lands on a board in his artifact where he ticks the ones he likes and I read his picks. **Never put photos on the board blind: every image is looked at and judged first.**

## 1. Ask before searching (always)

Ask in one message, and wait for the answers (use AskUserQuestion if it's available):
1. **What is this for?** The screen or element (e.g. "the camera's develop screen", "stamp shapes", "loading states").
2. **What to search.** His own words / keywords. If he gives one phrase, propose 6–10 related searches you'd add (synonyms, the technique, the object, the mood: e.g. "frosted glass" → "frosted glass ui", "etched glass texture", "glassmorphism dark", "ios 26 liquid glass", "translucent card ui") and let him strike or add.
3. **Seed images: ask him for 2–5 he already likes** (pin links, his board, or images in chat). These set the bar: describe what they share (palette, density, material, motion, type) in a one-line brief before searching, and judge every result against it.
4. Logged in or not: if his computer is attached and logged in to Pinterest, use the logged-in path (2a). Otherwise say the logged-out path can't open single pins ("More like this") and offer to wait.

## 2a. Sweep, logged in (his computer, the Claude app's built-in browser)

Read the `anthropic-skills:built-in-browser` skill first. Then, per search:
- open `https://www.pinterest.com/search/pins/?q=<search>`; scroll 2–3 screens
- open the **pins that match the brief** (judge from the grid: skip ads, infographics, stock mockup packs, off-topic); on each pin page scroll to **More like this** and collect 15–30 of those pins; go back; next pin
- 5–8 pins opened per search, depth 1 (optionally depth 2 from the very best pin)
- record each pin as `{img (736x url), small (474x url), w, h, title, tag (the search), via ("search" | "more like <pin id>")}` into `OUT/pins.json`
- also take his seed pins' **More like this** first: they're the most accurate source
Be polite: a couple of seconds between pages; stop if Pinterest asks to verify.

## 2b. Sweep, logged out (this container, headless Chromium)

```
OUT=<scratchpad>/refs-<slug>; mkdir -p $OUT
# queries.json: the agreed searches
node .claude/skills/find-refs/scripts/crawl.js $OUT 3 [/user/board/]     # run in the background; ~15 s per page
```
Browser: Playwright's Chromium with `proxy: {server: process.env.HTTPS_PROXY}`. **Never** disable certificate checks (`--ignore-certificate-errors`, `ignoreHTTPSErrors`): the container's browser already trusts the proxy.
Logged out, pins have no links and single pins don't open, so the script follows each search's **refinement chips** one level down, and a board's **More ideas** feed if given. Chips wander (a glass search offered "Fast food", "Underwater"): after the crawl, read the chip list in its log and put off-topic ones in `OUT/offtopic.json` as `["chip: Fast food", ...]`.

## 3. Curate (the step that matters)

```
python3 .claude/skills/find-refs/scripts/pack.py $OUT        # download, de-duplicate, one 474px copy each
python3 .claude/skills/find-refs/scripts/review.py $OUT 48   # numbered contact sheets in $OUT/review/
```
Read **every** contact sheet. Reject (write the numbers to `$OUT/reject.json`) anything that:
- doesn't match the brief or the seeds (wrong mood, wrong density, wrong medium)
- is an ad, a course/template sales tile, an infographic of text, a stock device-mockup pack with no real design in it
- is low-res, heavily watermarked, or a near-repeat of a better one already kept
- is literally the wrong thing (a "skeleton loading" search returning skeletons)
Be harsh: a smaller board of right images beats a big one. Note in one line per theme what you kept and why.
Write `$OUT/themes.json` ({search: theme}) to group searches into 6–12 themes he'll filter by.

## 4. Board

```
python3 .claude/skills/find-refs/scripts/build.py <BOARD_DIR> <board-id> $OUT:"<Sweep name>" [older sweep dirs…]
```
Publish into his Poto artifact (`https://claude.ai/artifact/1S6ab79kbj1ybu4WufVNpg`, hub file `poto-round-two.html` in the scratchpad if this session has it; otherwise read the artifact first) with `root=<BOARD_DIR>`, files `refs.html` + every `refs/sheetNNN.jpg`, and `capabilities: {db: {}}`. Add/keep a "References" entry in the hub list. Limits: 255 files per publish, 511 per version, 64 MB per publish: sheets of 18 keep ~1,500 refs well inside that.
The board has a **grid** and a **spreadsheet** view (tick, #, preview, theme, search, found via, sweep; sortable), filters by theme and sweep, and saves picks to the artifact database as doc `picks/<board-id>` (`{ids: [...]}`).

## 5. Reading his picks

`ArtifactData get` collection `picks`, doc_id `<board-id>` on the artifact URL → `ids` are board numbers; map them through `<BOARD_DIR>/index.json` (number → search, image key, pin image URL) and look at the picked images before using them. If the board says "Copy picks" (no database in that view), he'll paste `Refs (<board-id>): 12, 45, …`.

## Don'ts
- Don't put Pinterest images in his git repo (they're other people's work); they live only in the private artifact.
- Don't ask for his Pinterest password or cookies; logged-in browsing is only through his own browser on his computer.
- Don't pad the board to look thorough.
