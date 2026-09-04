# SlidesGo-style polish (the "aligned but ugly" -> ~8.5/10 fix)

Apply AFTER the layout is verified aligned. Re-render + vision_analyze after each change.

## Header with kicker chip (measure width — DON'T hardcode len*9, it clips)
```python
def header(d, title, kicker=None):
    rr(d,(0,0,W,118),0,NAVY); rr(d,(0,118,W,6),0,TEAL)
    rr(d,(28,34,8,52),4,TEAL)                       # left accent bar
    text(d,(50,38),title,F(PB,40),WHITE,"lm")
    if kicker:
        kw=int(d.textlength(kicker,font=F(PR,17)))+28   # measured, not guessed
        rr(d,(50,82,kw,28),14,(28,92,140)); text(d,(64,96),kicker,F(PR,17),WHITE,"lm")
```

## Section decor (call right after new(), before header)
```python
def decor(d, accent=TEAL, tint=(240,246,250)):
    rr(d,(0,0,W,H),0,tint)
    d.ellipse([W-240,-150,W+110,300], outline=accent, width=2)   # top-right ring
    d.ellipse([-110,H-190,150,H+70], outline=accent, width=2)    # bottom-left ring
    d.ellipse([44,H-46,52,H-38], fill=accent)                    # footer accent dot
```

## Icon inside colored circle (not floating)
```python
def icon_circle(d, name, cx, cy, dsize, ring):
    rr(d,(cx-dsize/2, cy-dsize/2, dsize, dsize), int(dsize/2), ring)
    icon(d, name, cx-int(dsize*0.3), cy-int(dsize*0.3), int(dsize*0.6))
```

## Title slide lift
- Add a small series tag above the title (e.g. "HEALTH LITERACY SERIES" in TEAL).
- Two concentric outline circles top-right as a decorative motif.
- Brighten the meta line (light-on-navy) to ~(200,224,245) so it's legible, not a faint whisper.

## Verified palette (medical / SlidesGo)
NAVY=(11,46,89) TEAL=(14,155,168) BLUE=(18,110,196) GREEN=(46,158,79)
AMBER=(230,138,0) RED=(192,57,43) INK=(31,41,51) PAPER=(247,249,252)
White cards on the light tint, soft offset shadow (card() helper), numbered footer.

## Nit that bit us
Header label "Format" clipped in a 528px-wide bar -> widen the header bar (cw-90 instead of
cw-128) or drop the font 1pt. Always vision-check the worst-case long label after a polish pass.
