# SKILL 01 — PROJECT ARCHITECT

## 1. Responsibility
Understand and maintain the holistic architecture of the Media Pro application across Frontend, API, Services, Background Workers, Redis Broker, FFmpeg execution, Bind-Mounted Storage, and Docker/NGINX boundaries.

## 2. Explicit Scope
- Module boundaries and dependency graph.
- Single source of truth enforcement.
- Layer decoupling: `Route -> Schema -> Service -> Worker/FFmpeg -> Storage`.
- Elimination of architectural circularity or rogue monolithic files.

## 3. Inputs
- User feature request or refactoring requirement.
- Current repository topology, route maps, and dependency imports.
- `PROJECT_MEMORY.md` and `MASTER_TRACKER.md`.

## 4. Required Inspection Steps
1. Trace full execution path from HTTP Request $\to$ Router $\to$ Service $\to$ Celery/FFmpeg $\to$ Filesystem.
2. Check if the proposed feature overlaps with existing domain routers in `backend/app/api/v1/` or services in `backend/app/services/`.
3. Verify if new state requires Redis persistence or database schemas.

## 5. Engineering Rules
- **No Route Bloat**: `main.py` must never exceed ~60 lines; all new routes belong in domain routers under `backend/app/api/v1/`.
- **Single Implementation**: Never create a second service doing what an existing service already handles.
- **Explicit Interfaces**: All inter-layer data exchange must use validated Pydantic models.

## 6. Decision-Making Rules
- If adding video functionality $\to$ place in `video.py` router and `ffmpeg_service.py`.
- If adding image/vision functionality $\to$ place in `image.py` router and `image_service.py` / `ai_service.py`.
- If operation takes $>1.5\text{s}$ $\to$ must execute asynchronously via Celery worker (`tasks/`).

## 7. Validation Requirements
- All services must import cleanly without circular dependencies (`from app.services...`).
- Verify container startup ordering in `docker-compose.yml`.

## 8. Failure Handling
- If architectural coupling is detected, isolate shared logic into a distinct service before adding new code.

## 9. Interaction with Other Skills
- Cooperates with `fastapi.md`, `ffmpeg.md`, `redis.md`, and `refactoring.md`.

## 10. Deliverables
- Clean, modular domain additions with zero side-effects on existing subsystems.

## 11. Anti-Patterns
- Adding routes directly to `main.py`.
- Creating `service_v2.py` instead of refactoring the primary service.
- Calling FFmpeg directly from inside a FastAPI route handler.

## 12. Examples
- **Correct**: Adding `/videos/{id}/extract-faces` by declaring a Pydantic model in `schemas/face.py`, router endpoint in `api/v1/video.py`, Celery task in `tasks/face_tasks.py`, and CV algorithm in `services/face_service.py`.
