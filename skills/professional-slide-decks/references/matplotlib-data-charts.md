# matplotlib recipe — real, cited data charts for decks

Use matplotlib (not just Pillow) when a chart must carry *real axes, labelled
percentages, grouped/horizontal bars, and annotation callouts* — i.e. evidence
& research decks where every number is cited. Pillow is still best for
icon-style pictograms; python-pptx native `charts` is fine for simple series.

## Setup (clean venv — see skill Pitfalls)
```bash
env -u PYTHONPATH python3.11 -m venv build_venv
build_venv/Scripts/python.exe -m pip install matplotlib pillow
```
Run the generator with that venv's python. dpi=200 is enough (vector-ish,
anti-aliased); no manual supersample needed like Pillow.

## Palette + base style
```python
import matplotlib; matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
NAVY="#1A3C5E"; TEAL="#2A9D8F"; AMBER="#E9A23B"; RED="#C44536"
SKY="#5B9BD5"; GREY="#6B7280"; LIGHT="#F4F7FA"
plt.rcParams.update({"font.family":"DejaVu Sans","axes.edgecolor":"#ccc",
    "figure.dpi":200,"savefig.dpi":200})
def style_ax(ax):
    ax.spines["top"].set_visible(False); ax.spines["right"].set_visible(False)
def save(fig,name):
    fig.savefig(name,bbox_inches="tight",facecolor="white",pad_inches=0.15)
    plt.close(fig)
```

## Horizontal bar with value labels (most common for % stats)
```python
fig,ax=plt.subplots(figsize=(9.2,4.4))
labels=["Institutional births","Anaemia, women","C-section"]
vals=[90.8,63.7,35.0]; cols=[TEAL,RED,AMBER]
bars=ax.barh(labels[::-1],vals[::-1],color=cols[::-1],height=0.6)
for b,v in zip(bars,vals[::-1]):
    ax.text(v+1,b.get_y()+b.get_height()/2,f"{v}%",va="center",
            fontsize=11,fontweight="bold")
style_ax(ax); ax.set_xlim(0,100); ax.set_xlabel("% (NFHS-5, West Bengal)")
ax.set_title("West Bengal indicators",fontsize=15,fontweight="bold",
             color=NAVY,loc="left",pad=10)
save(fig,"ch_wb.png")
```

## Flowchart / step boxes (rounded, numbered, arrows)
```python
seq=[("Assess",TEAL),("Co-design",SKY),("Pilot",AMBER),("Scale",RED)]
x=0.5
for i,(t,c) in enumerate(seq):
    ax.add_patch(FancyBboxPatch((x,1.1),2.1,1.2,
        boxstyle="round,pad=0.04",fc=c,ec="none"))
    ax.text(x+1.05,1.7,t,ha="center",va="center",color="white",
            fontsize=11,fontweight="bold")
    if i<len(seq)-1:
        ax.annotate("",xy=(x+2.45,1.7),xytext=(x+2.2,1.7),
            arrowprops=dict(arrowstyle="-|>",color=NAVY,lw=2))
    x+=2.45
```

## DFD (context + level 1) in one figure
External entity = rectangle (fc=LIGHT, ec=NAVY); process = rounded rect
(fc=TEAL); data store = open box (fc=LIGHT, ec=AMBER); flow = FancyArrowPatch
with arrowstyle="-|>". Lay out on a 0..12 x 0..9 axes, ax.axis("off").

## Contain-fit embed helper (so charts never overflow the slide box)
```python
from PIL import Image
def pic_contain(slide,path,x,y,w,h):
    iw,ih=Image.open(path).size; box_r=w/h; img_r=iw/ih
    if img_r>box_r: nw=w; nh=int(w/img_r)
    else: nh=h; nw=int(h*img_r)
    nx=x+(w-nw)//2; ny=y+(h-nh)//2
    slide.shapes.add_picture(path,nx,ny,nw,nh)
```

## Honesty guard
Lock cited numbers into the script as literals (copy from the source). The PNG
and the deck then cannot drift from the citation. If a region has no published
figure, label the proxy clearly (e.g. "Europe benchmark, HLS-EU") — never fake one.
