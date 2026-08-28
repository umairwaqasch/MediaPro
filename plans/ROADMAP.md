# Media Pro - Industrial Upgrade Roadmap

> Version: 2.1 (Consolidated with Unified Batch & Non-Blocking Architecture)
> Last Updated: 2026-08-28
> Status: Plan 01 DONE | Plans 02-06 Queued

---

## COMPLETED

### Plan 01 - Backend Modular Router and Centralized Schemas
- main.py reduced 2113 to 53 lines
- app/api/v1/ domain routers: system, media, video, image, batch
- app/schemas/ centralized Pydantic models
- app/middleware/ RFC 7807 error handler + request logger
- New endpoints: /system/telemetry, /tasks/{id}/cancel, /tasks/clear-completed

---

## Plan 02 - Non-Blocking Toast & Notification Engine

Priority: HIGH | Effort: Medium | Type: Frontend

### Problem
15 native alert() / confirm() calls across 5 files block the UI thread and freeze the browser.

Affected files:
- ImageStudio.jsx: 4 calls
- ImageToolsMatrix.jsx: 6 calls
- SettingsModal.jsx: 1 call
- VideoLibrary.jsx: 1 call
- App.jsx: 3 calls

### Implementation Steps
1. src/context/ToastContext.jsx - toast.success/error/warning/info/promise
2. src/components/Toast/ToastContainer.jsx - fixed top-right stack, max 5 visible
3. src/components/Toast/ToastItem.jsx - glassmorphic card, progress bar, 4s autodismiss
4. Replace all alert() in ImageStudio.jsx
5. Replace all alert() in ImageToolsMatrix.jsx
6. Replace alert() in SettingsModal.jsx
7. Replace alert() in VideoLibrary.jsx
8. Replace all alert() in App.jsx
9. Wrap CutControls.jsx callbacks with non-blocking toast
10. Verify zero alert() remain

---

## Plan 03 - Multi-Level Undo/Redo & Global Hotkey Engine

Priority: HIGH | Effort: Medium | Type: Frontend

### Problem
No undo/redo exists. Accidental changes are permanent. No keyboard shortcuts.

### Implementation Steps
1. src/hooks/useHistoryStack.js - push/undo/redo/jumpTo, max 50 states
2. Connect to Image Studio tool parameter changes
3. Connect to Video Studio trim points, speed, LUT, crop
4. src/components/HistoryPanel.jsx - collapsible sidebar with labeled timeline
5. src/hooks/useKeyboardShortcuts.js - global keydown listener
6. src/components/HotkeyModal.jsx - searchable cheatsheet (? to open)
7. Wire Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z globally in App.jsx
8. Wire Ctrl+S quick export, Escape close modal

---

## Plan 04 - Unified Backend Batch Engine & Non-Blocking Global Task Center

Priority: HIGH | Effort: Large | Type: Full-Stack (Backend Batch Engine + Non-Blocking UI)

### Problem
Batch systems are currently fragmented between video and image endpoints without a unified Redis batch manager, SSE batch progress stream, or concurrency throttling. Frontend modals block the user interface during processing instead of allowing background multitasking.

### Backend Steps (Unified Batch Engine)
1. backend/app/services/batch_service.py - Redis-backed Batch Manager with batch state, task IDs, and cancellation
2. backend/app/schemas/batch.py - UniversalBatchSubmitRequest (video & image support)
3. POST /batch/jobs - Universal batch dispatcher for both video and image workloads
4. GET /batch/jobs/{batch_id} - Consolidated batch status & item breakdown
5. POST /batch/jobs/{batch_id}/cancel - Mass cancellation of all tasks in a batch
6. GET /batch/jobs/{batch_id}/events - SSE streaming progress updates for the entire batch
7. GET /batch/jobs/active - List all currently active batches

### Frontend Steps (Non-Blocking Task Center & Dock)
8. src/context/TaskContext.jsx - Global task & batch store with SSE listener & telemetry poller
9. src/components/GlobalTaskDrawer.jsx - Slide-out drawer with GPU VRAM/load, active tasks, batch breakdowns, and cancel buttons
10. Header telemetry pill & active task badge in Header.jsx
11. Add "Run in Background" / Minimize action to ProgressModal.jsx, BatchProcessModal.jsx, ImageBatchModal.jsx
12. Verify zero UI lockout when jobs are running

---

## Plan 05 - Export Preset Manager and Workflow Recipes

Priority: MEDIUM | Effort: Medium | Type: Full-Stack

### Problem
Every export requires re-entering all parameters manually.

### Backend Steps
1. GET /presets/ - list all presets
2. POST /presets/ - save preset (name, type, params JSON)
3. DELETE /presets/{id} - delete user preset
4. backend/app/api/v1/presets.py - JSON stored in /data/presets/

### Frontend Steps
5. Preset JSON schema (name, type, tags, params)
6. 4 built-in video presets: YouTube 4K, TikTok 9:16, Discord <25MB, Cinematic 24fps
7. 3 built-in image presets: E-Commerce White, Instagram Portrait, Print A4 Scan
8. src/components/PresetManagerModal.jsx - searchable, taggable, import/export .json
9. Quick-select dropdown in Video and Image Studio headers
10. Batch: apply preset to all staged media

---

## Plan 06 - Advanced Audio Mastering and Waveform Scrubbing

Priority: MEDIUM | Effort: Large | Type: Full-Stack

### Problem
Audio limited to EBU R128. No EQ, no vocal enhancer, no interactive waveform.

### Backend Steps
1. POST /videos/{id}/audio/eq - 4-band parametric EQ
2. POST /videos/{id}/audio/vocal-clarity - highpass + compand chain
3. POST /videos/{id}/audio/ducking - sidechain compression

### Frontend Steps
4. Interactive canvas waveform: click-to-seek, zoom, selection highlight
5. 4-band EQ sliders: 80Hz, 500Hz, 3kHz, 10kHz (-12 to +12 dB)
6. Volume gain slider -24dB to +12dB with live readout
7. Broadcast loudness toggle: YouTube -14 LUFS / Broadcast -23 LUFS / Podcast -16 LUFS
8. Visual LUFS bar meter
9. Verify output conforms to target LUFS
