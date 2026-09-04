# LinkedIn Easy Apply — CDP Detection & Classification Fixes (XXXXXXX)

Corrected behavior for `apply_one.cjs` + `run_recursive.cjs`, after vision-proven misdiagnoses this session.
operator explicitly distrusted the "empty modal / LinkedIn glitch" logs and was RIGHT — verify with vision before trusting any "LinkedIn is broken" conclusion.

## 1. Modal field/button detection MUST scope to the whole document
**Wrong:** `document.querySelector('div[role=dialog]')` returns the FIRST dialog in DOM order — often a hidden EMPTY accessibility overlay. Field/button scans scoped to it found 0 → false `empty_modal` / `no-continue-submit`.
**Right:** scan `document.querySelectorAll('input,textarea,select,div[role=radio]')` directly (whole document). For buttons, `findBtnInModal` searches ALL `button` elements (prefer visible/non-disabled) and matches `/continue applying|submit application|^submit$|^review your application$|^next$/i`.

## 2. `NO_EA_BUTTON` usually means ALREADY APPLIED
When a job is submitted, LinkedIn shows "Application submitted / Applied" and REMOVES the EA button. Before reporting `no_ea_button`, check:
```js
/applied an application|application status|you applied|applied \d+ (hour|day|minute|week)|submitted an application|withdrew application/i.test(document.body.innerText)
```
→ classify `already_applied` (counts as applied), NOT failed. Stops re-attempting submitted jobs.

## 3. Time window = LinkedIn `f_TPR` URL param, NOT post-time text
Search cards RARELY expose "X hours ago" (they show review time / "Applied"). Parsing `posted` text → '' → ageHours=999 → run starves to 0 relevant.
Set window in the search URL: `r18000`=5h, `r43200`=12h, `r86400`=24h. LinkedIn filters server-side; runner applies relevance filter only. operator default this session = 5h (`r18000`); XXXXXXX JS/frontend EA volume in any 5h window ≈ 1 job — widen for volume.

## 4. Single-tab, fresh-window recursive collection (working pipeline)
12 JS keyword searches (javascript, react, angular, vue, typescript, frontend, ui, web, fullstack-node, node, ai-frontend) × XXXXXXX × Easy Apply × `f_E=3,4,5,6` × `f_TPR` × `sortBy=DD`. Scrape cards, apply RELEVANT/IRRELEVANT gate, collect, sort newest-first, apply in the one reused tab.

## 5. Radio question detection = PRECEDING SIBLING of `<fieldset>`
**Wrong:** walk UP from the radio for '?'. LinkedIn puts the question in a sibling `div` just before the `<fieldset>` → climb found nothing → "(unlabeled radio)".
**Right:**
```js
const fs = r.closest('fieldset') || r.closest('div[role=group]');
let node = fs || r.parentElement;
for (let i=0; i<12 && node; i++) {
  let sib = node.previousElementSibling;
  while (sib) {
    const t = (sib.innerText||'').replace(/\s+/g,' ').replace(/\b(yes|no)\b/gi,'').trim();
    const qi = t.indexOf('?');
    if (qi >= 0) return t.slice(0, qi+1);
    sib = sib.previousElementSibling;
  }
  node = node.parentElement;
}
return '';
```

## 6. "Years of experience with X?" as Yes/No radio → answer "Yes"
If `answer(q)` returns a number but the radio options are Yes/No, and the question matches `/year|experience|familiar|have you|do you have|worked with|knowledge of/i`, force the clicked option to "Yes" (you HAVE the experience). A raw number never equals "yes"/"no" → radio stays unclicked.

## 7. Relevance gate (operator JS/frontend focus)
RELEVANT = `/javascript|typescript|front[- ]?end|full[- ]?stack|node\.?js|nodejs|react|vue|angular|ui developer|user interface|web developer/i`
IRRELEVANT = `/embedded|firmware|automotive|autosar|matlab|vlsi|verilog|rtl|plc|scada|mechanical|civil|hardware|asic|fpga|kernel driver|golang|java(?!script)|python(?!.*react)|rust|spring boot/i`
Skip non-matching (e.g. 777 Trinity "Embedded Software Engineer"). A titled "FULL Stack BackEnd" role still matches via "full stack" — acceptable (operator does fullstack).

## 8. Screenshot/temp hygiene (HARD)
`apply_one.cjs` writes `apply_<ts>.png` every run. Delete on success (keep only on failure for diagnosis). Workspace = only `apply_one.cjs`, `run_recursive.cjs`, `cdp_helper.cjs`, `applied.json`, `package*.json` (+ legacy `linkedin-easy-apply.cjs`). Vision-confirm every step, then purge.
