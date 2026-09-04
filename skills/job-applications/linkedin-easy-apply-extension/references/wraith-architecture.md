# XXXXXXX Engage MV3 blueprint (extracted XXXXXXX-15 from YOUR_GITHUB_USERNAME/XXXXXXX-marketing-plugin)

Proven Chrome extension structure to reuse for the LinkedIn EA extension.

## manifest.json (MV3)
```json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "scripting", "storage", "tabs", "alarms"],
  "host_permissions": ["*://*.linkedin.com/*", "*://*.facebook.com/*", "http://localhost:11434/*", "https://api.kilo.ai/*"],
  "background": { "service_worker": "background.js", "type": "module" },
  "content_scripts": null,
  "action": { "default_icon": { "16":"icons/icon16.png","48":"icons/icon48.png","128":"icons/icon128.png" } }
}
```
Note: XXXXXXX injects its content script via `background.js` using `chrome.scripting.executeScript` (not a static `content_scripts` entry), keyed off tab URL. For a LinkedIn-only tool you can use a static `content_scripts` match on `*.linkedin.com/*` instead — simpler.

## background.js
- ES module, no DOM access.
- Holds `globalState` (aiProvider, dailyLimit, sessionCap, selectedKiloModel, kiloModelsUrl=`https://api.kilo.ai/api/gateway/models`).
- Per-tab state in a `tabStates` Map, persisted to `chrome.storage.session` (survives service-worker sleep).
- AI brain = `core/ai.js` `AIProvider` with `_kiloGenerate(prompt)`: POST `kiloModelsUrl` origin + `/api/gateway/chat/completions`, body `{model, messages:[{role:'user',content:prompt}], temperature, max_tokens}`, response `data.choices[0].message.content`.

## content/main.js
- Class `XXXXXXXCore`: `detectPlatform()` by `window.location.hostname`; `loadAdapter(platform)` (adapters/linkedin.js etc.); `Scanner`, `Injector`, `DashboardUI`.
- Injects panel into a Shadow-DOM container: `const c=document.createElement('div'); c.id='XXXXXXX-engage-root'; document.body.appendChild(c);` then `new DashboardUI(c)`.
- `bindEvents()` wires panel buttons to scan/apply.

## content/dashboard.js
- Floating panel UI. Icons via `chrome.runtime.getURL('icons/icon48.png')`. FAB + scan/stop/check/times SVGs. Live activity log per tab.

## adapters/linkedin.js
- Platform-specific selectors + post-targeting. For EA, extend it to: scan jobs list for Easy Apply, open the modal, and fill fields (port the universal engine from the user-owned `linkedin-easy-apply` skill's scanner/decide/applyScript).

## Reuse for EA extension
1. Copy `manifest.json` shape; restrict host to linkedin.com; add `storage` + `fileSystem` (for resume upload) as needed.
2. Port `core/ai.js` Kilo call verbatim (it already hits the free gateway, no key).
3. Build `content/linkedin-ea.js` = XXXXXXXCore minus the posting logic, plus the EA scan+fill engine. Panel = upload resume + "Apply to matching jobs" + live status log.
