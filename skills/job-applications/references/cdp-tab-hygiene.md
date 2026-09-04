# CDP tab hygiene — crash-proofing the browser-automation rail

Verified 2026-08-20 during the autonomous job-apply loop (9222 LinkedIn + 9223
Greenhouse Chrome). This is the single most important robustness lesson for any
long-running puppeteer-core / CDP driver that opens pages in a logged-in Chrome.

## The bug that took the pipeline down
The `withPage(fn)` helper opened a FRESH tab per call (`browser.newPage()`) and
closed it only inside the `finally` block. That works UNLESS `fn` hangs — and
external/custom ATS pages (e.g. `brex.com/careers`, `databricks.com/company/careers`)
often **never fire a `load` event** (Cloudflare / heavy JS), so `page.goto` hangs
PAST its own `timeout` (a known puppeteer footgun: `goto` ignores `timeout` when
the load event never fires). When `fn` never returns, the `finally` never runs,
the tab is never closed. Over 30+ cycles x 8 jobs the browser accumulated
**418 open tabs**, choked, and crashed (CDP `/json` stopped responding). THAT is
what looked like "can't apply to external ATS" — the browser was dead, not the ATS.

## The fix (ship this in every CDP helper)
1. **Hard watchdog around `withPage`.** Force-close the page after a hard cap
   (75s) even if `fn` is still running:
   ```js
   async function withPage(fn, capMs = 75000) {
     const wsEndpoint = await getBrowserWSEndpoint();
     const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint, defaultViewport: null });
     let page = null, killed = false, timer = null;
     try {
       page = await browser.newPage();
       timer = setTimeout(async () => {
         killed = true;
         try { if (page && !page.isClosed()) await page.close(); } catch (e) {}
         try { await browser.disconnect(); } catch (e) {}
       }, capMs);
       return await fn(page, browser);
     } finally {
       if (timer) clearTimeout(timer);
       if (!killed) {
         if (page) { try { if (!page.isClosed()) await page.close(); } catch (e) {} }
         try { await browser.disconnect(); } catch (e) {}
       }
     }
   }
   ```
2. **Wrap every `page.goto` in a `Promise.race` with an explicit timeout** so a
   hanging load can never stall the driver:
   ```js
   const withTimeout = (p, ms, label) =>
     Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT ' + label)), ms))]);
   await withTimeout(page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 }), 22000, 'goto');
   ```
3. **Skip-list for dead URLs.** Any URL that (a) is not a known board pattern,
   (b) fails `goto`, or (c) has no form after load -> record in `gh_skip.json` and
   NEVER retry it. Without this the loop re-opens the same hung external ATS every
   cycle forever. Example gate:
   ```js
   const isGreenhouseBoard = (url) =>
     /job-boards\.greenhouse\.io\/[a-z0-9]+\/jobs\/\d+|boards\.greenhouse\.io\/[a-z0-9]+\/jobs\/\d+/i.test(url);
   if (!isGreenhouseBoard(url)) { markSkip(url, 'not_greenhouse_board'); return 'skipped'; }
   ```
   Custom-domain Greenhouse jobs (`brex.com/careers/...`) are NOT board URLs and
   must be skipped (they hang); use the `job-boards.greenhouse.io/<company>/jobs/<id>`
   form instead.
4. **Tab audit when clogged.** If the browser already has a huge tab count,
   `puppeteer pages()` itself hangs — close tabs via the raw
   `http://127.0.0.1:<port>/json/close/<id>` endpoint instead, leaving one newtab.

## REVOKED rule (was wrong, caused the pile-up)
Old skill text said "**Single-tab ONLY** — reuse `pages[0]`, never `newPage()`."
That rule caused the `"Execution context was destroyed"` race (two callers fought
over one shared tab) AND structurally set up the 418-tab crash. The CORRECT rule is:
**isolated tab per call, closed in `finally` AND by the 75s watchdog.** A new tab in
the same browser still shares the session (cookies are account-scoped, not tab-scoped),
so login is preserved and NO re-auth is needed. Do NOT revert to `pages[0]`.

## Chrome launch note (Windows)
The Chrome binary is at `C:/Program Files/Google/Chrome/Application/chrome.exe`,
NOT under `AppData/Local/Google/...` — a wrong path makes `chrome.exe` exit
silently and the CDP port never comes up. Relaunch flags (keep the browser alive
across turns):
`chrome.exe --remote-debugging-port=9223 --user-data-dir=OPERATOR_HOME/greenhouse-chrome
--disable-blink-features=AutomationControlled --no-first-run
--disable-backgrounding-occluded-windows --disable-renderer-backgrounding
--disable-background-timer-throttling --hide-crash-restore-bubble --no-sandbox`
Health probe: `curl -s -m8 http://127.0.0.1:9223/json/version` must return JSON.
