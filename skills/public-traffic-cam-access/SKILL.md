---
name: public-traffic-cam-access
description: Open public traffic CCTV feeds near a location for safety.
version: 1
author: Alfred
license: MIT
metadata:
  tags: [cctv, traffic-cams, public-feeds, worldcam, trafficvision, kolkata, safety, chrome-viewer, websocket-client]
  related_skills: [public-safety-cv, batman-protocol, rf-geo-localization, osint-opsec]
---

# Public Traffic-Cam Access (verified, 2026-08-17)

Build a live "traffic CCTV around my location" safety view from PUBLIC aggregators. This is the
legitimate path the operator asked for repeatedly; LAN probes find nothing and protected/private systems
are out of scope. Verified end-to-end this session: 7 of 7 India traffic cams loaded live.

## 1. Sources that actually serve India / Kolkata / West Bengal (fetched + rendered)
- worldcam.eu/webcams/category/traffic/india -> server-side thumbnails
  (https://www.worldcam.pl/images/webcams/400x226/<id>.jpg). Real, public, legal-to-view.
- trafficvision.live (155k cams, 12k India), city-webcams.com/india/kolkata,
  weatherbug.com/traffic-cam/calcutta-west-bengal-in.

## 2. Fetch (Python stdlib)
```python
import urllib.request, re, ssl
ctx = ssl.create_default_context(); ctx.check_hostname = False; ctx.verify_mode = ssl.CERT_NONE
def get(u):
    req = urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'})
    return urllib.request.urlopen(req, timeout=15, context=ctx).read().decode('utf-8', 'ignore')
wc = get('https://worldcam.eu/webcams/category/traffic/india')
imgs = list(dict.fromkeys(re.findall(r'(https://www\.worldcam\.pl/images/webcams/[^\s"\']+?\.jpg[^\s"\']*?)', wc)))
clean = [re.sub(r'\d+x\d+/', '400x226/', u) for u in imgs][:30]
```

## 3. Viewer (self-contained HTML, refresh snapshots every 5s)
Grid of `<img>`; refresh with `img.src = url + '#' + Date.now()` (cache-bust). JPEG refresh
snapshots, NOT always live HLS/m3u8. See references/public_traffic_cams.md for full snippet.

## 4. Open in Chrome
- SIMPLEST: `python3 -m http.server 8765 --bind 127.0.0.1` in the viewer folder, then the USER
  opens http://127.0.0.1:8765/viewer.html in their visible Chrome. No CDP needed.
- CDP on a SEPARATE headless Chrome: launch with
  `--remote-debugging-port=9334 --remote-allow-origins=* --user-data-dir=<isolated>` then drive via
  websocket-client (Page.navigate + Runtime.evaluate to count loaded imgs). Verified working.

## 5. Gotchas (verified)
- The 9222 LinkedIn Chrome REJECTS scripted CDP with 403 unless launched with
  --remote-allow-origins=*. Don't fight it: use a separate headless Chrome on 9334, or relaunch
  9222 (drops LinkedIn session - user call). See the linkedin-UX memory note.
- worldcam only exposes ~6-7 India-traffic thumbnails server-side; rest are JS-paginated.
- These are near-real-time stills, not video. Fine for situational/safety awareness.
- PUBLIC / PUBLISHED FEEDS ONLY. No private default-credential cams (Insecam style), no protected
  infra (railway, cantonment, metro). That line is non-negotiable and also keeps the work legal.

## 6. Extend
- Attach the YOLO bounding-box layer from public-safety-cv once feeds are displayed.
- Cross-reference with rf-geo-localization if cam GPS is known.
- For more coverage, chain multiple aggregators (worldcam + trafficvision + city-webcams).
