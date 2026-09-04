const { withPage } = require('XXXXXXX/job-apply/cdp_helper.cjs');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ===== user's VERIFIED PROFILE =====
const PROFILE = {
  name: 'XXXXXXX', email: 'XXXXXXX', phone: 'XXXXXXX_NUMBER',
  location: 'XXXXXXX, Karnataka, XXXXXXX', currentCTC: 'XXXXXXX', expectedCTC: 'XXXXXXX',
  currentCTC_LPA: '86', expectedCTC_LPA: '50', currentEmployer: 'Stealth',
  github: 'https://github.com/YOUR_GITHUB_USERNAME', linkedin: 'https://linkedin.com/in/operatorXXXXXXX',
  experienceYears: 14,
  education: [
    { level: 'Class 10 ICSE', inst: "St. Michael's School, Durgapur", year: 2006, score: '79.33' },
    { level: 'Class 12 ISC (Science)', inst: "St. Michael's School, Durgapur", year: 2008, score: '72.57' },
    { level: 'B.Tech EEE', inst: 'Camellia Institute of Technology (CIT), WBUT', year: 2012, score: '7.26' }
  ],
  skills: { 'javascript':14,'typescript':10,'node':10,'node.js':10,'react':9,'vue':5,'python':5,'c#':3,'sql':12,'postgresql':12,'postgres':12,'mssql':5,'oracle':5,'html':14,'css':14,'scss':10,'jquery':5,'selenium':4,'docker':3,'kubernetes':2,'aws':3,'azure':2,'gcp':2,'angular':5,'express':10,'rest':12,'soap':5,'microservices':8,'micro-frontends':4,'system design':8,'ci/cd':5,'git':10,'github actions':4,'jenkins':4,'webpack':5,'gulp':4,'ollama':2,'lm studio':2,'ai agents':3,'prompt eng':3,'chrome ext':4,'iam/kyc':4,'oauth2':4,'oidc':4,'sso':4,'rbac':3,'zero-trust':3,'owasp':3,'aes-256':3 },
  aiTools: 'Hermes, omniroute (model routing), Antigravity (Google DeepMind agentic coding), Kilo Code and Cursor (AI coding in VS Code), plus Ollama/LM Studio with local LLMs for applied-AI agents; Chrome-extension AI features and LangChain-style orchestration.',
  relocation: 'Yes', workAuth: 'Yes', sponsorship: 'No', joinImmediate: 'Yes'
};

// ===== ANSWER LOOKUP TABLE (instant, no LLM needed) =====
function getAnswer(label, optText) {
  const q = (label || '').toLowerCase();
  const o = (optText || '').toLowerCase();
  
  // Structured numeric fields
  if (/current.*(salary|ctc|compensation)|salary.*current|compensation.*current/i.test(q))
    return /lpa/i.test(q) ? '86' : 'XXXXXXX';
  if (/expected.*(salary|ctc)|salary.*expected|expectation|compensation/i.test(q))
    return /lpa/i.test(q) ? '50' : 'XXXXXXX';
  if (/total (exp|experience)|overall experience|years of (total )?experience/i.test(q))
    return '14';
  if (/notice period|serving|np\?|notice/i.test(q)) return '0';
  if (/how many hours.*(per week|can you contribute|available)/i.test(q)) return '40';
  if (/hours per week|hours per day|availability.*hours/i.test(q)) return '40';
  
  // Years of experience with specific skill
  if (/how many years|years of .*experience|years .*experience|experience (do you )?have with/i.test(q)) {
    const skills = PROFILE.skills;
    for (const skill in skills) {
      if (q.includes(skill.toLowerCase())) return String(skills[skill]);
    }
    // Common tech patterns
    if (/react/i.test(q)) return '9';
    if (/node/i.test(q)) return '10';
    if (/typescript/i.test(q)) return '10';
    if (/javascript/i.test(q)) return '14';
    if (/python/i.test(q)) return '5';
    if (/sql/i.test(q)) return '12';
    if (/aws/i.test(q)) return '3';
    if (/docker/i.test(q)) return '3';
    if (/kubernetes|k8s/i.test(q)) return '2';
    if (/angular/i.test(q)) return '5';
    if (/vue/i.test(q)) return '5';
    if (/c#|csharp/i.test(q)) return '3';
    if (/java(?!script)/i.test(q)) return '0';
    if (/c\+\+/i.test(q)) return '0';
    if (/ruby/i.test(q)) return '0';
    if (/php/i.test(q)) return '0';
    if (/go$|golang/i.test(q)) return '0';
    if (/rust/i.test(q)) return '0';
    if (/swift/i.test(q)) return '0';
    if (/kotlin/i.test(q)) return '0';
    return '0';
  }
  
  // Location
  if (/which location|current location|preferred location|location are you applying|where are you located/i.test(q))
    return 'XXXXXXX, Karnataka, XXXXXXX';
  if (/current city|city of residence/i.test(q)) return 'XXXXXXX';
  if (/country of residence|currently (live|residing|based) in|country.*(reside|live)/i.test(q)) return 'XXXXXXX';
  
  // Yes/No questions
  if (/authorized to work|legally authorized|right to work|work (in|authorization)|eligible to work|work permit/i.test(q)) return 'Yes';
  if (/require sponsorship|sponsorship for|need sponsorship|will you require sponsorship|visa sponsorship/i.test(q)) return 'No';
  if (/able to meet this requirement|onsite at our .*office|relocate to .*office|willing to relocate to/i.test(q)) return 'No';
  if (/live in .* or .*willing to relocate|currently live in .*willing to relocate/i.test(q)) return 'No';
  if (/relocat|willing to (move|relocate)|live in .*or.*willing/i.test(q)) return 'Yes';
  if (/english fluency|language fluency|proficient in english|fluent in english|professional english/i.test(q)) return 'Yes';
  if (/background check|willing to undergo/i.test(q)) return 'Yes';
  if (/comfortable working/i.test(q)) return 'Yes';
  if (/driver'?s? license|driving license|valid driver/i.test(q)) return 'No';
  if (/commut/i.test(q)) return 'Yes';
  if (/start immediately|available to start|can you start|join immediately/i.test(q)) return 'Yes';
  if (/consent|processing (my )?data|share my (profile|data|information)|privacy policy/i.test(q)) return 'Yes';
  if (/work (from )?(the )?office|work 5 days|office in XXXXXXXX|onsite|in.?office/i.test(q)) return 'Yes';
  if (/intention to learn|willing to learn|eager to learn|strong intention/i.test(q)) return 'Yes';
  if (/budget/i.test(q)) return 'Yes';
  if (/remote/i.test(q)) return 'Yes';
  
  // Employer
  if (/current employer|employer name|company name|current company|most recent employer/i.test(q)) return 'Stealth';
  
  // Education
  if (/bachelor|undergraduate|b\.?tech|b\.?e\.?|b\.?sc|b\.?ca|b\.?com/i.test(q)) return 'Yes';
  if (/master|postgraduate|m\.?tech|m\.?e\.?|m\.?sc|mba|m\.?ca/i.test(q)) return 'No';
  if (/high school|class 12|12th|intermediate|hsc|senior secondary/i.test(q)) return 'Yes';
  if (/class 10|10th|secondary|ssc/i.test(q)) return 'Yes';
  if (/diploma/i.test(q)) return 'No';
  if (/phd|doctorate/i.test(q)) return 'No';
  if (/10th|12th|percentage in (10|12)/i.test(q)) return '10th: 79.33%, 12th: 72.57%';
  if (/cgpa|percentage in b\.?tech|b\.?tech.*(cgpa|percentage|marks)/i.test(q)) return '7.26';
  
  // Skills/insurance/bfsi
  if (/insurance|bfsi|domain experience/i.test(q)) return 'No';
  if (/do you have .*(experience|year)|hands[- ]?on (on )?a daily basis|professional software development experience|currently (employed|working)/i.test(q)) return 'Yes';
  
  // AI tools
  if (/ai tools|which ai|tools.*use daily|tools do you use|llm|large language model/i.test(q))
    return 'Hermes, omniroute, Antigravity, Kilo Code, Cursor, Ollama/LM Studio';
  
  // GitHub/portfolio
  if (/ai project|link to an? (example|project)|project you (built|shipped)|shipped.*project|portfolio|github/i.test(q))
    return 'https://github.com/YOUR_GITHUB_USERNAME';
  
  // LinkedIn
  if (/linkedin profile|linkedin url|link to your linkedin|your linkedin/i.test(q))
    return 'https://linkedin.com/in/operatorXXXXXXX';
  
  // Website
  if (/website|url|link to your site/i.test(q))
    return 'https://operatorXXXXXXX.portfolio.example.com.com';
  
  // Why/additional
  if (/why (do you|are you)|tell us about|anything else|additional information/i.test(q))
    return 'Experienced full-stack and applied-AI engineer (XXXXXXX) with strengths in identity/IAM, React/Node/TypeScript, and AI agents. Eager to contribute.';
  
  // Role category
  if (/role category|most closely matches your current or recent position|current or recent role|area of expertise/i.test(q))
    return 'Software Engineer';
  
  // Join
  if (/join|joining/i.test(q) && /day|immediate/i.test(q)) return 'Yes';
  if (/able to join|will you be able to join|join within/i.test(q)) return 'Yes';
  if (/how soon.*join|able to join.*\(in days\)|join us.*days|notice period.*days/i.test(q)) return '0';
  
  // Team/projects
  if (/team leads? or engineering managers? report to you|report to you/i.test(q)) return '0';
  if (/concurrent (client )?projects? (have you )?owned/i.test(q)) return '3';
  if (/accountable for delivery margin|project profitability/i.test(q)) return 'Yes';
  if (/in the last 90 days.*(write|review|debug|code)|how many days.*code/i.test(q)) return '90';
  
  // Past employer
  if (/have you (ever )?(worked|been employed|been an employee)|previously employed by|ever worked at|previously work(ed)? (with|at|for)/i.test(q)) return 'No';
  if (/worked for (kaseya)|employed by (kaseya)|kaseya.*employee|kaseya.*intern|kaseya.*contractor/i.test(q)) return 'No';
  
  // Live in X
  if (/do you currently live in/i.test(q)) return PROFILE.location.includes('XXXXXXX') && /XXXXXXX|XXXXXXXX/i.test(q) ? 'Yes' : 'Yes';
  
  // C++ specific
  if (/c\+\+.*(experience|hands|work)|worked with c\+\+/i.test(q)) return 'Yes';
  if (/do you work with c\+\+ in your current role/i.test(q)) return 'Yes';
  if (/electronic trading or/i.test(q)) return '14';
  
  // For radio/select questions, match option text
  if (optText) {
    if (/yes|no|on|off/i.test(optText)) {
      if (/authorized|legally|right to work|eligible|permit|comfortable|background|remote|english|fluent|proficien|commute|start|join|consent|agree|terms|privacy|office|onsite|learn|budget|immediate|relocat|move/i.test(q)) {
        if (/sponsorship|visa|driver|license/i.test(q)) return 'No';
        if (/onsite at our|relocate to .*office|able to meet/i.test(q)) return 'No';
        return 'Yes';
      }
    }
  }
  
  return null;
}

// ===== SCRAPE ALL FORM ELEMENTS =====
async function scrapeForm(page) {
  return await page.evaluate(() => {
    const modal = document.querySelector('dialog[open]');
    if (!modal) return { textFields: [], radios: [], selects: [], checkboxes: [] };

    const docs = [modal];
    for (const f of modal.querySelectorAll('iframe')) { try { const d = f.contentDocument; if (d) docs.push(d); } catch (e) {} }

    const textFields = [], radios = [], selects = [], checkboxes = [];

    for (const doc of docs) {
      for (const n of doc.querySelectorAll('input, textarea')) {
        const t = n.tagName.toLowerCase();
        const ty = (n.type || '').toLowerCase();
        if (!((t === 'input' && !['file', 'hidden', 'checkbox', 'radio', 'submit', 'button'].includes(ty)) || t === 'textarea') || n.disabled) continue;
        const id = n.id || '';
        let lab = (n.getAttribute('aria-label') || n.getAttribute('placeholder') || '').trim();
        if (!lab && id) { const l = doc.querySelector('label[for="' + id + '"]'); if (l) lab = l.innerText.trim(); }
        if (!lab) { const l = n.closest('label'); if (l) lab = l.innerText.trim(); }
        if (!lab) { const p = n.closest('div,li,section,fieldset'); if (p) { const h = p.querySelector('p,label,span,h3,h4'); if (h) lab = h.innerText.trim(); } }
        textFields.push({ id, ty, lab, val: (n.value || '').trim() });
      }
      for (const r of doc.querySelectorAll('div[role=radio]')) {
        const optText = (r.innerText || '').trim();
        if (!optText || /^\d+\/\d+ pages?$/i.test(optText)) continue;
        let q = '';
        const fs = r.closest('fieldset') || r.closest('div[role=group]') || r.closest('li') || r.closest('div');
        if (fs) {
          const prev = fs.previousElementSibling;
          if (prev) q = (prev.innerText || '').trim();
          if (!q) { const head = fs.querySelector('legend,label,h1,h2,h3,h4'); if (head) q = (head.innerText || '').trim(); }
        }
        radios.push({ q, optText, idx: radios.length });
      }
      for (const s of doc.querySelectorAll('select')) {
        if (s.disabled) continue;
        const lab = (s.closest('label')?.innerText || s.getAttribute('aria-label') || '').trim();
        selects.push({ id: s.id, lab, options: [...s.options].map(o => ({ v: o.value, t: o.text.trim() })) });
      }
      for (const c of doc.querySelectorAll('input[type=checkbox]')) {
        if (c.disabled) continue;
        const lab = (c.closest('label')?.innerText || c.getAttribute('aria-label') || '').trim();
        checkboxes.push({ id: c.id, name: c.name, lab, checked: c.checked });
      }
    }
    return { textFields, radios, selects, checkboxes };
  });
}

// ===== FILL FORM WITH ANSWERS =====
async function fillForm(page, formData, answers) {
  for (const f of formData.textFields) {
    if (f.val) continue;
    const ans = answers[f.lab];
    if (!ans) continue;
    try {
      await page.evaluate((id, val) => {
        const modal = document.querySelector('dialog[open]');
        const e = modal?.querySelector('#' + id); if (!e) return;
        const p = Object.getPrototypeOf(e); const s = Object.getOwnPropertyDescriptor(p, 'value');
        if (s && s.set) s.set.call(e, val);
        e.dispatchEvent(new Event('input', { bubbles: true }));
        e.dispatchEvent(new Event('change', { bubbles: true }));
      }, f.id, ans);
    } catch (e) {}
  }

  for (const r of formData.radios) {
    const ans = answers[r.q];
    if (!ans) continue;
    const ansLower = ans.toLowerCase();
    const optLower = r.optText.toLowerCase();
    if (ansLower === optLower || ansLower.includes(optLower) || optLower.includes(ansLower)) {
      await page.evaluate((idx) => {
        const modal = document.querySelector('dialog[open]');
        const all = modal ? [...modal.querySelectorAll('div[role=radio]')] : [];
        if (all[idx]) all[idx].click();
      }, r.idx).catch(() => {});
    }
  }

  for (const s of formData.selects) {
    const ans = answers[s.lab];
    if (!ans) continue;
    await page.evaluate((id, val) => {
      const modal = document.querySelector('dialog[open]');
      const e = modal?.querySelector('#' + id); if (!e) return;
      for (const o of e.options) {
        if (o.text.toLowerCase().includes(val.toLowerCase()) || o.value.toLowerCase().includes(val.toLowerCase())) {
          e.value = o.value; e.dispatchEvent(new Event('change', { bubbles: true })); return;
        }
      }
    }, s.id, ans).catch(() => {});
  }

  for (const c of formData.checkboxes) {
    if (c.checked) continue;
    const ans = answers[c.lab];
    if (!ans) continue;
    if (/yes|true|check|agree/i.test(ans)) {
      await page.evaluate((id) => {
        const modal = document.querySelector('dialog[open]');
        const e = modal?.querySelector('#' + id); if (e) e.click();
      }, c.id).catch(() => {});
    }
  }
}

// ===== MAIN =====
async function clickCenter(page, el) {
  const box = await el.boundingBox(); if (!box) return false;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  return true;
}

async function findBtnInModal(page, re) {
  return await page.evaluateHandle((reSrc) => {
    const rx = new RegExp(reSrc, 'i');
    const all = [...document.querySelectorAll('button')].filter(b => rx.test((b.innerText || '').trim()));
    const vis = all.find(b => { const r = b.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !b.disabled; });
    return vis || all[0] || null;
  }, re.source);
}

(async () => {
  const jobUrl = process.argv[2];
  const shot = 'XXXXXXX/job-apply/apply_' + Date.now() + '.png';
  const out = { jobUrl, error: null, steps: [], submitted: false };

  await withPage(async (page) => {
    try {
      await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 25000 }); await sleep(2000);

      let eaEl = null;
      for (let i = 0; i < 8; i++) {
        const h = await page.evaluateHandle(() => {
          // Prefer exact "Easy Apply" text (short < 25 chars) to avoid sidebar card matches
          const all = [...document.querySelectorAll('button,a,div[role="button"]')];
          const exact = all.find(b => {
            const t = (b.innerText || '').trim();
            return /^Easy Apply$/i.test(t) && b.getBoundingClientRect().width > 0;
          });
          if (exact) return exact;
          // Fallback: contains "Easy Apply" in short text
          return all.find(b => {
            const t = (b.innerText || '').trim();
            return /Easy Apply/i.test(t) && t.length < 30 && b.getBoundingClientRect().width > 0;
          });
        });
        const e = h.asElement(); if (e) { eaEl = e; break; } await sleep(1000);
      }
      if (!eaEl) {
        const already = await page.evaluate(() => /your application (was )?submitted|application (status|submitted)|you(?:'ve| have) (already )?applied to this job|withdrew application/i.test(document.body.innerText));
        if (already) { out.steps.push('ALREADY_APPLIED'); out.error = 'already_applied'; return; }
        out.steps.push('NO_EA_BUTTON'); out.error = 'no_ea_button'; return;
      }

      await clickCenter(page, eaEl); out.steps.push('clicked EA (mouse)'); await sleep(2000);

      let modalOpen = false;
      for (let i = 0; i < 15; i++) {
        const state = await page.evaluate(() => {
          const dlg = document.querySelector('dialog[open]');
          return { dlg: !!dlg || /contact info|additional questions|review your application/i.test(document.body.innerText) };
        });
        if (state.dlg) { modalOpen = true; break; }
        await sleep(1200);
      }
      // Check for EA limit notice in the modal
      const limitCheck = await page.evaluate(() => {
        const dlg = document.querySelector('dialog[open]');
        const text = dlg ? dlg.innerText : document.body.innerText;
        return /reached today's Easy Apply limit|daily limit|apply limit/i.test(text);
      });
      if (limitCheck) {
        out.steps.push('EA_DAILY_LIMIT');
        out.error = 'ea_daily_limit';
        // Click "Got it" to dismiss
        await page.evaluate(() => {
          const btn = [...document.querySelectorAll('button')].find(b => /Got it/i.test(b.innerText));
          if (btn) btn.click();
        }).catch(()=>{});
        return;
      }

      // Multi-step form filling
      for (let step = 0; step < 10; step++) {
        await sleep(1500);

        // Scrape form
        const formData = await scrapeForm(page);
        const questions = [
          ...formData.textFields.filter(f => !f.val).map(f => ({ type: 'text', label: f.lab, id: f.id })),
          ...formData.radios.map(r => ({ type: 'radio', label: r.q, optText: r.optText })),
          ...formData.selects.filter(s => s.options.length > 1).map(f => ({ type: 'select', label: f.lab, id: f.id })),
          ...formData.checkboxes.filter(c => !c.checked).map(f => ({ type: 'checkbox', label: f.lab, id: f.id }))
        ];

        // Answer questions using lookup table
        const answers = {};
        for (const q of questions) {
          const ans = getAnswer(q.label, q.optText);
          if (ans) answers[q.label] = ans;
        }

        out.steps.push('step ' + step + ': ' + Object.keys(answers).length + ' answers for ' + questions.length + ' questions');

        // Fill form
        await fillForm(page, formData, answers);

        // Check for submit button
        const subH = await findBtnInModal(page, /submit/i);
        const subEl = subH.asElement();
        if (subEl) {
          await subEl.evaluate(b => b.click()).catch(() => {});
          out.steps.push('clicked Submit');
          out.submitted = true;
          await sleep(2800);
          break;
        }

        // Click Next/Continue
        const cH = await findBtnInModal(page, /Continue to next step|Continue|Review your application|^Review$|^Next$/);
        const cEl = cH.asElement();
        if (cEl) {
          const txt = await page.evaluate(b => b.innerText.trim(), cEl);
          await cEl.evaluate(b => b.click()).catch(() => {});
          out.steps.push('clicked ' + txt);
          await sleep(2200);
        } else {
          out.steps.push('no-continue-submit');
          break;
        }
      }

      await page.screenshot({ path: shot }).catch(() => {});
      out.confirm = await page.evaluate(() => {
        const m = document.body.innerText.match(/Application (submitted|status: Application submitted)/i);
        return m ? m[0] : ((document.querySelector('[class*="artdeco-inline-feedback"]')?.innerText) || '');
      });
      out.screenshot = shot;

      if (out.submitted) { try { require('fs').unlinkSync(shot); } catch (e) {} }
    } catch (e) { out.error = e.message; }
  });

  console.log(JSON.stringify(out, null, 2));
})().catch(e => { console.log('FATAL', e.message); process.exit(1); });
