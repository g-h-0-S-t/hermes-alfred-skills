# Alfred for Hermes 🦇

> Reusable skills, scripts, and configs for [Hermes Agent](https://hermes-agent.nousresearch.com/docs) — automation that turns a generic agent into a capable, self-directing assistant.

This is a self-contained toolkit. Everything here is generic and safe to fork: no credentials, no hardcoded PII, no operator-specific state. Placeholders like `OPERATOR_NAME` and `OPERATOR_EMAIL` are yours to fill.

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
git clone https://github.com/g-h-0-S-t/hermes-alfred-skills.git alfred-for-hermes

# Install a skill
cp -r alfred-for-hermes/skills/batman-protocol ~/.hermes/skills/

# Install config template
cp alfred-for-hermes/config/config-template.yaml ~/.hermes/config.yaml
# then edit to taste
```

Each skill has its own `SKILL.md` with setup and usage.

## How It Works

Alfred-for-Hermes follows a two-layer model:

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

## License

MIT — fork it, use it, no warranty.
