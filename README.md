# Hermes Agent Toolkit 🦇

> Reusable skills, scripts, and configs for [Hermes Agent](https://hermes-agent.nousresearch.com/docs) — automation that turns a generic agent into a capable, self-directing assistant.

This is a self-contained toolkit. Everything here is generic and safe to fork: no credentials, no hardcoded PII, no operator-specific state. Placeholders like `XXXXXXX` and `XXXXXXX` are yours to fill.

## What's Inside

### Skills

| Skill | Description |
|-------|-------------|
| `batman-protocol` | Meta-protocol for structured capability building |
| `graphify` | Codebase knowledge-graph construction and querying |
| `job-applications` | Job-application automation (LinkedIn Easy Apply, Greenhouse, external ATS) |
| `pptx-visual-verification` | Render PPTX → PNG and vision-verify before shipping |
| `professional-slide-decks` | Premium editable PowerPoint deck authoring |
| `public-traffic-cam-access` | Open CCTV feeds for public-safety monitoring |
| `live-video-yolo-pipeline` | Browser-based live video + YOLO object detection |
| `windows-autostart-ops` | Windows service and startup management |

### Scripts

| Directory | Description |
|-----------|-------------|
| `scripts/job-apply/` | LinkedIn Easy Apply, Greenhouse, and external ATS automation (Node + Python) |

### Config

| File | Description |
|------|-------------|
| `config/config-template.yaml` | Hermes config template with common customizations |

## Quick Start

```bash
# Clone
git clone https://github.com/XXXXXXX/hermes-Hermes-Agent-skills.git Hermes-Agent-for-hermes

# Install a skill
cp -r Hermes-Agent-for-hermes/skills/batman-protocol ~/.hermes/skills/

# Install config template
cp Hermes-Agent-for-hermes/config/config-template.yaml ~/.hermes/config.yaml
# then edit to taste
```

Each skill has its own `SKILL.md` with setup and usage.

## How It Works

Hermes-Agent-for-Hermes follows a two-layer model:

1. **Skills** — procedural memory loaded by Hermes for specific task types (form filling, browser automation, deck authoring, etc.).
2. **Scripts** — standalone automation (job applications, health checks, session persistence) run via cron or on demand.

The `job-apply/` scripts use raw CDP (Chrome DevTools Protocol) over a debugging port to drive a live browser for form filling. They pair with the `job-applications` skill, which encodes the per-site tactics (field matchers, reCAPTCHA handling, React-select quirks).

## Adding Your Own

This repo is meant to be forked and extended. To add a skill:

```bash
mkdir -p ~/.hermes/skills/your-skill-name
# write SKILL.md (see existing skills for format)
```

To add a script:

```bash
# Drop it in scripts/ and wire a cron if it needs to run on schedule
```

## Structure

```
.
├── skills/            # Hermes Agent skills (SKILL.md + references/)
│   ├── batman-protocol/
│   ├── graphify/
│   ├── job-applications/
│   │   ├── linkedin-easy-apply/
│   │   ├── linkedin-cdp-driving/
│   │   ├── external-ats-apply/
│   │   └── job-apply-autopilot/
│   ├── pptx-visual-verification/
│   ├── professional-slide-decks/
│   ├── public-traffic-cam-access/
│   ├── live-video-yolo-pipeline/
│   └── windows-autostart-ops/
├── scripts/
│   └── job-apply/     # Job-application automation scripts
├── config/
│   └── config-template.yaml
└── README.md
```

## Placeholder Guide

This repo contains `XXXXXXX` placeholders wherever operator-specific data was scrubbed. To use these tools:

1. **Job-application scripts/skill**: Replace `XXXXXX` / `XXXXXXXXXX` / `XXXXXXXX` placeholders in:
   - `scripts/job-apply/*.cjs` — browser ports, resume paths, profile data
   - `skills/job-applications/SKILL.md` — operator profile, compensation, location
   - `skills/job-applications/linkedin-easy-apply/scripts/applicant.profile.json` — your full name, email, phone, experience, education, skills
   
2. **Set up a dedicated Chrome profile** for LinkedIn/ATS automation:
   ```bash
   # Launch Chrome with remote debugging and a custom profile dir
   chrome.exe --remote-debugging-port=LINKEDIN_PORT --user-data-dir=/path/to/your/chrome-profile
   ```
   Sign in to LinkedIn/Greenhouse manually once; the scripts reuse that session.

3. **Resume file**: Export your ATS-friendly resume as PDF and place it where the scripts expect (default path placeholder is `XXXXXXX`).

4. **Update compensation fields**: In the skill docs and answer scripts, replace `XX LPA` / `XXXXXXXX` with your own current/expected CTC.

5. **Browser ports**: Change `LINKEDIN_PORT`, `ATS_PORT`, `AUTOMATION_PORT` to match your setup.

6. **Git remote**: Update the clone URL in the Quick Start section to your fork.

The `applicant.profile.json` file is the single most important file to customize — it contains the structured profile the job-automation pipeline reads when filling forms.

## License

MIT — fork it, use it, no warranty.
