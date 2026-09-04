# EA checkbox auto-check + already-applied detection (2026-08-17)

Two distinct blockers hit this session on the CDP `apply_one.cjs` driver, both now fixed and verified by vision.

## 1. Consent/agreement checkbox auto-check

**Symptom:** job stuck on the final step with `(unlabeled checkbox)` + "This field is required". The driver handled text/radio/select but never clicked checkboxes, so the mandatory consent box stayed unchecked.

**Why detection was hard:** LinkedIn renders the consent statement in a SIBLING container above the checkbox (not a `<label for>`), and the checkbox `id` is an obfuscated guillemet string (`«r6»`). So `labelFor` / `closest('label')` / `document.querySelector('label[for=...]')` all return empty → `lab=''`.

**Working in-page handler (drop in after radio handling, before find Submit):**
```js
await page.evaluate(() => {
  const cbs=[...document.querySelectorAll('input[type=checkbox]')].filter(c=>!c.disabled);
  for(const c of cbs){
    if(c.checked) continue;
    let txt='';
    const start=c.closest('div,li,label,span')||c.parentElement;
    let node=start;
    for(let i=0;i<10&&node;i++){
      let sib=node.previousElementSibling;
      while(sib){ const t=(sib.innerText||'').replace(/\s+/g,' ').trim(); if(t.length>3){txt+=' '+t;} sib=sib.previousElementSibling; }
      const own=(node.innerText||'').replace(/\s+/g,' ').trim(); if(own.length>3) txt+=' '+own;
      node=node.parentElement;
    }
    txt=txt.toLowerCase();
    const consent=/consent|agree|terms|privacy|authoriz|permission|process (my )?data|i confirm|accept|data for the purpose|store.*process/i.test(txt);
    const skip=/follow (this )?(company|employer)|subscribe|newsletter|email updates|keep me informed|notify/i.test(txt);
    if(consent && !skip){ try{ c.click(); }catch(e){} }
  }
});
await sleep(400);
```
**Verified:** 4454225838 (Energy Exemplar Sr SWE) and 4454232800 both advanced to Submit + "Application submitted" after this.

**Rule:** always CHECK consent/agreement/terms/privacy boxes; always LEAVE "follow company"/"subscribe"/"email updates" unchecked.

## 2. already_applied misclassified as failed

**Symptom:** jobs 4455216029 (TCS Team Lead P2P) and 4448212791 (TCS Intune Administrator) landed in `failed` with `no_ea_button`, yet vision showed "Application submitted 1 hour ago" on the detail page. LinkedIn removes the Easy Apply button once applied → `NO_EA_BUTTON` false-positive.

**Fix in apply_one.cjs (before the `no_ea_button` return):**
```js
if(!eaEl){
  const already = await page.evaluate(()=>/application submitted|application status|you applied|applied \d+ (hour|day|minute|week)|submitted an application|withdrew application/i.test(document.body.innerText));
  if(already){ out.steps.push('ALREADY_APPLIED'); out.error='already_applied'; await page.screenshot({path:shot}).catch(()=>{}); return; }
  out.steps.push('NO_EA_BUTTON'); out.error='no_ea_button'; await page.screenshot({path:shot}).catch(()=>{}); return;
}
```
**Fix in run_recursive.cjs (result handling):**
```js
} else if (res && res.error === 'already_applied') {
  data.applied.push(id); appliedCount++;
  log.push('  ALREADY_APPLIED '+id);
} else if (res && res.error === 'no_ea_button') {
  data.skipped.push(id); log.push('  SKIP(no_ea) '+id);
}
```
**Verified:** both TCS jobs correctly reclassified as applied; `failed` went to 0.

**Rule:** before concluding "no EA button = broken", vision-check the detail page for an already-applied status. A removed EA button is frequently "already submitted," not a code bug.

## Relevance note (per operator's JS/frontend focus)
The embedded-C role 4454213178 (777 Trinity) was collected by the keyword search but is NOT a JS/frontend match → belongs in `skipped`, not `failed`. The RELEVANT/IRRELEVANT filter in run_recursive.cjs handles this; legacy failed-list entries from before the filter existed should be re-triaged (already-applied → applied, off-profile → skipped).
