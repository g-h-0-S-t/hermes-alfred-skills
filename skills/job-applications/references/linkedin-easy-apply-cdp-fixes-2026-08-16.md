# LinkedIn Easy Apply — CDP driver fixes (validated XXXXXXX)

Concrete, verified-working fixes for the `linkedin-easy-apply.cjs` / `apply_one.cjs`
puppeteer-core driver on the logged-in LINKEDIN_PORT Chrome. Each was isolated and proven
against a live EA form this session; do NOT reintroduce the broken patterns.

## 0. SOM / computer_use HANGS LinkedIn — do NOT use it here (HARD)
Driving the LINKEDIN_PORT LinkedIn Chrome via `computer_use` SOM/UIA/AX **reproduced 3x
Windows Event ID 1002 "Application Hang"**: the accessibility-tree walk over
LinkedIn's huge DOM blocks the main thread, CDP `/json` times out, the browser
becomes unresponsive. `cua-driver` freezes.
- Use raw CDP (puppeteer-core `connect` to `ws://127.0.0.1:LINKEDIN_PORT`) + `vision_analyze`
  on `page.screenshot()` for verification. That is the only path that does not hang.
- The older SKILL.md text that says "verify with SOM capture mode='som'" is WRONG for
  LinkedIn — it will kill the session. Corrected XXXXXXX.
- If operator insists on SOM: safe ONLY on a different browser/context that is not
  LinkedIn. For LinkedIn EA, raw CDP is mandatory.

## 1. Modal detection — don't rely on `div[role=dialog]`
LinkedIn's EA modal uses `artdeco-modal` / `jobs-easy-apply` class, NOT always
`role=dialog`. Detection by `role=dialog` alone -> false "MODAL_DID_NOT_OPEN" even
though the form is clearly open (Contact info visible).
Fix: detect open EA modal by body text:
`/contact info|additional questions|review your application/i.test(document.body.innerText)`
OR the modal container selectors. Re-check after the EA click (poll up to ~15s).

## 2. Action buttons must be SCROLLED INTO VIEW before click
`clickCenter`/bounding-box clicks MISS when the button is below the fold (off-screen).
The modal has an inner scroll container; the Submit/Next button sits at the bottom.
Symptom: "clicked Submit" logged but the modal stays on the same step (no submit happened).
Fix: scroll the modal's scroll container to bottom BEFORE clicking, then click the
element handle directly (`el.evaluate(b => b.click())` — trusted in-page click on the
actual button element, not a synthetic mouse-at-center).
```js
const sc = m.querySelector('[class*="scroll"], [class*="overflow"]') || m;
if (sc && sc.scrollTo) sc.scrollTo({ top: sc.scrollHeight, behavior:'smooth' });
// then: await subEl.evaluate(b => b.click());
```

## 3. "Next" button must be matched too (not just Continue/Review/Submit)
`findBtnInModal` regex often only matched `Continue to next step|Review|Submit`.
Plain "Next" (1/4 pages, 2/5 pages, etc.) was unmatched -> "no-continue-submit" bail
even though advancing was possible.
Fix: include `^Next$` in the button regex:
`/Continue to next step|Continue|Review your application|^Review$|^Next$/`

## 4. Contact: do NOT re-set the phone / overwrite LinkedIn pre-fill
LinkedIn pre-fills email + phone-country-code + phone from the profile. Forcing
`input[type=tel]`/`[id*=phone]` via the prototype setter CORRUPTED the phone
country-code dropdown (showed "Andorra (+376)"). The email is also already correct.
Fix: only force-set email IF empty; leave phone/country-code alone (LinkedIn's pre-fill
is authoritative). Better: just verify via DOM that email/phone are present; do not write.

## 5. Text fields + answer() gaps (verified, CORRECTED XXXXXXX session #2)
Question phrasings that were NOT matched left required fields empty -> form looped on
Review/Next. Fix `answer()` to cover:
- "How many years of Software Development experience do you currently have?" -> broaden to
  `/years? .*experience|years? of (work )?experience/i` -> "14".
- Skill-specific years ("...with Java?*", "...with Angular?*") — LinkedIn splits the label:
  `<p>` = "How many years... with" + nested `<span>` = "Java?*". The matcher needs the FULL
  question. Climb to preceding siblings then parent's preceding siblings (up to 6 levels),
  reading the `<p>`/`<label>`/`<span>` text; the `<p>` holds the prefix and the span holds
  "Java?*". Use `textContent` aggregation, slice at first "?" (+ trailing "*").
- "Are you comfortable working remotely?" / "willing to undergo a background check?" ->
  add `answer()` handlers: `/remote/i`, `/background check|willing to undergo/i`,
  `/comfortable working/i` -> "Yes". (Insurance/BFSI domain -> "No"; operator is not in insurance.)
- "We must fill this position urgently. Can you start immediately?" / notice period /
  "available to start" / "join immediately" -> `/start immediately|notice period|available
  to start|can you start|join immediately/i` -> "Yes" (operator joins immediate).
- Also: authorized-to-work -> "Yes"; sponsorship -> "No"; relocate -> "Yes"; commute -> "Yes".

### Text-input FILLING — guillemet IDs break puppeteer selectors (CRITICAL, CORRECTED)
LinkedIn text-input IDs are like `«rf»` (guillemet chars). ALL of these FAIL:
- `page.$('#«rf»')` — puppeteer's CSS parser chokes on guillemets -> returns null.
- `page.$('#'+CSS.escape('«rf»'))` — `CSS.escape` does NOT make it parseable in puppeteer's
  engine -> STILL returns null. So `elementHandle.click`/`type` never fire (field stays empty,
  loops forever with "0/20" Invalid input).
- `elementHandle.click({clickCount:3})` + `elementHandle.type(val,{delay:20})` — fires, but the
  value does NOT stick across React re-render / step transition (reverts to empty on Next).
WORKING fill (verified: field went 0/20 -> "14" and SURVIVED the Next click):
  1. In-page focus (guillemet-safe): `document.getElementById(id).focus()` — JS `getElementById`
     handles guillemet IDs fine, unlike CSS selectors.
  2. Real key events from Node: `page.keyboard.down('Control'); press('A'); up('Control');
     press('Backspace'); page.keyboard.type(val,{delay:30});` — trusted key events React's
     controlled input respects, and they persist across step transitions.
  (Contact email/tel are an exception: the in-page prototype-setter
  `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set` + dispatchEvent
  works there. Use keyboard.type for Additional-Questions text fields to be safe.)

## 6. Custom radios: click the visible `[role=radio]` DIV via trusted click (CORRECTED)
LinkedIn renders radios as a hidden `<input type=radio>` (guillemet ID, empty `aria-label`)
+ a visible `DIV[role=radio]` whose visible text is the option ("Yes"/"No"). The
`<input>`'s associated `<label for=ID>` is EMPTY and clicking it does NOTHING.
What DOES NOT work (verified):
- Clicking the hidden `<input>` (synthetic OR trusted) -> nothing.
- `DIV[role=radio].click()` (synthetic in-page) -> does NOT set `checked` (React's onChange
  isn't triggered by a synthetic `.click()`).
- `page.mouse.click(x,y)` at `getBoundingClientRect()` coords measured AFTER scrolling
  sibling radios into view -> coords go stale (scrolling radio #2 moves #1 off-screen) ->
  clicks miss.
What DOES work (verified: `checked` went 0 -> 1):
- `elementHandle.click({delay:50})` on the `DIV[role=radio]` — puppeteer's trusted click on
  the element handle uses the element's own box, no coord math. Get handles with
  `page.$$('div[role=radio]')` and click the matching index.
- Match the option by the `DIV[role=radio]`'s `innerText` ("Yes"/"No") against `answer(q)`,
  where `q` is the question found by climbing preceding-siblings then parent's
  preceding-siblings (up to 8 levels) for the nearest text containing "?".
- IMPORTANT: scroll the handle into view right before clicking (`h.scrollIntoViewIfNeeded?.()`
  or `h.scrollIntoView()`), then click — don't batch all coords first or earlier scrolls
  invalidate them.
Symptom of the broken click: radio stays `checked=false`, "This field is required" persists,
form loops on Review/Next.

## 7. STUCK detection — stop looping on ANY non-advance, log buttons (CORRECTED)
Old driver clicked Next/Review up to 7-10x blindly. If a required field is unanswered,
the page number never advances.
FIX (verified): track `pageNo` (`/(\d+)\/(\d+)\s+pages/`). After a Next/Review click, if
`pageNo` did NOT change, STOP — do NOT gate on `/invalid input|this field is required/`.
The review/summary step has NO "invalid" text, so an `invalid`-only gate lets it loop
forever clicking "Review" (the modal buttons are just ["Back","Review"], no "Submit"
appears because the blocking field prevented reaching the final submit screen).
When stuck, capture and log: (a) the unanswered field labels (closest preceding `<p>`/`<label>`
text, or "(unlabeled <type>)"), and (b) ALL modal button texts — the button list is the
fastest tell of which step you're wedged on and whether a "Submit" exists. Record `unanswered`
and `STUCK`, then skip the job and surface the missing `answer()` key to user.
A frequent wedge: a radio question whose `answer()` returns null (e.g. "Can you start
immediately?" had no handler) -> radio never clicks -> page never advances past that step.

## Symptom -> cause (XXXXXXX)
| Symptom | Cause | Fix |
|---|---|---|
| "MODAL_DID_NOT_OPEN" but form visible | `role=dialog`-only detection | #1 |
| "clicked Submit" but still on step | button off-screen, center-click missed | #2 |
| "no-continue-submit" on 1/4 pages | "Next" not matched | #3 |
| phone country code shows wrong country | re-set phone corrupted pre-fill | #4 |
| Loops on Next/Review, never submits | required field unanswered (years/remote/background/skill/start-immediately) | #5, #7 |
| Radio "This field is required" | clicked hidden `<input>` OR synthetic `div.click()` OR stale mouse coords | #6 |
| Years field "Invalid input" despite value | synthetic `.value` set / `clickCount:3`+type reverted on step change | #5 (keyboard.type) |
| Stuck on Review/summary, no Submit button | #7 gate required "invalid" text that the review step lacks -> infinite Review loop | #7 (drop invalid gate) |
| Radio won't check, `#«rf»` field stays empty | `page.$('#«rf»')` / `CSS.escape` both return null on guillemet IDs | #5 (focus via getElementById + keyboard.type) |

## Verified result this session
With fixes #1-#7 applied to `apply_one.cjs` (puppeteer-core, LINKEDIN_PORT Chrome), jobs
submitted cleanly: ghar11 (4451733658) and KredMe (4453985687) reached "Application
submitted" (confirmed via `applied:true` DOM check + screenshot). Multi-step forms with
Additional Questions (years/remote/background-check radios) advanced once the `answer()`
gaps were closed.
