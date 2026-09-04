# Two-phase form answering: extract -> LLM answers -> map back -> verify

The generalisable pattern behind `ea_extract.cjs` / `ea_fill.cjs`. Applies to ANY
multi-step web form with open-ended questions (job applications, ATS portals,
onboarding wizards, questionnaires), not just LinkedIn Easy Apply.

## Why two phases

operator's exact instruction (2026-08-19):

> "Creative and out of questionnaires are common, filling up the forms using just a
> hardcoded script is insufficient. We want your brain, the LLM, Alfred, to answer it,
> by directly accessing the form fields. Make sure every question are first extracted
> and fed to Alfred, once Alfred generates the responses, use those responses to fill
> up the form."

A regex/switch answer table inside the driver cannot handle novel phrasing and fails
silently — it writes a *plausible but wrong* value instead of flagging a gap. Split the
work so the model reasons and the script only does mechanics.

**Contract:**
- Phase 1 (extract) — enumerate every answerable control, dump JSON, **STOP**.
- The agent reasons over each question against a verified profile.
- Phase 2 (fill) — type ONLY supplied values, verify each write, advance one step.
- Repeat per page. The filler contains **no** answer logic and **no** LLM call.

Omitting a field from the answers array leaves it untouched (correct for
already-correct pre-filled contact data). A missing value is reported in `skipped`,
never guessed.

## Extractor output shape

```json
{
  "pageNo": "3/4 pages",
  "heading": "Additional Questions",
  "buttons": ["Back", "Review"],
  "errors": [],
  "fields": [
    {"kind":"text","id":"«r1d»","question":"How many years of overall professional experience do you have?",
     "inputType":"text","numeric":false,"maxLength":null,"currentValue":""},
    {"kind":"radio","name":"grp1","question":"Do you have a Bachelor's degree?",
     "options":[{"label":"Yes"},{"label":"No"}],"checked":null},
    {"kind":"select","id":"«r4»","question":"Preferred location",
     "options":["Bengaluru","Pune"],"currentValue":"","bigList":false}
  ]
}
```

`kind` drives the fill strategy: `text | typeahead | radio | aria-radio | select | checkbox`.
Carry `numeric` and `maxLength` so the answering step can respect the field's data type.

## Why the regex table was removed (concrete failures)

Real bugs found in the deprecated `answer()` switch:

| Rule | Effect |
|---|---|
| `/years? .*experience/` catch-all | returned **14** for ANY years question — "years of React?" got 14 (truth 9), Kubernetes got 14 (truth 2) |
| Blanket Yes-override on radios matching `year\|experience\|familiar\|worked with` | forced **"Yes"** for unfamiliar tech = outright fabrication |
| `/compensation/` alone | returned EXPECTED salary when asked for CURRENT |
| `/notice period\|join/` -> `"0"` | "How soon can you join?" is often a **text** field; `"0"` reads as nonsense. Correct: "Immediately - I am serving no notice period." Coerce to a number ONLY when `numeric:true` |

Greedy patterns also swallowed nearly everything before the LLM fallback could run, so
the model was effectively never consulted.

## DOM lessons (all reproduced, LinkedIn EA)

### The form is not always `div[role=dialog]`
Observed an **inline** EA form: body text `Apply to SonicWall / 1/4 pages / Contact info`
with `document.querySelector('div[role=dialog]') === null`. A dialog-scoped readiness
check returned a false `no_dialog` and aborted a perfectly good form.

Detect by TEXT markers plus controls anywhere in the document:
```js
/\d+\/\d+\s+pages|contact info|additional questions|review your application/i
```
Fall back to `document` when no dialog/`[class*="jobs-easy-apply"]` scope exists.

### Next / Review / Submit need a trusted mouse click
`el.click()` and `el.evaluate(b => b.click())` both logged success while the page
stayed on the same step. Working approach:
```js
await el.evaluate(b => b.scrollIntoView({block:'center'}));
const box = await el.boundingBox();
await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
await page.mouse.click(box.x + box.width/2, box.y + box.height/2);
```
Always compare `pageNo` before/after to confirm the step actually advanced — do not
trust the click's return.

### Typeahead fields are required even when the DOM says otherwise
The Location/city control reported `required: false`, `aria-invalid: null`, and
`[role=alert]` was **empty** — yet the form silently refused to advance. A screenshot
showed red **"This field is required"** under the field.

Typing text alone leaves React's internal state invalid. Must resolve a real suggestion:
```js
await page.keyboard.type(value, {delay: 90});
await sleep(1800);                          // let the listbox populate
// click a real [role=option] / ul[role=listbox] li, else ArrowDown + Enter
```
Success signal: the review page shows a resolved token such as `urn:li:geo:105214831`.

**This is the case where vision beat DOM introspection.** Whenever a step will not
advance and the DOM reports no errors, screenshot and look. Do not conclude "throttled"
or "empty modal" from DOM silence alone.

### React id escaping
LinkedIn emits ids like `«r1c»`. Always `CSS.escape(id)` when building selectors, or
`querySelector` throws.

### Control-specific fill rules
- `<select>`: set `selectedIndex` then dispatch `change` — `el.select()` is an input
  method and silently no-ops on React.
- Radios: click the **label** (or the control's left edge) with a real mouse click.
  A synthetic click may leave React state unregistered so validation still blocks.
- Checkboxes: read `checked` first, click only to toggle toward the desired state.
- After every write, read the value back and record it (`filled[].verified`). Never
  report a fill as done without the read-back.

## Verification and cleanup

- Vision-check the **Review** page against the intended answers before submitting; the
  review text is the last chance to catch a mis-mapped field.
- Confirm submission by matching `Application submitted` in the page text.
- Delete screenshots and temp answer specs immediately on success — see the
  automated-hygiene section of the parent SKILL.md (`ea_cleanup.cjs` is invoked by the
  filler after a confirmed submit).
