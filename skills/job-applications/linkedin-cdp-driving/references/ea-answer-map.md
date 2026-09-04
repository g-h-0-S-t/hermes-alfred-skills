# EA Answer Map — profile-driven field answers (2026-08-17)

Mirrors the `answer()` / radio `ans()` logic in `apply_one.cjs`. Encode every LinkedIn Easy
Apply question as a regex to value. Order matters: put Yes/No questions BEFORE number/year rules
so a "Do you have 6+ years experience...?" (Yes/No) is not mis-matched by `/years? .*experience/`
(which returns the number 14 for "How many years...?" fields).

## Profile facts used
- Name: OPERATOR_NAME / Email: OPERATOR_EMAIL / Phone: OPERATOR_PHONE
- LinkedIn: https://linkedin.com/in/operatorbiswas / GitHub: https://github.com/YOUR_GITHUB_USERNAME
- Current employer: Stealth (founder) for "Current Employer / Company name".
- CTC: current 8600000 INR, expected 5000000 INR. LPA fields: current 86, expected 50.
- Total experience: 14 years. Skill-specific years map to real counts from the resume.
- Location: Bengaluru (prefer for location dropdowns).
- Join immediate -> notice period / join-in-days = 0.
- AI tools (NO "Alfred" mention): "Daily: Hermes, omniroute (model routing), Antigravity (Google
  DeepMind agentic coding), Kilo Code and Cursor (AI coding in VS Code), plus Ollama/LM Studio
  with local LLMs for applied-AI agents; Chrome-extension AI features and LangChain-style orchestration."

## Question to answer rules (regex case-insensitive)
YES/NO first (before any number rule):
- /do you have .*(experience|year)|hands[- ]?on (on )?a daily basis|professional software development experience|currently (employed|working)/ -> Yes
- /insurance|bfsi|domain experience/ -> No
- /years? .*experience|years? of (work )?experience/ -> 14   (NUMBER field; AFTER the Yes/No rule above)
- /experience in (years|yr)|years? of (experience|exp)/ -> 14
- /remote/ -> Yes
- /background check|willing to undergo/ -> Yes
- /comfortable working/ -> Yes
- /commut/ -> Yes
- /authorized to work|work authorization|legally/ -> Yes
- /sponsorship/ -> No
- /relocat/ -> Yes
- /start immediately|notice period|available to start|can you start|join immediately/ -> Yes
- /consent|processing (my )?data|share my (profile|data|information)|privacy policy/ -> Yes
- /work (from )?(the )?office|work 5 days|office in bangalore|onsite|in.?office/ -> Yes
- /comfortable with .*budget|budget of/ -> Yes   (screening budget Q; Yes even if below expected)
- /linkedin/ (radio) -> Yes
- /ai project|link to an? (example|project)|project you (built|shipped)|shipped.*project|portfolio|github/ -> Yes (radio) / https://github.com/YOUR_GITHUB_USERNAME (text)
- /ai tools|which ai|tools.*use daily|tools do you /llm|large language model/ -> the AI-tools string above

TEXT / NUMBER fields:
- /current employer|employer name|company name|current company|organization \(?current/ -> Stealth
- /current.*(salary|ctc|compensation)|salary.*current|compensation.*current/ -> 86 if LPA else 8600000
- /expected.*(salary|ctc)|salary.*expected|expectation|compensation/ -> 50 if LPA else 5000000
- /notice period/ -> 0 (numeric)
- /linkedin/ (text URL) -> https://linkedin.com/in/operatorbiswas
- /why (do you|are you)|tell us about|anything else|additional information/ -> short truthful pitch.

## Radio click recipe (trusted, not synthetic)
```
const radioIdx = await page.evaluate(() => {
  const ans = (q) => { /* rules above, Yes/No only */ };
  const radios = [...document.querySelectorAll('div[role=radio]')];
  const out = [];
  radios.forEach((r, idx) => {
    const optText = (r.innerText || '').trim().toLowerCase();
    let node = r, q = '';
    for (let d = 0; d < 10 && node && node !== document.body; d++) {
      const t = (node.innerText || '').replace(/\b(yes|no)\b/gi, '').replace(/\s+/g, ' ').trim();
      if (t.includes('?')) { q = t.split('?')[0] + '?'; break; }
      const p = node.parentElement;
      if (p) { const pt = (p.innerText || '').replace(/\b(yes|no)\b/gi, '').replace(/\s+/g, ' ').trim(); if (pt.includes('?')) { q = pt.split('?')[0] + '?'; break; } }
      node = p;
    }
    const a = ans(q);
    if (a && optText === ('' + a).toLowerCase()) out.push(idx);
  });
  return out;
});
const handles = await page.$$('div[role=radio]');
for (const idx of radioIdx) {
  const h = handles[idx];
  if (h) { try { await h.scrollIntoViewIfNeeded?.(); await h.click({ delay: 50 }); await sleep(400); }
           catch (e) { const c = await h.boundingBox(); if (c) await page.mouse.click(c.x + c.width/2, c.y + c.height/2); } }
}
```

## Gotchas re-confirmed this session
- Empty text field whose question is in a DIV (not p/label/span): broaden the label-climb to read ancestor DIV text.
- "Can you start immediately?" with no handler -> radio never clicked -> stuck on Review. Add the rule.
- Compensation "in INR LPA" maps to 86/50, NOT 8600000/5000000.
- Background run in Hermes non-tty shell dies ("stdin is not a tty", exit 1) -> run foreground.
- NEVER mention "Alfred" in any application answer. Name the tools, not the persona.
