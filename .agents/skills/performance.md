# SKILL 16 — PERFORMANCE ENGINEER

## 1. Responsibility
Maintain ultra-fast execution latency, low memory footprint, optimal GPU hardware acceleration, non-blocking UI rendering, and efficient stream IO.

## 2. Explicit Scope
- GPU NVENC encoding pipelines (`p4` low latency preset, Lanczos scaling).
- React canvas rendering efficiency (60 FPS timeline scrubbing, debounced filter previews).
- Redis memory footprint and connection pooling.
- Celery worker concurrency and CPU utilization.

## 3. Inputs
- Latency metrics (`X-Response-Time-Ms`), encoding benchmark speeds, UI frame rate, memory profiles.

## 4. Required Inspection Steps
1. Measure baseline execution time before proposing optimizations.
2. Check for unnecessary video re-encodes when Fast Stream Copy (`-c copy`) is viable.
3. Check for redundant re-renders or un-memoized callbacks in React components (`useCallback`, `useMemo`).

## 5. Engineering Rules
- **Evidence-Based Optimization**: Never optimize without a measured bottleneck.
- **Priority Hierarchy**: Correctness $\to$ Reliability $\to$ Maintainability $\to$ Performance.
- **Non-Blocking UI**: Long tasks must execute asynchronously in worker threads; the frontend UI must never freeze during media operations.

## 6. Decision-Making Rules
- If video cut has no filters & keyframe-aligned $\to$ use Fast Stream Copy ($0\text{s}$ encode latency).
- If processing image batch $>10$ files $\to$ dispatch to worker and stream progress.

## 7. Validation Requirements
- Benchmark transcode speed against reference matrix in `PROJECT_MEMORY.md`.
- Confirm `mediapro-proxy` memory is $<20\text{ MB}$ and `mediapro-api` is $<100\text{ MB}$.

## 8. Failure Handling
- If GPU memory is exhausted (CUDA OOM), gracefully fall back to CPU execution (`libx264`) and log performance notice.

## 9. Interaction with Other Skills
- Cooperates with `ffmpeg.md`, `concurrency.md`, and `docker.md`.

## 10. Deliverables
- Low-latency, GPU-accelerated pipelines and responsive 60 FPS UI workflows.

## 11. Anti-Patterns
- Synchronously encoding 4K video in the main FastAPI event loop thread.
- Premature micro-optimizations that degrade code readability.

## 12. Examples
- **Fast Copy Decision**:
  ```python
  if is_lossless_cut_possible(start, end, filters, speed):
      return ["ffmpeg", "-ss", str(start), "-to", str(end), "-i", in_path, "-c", "copy", out_path]
  ```
