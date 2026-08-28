# Plan 08 - AI Unique Face Extractor & Best-Shot Gallery Studio

> Status: QUEUED (On Hold - Discussion in Progress)
> Priority: HIGH
> Type: Full-Stack (OpenCV AI Detection + Neural Embedding Clustering + Quality Scoring + UI Gallery)
> Last Updated: 2026-08-28

---

## 1. Executive Summary & Objective

Automatically scan any video in Media Pro to detect human faces, cluster multiple appearances of the same person using neural facial identity embeddings (de-duplication), and select the single sharpest, most frontal, high-resolution **"Best-Shot"** photograph for every unique individual.

Users can view an interactive gallery of unique people, click any appearance timestamp to jump the video player to that scene, download individual or zipped headshots, or send them directly into the **Image Studio** for 1-click **AI Background Removal**, **E-Commerce White Backdrop**, or **AI Enhancing**.

---

## 2. Technical Architecture & Algorithm Flow

`
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                        AI UNIQUE FACE EXTRACTION PIPELINE                               │
│                                                                                         │
│   ┌───────────────────────┐                                                             │
│   │ Video Input Stream    │ (e.g. 5-minute interview, conference, or film footage)      │
│   └──────────┬────────────┘                                                             │
│              │ Sampling: 1–2 keyframes/sec (processes 5-minute video in ~5–8 seconds)   │
│              ▼                                                                          │
│   ┌───────────────────────┐                                                             │
│   │ Fast Face Detection   │ OpenCV YuNet detector locates bounding boxes + 5 landmarks  │
│   └──────────┬────────────┘                                                             │
│              │                                                                          │
│              ▼                                                                          │
│   ┌───────────────────────┐                                                             │
│   │ Quality Scoring Engine│ Multi-Factor Evaluation (0 - 100 Score per face):           │
│   │                       │ 1. Sharpness: Laplacian variance (no motion blur)           │
│   │                       │ 2. Frontality: Landmark symmetry & gaze alignment           │
│   │                       │ 3. Resolution: Face pixel height & closeness to lens        │
│   │                       │ 4. Illumination: Rejects harsh shadows / overexposure       │
│   │                       │ 5. Eye-Openness: Penalizes mid-blink frames                 │
│   └──────────┬────────────┘                                                             │
│              │                                                                          │
│              ▼                                                                          │
│   ┌───────────────────────┐                                                             │
│   │ Feature Clustering    │ Generates SFace 128D identity vectors + Cosine Similarity   │
│   │ (De-duplication)      │ Groups all appearances of Person A, Person B, etc.          │
│   └──────────┬────────────┘                                                             │
│              │                                                                          │
│              ▼                                                                          │
│   ┌───────────────────────┐                                                             │
│   │ Best-Shot Selection   │ Selects #1 highest-scoring frame for each unique person:    │
│   │                       │ • Crops square headshot (+15% margin padding)               │
│   │                       │ • Captures uncropped full-resolution (up to 4K) frame       │
│   └──────────┬────────────┘                                                             │
│              │                                                                          │
│              ▼                                                                          │
│   ┌─────────────────────────────────────────────────────────────────────────────────┐   │
│   │ Interactive Person Gallery UI (FaceExtractorModal.jsx):                       │   │
│   │ • Grid of unique people with timestamps chips ("Seen at 00:14, 01:22, 03:45")    │   │
│   │ • 1-Click "Jump to Playhead" in Video Studio                                    │   │
│   │ • 1-Click "Send to Image Studio" for AI Background Removal / Enhancing          │   │
│   │ • Download Individual Headshot / Full Frame or Download All as .ZIP             │   │
│   └─────────────────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────────────┘
`

---

## 3. Detailed Component & Implementation Plan

### A. Backend AI & Computer Vision Service (pp/services/face_service.py)
1. **Frame Extraction**: Iterates over video frames at sample_rate_fps (default: 1.5 fps) using OpenCV cv2.VideoCapture.
2. **Face Detection**: Uses OpenCV cv2.FaceDetectorYN (YuNet) for ultra-fast (5ms) face localization and 5 facial landmarks (eyes, nose, mouth corners).
3. **Quality Metric Calculation**:
   - sharpness_score = cv2.Laplacian(face_gray, cv2.CV_64F).var()
   - rontality_score = calculate_landmark_symmetry(landmarks)
   - size_score = min(1.0, face_height / 150.0)
   - composite_quality = (0.4 * sharpness) + (0.35 * frontality) + (0.25 * size)
4. **Facial Feature Vector Extraction & Clustering**:
   - Uses cv2.FaceRecognizerSF (SFace) to extract 128D normalized feature vectors.
   - Computes Cosine Distance between detections. Detections with similarity $\ge 0.65$ are merged into the same person_id cluster.
   - The instance with the highest composite_quality is designated as the est_view.
5. **Asset Generation**:
   - Headshot: Square crop centered on face with 15% margin padding saved to /data/outputs/face_person_{id}_thumb.jpg.
   - Full Frame: High-quality frame capture at that timestamp saved to /data/outputs/face_person_{id}_full.jpg.

### B. REST Endpoints & Celery Tasks (pp/api/v1/video.py & pp/tasks/face_tasks.py)
- POST /mediapro/api/videos/{video_id}/faces/extract
  - Body: { "sample_rate_fps": 1.5, "min_face_size": 40, "similarity_threshold": 0.65 }
  - Returns: { "task_id": "...", "status": "QUEUED" }
- GET /mediapro/api/videos/{video_id}/faces/{task_id}
  - Returns: List of unique people, best timestamps, occurrences, quality scores, headshot URLs, full-frame URLs.
- GET /mediapro/api/videos/{video_id}/faces/{task_id}/download-zip
  - Returns: Streaming .zip file containing all unique headshots.

### C. Frontend Interactive Gallery (src/components/FaceExtractor/FaceExtractorModal.jsx)
- **Person Grid Cards**:
  - Headshot image with quality score pill (e.g. 96% Sharpness).
  - Occurrence count badge (18 Sightings).
  - Clickable timestamp chips ( 0:14,  1:22,  3:45) that jump the main video player.
  - Headshot / Full-Frame toggle preview.
- **Action Buttons**:
  - "Send to Image Studio" (1-click loads headshot into Image Studio).
  - "Download Headshot" / "Download Full 4K Frame".
  - "Download All Unique People (.ZIP)".

---

## 4. Verification & Testing Plan

1. **Detection & De-duplication Test**: Run on a 2-person dialogue video; verify only 2 unique person clusters are returned.
2. **Quality Selection Test**: Verify the algorithm chooses the front-facing, open-eye, sharp frame over a motion-blurred frame.
3. **Studio Handoff Test**: Verify clicking a timestamp seeks the video player, and clicking "Send to Image Studio" opens the headshot in Image Studio.
4. **ZIP Archive Test**: Verify download-zip downloads a clean archive with all unique headshots.
