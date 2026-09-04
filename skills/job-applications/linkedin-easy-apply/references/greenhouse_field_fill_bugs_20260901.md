# Greenhouse Field-Fill Bugs (Fixed XXXXXXX)

The `gh_batch.cjs` driver had three bugs that left required fields empty on Greenhouse job applications. All three were fixed XXXXXXX.

## Bug 1: Country Field Empty

**Problem:** `#country` is a **react-select** dropdown, not a text input. The old code used `setById('country', 'XXXXXXX')` which sets the raw value but never commits it (stays empty).

**Fix:** Use `clickSelectByLabel('Country', 'XXXXXXX', 'XXXXXXX')` which:
1. Finds the label "Country"
2. Finds the `.select__control` / `.select__input-container` / `input.select__input` within the same container
3. Clicks it to open the dropdown
4. Types "XXXXXXX" to filter options
5. Clicks the `[role=option]` / `.select__option` whose text includes "XXXXXXX"

```javascript
async function clickSelectByLabel(labelText, val, optMatch) {
  const handle = await page.evaluateHandle((labelText) => {
    const labels = [...document.querySelectorAll('label')];
    for (const l of labels) {
      if ((l.innerText || '').toLowerCase().includes(labelText.toLowerCase())) {
        const selControl = l.closest('div,li,section,fieldset')?.querySelector('.select__control, .select__input-container, input.select__input');
        if (selControl) { selControl.scrollIntoView({ block: 'center' }); return selControl; }
      }
    }
    return null;
  }, labelText);
  const el = handle.asElement();
  if (!el) return false;
  await el.click({ clickCount: 1 }); await sleep(500);
  await page.keyboard.type(val, { delay: 45 }); await sleep(900);
  const picked = await page.evaluate((val, optMatch) => {
    const o = [...document.querySelectorAll('[role=option],.select__option')].find(x => (x.innerText || '').includes(optMatch)) ||
              [...document.querySelectorAll('[role=option],.select__option')].find(x => (x.innerText || '').toLowerCase().includes(val.toLowerCase()));
    if (o) { o.click(); return o.innerText.trim(); }
    return null;
  }, val, optMatch || val);
  await sleep(700);
  return true;
}
```

## Bug 2: Phone Field Empty

**Problem:** `#phone` uses the intl-tel-input plugin. The old code tried to type into it but the field wasn't focused, so the keystrokes went elsewhere.

**Fix:** Click the field first, then type:
```javascript
const ph = await page.$('#phone');
if (ph) {
  await ph.click({ clickCount: 1 }); await sleep(400);
  await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await sleep(300); await page.keyboard.type('XXXXXXX_NUMBER', { delay: 55 }); await sleep(600);
}
```

## Bug 3: Custom Question Fields Empty

**Problem:** Custom question fields (e.g. "Website", "GitHub", "Portfolio") have dynamic IDs like `question_6700453009`. The old code never filled them.

**Fix:** Locate by `aria-label` case-insensitively:
```javascript
await page.evaluate(() => {
  const fields = [
    { label: 'website', val: 'https://OPERATOR_LINKEDIN_ID.portfolio.example.com' },
    { label: 'github', val: 'https://github.com/YOUR_GITHUB_USERNAME' },
    { label: 'portfolio', val: 'https://OPERATOR_LINKEDIN_ID.portfolio.example.com' }
  ];
  const allInputs = [...document.querySelectorAll('input[id*="question"],input[aria-label]')];
  for (const f of fields) {
    const el = allInputs.find(el => {
      const al = (el.getAttribute('aria-label') || '').toLowerCase();
      return al.includes(f.label) && !el.value;
    });
    if (el) {
      const p = Object.getPrototypeOf(el); const s = Object.getOwnPropertyDescriptor(p, 'value');
      if (s && s.set) s.set.call(el, f.val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
});
```

## Verification

After applying all three fixes, a Greenhouse form should show:
- Country: XXXXXXX (with flag and XXXXXXX code)
- Phone: XXXXXXX_NUMBER
- Website: https://OPERATOR_LINKEDIN_ID.portfolio.example.com
- Resume: OPERATOR_RESUME_ATS.pdf attached

All verified via vision_analyze on the filled form.
