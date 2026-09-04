# Hermes Agent Toolkit 🦇

> Reusable skills, scripts, and configs for [Hermes Agent](https://hermes-agent.nousresearch.com/docs) — automation that turns a generic agent into a capable, self-directing assistant.

This is a **self-contained, generic toolkit** — no credentials, no hardcoded PII. Every `XXXXXXX`, `OPERATOR_*`, `LINKEDIN_PORT`, etc. placeholder is yours to replace with your own data.

**Fork this repo, fill in the placeholders, and you're ready to go.**

---

## ⚠️ CRITICAL: Placeholder Replacement Guide

**If you skip this section, NOTHING will work.** Every script and skill contains placeholders where your personal data must go. This guide maps every single placeholder to exactly what data it needs.

### Placeholder → Data Map

| Placeholder | What It Is | What to Replace With | Example |
|-------------|-----------|---------------------|---------|
| `XXXXXXX` | Your full name (first + last) | Your actual name | `"John Doe"` |
| `XXXXXXXX` | Your city | Your city | `"Mumbai"` |
| `XXXXXXXXX` | Your expected CTC/salary figure | Number in local currency | `"2500000"` (25 LPA) |
| `XXXXXXXXXX` | Your current CTC/salary figure | Number in local currency | `"1800000"` (18 LPA) |
| `OPERATOR_LINKEDIN_ID` | LinkedIn profile username/ID | Your LinkedIn URL slug | `"johndoe"` (from linkedin.com/in/johndoe) |
| `OPERATOR_HOME` | Your home directory | Your OS user home | `C:\Users\john` or `/home/john` |
| `OPERATOR_RESUME_PATH` | Directory where resumes live | Full path to your resume folder | `C:/Users/john/job-apply` |
| `OPERATOR_RESUME_ATS` | ATS-friendly resume filename | Your ATS resume PDF filename | `John_Doe_Resume_ATS.pdf` |
| `OPERATOR_RESUME_FULL` | Full resume filename | Your full resume file | `John_Doe_Resume_Full.md` |
| `YOUR_GITHUB_USERNAME` | GitHub username | Your GitHub handle | `"johndoe"` |
| `LINKEDIN_PORT` | Chrome debug port for LinkedIn | Any free port number | `9222` |
| `ATS_PORT` | Chrome debug port for ATS boards | Any free port number | `9223` |
| `AUTOMATION_PORT` | Chrome debug port for automation | Any free port number | `9333` |
| `CHROME_PROFILE` | Chrome profile directory path | Your Chrome profile dir | `C:/Users/john/chrome-cdp-profile` |
| `CRON_ID` | Cron job identifier | A unique cron job ID | `cron_abc123def456` |
| `TARGET_COMPANY` | Company name placeholder | Name of target company | `"Google"` |
| `EMPLOYER_1` through `EMPLOYER_6` | Past employer names | Your actual employer names | `"TCS"`, `"Infosys"`, etc. |
| `portfolio.example.com` | Portfolio/website URL | Your personal website | `johndoe.dev` |
| `+XX XXXXXXXXXX` | Phone number placeholder | Your phone with country code | `+91 9876543210` |
| `xxxxxxxxx@gmail.com` | Email placeholder | Your email address | `john@gmail.com` |

---

## File-by-File Setup Instructions

### 🔴 MOST CRITICAL — Job Application Scripts

These require the MOST customization. Replace placeholders in this order:

#### 1. `skills/job-applications/linkedin-easy-apply/scripts/applicant.profile.json`
**This is the SINGLE MOST IMPORTANT file.** It contains your structured profile that the job-automation pipeline reads when filling forms.

Open this file and replace:
- `XXXXXXX` → Your full name (first + last)
- `OPERATOR_LINKEDIN_ID` → Your LinkedIn username
- `+XX XXXXXXXXXX` → Your phone number with country code
- `xxxxxxxxx@gmail.com` → Your email
- `XXXXXXXX` → Your city
- `OPERATOR_RESUME_ATS` → Your ATS resume PDF filename
- `portfolio.example.com` → Your portfolio URL (or delete if none)
- All employer names, dates, education details → YOUR actual history

#### 2. `scripts/job-apply/apply_one.cjs`
Replace:
- `XXXXXXX` → Your full name
- `OPERATOR_LINKEDIN_ID` → Your LinkedIn username
- `YOUR_GITHUB_USERNAME` → Your GitHub username
- `XXXXXXXX` → Your city
- All `require('XXXXXXX/...')` paths → Your actual job-apply directory path
- Experience years → Your actual years of experience

#### 3. `scripts/job-apply/gh_batch.cjs`
Replace:
- `OPERATOR_RESUME_PATH` → Your resume directory path
- `OPERATOR_RESUME_ATS` → Your ATS resume filename
- `OPERATOR_LINKEDIN_ID` → Your LinkedIn username
- `YOUR_GITHUB_USERNAME` → Your GitHub username
- `XXXXXXX` → Your name

#### 4. `scripts/job-apply/cdp_helper_9223.cjs`
Replace:
- `ATS_PORT` → Your chosen ATS browser port (e.g., `9223`)

#### 5. `scripts/job-apply/cdp_helper.cjs`
Replace:
- `LINKEDIN_PORT` → Your chosen LinkedIn browser port (e.g., `9222`)
- `XXXXXXX` → Your home directory path

#### 6. `scripts/job-apply/autoapply_loop.py`
Replace:
- `LINKEDIN_PORT` → Your LinkedIn browser port
- `XXXXXXX` → Your job-apply scripts directory path

#### 7. `scripts/job-apply/form_answer_watcher.py`
Replace:
- `OPERATOR_LINKEDIN_ID` → Your LinkedIn username
- `YOUR_GITHUB_USERNAME` → Your GitHub username
- `XXXXXXX` → Your name
- `XXXXXXXX` → Your city

#### 8. `scripts/job-apply/start_9222.bat`
Replace:
- `LINKEDIN_PORT` → Your LinkedIn browser port
- `XXXXXXX` → Your chrome-cdp-profile directory path

#### 9. `scripts/job-apply/start_9222.ps1`
Replace:
- `LINKEDIN_PORT` → Your LinkedIn browser port
- `OPERATOR_HOME` → Your home directory
- `XXXXXXX` → Your job-apply directory path

---

### 🟡 SKILL FILES (medium priority)

#### `skills/job-applications/SKILL.md`
Replace ALL placeholders:
- `LINKEDIN_PORT`, `ATS_PORT`, `AUTOMATION_PORT` → Your browser ports
- `CHROME_PROFILE` → Your Chrome profile directory
- `OPERATOR_HOME` → Your home directory
- `OPERATOR_LINKEDIN_ID` → Your LinkedIn username
- `OPERATOR_RESUME_ATS` → Your ATS resume filename
- `TARGET_COMPANY` → Your target company (or delete)
- `EMPLOYER_1` through `EMPLOYER_6` → Your past employers
- `YOUR_GITHUB_USERNAME` → Your GitHub username
- `XXXXXXXXX` → Your expected CTC
- `XXXXXXXX` → Your city/CTC-related fields
- `portfolio.example.com` → Your portfolio URL
- `+XX XXXXXXXXXX` → Your phone
- `xxxxxxxxx@gmail.com` → Your email
- `XXXXXXX` → Your name
- All `YOUR_WHATSAPP_LID@lid` and `XXXXXXXXXXX` → Your WhatsApp channel ID and handle (or delete WhatsApp references entirely)

#### `skills/job-applications/linkedin-easy-apply/SKILL.md`
Replace:
- `LINKEDIN_PORT`, `ATS_PORT`, `CHROME_PROFILE` → Your ports/profile
- `OPERATOR_HOME` → Your home directory
- `OPERATOR_RESUME_ATS`, `OPERATOR_RESUME_FULL`, `OPERATOR_RESUME_PATH` → Your resume details
- `XXXXXXX` → Your name

#### `skills/job-applications/linkedin-cdp-driving/SKILL.md`
Replace:
- `CHROME_PROFILE`, `LINKEDIN_PORT` → Your profile/port
- `OPERATOR_RESUME_ATS` → Your ATS resume filename
- `XXXXXXX` → Your name

#### `skills/job-applications/external-ats-apply/SKILL.md`
Replace:
- `LINKEDIN_PORT`, `ATS_PORT` → Your browser ports
- `OPERATOR_RESUME_ATS`, `OPERATOR_RESUME_PATH` → Your resume details
- `XXXXXXX` → Your name

#### `skills/job-applications/job-apply-autopilot/SKILL.md`
Replace:
- `LINKEDIN_PORT`, `ATS_PORT`, `CHROME_PROFILE` → Your ports/profile
- `CRON_ID` → A unique cron job ID
- `XXXXXXX` → Your name

#### `skills/job-applications/*/references/*.md`
All reference files contain `XXXXXXX`, `OPERATOR_LINKEDIN_ID`, `YOUR_GITHUB_USERNAME`, `LINKEDIN_PORT`, `OPERATOR_RESUME_ATS`, `OPERATOR_RESUME_PATH`, `OPERATOR_HOME` placeholders. Replace with your data.

---

### 🟢 OTHER SKILLS (low priority — cosmetic placeholders)

These skills only contain `XXXXXXX` as generic references. Replace with your name where it makes sense:

- `skills/batman-protocol/SKILL.md`
- `skills/graphify/SKILL.md`
- `skills/live-video-yolo-pipeline/SKILL.md`
- `skills/windows-autostart-ops/SKILL.md`
- `skills/professional-slide-decks/SKILL.md` — also has `OPERATOR_HOME` and `LINKEDIN_PORT`
- `skills/pptx-visual-verification/references/*.md`
- `skills/public-traffic-cam-access/SKILL.md` — also has `LINKEDIN_PORT`

---

## 🔧 Chrome Setup (Required for Job Automation)

The job-automation scripts drive a live Chrome browser via CDP (Chrome DevTools Protocol). You must launch Chrome with remote debugging enabled:

### Step 1: Create a dedicated Chrome profile
```bash
# Windows
chrome.exe --remote-debugging-port=9222 --user-data-dir=C:/Users/YOURNAME/chrome-cdp-profile

# macOS
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir=/Users/YOURNAME/chrome-cdp-profile

# Linux
google-chrome --remote-debugging-port=9222 --user-data-dir=/home/YOURNAME/chrome-cdp-profile
```

### Step 2: Sign in manually
1. Open the debug Chrome
2. Go to linkedin.com and sign in
3. Go to app.greenhouse.io (or any ATS) and sign in
4. **Close Chrome** — the session persists in the profile

### Step 3: Set the port in scripts
In all `scripts/job-apply/*.cjs` files, replace `LINKEDIN_PORT` with your chosen port (e.g., `9222`).

### Step 4: Add Chrome launch flags (recommended)
```
--remote-debugging-port=9222
--user-data-dir=/path/to/profile
--hide-crash-restore-bubble
--disable-backgrounding-occluded-windows
--disable-renderer-backgrounding
--disable-background-timer-throttling
--disable-blink-features=AutomationControlled
--no-first-run
```

---

## 📁 Resume Setup

1. Create a job-apply directory: `mkdir ~/job-apply`
2. Export your ATS-friendly resume as PDF → save as `OPERATOR_RESUME_ATS.pdf` in that directory
3. Save your full resume as Markdown → `OPERATOR_RESUME_FULL.md`
4. In scripts, set `OPERATOR_RESUME_PATH` to your job-apply directory path

---

## 💰 Compensation Fields

When applying to jobs, the scripts fill compensation fields. Replace:
- `XXXXXXXX` → Your current CTC (annual, in local currency, no commas)
- `XXXXXXXXX` → Your expected CTC (annual, in local currency, no commas)

**Important:** If you're in India, CTC is typically in LPA (Lakhs Per Annum). 1 LPA = 100,000 INR.

---

## 🚀 Quick Start

```bash
# 1. Fork/clone this repo
git clone https://github.com/YOUR_GITHUB_USERNAME/hermes-alfred-skills.git hermes-agent-toolkit
cd hermes-agent-toolkit

# 2. Replace ALL placeholders (see Placeholder → Data Map above)
#    Start with applicant.profile.json — it's the most critical file.

# 3. Install skills to your Hermes Agent
cp -r skills/batman-protocol ~/.hermes/skills/
cp -r skills/job-applications ~/.hermes/skills/
# ... install other skills you want

# 4. Set up Chrome for job automation (see Chrome Setup above)

# 5. Install config template
cp config/config-template.yaml ~/.hermes/config.yaml
# then edit to taste

# 6. Test a single application
node scripts/job-apply/apply_one.cjs --job-url https://linkedin.com/jobs/view/XXXXX
```

---

## 📂 Structure

```
.
├── skills/            # Hermes Agent skills (SKILL.md + references/)
│   ├── batman-protocol/
│   ├── graphify/
│   ├── job-applications/
│   │   ├── linkedin-easy-apply/
│   │   ├── linkedin-cdp-driving/
│   │   ├── external-ats-apply/
│   │   ├── job-apply-autopilot/
│   │   └── references/
│   ├── pptx-visual-verification/
│   ├── professional-slide-decks/
│   ├── public-traffic-cam-access/
│   ├── live-video-yolo-pipeline/
│   └── windows-autostart-ops/
├── scripts/
│   └── job-apply/     # Job-application automation scripts (Node + Python)
│       ├── apply_one.cjs          → LinkedIn Easy Apply driver
│       ├── gh_batch.cjs           → Greenhouse batch applier
│       ├── autoapply_loop.py      → Self-driving apply loop
│       ├── cdp_helper.cjs         → CDP connection helper (LinkedIn port)
│       ├── cdp_helper_9223.cjs    → CDP connection helper (ATS port)
│       ├── form_answer_watcher.py → LLM-based form answerer
│       ├── start_9222.bat         → Windows Chrome launcher
│       └── start_9222.ps1         → PowerShell Chrome launcher
├── config/
│   └── config-template.yaml
└── README.md
```

---

## 🛠 Adding Your Own Skills

```bash
mkdir -p ~/.hermes/skills/your-skill-name
# Write SKILL.md (see existing skills for format)
```

Hermes Agent auto-detects skills in `~/.hermes/skills/` — no registration needed.

---

## ⚠️ Troubleshooting

| Problem | Likely Cause | Fix |
|---------|-------------|-----|
| "Connection refused" on port | Chrome not running or wrong port | Launch Chrome with `--remote-debugging-port=YOUR_PORT` |
| Forms not filling | Wrong `OPERATOR_RESUME_PATH` | Check path in `gh_batch.cjs` / `apply_one.cjs` |
| "Required" field errors | `XXXXXXX` placeholders not replaced | Grep for `XXXXXXX` in scripts and replace all |
| reCAPTCHA blocks submit | Invisible bot-score challenge | Submit manually or retry (some pass ~25% of the time) |
| LinkedIn session expired | Cookies cleared | Re-sign-in to Chrome profile, restart scripts |
| Tabs crashing browser | Too many open tabs | Close tabs after use, don't mass-close |

---

## License

MIT — fork it, use it, no warranty.
