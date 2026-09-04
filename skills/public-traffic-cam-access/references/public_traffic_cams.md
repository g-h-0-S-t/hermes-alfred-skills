# Public traffic-cam access (verified 2026-08-17)

## Fetch live India / Kolkata traffic-cam thumbnails (Python, stdlib + websocket-client)
```python
import urllib.request, re, ssl, json, time, base64, websocket

ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
def get(u):
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=15, context=ctx).read().decode('utf-8', 'ignore')

# Pull India traffic cam image URLs from worldcam (real, public, legal-to-view)
wc = get('https://worldcam.eu/webcams/category/traffic/india')
imgs = list(dict.fromkeys(re.findall(r'(https://www\.worldcam\.pl/images/webcams/[^\s"\']+?\.jpg[^\s"\']*?)', wc)))
# prefer 400x226 variant
clean = [re.sub(r'\d+x\d+/', '400x226/', u) for u in imgs][:30]
```

## Build a self-contained HTML viewer (refresh snapshots)
- Grid of `<img src=URL>`. Refresh with `img.src = url + '#' + Date.now()` every 5000ms.
- Serve folder: `python3 -m http.server 8765 --bind 127.0.0.1` then open http://127.0.0.1:8765/<file>.html
- This actually worked: 7 of 7 India traffic cams loaded (vision-verified real road/street footage).

## Open / verify in Chrome via CDP (separate headless instance on 9334)
```python
import json, urllib.request, websocket
tabs = json.loads(urllib.request.urlopen('http://127.0.0.1:9334/json').read())  # chrome launched with --remote-allow-origins=*
page = [t for t in tabs if t.get('type') == 'page'][0]
ws = websocket.create_connection(page['webSocketDebuggerUrl'], timeout=15)
def send(d):
    ws.send(json.dumps(d))
    for _ in range(30):
        m = json.loads(ws.recv())
        if m.get('id') == d.get('id'):
            return m
send({'id': 1, 'method': 'Page.navigate', 'params': {'url': 'file:///C:/path/viewer.html'}})
time.sleep(6)
r = send({'id': 2, 'method': 'Runtime.evaluate', 'params': {'expression': 'document.querySelectorAll("img").length'}})
print(r['result']['result']['value'])
ws.close()
```
Launch that Chrome with: --headless=new --remote-debugging-port=9334 --remote-allow-origins=* --user-data-dir=<isolated> --no-first-run

## Gotchas
- 9222 LinkedIn Chrome rejects CDP with 403 unless launched with --remote-allow-origins=*. Use a
  separate headless Chrome on 9334 for render/verify, or relaunch 9222 (drops LinkedIn session).
- worldcam server-side only exposes about 6 to 7 India-traffic thumbnails; rest are JS-paginated.
- Images are refresh-snapshots, not live video; treat as near-real-time stills.
- Public / published feeds only. No private default-cred or protected-infra cams.
