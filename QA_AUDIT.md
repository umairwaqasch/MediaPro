# 🔍 Media Pro — Full System QA, Forensic Debugging & Root-Cause Audit Inventory

> **Application**: Media Pro Studio (Professional Video & Image Workstation)  
> **Host URL**: `http://localhost:8090/mediapro`  
> **API Docs**: `http://localhost:8090/mediapro/api/docs`  
> **Audit Date**: 2026-08-29  
> **Audit Status**: 🚀 **IN PROGRESS — FULL FORENSIC EXECUTION**  

---

## 1. Inventory of Testable Surfaces

### 1.1 Pages & Studio Workspaces
- **Video Studio Workspace**:
  - Main Player, Scrubbable Timeline, Filmstrip Frame Thumbnails, Audio Waveform Strip
  - Dual-Card Matrix (Card 1: Quick Operation Presets, Card 2: Interactive Parameter Configuration)
  - Multi-Cut Queue Shelf & Segment Timeline Markers
  - Floating Non-Blocking Global Progress HUD & Task Center Drawer
  - Video Asset Library Drawer & Staging Tray
- **Image Studio Workspace**:
  - Image Canvas with Dual View (Original vs Live Preview / Split-Screen Slider)
  - Interactive 8-Handle Crop Box Overlay (with 3x3 Rule-of-Thirds Grid)
  - Interactive 4-Corner Glowing Homography Pins for Document Perspective Dewarping
  - Dual-Card Matrix (Card 1: Operations Matrix, Card 2: Dynamic Tab Panels with independent scrollable bodies)
  - Image Staging Shelf & Batch Gallery Drawer

### 1.2 Modals & Dialogs
1. **`BatchProcessModal.jsx`** — Multi-video batch queue runner (9-tab operations selector, concurrency dispatch, real-time SSE progress, output ZIP bundle).
2. **`ImageBatchModal.jsx`** — Multi-image batch processor (format convert, resize, 3D LUT, AI U-2-Net cutout, watermark).
3. **`PresetManagerModal.jsx`** — Custom workflow preset & recipe manager (save, load, export, import, delete).
4. **`SettingsModal.jsx`** — 3-Column global studio preferences, hardware acceleration indicators, Image Studio defaults, export bitrate limits.
5. **`HotkeyModal.jsx`** — Professional NLE keyboard shortcuts cheatsheet.
6. **`ProgressModal.jsx`** — Dedicated single-task rendering dialog with live progress bar and cancellation.
7. **`ScreenRecorderModal.jsx`** — WebRTC screen, window, and camera recording studio with instant timeline import.
8. **`AudioMasteringModal.jsx`** — High-precision audio mastering, EBU R128 loudness targeting (-14, -16, -23 LUFS), gain, and interactive waveform canvas.
9. **`FaceExtractorModal.jsx`** — AI neural face detection (OpenCV YuNet + SFace), face clustering, best-shot ranking, and 1-click cutout gallery.
10. **`GlobalTaskDrawer.jsx`** — Slide-out persistent background task manager with status history and retry/download actions.

### 1.3 Video Processing Engines (19 Verified Subsystems)
1. **Frame-Accurate Video Cutter**: Fast stream copy (`0s` transcode) & accurate frame re-encode with continuous speed remap ($0.10x - 3.00x$).
2. **Visual Cropper & 9:16 Social Canvas**: Aspect presets (9:16, 1:1, 16:9, 4:5) with Gaussian blurred backdrop padding.
3. **Silence & Dead-Air Auto-Remover**: Real-time dB threshold scan and automated jump-cut video rendering.
4. **Target Size Compressor**: Dual-pass CRF bitrate calculator (8MB Discord, 25MB Email, 50MB Telegram).
5. **Auto Scene Detection & Splitter**: Computer vision luminance difference thresholding and batch scene extraction.
6. **2-Pass Optical Video Stabilization**: `vidstabdetect` motion vector tracking + `vidstabtransform` adaptive smoothing.
7. **Cinematic 3D LUT Color Grader**: Hollywood presets (Teal & Orange, Vintage 35mm, Cyberpunk, Golden Hour, Film Noir, Crisp Pro).
8. **Boomerang Ping-Pong Loop**: Seamless forward-reverse loop FX ($2x - 6x$).
9. **Split-Screen Studio**: Synchronized side-by-side / stacked split comparison (`hstack` / `vstack`).
10. **EBU R128 Broadcast Audio Normalizer**: Dual-pass `loudnorm` mastering with waveform timeline overlay.
11. **SMPTE Timecode & Watermark Burn-In**: Frame-counter overlay (`HH:MM:SS:FF`) and 7-position custom text/logo watermarks.
12. **Animated GIF Generator**: High-framerate looping GIF palette generator.
13. **Audio Stream Extractor**: Multi-format audio extraction (`MP3 320k`, `WAV`, `AAC`).
14. **Super-Resolution 4K/8K Rescaler**: Lanczos high-order scaling via NVENC HEVC / CPU fallback.
15. **AI Unique Face Extractor**: YuNet neural face detection & SFace cosine similarity clustering.
16. **Segment Concatenator**: Multi-clip lossless concatenation with stream copy.
17. **Multi-Cut Batch Queue**: Parallel multi-segment queue extraction with on-demand ZIP bundling.
18. **Sub-second Frame Extraction**: Lossless full-resolution PNG snapshot.
19. **Audio Waveform Analyzer**: Decibel peak & RMS distribution waveform rendering.

### 1.4 Image Studio Processing Controls (47 Verified Controls)
1. **Geometric Transforms**: Aspect crop (Free, 1:1, 9:16, 16:9, 4:5, 3:2, 2:3), custom pixel W/H with aspect lock, scale percent ($25\% - 400\%$), 90° rotation, arbitrary angle rotation ($0^\circ - 360^\circ$), horizontal/vertical flips.
2. **Color & Tone Grading**: Brightness, Contrast, Saturation, Exposure, Gamma, Color Temperature (Kelvin balance), Grayscale toggle.
3. **Cinematic 3D LUTs**: 6 LUT presets with real-time CSS canvas preview.
4. **Enhance & Blur**: Sharpen, Gaussian Blur, Box Blur, Bilateral Denoise.
5. **4-Point Perspective Dewarp**: OpenCV Canny edge corner detection, 4-point homography unwarp, paper presets (Auto, A4 Portrait/Landscape, US Letter, 1:1), scanner filters (Magic Color, Crisp B&W, Grayscale).
6. **AI Neural Vision**: U-2-Net subject cutout, white backdrop replacement, portrait bokeh blur ($1-50\text{px}$), $2\times/4\times$ neural super-resolution upscale, vintage B&W colorization, portrait skin enhancement.
7. **Artistic FX**: Vignette, 35mm film grain, pencil sketch, comic cartoon, oil painting, 8-bit pixelate, chromatic RGB glitch, duotone maps.
8. **Chroma Key & Multi-Image Compositing**: Green-screen cutout, 2x2 photo collage maker, image sequence to GIF, MP4 photo slideshow.
9. **Metadata & Privacy**: 1-Click EXIF GPS/camera data removal, 6-color dominant palette extractor, 256-bin RGB channel histogram.
10. **Watermarking & Export Formatting**: Text watermark, font size, opacity, 9-anchor positioning, JPEG/PNG/WebP format convert, compression quality slider ($1-100\%$), web optimization toggle.

### 1.5 API Endpoints (30+ Endpoints)
- System: `/health`, `/system/hardware`, `/system/telemetry`
- Media & Library: `/videos/upload`, `/library/all`, `/media/download-zip`, `/videos/{id}/thumbnails`, `/videos/{id}/waveform`, `/videos/{id}/snapshot`, delete/clear
- Video Operations: `/videos/{id}/cut`, `/crop`, `/text`, `/silence/detect`, `/silence/jumpcut`, `/compress`, `/scenes/detect`, `/stabilize`, `/loudness/normalize`, `/boomerang`, `/splitscreen`, `/colorgrade`, `/rescale`, `/extract-faces`
- Batch Processing: `/batch/process`, `/batch/status`, `/tasks/{id}/cancel`
- Image Operations: `/image/upload`, `/image/library/all`, `/image/{id}/process`, `/image/{id}/perspective/detect`, `/image/{id}/perspective/crop`, `/image/{id}/ai`, `/image/batch/process`, `/image/batch/status`, `/image/collage`, `/image/gif`, `/image/slideshow`, `/image/exif/strip/{id}`, `/image/palette/{id}`, `/image/histogram/{id}`
- Presets: `/presets` (GET, POST, DELETE)

### 1.6 Infrastructure & Data Layers
- Redis broker & task state store (`mediapro-redis:6379`)
- Celery distributed worker (`mediapro-worker`)
- NGINX Reverse Proxy & SPA Server (`mediapro-proxy:8090`)
- FastAPI ASGI backend (`mediapro-api:8000`)
- Bind mounts (`./data/*`)
