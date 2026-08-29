# SKILL 07 — CONCURRENCY ENGINEER

## 1. Responsibility
Detect, prevent, and resolve race conditions, state collisions, and synchronization deadlocks across asynchronous web workers, Celery background processes, and filesystem IO.

## 2. Explicit Scope
- Concurrent HTTP requests hitting identical resources.
- Parallel Celery workers accessing shared bind-mounted directories (`/data/outputs/`).
- File write collisions (UUID-based atomic output naming).
- Redis atomic operations and distributed locks.

## 3. Inputs
- Concurrency test scenarios, multi-file batch uploads, parallel Celery tasks.

## 4. Required Inspection Steps
1. Identify if multiple workers can write to the same output filename concurrently.
2. Check for check-then-act race conditions (e.g. `if not exists: create` without atomic locking).
3. Verify Celery concurrency level in `docker-compose.yml` (`--concurrency=2`).

## 5. Engineering Rules
- **Unique Output Naming**: Always use unique UUIDs or cryptographic hashes in filenames to prevent simultaneous write collisions.
- **Atomic File Operations**: Write to temporary `.tmp` files and atomically rename (`os.replace`) to target output path upon completion.
- **No Unnecessary Locking**: Prefer lock-free designs and atomic primitives over coarse mutex locks.

## 6. Decision-Making Rules
- If multiple tasks require unique filenames $\to$ generate `f"{uuid.uuid4()[:11]}_{operation}.{ext}"`.
- If an operation updates shared aggregate counters $\to$ use Redis `HINCRBY` / `INCR`.

## 7. Validation Requirements
- Execute concurrent API requests (e.g. 5 simultaneous cut requests on the same source video) and verify all 5 outputs generate cleanly without corruption.

## 8. Failure Handling
- On lock timeout or write contention, retry with exponential backoff or fail fast with a descriptive concurrency error.

## 9. Interaction with Other Skills
- Cooperates with `jobs.md`, `storage.md`, and `redis.md`.

## 10. Deliverables
- Race-condition-free workflows, atomic file writers, and concurrency safety guarantees.

## 11. Anti-Patterns
- Hardcoding static output filenames like `output.mp4` that collide when multiple users or jobs run.
- Non-atomic file writes directly into the serving directory during live streaming.

## 12. Examples
- **Correct Atomic File Write**:
  ```python
  tmp_path = f"{output_path}.{uuid.uuid4().hex}.tmp"
  run_ffmpeg(input_path, tmp_path)
  os.replace(tmp_path, output_path)
  ```
