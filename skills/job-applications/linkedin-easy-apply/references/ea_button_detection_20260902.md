# EA Button Detection + Daily Limit Fix (2026-09-02)

Root cause of a zero-apply streak despite the scrape surfacing relevant jobs.

## The bug

`apply_one.cjs` detected the Easy Apply control with a selector restricted to
`<button>` elements:

```js
const btn = [...document.querySelectorAll('button')]
  .find(e => /^(easy apply|apply)$/i.test(e.textContent.trim()));
```

LinkedIn renders the EA control as an `<a>` element on some job detail pages
(especially newer UI variants and A/B test buckets). When the control was an `<a>`,
the selector returned `null` → the script reported `no_ea_button` → the job was
skipped as "genuinely non-EA" even though it had a working Easy Apply flow.

Symptom in logs: `LI jobs found: N` with N>0, but every job hit `no_ea_button`
and zero submissions recorded. A naive reading blamed LinkedIn throttle; the real
cause was the narrow selector.

## The fix

Search all three control types, not just `<button>`:

```js
const EA_SELECTOR = 'button, a, div[role="button"]';
const btn = [...document.querySelectorAll(EA_SELECTOR)]
  .filter(el => el.closest('main'))
  .find(e => /^(easy apply|apply)$/i.test(e.textContent.trim()));
```

The `el.closest('main')` filter avoids matching the header "Apply" link
(`/premium/products/...`) and other non-job controls.

## Daily-limit modal

LinkedIn shows "You reached today's Easy Apply limit" as a modal overlay when the
daily cap is hit. This is NOT a session throttle (where the EA control is present
but the modal silently won't open). Detection + dismissal:

```js
const limitModal = await page.evaluate(() => {
  const modals = [...document.querySelectorAll('div[role="dialog"], [class*="modal"], [class*="overlay"])];
  const m = modals.find(el => /reached today.*easy apply limit/i.test(el.textContent));
  return m ? m.textContent.slice(0, 200) : null;
});
if (limitModal) {
  // dismiss
  const gotIt = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button, a, div[role="button"]')];
    const b = btns.find(e => /got it|okay|dismiss/i.test(e.textContent.trim()));
    if (b) { b.click(); return true; }
    return false;
  });
  // back off ~2h, do NOT loop
  return { outcome: 'EA_DAILY_LIMIT', dismissed: gotIt };
}
```

## Distinguishing the three silent-stop signals

| Signal | What you see | Meaning | Action |
|--------|-------------|---------|--------|
| `daily-limit` | Modal text "You reached today's Easy Apply limit" | Daily cap hit | Dismiss + 2h backoff |
| `session-throttle` | EA control present, modal silently won't open (no text, no error) | LinkedIn rate-limiting the apply flow | 30min-24h wait |
| `no_ea_button` | No control matching Easy Apply/Apply in `<main>` | Genuinely non-EA job | Skip, log to skip.json |
| `LI jobs found: 0` | Scrape returned empty | Browser died or logged out | Check `curl -s -m8 http://127.0.0.1:LINKEDIN_PORT/json/version` FIRST |

Never assume throttle from a flat `LI jobs found: 0` — always probe the port.
A zero-scrape with a live port and valid `li_at` cookie means the search URLs
returned no fresh jobs (widen keywords), not throttle.
