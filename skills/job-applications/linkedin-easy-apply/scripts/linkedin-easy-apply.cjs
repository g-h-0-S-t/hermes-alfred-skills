
'use strict';
// LinkedIn Easy Apply — SIMPLE, proven single-file driver (puppeteer-core on logged-in 9222 Chrome).
// NO local-LLM auto-fill (banned: corrupts forms). Fills ONLY from applicant.profile.json.
// One light CDP pass per job — never a sustained scroll marathon (that freezes this machine's Chrome).
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const DIR = __dirname;
const PROFILE_PATH = path.join(DIR, 'applicant.profile.json');
const APPLIED_PATH = path.join(DIR, 'applied.json');
const LOG_PATH = path.join(DIR, 'apply-log.jsonl');

function log(msg, level='INFO'){ const line=`[${new Date().toISOString()}] [${level}] ${msg}`; console.log(line); try{ fs.appendFileSync(LOG_PATH, line+'\n'); }catch(_){} }
function die(msg){ log(msg,'FATAL'); process.exit(1); }
const sleep = ms => new Promise(r=>setTimeout(r,ms));
const rand = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const jitter = async ()=>sleep(rand(1800,3200));

function loadProfile(){
  if(!fs.existsSync(PROFILE_PATH)) return null;
  try{ return JSON.parse(fs.readFileSync(PROFILE_PATH,'utf8')); }catch(e){ die('applicant.profile.json invalid JSON: '+e.message); }
}
function loadApplied(){ try{ return JSON.parse(fs.readFileSync(APPLIED_PATH,'utf8')); }catch(_){ return {}; } }
function markApplied(id, company, title){ const a=loadApplied(); a[id]={company,title,at:new Date().toISOString()}; fs.writeFileSync(APPLIED_PATH, JSON.stringify(a,null,2)); }

// ---- profile-only answer (single direction, key>=4). No LLM. ----
function answerFor(label, profile){
  const L=(label||'').toLowerCase(); const ans=profile.answers||{};
  for(const [k,v] of Object.entries(ans)){ if(k.length<4) continue; if(L.includes(k.toLowerCase())) return v; }
  return null;
}
// hard deterministic fallbacks (operator facts) so common fields always resolve without LLM
function answer(label, profile){
  const L=(label||'').toLowerCase();
  if(/which location|current location|preferred location|location are you applying|city/i.test(L)) return profile.locationPref||'Bengaluru';
  if(/notice period/i.test(L)) return profile.ctc?.noticePeriod||'0';
  if(/join|joining/i.test(L)&&/day|immediate/i.test(L)) return profile.ctc?.noticePeriod||'0';
  if(/current.*(ctc|salary)|ctc.*current|current annual/i.test(L)) return ''+profile.ctc?.current;
  if(/expected.*(ctc|salary)|ctc.*expected|expected annual/i.test(L)) return ''+profile.ctc?.expected;
  if(/years of (experience|exp)|total years|relevant experience/i.test(L)) return '14';
  if(/10th|12th|percentage in (10|12)/i.test(L)) return '10th: 79.33%, 12th: 72.57%';
  if(/cgpa|percentage in b\.?tech|b\.?tech.*(cgpa|percentage|marks)/i.test(L)) return '7.26';
  if(/relocat/i.test(L)) return 'Yes';
  if(/authorized to work|work authorization|legally/i.test(L)) return 'Yes';
  if(/sponsorship/i.test(L)) return 'No';
  if(/commut/i.test(L)) return 'Yes';
  if(/why (do you|are you)|tell us about|anything else|additional information/i.test(L)) return 'Experienced full-stack and applied-AI engineer (14 yrs) with strengths in identity/IAM, React/Node/TypeScript, and AI agents. Eager to contribute.';
  return answerFor(label, profile);
}
function isRelevant(title, profile){
  const t=(title||'').toLowerCase();
  for(const s of (profile.skipTitles||[])) if(t.includes(s)) return false;
  for(const s of (profile.skills||[])) if(t.includes(s)) return true;
  return false;
}

async function connect(wsUrl){
  const b = await puppeteer.connect({ browserWSEndpoint: wsUrl, defaultViewport:null, protocolTimeout:30000 });
  b.on('disconnected', ()=>{ log('CDP browser disconnected','ERROR'); process.exit(3); });
  return b;
}
async function getPage(browser){
  const pages = await browser.pages();
  return pages.find(p=>/linkedin\.com/.test(p.url())) || pages[0];
}
async function clickCenter(page, el){
  const box = await el.boundingBox(); if(!box) return false;
  await page.mouse.click(box.x+box.width/2, box.y+box.height/2); return true;
}
async function findButton(page, re){
  const h = await page.evaluateHandle((src)=>{ const rx=new RegExp(src,'i');
    const modal=document.querySelector('[class*="jobs-easy-apply"], [class*="artdeco-modal"], div[role=dialog]')||document;
    return [...modal.querySelectorAll('button')].find(b=>rx.test((b.innerText||'').trim())); }, re.source);
  return h.asElement();
}
async function findEA(page){
  for(let i=0;i<8;i++){ const h=await page.evaluateHandle(()=>[...document.querySelectorAll('button')].find(b=>/Easy Apply/i.test((b.innerText||'').trim()))); const e=h.asElement(); if(e) return e; await sleep(1000); }
  return null;
}

// ---- LIGHT scrape: ONE query, one read, no scroll marathon (avoids freeze) ----
async function collectJobs(browser, profile, hours, maxPerQuery){
  const page = await getPage(browser);
  const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent('Software Engineer')}&location=${encodeURIComponent('Bengaluru, Karnataka, India')}&f_EA=true&sortBy=DD&f_TPR=r${hours*3600}`;
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000}).catch(()=>{});
  await sleep(3500);
  const cut = Date.now()-hours*3600*1000;
  const cards = await page.evaluate(()=>{
    const out=[]; document.querySelectorAll('li[data-occludable-job-id]').forEach(c=>{
      const jid=c.getAttribute('data-occludable-job-id'); if(!jid) return;
      const a=c.querySelector('a[href*="/jobs/view/"]'); const title=a?a.innerText.trim().split('\n')[0]:'';
      const co=c.querySelector('.artdeco-entity-lockup__subtitle,.base-search-card__subtitle,.job-card-container__company-name');
      const company=co?co.innerText.trim():'';
      let rel=''; const w=document.createTreeWalker(c,NodeFilter.SHOW_TEXT,null); let n;
      while(n=w.nextNode()){ const x=n.nodeValue.trim(); if(/\b(\d+\s+(second|minute|hour|day)s?\s+ago|just now|within the past)\b/i.test(x)&&x.length<40){rel=x;break;} }
      const easy=/easy apply/i.test(c.innerText);
      if(title) out.push({jid,title,company,rel,easy});
    }); return out;
  });
  const all={};
  for(const c of cards){
    if(all[c.jid]) continue;
    const m=c.rel.match(/(\d+)\s+(second|minute|hour|day)s?\s+ago/i);
    let within=false;
    if(/just now|within the past/i.test(c.rel)) within=true;
    else if(m){ const num=+m[1], unit=m[2]; const ms=unit==='day'?num*864e5:unit==='hour'?num*36e5:num*6e4; within=(Date.now()-ms)>=cut; }
    if(within && c.easy) all[c.jid]={title:c.title,company:c.company,rel:c.rel};
    if(Object.keys(all).length>=maxPerQuery) break;
  }
  return all;
}

// ---- APPLY ONE (proven mouse-click flow) ----
async function applyOne(browser, profile, jobId){
  const page = await getPage(browser);
  const out={ jobId, steps:[], submitted:false, error:null };
  try{
    await page.goto(`https://www.linkedin.com/jobs/view/${jobId}/`,{waitUntil:'domcontentloaded',timeout:30000}).catch(()=>{});
    await sleep(rand(2000,3500));
    if(await page.evaluate(()=>/you reached today.?s easy apply limit/i.test(document.body.innerText))){ return {status:'cap',jobId}; }
    const eaEl=await findEA(page);
    if(!eaEl){ out.error='no_ea_button'; return {status:'no-ea',jobId}; }
    await clickCenter(page,eaEl); out.steps.push('clicked EA'); await sleep(2200);
    // poll for dialog (safety reminder OR form); dismiss safety
    let modalOpen=false;
    for(let i=0;i<15;i++){
      const st=await page.evaluate(()=>{ const dlg=document.querySelector('div[role=dialog],[class*="artdeco-modal"],[class*="jobs-easy-apply"]'); const c=[...document.querySelectorAll('button')].find(b=>/Continue applying/i.test((b.innerText||'').trim())); return {dlg:!!dlg,hasContinue:!!c}; });
      if(st.hasContinue){ const c=await findButton(page,/Continue applying/); if(c){ await clickCenter(page,c); out.steps.push('dismissed safety'); await sleep(2200); modalOpen=true; break; } }
      if(st.dlg){ modalOpen=true; break; }
      await sleep(1200);
    }
    if(!modalOpen){ return {status:'no-ea',jobId}; }
    // also dismiss safety if still up
    const safety=await findButton(page,/Continue applying/); if(safety){ await clickCenter(page,safety); out.steps.push('dismissed safety(2)'); await sleep(2200); }
    // resume select (no upload)
    await page.evaluate((rn)=>{ const o=[...document.querySelectorAll('label,li,div')].find(e=>new RegExp(rn,'i').test(e.innerText||'')); if(o){const r=o.querySelector('input[type=radio]')||o.closest('label')?.querySelector('input[type=radio]'); if(r)r.click();} }, profile.resumeName);
    for(let step=0; step<7; step++){
      // fill empty text/textarea inputs in modal
      const ids=await page.evaluate(()=>{ const m=document.querySelector('[class*="jobs-easy-apply"], div[role=dialog]')||document; return [...m.querySelectorAll('input,textarea')].filter(n=>{const t=n.tagName.toLowerCase();const ty=(n.type||'').toLowerCase(); return ((t==='input'&&!['file','hidden','checkbox','radio'].includes(ty))||t==='textarea')&&!n.disabled&&!n.value;}).map(n=>n.id||''); });
      for(const id of ids){ if(!id)continue; const lab=await page.evaluate(i=>{const e=document.getElementById(i);return (document.querySelector('label[for="'+i+'"]')?.innerText||e?.getAttribute('aria-label')||e?.placeholder||e?.closest('label')?.innerText||e?.parentElement?.innerText||'').trim().slice(0,160);},id); const ans=answer(lab,profile); if(ans==null)continue; try{ const h=await page.$('#'+CSS.escape(id)); if(h){ await h.click({clickCount:3}).catch(()=>{}); await h.type(ans,{delay:20}); } }catch(e){} }
      // numeric coercion
      // contact
      await page.evaluate((p)=>{ const setV=(sel,val)=>{const e=document.querySelector(sel); if(e&&!e.value){const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(e,val); e.dispatchEvent(new Event('input',{bubbles:true})); e.dispatchEvent(new Event('change',{bubbles:true}));}}; setV('input[type=email]',p.contact.email); setV('input[type=tel],[id*=phone]',p.contact.phone); }, profile);
      await sleep(300);
      const sub=await findButton(page,/^Submit application$/); if(sub){ await clickCenter(page,sub); out.steps.push('clicked Submit'); out.submitted=true; await sleep(2800); break; }
      const c=await findButton(page,/Continue to next step|Continue|Review your application|^Review$/);
      if(c){ const txt=await page.evaluate(b=>b.innerText.trim(),c); await clickCenter(page,c); out.steps.push('clicked '+txt); await sleep(2200); }
      else { out.steps.push('no-continue'); break; }
    }
    out.confirm=await page.evaluate(()=>{ const m=document.body.innerText.match(/Application (submitted|status: Application submitted)/i); return m?m[0]:((document.querySelector('[class*="artdeco-inline-feedback"]')?.innerText)||''); });
    if(out.submitted && /submitted/i.test(out.confirm||'')) return {status:'applied',jobId};
    return {status:'submit-no-confirm',jobId,confirm:out.confirm};
  }catch(e){ out.error=e.message; return {status:'error',jobId,error:e.message}; }
}

async function main(){
  const args=process.argv.slice(2); const cmd=args[0];
  if(cmd==='--write-sample'){ log('use applicant.profile.json (already present)'); return; }
  const wsUrl=args.find(a=>a.startsWith('ws://'))||process.env.LI_WS;
  if(!wsUrl) die('Pass ws:// CDP url or set LI_WS. Get from http://127.0.0.1:9222/json/version');
  const profile=loadProfile()||null; if(!profile) die('No applicant.profile.json');
  const getOpt=(n,d)=>{ const i=args.indexOf(n); return i>=0?args[i+1]:d; };
  const hours=parseInt(getOpt('--hours','24'),10), max=parseInt(getOpt('--max','6'),10), limit=parseInt(getOpt('--limit','10'),10);
  if(cmd==='connect'){ const b=await connect(wsUrl); log('Connected OK'); await b.disconnect(); return; }
  const browser=await connect(wsUrl);
  try{
    if(cmd==='collect'){ const jobs=await collectJobs(browser,profile,hours,max); fs.writeFileSync(path.join(DIR,'collected.json'),JSON.stringify(jobs,null,2)); log(`Collected ${Object.keys(jobs).length} jobs`); }
    else if(cmd==='apply'){ const id=args[1]; if(!/^\d+$/.test(id)) die('apply needs numeric id'); const ap=loadApplied(); if(ap[id]){ log(`job ${id} already applied`); return; } const r=await applyOne(browser,profile,id); log(`apply ${id} -> ${r.status}`); if(r.status==='applied') markApplied(id,'',''); }
    else if(cmd==='run'){ const jobs=await collectJobs(browser,profile,hours,max); const ap=loadApplied(); const cands=Object.entries(jobs).filter(([id,v])=>!ap[id]&&isRelevant(v.title,profile)); log(`run: ${cands.length} relevant`); let done=0; for(const [id,v] of cands){ if(done>=limit)break; const r=await applyOne(browser,profile,id); log(`apply ${id} (${v.title}) -> ${r.status}`); if(r.status==='applied'){ markApplied(id,v.company,v.title); done++; } else if(r.status==='cap'){ log('cap -> stop'); break; } await jitter(); } log(`run complete: ${done} applied`); }
    else { console.log('Commands: connect <wsUrl> | collect [--hours N] [--max M] | apply <jobId> | run [--hours N] [--max M] [--limit L]'); }
  } finally { await browser.disconnect(); }
}
if(require.main===module){ main().catch(e=>die(e.stack||e.message)); }
module.exports={ main, answer, isRelevant, applyOne, collectJobs };
