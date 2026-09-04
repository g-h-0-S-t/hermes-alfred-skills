#!/usr/bin/env python3
import subprocess, os, json, time, sys, random, re, threading

BASE='OPERATOR_HOME/job-apply'
ENV={k:v for k,v in os.environ.items() if k not in ('PYTHONPATH','PYTHONHOME')}
LOG=os.path.join(BASE,'_autoapply.log')
def log(*a):
    line=time.strftime('%H:%M:%S ')+' '.join(map(str,a))+'\n'
    # File write is the ONLY record — stdout/stderr handles die when the parent
    # shell session ends (background process), so we never touch them.
    try:
        with open(LOG,'a') as f: f.write(line)
    except Exception:
        pass

PENDING=os.path.join(BASE,'submissions_pending.jsonl')
def notify_submission(company, role, board):
    # Write a pending submission event for the notifier cron to deliver in operator's format.
    # Local IST time (UTC+5:30)
    local=time.gmtime(time.time()+19800)  # +5:30
    when=time.strftime('%d %b %Y, %I:%M %p IST', local)
    rec={'company':company,'role':role,'board':board,'when':when,'ts':time.time()}
    try:
        with open(PENDING,'a') as f: f.write(json.dumps(rec)+'\n')
    except Exception as e:
        log('notify err',e)

# ---- LinkedIn dedup / skip-list (prevents re-opening the same failed jobs) ----
SKIP=os.path.join(BASE,'li_skip.json')
def load_skip():
    try: return json.load(open(SKIP))
    except: return {}
def save_skip(d):
    try: json.dump(d,open(SKIP,'w'),indent=1)
    except: pass
# Outcomes that are PERMANENT (never retry):
PERMANENT={'ALREADY_APPLIED','NO_EA_BUTTON','applied'}
def record_outcome(jid, outcome, steps):
    d=load_skip()
    rec=d.get(jid,{'tries':0,'outcomes':[]})
    rec['tries']=rec.get('tries',0)+1
    rec['last']=outcome
    rec['outcomes']=rec.get('outcomes',[])[-4:]+[outcome]
    rec['steps']=steps
    # permanently skip if outcome is terminal, or too many failed tries
    if outcome in PERMANENT:
        rec['skip']=True
    elif rec['tries']>=3 and outcome not in ('submitted',):
        rec['skip']=True  # give up after 3 failed attempts
    d[jid]=rec
    save_skip(d)
def should_skip(jid):
    d=load_skip()
    rec=d.get(jid)
    if not rec: return False
    return bool(rec.get('skip'))
def applied_ids():
    try:
        ap=json.load(open(os.path.join(BASE,'applied.json')))
        return set(a.get('id') for a in ap['applied'] if isinstance(a,dict))
    except: return set()

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
 'https://job-boards.greenhouse.io/thoughtworksreferral/jobs/7765357',
 'https://job-boards.greenhouse.io/avochato/jobs/4500844003',
 'https://job-boards.greenhouse.io/encora10/jobs/5120658007',
 'https://job-boards.greenhouse.io/trivelta/jobs/4170694009',
 'https://job-boards.greenhouse.io/dkbcodefactory/jobs/7794554003',
 'https://job-boards.greenhouse.io/guardsquare/jobs/5554240',
 'https://job-boards.greenhouse.io/jetbrains/jobs/4772554101',
]
LI_SEARCHES=[
 'https://www.linkedin.com/jobs/search/?keywords=frontend%20OR%20javascript%20OR%20react%20OR%20typescript%20OR%20vue%20OR%20angular%20OR%20node&location=India&f_AL=true&f_TPR=r1800&sortBy=DD',
 'https://www.linkedin.com/jobs/search/?keywords=full%20stack%20OR%20software%20engineer%20OR%20ui%20engineer%20OR%20web%20developer&location=India&f_AL=true&f_TPR=r1800&sortBy=DD',
 'https://www.linkedin.com/jobs/search/?keywords=python%20OR%20django%20OR%20flask%20OR%20fastapi%20OR%20java%20OR%20spring&location=India&f_AL=true&f_TPR=r1800&sortBy=DD',
 'https://www.linkedin.com/jobs/search/?keywords=frontend%20OR%20react%20OR%20javascript%20OR%20full%20stack&location=Bengaluru&f_AL=true&f_TPR=r1800&sortBy=DD',
]

LI_SCRAPE_JS = r'''const { withPage } = require('OPERATOR_HOME/job-apply/cdp_helper.cjs');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  await withPage(async(page)=>{
    const url=process.argv[2];
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await sleep(6000);
    const ids=await page.evaluate(()=>{const s=[];document.querySelectorAll('a[href*="/jobs/view/"]').forEach(a=>{const m=a.href.match(/jobs\/view\/(\d+)/);if(m){const id=m[1];if(/^\d{10}$/.test(id)){const t=(a.innerText||'').replace(/\s+/g,' ').trim().slice(0,120);if(t)s.push([id,t]);}}});return s.slice(0,12);});
    console.log(JSON.stringify(ids));
  });
})().catch(e=>console.log('THREW',e.message));
'''

# ---- Profile-relevance filter: OPERATOR_NAME (14y SWE, Bengaluru) ----
# STRONG match (apply): full-stack, backend, frontend, Java, C#, Python, JavaScript/TypeScript,
# React, Vue, Angular, Node, Spring, SQL, PostgreSQL, MSSQL, Oracle,
# IAM/KYC/OAuth2/OIDC/SSO/RBAC/zero-trust, identity, security, aviation, maritime,
# logistics, cybersecurity, applied AI, AI automation, microservices, microfrontends,
# system design, Docker, CI/CD, Kubernetes, software engineer, developer, lead, staff,
# principal, architect, tech lead
# WEAK/off-target (skip): ONLY explicit non-tech or onsite-mandatory in wrong location
STRONG_KW=['full stack','fullstack','full-stack','software engineer','software developer','lead engineer','staff engineer','principal engineer','tech lead','architect',
           'java','spring','spring boot','c#','csharp','.net','asp.net','python','django','flask','fastapi',
           'javascript','typescript','react','vue','angular','node','nodejs','node.js','frontend','front-end','back end','backend','back-end',
           'ui engineer','ui developer','web developer','ui/ux engineer',
           'iam','kyc','oauth2','oidc','sso','rbac','zero trust','identity','authentication','authorization',
           'security','cybersecurity','application security','appsec','vapt','penetration testing',
           'aviation','flight ops','maritime','logistics','supply chain',
           'applied ai','ai automation','machine learning','ml engineer','gen ai','generative ai','llm','ai engineer','data engineer','datascience','big data',
           'microservices','microfrontends','system design','docker','kubernetes','ci/cd','devops','sre',
           'postgresql','mssql','oracle','sql','database',
           'selenium','test automation','qa automation']
SKIP_KW=['non-technical','business development','sales','marketing','recruiter','hr ','human resources',
         'project manager','product manager','scrum master','business analyst','support engineer',
         'technical support','qa ','test engineer','manual testing','civil','mechanical','electrical',
         'sap ','abap','cobol','jcl','db2','mainframe','firmware','embedded','network engineer',
         'onsite only','work from office','relocation mandatory','service based','service-based',
         'tcs','wipro','infosys','cognizant','tech mahindra','hcl','capgemini']
def relevant(title):
    t=(title or '').lower()
    # explicit off-target -> skip (but be precise: "java" alone is NOT skip, "spring boot" is NOT skip)
    for k in SKIP_KW:
        if k in t: return False
    # strong signal from YOUR profile -> relevant
    for k in STRONG_KW:
        if k in t: return True
    # If it says "software engineer" / "developer" generically, that's relevant for you
    if 'software engineer' in t or 'software developer' in t or ' developer' in t:
        return True
    return False  # unknown/ambiguous -> skip (conservative)


def run(cmd, timeout=300):
    try:
        r=subprocess.run(cmd, capture_output=True, text=True, env=ENV, cwd=BASE, timeout=timeout)
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, '', 'TIMEOUT'

def gh_batch(urls):
    """Greenhouse batch using LLM-powered external ATS pipeline."""
    log(f'GH batch: {len(urls)} URLs -> LLM pipeline')
    try:
        r = subprocess.run(
            ['python', os.path.join(BASE, '_ext_apply_orchestrator.py')] + urls,
            capture_output=True, text=True, timeout=600,
            cwd=BASE,
            env={k: v for k, v in os.environ.items() if k.upper() not in ('PYTHONPATH', 'PYTHONHOME')}
        )
        log('GH batch rc=', r.returncode)
        # Parse results from orchestrator output
        for line in r.stdout.splitlines():
            if 'SUBMITTED' in line:
                m = re.search(r'greenhouse\.io/([^/]+)/jobs/(\d+)', line)
                if m:
                    company = m.group(1).capitalize()
                    notify_submission(company, 'Greenhouse Application', 'greenhouse')
        return r.stdout
    except Exception as e:
        log('GH batch error:', e)
        return ''

def li_scrape():
    # Write the scrape script (uses cdp_helper which handles session recovery)
    open(os.path.join(BASE,'_li_scrape_auto.cjs'),'w',encoding='utf-8').write(LI_SCRAPE_JS)
    pairs=[]  # list of [id, title]
    for s in LI_SEARCHES:
        rc,out,err=run(['node',os.path.join(BASE,'_li_scrape_auto.cjs'),s],timeout=120)
        try:
            last=[l for l in out.strip().splitlines() if l.startswith('[')][-1]
            data=json.loads(last)
            # data is either [id,title] pairs or plain id strings
            for item in data:
                if isinstance(item,list) and len(item)>=2:
                    pairs.append([item[0],item[1]])
                elif isinstance(item,str):
                    pairs.append([item,''])
        except Exception as e:
            pass
        time.sleep(8)
    # dedupe by id, keep first title; only accept valid 10-digit LinkedIn job IDs
    seen={}
    for idv,title in pairs:
        if isinstance(idv,str) and re.fullmatch(r'\d{10}', idv) and idv not in seen:
            seen[idv]=title
    return list(seen.items())  # -> [(id, title), ...]

def li_apply(jid):
    last_out=''
    for attempt in range(3):
        rc,out,err=run(['node','apply_one.cjs',f'https://www.linkedin.com/jobs/view/{jid}/'],timeout=120)
        last_out=out
        if 'Execution context was destroyed' in out or 'context was destroyed' in out:
            log('LI retry',jid,'attempt',attempt+1,'context destroyed')
            time.sleep(10)
            continue
        break
    # record submission to applied.json if success, AND record outcome in skip-list
    outcome='unknown'
    steps=[]
    try:
        import re as _re
        m=_re.search(r'\{[^{}]*"submitted"[^{}]*\}', last_out, _re.DOTALL)
        if m:
            d=json.loads(m.group(0))
            steps=d.get('steps') or []
            if d.get('submitted'):
                ap=json.load(open(os.path.join(BASE,'applied.json')))
                if not any((isinstance(a,dict) and a.get('id')==jid) for a in ap['applied']):
                    ap['applied'].append({'id':jid,'board':'linkedin-ea','company':'LinkedIn','title':'LinkedIn Easy Apply','when':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())})
                    json.dump(ap,open(os.path.join(BASE,'applied.json'),'w'),indent=2)
                    log('LI RECORDED',jid)
                    role='LinkedIn Easy Apply'
                    try:
                        if isinstance(d.get('title'),str) and d['title']: role=d['title']
                    except: pass
                    notify_submission('LinkedIn', role, 'linkedin-ea')
                outcome='submitted'
            else:
                log('LI not submitted',jid,'steps:',steps[-3:])
                outl=' '.join(steps)
                if 'NO_EA_BUTTON' in outl: outcome='NO_EA_BUTTON'
                elif 'ALREADY_APPLIED' in outl: outcome='ALREADY_APPLIED'
                elif 'EA_DAILY_LIMIT' in outl: outcome='EA_DAILY_LIMIT'
                elif 'STUCK' in outl: outcome='STUCK'
                else: outcome='failed'
        else:
            outcome='parse_fail'
    except Exception as e:
        log('LI parse err',e)
        outcome='parse_fail'
    # record in skip-list so we never re-open this job needlessly
    try:
        if outcome!='submitted':
            record_outcome(jid, outcome, steps[-6:])
        else:
            record_outcome(jid, 'applied', steps[-6:])
    except Exception as e:
        log('skip-record err',e)
    return last_out

def main():
    # HARD SINGLE-INSTANCE GUARD (cross-session safe): query ALL python processes on the
    # machine via WMI (works across Windows sessions, unlike os.kill(pid,0)). If another
    # live autoapply_loop.py already exists (excluding THIS pid), refuse to start. This
    # prevents the double-loop race that hammers LinkedIn 9222 and trips the bot-check.
    # SINGLE-INSTANCE LOCK — FILESYSTEM LOCK + CROSS-SESSION HEARTBEAT.
    # NOTE: a prior pid-based guard using Get-CimInstance was removed — on this
    # machine it produced stale phantom PIDs and falsely refused to start even
    # when no loop was alive. The filesystem lock + heartbeat below is the
    # authoritative cross-session guard. Do NOT re-add a pid check here.
    me=os.getpid()
    # Windows session isolation makes pid-based liveness checks (Get-Process,
    # os.kill(pid,0)) UNRELIABLE across the two interpreters that launch this
    # script (interactive shell python vs the cron's agent generation-python):
    # each process lives in a different session and cannot see/ signal the other,
    # so a false "owner dead" lets a SECOND loop start. We avoid pid checks
    # entirely and use a filesystem HEARTBEAT: the live loop touches
    # _loop.heartbeat every cycle; a would-be second instance, on finding the
    # lock held, checks the heartbeat AGE (filesystem = shared across sessions).
    # Fresh heartbeat -> a live owner exists -> exit. Stale/old -> owner died
    # without cleanup -> steal the lock. This is robust regardless of session.
    lockfile=os.path.join(BASE,'_loop.lock')
    hbfile=os.path.join(BASE,'_loop.heartbeat')
    me=os.getpid()
    lockfd=None
    def _hb_fresh(max_age=150):
        try:
            age=time.time()-os.path.getmtime(hbfile)
            return age<=max_age
        except Exception:
            return False  # no heartbeat yet -> treat as not-fresh (safe to steal)
    def _touch_hb():
        try:
            open(hbfile,'w').close()  # update mtime; loop calls this each cycle
        except Exception:
            pass
    for _ in range(4):  # brief retry to absorb a concurrent O_EXCL race
        try:
            lockfd=os.open(lockfile, os.O_CREAT|os.O_EXCL|os.O_WRONLY)
            os.write(lockfd, str(me).encode())
            break  # we own the lock (fd stays open -> lifetime guard)
        except FileExistsError:
            if _hb_fresh():
                sys.stderr.write('Another loop already running (fresh heartbeat). Exiting.\n')
                sys.exit(0)
            # stale/old heartbeat (owner dead) -> remove lock + heartbeat, retry
            try: os.remove(lockfile)
            except Exception: pass
            try: os.remove(hbfile)
            except Exception: pass
            time.sleep(0.5)
    else:
        sys.stderr.write('Could not acquire loop lock after retries; refusing to start.\n')
        sys.exit(1)
    globals()['_loop_lock_fd']=lockfd  # keep open for process lifetime
    globals()['_touch_hb']=_touch_hb
    # HEARTBEAT THREAD (fix 2026-08-29): the once-per-cycle touch was NOT enough.
    # A cycle = gh_batch (8 URLs, each up to a 75s watchdog) + LinkedIn scrape + up to 6
    # applies + 120s cooldown, i.e. routinely 5-15 MINUTES. Against the 150s freshness
    # threshold used by BOTH this loop's own guard and the watchdog cron, a perfectly
    # healthy loop therefore looked DEAD -> the cron would start a SECOND loop, whose
    # guard would see the same stale heartbeat, STEAL the lock, and race this one on
    # port 9222 (Chrome collision + LinkedIn account-ban risk). A daemon thread ticking
    # every 30s makes the heartbeat a true liveness signal, independent of cycle length.
    def _hb_thread():
        while True:
            _touch_hb()
            time.sleep(30)
    try:
        threading.Thread(target=_hb_thread, daemon=True, name='heartbeat').start()
        log('heartbeat thread started (30s tick)')
    except Exception as e:
        log('heartbeat thread failed (falling back to per-cycle touch):',e)
    pidfile=os.path.join(BASE,'_loop.pid')
    try: open(pidfile,'w',encoding='utf-8').write(str(me))
    except Exception: pass
    # Singleton lockfile already claimed above (authoritative, cross-context safe).
    # DEFENSIVE: kill orphaned node child processes from a prior crashed loop
    # (gh_batch/apply_one that outlived their parent would collide on the shared Chrome).
    try:
        o=subprocess.run(['powershell','-NoProfile','-Command',"Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object {$_.CommandLine -like '*job-apply*'} | ForEach-Object { Write-Host $_.ProcessId }"],capture_output=True,text=True,timeout=30).stdout
        for p in [x.strip() for x in o.split() if x.strip().isdigit()]:
            subprocess.run(['taskkill','/PID',p,'/F','/T'],capture_output=True,text=True)
        log('cleaned orphan node procs')
    except Exception as e:
        log('orphan cleanup err',e)
    log('=== AUTOAPPLY LOOP START ===')
    cycle=0
    empty_streak=0
    while True:
        cycle+=1
        log(f'--- CYCLE {cycle} ---')
        urls=random.sample(GH_POOL, min(8,len(GH_POOL)))
        log('GH urls:',urls)
        gh_batch(urls)
        time.sleep(20)
        log('Scraping LinkedIn EA...')
        jobs=li_scrape()  # [(id, title), ...]
        log('LI jobs found:',len(jobs))
        # FILTER 1: already applied or in skip-list
        done=applied_ids()
        notdone=[(jid,title) for jid,title in jobs if jid not in done and not should_skip(jid)]
        # FILTER 2: profile relevance (operator loves frontend / JavaScript)
        relevant_jobs=[(jid,title) for jid,title in notdone if relevant(title)]
        skipped_offtarget=[(jid,title) for jid,title in notdone if not relevant(title)]
        if skipped_offtarget:
            log('LI off-target (skipped):',len(skipped_offtarget),'->',[t[:40] for _,t in skipped_offtarget[:4]])
        log('LI relevant+fresh:',len(relevant_jobs),'of',len(jobs))
        if not relevant_jobs:
            log('No relevant fresh jobs this cycle — waiting for new frontend/JS postings.')
        for jid,title in relevant_jobs[:6]:
            out=li_apply(jid)
            log('LI apply',jid,'->',out.strip()[:120])
            time.sleep(15)
        # LinkedIn search throttle backoff: if scrapes keep returning 0 (rate-limited),
        # wait longer so the throttle clears instead of hammering every 2 min.
        if len(jobs)==0:
            empty_streak+=1
            backoff=min(60*empty_streak*5, 1200)  # 5min,10,15... up to 20min
            log(f'Empty scrape streak {empty_streak} — backing off {backoff}s for LinkedIn throttle.')
            time.sleep(backoff)
        elif 'ea_daily_limit' in (out or '').lower():
            # LinkedIn blocks further EA submissions for today. Back off for hours.
            log('EA_DAILY_LIMIT hit — backing off 2h. LinkedIn EA submissions resume tomorrow.')
            time.sleep(7200)
        else:
            empty_streak=0
            log('Cycle done. Pausing 120s...')
            time.sleep(120)

import signal as _sig, traceback as _tb
_CRASH='OPERATOR_HOME/job-apply/_loop_crash.log'
def _crash(msg):
    try:
        with open(_CRASH,'a') as f: f.write(time.strftime('%H:%M:%S ')+msg+'\n')
    except: pass
def _on_sig(signum, frame):
    _crash('SIGNAL %d (terminated externally)'%signum)
    # Clean up lockfile so next instance can start
    try:
        lockfile=os.path.join(BASE,'_loop.lock')
        if os.path.exists(lockfile):
            os.remove(lockfile)
    except Exception:
        pass
    sys.exit(1)
_sig.signal(_sig.SIGTERM, _on_sig)
_sig.signal(_sig.SIGINT, _on_sig)
_sig.signal(_sig.SIGBREAK, _on_sig)
if __name__=='__main__':
    try:
        main()
    except SystemExit:
        raise
    except BaseException as e:
        _crash('EXCEPTION: ' + ''.join(_tb.format_exception(type(e), e, e.__traceback__)))
        raise
