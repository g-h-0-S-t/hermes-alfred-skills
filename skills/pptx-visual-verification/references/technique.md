# Condensed technique: render-to-PNG PPTX decks

## Slide renderer skeleton (Pillow, 1600×900)
```python
from PIL import Image, ImageDraw, ImageFont
W,H = 1600, 900
def F(p,s): return ImageFont.truetype(p,s)
def rr(d,box,r,fill,outline=None,ow=0):
    x0,y0,x1,y1=box
    if x1<x0: x1=x0+x1
    if y1<y0: y1=y0+y1
    d.rounded_rectangle((x0,y0,x1,y1),r,fill=fill,outline=outline,width=ow)
def text(d,x,s,font,col,anchor="lm",line_h=None,max_w=None):
    if isinstance(x,(tuple,list)): x,y=x
    else: y=0
    if max_w:  # word-wrap long lines
        wrapped=[]
        for ln in s.split("\n"):
            cur=""
            for wd in ln.split(" "):
                test=(cur+" "+wd).strip()
                if d.textlength(test,font=font)>max_w and cur: wrapped.append(cur); cur=wd
                else: cur=test
            wrapped.append(cur)
        s="\n".join(wrapped)
    for i,ln in enumerate(s.split("\n")):
        bb=d.textbbox((0,0),ln,font=font); tw=bb[2]-bb[0]; th=bb[3]-bb[1]
        cx,cy=x,y+i*(line_h or font.size+6)
        if anchor in ("ma","mm"): cx-=tw/2
        if anchor in ("mm","lm"): cy-=th/2
        d.text((int(round(cx)),int(round(cy))),ln,font=font,fill=col)
def card(d,x,y,w,h,fill=(255,255,255),line=None,shadow=True,r=18):
    if shadow: rr(d,(x+7,y+10,w,h),r,(205,214,226))
    rr(d,(x,y,w,h),r,fill,outline=line,ow=0 if line is None else 2)
def new(): img=Image.new("RGB",(W,H),(247,249,252)); return img,ImageDraw.Draw(img)
# build each slide; render to PNG; vision_verify; assemble.
```

## Grid helper (prevents drift)
```python
import math
def cols(n, M=44, gap=32, SW=1600):
    cw=(SW-2*M-(n-1)*gap)/n
    return [M+i*(cw+gap) for i in range(n)], cw
```

## Minimal SVG→PNG rasterizer (no cairosvg here)
Parse only what charts need: rect, line, text, circle, polygon.
```python
import re
from PIL import Image, ImageDraw, ImageFont
def rasterize(svg_path, out_path, scale=2, font_path="Poppins-Regular.ttf"):
    txt=open(svg_path,encoding="utf-8").read()
    m=re.search(r'<svg[^>]*width="(\d+)"[^>]*height="(\d+)"',txt)
    W=int(m.group(1)); H=int(m.group(2))
    img=Image.new("RGBA",(W*scale,H*scale),(255,255,255,0)); d=ImageDraw.Draw(img)
    hexmap={'#0b2e59':(11,46,89),'#0e9ba8':(14,155,168),'#c0392b':(192,57,43),
            '#e68a00':(230,138,0),'#2e9e4f':(46,158,79),'#5a5a5a':(90,90,90),'#1f2933':(31,41,51)}
    def col(c):
        if isinstance(c,tuple): return c
        c=c.strip()
        if c.startswith('#'):
            if len(c)==4: c='#'+''.join(2*x for x in c[1:])
            return tuple(int(c[i:i+2],16) for i in (1,3,5))
        return hexmap.get(c.lower(),(0,0,0))
    for rm in re.finditer(r'<rect([^>]*)/?>',txt):
        a=dict(re.findall(r'(\w[\w-]*)=["\']([^"\']*)["\']',rm.group(1)))
        x,y,w,h=float(a.get('x',0)),float(a.get('y',0)),float(a.get('width',0)),float(a.get('height',0))
        rx=float(a.get('rx',0))*scale
        d.rounded_rectangle([x*scale,y*scale,(x+w)*scale,(y+h)*scale],radius=rx,fill=col(a.get('fill','#000')))
    for lm in re.finditer(r'<line([^>]*)/?>',txt):
        a=dict(re.findall(r'(\w[\w-]*)=["\']([^"\']*)["\']',lm.group(1)))
        d.line([float(a['x1'])*scale,float(a['y1'])*scale,float(a['x2'])*scale,float(a['y2'])*scale],
               fill=col(a.get('stroke','#000')),width=max(1,int(float(a.get('stroke-width',1))*scale)))
    for tm in re.finditer(r'<text([^>]*)>(.*?)</text>',txt):
        a=dict(re.findall(r'(\w[\w-]*)=["\']([^"\']*)["\']',tm.group(1)))
        x,y=float(a['x']),float(a['y']); s=int(float(a.get('font-size',14)))
        anc=a.get('text-anchor','start'); bold='bold' in a.get('font-weight','')
        font=ImageFont.truetype(font_path if not bold else font_path.replace('Regular','Bold'), s*scale)
        t=tm.group(2); bb=d.textbbox((0,0),t,font=font); tw=bb[2]-bb[0]; th=bb[3]-bb[1]
        tx=x*scale-(tw/2 if anc=='middle' else 0); ty=y*scale-th/2
        d.text((tx,ty),t,font=font,fill=col(a.get('fill','#1f2933')))
    img=img.resize((W,H),Image.LANCZOS); img.save(out_path)
```

## Column chart as SVG (verified clean, then rasterize)
```
<svg xmlns="http://www.w3.org/2000/svg" width="940" height="460">
  <text x="470" y="34" font-size="24" font-weight="bold" fill="#0b2e59" text-anchor="middle">Title</text>
  <line x1="70" y1="370" x2="910" y2="370" stroke="#cfd8e3" stroke-width="2"/>
  <rect x="80" y="150" width="120" height="220" rx="10" fill="#0b2e59"/>
  <text x="140" y="130" font-size="22" font-weight="bold" fill="#1f2933" text-anchor="middle">33%</text>
  <text x="140" y="392" font-size="15" fill="#5a5a5a" text-anchor="middle">Label</text>
</svg>
```

## Pillow icon drawer (16 medical/health icons, no emoji)
Draw a colored disc + white line-art glyph, save transparent PNG, embed via add_picture.
Pattern: `disc(d,size,col)` then draw lines/polygons/circles with `d.line/ellipse/polygon`.
Icons used this session: access(pin), book, scale(balance), check, speech, pill, warn, chart,
shield, phone, users, target, loop, mag, heart, map. Keep each ~256px, single accent color.

## Poppins TTF download (no system install needed for Pillow)
```
curl -sL -o Poppins-Bold.ttf   https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf
curl -sL -o Poppins-Regular.ttf https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Regular.ttf
curl -sL -o Poppins-SemiBold.ttf https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-SemiBold.ttf
curl -sL -o Poppins-Medium.ttf   https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Medium.ttf
```
Pillow loads them directly; PNG routes render correctly without installing the font system-wide.
For editable PPTX text, set `font.name="Poppins"` (substitutes if not installed; true embedding
is fiddly and can corrupt the file — prefer the PNG-assembly route for guaranteed look).
```
