# LinkedIn EA — Numeric / Years Field Corruption (FIXED XXXXXXX)

## Symptom
On the Additional Questions step the form reports `STUCK on 3/4` and a numeric year field
(e.g. "How many years of Business Development experience do you currently have?") shows the
WORD `No` with a red `Invalid input` underneath it. The Review button stays blue/enabled but
clicking it does nothing — the form never reaches Submit.

## Why it happened (3 root causes)
1. **Top-doc-only text scan.** The `textFields` evaluate used `m=document`. LinkedIn renders
   the ENTIRE EA form inside an iframe (`https://www.linkedin.com/preload/?_bprMode=vanilla`),
   so the field's real `<label>` was invisible to the resolver. `answer('')` → LLM fallback →
   returned "No" for an unlabeled years question.
2. **`numeric` computed from empty label** → no coercion guard fired.
3. **Refill whitelist too narrow.** The refill filter only re-filled fields whose value matched
   `linkedin|employer|company|name|github|portfolio|profile|url`. A pre-filled "No" in a years
   field was treated as "already has a value" and SKIPPED — the bad value persisted.

## The fix (all in `apply_one.cjs`)
```js
// 1) IFRAME-AWARE text-field scan (resolve label within each doc's own scope)
const docs=[document]; for(const f of document.querySelectorAll('iframe')){
  try{ const d=f.contentDocument; if(d) docs.push(d); }catch(e){}
}
const resolveLab=(n, doc)=>{
  if(n.id){ const l=doc.querySelector('label[for="'+CSS.escape(n.id)+'"]');
            if(l&&l.innerText&&l.innerText.trim().length>2) return l.innerText.replace(/\s+/g,' ').trim(); }
  const al=n.getAttribute('aria-label'); if(al&&al.trim().length>2) return al.trim();
  // ...name/id hint, placeholder, wrapping label, climb siblings/ancestors (all via `doc`)
  return '';
};
// collect: { id, lab, numeric }  where numeric = type=number || inputmode=numeric ||
//          /years|salary|ctc|compensation|pincode|zip|phone|experience in (years|yr)/i.test(lab)
// ALSO include numericWrong = numeric && v && !/^[0-9]+$/.test(v)  in the refill filter

// 2) Coerce on fill
if(f.numeric){ const digits=(''+ans).replace(/[^0-9]/g,''); ans = digits.length ? digits : '0'; }

// 3) POST-FILL SANITIZE (iframe-aware) — catches labels the single-field resolver missed
await page.evaluate(()=>{
  const docs=[document]; for(const f of document.querySelectorAll('iframe')){ try{ const d=f.contentDocument; if(d) docs.push(d);}catch(e){} }
  for(const doc of docs){ for(const n of doc.querySelectorAll('input,textarea')){
    const ty=(n.type||'').toLowerCase(); if(['file','hidden','checkbox','radio'].includes(ty)) continue;
    const v=(n.value||'').trim(); if(/^[0-9]+$/.test(v)) continue;
    let grp=''; const host=n.closest('fieldset,li,div[role=group]')||n.parentElement; if(host) grp+=' '+(host.innerText||'');
    let node=n.parentElement;
    for(let d=0; d<6 && node && node!==doc.body; d++){
      const prev=node.previousElementSibling; if(prev) grp+=' '+(prev.innerText||'');
      const p=node.parentElement; if(p){ const q=p.querySelector('p,label,span,legend,h3,h4,div'); if(q) grp+=' '+(q.innerText||''); }
      node=p;
    }
    if(/year|experience/.test(grp.toLowerCase())){
      const set=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set;
      set.call(n,'0'); n.dispatchEvent(new Event('input',{bubbles:true})); n.dispatchEvent(new Event('change',{bubbles:true}));
    }
  }}
});
```

## Diagnostic recipe (run with `env -u PYTHONPATH -u PYTHONHOME node`)
Open EA on the target job, advance to Additional Questions, then dump every input with its
resolved label + value, scanning top doc + iframes:
```js
const puppeteer=require('puppeteer-core');
(async()=>{
  const b=await puppeteer.connect({browserURL:'http://127.0.0.1:LINKEDIN_PORT',defaultViewport:null});
  const pages=await b.pages(); const page=pages[0]||await b.newPage();
  // ...goto job, click Easy Apply, wait...
  const dump=await page.evaluate(()=>{
    const docs=[document]; for(const f of document.querySelectorAll('iframe')){ try{const d=f.contentDocument; if(d) docs.push(d);}catch(e){} }
    const resolveLab=(n,doc)=>{ /* same as above */ return ''; };
    const out=[]; for(const doc of docs){ for(const n of doc.querySelectorAll('input,textarea')){
      const ty=(n.type||'').toLowerCase(); if(['file','hidden','checkbox','radio'].includes(ty)) continue;
      out.push({id:n.id,type:ty,lab:resolveLab(n,doc),v:n.value,inIframe:doc!==document}); } }
    return out;
  });
  console.log(JSON.stringify(dump,null,1)); await b.disconnect();
})().catch(e=>console.log('THREW',e.message));
```
The bug shows as a years field whose `v` is non-numeric ("No") while `lab`/`grp` mentions years.

## Verification (MANDATORY)
After any EA numeric-handling change, drive ONE real job to Submit and confirm independently:
reload the job detail page and check for "Application status: Application submitted" in
`document.body.innerText` (NOT just the script's `submitted:true` self-report).
