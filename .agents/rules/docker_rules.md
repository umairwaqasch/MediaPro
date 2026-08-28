# Docker Safety, Isolation, Port Management & Engineering Rules

## Core Rules

### 1. Zero Host Environment Pollution
- NEVER run pip install, npm install, choco install, or any tool installation on the host Windows machine.
- All dependencies, scripts, build steps, and FFmpeg tooling must remain strictly isolated inside Docker containers.

### 2. Port Conflict Prevention
- ALWAYS inspect active ports (docker ps) before assigning new ports.
- Adjust Media Pro host port if any conflict is detected with other running projects.
- Media Pro uses Host Port 8090 (mediapro-proxy only).
- Internal services communicate over private Docker bridge network mediapro-net without exposing host ports.

### 3. Root-Cause Problem Solving
- Always diagnose and fix the true underlying cause of issues.
- Do not use temporary hacks, superficial bypasses, or quick patches.

### 4. Non-Destructive Container Operations
- NEVER run docker rm, docker rmi, docker prune, or docker system prune on containers outside this project.
- All Media Pro containers use the prefix mediapro- (mediapro-proxy, mediapro-api, mediapro-worker, mediapro-redis).
- Never stop or remove other user containers (e.g. facultyjava-*, evision_*).

### 5. Audit & Master Tracker
- Conduct a full system health and functionality audit after every major task.
- Log status, audits, and roadmap progress in MASTER_TRACKER.md.
- Log plan-level progress in plans/PROGRESS.md.

### 6. Modular Backend Architecture
- NEVER add new API endpoints to backend/app/main.py (it is a 53-line clean entry point only).
- Add new routes to the correct domain router in backend/app/api/v1/:
  - system.py for health, hardware, telemetry
  - media.py for upload, library, streaming, delete
  - video.py for all video processing endpoints
  - image.py for all image processing endpoints
  - batch.py for batch jobs, task cancel/clear, SSE events
- Add new Pydantic models to backend/app/schemas/ (not inline in route files).
- Register new sub-routers in backend/app/api/v1/api.py.
