# Autonomous Loop: Dedup + Skip-List + Profile-Relevance Gate (FIXED XXXXXXX-22)

## Symptom operator reported
- "It just re-opens the same set of jobs and fails."
- "Applying to off-target roles."
Root cause: `autoapply_loop.py` scraped the SAME static LinkedIn search results every cycle and
applied the first 6 IDs with ZERO filtering. Failed jobs got re-attempted forever
(one job 101x, another 68x; 465 unique jobs but 3434 total attempts = 7x repeat ratio).
Off-target roles (C++ / Java-Spring / Pune-onsite) were applied alongside relevant ones.

## Fixes (all in autoapply_loop.py, verified end-to-end)
1. **Skip-list (`li_skip.json`)** — `record_outcome(jid, outcome, steps)` records every outcome.
   PERMANENTLY skipped (never re-opened) when outcome in {`ALREADY_APPLIED`, `NO_EA_BUTTON`,
   `applied`} OR after `tries>=3` of any non-submitted outcome (STUCK/failed).
   `should_skip(jid)` is consulted before every apply. Seed historically-retried jobs (>=20
   attempts in the log) at startup so the loop stops touching them immediately.
2. **Dedup against `applied.json`** — `applied_ids()` excludes already-submitted jobs before apply.
3. **Profile-relevance gate** — `relevant(title)` scores each scraped title.
   - STRONG_KW = frontend/front-end/javascript/typescript/react/vue/angular/node/nodejs/ui engineer/
     web developer/full stack/software engineer.
   - SKIP_KW = c++/java/spring boot/golang/mainframe/electronic trading/quant/data scientist/db/devops/
     sre/embedded/firmware/support/qa/pm/sales/etc.
   - Conservative: unknown/ambiguous titles are SKIPPED (only clear matches get applied).
   - operator LOVES frontend + JavaScript — this is the priority filter; do NOT apply to generic
     "software engineer" roles that are actually backend/Java/C++.
4. **Tightened `LI_SEARCHES`** to 10 frontend/JS-specific queries (frontend/react/javascript/typescript/
   vue/angular/node/ui/XXXXXXX variants, `f_TPR=r86400`), removed broad "senior software engineer"/
   "full stack"/"software engineer XXXXXXX" that pulled C++/backend noise.
5. **`li_scrape()` returns `[(id, title), ...]`** (not just IDs) so the relevance filter scores titles
   without an extra network call. `LI_SCRAPE_JS` grabs `a[href*="/jobs/view/"]` innerText as title.

## Loop flow (current)
scrape -> drop applied+skipped -> drop off-target (logs "LI off-target (skipped): N") ->
apply only relevant+fresh (max 6/cycle) -> 120s cooldown.

Verified: off-target jobs ("Senior Java Backend Engineer (Spring Boot)", "Software Developer - Low
Latency C++") are skipped; only frontend/JS roles applied.

## Regression check
If "opening the same job repeatedly" returns, confirm `li_skip.json` is written by `record_outcome`
and `should_skip()` is called in the loop's LinkedIn phase. A missing skip-list re-opens the
infinite-retry loop.
