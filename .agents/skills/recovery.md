# SKILL 17 — FAILURE & RECOVERY ENGINEER

## 1. Responsibility
Design fault-tolerant architectures, graceful degradation paths, container restart recovery, partial-write cleanup, and error resilience.

## 2. Explicit Scope
- Graceful recovery when Redis, FFmpeg, or Celery processes encounter abrupt failure.
- Cleaning up incomplete or orphaned `.tmp` files upon process termination.
- Auto-restarting dead tasks and handling container crash scenarios (`restart: unless-stopped`).

## 3. Inputs
- Process crash logs, unhandled task aborts, sudden network disconnections, corrupted input files.

## 4. Required Inspection Steps
1. For every external call (FFmpeg, Redis, Celery), answer: *What happens if this process is killed or crashes mid-way?*
2. Verify that partial output files are caught in `finally:` blocks and deleted.
3. Check that API returns informative, structured error responses instead of unhandled 500 crashes.

## 5. Engineering Rules
- **No Orphan Partial Writes**: If an encoding or write fails, the output file must be deleted so corrupt files never enter the library.
- **Fail-Safe Defaults**: If optional services (like hardware GPU) fail, the system must transparently degrade to CPU without breaking the user experience.
- **Idempotent Recovery**: On container restart, the system must be capable of discovering existing library assets without corruption.

## 6. Decision-Making Rules
- If FFmpeg process exits with non-zero code $\to$ delete target output file and report error message.
- If Redis is unreachable $\to$ log warning and prevent app crash on non-critical caching paths.

## 7. Validation Requirements
- Simulate failure (e.g. invalid video input, interrupted transcode) and verify system remains stable with clean storage.

## 8. Failure Handling
- Wrap operations in robust `try...except...finally` blocks with explicit resource cleanup.

## 9. Interaction with Other Skills
- Cooperates with `storage.md`, `jobs.md`, `debugging.md`, and `fastapi.md`.

## 10. Deliverables
- Fault-tolerant pipelines, automated cleanup hooks, and resilient error recovery mechanisms.

## 11. Anti-Patterns
- Leaving half-encoded, corrupt 0-byte video files in `/data/outputs/` after a crash.
- Catching exceptions silently without logging or updating task state.

## 12. Examples
- **Fail-Safe Cleanup Block**:
  ```python
  tmp_out = f"{out_path}.tmp"
  try:
      run_ffmpeg(cmd)
      os.replace(tmp_out, out_path)
  except Exception as e:
      if os.path.exists(tmp_out):
          os.remove(tmp_out)
      raise MediaProcessingError(f"Encode failed: {e}")
  ```
