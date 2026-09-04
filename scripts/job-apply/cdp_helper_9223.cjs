const puppeteer = require('puppeteer-core');
async function getBrowserWSEndpoint() {
  const http = require('http');
  return new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:9223/json/version', res => {
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{ try{ resolve(JSON.parse(d).webSocketDebuggerUrl);}catch(e){reject(e);} });
    }).on('error', reject);
  });
}
// Hard-capped page wrapper: guarantees the tab is closed even if fn hangs.
async function withPage(fn, capMs=75000) {
  const wsEndpoint = await getBrowserWSEndpoint();
  const browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint, defaultViewport: null });
  let page = null;
  let killedByWatchdog = false;
  let timer = null;
  try {
    page = await browser.newPage();
    // Watchdog: if fn runs longer than capMs, force-close the page so it can never
    // accumulate as a stuck tab (the root cause of the 400+ tab pile-up).
    timer = setTimeout(async () => {
      killedByWatchdog = true;
      try { if (page && !page.isClosed()) await page.close(); } catch (e) {}
      try { await browser.disconnect(); } catch (e) {}
    }, capMs);
    const result = await fn(page, browser);
    return result;
  } finally {
    if (timer) clearTimeout(timer);
    if (!killedByWatchdog) {
      if (page) { try { if (!page.isClosed()) await page.close(); } catch (e) {} }
      try { await browser.disconnect(); } catch (e) {}
    }
  }
}
module.exports = { puppeteer, withPage, getBrowserWSEndpoint };
