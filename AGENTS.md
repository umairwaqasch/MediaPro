# Project Guidelines: Media Pro

> **App Name**: Media Pro Studio
> **URL**: `http://localhost:8090/mediapro`
> **Docker Project**: `mediapro` (`.env` sets `COMPOSE_PROJECT_NAME=mediapro`)
> **Last Updated**: 2026-08-28

---

## 1. Docker Isolation & Host Protection

- **No Host Installations**: NEVER install libraries, packages, or runtimes on the Windows host machine (no host `pip`, `npm`, `choco`, etc.). All dependencies, build tools, scripts, and runtime environments MUST remain strictly inside Docker containers.
- **Non-Destructive Operations**: NEVER run `docker rm`, `docker prune`, `docker rmi`, or stop containers outside this project scope. Other user containers (e.g. `facultyjava-*`, `evision_*`) must never be touched.
- **Container Prefix**: All Media Pro containers use the prefix `mediapro-` (`mediapro-proxy`, `mediapro-api`, `mediapro-worker`, `mediapro-redis`).
- **Network**: All internal services communicate over the private Docker bridge network `mediapro-net`. Only `mediapro-proxy` exposes a host port.

## 2. Port Management & Non-Conflict Strategy

- **Active Port Checking**: Other user projects run simultaneously in Docker. ALWAYS run `docker ps` before assigning or starting ports. If a port conflict arises, adjust Media Pro's host port proactively.
- **Current Port Strategy**:
  - Host port `8090` -> `mediapro-proxy` (Nginx + React SPA)
  - `mediapro-api` -- Internal `:8000` on `mediapro-net` only
  - `mediapro-worker` -- Internal only on `mediapro-net`
  - `mediapro-redis` -- Internal `:6379` on `mediapro-net` only
- **Target URL**: `http://localhost:8090/mediapro`
- **API Docs**: `http://localhost:8090/mediapro/api/docs`

## 3. Engineering & Problem Solving Philosophy

- **Root-Cause Investigation**: ALWAYS identify and resolve the root cause of any bug, build error, or failure. NEVER apply superficial workarounds or temporary patches.
- **System Integrity**: Ensure architectural soundness, maintainable code, and clean configurations at every layer.
- **Modular Architecture**: The backend is now fully modular. NEVER add new endpoints directly to `backend/app/main.py`. All new routes belong in their respective domain router under `backend/app/api/v1/`. All new Pydantic models go into `backend/app/schemas/`.

## 4. System Audit & Progress Tracking

- **Post-Task Audit**: After every major task or milestone, audit the full system (container health, endpoint response codes, error logs, and functional workflows).
- **Master Tracker**: Maintain and update `MASTER_TRACKER.md` in the workspace root. This is the single source of truth for milestones, system status, active ports, audit history, and upcoming features.
- **Plans Tracker**: All industrial upgrade plans live in `plans/`. Progress is tracked in `plans/PROGRESS.md`. Always update `PROGRESS.md` when starting or completing a plan step.
- **Single README**: The project uses a single `README.md` as the primary readme. `README2.md` is a supplementary audit report -- do not delete it.

## 5. Non-Intrusive Testing & Zero Mouse Takeover

- **Never Use User Mouse**: NEVER use browser takeover or mouse control tools. Do NOT launch interactive browser subagents that seize the screen, window, or mouse cursor.
- **Command-Line & Headless Testing**: Perform all verifications, diagnostic audits, endpoint testing, and health checks strictly through command-line tools (`curl`, PowerShell, REST methods, container logs, and CLI diagnostics).

## 6. Backend Architecture Reference

```
backend/app/
+-- api/
|   +-- v1/
|       +-- api.py        <- Router aggregator (include all sub-routers here)
|       +-- system.py     <- /health, /system/hardware, /system/telemetry
|       +-- media.py      <- /upload, /library, /media/*, /outputs, /thumbnails
|       +-- video.py      <- /videos/{id}/cut, /crop, /gif, /stabilize, ...
|       +-- image.py      <- /image/upload, /image/{id}/process, /image/batch, ...
|       +-- batch.py      <- /batch/process, /batch/status, /tasks/{id}/cancel
+-- schemas/
|   +-- common.py         <- StandardErrorResponse, HealthCheckResponse, TelemetryResponse
|   +-- video.py          <- All video Pydantic request models
|   +-- image.py          <- All image Pydantic request models
|   +-- batch.py          <- Batch request/response models
+-- middleware/
|   +-- error_handler.py  <- RFC 7807 global exception handler
|   +-- request_logger.py <- Structured request audit logger (X-Response-Time-Ms header)
+-- services/             <- Business logic (ffmpeg_service, image_service, ai, perspective)
+-- tasks/                <- Celery async tasks (video_tasks.py, image_tasks.py)
+-- celery_app.py
+-- config.py
+-- main.py               <- 53-line clean entry point (DO NOT ADD ROUTES HERE)
+-- main_monolith_backup.py  <- Original 2113-line monolith (reference only)
```

## 7. Key Data Paths (Inside Containers)

| Path | Purpose |
| :--- | :--- |
| `/data/uploads/` | Source video files |
| `/data/outputs/` | Processed video exports |
| `/data/thumbnails/` | Video frame thumbnail images |
| `/data/image_uploads/` | Source image files |
| `/data/image_outputs/` | Processed image exports |
| `/data/image_thumbnails/` | Image thumbnail previews |

> Host bind-mount: `c:/Users/umairwaqas/Projects/VideoProcessor/data/`
