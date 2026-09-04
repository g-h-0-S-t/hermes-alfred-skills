
const { withPage } = require('XXXXXXX/job-apply/cdp_helper_9223.cjs');
const fs=require('fs');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const LOG='XXXXXXX/job-apply/_gh_auto.log';fs.writeFileSync(LOG,'');
const log=(...a)=>fs.appendFileSync(LOG,a.join(' ')+'\n');
const SKIP='XXXXXXX/job-apply/gh_skip.json';
let skip={};
try{ skip=JSON.parse(fs.readFileSync(SKIP,'utf8')); }catch(e){ skip={}; }
const markSkip=(url,reason)=>{ skip[url]=reason; fs.writeFileSync(SKIP,JSON.stringify(skip,null,2)); };
const isGreenhouseBoard=(url)=>/job-boards\.greenhouse\.io\/[a-z0-9]+\/jobs\/\d+|boards\.greenhouse\.io\/[a-z0-9]+\/jobs\/\d+/i.test(url);
let page;
const setById=(id,val)=>page.evaluate((id,val)=>{const e=document.getElementById(id);if(!e)return false;const p=Object.getPrototypeOf(e);const s=Object.getOwnPropertyDescriptor(p,'value');if(s&&s.set)s.set.call(e,val);e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));return true;},id,val);
const setByLabel=(label,val)=>page.evaluate((label,val)=>{const labels=[...document.querySelectorAll('label')];for(const l of labels){if((l.innerText||'').toLowerCase().includes(label.toLowerCase())){const inp=document.getElementById(l.getAttribute('for'));if(inp){const p=Object.getPrototypeOf(inp);const s=Object.getOwnPropertyDescriptor(p,'value');if(s&&s.set)s.set.call(inp,val);inp.dispatchEvent(new Event('input',{bubbles:true}));inp.dispatchEvent(new Event('change',{bubbles:true}));return true;}}}return false;},label,val);
async function clickSel(sel,val,optMatch){const h=await page.$(sel);if(!h){return;}await h.click({clickCount:1});await sleep(500);await page.keyboard.type(val,{delay:45});await sleep(900);const picked=await page.evaluate((val,optMatch)=>{const o=[...document.querySelectorAll('[role=option],.select__option')].find(x=>(x.innerText||'').includes(optMatch))||[...document.querySelectorAll('[role=option],.select__option')].find(x=>(x.innerText||'').toLowerCase().includes(val.toLowerCase()));if(o){o.click();return o.innerText.trim();}return null;},val,optMatch||val);await sleep(700);}
async function clickSelectByLabel(labelText,val,optMatch){const handle=await page.evaluateHandle((labelText)=>{const labels=[...document.querySelectorAll('label')];for(const l of labels){if((l.innerText||'').toLowerCase().includes(labelText.toLowerCase())){const selControl=l.closest('div,li,section,fieldset')?.querySelector('.select__control, .select__input-container, input.select__input');if(selControl){selControl.scrollIntoView({block:'center'});return selControl;}}}return null;},labelText);const el=handle.asElement();if(!el){return false;}await el.click({clickCount:1});await sleep(500);await page.keyboard.type(val,{delay:45});await sleep(900);const picked=await page.evaluate((val,optMatch)=>{const o=[...document.querySelectorAll('[role=option],.select__option')].find(x=>(x.innerText||'').includes(optMatch))||[...document.querySelectorAll('[role=option],.select__option')].find(x=>(x.innerText||'').toLowerCase().includes(val.toLowerCase()));if(o){o.click();return o.innerText.trim();}return null;},val,optMatch||val);await sleep(700);return true;}
async function selByLabel(label,val){const handle=await page.evaluateHandle((label)=>{const labels=[...document.querySelectorAll('label')];for(const l of labels){if((l.innerText||'').toLowerCase().includes(label.toLowerCase())){const inp=document.getElementById(l.getAttribute('for'));if(inp){const w=inp.closest('.select__control')||inp;w.scrollIntoView({block:'center'});return inp;}}}return null;},label);const el=handle.asElement();if(!el){return;}await el.click({clickCount:1});await sleep(500);await page.keyboard.type(val,{delay:45});await sleep(900);const picked=await page.evaluate((val)=>{const o=[...document.querySelectorAll('[role=option],.select__option')].find(x=>(x.innerText||'').toLowerCase().startsWith(val.toLowerCase()));if(o){o.click();return o.innerText.trim();}return null;},val);await sleep(700);}
// Promise.race wrapper so a hanging navigation can NEVER stall us
function withTimeout(promise,ms,label){return Promise.race([promise,new Promise((_,rej)=>setTimeout(()=>rej(new Error('TIMEOUT '+label)),ms))]);}
async function applyJob(url){
  log('--- APPLY '+url);
  if(!isGreenhouseBoard(url)){ log('  SKIP: not a standard greenhouse board URL (external/custom ATS)'); markSkip(url,'not_greenhouse_board'); return 'skipped'; }
  if(skip[url]){ log('  SKIP (already in skip-list: '+skip[url]+')'); return 'skipped'; }
  try{
    await withTimeout(page.goto(url,{waitUntil:'domcontentloaded',timeout:20000}),22000,'goto');
  }catch(e){ log('  goto failed: '+e.message); markSkip(url,'goto_fail'); return 'goto_fail'; }
  await sleep(4000);
  for(let i=0;i<3;i++){const f=await page.evaluate(()=>!!document.getElementById('first_name'));if(f)break;await page.evaluate(()=>{const b=[...document.querySelectorAll('a,button')].find(x=>/apply/i.test(x.innerText||''));if(b)b.click();});await sleep(3000);}
  await sleep(1500);
  const hasForm=await page.evaluate(()=>!!document.getElementById('first_name'));
  if(!hasForm){log('  no form (maybe external ATS / 502 / not a board job)');markSkip(url,'no_form');return 'noform';}
  setById('first_name','operator');setById('last_name','XXXXXXX');setById('email','XXXXXXX');
  await setByLabel('LinkedIn','https://linkedin.com/in/OPERATOR_LINKEDIN_ID');
  await setByLabel('years of experience','14');
  // Fill custom question fields (e.g. Website, GitHub) by their aria-label
  // Custom question fields (match by aria-label OR label text)
  await page.evaluate(()=>{
    const fields=[
      {label:'website',val:'https://OPERATOR_LINKEDIN_ID.portfolio.example.com'},
      {label:'github',val:'https://github.com/YOUR_GITHUB_USERNAME'},
      {label:'portfolio',val:'https://OPERATOR_LINKEDIN_ID.portfolio.example.com'}
    ];
    const allInputs=[...document.querySelectorAll('input[id*="question"],input[aria-label],input')];
    for(const f of fields){
      const el=allInputs.find(el=>{
        if(el.value) return false;
        const al=(el.getAttribute('aria-label')||'').toLowerCase();
        if(al.includes(f.label)) return true;
        // Also check label[for]
        if(el.id){const l=document.querySelector('label[for="'+el.id+'"]');if(l&&(l.innerText||'').toLowerCase().includes(f.label))return true;}
        return false;
      });
      if(el){const p=Object.getPrototypeOf(el);const s=Object.getOwnPropertyDescriptor(p,'value');if(s&&s.set)s.set.call(el,f.val);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}
    }
  });
  await clickSelectByLabel('Country','XXXXXXX','XXXXXXX');await sleep(300);
  const hasDeg=await page.evaluate(()=>!!document.getElementById('degree--0'));
  if(hasDeg)await clickSel('#degree--0',"Bachelor's","Bachelor");
  await selByLabel('ReactJs and NodeJs','Yes');
  await selByLabel('late night','Yes');

  // Phone: intl-tel-input plugin - use its API or set value + blur
  await page.evaluate(()=>{
    const ph=document.getElementById('phone');
    if(ph){
      // Try plugin API first
      if(window.intlTelInputUtils && ph.intlTelInput){
        ph.intlTelInput('setNumber','XXXXXXX');
      } else {
        // Fallback: set value and trigger all events
        ph.focus();
        const p=Object.getPrototypeOf(ph);const s=Object.getOwnPropertyDescriptor(p,'value');
        if(s&&s.set)s.set.call(ph,'XXXXXXX_NUMBER');
        ph.dispatchEvent(new Event('input',{bubbles:true}));ph.dispatchEvent(new Event('change',{bubbles:true}));
        ph.blur();
      }
    }
  });await sleep(600);
  const rh=await page.$('#resume');if(rh){try{await rh.uploadFile('OPERATOR_RESUME_PATH/OPERATOR_RESUME_ATS.pdf');await sleep(2500);}catch(e){log('  upErr'+e.message);}}
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));await sleep(1000);
  const box=await page.evaluate(()=>{const b=[...document.querySelectorAll('button,input[type=submit]')].find(x=>(x.innerText||x.value||'').toLowerCase().includes('submit application'));if(!b)return null;const r=b.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
  if(box){await page.mouse.click(box.x,box.y);log('  SUBMIT clicked');await sleep(6000);const a=await page.evaluate(()=>({thanks:/thank|received|submitted|application has been/i.test(document.body.innerText),form:/apply for this job/i.test(document.body.innerText)}));log('  AFTER thanks='+a.thanks+' form='+a.form);if(a.thanks){markSkip(url,'submitted');return 'SUBMITTED';}return 'dropped';}
  log('  NO SUBMIT BTN');markSkip(url,'no_submit_btn');return 'nosubmit';
}
(async()=>{
  await withPage(async(p)=>{page=p;
    const jobs=["https://job-boards.greenhouse.io/techholding/jobs/4718581005","https://job-boards.greenhouse.io/anthropic/jobs/5023394008","https://job-boards.greenhouse.io/mercury/jobs/6130879004","https://job-boards.greenhouse.io/discord/jobs/8571766002","https://boards.greenhouse.io/figma/jobs/5813967004","https://job-boards.greenhouse.io/airtable/jobs/8654173002","https://boards.greenhouse.io/cloudflare/jobs/8138788","https://job-boards.greenhouse.io/amplitude/jobs/8675452002","https://job-boards.greenhouse.io/mixpanel/jobs/8053868","https://job-boards.greenhouse.io/lumimeds/jobs/4317077009","https://job-boards.greenhouse.io/brex/jobs/8649424002","https://job-boards.greenhouse.io/plaid/jobs/8189203002","https://job-boards.greenhouse.io/notion/jobs/8653917002","https://job-boards.greenhouse.io/databricks/jobs/8648762002"];
    for(const j of jobs){try{const r=await applyJob(j);log('RESULT '+j+' => '+r);}catch(e){log('ERR '+j+' '+e.message);markSkip(j,'exception:'+e.message);}}
    log('BATCH DONE');
  }, 70000);
})().catch(e=>log('THREW'+e.message));
