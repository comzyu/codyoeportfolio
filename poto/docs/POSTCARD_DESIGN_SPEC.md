# Poto postcard: design spec for Cody

For designing the postcard and the country editions yourself. You design flat; Claude turns your emboss into real 3D (light, shadow, texture) in the app.

## Size

**2048 × 2896 px, portrait.** That's A6 postcard proportions (105 × 148 mm) and exactly twice the texture the app uses now, so it stays sharp on any phone and in the share images. Work in sRGB at 72 ppi (the pixel count is what matters). If you design at 300 dpi for print one day, it's the same layout at 1240 × 1748 px.

## Front (the photo side)

```
┌──────────────────────────────── 2048 ────────────────────────────────┐
│ border 86                                                             │
│   ┌────────────────────── photo window 1876 × 2501 ───────────────┐   │
│   │ top-left at (86, 86) · 3:4 · nothing of yours goes in here     │   │
│   │                                     signature stamp + clip     │   │
│   │                                     sit top-right (x 1580–1960,│   │
│   │                                     y 40–520), app places them │   │
│   └────────────────────────────────────────────────────────────────┘   │
│ caption strip: y 2587 → 2896 (309 px tall)                            │
│   left: date · place (app writes it)     right: poto mark (fixed)     │
└───────────────────────────────────────────────────────────────── 2896 ┘
```

- **The photo window is untouchable:** no texture, no emboss, no colour (your rule: the photo stays clean).
- **What you can design on the front:** the 86 px border and the 309 px caption strip. Keep it subtle; the photo is the hero.

## Back (the message side)

Design on the whole 2048 × 2896. Keep these areas clear, because the app draws into them:

| Area | Where (x, y) | What the app puts there |
|---|---|---|
| **Stamp** | 1560–1928, 100–560 | the sender's signature stamp |
| **Postmark** | 1180–1640, 220–620 (overlaps the stamp, as real postmarks do) | city and date ring |
| **Message** | 120–1100, 700–2350 | the handwritten note |
| **To** | 1180–1928, 1300–2000 | "to: you" lines (or Correspondance / Adresse style) |
| **Bottom line** | 120–1928, 2690–2790 | edition name ("Japan edition · received") and poto |
| **Header** | 120–1100, 140–300 | the word "postcard" in the country's language |

Everything else is yours: rules, dividers, borders, corner pieces, the pattern field.

## Files to give me, per country

1. **`back-ink.png`:** the printed parts (header word, lines, boxes, ornaments) on a **transparent** background, in the colours you want.
2. **`back-emboss.png`:** a **greyscale height map**, same size:
   - **50% grey (#808080) = flat paper**
   - **lighter = raised**, white is the highest
   - **darker = pressed in**, black is the deepest

   Use soft edges: a 2–4 px blur reads as real pressed paper, while hard edges look like a sticker. Save as 16-bit PNG if your tool can; 8-bit is fine.
3. **`front-emboss.png`** (optional): the same kind of height map for the **border and caption strip only**. The photo window must stay exactly 50% grey.

I take the height map and turn it into the lighting you see when the card turns: shadows on the side away from the light, highlights on the edges facing it. It also bakes into the share images. You don't need to draw any shadows or highlights yourself; designing them flat is what makes it look real when the card moves.

## The first 10 countries

Start with these: home, the countries around it where your first users and their friends are, and the places they travel to most. The other 20 follow the same template.

| # | Country | "Postcard" on the back | A real detail to borrow | Emboss idea (yours to redesign) |
|---|---|---|---|---|
| 1 | **Singapore** (home) | POSTCARD · 明信片 · POSKAD · அஞ்சல் அட்டை | Four official languages in one line | Peranakan tile |
| 2 | **Malaysia** | POSKAD | — | Songket weave |
| 3 | **Indonesia** | KARTU POS | — | Kawung batik circles |
| 4 | **Thailand** | ไปรษณียบัตร | — | Kanok flame motif |
| 5 | **Japan** | 郵便はがき | Seven red postal-code boxes, top left | Seigaiha waves |
| 6 | **South Korea** | 우편엽서 | Postal-code boxes | Dancheong-style geometry |
| 7 | **Taiwan** | 明信片 | Postal-code boxes | Window lattice |
| 8 | **United States** | POST CARD | "This side for address" (the classic divided back) | Linen texture (1930s–50s US linen postcards) |
| 9 | **United Kingdom** | POSTCARD | "Place stamp here" box | Victorian encaustic tile |
| 10 | **France** | CARTE POSTALE | "Correspondance" / "Adresse" labels | Art Nouveau curves |

Script spellings should be checked by a native speaker before anything ships. Avoid official marks (postal logos, flags, coats of arms); see `FEATURE_COUNTRY_POSTCARDS.md` §7.

## References

When you want them, `/find-refs` can sweep Pinterest for each of these 10 ("vintage postcard back Japan", "郵便はがき", "seigaiha emboss"…) onto the reference board, so you can design from real postcards.
