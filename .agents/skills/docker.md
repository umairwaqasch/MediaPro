# SKILL 08 — DOCKER / DEVOPS ENGINEER

## 1. Responsibility
Ensure 100% containerized execution, isolated dependencies, host machine zero-pollution, multi-service orchestration, and GPU pass-through in Docker Compose.

## 2. Explicit Scope
- `docker-compose.yml` multi-container architecture (`mediapro-proxy`, `mediapro-api`, `mediapro-worker`, `mediapro-redis`).
- `backend/Dockerfile` (Python 3.12-slim + FFmpeg + CUDA drivers) and `frontend/Dockerfile` (Node 20 build + Nginx Alpine).
- Internal network topology (`mediapro-net`) and port mappings (`8090:80`).
- Bind-mounts (`./data/:/data/`, `./backend/app/:/app/app/`).
- NVIDIA Container Toolkit GPU device reservations.

## 3. Inputs
- Dockerfiles, Compose files, environment configurations, container logs.

## 4. Required Inspection Steps
1. Verify container naming prefix is strictly `mediapro-`.
2. Inspect GPU capability block: `driver: nvidia, capabilities: [gpu]`.
3. Check bind mount host paths (`./data/uploads`, `./data/outputs`, etc.).

## 5. Engineering Rules
- **Zero Host Pollution**: Never run `pip`, `npm`, or `choco` on the host machine. Everything runs strictly inside Docker.
- **Non-Destructive Operations**: Never run `docker prune`, `docker rm -f`, or interfere with non-MediaPro containers on the host.
- **Health-Checked Dependencies**: `api` and `worker` must use `depends_on: redis: condition: service_healthy`.

## 6. Decision-Making Rules
- If updating frontend code $\to$ `docker compose build --no-cache proxy; docker compose up -d proxy`.
- If updating backend Python code with hot-reload $\to$ changes reflect immediately via `./backend/app` bind-mount.
- If modifying backend `requirements.txt` $\to$ rebuild `api` and `worker` images.

## 7. Validation Requirements
- Check running containers: `docker ps --filter "name=mediapro-"`.
- Inspect endpoint response codes and container memory footprints.

## 8. Failure Handling
- On container build failure, inspect step logs in Docker builder output to locate missing system dependencies.

## 9. Interaction with Other Skills
- Cooperates with `nginx.md`, `storage.md`, `security.md`, and `architecture.md`.

## 10. Deliverables
- Clean, repeatable, multi-container Docker Compose definitions with zero host configuration drift.

## 11. Anti-Patterns
- Exposing internal API (:8000) or Redis (:6379) ports directly to the host machine.
- Installing packages directly on the Windows host machine.

## 12. Examples
- **Correct Docker GPU Reservation**:
  ```yaml
  deploy:
    resources:
      reservations:
        devices:
          - driver: nvidia
            count: all
            capabilities: [gpu]
  ```
