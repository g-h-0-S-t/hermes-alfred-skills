# LibreOffice render pipeline (VERIFIED working XXXXXXX-15)

This environment DOES have a real PPTX renderer now: the user installed LibreOffice. The old
"no renderer, use Pillow PNG-first" claim is STALE. Use LibreOffice for true pixel rendering —
it is the only way to verify a *native editable* python-pptx deck (Pillow previews can't show
the actual file).

## Install (if missing)
`winget install --id TheDocumentFoundation.LibreOffice --silent --accept-package-agreements --accept-source-agreements`
- The bundled MSI can fail with exit 1603 (VC++ redist / installer quirk). Fix: install the
  redist first, THEN retry: `winget install --id Microsoft.VCRedist.2015+.x64 --silent ...`.
- After a clean install, verify `C:\Program Files\LibreOffice\program\soffice.exe` exists.

## Render PPTX -> PDF (the working incantation)
Use the `soffice.exe` WRAPPER (NOT `soffice.bin` — calling the .bin directly skips env setup
and silently produces no PDF). Run from a normal shell, NOT while the LibreOffice GUI is open
(a running GUI instance blocks headless bootstrap with "Could not find platform independent
libraries <prefix>").

```
rm -rf lo_profile && mkdir lo_profile
"C:\Program Files\LibreOffice\program\soffice.exe" --headless --norestore --nofirststartwizard ^
  -env:UserInstallation=file:///C:/Users/operator/AppData/Local/hermes/lo_profile ^
  --convert-to pdf --outdir slide_render deck.pptx
```

## CRITICAL: LibreOffice rejects a corrupted PPTX
If `soffice.exe` prints "Error: source file could not be loaded" while python-pptx opens the
file fine, the PPTX XML is corrupt (commonly caused by `sh._element.getparent().remove(...)`
shape-stripping during build). FIX: load + resave through python-pptx to rewrite clean XML,
then convert the resaved file:
```
from pptx import Presentation
p=Presentation('deck.pptx'); p.save('deck_clean.pptx')
```
This alone took the file from "source file could not be loaded" to a 463KB valid PDF.

## PDF -> per-slide PNG
No poppler/pdftoppm here. Use PyMuPDF (pip install pymupdf):
```
import pymupdf as fitz
doc=fitz.open('slide_render/deck_clean.pdf')
for i,pg in enumerate(doc,1): pg.get_pixmap(dpi=110).save(f'slide_png/slide{i:02d}.png')
```
Then `vision_analyze` each PNG. This is the real visual check — far better than a Pillow proxy.

## Notes / traps
- A running LibreOffice GUI window breaks headless conversion. Ask the user to close it, or ensure
  no `soffice` process is in `tasklist` before converting.
- `soffice.exe --version` can exit 0 with no stdout — don't use it as a health check.
- Always use a fresh `-env:UserInstallation` profile dir per run to avoid stale-lock surprises.
