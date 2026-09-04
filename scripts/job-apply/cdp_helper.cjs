const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const WS_URL_FILE = 'OPERATOR_HOME/job-apply/chrome9222_ws.txt';
const COOKIE_FILE = 'OPERATOR_HOME/job-apply/li_session_cookies.json';

async function getBrowserWSEndpoint() {
  const http = require('http');
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9222/json/version', res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{ resolve(JSON.parse(d).webSocketDebuggerUrl);}catch(e){reject(e);} });
    }).on('error', reject);
  });
}

async function restoreCookies(page) {
  try {
    // Only restore cookies if file exists and is less than 24h old
    // Stale cookies override the browser's current valid session
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


async function recoverLinkedInSession(page) {
  try {
    await page.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));
    let url = page.url();
    // If we're on the login page, try to use the cached "Welcome back" one-tap sign-in
    if (url.includes('/login') || url.includes('/checkpoint')) {
      console.log('On login page, attempting one-tap sign-in...');
      // Try multiple times - LinkedIn may take a moment to detect browser session
      for (let attempt = 0; attempt < 3; attempt++) {
        const clicked = await page.evaluate(() => {
          const btns = [...document.querySelectorAll('button, a')];
          // LinkedIn "Welcome back" one-tap button
          const oneTap = btns.find(b => /sign in with one click|use cached session/i.test((b.innerText || '').trim()));
          if (oneTap) { oneTap.click(); return 'clicked_one_tap'; }
          // Generic "Sign in" button (Welcome back page)
          const signInBtn = btns.find(b => /^sign in$/i.test((b.innerText || '').trim()));
          if (signInBtn) { signInBtn.click(); return 'clicked_sign_in'; }
          return 'no_button_found';
        });
        console.log('  Attempt ' + (attempt+1) + ': ' + clicked);
        if (clicked === 'no_button_found') break;
        // Wait for LinkedIn to process (up to 8s per attempt)
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

async function withPage(fn, capMs=75000) {
  const wsEndpoint = await getBrowserWSEndpoint();
  const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint, defaultViewport: null });
  let page = null;
  let killedByWatchdog = false;
  let timer = null;
  try {
    page = await browser.newPage();
    // Restore LinkedIn cookies to new page
    await restoreCookies(page);
    // Recover session if cookies are stale (LinkedIn "Welcome back" one-tap login)
    await recoverLinkedInSession(page);
    
    timer = setTimeout(async () => {
      killedByWatchdog = true;
      try { if (page && !page.isClosed()) await page.close(); } catch (e) {}
      try { await browser.disconnect(); } catch (e) {}
    }, capMs);
    return await fn(page, browser);
  } finally {
    if (timer) clearTimeout(timer);
    if (!killedByWatchdog) {
      if (page) { try { if (!page.isClosed()) await page.close(); } catch (e) {} }
      try { await browser.disconnect(); } catch (e) {}
    }
  }
}

module.exports = { puppeteer, withPage, getBrowserWSEndpoint, recoverLinkedInSession };
