# Building a deck INTO a real SlidesGo/downloaded template (native, editable)

When the user supplies an actual .pptx template (e.g. he downloads a SlidesGo deck and
drops it in `C:\Users\operator\Downloads\ppt-templates\`), build the content INSIDE that
file so it carries the template's real master/theme/fonts. Do NOT just drop full-bleed
images in — that loses editability and the template's value.

## Workflow
1. `prs = Presentation(TEMPLATE.pptx)` — open the real template.
2. Clear stock slides: `for s in list(prs.slides._sldIdLst): prs.slides._sldIdLst.remove(s)`.
3. Pick the BLANK layout: `BLANK = prs.slide_layouts[10]` (SlidesGo Medical Infographics
   exposes TITLE / SECTION_HEADER / TWO_COLUMNS / BIG_NUMBER / BLANK — inspect with
   `prs.slide_masters[i].slide_layouts`).
4. For each slide: `s = prs.slides.add_slide(BLANK)` then **strip inherited shapes** (see
   pitfall #2), then add your `box()` / `text()` / `icon()` / chart `add_picture()` shapes.

## CRITICAL: coordinate scale fix (caught 28 out-of-bounds shapes)
Your content is usually designed for a 13.333"x7.5" canvas, but many templates are
10"x5.625" (16:9 at smaller px). If you place boxes at `x=8.4, w=3.4` on a 10" canvas
they overflow. Fix: compute scale factors once and apply to EVERY coordinate:
```python
W = Emu(prs.slide_width).inches; H = Emu(prs.slide_height).inches
SX = W / 13.333; SY = H / 7.5
def _i(v, axis): return Inches(v * (SX if axis=='x' else SY))
def box(s,l,t,w,h,...): s.shapes.add_shape(..., _i(l,'x'), _i(t,'y'), _i(w,'x'), _i(h,'y'))
def text(s,l,t,w,h,runs,...): s.shapes.add_textbox(_i(l,'x'),_i(t,'y'),_i(w,'x'),_i(h,'y')) ; r.font.size = Pt(size*SY)
```
Font sizes must also scale by SY or they look huge on the smaller canvas.

## Pitfall #1 — inherited placeholder overlay (a big BLACK shape covered every slide)
`add_slide(BLANK)` brings the layout's own placeholder/decoration shapes. They render as
a full-slide black/colored block over your content. Strip them right after adding:
```python
def slide():
    s = prs.slides.add_slide(BLANK)
    for sh in list(s.shapes):
        try: sh._element.getparent().remove(sh._element)
        except Exception: pass
    return s
```
(AttributeError on the remove = that shape was already gone; swallow it.)

## Pitfall #2 — PNG-first preview font-size bug (the verification loop's own trap)
When you render a preview with Pillow to vision-check, convert pt->px as `px = sz*SC/72`
where SC = preview_px_width / slide_width_inches (e.g. 1333/10 ~= 133.3). DO NOT use
`sz*SC*0.72` — that yields ~50x too-large fonts, so each character overlaps into a
"garbled blob" at the slide bottom and you'll think the deck is broken (it isn't).
Also: `d.textlength()` throws on multiline text -> split on "\n" before measuring.
Skip PICTURE shapes in the text-only preview (icons/charts already bounds-verified).

## Verify (no LibreOffice needed, but it CAN be installed)
- Structural: loop slides, compute each shape's right/bottom edge from EMU; assert
  `l+w <= W+0.05` and `t+h <= H+0.05`. 0 issues = safe.
- Visual: render each slide to PNG with Pillow (read the real pptx shapes: position,
  fill RGB via `sh.fill.fore_color.rgb`, text via `sh.text_frame`), then `vision_analyze`.
  NOTE: you CAN install LibreOffice for true pixel rendering:
  `winget install --id TheDocumentFoundation.LibreOffice --silent --accept-package-agreements
  --accept-source-agreements`. If the bundled MSI fails (exit 1603, "platform independent
  libraries" error), install VC++ redist first: `winget install Microsoft.VCRedist.2015+`,
  then retry. The old claim "this environment has no LibreOffice" is stale — it installs.

## Confirmed working: this session produced a clean 20-slide deck (health literacy) built
into the SlidesGo "Medical Infographics" template, fully editable, visually verified.
