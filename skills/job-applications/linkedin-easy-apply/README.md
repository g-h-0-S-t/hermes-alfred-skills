# LinkedIn Easy Apply Auto-Filler (Universal)

A single-file Node.js tool that drives a **real, logged-in LinkedIn Chrome** (via
CDP / `puppeteer-core`) and fills **any** Easy Apply form — no matter how varied
the questionnaire.

It detects **every** control type LinkedIn uses and fills it correctly:

| Control | How it's handled |
| --- | --- |
| Text / email / tel / url / search | placeholder + id + name + aria-label + wrapping label |
| Number (CTC, years, notice) | value coercion, no garbage text |
| Textarea (cover letter) | LLM-drafted concise answer, or profile rule |
| Native `<select>` | option match (exact → startsWith → includes) |
| Custom combobox / listbox | LLM option pick + DOM select |
| 2-option radio (Yes/No, authorize) | deterministic rule + LLM fallback |
| Multi-option radio (Seniority, etc.) | deterministic rule → LLM pick |
| Single checkbox (consent) | rule / profile value |
| Multi checkbox (skills) | matches profile `skills` list |
| Date / contenteditable | value set + change event |
| Resume picker | **selects the stored ATS resume only — never uploads a file** |

## Zero-corruption guarantee

The engine **never submits an incomplete form**:

- Required field with no deterministic answer and no LLM result → logged as a
  `needs-review` GAP and the submit is **skipped** (the job is parked, not corrupted).
- The LLM is **best-effort only**: it runs with an 8-second hard timeout and its
  output is JSON-parsed defensively. If it is slow or returns garbage, the field
  simply becomes a GAP. The LLM can never write raw text into the DOM that breaks
  a field — it only returns a *typed value* that the script applies per control type.

## LLM (optional but recommended)

The fill engine uses **Kilo's free gateway** (`https://api.kilo.ai/api/gateway`) — no API key.
Two NVIDIA Nemotron models power it:

- **Text/classification** — `nvidia/nemotron-3.5-lightning:free` picks options and drafts open text.
- **Vision** — `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` *sees a screenshot of each
  control* and reads custom widgets (styled comboboxes, shadow-DOM radios, icon buttons) that
  text-only parsing cannot. When a field can't be resolved by rule or text-LLM, the engine
  screenshots that element and asks the vision model, then applies the typed answer.

The LLM only ever returns a *typed value*; the script applies it per control type, so the model
can never corrupt a field. Both calls have hard timeouts (text 8s, vision 15s) with defensive
JSON parsing. If a call is slow or returns garbage, the field becomes a `needs-review` GAP (the
form is not submitted incomplete).

```jsonc
// applicant.profile.json
"llm": { "enabled": true, "baseUrl": "https://api.kilo.ai/api/gateway", "model": "nvidia/nemotron-3.5-lightning:free", "visionModel": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", "timeoutMs": 8000, "visionTimeoutMs": 15000 }
```

## Setup

```bash
git clone <repo>
cd linkedin-easy-apply
npm install
# 1) launch Chrome with remote debugging (one profile you've logged into LinkedIn)
#    chrome.exe --remote-debugging-port=LINKEDIN_PORT --user-data-dir="C:/path/to/profile"
# 2) copy the profile template and fill YOUR details
cp applicant.profile.example.json applicant.profile.json
# 3) run
node linkedin-easy-apply.cjs connect            # verify the live tab
node linkedin-easy-apply.cjs collect 24        # fresh <=24h Easy Apply jobs
node linkedin-easy-apply.cjs run --apply        # auto-fill + submit
```

Config lives in `applicant.profile.json` (contact, `resumeName`, `locationPref`,
`answers` substring→value map, `skills`, `llm`). Never commit your real profile.

## Safety

- Respects LinkedIn's daily Easy Apply cap (detects + pauses).
- Randomized delays, no bulk scraping, anti-prompt-injection on field text.
- No resume upload; only selects the resume already stored in your LinkedIn account.

## Tests

`node _universal_test.cjs` (dev) runs the fill engine against a mock form
covering every control type and asserts correct application. Requires Chrome at
`C:\Program Files\Google\Chrome\Application\chrome.exe` (or set `CHROME_BIN`).

MIT License.
