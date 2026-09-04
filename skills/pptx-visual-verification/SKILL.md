---
name: pptx-visual-verification
description: Build PPTX decks via render-to-PNG and vision verification.
---

# PPTX Visual Verification & Asset Generation

## When to use
Building a PowerPoint (.pptx) deck with `python-pptx` (or any code-generated deck) where the
user cares about **visual quality / alignment / professional look** — not just text content.
Especially when the user has previously complained the deck was "misaligned", "ugly", or
"looks bad". Also covers generating **charts, diagrams, and icons** for slides.

## The core problem (why decks come out bad)
The default trap: python-pptx decks are shipped **blind** — hand-placed `add_shape`/
`add_picture` coordinates drift, text overflows cards, boxes overlap — and you only find out
after the user opens it and complains. Symptom loop seen in practice: v3→v4→v5 were "aligned
but ugly / misaligned" because the agent could only verify structurally (slide count, picture
count), never visually.

## The fix: render-first, verify, then assemble
**PREFERRED: render the ACTUAL .pptx with LibreOffice** (now installed on the operator's machine —
see `references/libreoffice-render-pipeline.md`). It's the only way to verify a native editable
deck for real. Pipeline: `soffice.exe --headless --convert-to pdf` → PyMuPDF (`pymupdf`)
PDF→per-slide PNG → `vision_analyze` each. The skill's old "no renderer here" claim is STALE;
LibreOffice IS available and is the recommended path.

**FALLBACK if LibreOffice is unavailable:** render each slide as a 1600×900 PNG with Pillow
(full pixel control), vision-verify, then assemble the PPTX. The Pillow preview has a font-size
bug (pt→px is `sz*SC/72`, NOT `sz*SC*0.72` — ~50× too big → "garbled blob"); split multiline
text before `d.textlength`.

Do not skip the vision step either way.

### Assembly option A — image slides (locked, always correct)
```python
from pptx import Presentation
from pptx.util import Inches
prs = Presentation(); prs.slide_width=Inches(13.333); prs.slide_height=Inches(7.5)
for i in range(1, N+1):
    s = prs.slides.add_slide(prs.slide_layouts[6])
    s.shapes.add_picture(f"slide{i:02d}.png", 0, 0, prs.slide_width, prs.slide_height)
prs.save("deck.pptx")
```
Trade-off: text is NOT editable in PowerPoint (it's a picture). Safe, pixel-perfect, what
you verified is what ships.

### Assembly option B — native editable shapes
Port the SAME verified coordinates into `python-pptx` autoshapes + textboxes. Gives editable
text but reintroduces the alignment risk — only choose if the user explicitly needs editable
text, and re-verify by rendering that pptx if any renderer becomes available.

## Layout engine (prevents drift)
Never hand-tune coordinates per element. Use a rigid grid:
- Fixed margin `M`, fixed header band height, fixed footer Y.
- `cols(n, gap)` → equal-width column X-starts from `slide_width`.
- All element sizes computed from these, in one unit system (EMU or pixels).
This removed the v4/v5 misalignment that came from ad-hoc `Inches()` math.

## Charts & diagrams (no SVG rasterizer here)
`cairosvg` needs `libcairo-2.dll` (absent); `svglib`/`rsvg-convert`/`inkscape`/`chromium`
are all absent. Two working paths:
- **Charts:** draw directly with Pillow (bars, labels, values) — see `scripts/render_deck_template.py`.
  If you want SVG source, generate the SVG string, then rasterize with a **minimal pure-Python
  SVG→PNG parser** (handle `rect`, `line`, `text`, `circle`, `polygon`). Reference pattern in
  `references/technique.md`.
- **Flowcharts / DFD / block diagrams:** draw with Pillow primitives (rounded rects + arrows
  as polygons) in the slide renderer. Verified visually before shipping.

## Icons (NEVER use emoji)
Emoji render as boxes on machines without an emoji font. Instead **draw vector icons with
Pillow**: a colored disc + white line-art glyph, saved as transparent PNG, embedded via
`add_picture`. See `references/technique.md` for a 16-icon drawer. (Real icon libraries like
`cairosvg`/SVG sets can't be rasterized here without libcairo — Pillow drawing is the reliable path.)

## Fonts
- **Poppins** downloads as TTF from `https://github.com/google/fonts/raw/main/ofl/poppins/` —
  filenames `Poppins-Bold.ttf`, `Poppins-Regular.ttf`, `Poppins-SemiBold.ttf`, `Poppins-Medium.ttf`.
  Load with `ImageFont.truetype`.
- For PPTX, set `font.name = "Poppins"`. True font *embedding* via python-pptx is fiddly and
  can corrupt the file — if guaranteed rendering matters, use Assembly option A (PNG images
  carry the font). Note: Pillow rendering uses the TTF directly, so PNG routes always look right.

## Pitfalls (all hit and fixed this session)
- **Multi-line strings with embedded `\n` passed inline inside a function-call arg list break
  the Python tokenizer** (`SyntaxError`). Always assign the string to a variable first, then
  pass the variable.
- **Pillow `rounded_rectangle` wants `(x0,y0,x1,y1)`, not `(x,y,w,h)`** — wrap in a helper that
  expands width/height, or you get `ValueError: y1 must be >= y0`.
- **`text()` coordinates and `paste()` coords must be `int`** — coerce floats (`int(round(x))`).
- **Pillow does NOT auto-wrap text** — long lines overflow and get cut off at the card edge.
  Implement a `max_w` word-wrap in your text helper (split, measure with `d.textlength`).
- **`text()` signature drift** — pick ONE signature (e.g. `text(d, x, s, font, col, anchor)` with
  `x` allowed to be an `(x,y)` tuple) and use it consistently. Mismatched call sites silently
  pass a font where the string should be (`AttributeError: 'FreeTypeFont' has no 'split'`).

## Verification checklist (do this every time)
1. Render all slides to PNG.
2. `vision_analyze` a representative spread (title, a chart slide, a dense card slide, a diagram).
3. Fix reported overlaps / cut-off / low-contrast text; re-render and re-verify those slides.
4. Assemble PPTX (option A unless editable text required).
5. Confirm file opens: `from pptx import Presentation; Presentation('deck.pptx')` + count slides/pics.

## SlidesGo / template reality
You **cannot curl-fetch a real SlidesGo .pptx** — every free source (slidesgo.com,
presentationgo.com, slidescarnival.com, templates.office.com) gates downloads behind JS or a
login wall; `curl` returns no static `.pptx`. Don't fake one. Instead **replicate the
SlidesGo medical visual language manually**: navy/teal palette, white rounded cards with soft
shadows, decorative corner accent rings, kicker chips under the title, strong type hierarchy,
icons-in-colored-circles. If the user insists on a *genuine* editable template, tell them to
open slidesgo.com in their browser, download the free medical template, and you'll drop the
content into its actual slide masters.

## Files in this skill
- `references/libreoffice-render-pipeline.md` — VERIFIED LibreOffice render path: install, the
  corrupt-PPTX resave fix, "close GUI before headless", PyMuPDF PDF→PNG. The recommended real
  renderer now that LibreOffice is installed.
- `references/technique.md` — condensed code patterns (slide renderer skeleton, SVG→PNG mini
  rasterizer, Pillow icon drawer, grid helper, Poppins download).
- `scripts/render_deck_template.py` — runnable minimal example: renders N slides to PNG and
  assembles a PPTX. Copy and extend per deck.
