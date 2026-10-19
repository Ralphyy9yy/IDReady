# IDReady

IDReady is a private, offline-capable ID photo maker for phones and desktop browsers. It captures or imports a photo, removes the background locally, assists with positioning, and exports exact-size photos or print-ready PDF sheets.

## Screenshots

Actual screenshots of IDReady running locally. The animated background is shown as a still image.

### Desktop

![IDReady desktop interface with camera, upload, and local processing controls](docs/images/desktop.png)

### Mobile

<img src="docs/images/mobile.png" alt="IDReady mobile interface" width="390" />

### Try the workflow

1. Take or upload a JPEG, PNG, or WebP photo.
2. Choose a photo size, remove the background, and adjust the crop.
3. Continue to Export to choose paper, copies, spacing, and an optional photo border.
4. Download a single photo or a print-ready PDF. Print the PDF at 100% / Actual size.

## Run locally

Requirements: Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

Production checks and output:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
```

Deploy the contents of `dist/` as a static site over HTTPS. Camera APIs require a secure context (HTTPS, except for localhost). A phone opening a laptop's plain `http://192.168.x.x` address should use upload instead of expecting camera access.

## What is implemented

- Camera capture with permission/error handling, front/rear preference, optional countdown, mirrored selfie preview, correctly oriented capture, retake, and upload fallback.
- JPEG/PNG/WebP signature validation, 25 MB/40 megapixel limits, browser EXIF orientation, safe object/blob handling, and metadata-free rendered exports. HEIC is deliberately rejected with a clear message.
- 1 × 1 inch, 2 × 2 inch, and generic 35 × 45 mm presets at 300 DPI.
- Drag positioning, zoom, rotation, crop guides, brightness, contrast, reset, and selectable photo borders (none, gray, black, medium, double, or white inset). Borders are drawn inside the chosen physical dimensions through the shared preview/export pipeline.
- Real on-device MediaPipe multiclass person segmentation to a white background, plus before/after review. The original is retained.
- On-device BlazeFace detection used only to suggest a starting position; zero/multiple/error cases fall back to manual positioning.
- A4 and 4R sheets, portrait/landscape, safe margins, gaps, copy count, multi-page layout, and external cutting marks.
- PNG/JPEG single-photo exports and exact-mm jsPDF output. A 2 × 2 inch photo is placed at 50.8 × 50.8 mm, and A4 is 210 × 297 mm.
- Explicit IndexedDB draft saving, draft deletion, preferences separated from photo retention, and no analytics or network photo upload.
- Installable PWA with an app-shell cache and a separate, user-triggered AI asset download/verification state. AI assets can be removed independently.

## Offline setup

1. Open the deployed HTTPS site while online.
2. Open **Offline setup** and download the AI assets (about 51 MB).
3. Wait for **Offline ready**. This is shown only after all two models and all MediaPipe WASM/loader variants are present in Cache Storage.
4. Install the app from the browser menu if desired, then test by enabling browser offline mode and reloading normally.

The app shell is versioned by Workbox. AI assets use a separate `idready-ai-v1` cache so installation is not falsely treated as AI readiness. Browser storage can be cleared or evicted; IDReady checks it again on launch. Once cached, the phone does not need the laptop to remain on.

## Architecture and important choices

UI state lives in React while unit conversion, crop rendering, validation, and sheet layout are framework-independent modules. Full-resolution rendering happens only on export; interactive preview is bounded. AI and PDF libraries are dynamically imported. Processing uses MediaPipe's CPU/WASM fallback for broad browser support and avoids any CDN at runtime; all models, loaders, and WASM binaries are under `public/`.

MediaPipe Tasks Vision and the MediaPipe model sources are Apache-2.0 licensed. The runtime package is `@mediapipe/tasks-vision`; bundled models are Google's `selfie_multiclass_256x256` and `blaze_face_short_range`. See the [MediaPipe license](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE), [web Image Segmenter guide](https://ai.google.dev/edge/mediapipe/solutions/vision/image_segmenter/web_js), and [web Face Detector guide](https://ai.google.dev/edge/mediapipe/solutions/vision/face_detector/web_js). jsPDF is MIT licensed; React, Vite, Workbox/vite-plugin-pwa, idb, and Lucide use their respective permissive licenses recorded in `package-lock.json`.

The CSP permits same-origin resources, local blobs, workers, and `wasm-unsafe-eval`, which MediaPipe's local WebAssembly loader requires. It intentionally blocks remote connections and third-party scripts.

## Printing

PDF is the authoritative physical-size output. In the print dialog, select the matching paper, choose **Actual size / 100%**, disable **Fit to page**, and select the correct media and quality.

The Epson L3210 is treated as USB-only: download the PDF, move it to a computer connected to the L3210, and print at 100%. Android USB OTG plus a third-party print app may work, but is unverified and is not part of the supported workflow.

## Tests and limitations

Unit tests cover DPI/unit conversion, crop cover geometry, exact dimensions, A4 bounds, margins/gaps, orientation, and multi-page quantity. Physical Android camera behavior, browser-specific PWA installation, storage eviction, and output from a real Epson L3210 still require device testing.

Current limitations:

- Segmentation quality depends on lighting and the bundled 256 × 256 model; fine hair and translucent edges can be imperfect. There is no manual erase/restore brush yet.
- AI inference currently executes through MediaPipe's WASM task on the UI thread. Modules are lazy and work is not repeated while sliders move, but a slower phone can briefly pause during inference. Moving inference to a dedicated worker is a future performance enhancement.
- Face positioning is an assistive starting point, not biometric or passport compliance validation. Requirements vary by authority, including whether background edits are accepted.
- Raster files do not carry guaranteed printer sizing across viewers; use PDF for physical-size printing.
- Browser Print/Share APIs cannot bypass system printer drivers or silently print.

No photo upload, backend, account, tracking, subscription, or secret frontend key is used.
