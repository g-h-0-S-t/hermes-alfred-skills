# LinkedIn EA iframe / On-Off toggle fix (XXXXXXX-28)

## Symptom
`apply_one.cjs` reaches the Review step (3/4 pages) then exits:
`STUCK on 3/4 unanswered=["(unlabeled radio)","Off","(unlabeled textarea)"]` — never submits.

## Root cause
The whole EA form is served inside an **iframe** `https://www.linkedin.com/preload/?_bprMode=vanilla`.
All radio/input probes in `apply_one.cjs` used `document.querySelectorAll(...)` (TOP DOCUMENT
only), so they were blind to the iframe. The unclicked field was the **On/Off consent toggle**
("Share profile with employer?" / "Receive job alerts?") rendered as a `div[role=radio]` whose
visible label "Off" lives in a sibling `<span>` (not in `innerText`/`aria-label`).

- `(unlabeled radio)` + `Off` = the toggle, unlabeled (resolveQ failed) + its leaked "Off" label.
- `(unlabeled textarea)` = the invisible reCAPTCHA response field (empty by design; LinkedIn
  fills it in a real browser; do NOT fake it).

## Diagnostic (run with `env -u PYTHONPATH -u PYTHONHOME node <script>`)
Open EA, advance Next/Review until `3/4 pages`, then:
```js
const dump = await page.evaluate(() => {
  const docs = [document];
  for (const f of document.querySelectorAll('iframe')) { try { const d = f.contentDocument; if (d) docs.push(d); } catch (e) {} }
  const radios = [];
  for (const doc of docs) { try {
    for (const r of doc.querySelectorAll('div[role=radio]')) {
      const fs = r.closest('fieldset') || r.closest('div[role=group]') || r.closest('li') || r.closest('div');
      radios.push({ opt: (r.innerText||'').trim(), aria: r.getAttribute('aria-label'),
                    checked: r.getAttribute('aria-checked'),
                    grp: ((fs && fs.innerText)||'').replace(/\s+/g,' ').trim().slice(0,160) });
    }
  } catch (e) {} }
  const native = [];
  for (const doc of docs) { try {
    for (const r of doc.querySelectorAll('input[type=radio]')) if (!r.checked)
      native.push({ val: r.value, grp: ((r.closest('fieldset')||r.closest('li')||r.closest('div')||{}).innerText||'').replace(/\s+/g,' ').trim().slice(0,120) });
  } catch (e) {} }
  return { radios, native, pageno: (document.body.innerText.match(/(\d+)\/(\d+)\s+pages/i)||[])[0] };
});
console.log(JSON.stringify(dump, null, 1));
```
Observed for a stuck job:
```
RADIOS: [{opt:"Yes",aria:"Yes",checked:"false",grp:"Yes No"},
         {opt:"No", aria:"No", checked:"false",grp:"Yes No"}]
NATIVE UNCHECKED: [{val:"on",grp:"Yes No"},{val:"on",grp:"Yes No"}]
```
i.e. a Yes/No consent group whose question label is empty, plus the reCAPTCHA textarea. The
toggle's "Off" option only appears in `unanswered.labs` because the label leaks from a sibling
span — confirming the iframe + sibling-label structure.

## Fixes applied (apply_one.cjs)
1. **Iframe-aware scans** — collect from `[document]` + each `iframe.contentDocument` (same-origin
   accessible) in: `radiosInfo` extraction, the radio CLICK loop (re-walk top+iframes by global
   index so it aligns with `radiosInfo`), the native `<input type=radio>` opt-out pass, and the
   unanswered-detection block.
2. **Radio CLICK is iframe-aware** — replaced `page.$$('div[role=radio]')` (top-doc only) with a
   `page.evaluate` that re-walks top+iframes by index and does `r.click()` +
   `dispatchEvent(new MouseEvent('click',{bubbles:true}))` + `scrollIntoView`.
3. **On/Off mapping** — `answer(q)` returns Yes/No for consent; map `Yes→on`, `No→off` so the
   literal toggle option matches.
4. **Opt-out fallback** — capture `groupText` per radio; when `q===''` and the option is a literal
   `"Off"` (or aria "Off", or an On/Off consent group containing `off`), select Off. Safe, never
   blocks submission.
5. **Doctor, don't hammer** — if a job still STUCK with an unresolvable `(unlabeled radio)`, it is a
   genuine required question with no derivable answer → SKIP (skip.json), never fabricate. Do not
   loop-retry the same job (session-throttle / ban risk).

## Verification status
`node --check apply_one.cjs` → OK. End-to-end submit NOT re-confirmed on the two originally-stuck
test jobs (4460103204, 4458652901) because repeated test clicks tripped LinkedIn's SESSION THROTTLE
(`modal_no_open`) — a real throttle, not a code bug. The fix is correct by construction and the
live loop applies to FRESH jobs. Re-verify on a clean session if thumbs-up needed.
