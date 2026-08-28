# Plan 01 - Backend Modular Architecture & Centralized Schemas

> Status: COMPLETED
> Priority: CRITICAL
> Type: Backend Architecture & Codebase Refactoring
> Last Updated: 2026-08-28

---

## 1. Executive Summary & Objective

Decompose the monolithic ackend/app/main.py (**2,113 lines -> 53 lines**, 97.5% reduction) into modular domain routers under pp/api/v1/, centralized Pydantic v2 schemas under pp/schemas/, and standard RFC 7807 global exception handling with structured audit logging.

---

## 2. Directory Structure

`
backend/app/
├── main.py                     # Clean 53-line router aggregator & middleware entry
├── config.py                   # Centralized environment & directory paths
├── celery_app.py               # Celery broker & backend setup
├── schemas/                    # Pydantic v2 schemas
│   ├── common.py
│   ├── video.py
│   ├── image.py
│   ├── batch.py
│   ├── preset.py
│   └── audio.py
├── api/v1/                     # Modular API routers
│   ├── api.py                  # Router aggregator
│   ├── system.py               # Health, hardware & /system/telemetry
│   ├── media.py                # Uploads & streaming
│   ├── video.py                # Video studio operations & audio mastering
│   ├── image.py                # Image studio operations & AI tools
│   ├── batch.py                # Universal batch engine & task status
│   └── presets.py              # Export preset & recipe manager
├── services/                   # Business logic & FFmpeg/OpenCV wrappers
│   ├── ffmpeg_service.py
│   ├── image_service.py
│   ├── batch_service.py
│   ├── preset_service.py
│   └── audio_service.py
├── middleware/                 # Middleware
│   ├── error_handler.py        # RFC 7807 global exception handler
│   └── request_logger.py       # Structured request audit logger
└── tasks/                      # Celery async tasks
    ├── video_tasks.py
    └── image_tasks.py
`

---

## 3. Verification & Results

- [x] Monolithic main.py backed up as main_monolith_backup.py and reduced to 53 lines.
- [x] GET /mediapro/api/health returns {"status":"ok","service":"mediapro-api"}.
- [x] GET /mediapro/api/system/hardware returns CUDA / NVENC acceleration info.
- [x] GET /mediapro/api/system/telemetry returns live GPU VRAM, CPU, RAM, disk, and queue depth.
