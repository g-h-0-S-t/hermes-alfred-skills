# LinkedIn Session Recovery (2026-09-01)

The `cdp_helper.cjs` had a bug where it would restore stale cookies (13+ days old) to every new tab, overriding the browser's current valid session. This caused LinkedIn to show a "Welcome back" one-tap login page on every navigation.

## The Bug

1. `cdp_helper.cjs` `restoreCookies()` read `li_session_cookies.json` and called `page.setCookie(...)` on every new tab
2. The cookie file was 13+ days old (stale) — LinkedIn had since issued new session cookies via the browser's cached "Welcome back" one-tap login
3. The stale cookies overwrote the valid session → LinkedIn showed the login page
4. The script didn't handle the login page → every navigation failed

## The Fix (2026-09-01)

Two changes to `cdp_helper.cjs`:

### 1. Stale cookie skip
```javascript
async function restoreCookies(page) {
  try {
    const stat = fs.statSync(COOKIE_FILE);
    const ageHours = (Date.now() - stat.mtime.getTime()) / 3600000;
    if (ageHours > 24) {
      console.log(`Cookie file stale (${ageHours.toFixed(1)}h old) — skipping restore, using browser's current session`);
      return;
    }
    const cookies = JSON.parse(fs.readFileSync(COOKIE_FILE, 'utf8'));
    await page.setCookie(...cookies);
    console.log(`Restored ${cookies.length} cookies to page (${ageHours.toFixed(1)}h old)`);
  } catch (e) {
    console.log(`Could not restore cookies: ${e.message}`);
  }
}
```

### 2. One-tap login recovery
```javascript
async function recoverLinkedInSession(page) {
  try {
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    let url = page.url();
    if (url.includes('/login') || url.includes('/checkpoint')) {
      console.log('On login page, attempting one-tap sign-in...');
      for (let attempt = 0; attempt < 3; attempt++) {
        const clicked = await page.evaluate(() => {
          const btns = [...document.querySelectorAll('button, a')];
          const oneTap = btns.find(b => /sign in with one click|use cached session/i.test((b.innerText || '').trim()));
          if (oneTap) { oneTap.click(); return 'clicked_one_tap'; }
          const signInBtn = btns.find(b => /^sign in$/i.test((b.innerText || '').trim()));
          if (signInBtn) { signInBtn.click(); return 'clicked_sign_in'; }
          return 'no_button_found';
        });
        console.log('  Attempt ' + (attempt+1) + ': ' + clicked);
        if (clicked === 'no_button_found') break;
        await new Promise(r => setTimeout(r, 8000));
        url = page.url();
        if (!url.includes('/login') && !url.includes('/checkpoint')) {
          console.log('Session recovered, now on: ' + url);
          // Save fresh cookies
          try {
            const cookies = await page.cookies();
            fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies, null, 2));
            console.log('Saved ' + cookies.length + ' fresh cookies');
          } catch (e) {}
          return true;
        }
      }
      return false;
    }
    return true; // Already on feed, session is fine
  } catch (e) {
    console.log('Session recovery error: ' + e.message);
    return false;
  }
}
```

## Key Principle

**The browser's current session is authoritative.** Only restore cookies if they're fresh (<24h). If stale, let the browser use its cached session and recover via one-tap login.

## Verification

After the fix:
- Navigate to `https://www.linkedin.com/feed/` → should stay on `/feed/` (not redirect to `/login`)
- If on login page → click one-tap sign-in → wait for redirect → save fresh cookies
- The `li_session_cookies.json` is updated with fresh cookies for future use
