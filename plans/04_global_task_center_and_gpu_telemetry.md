# ⚡ Plan 04: Global Task Center & Real-Time Telemetry

## 🎯 Objective
Create a persistent Global Task Center & Background Activity Drawer in the top header, coupled with real-time GPU VRAM, CPU utilization, and worker queue telemetry.

---

## 🎨 User Experience Specification

### Header Activity Widget & Live Telemetry Pill
```
[ Media Pro ]   [ 🎬 Video Studio ] [ 🖼️ Image Studio ]   ...   [ ⚡ GPU: 24% | 1.8/4.0 GB ] [ ⏳ 2 Tasks Running (68%) ▼ ]
```

### Expanded Background Task Center Drawer
```
┌────────────────────────────────────────────────────────────────────────┐
│  ⚡ Active Render Queue & Background Tasks                     [✕ Close]│
├────────────────────────────────────────────────────────────────────────┤
│  🎬 Video Cut: "podcast_ep4_trimmed.mp4"                               │
│  [============================>        ] 74%  •  ETA: 4s  •  NVENC     │
│  [ ⏸ Pause ]  [ ✕ Cancel ]                                             │
├────────────────────────────────────────────────────────────────────────┤
│  🪄 AI Cutout: "product_bottle.png"                                    │
│  [====================================>] 100% •  Completed (0.42s)     │
│  [ 👁️ View ]  [ 💾 Download ]                                          │
├────────────────────────────────────────────────────────────────────────┤
│  📦 Batch Queue: 5 items pending                                       │
│  • drone_01.mov (In Queue)                                             │
│  • drone_02.mov (In Queue)                                             │
├────────────────────────────────────────────────────────────────────────┤
│  🖥️ Hardware Telemetry:                                                │
│  NVIDIA GeForce RTX 3050  |  VRAM: 1.82 GB / 4.00 GB  |  Temp: 48°C    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Step-by-Step Implementation Steps

### 1. Backend Telemetry & Task Control Endpoints
- `GET /mediapro/api/system/telemetry`: Reads `nvidia-smi` GPU load & memory, CPU count, RAM, Celery active/reserved queue depth, and disk space free.
- `POST /mediapro/api/tasks/{task_id}/cancel`: Revokes Celery task (`celery.control.revoke(task_id, terminate=True)`).
- `POST /mediapro/api/tasks/clear-completed`: Clears completed task history.

### 2. Frontend Task Store (`TaskContext.jsx`)
- Global state for all running, queued, and completed jobs with SSE listener.
- Calculates overall completion percentage and estimated time remaining (ETA).

### 3. Build `GlobalTaskDrawer.jsx` & Header Telemetry Badge
- Clickable header indicator with spinner when tasks are active.
- Slide-out or dropdown drawer showing live task progress bars, cancel buttons, and GPU VRAM meter.

---

## 🧪 Verification & Acceptance Criteria
- [ ] Header shows active task counter and progress spinner in real-time.
- [ ] Clicking cancel terminates the active Celery worker task cleanly.
- [ ] Telemetry pill shows accurate GPU VRAM and worker status.
