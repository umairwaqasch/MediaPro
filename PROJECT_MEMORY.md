# 🧠 Media Pro — Project Memory

> **Application**: Media Pro Studio (Professional Video & Image Workstation)  
> **Host URL**: `http://localhost:8090/mediapro`  
> **API Docs**: `http://localhost:8090/mediapro/api/docs`  
> **Compose Stack**: `mediapro` (`mediapro-proxy`, `mediapro-api`, `mediapro-worker`, `mediapro-redis`)  
> **Network**: `mediapro-net` (internal bridge)  

---

## 1. System Topology & Architecture

```
Browser / Frontend Client
         │
         │  Port 8090 (Host)
         ▼
  mediapro-proxy  (Nginx Alpine + Vite Production Bundle)
         │
         ├─── /mediapro/api/ ────────▶ mediapro-api  (FastAPI :8000)
         │                                   │
         │                                   └── Enqueue Task ──▶ mediapro-redis  (Redis 7 :6379)
         │                                                               │
         │                                                       Consume Task
         │                                                               ▼
         │                                                       mediapro-worker  (Celery + FFmpeg + rembg)
         │                                                               │
         └─── /mediapro/ ────────────▶ React SPA Static Assets           │
                                             │                           ▼
                                             └─────────────── Bind Mounts: ./data/*
                                                               ├── ./data/uploads/
                                                               ├── ./data/outputs/
                                                               ├── ./data/thumbnails/
                                                               ├── ./data/image_uploads/
                                                               ├── ./data/image_outputs/
                                                               └── ./data/image_thumbnails/
```

---

## 2. Directory Layout & Layer Responsibilities

```text
backend/app/
+-- api/v1/
|   +-- api.py            <- Top-level router aggregator
|   +-- system.py         <- /health, /system/hardware, /system/telemetry
|   +-- media.py          <- /upload, /library/all, /download-zip, delete/clear
|   +-- video.py          <- Video processing routes (cut, crop, gif, stabilize, silence, scenes, faces)
|   +-- image.py          <- Image processing routes (upload, process, batch, exif, AI)
|   +-- batch.py          <- Batch process dispatch & status polling
|   +-- presets.py        <- Custom recipe & preset management
+-- schemas/              <- Pydantic validation models (video, image, batch, audio, preset, common)
+-- middleware/
|   +-- error_handler.py  <- RFC 7807 global exception handler
|   +-- request_logger.py <- Structured audit logger & latency tracker
+-- services/             <- Business logic & execution layer
|   +-- ffmpeg_service.py <- Core FFmpeg command builder (GPU NVENC + CPU fallback)
|   +-- image_service.py  <- Pillow/OpenCV image processing pipeline
|   +-- face_service.py   <- YuNet + SFace neural face extraction & clustering
|   +-- audio_service.py  <- EBU R128 loudness & waveform generation
|   +-- perspective_service.py <- 4-point homography & document dewarping
|   +-- ai_service.py     <- U-2-Net background removal & deep learning tools
|   +-- storage.py / image_storage.py <- File storage, disk reclamation & probing
+-- tasks/                <- Celery asynchronous worker tasks
|   +-- video_tasks.py    <- Long-running video renders
|   +-- image_tasks.py    <- Image batch pipelines
|   +-- face_tasks.py     <- Async face detection & clustering
+-- celery_app.py         <- Celery instance & broker configuration
+-- config.py             <- Environment & path configuration
+-- main.py               <- 53-line clean FastAPI entrypoint (NO DIRECT ROUTES HERE)
```

```text
frontend/src/
+-- components/
|   +-- AudioMastering/   <- AudioMasteringModal, AudioWaveformCanvas
|   +-- FaceExtractor/    <- FaceExtractorModal (AI unique face gallery)
|   +-- ImageStudio/      <- ImageStudio, ImageCanvas, ImageToolsMatrix, ImageBatchGallery, ImageBatchModal
|   +-- Toast/            <- ToastContainer, ToastItem
|   +-- CutControls.jsx   <- Multi-cut queue, timeline trimming, action triggers
|   +-- Timeline.jsx      <- Interactive scrubbable frame timeline
|   +-- VideoPlayer.jsx   <- HTML5 video player with custom controls
|   +-- VideoLibrary.jsx  <- Video & output clip manager
|   +-- BatchProcessModal.jsx <- Multi-video batch queue runner
|   +-- GlobalProgressHUD.jsx <- Floating non-blocking progress tracker
|   +-- GlobalTaskDrawer.jsx  <- Task history & drawer
|   +-- PresetManagerModal.jsx <- Preset save/load manager
|   +-- HotkeyModal.jsx   <- Keyboard shortcuts reference
|   +-- SettingsModal.jsx <- Global preferences & image studio settings
+-- context/
|   +-- ToastContext.jsx  <- Global toast notifications
|   +-- TaskContext.jsx   <- Global task & progress state
+-- hooks/
|   +-- useHistoryStack.js <- Undo / Redo history engine
|   +-- useKeyboardShortcuts.js <- Global keyboard listener
```

---

## 3. Data Flow & Contract Standards

1. **Storage Isolation**:
   - Host bind-mount: `./data/` -> Container `/data/`
   - Uploads go to `/data/uploads/` or `/data/image_uploads/`.
   - Processed outputs go to `/data/outputs/` or `/data/image_outputs/`.
   - Thumbnails go to `/data/thumbnails/` or `/data/image_thumbnails/`.
2. **Asynchronous Background Processing**:
   - Short/instant operations (metadata probes, EXIF) return immediately via FastAPI.
   - Long-running operations (video encode, batch image, AI neural tasks, face clustering) dispatch to Celery via Redis and return a `task_id`.
   - Clients poll `POST /mediapro/api/batch/status` or `POST /mediapro/api/image/batch/status`.
3. **Hardware Acceleration**:
   - NVIDIA GPU (`h264_nvenc`, `hevc_nvenc`) is auto-detected via probe and used with automatic CPU (`libx264`) fallback.
4. **Theme Engine**:
   - Full dark/light dual-theme support via Tailwind CSS `dark:` variant classes synchronized with top navbar theme state.

---

## 4. Hardware Acceleration & Performance Benchmarks

- **GPU**: NVIDIA GeForce RTX 3050 Laptop GPU (CUDA Enabled)
- **Active NVENC Encoders**:
  - `h264_nvenc` — Hardware H.264 encoder (`p4` low-latency preset)
  - `hevc_nvenc` — Hardware H.265/HEVC encoder
- **Transparent CPU Fallback**: `libx264`, `libx265`, `libvpx-vp9`, `prores_ks`
- **Silence Detection**: FFmpeg CPU PCM stream filter

### Encoding Speeds Reference
| Operation | Realtime Speed |
| :--- | :--- |
| **Accurate Cut & Speed Remap** | ~27x – 45x realtime |
| **4K Lanczos Upscaling (NVENC HEVC)** | ~18x – 30x realtime |
| **2-Pass Optical Stabilization** | ~8x – 12x realtime |
| **Boomerang Ping-Pong Render** | ~9x – 14x realtime |
| **Scene CV Detection Scan** | ~200x – 300x realtime |
| **EBU R128 Audio Normalization** | ~40x – 80x realtime |
| **3D LUT Color Grading** | ~20x – 35x realtime |
| **AI Neural Subject Cutout** | `< 0.5s` per 1080p image |
| **4-Point Perspective Dewarping** | `< 0.05s` corner homography unwarp |

---

## 5. Comprehensive API Endpoint Reference

| Endpoint | Method | Role / Action |
| :--- | :--- | :--- |
| `/mediapro/api/health` | `GET` | System health check probe |
| `/mediapro/api/system/hardware` | `GET` | GPU & hardware acceleration telemetry |
| `/mediapro/api/system/telemetry` | `GET` | CPU, RAM, and disk utilization |
| `/mediapro/api/videos/upload` | `POST` | Upload and probe source video |
| `/mediapro/api/library/all` | `GET` | Get all indexed video uploads and rendered outputs |
| `/mediapro/api/media/download-zip` | `GET` | Download multi-output ZIP archive |
| `/mediapro/api/videos/{id}/thumbnails` | `GET` | Generate visual filmstrip timeline thumbnails |
| `/mediapro/api/videos/{id}/waveform` | `GET` | Generate audio waveform PNG |
| `/mediapro/api/videos/{id}/snapshot` | `GET` | Frame-accurate lossless PNG snapshot |
| `/mediapro/api/videos/{id}/cut` | `POST` | Frame-accurate cut with fast stream copy or NVENC re-encode |
| `/mediapro/api/videos/{id}/crop` | `POST` | 9:16 social canvas crop with blurred backdrop |
| `/mediapro/api/videos/{id}/text` | `POST` | SMPTE timecode and watermark text/logo overlay |
| `/mediapro/api/videos/{id}/silence/detect` | `POST` | Detect dead-air silence intervals at threshold |
| `/mediapro/api/videos/{id}/silence/jumpcut` | `POST` | Render auto jump-cut video removing dead-air |
| `/mediapro/api/videos/{id}/compress` | `POST` | Target file size compressor (CRF dual-pass) |
| `/mediapro/api/videos/{id}/scenes/detect` | `POST` | Visual scene boundary transition detection |
| `/mediapro/api/videos/{id}/stabilize` | `POST` | 2-Pass optical camera gyroscope stabilization |
| `/mediapro/api/videos/{id}/loudness/normalize` | `POST` | EBU R128 broadcast loudness mastering |
| `/mediapro/api/videos/{id}/boomerang` | `POST` | Seamless ping-pong forward-reverse loop |
| `/mediapro/api/videos/{id}/splitscreen` | `POST` | Multi-angle split-screen grid video (hstack/vstack) |
| `/mediapro/api/videos/{id}/colorgrade` | `POST` | Cinematic 3D LUT Hollywood color grade |
| `/mediapro/api/videos/{id}/rescale` | `POST` | Super-resolution 4K/8K upscale |
| `/mediapro/api/videos/{id}/extract-faces` | `POST` | AI unique face extractor & neural clustering |
| `/mediapro/api/batch/process` | `POST` | Multi-video parallel batch dispatch |
| `/mediapro/api/batch/status` | `POST` | Batch task consolidation & status polling |
| `/mediapro/api/image/upload` | `POST` | Image upload & probe metadata |
| `/mediapro/api/image/library/all` | `GET` | Get all indexed image library items |
| `/mediapro/api/image/{id}/process` | `POST` | Parametric crop, scale, LUT, watermark, filters |
| `/mediapro/api/image/{id}/perspective/detect` | `POST` | Auto-detect 4-corner document coordinates |
| `/mediapro/api/image/{id}/perspective/crop` | `POST` | 4-Point homography unwarp with scanner filters |
| `/mediapro/api/image/{id}/ai` | `POST` | Neural subject cutout, blur bokeh, upscale, colorize |
| `/mediapro/api/image/batch/process` | `POST` | Multi-image batch transformation pipeline |
| `/mediapro/api/image/exif/strip/{id}` | `POST` | 1-Click EXIF GPS/camera metadata stripper |
| `/mediapro/api/image/palette/{id}` | `GET` | 6-color dominant hex palette extraction |
| `/mediapro/api/image/histogram/{id}` | `GET` | 256-bin RGB channel histogram |
| `/mediapro/api/presets` | `GET`/`POST` | Custom workflow preset management |

---

## 6. Pro NLE Keyboard Shortcuts

| Key | Action | Scope |
| :--- | :--- | :--- |
| `Space` | Play / Pause video playback | Player |
| `I` | Mark In-point (Selection Start) | Timeline |
| `O` | Mark Out-point (Selection End) | Timeline |
| `X` | Clear In/Out selection range (Reset to full file) | Timeline |
| `←` / `→` | Step backward / forward by 1 frame | Timeline |
| `Shift + ←` / `Shift + →` | Step backward / forward by 1 second | Timeline |
| `J` / `K` / `L` | Shuttle Jog: Rewind 2x / Pause / Fast-Forward 2x | Player |
| `M` | Toggle Mute / Unmute audio | Player |
| `F` | Toggle Fullscreen video player | Player |
| `Ctrl + Z` / `Ctrl + Y` | Undo / Redo timeline edits | Global |
| `?` | Open Keyboard Shortcuts Cheatsheet | Global |

---

## 7. Batch Processing Verification Matrix

```
POST /batch/process  [video_ids[], operation, params]
    ├──▶ Celery: dispatch N tasks (one per file)
    ├──▶ SSE stream: real-time per-task progress events
    └──▶ POST /batch/status: consolidated status polling
```

| # | Batch Operation | Endpoint Op | Output File Pattern |
| :--- | :--- | :--- | :--- |
| 1 | **4K/8K Super-Resolution** | `rescale` | `*_rescaled_1280x720.mp4` |
| 2 | **Social 9:16 Blurred Canvas** | `crop` | `*_crop_9x16.mp4` |
| 3 | **Target File Size Compressor** | `compress` | `*_compressed_5MB.mp4` |
| 4 | **EBU R128 Loudness Normalizer** | `normalize` | `*_norm_youtube_spotify.mp4` |
| 5 | **Hollywood 3D LUT Color Grade** | `colorgrade` | `*_graded_teal_orange.mp4` |
| 6 | **Watermark & Timecode Burn-In** | `burn_in` | `*_burnin.mp4` |
| 7 | **Audio Stream Extractor** | `audio` | `*_extracted.mp3` |
| 8 | **Animated GIF Generator** | `gif` | `*_animated.gif` |
| 9 | **2-Pass Optical Stabilization** | `stabilize` | `*_stabilized.mp4` |
| 10| **Batch WebP Image Convert** | `batch/process` | `*_batch.webp` |
| 11| **Batch AI Product Cutout** | `batch/ai` | `*_ai_cutout.png` |
