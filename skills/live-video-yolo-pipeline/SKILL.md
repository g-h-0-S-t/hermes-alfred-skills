---
name: live-video-yolo-pipeline
description: Build a working in-browser live-video + YOLO viewer.
version: 1
author: Hermes Agent
license: MIT
metadata:
  tags: [yolo, live-video, cctv, mjpeg, opencv, websocket, browser-detection, same-origin, XXXXXXX, computer-vision]
  related_skills: [public-safety-cv, batman-protocol, ai-integration-skills]
---

# Live Video + YOLO Pipeline (verified working, XXXXXXX)

How to get a browser viewer that plays LIVE video and draws YOLO bounding boxes on it — the part
that usually fails (HLS stalls, cross-origin canvas taint, YouTube can't be unwrapped for pixels).
The working pattern below was proven end-to-end: live source -> MJPEG restream -> <img> in browser
-> canvas -> WebSocket YOLO engine -> boxes drawn. ~7fps, engine active, real boxes returned.

## Why the obvious paths FAIL (so you skip them)
- **HLS `<video>` (YouTube-Live / .m3u8)**: manifest never parses in-browser, or yt-dlp DASH
  extraction now needs a JS runtime; cross-origin iframe pixels are unreadable for YOLO. Dead end.
- **Fragmented MP4 over HTTP (`ffmpeg -listen 1`)**: movflags syntax errors; Chrome rejects. Dead end.
- **crossOrigin='anonymous' on <img> + canvas.toDataURL**: taints the canvas -> SecurityError. Dead end.
- **Custom JS multipart-MJPEG parser**: fragile, frames don't paint. Dead end.
- **Public traffic cams (XXXXXXX/XXXXXXX)**: no open RTSP/HLS published; only still-image refreshers or
  YouTube-Live wrappers. You cannot "get the cam's direct stream" if it isn't published.

## THE WORKING PATTERN (verified)
1. **Restream the source as MJPEG, same origin as the viewer.**
   - Python `http.server.BaseHTTPRequestHandler` on ONE port. Routes:
     - `/viewer` -> serves the HTML/JS viewer.
     - `/stream` -> `Content-Type: multipart/x-mixed-replace; boundary=Hermes Agent`, then loop:
       `cv2.VideoCapture(SRC)` -> resize to 640w -> `cv2.imencode('.jpg', q=70)` -> body
       `"--Hermes Agent\r\nContent-Type: image/jpeg\r\nContent-Length: N\r\n\r\n<bytes>\r\n"`.
   - SAME ORIGIN (both on, say, 127.0.0.1:8091) is the critical rule: the viewer's canvas is then
     NOT tainted, so `canvas.toDataURL()` works for detection. Separate ports = CORS = pixel-read blocked.
2. **Viewer plays MJPEG natively via `<img src="/stream">`** (no JS parser needed).
3. **rAF loop**: draw `<img>` to a hidden canvas -> `ws.send({image: canvas.toDataURL('image/jpeg',0.6)})`
   to the YOLO engine (throttle ~150ms).
4. **YOLO engine**: FastAPI WebSocket `/ws/detect` receives base64, runs
   `model.track(img, persist=True, tracker="botsort.yaml", conf=0.25, imgsz=640)`, returns
   `detections:[{type, confidence, trackerId, attributes, bbox:{x,y,w,h}}]`.
5. **Overlay canvas** draws returned boxes (green stroke + label) over the `<img>`/video.
6. **Dark/light toggle** + tile.onclick -> fullscreen with the same live YOLO.

## Reference implementation
the user's repo `your-github-username/XXXXXXX--AI-Projects` is the full reference: React/Vite dashboard, Node Express
rules engine, Python FastAPI YOLOv11+BotSORT WebSocket engine (`onvif.js` discovers RTSP/ONVIF cams).
Reuse its `server.py` + `useDetection.js` loop. Change its default port 8000 (often taken / Windows
WinError 10013) to 8011 and update the WS URL.

## Sanity check the engine (no browser needed)
```
async with websockets.connect("ws://127.0.0.1:8011/ws/detect") as ws:
    ws.send(json.dumps({"image":"data:image/jpeg;base64,"+b64}))
    d = json.loads(await ws.recv())   # d['detections'] = [...]
```
YOLO on an abstract human-blob may misclassify (e.g. 'toilet') but STILL returns a valid box. Real
person/car frames get correct classes. A nature/animation stream (e.g. Big Buck Bunny) has no COCO
objects -> no boxes show; that is CORRECT, not a bug. Point at a stream with people/vehicles to see boxes.

## Gotchas
- SAME ORIGIN for viewer + stream, or the canvas taints and detection is impossible.
- Port 8000 is commonly blocked; use 8011 (or similar).
- YOLOv11n + BotSORT pre-warm takes ~10-15s on first boot (downloads weights + `lap`).
- For authorized cams: feed `rtsp://...` (or ONVIF-discovered URL) straight into `cv2.VideoCapture(SRC)`.
- This is the detection half. Authorship/authorization of the camera source is a separate gate (see
  `public-safety-cv` / `batman-protocol` for that framing).

## Setup

Browser-based live video + YOLO object detection.

**Personal data needed:** None (generic skill).

**Dependencies:**
- Python 3.11+
- `opencv-python`
- `ultralytics` (YOLO)
- Browser with webcam access

**Placeholders used:** None.
