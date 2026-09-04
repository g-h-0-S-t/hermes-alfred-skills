# EA field-fill: data types, matcher, and failure modes (validated XXXXXXX-13)

These are the concrete fixes that make `ea_step.cjs` actually submit. Each was
found by isolating the exact failure, not by guessing.

## 1. Numeric fields reject words → coerce to "0"
If a field's question matches `days | salary in inr | annual salary | year |
job code | phone | zip | pincode` (or `type=number`), and the answer value is a
non-numeric word (`Immediate` / `ASAP` / `now`), the form silently rejects it and
Submit never appears. Fix: set the value to `"0"`.
- Notice period in days → `0` when immediate joiner.
- Current annual salary in INR → `XXXXXXX` (never a word).
- Graduation year → `2012`.

## 2. Answer matcher is SINGLE-DIRECTION + key length >= 4
Match ONLY when the question text CONTAINS the answer key:
`q.q.toLowerCase().includes(key.toLowerCase())` with `key.length >= 4`.
Do NOT match the reverse (key contains question). A reversed match put `"Yes"`
into a "Total IT exp?" years field. This is the anti-corruption guard.

## 3. <select> needs selectedIndex + change event
`HTMLSelectElement.select()` is an INPUT method — calling it on a <select> is a
no-op and React never sees the change. Correct:
```js
el.selectedIndex = best;                       // best = index of closest option
el.dispatchEvent(new Event('change', { bubbles: true }));
el.dispatchEvent(new Event('input',  { bubbles: true }));
```
Pick `best` by substring (option text includes value, or value includes option
text slice) else first non-empty option.

## 4. Radios need a REAL mouse click at the label boundingBox
Synthetic `el.click()` and `elementHandle.click()` are IGNORED by LinkedIn's React
radio handlers. Correct:
```js
const box = await labelHandle.boundingBox();
await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
```
The label's `innerText` is often empty; click the label element (sibling of the
input), not the input itself.

## 5. Exclude the "Select language" a11y widget
The page footer has a <select> whose options are languages (English, etc.). A loose
"english" key matches it and fills the WRONG control, leaving the real
"proficiency in English" select empty. In the select finder, skip any select whose
cleaned label starts with `select language`.

## 6. Required-field detection → skip, don't corrupt
If a required field can't be matched from `answers.json`, the form loops forever on
"Review". Do NOT loop or fabricate. SKIP the job, log it, and add the missing key to
`answers.json` for next time.

## 7. Resume: never upload
Only CLICK "Select resume operator_XXXXXXX_Resume_ATS.pdf" if the picker shows. Never set
`input.files` / `new File(...)`. The r.pdf garbage-upload bug caused company bans.

## Symptom → cause map
| Symptom | Cause | Fix |
|---|---|---|
| Loops on "Review", never submits | required field empty / unmached | #2, #6 |
| Wrong value in a years/number field | reversed matcher | #2 |
| "Total IT exp?" = "Yes" | reversed match | #2 |
| English proficiency never fills | matched language widget | #5 |
| Select value won't stick | used `.select()` not change event | #3 |
| Radio "Please make a selection" | synthetic click ignored | #4 |
| Numeric field blank after fill | word in numeric field | #1 |
