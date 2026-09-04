# Deck icons + charts (Pillow recipe)

Verified working recipe used to build the operator's health-literacy deck (v4). Pure Python, no
system deps (cairosvg needs libcairo which is absent here — do NOT use it). Pillow only.

## Icons — draw once, embed as PNG
Fixed 256px, transparent bg, colored disc + white line-art. Consistent style = professional.

```python
from PIL import Image, ImageDraw
S=256
def canvas(): return Image.new("RGBA",(S,S),(0,0,0,0)), None
def disc(d,c,col): d.ellipse([8,8,S-8,S-8],fill=col)
# example: access (location pin / cross)
def ico_access(d):
    disc(d,S,(14,110,194)); d.ellipse([94,62,162,130],fill=(255,255,255))
    d.line([128,80,128,118],fill=(14,110,194),width=10); d.line([110,96,146,96],fill=(14,110,194),width=10)
    d.polygon([(128,148),(96,208),(160,208)],fill=(255,255,255))
# render all: for name,fn in ICONS.items(): img,dr=canvas(); fn(dr); img.save(f"{name}.png")
```
Draw ~16 icons (access, book, scale, check, speech, pill, warn, chart, shield, phone,
users, target, loop, mag, heart, map). Each: `disc()` then white primitives. Keep one accent
color per concept. `add_picture(path, l, t, size, size)` into the slide.

## Charts — anti-aliased column bars
Supersample ×4, LANCZOS downscale. Avoids jaggy edges without cairo.

```python
SS=4
def chart_col(data, out, w=920, h=420):  # data: [(label,value,color), ...]
    W,H=w*SS,h*SS; img=Image.new("RGBA",(W,H),(255,255,255,0)); d=ImageDraw.Draw(img)
    fnt=ImageFont.truetype(POPPINS_BOLD,30*SS); fs=ImageFont.truetype(POPPINS_REG,19*SS)
    n=len(data); mx=max(v for _,v,_ in data)
    L,R,T,B=60*SS,(W-40*SS),40*SS,(H-60*SS); bw=(R-L)/n*0.6; gap=(R-L)/n
    for i,(lab,val,col) in enumerate(data):
        x=L+gap*i+(gap-bw)/2; bh=int((B-T)*val/mx)
        d.rounded_rectangle([x,B-bh,x+bw,B],radius=10*SS,fill=col)
        d.text((x+bw/2,B-bh-34*SS),f"{val}%",font=fnt,fill=(30,30,30),anchor="mm")
        for li,ln in enumerate(lab.split("\n")):
            d.text((x+bw/2,B+16*SS+li*22*SS),ln,font=fs,fill=(80,80,80),anchor="mm")
    img.resize((w,h),Image.LANCZOS).save(out)
```
Use for NFHS-style stat bars and consequence-impact bars. Embed via `add_picture`.

## Fonts
Download Poppins TTFs (Regular/SemiBold/Bold/Medium) from
`https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-<Weight>.ttf` into an
`assets/fonts/` dir. Set `font.name="Poppins"` on every pptx run. To be self-contained, embed
the TTF via the presentation's `<a:fonts>` element (python-pptx has no public API — build the
xml part + `prs.part.relate_to` a font part with content-type `application/x-font.ttf`). If you
skip embedding, tell the operator the deck relies on Poppins being installed and offer to embed.

## Pitfalls
- cairosvg/cairo NOT available here → use Pillow, not SVG renderers.
- Emoji glyphs (⛑ etc.) as "icons" render as boxes on target machines → always use PNG icons.
- Hand-placed shape coordinates → misalignment. Compute from slide width (see SKILL.md rule 3).
- No PowerPoint/LibreOffice in this env → cannot render-verify; verify structurally + warn the operator.
