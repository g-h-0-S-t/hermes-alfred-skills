---
name: professional-slide-decks
description: Professional pptx decks for the user — real icons, Poppins.
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [windows, linux, macos]
metadata:
  hermes:
    tags: [pptx, powerpoint, slides, deck-design, python-pptx, icons, charts]
    category: productivity
    related_skills: [powerpoint, baoyu-infographic, architecture-diagram]
---

# Professional Slide Decks (for the user)

Build .pptx decks that look professional, not like a text dump. the user rejected three successive
drafts for: emoji-as-icons, Calibri + small text, misaligned/hand-placed boxes, and "no real
charts/diagrams". These rules are the fix and are non-negotiable for any deck he asks for.

## When to use
- the user asks for a presentation / slides / deck / PowerPoint on any topic.
- He says "attractive", "professional", "understandable", "add diagrams/charts/pictograms", or
  complains a draft looks like a text wall.

## HARD rules
1. **NO emoji as icons.** Unicode glyphs (⛑ ▤ ⚖ ✔ ❝) render as boxes on machines without an
   emoji font and look amateur. Generate **real vector icons** as PNGs with Pillow and `add_picture`
   them. Keep a consistent style: colored disc + white line-art, fixed size (256px). See
   `references/deck-icons-charts.md` for the icon+chart generator recipe.
2. **Real font, big.** Use Poppins (download TTF from Google Fonts, set `font.name="Poppins"` on
   every run) or embed the TTF via `<a:fonts>`. Titles ≥30pt, body ≥15pt, stat numbers ≥22pt.
   Default Calibri + 11pt reads as amateur. If the host lacks the font it substitutes — tell the user
   and offer to embed the TTF.
3. **Strict grid — compute, don't eyeball.** `M=Inches(0.6)`; equal cards `cw=(SW-2*M-(n-1)*gap)/n`;
   center icons/text (`anchor=MSO_ANCHOR.MIDDLE`, `align=PP_ALIGN.CENTER`); pin footers to a fixed
   baseline. Offset boxes are the #1 "misaligned" complaint — geometry eliminates it.
4. **Real charts.** Three good paths, pick by need: (a) **matplotlib** for real axes, labelled
   percentages, grouped/horizontal bars, and annotation callouts — best for *evidence/research
   decks with cited numbers* (recipe in `references/matplotlib-data-charts.md`); (b) Pillow PNGs
   (supersample ×4, `resize(LANCZOS)`) for icon-style pictograms; (c) python-pptx native `charts`.
   A drawn "57%" bar with an axis beats a "57%" bullet. Every chart number must be a real, cited
   statistic — see Verified-data discipline below.
5. **Diagrams as shapes.** Flowchart / block diagram / DFD = rounded-rect boxes + `MSO_SHAPE`
   arrows, snapped to the grid. Not prose.
6. **Consistent visual system.** One navy/teal/blue accent palette, white cards on light bg, soft
   shadows (`_shadow` via `a:outerShdw`), numbered footers. Generous spacing.

## Style scope (colored vs B&W — request-dependent)
the user's deck aesthetic is REQUEST-DEPENDENT, not one global rule:
- **Colored professional** (navy/teal/amber/red accent palette, real charts, flowcharts, DFDs,
  infographics) is what he wants for general / professional / **evidence & research** decks —
  confirmed this session (a 21-slide health-literacy deck for XXXXXXX, XXXXXXX, with charts,
  graphs, flowcharts and DFDs).
- **B&W minimal** was mandated ONLY for the specific *health-literacy medical deck for his auntie
  Kutty* (see memory 'PRESENTATION DECK HARD RULES'). Do NOT impose B&W on a deck he asked to be
  colored, and do NOT assume colored is banned — follow the explicit request; if ambiguous, confirm.
- Either way: real charts/diagrams, no emoji-as-icons, ≥15pt body, computed grid (rules 1-6 hold).

## Verified-data discipline (evidence / research decks)
When the deck must be evidence-backed ('all data real, no bogus data'), enforce:
- **Cite every number** on the slide or in a references slide. Prefer primary sources: NFHS-5 state
  reports (dhsprogram.com FR374 etc.), WHO, NITI Aayog, peer-reviewed (Lancet / BMC / Springer).
- **Never fabricate** a missing statistic. If no published figure exists for the target region
  (e.g. XXXXXXX has NO state-level health-literacy prevalence), use a clearly-LABELLED proxy/benchmark
  (e.g. HLS-EU Europe 47.6% limited HL) and state the gap explicitly. Fabricated 'illustrative'
  charts are a hard reject — learned the hard way on an earlier deck.
- Pull figures via web_search/web_extract, then lock them into the chart script as literals so the
  PNGs and the deck can never drift from the cited source.

## Build recipe (single execute_code pass)
- Set `font.name="Poppins"`.
- Pre-generate icon PNGs + chart PNGs with Pillow into an `assets/` dir (run once, reuse).
- Loop slides: `header()` (navy bar + teal underline), `box()`, `text()`, `icon()` (add_picture),
  `arrow()`, `footer()`. All coordinates computed from `SW`/`M`.
- Verify: `python -c "from pptx import Presentation; p=Presentation(out); print(len(p.slides._sldIdLst))"`
  and count embedded pictures (`shape_type==13`).

## Verification + honesty
You CAN render slides to pixels yourself: the **PNG-first loop** (references/deck-render-verify.md)
draws each slide with Pillow, and you `vision_analyze` the PNG before shipping. That is the visual
check that actually works here — use it whenever the user has complained about alignment. Ship the
verified PNGs as full-bleed `add_picture` slides. If you only did structural checks, SAY SO; never
claim "looks perfect". NOTE: this environment CAN install LibreOffice for true pixel rendering —
`winget install --id TheDocumentFoundation.LibreOffice --silent --accept-package-agreements
--accept-source-agreements`. The real render pipeline (incl. the corrupt-PPTX resave fix and the
"close the GUI before headless convert" trap) is captured in
`pptx-visual-verification/references/libreoffice-render-pipeline.md` — USE IT. Key gotcha this
session: if `soffice.exe` says "source file could not be loaded" while python-pptx opens the file,
the PPTX XML is corrupt from `sh._element.remove()` shape-stripping — fix by load+resave through
python-pptx, THEN convert. The VCRedist/1603 theory was a red herring; the resave was the fix.
Pitfall in the Pillow preview itself: pt->px is `sz*SC/72`, NOT `sz*SC*0.72` (~50x too big =>
"garbled blob", a preview artifact not a deck bug). Split multiline text before `d.textlength`.

## Aesthetic iteration (after alignment is fixed)
Once slides are aligned, the user often still says "aligned but ugly / subpar". Push the
SlidesGo-style polish, then re-vision-check:
- Kicker chip under the header title (measure width with `d.textlength`, don't hardcode `len*9`).
- Decorative corner accent rings + a small accent dot near the footer.
- Icons inside colored circles (disc + centered white icon) rather than floating.
- Brighter kicker/subtitle text (low-contrast light-on-navy reads as a bug).
- Section tint background (very light navy/teal) instead of flat paper.
Verified: this lifted the title slide vision rating from "aligned" to ~8.5/10.

## Real template vs rendered-image (durable — root cause corrected)
- Driving a JS-gated download (SlidesGo, etc.) through the logged-in Chrome is UNRELIABLE, but
  the root cause is NOT "Chrome dies between tool calls" — the browser PROCESS stays alive
  (24+ procs confirmed). The real failure is the **DevTools transport**: both the HTTP
  `/json/version` endpoint AND the per-page `ws://.../devtools/page/<tid>` handshake
  intermittently time out / refuse, even on a healthy browser. Do NOT loop relaunching Chrome —
  that wastes turns and cancels any in-flight download.
- Robust workaround when you must drive CDP: read the browser WS URL from the Chrome launch log
  (`chrome9222.log` → "DevTools listening on ws://127.0.0.1:LINKEDIN_PORT/devtools/browser/<uuid>") and
  connect directly; avoid polling the flaky `/json/version` HTTP. Prefer a single flattened
  `Target.attachToTarget` socket over per-page WS. See `references/deck-template-download.md`.
- If the user wants the LITERAL template file: the fastest reliable path is to ask HIM to download
  one .pptx and send it (he's already logged in), then rebuild his content into that template's
  real slide masters (editable, best result). Autonomy note: he WILL ask you to "do it
  autonomously" — try the CDP route ONCE with the log-derived WS trick, but fall back to the
  user-download path fast rather than burning 20+ calls on a flaky transport.
- If he wants a strong deck now without the file: build a NATIVE editable python-pptx (real
  charts via pptx `charts`, diagrams as editable shapes) — not the flat PNG approach — so text
  stays editable. The PNG approach trades editability for guaranteed alignment; pick per request.
- **Build INTO a real template file (the path that worked XXXXXXX-15):** when the user supplies an
  actual .pptx (e.g. `OPERATOR_HOME/Downloads\ppt-templates\Medical Infographics by Slidesgo.pptx`),
  open it with `Presentation(TEMPLATE)`, clear its stock slides, then add native editable shapes on
  its BLANK layout. This keeps the template's real master/theme/fonts AND editability. Two traps
  that bit this session, both in `references/deck-into-template.md`:
  (a) coordinate scale — template canvas is usually 10"x5.625", not 13.33"x7.5"; apply
  `SX=W/13.333, SY=H/7.5` to every Inches() call or ~28 shapes overflow the edge;
  (b) strip inherited layout shapes (`sh._element.getparent().remove(sh._element`) or a full-slide
  black placeholder block covers your content.
- Working style (the user, XXXXXXX-15): wants genuine template quality, not approximations; wants
  autonomy ("do everything autonomously, relaunch on crash") BUT also wants real root-cause
  diagnosis, not blind retry loops. When a tool fails repeatedly, diagnose WHY (capture the actual
  error/transport behavior) before patching, and tell him the root cause. Also: when he says
  "restart Chrome if it crashes", the real root cause was his own relaunch killing the in-flight
  download (false "crash" from the flaky HTTP /json endpoint) — diagnose before acting.

## Pitfalls (all hit this session)
- Emoji glyphs → boxes on target machines. Use Pillow PNG icons.
- Default Calibri + small text → "not professional". Use Poppins, ≥15pt body.
- Hand-placed coordinates → overlaps/misalignment. Compute from slide width.
- `import pptx` fails with `ImportError: cannot import name 'etree' from 'lxml'` → the agent venv's
  lxml is broken. Fix: `env -u PYTHONPATH python3.11 -m venv build_venv` then pip install python-pptx
  matplotlib pillow; run the generator with that venv's python. (Do NOT fight the leaking PYTHONPATH.)
- No `pdftoppm`/poppler for render-verify? `pip install pymupdf` and `page.get_pixmap(dpi=110).save(...)`
  rasterizes the LibreOffice-rendered PDF to PNGs for vision_analyze — reliable fallback.

## References
- `references/deck-icons-charts.md` — copy-paste Pillow recipe: draw 16 consistent icons + column charts, anti-aliased, embeddable.
- `references/deck-render-verify.md` — PNG-first render + vision-verify loop; Pillow helpers; SVG->PNG chart rasterizer.
- `references/deck-slidesgo-polish.md` — SlidesGo-style polish (kicker chip, corner rings, icon circles, title lift) to lift an aligned deck from "ugly" to ~8.5/10.
- `references/deck-template-download.md` — how to drive a logged-in Chrome CDP session to grab a SlidesGo .pptx; the DevTools-transport flakiness workaround (read WS URL from launch log, avoid /json/version polling).
- `references/deck-into-template.md` — build content INTO a real downloaded template (native, editable): clear stock slides, strip inherited shapes, SX/SY coordinate scale, Pillow-preview font-size bug.
- `references/matplotlib-data-charts.md` — matplotlib recipe for REAL cited data charts (bar / horizontal / DFD / flowchart via FancyBboxPatch + FancyArrowPatch), palette, pic_contain contain-fit helper, clean-venv note.

## Setup

Build professional editable PowerPoint decks.

**Personal data needed:** None (generic skill).

**Dependencies:**
- Python 3.11+
- `python-pptx`
- `Pillow`
- `matplotlib` (for charts)
- Poppins font (auto-downloaded from Google Fonts)

**Placeholders used:** None.
