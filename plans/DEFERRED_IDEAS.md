# 💡 Media Pro — Deferred Ideas & Future Enhancements

This document logs future features, deferred optimizations, and architectural enhancements discussed for future development cycles.

---

## 📌 Deferred Idea Registry

| # | Idea / Feature Title | Target Component | Complexity | Priority | Status |
|---|---|---|---|---|---|
| **01** | **Gaming, CGI & Stylized Animation Mode for AI Face Extractor** | `backend/services/face_service.py` & `FaceExtractorModal.jsx` | Low | Medium | ⏳ **Deferred** |
| **02** | **AI Smart Character Re-Framing (9:16 Auto-Follow Shorts)** | `backend/tasks/video_tasks.py` & `CutControls.jsx` | Medium | Low | 💡 **Idea** |
| **03** | **1-Click Face Privacy Anonymizer (Dynamic Face Blurring)** | `backend/services/face_service.py` & `ffmpeg_service.py` | Low-Medium | Low | 💡 **Idea** |

---

## 🎮 Idea 01: Gaming, CGI & Stylized Animation Mode for AI Face Extractor

### 1. Problem Statement
When scanning video game footage (e.g., *Grand Theft Auto V*, *Cyberpunk 2077*, *The Witcher 3*, Unreal Engine renders, and 3D anime):
1. **Neural Confidence Score Drop**: The OpenCV YuNet neural network is trained on real human photographs (*WiderFace* dataset). Rendered 3D character rigs with digital shaders, artificial lighting, and smooth polygons typically yield detection confidence scores between **`0.30` and `0.45`**, which are discarded by the standard **`0.60` (60%)** threshold.
2. **Small Scale in 3rd-Person Camera Angles**: In open-world games, characters are frequently viewed from a distance or behind, resulting in head sizes under **`30px`** that are filtered by default `min_face_size = 40px`.
3. **Cinematic Shadows & Night Missions**: Low-light scenes, ambient occlusion, and flashlights obscure landmarks in raw frames.

### 2. Proposed Technical Architecture

```
User selects "🎮 Gaming / CGI Mode" in FaceExtractorModal
                          │
                          ▼
             Preprocessing Pipeline (Celery Worker)
                          │
       ┌──────────────────┴──────────────────┐
       ▼                                     ▼
CLAHE Contrast Boost            Multi-Scale Image Pyramid
(Levels shadow detail)          (Scales 4K/1080p to 640x360)
       │                                     │
       └──────────────────┬──────────────────┘
                          │
                          ▼
            YuNet Neural Detection
            • score_threshold = 0.32 (Calibrated for CGI)
            • nms_threshold = 0.35
            • min_face_size = 20px
                          │
                          ▼
            SFace 128D Embedding Clustering
            • similarity_threshold = 0.52 (Stylized clustering)
                          │
                          ▼
         Best-Shot Selection & Asset Generation
```

### 3. Key Components to Implement
- **UI Toggle**: In `FaceExtractorModal.jsx`, add a two-way preset switch:
  - `🎬 Real-World / Film Mode` (Threshold: 0.60, Min Size: 40px)
  - `🎮 Gaming / CGI / Animation Mode` (Threshold: 0.32, Min Size: 20px, CLAHE enabled)
- **Backend Service**: In `backend/app/services/face_service.py`, add `enable_clahe: bool = False` and `mode: str = "real" | "gaming"`.
- **Contrast Leveling**: Apply `cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8,8))` on grayscale channel when frame mean brightness $< 70$.

---

## 📱 Idea 02: AI Smart Character Re-Framing (9:16 Auto-Follow Shorts)

### 1. Concept
Automatically convert 16:9 horizontal gameplay/film clips into vertical 9:16 TikTok/YouTube Shorts by using facial tracking bounding boxes to smoothly pan and keep the primary active character centered in the frame.

### 2. Proposed Pipeline
- Calculate running centroid $(C_x, C_y)$ of the primary character across detected frames.
- Apply a Kalman Filter / Exponential Moving Average (EMA) to smooth camera panning without jarring jitter.
- Render dynamic 9:16 crop using `ffmpeg -vf crop=w:h:x:y`.

---

## 🙈 Idea 03: 1-Click Face Privacy Anonymizer (Dynamic Face Blurring)

### 1. Concept
For privacy-sensitive recordings, interviews, street vlogs, or CCTV footage, provide a 1-click **"Anonymize Faces"** action that dynamically tracks and applies Gaussian blur, pixelation mosaic, or black censor bars over all detected individuals.

---

*Last Updated: 2026-08-29*
