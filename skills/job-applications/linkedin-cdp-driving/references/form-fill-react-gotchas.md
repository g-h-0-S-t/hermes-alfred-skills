# LinkedIn Easy Apply — React form-fill gotchas (verified XXXXXXX)

LinkedIn's EA modal is a React SPA. These are the failure modes observed and the fixes that
actually work. Developed against `XXXXXXX/job-apply/linkedin-easy-apply.cjs`.

## 1. Text inputs reject synthetic `.value` sets
`proto.value setter + dispatchEvent('input')` puts the value in the DOM but React's controlled
state rejects it → field shows "Invalid input" on submit even though `el.value === "10"`.

FIX — fill from Node with trusted typing:
```js
const h = await page.$(sel);            // prefer [name=...] or page.$$('input[type=text]')[i]
await h.click({ clickCount: 3 });        // select existing content
await h.type(val, { delay: 25 + Math.random() * 30 });
```
Residual race on fast re-renders (one field out of two occasionally still "Invalid input"):
explicitly clear first, then type:
```js
await h.focus();
await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
await page.keyboard.press('Backspace');
await page.keyboard.type(val, { delay: 30 });
```

## 2. Radios/checkboxes: click the visible `role=*` DIV, not the `<input>`
LinkedIn renders `<input type=radio>` (visually hidden) + `<div role="radio" aria-label="No">`.
Clicking the `<input>` (synthetic OR trusted) does nothing. React's onClick is on the div.
```js
// in-page:
const radioDiv = group[idx].closest('[role=radio]') || group[idx];
radioDiv.click();
// or from Node, scoped to the radiogroup:
await page.click('[role="radio"][aria-label="No"]');
```
Check the result with `input.checked === true` (not just "clicked").

## 3. Radio option text is on `role=radio` aria-label
`labelFor(input)` returns "" for custom radios. Read option text from the div:
```js
const opt = r.closest('[role=radio]');
const label = opt ? opt.getAttribute('aria-label') : labelFor(r);
```

## 4. Question labels are split: `<p>` prefix + nested `<span>` value
"How many years of work experience do you have with" (in a `<p>`) + "Java?*" (nested `<span>`).
`closest('label')`/aria only sees the prefix. The full question (with skill name) is in the
PARENT container's aggregated `textContent`.
```js
function questionTextFor(startEl) {
  let node = startEl;
  for (let depth = 0; depth < 7 && node; depth++) {
    const parent = node.parentElement;
    if (parent) {
      const raw = (parent.textContent || '').replace(/\s+/g, ' ').trim();
      const q = raw.indexOf('?');
      if (q >= 0 && q < 260 && /years|experience|do you|are you|with|select|upload|resume|compensation|salary|notice|relocat|authorized|sponsorship|citizen|gender|veteran|disab|language/i.test(raw)) {
        let t = raw.slice(0, q + 1); if (raw[q + 1] === '*') t += '*';
        return t;
      }
    }
    let sib = node.previousElementSibling;
    while (sib) {
      const raw = (sib.textContent || '').replace(/\s+/g, ' ').trim();
      const q = raw.indexOf('?');
      if (q >= 0 && q < 260 && /years|experience|do you|are you|with|select|upload|resume|compensation|salary|notice|relocat|authorized|sponsorship|citizen|gender|veteran|disab|language/i.test(raw)) { let t = raw.slice(0, q + 1); if (raw[q + 1] === '*') t += '*'; return t; }
      sib = sib.previousElementSibling;
    }
    node = parent;
  }
  return '';
}
```
Without this, skill-year inputs get labels "...do you have" (no skill name) → `answerFor`
key-match fails → field skipped → form can't advance past Review.

## 5. Contact email is pre-filled read-only text, not an input value
`dumpContact` scanning `<input>` placeholder/aria for "mail" misses it. Verify contact by
body `innerText` containing the email, not an input `.value`:
```js
const pageText = await page.evaluate(() => document.body.innerText);
const emailOk = /operatorXXXXXXX@gmail\.com/i.test(pageText);
const phoneOk = (profile.phone||'').replace(/\D/g,'').length >= 8 && pageText.replace(/\D/g,'').includes((profile.phone||'').replace(/\D/g,'').slice(-8));
```

## 6. LinkedIn input IDs are guillemets (`«rf»`) — invalid CSS selectors
`page.$('#...')` with guillemet IDs fails. Use `el.name` (`[name="radio-group-«rh»"]`) or
positional `page.$$('input[type=text]')` indexing.

## 7. Modal root detection
The EA modal does NOT expose `role=dialog` / `.artdeco-modal` (returns null even when open).
Detect open modal by body text: `/contact info|additional questions|review your application/i`
plus a Next/Review/Submit button, or an "N / pages" progress indicator.
