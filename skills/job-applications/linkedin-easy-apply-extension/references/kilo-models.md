# Kilo free gateway — working models + endpoint (verified XXXXXXX-15)

## Endpoint (open, no API key)
`POST https://api.kilo.ai/api/gateway/chat/completions`

Body (OpenAI-compatible chat shape):
```json
{ "model": "<id>", "messages": [{"role":"user","content":"..."}], "temperature": 0.2, "max_tokens": 1024 }
```
Response: `data.choices[0].message.content` (string). Extract first `{...}` JSON object anywhere — models may wrap in markdown or emit prose.

List models (no auth): `GET https://api.kilo.ai/api/gateway/models` — returns ~360 entries; `:free` ones are open.

## Recommended models (NO sign-in, free tier)
- **Text / classification / drafting**: `nvidia/nemotron-3.5-lightning:free`
  - Live check XXXXXXX-15: HTTP 200, ~0.7s, clean JSON. (Non-free `nvidia/nemotron-3.5-lightning` → 401 PAID_MODEL_AUTH_REQUIRED.)
- **Vision** (accepts `image_url` in `messages[].content` array): `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free`
  - This is the "omni" = vision+text model. Live check XXXXXXX-15: sent a 1x1 red PNG, got `{"color":"red"}` in ~3s. Screenshots a form control and returns `{"choice":"<option>"}` correctly.
- Other free vision-capable options seen: `nvidia/nemotron-3-ultra-550b-a55b:free`, `nvidia/nemotron-3-super-120b-a12b:free`.

## Gotchas
- Append `:free` to any model id that needs sign-in (e.g. `minimax/minimax-m3` → 401; `tencent/hy3:free` → 200).
- Hard timeout the call (text 8-15s, vision 15-25s). The `:free` tier rate-limits and may abort under concurrency → field becomes a needs-review gap, never a corruption.
- This mirrors the XXXXXXX Engage `core/ai.js` `_kiloGenerate` shape (model + messages, chat/completions URL derived from `kiloModelsUrl` origin).
