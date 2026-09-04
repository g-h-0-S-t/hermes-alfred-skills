#!/usr/bin/env python3
"""Self-driving job-apply autopilot. Run: cd XXXXXXX/job-apply && python autoapply_loop.py
Cycles forever: Greenhouse batch (gh_batch.cjs) + LinkedIn EA scrape/apply (apply_one.cjs),
120s cooldown, records verified submissions to applied.json. Relaunched by watchdog cron.
"""
import subprocess, os, json, time, re, random

BASE='XXXXXXX/job-apply'
ENV={k:v for k,v in os.environ.items() if k not in ('PYTHONPATH','PYTHONHOME')}
LOG=os.path.join(BASE,'_autoapply.log')
def log(*a):
    line=time.strftime('%H:%M:%S ')+' '.join(map(str,a))+'\n'
    with open(LOG,'a') as f: f.write(line)
    print(line,end='',flush=True)

GH_POOL=[
 'https://job-boards.greenhouse.io/lumimeds/jobs/4317077009',
 'https://job-boards.greenhouse.io/techholding/jobs/4718581005',
 'https://job-boards.greenhouse.io/anthropic/jobs/5023394008',
 'https://job-boards.greenhouse.io/mercury/jobs/6130879004',
 'https://job-boards.greenhouse.io/discord/jobs/8571766002',
 'https://boards.greenhouse.io/figma/jobs/5813967004',
 'https://job-boards.greenhouse.io/airtable/jobs/8654173002',
 'https://boards.greenhouse.io/cloudflare/jobs/8138788',
 'https://job-boards.greenhouse.io/amplitude/jobs/8675452002',
 'https://job-boards.greenhouse.io/mixpanel/jobs/8053868',
 'https://job-boards.greenhouse.io/brex/jobs/8649424002',
 'https://job-boards.greenhouse.io/plaid/jobs/8189203002',
 'https://job-boards.greenhouse.io/notion/jobs/8653917002',
 'https://job-boards.greenhouse.io/databricks/jobs/8648762002',
]
LI_SEARCHES=[
 'https://www.linkedin.com/jobs/search/?keywords=javascript%20developer&location=XXXXXXX&f_AL=true&f_E=3%2C4%2C5%2C6&f_TPR=r86400&sortBy=DD',
 'https://www.linkedin.com/jobs/search/?keywords=node%20js&location=XXXXXXX&f_AL=true&f_E=3%2C4%2C5%2C6&sortBy=DD',
 'https://www.linkedin.com/jobs/search/?keywords=react%20developer&location=XXXXXXX&f_AL=true&f_E=3%2C4%2C5%2C6&sortBy=DD',
 'https://www.linkedin.com/jobs/search/?keywords=full%20stack%20engineer&location=XXXXXXX&f_AL=true&f_E=3%2C4%2C5%2C6&sortBy=DD',
]
LI_SCRAPE_JS = r'''const { withPage } = require('XXXXXXX/job-apply/cdp_helper.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await withPage(async(page)=>{
    const url=process.argv[2];
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await sleep(6000);
    const ids=await page.evaluate(()=>{const s=new Set();document.querySelectorAll('a[href*="/jobs/view/"]').forEach(a=>{const m=a.href.match(/jobs\/view\/(\d+)/);if(m)s.add(m[1]);});return [...s].slice(0,8);});
    console.log(JSON.stringify(ids));
  });
})().catch(e=>console.log('THREW',e.message));
'''

def run(cmd, timeout=300):
    try:
        r=subprocess.run(cmd, capture_output=True, text=True, env=ENV, cwd=BASE, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, '', 'TIMEOUT'

def gh_batch(urls):
    driver=open(os.path.join(BASE,'gh_batch.cjs'),encoding='utf-8').read()
    driver=re.sub(r'const jobs=\[.*?\];', 'const jobs='+json.dumps(urls)+';', driver, flags=re.DOTALL)
    driver=driver.replace('_gh_run4.log','_gh_auto.log')
    tmp=os.path.join(BASE,'_gh_auto.cjs')
    open(tmp,'w',encoding='utf-8').write(driver)
    rc,out,err=run(['node',tmp],timeout=400)
    log('GH batch rc=',rc,'out=',out.strip()[:300])
    return out

def li_scrape():
    open(os.path.join(BASE,'_li_scrape_auto.cjs'),'w',encoding='utf-8').write(LI_SCRAPE_JS)
    ids=[]
    for s in LI_SEARCHES:
        rc,out,err=run(['node',os.path.join(BASE,'_li_scrape_auto.cjs'),s],timeout=120)
        try:
            last=[l for l in out.strip().splitlines() if l.startswith('[')][-1]
            ids+=json.loads(last)
        except Exception:
            pass
        time.sleep(8)
    return list(dict.fromkeys(ids))

def li_apply(jid):
    last_out=''
    for attempt in range(3):
        rc,out,err=run(['node','apply_one.cjs',f'https://www.linkedin.com/jobs/view/{jid}/'],timeout=120)
        last_out=out
        if 'Execution context was destroyed' in out or 'context was destroyed' in out:
            log('LI retry',jid,'attempt',attempt+1,'context destroyed'); time.sleep(10); continue
        break
    try:
        m=re.search(r'\{[^{}]*"submitted"[^{}]*\}', last_out, re.DOTALL)
        if m:
            d=json.loads(m.group(0))
            if d.get('submitted'):
                ap=json.load(open(os.path.join(BASE,'applied.json')))
                if not any((isinstance(a,dict) and a.get('id')==jid) for a in ap['applied']):
                    ap['applied'].append({'id':jid,'board':'linkedin-ea','company':'LinkedIn','title':'LinkedIn Easy Apply','when':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())})
                    json.dump(ap,open(os.path.join(BASE,'applied.json'),'w'),indent=2)
                    log('LI RECORDED',jid)
            else:
                log('LI not submitted',jid,'steps:',(d.get('steps') or [])[-2:])
    except Exception as e:
        log('LI parse err',e)
    return last_out

def main():
    log('=== AUTOAPPLY LOOP START ===')
    cycle=0
    while True:
        cycle+=1
        log(f'--- CYCLE {cycle} ---')
        urls=random.sample(GH_POOL, min(8,len(GH_POOL)))
        gh_batch(urls)
        time.sleep(20)
        ids=li_scrape()
        log('LI ids found:',ids)
        for jid in ids[:6]:
            li_apply(jid)
            time.sleep(15)
        log('Cycle done. Pausing 120s...')
        time.sleep(120)

if __name__=='__main__':
    main()
