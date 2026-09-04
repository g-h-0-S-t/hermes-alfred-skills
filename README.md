# Hermes-Alfred Public 🦇

> Reusable Hermes Agent skills and configs — the parts that aren't personal.

This repo contains **only** the generic, reusable components from the [Hermes-Alfred](https://github.com/g-h-0-S-t/hermes-alfred) setup — no personal data, no credentials, no hardcoded PII.

## Skills

| Skill | Description |
|-------|-------------|
| `batman-protocol` | Meta-protocol for capability building |
| `graphify` | Codebase knowledge graph |
| `job-applications` | Job application automation (LinkedIn EA, Greenhouse, ATS) |
| `pptx-visual-verification` | Render + vision-verify PowerPoint decks |
| `professional-slide-decks` | Premium PPTX deck authoring |
| `public-traffic-cam-access` | CCTV safety monitoring |
| `live-video-yolo-pipeline` | Live video + YOLO object detection |
| `windows-autostart-ops` | Windows service management |

## Scripts

| Directory | Description |
|-----------|-------------|
| `scripts/job-apply/` | Job application automation scripts (LinkedIn Easy Apply, Greenhouse, external ATS) |

## Usage

1. Clone this repo
2. Copy skills to your `~/.hermes/skills/` directory
3. Copy `config/config-template.yaml` to your Hermes config and customize

```bash
# Example: install a skill
cp -r skills/batman-protocol ~/.hermes/skills/
```

## Private Components

The full Alfred setup (personal scripts, memories, job automation, etc.) lives in the private [hermes-alfred](https://github.com/g-h-0-S-t/hermes-alfred) repo — that one's just for the operator.

## License

MIT — use freely, no warranty.
