# Yes/No EA questions render as `div[role=radio]` — the silent-skip bug

Reproduced XXXXXXX across Trundl, Kaseya, Diginnovators, MAHTO forms.

## The bug
LinkedIn renders a Yes/No question as TWO `div[role=radio]` elements (labels "Yes" /
"No"), backed by a hidden `input[type=radio]` whose `value` is literally `"on"` (not
"Yes"/"No"). `ea_fill.cjs`'s `kind:'radio'` handler does:

```js
const rs = [...document.querySelectorAll('input[type=radio]')].filter(r => !name || r.name === name);
const t = norm(lab?.innerText) || norm(r.value);   // t === "on", not "Yes"
if (t === norm(want) || t.startsWith(norm(want))) return lab || r;   // want="Yes" -> NO MATCH
```

So it `skipped` every Yes/No with `why: 'no radio option matching "Yes"'`. The form then
refused to advance OR advanced with the answer blank. **The extraction step still
enumerates the question** (it lists both the `radio` AND the `aria-radio` kinds), so the
gap is visible in `ea_extract` output — but `ea_fill` will not set it.

## Permanent fix (patch `ea_fill.cjs`)
Extend the `radio` branch (or add an `aria-radio` branch) to ALSO handle
`div[role=radio]` when the underlying `input[type=radio]` has `value==='on'`:
- group `div[role=radio]` into question blocks by climbing parents until
  `block.querySelectorAll('div[role=radio]').length === 2`;
- match the option by its `innerText` ("Yes"/"No") — NOT by the input value;
- click the block's option via trusted mouse click at the bounding-box center.

## Stopgap cliquer (run as a standalone step before Submit)
Until `ea_fill.cjs` is patched, click Yes/No pairs with this block-scoped routine.
Form order = question order (block 0 = first Yes/No question on the page, etc.):

```js
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function clickRoleRadio(page, blockIdx, optionIdx) {  // optionIdx 0=Yes,1=No
  const h = await page.evaluateHandle((bi, oi) => {
    const radios = [...document.querySelectorAll('div[role=radio]')];
    const blocks = [];
    for (const r of radios) {
      let e = r.parentElement;
      while (e && e.querySelectorAll('div[role=radio]').length !== 2) e = e.parentElement;
      if (e && !blocks.includes(e)) blocks.push(e);
    }
    const b = blocks[bi]; if (!b) return null;
    return [...b.querySelectorAll('div[role=radio]')][oi] || null;
  }, blockIdx, optionIdx);
  const el = h.asElement(); if (!el) return false;
  await el.evaluate(e => e.scrollIntoView({ block: 'center' })).catch(() => {});
  await sleep(150);
  if (await el.evaluate(e => e.getAttribute('aria-checked')) !== 'true') {
    const b = await el.boundingBox();
    if (b) await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
    await sleep(300);
  }
  return await el.evaluate(e => e.getAttribute('aria-checked') === 'true');
}
// clickByText(page, 'Review') -> sleep(2500) -> clickByText(page, 'Submit application') -> sleep(2500)
```

Retry the click 2–3x in case the first trusted click lands before the control is
mounted. Verify each pair is set BEFORE clicking Review.

## VERIFY GOTCHA — do NOT trust post-click aria-checked
After clicking Review -> Submit, the page **re-renders/advances**, so a stale handle's
`aria-checked` read returns `false` even though the click worked. The cliquer above may
therefore log `block0 opt0 (Pune=Yes): false` while the submission SUCCEEDED.

**Trust the `"Application submitted"` / `"Your application was sent"` text in the live
DOM (or body.innerText match), NOT the post-click `aria-checked` of a now-detached
handle.** That text is the only reliable confirmation. Reproduced 3x this session — the
submit fired every time despite the false return.
