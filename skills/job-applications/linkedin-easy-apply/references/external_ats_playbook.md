# External ATS Orchestration Playbook (VERIFIED XXXXXXX — corrected)

LinkedIn jobs that are NOT Easy Apply redirect off-platform ("Responses managed off
LinkedIn"). These are the external ATS types seen in the wild for user's stack:

| ATS / host | Example | Autonomy level | Notes |
|---|---|---|---|
| **Greenhouse** | `job-boards.greenhouse.io/<company>` | GUEST board fill + **HUMAN submit** | reCAPTCHA silently drops automated submit — Hermes Agent fills 100%, operator clicks Submit. See GREENHOUSE BOARD FLOW below. |
| **Google Form** | `docs.google.com/forms/...` | FULL | Hermes Agent has Google auth; deterministic field fill. Easiest external. **BUT scam-check first** (see Safety). |
| **micro1.ai** | `jobs.micro1.ai/post/...` | GUEST multi-step | React form, 2 steps. See MICRO1 FLOW below. |
| **duruper.com** | `duruper.com/find-jobs/...` | CUSTOM | Company-built ATS; inspect per posting. |
| **husky.co** | `husky.co/en/careers/portal/...` | CUSTOM | Company portal. |
| **EPAM welcome** | `jobs.welcome.epam.in/vacancy/...` | CUSTOM | EPAM's own portal. |
| **Recruitics** | `jsv3.recruitics.com/redirect?...` | REDIRECT | Bounces to a real ATS (often Greenhouse/Lever) — follow the final URL. |
| **Workday** | `*.myworkdayjobs.com/...` | MANUAL-HEAVY | Strong bot defense, often needs an account + manual steps. STOP + tell user. |

## GREENHOUSE BOARD FLOW (verified XXXXXXX — the login path is DEAD)

### Reality check: the logged-in candidate portal does NOT work
- `app.greenhouse.io` and the saved cookies (`ats_session_cookies.json`, 19
  cookies) are STALE — both `/applications` and `/jobs` redirect to `/users/sign_in`.
  Greenhouse candidate sessions are short-lived. Do NOT rely on "Autofill my
  application" / saved-profile — it needs live login (user's interactive Google SSO).
- **Use the PUBLIC company boards instead** — they need NO login and are the reliable path.

### Public board discovery + drive
1. **Discover**: `web_search("boards.greenhouse.io <role> <stack> remote")`. Live slugs
   found XXXXXXX: `lumimeds` (43 jobs), `techholding` (19 jobs, incl. Senior
   FullStack Engineer Ahmedabad XXXXXXX), `remotecom`, `earnin`, `leaflink`, `reltio`.
   Stale/404 slugs (e.g. `alignerr`) return "board no longer active" — verify with a
   live probe before driving.
2. **The JD page CONTAINS the form in-place** — there is NO separate apply URL. The
   top-right "Apply" button has no href/onclick; clicking it (React) reveals the form
   below the job description. Form fields have clean IDs:
   `#first_name #last_name #email #country #phone #resume(file) #cover_letter(file)
   #degree--0 #question_<numeric_id>`.
3. **SUBMIT TRAP (cost 4 wasted runs XXXXXXX):** TWO buttons exist.
   - The header **"Apply"** button only TOGGLES/reveals the form — clicking it does NOT
     submit.
   - The REAL submit is a `type=submit` button labeled **"Submit application"**
     (class `btn btn--pill`) at the BOTTOM of the form, past the Education section.
     ALWAYS click "Submit application", never the header "Apply".
4. **Field-fill techniques (verified to stick):**
   - **Plain text inputs** (`#first_name` etc.): React-native setter + `input`+`change`+`blur`
     events:
     ```js
     const p=Object.getPrototypeOf(e);const s=Object.getOwnPropertyDescriptor(p,'value');
     if(s&&s.set)s.set.call(e,val);
     e.dispatchEvent(new Event('input',{bubbles:true}));
     e.dispatchEvent(new Event('change',{bubbles:true}));
     e.dispatchEvent(new Event('blur',{bubbles:true}));
     ```
   - **react-select dropdowns** (`#country`, `#degree--0`, Yes/No questions): NOT native
     `<select>` — they are `input.select__input` (aria-autocomplete). Fill by:
     `handle.click()` the control → `page.keyboard.type(value,{delay:50})` →
     `page.keyboard.press('Enter')`. For Country type "XXXXXXX", Degree "Bachelor's",
     Yes/No "Yes". A plain `setReact('#country','XXXXXXX')` does NOT commit (dropdown stays
     on "Select a country" placeholder) — must use click+type+Enter.
   - **Resume**: `page.$('#resume')` then `handle.uploadFile(RESUME_PATH)`. The CDP
     `filechooser`+`el.click()` path does NOT fire on the hidden input (`.click()` hangs
     waiting for visibility) — use `uploadFile` directly. Vision-verify the filename
     `operator_XXXXXXX_Resume_ATS.pdf` shows with a remove-X before submitting.
5. **reCAPTCHA IS A REAL BLOCKER** (XXXXXXX, VERIFIED): an automated CDP "Submit
   application" click is SILENTLY DROPPED — no success page, no error, no visible
   challenge, just the unchanged form. Same invisible-score fail as SonicWall.
   **WORKING WORKAROUND**: Hermes Agent fills 100% (vision-verified, resume attached) and then
   hands operator the exact tab to click "Submit application" (a human click passes the
   bot-score). Do NOT loop-retry the automated submit expecting it to pass.
6. Email-verification gate exists only on the logged-in portal, not guest boards.

## MICRO1.AI FLOW (verified XXXXXXX)
- URL `jobs.micro1.ai/post/<id>`. Multi-step React form.
- Step 1: text inputs (first/last/email/linkedin) + PhoneInput (`tel`, set
  `XXXXXXX`+number) + resume upload via `page.$('input[type=file]').uploadFile()`. The
  LinkedIn field (idx 4) needs value set + `blur` event to commit to React state.
- Click **"Next"** — may need to click TWICE (first click sometimes doesn't advance
  due to a React state race after synthetic input events).
- Step 2: hourly rate / hours per week / start days — set honest values
  (e.g. `$50` / `40` / `0` for immediate). Submit. Final screen shows "Processing your
  application..." then "You've successfully applied" — verify, don't assume.

## SAFETY GATE (release-blocking, operator XXXXXXX — "beware scam jobs / don't hand over bank details")
Before ANY fill/submit, scan the destination + rendered page:
1. **Never submit banking/payment data.** If a field matches
   `/bank|account number|iban|swift|routing|card number|cvv|pin|otp|paypal|upi|salary account|payment|bank details/i`
   AND it isn't obviously salary expectation → STOP, flag it. Numeric CTC (XXXXXXX/XXXXXXX) is ALLOWED.
2. **Scam signals → STOP + skip (log to skip.json as SAFETY_<type>):**
   - Requests a **payment / registration / training fee** to apply.
   - "Send money / purchase kit" to apply.
   - Asks for **password/OTP/Aadhaar/PAN** as a first-application field.
   - "Step 1 of registration" + "confirm your seat via WhatsApp group" (lead-gen/recruitment-scam shape).
   - Odd TLD (`-.xyz/.top/.ru`) for a reputable-employer role.
3. Real case blocked XXXXXXX: a Google Form "Candidate Internship Form" by "Skillfied
   Mentor" (WhatsApp-group seat-confirm) — NOT submitted, logged SAFETY_SCAM_INTERNSHIP_FUNNEL.

## Generic external-ATS apply flow (two-phase, same as EA)
1. Navigate to the real ATS URL in the LINKEDIN_PORT tab (single-tab rule applies).
2. **Detect autofill / saved-profile option** — only on LIVE sessions; for Greenhouse use
   the guest board flow above (no autofill available).
3. Extract every question → Hermes Agent reasons each answer from the verified profile → fill via
   `page.evaluate(selectorString=>...)` (NOT elementHandle.evaluate — that HANGS) → verify
   each write by reading the value back → advance.
4. Attach resume: `page.$('input[type=file]').uploadFile(RESUME)` (never `el.click()` on
   the file input — opens Windows explorer and blocks). Path:
   `XXXXXXX/OneDrive/Desktop/operator_XXXXXXX_Resume_ATS.pdf`.
5. **VISION-CONFIRM** full page before Submit — same as EA.
6. Handle gates:
   - **Invisible reCAPTCHA on Greenhouse boards** → automated submit is SILENTLY DROPPED.
     Fill fully, then hand operator the tab for the human Submit click. (See board flow above.)
   - **Email verification code** (live Greenhouse portal): read via Gmail, type 8-char code,
     resubmit. CODE EXPIRES — re-request fresh if "Invalid security code".
   - **Visible captcha / "verify you are human"** → STOP, tell user.

## Google Workspace re-auth (oob — the only working method)
After a destructive Hermes update the GWS token can be wiped (only Gmail survives a
narrow re-auth). Re-auth with the FULL scope set via the out-of-band flow:
```python
from google_auth_oauthlib.flow import InstalledAppFlow
import json
SCOPES = ["https://www.googleapis.com/auth/gmail.readonly","https://www.googleapis.com/auth/gmail.send",
          "https://www.googleapis.com/auth/gmail.modify","https://www.googleapis.com/auth/drive",
          "https://www.googleapis.com/auth/drive.file","https://www.googleapis.com/auth/spreadsheets",
          "https://www.googleapis.com/auth/documents","https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/calendar.events"]
secret = "XXXXXXX/AppData/Local/hermes/google_client_secret.json"
flow = InstalledAppFlow.from_client_secrets_file(secret, SCOPES, redirect_uri="urn:ietf:wg:oauth:2.0:oob")
auth_url = flow.authorization_url(prompt="consent")[0]
json.dump({"code_verifier": flow.code_verifier}, open("XXXXXXX/job-apply/_gws_verifier.json","w"))
# give auth_url to operator; he approves and pastes the on-screen code
ver = json.load(open("XXXXXXX/job-apply/_gws_verifier.json"))["code_verifier"]
flow.code_verifier = ver
flow.fetch_token(code=CODE_PASTED_BY_USER)
open("XXXXXXX/AppData/Local/hermes/google_token.json","w").write(flow.credentials.to_json())
```
- Use `redirect_uri="urn:ietf:wg:oauth:2.0:oob"` — NOT `localhost:1` (Chrome ERR_UNSAFE_PORT).
- PERSIST + reuse `flow.code_verifier` on exchange (fresh flow → `invalid_grant: Missing
  code verifier`). An oob code shows on-page (no redirect) so it sidesteps the port error.
- **Test access correctly:** do a real `get`/`create`, not `get(id="0")`. A **404** = auth
  SUCCEEDED (only **403** = missing scope). Prove write access via `spreadsheets().create()`
  then `drive.files().delete()` (cleanup).
- Live token: `XXXXXXX/AppData/Local/hermes/google_token.json` (authoritative).

## Driver files (XXXXXXX/job-apply)
- `gh_apply.cjs` — Greenhouse public-board apply (text fields via React-native setter,
  react-select via click+type+Enter, resume via uploadFile, clicks "Submit application").
- `ext_apply.cjs` — universal external-ATS driver with scam-safety gate.
- `_gh_board_run.cjs` — discovers+lists live jobs on a set of company boards.
- The LINKEDIN_PORT single-tab rule and vision-confirm rules from SKILL.md apply identically.
