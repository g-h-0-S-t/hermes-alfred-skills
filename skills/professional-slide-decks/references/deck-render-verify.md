# Deck render + visual-verify workflow (v6, the version the operator accepted)

When the operator rejects generated decks for "misaligned / not professional / text wall", the fix that
actually worked was: render every slide as a PNG with Pillow, vision-check it, then embed the
verified PNGs as full-bleed slides. This removes the invisible python-pptx drift that caused
v1-v5 rejections. Use this when the user has already complained about alignment.

## Why this beats python-pptx shape placement
- python-pptx add_shape + add_textbox placement is blind — you cannot render the file to pixels
  in this environment (no LibreOffice/Chromium), so misalignment ships unseen.
- Rendering each slide yourself in Pillow gives a real image you CAN vision_analyze before
  shipping. What you verify is exactly what the user gets.
- Trade-off: slide text becomes a picture (not editable in PowerPoint). For a polished locked
  deliverable this is fine. If the operator needs editable text, tell him the alignment risk returns.

## Minimal loop
1. Pre-generate assets once: Poppins TTFs (regular/bold/semibold), 16 vector icons (Pillow disc +
   white line-art PNGs), chart PNGs (see below).
2. Write a renderer module (one function per slide) drawing at 1600x900 onto a Pillow image.
3. img.save("assets/slides/slideNN.png") for all 20.
4. vision_analyze on a representative spread (title, a chart slide, a consequence, the DFD,
   summary). Fix any overflow/overlap, re-render, re-check.
5. Pack into pptx: add_picture(p, 0, 0, slide_width, slide_height) full-bleed; verify
   len(p.slides._sldIdLst)==20 and picture count.

## Pillow helpers that worked (copy these)
```python
W,H=1600,900
def rr(d,box,r,fill,outline=None,ow=0):
    x0,y0,x1,y1=box
    if x1<x0: x1=x0+x1          # accept (x,y,w,h) OR (x0,y0,x1,y1)
    if y1<y0: y1=y0+y1
    d.rounded_rectangle((x0,y0,x1,y1),r,fill=fill,outline=outline,width=ow)
def text(d,x,s,font,col,anchor="lm",line_h=None,max_w=None):
    if isinstance(x,(tuple,list)): x,y=x        # allow (x,y) tuple OR x-only
    else: y=0
    if max_w:                          # WORD-WRAP - without this long lines overflow cards
        wrapped=[]
        for ln in s.split("\n"):
            words=ln.split(" "); cur=""
            for wd in words:
                test=(cur+" "+wd).strip()
                if d.textlength(test,font=font)>max_w and cur: wrapped.append(cur); cur=wd
                else: cur=test
            wrapped.append(cur)
        s="\n".join(wrapped)
    lines=s.split("\n")
    if line_h is None: line_h=font.size+6
    for i,ln in enumerate(lines):
        bb=d.textbbox((0,0),ln,font=font); tw=bb[2]-bb[0]; th=bb[3]-bb[1]
        cx,cy=x,y+i*line_h
        if anchor in("ma","mm"): cx-=tw/2
        if anchor in("mm","lm"): cy-=th/2
        d.text((int(round(cx)),int(round(cy))),ln,font=font,fill=col)   # int() or Pillow throws on floats
def icon(d,name,x,y,size):
    im=Image.open(f"assets/icons/{name}.png").convert("RGBA").resize((int(size),int(size)),Image.LANCZOS)
    d._image.paste(im,(int(x),int(y)),im)   # int() coords
def card(d,x,y,w,h,fill=(255,255,255),line=None,shadow=True,r=18):
    if shadow: rr(d,(x+7,y+10,w,h),r,(205,214,226))   # offset shadow base
    rr(d,(x,y,w,h),r,fill,outline=line,ow=0 if line is None else 2)
```
Call convention that stays consistent: text(d, (x,y), s, font, col, anchor) — pass xy as a
TUPLE. Do NOT write text(d and (x,y), ...): the 'd and' drops the real draw handle and shifts
every arg (font lands in the string slot -> AttributeError: 'FreeTypeFont' has no 'split').

## Charts as SVG -> PNG (no cairosvg/libcairo on this host)
cairosvg needs libcairo-2.dll (absent); svglib/rsvg/inkscape/chromium also absent. Write the chart
as an SVG string (rect/line/text/polygon/circle), then rasterize with a tiny Pillow parser:
```python
import re
def rasterize(svg_path,out_path,scale=2):
    txt=open(svg_path,encoding="utf-8").read()
    m=re.search(r'<svg[^>]*width="(\d+)"[^>]*height="(\d+)"',txt)
    W=int(m.group(1)); H=int(m.group(2))
    img=Image.new("RGBA",(W*scale,H*scale),(255,255,255,0)); d=ImageDraw.Draw(img)
    for rm in re.finditer(r'<rect([^>]*)/?>',txt):
        a=dict(re.findall(r'(\w[\w-]*)=["\']([^"\']*)["\']',rm.group(1)))
        x,y,w,h=float(a['x']),float(a['y']),float(a['width']),float(a['height'])
        d.rounded_rectangle([x*scale,y*scale,(x+w)*scale,(y+h)*scale],radius=float(a.get('rx',0))*scale,fill=_col(a.get('fill','#000')))
    # same for circle/line/polygon/text (text uses ImageFont + textbbox anchor=middle)
    img=img.resize((W,H),Image.LANCZOS); img.save(out_path)
```
Then vision_analyze the PNG to confirm bars/labels are aligned before embedding. This satisfies
"generate the charts as svg images, then use in presentation" and is verifiable.

## Verified slide inventory (v6)
Title · Definition · Chain(5-step) · Mechanism · Burden(chart) · WestBengal · Consequence 7-11
(trigger->outcome->fix flow) · Reference 12-15 · 4 Levers · Levers 1&2 / 3&4 · DFD · Summary.
Vision-confirmed clean: slides 1,3,5,7,17,19. Only nit was a header label clipped -> widen the bar.
