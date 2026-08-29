# SKILL 06 — JOB / STATE MACHINE ENGINEER

## 1. Responsibility
Design, enforce, and maintain reliable asynchronous job lifecycles, state transitions, progress tracking, and error recovery.

## 2. Explicit Scope
- Celery worker tasks in `backend/app/tasks/` (`video_tasks.py`, `image_tasks.py`, `face_tasks.py`).
- State transitions: `PENDING -> QUEUED -> PROCESSING -> SUCCESS / FAILURE / CANCELLED`.
- Task cancellation and process termination signals (`SIGTERM`, `SIGKILL`).
- Batch progress consolidation in `backend/app/services/batch_service.py`.

## 3. Inputs
- Background processing operations, batch queue payloads, status poll requests.

## 4. Required Inspection Steps
1. Map the complete state lifecycle of the task from dispatch to completion.
2. Check task keyword argument signatures for exact parity between API caller and Celery `@celery.task` decorator.
3. Verify progress update frequency (e.g. throttle progress updates to max 2-5 per second to avoid saturating Redis).

## 5. Engineering Rules
- **Explicit Valid Transitions**: Never allow invalid state jumps (e.g. `COMPLETED -> PROCESSING`).
- **Always Catch & Record Task Exceptions**: Unhandled worker exceptions must set task state to `FAILURE` with structured error metadata.
- **Idempotent Tasks**: Re-running a task with identical inputs must safely produce the expected output without duplicating records.

## 6. Decision-Making Rules
- If client cancels task $\to$ revoke Celery task with `terminate=True` and clean up partial output files.
- If task encounters unrecoverable file corruption $\to$ mark `FAILURE` and notify task drawer.

## 7. Validation Requirements
- Test task lifecycle with end-to-end status polling endpoint (`POST /mediapro/api/batch/status`).
- Verify task completion cleans up temporary scratch files.

## 8. Failure Handling
- On Celery worker crash, pending tasks must be reported as failed or recovered on worker restart.

## 9. Interaction with Other Skills
- Cooperates with `redis.md`, `concurrency.md`, `recovery.md`, and `fastapi.md`.

## 10. Deliverables
- Deterministic Celery task definitions with full lifecycle telemetry and cleanup.

## 11. Anti-Patterns
- Leaving tasks indefinitely in `PENDING` without timeout or expiration.
- Ignoring Celery revocation signals while FFmpeg continues burning CPU in the background.

## 12. Examples
- **Correct State Transition**:
  ```python
  @celery.task(bind=True)
  def process_video_task(self, video_id, params):
      self.update_state(state="PROCESSING", meta={"progress": 0.0})
      try:
          result = run_ffmpeg_pipeline(video_id, params, progress_cb=lambda p: self.update_state(state="PROCESSING", meta={"progress": p}))
          return {"status": "SUCCESS", "output": result}
      except Exception as e:
          self.update_state(state="FAILURE", meta={"error": str(e)})
          raise
  ```
