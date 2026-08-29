# 📚 Media Pro — Lessons Learned & Engineering Registry

> **Purpose**: Mandatory architectural memory. Document root causes, failed anti-patterns, correct solutions, and prevention rules to prevent regression.

---

## Lesson 01: JavaScript Temporal Dead Zone (TDZ) in Minified React Builds

- **Problem**: `ReferenceError: Cannot access 'se' before initialization` crash when rendering `ImageStudio` / `ImageCanvas`.
- **Root Cause**: A variable derived from component state (`isCropActive`) was evaluated using `isTransformTab` before `const isTransformTab = activeTab === 'transforms'` was declared in the component body. In minified Vite production builds, `isTransformTab` was mangled to `se`, triggering a runtime TDZ exception.
- **Incorrect Approach**: Moving only the usage or patching locally around the error without ordering declarations.
- **Correct Solution**: Re-ordered top-level derived state flags (`isTransformTab`, `isPerspectiveTab`) immediately following React hook declarations and prior to any dependent calculations.
- **Prevention**: Always declare all component-level derived boolean flags and helper variables at the top of the component body before any derived calculations or early return statements.
- **General Lesson**: Variable scoping and declaration ordering must be strictly top-to-bottom in React components to survive aggressive minification and tree-shaking.

---

## Lesson 02: Modular Backend Architecture vs Monolith Anti-Pattern

- **Problem**: Monolithic 2000+ line `main.py` created high coupling, merge collisions, and untestable route sprawl.
- **Root Cause**: Rapid prototyping added endpoints directly to the FastAPI app instance without domain boundaries.
- **Incorrect Approach**: Continuing to append endpoints to `main.py` with `# ---------- Image Routes ----------` dividers.
- **Correct Solution**: Re-architected backend into modular domain routers under `backend/app/api/v1/` (`system.py`, `media.py`, `video.py`, `image.py`, `batch.py`, `presets.py`) aggregated by `api.py`, keeping `main.py` strictly as a ~50 line entry point.
- **Prevention**: Strict repository rule enforced in `AGENTS.md`: NEVER add routes directly to `main.py`.
- **General Lesson**: Keep entry points thin and delegate domain logic strictly to routers, schemas, and services.

---

## Lesson 03: Docker Isolation & Host Machine Zero-Pollution

- **Problem**: Accidental reliance on host runtimes (`pip`, `npm`) causes divergence between developer machines and production containers.
- **Root Cause**: Running diagnostic or build tools directly on the Windows host machine.
- **Incorrect Approach**: Installing packages or executing scripts on the host Windows environment.
- **Correct Solution**: All package dependencies, build tools, Celery workers, and test scripts must execute strictly within Docker container environments (`mediapro-proxy`, `mediapro-api`, `mediapro-worker`, `mediapro-redis`).
- **Prevention**: Enforce host protection rules in `.agents/rules/docker_rules.md` and `AGENTS.md`.
- **General Lesson**: Treat the host machine strictly as an orchestrator; all runtimes belong in isolated containers.

---

## Lesson 04: Non-Intrusive Headless Verification vs Mouse Takeover

- **Problem**: Interactive browser automation tools seizing mouse control disrupt user workflow and cause fragile GUI tests.
- **Root Cause**: Using GUI automation for tasks that can be deterministically verified via API contracts and logs.
- **Incorrect Approach**: Spawning screen-seizing browser agents.
- **Correct Solution**: Perform all audits, smoke tests, and diagnostic verifications headlessly via command-line HTTP requests, REST methods, container logs, and CLI scripts.
- **Prevention**: Non-intrusive testing rule enforced in `AGENTS.md` and `.agents/rules/testing_rules.md`.
- **General Lesson**: Prefer deterministic headless REST and CLI verification over brittle UI browser takeover.

---

## Lesson 05: Multi-Cut Batch Output Persistence & On-Demand ZIP Download

- **Problem**: Multi-cut batch processing triggered rapid successive browser download popups, blocking UI and causing browser download throttling.
- **Root Cause**: Looping `window.open` / download triggers in frontend progress loops instead of server-side output indexing.
- **Incorrect Approach**: Forcing sequential download prompts for every clip in a batch queue.
- **Correct Solution**: Clips write directly to `/data/outputs/` on the server, auto-index into the Studio Library, and provide an on-demand batch `.ZIP` archive download endpoint (`GET /mediapro/api/media/download-zip`).
- **Prevention**: Asynchronous batch operations should always persist results server-side and notify the UI, offering bulk download on demand.
- **General Lesson**: Decouple task execution from client-side file consumption.

---

## Lesson 06: Independent Image Rescaling vs Forced Aspect Ratio Cropping

- **Problem**: Users scaling or upscaling images (e.g. 200%, 4K UHD) were forced into an aspect ratio crop box.
- **Root Cause**: Coupling between resolution scaling and aspect ratio framing in `ImageToolsMatrix.jsx` and `image_service.py`.
- **Incorrect Approach**: Defaulting `aspect_ratio` to `'original'` and running crop operations even when only scaling was desired.
- **Correct Solution**: Set default `aspect_ratio` to `'none'`, hide canvas crop handles when crop is disabled, and add backend conditional checks in `image_service.py` to skip `crop_image` when no aspect ratio or custom crop rectangle is set.
- **Prevention**: Tool parameters in multi-function studios must be strictly orthogonal and decoupled unless explicitly linked.
- **General Lesson**: Never force destructive sub-operations (cropping) as a prerequisite for non-destructive operations (rescaling/upscaling).

---

## Lesson 07: AI Face Detection in Stylized / Gaming Videos

- **Problem**: YuNet neural face detection found zero faces when analyzing GTA/stylized gameplay footage.
- **Root Cause**: Real-world face detector models (YuNet/SFace) expect standard photographic lighting and natural skin textures, failing on game shaders and stylized 3D meshes at default confidence thresholds (0.60).
- **Incorrect Approach**: Assuming model failure or rewriting the detection pipeline.
- **Correct Solution**: Documented specialized Gaming & CGI detection mode in `plans/DEFERRED_IDEAS.md` utilizing lower confidence thresholds (0.32), CLAHE shadow leveling, and multi-scale image pyramids.
- **Prevention**: Recognize domain mismatch between photorealistic AI models and synthetic/CGI content early in design.
- **General Lesson**: Computer vision models tuned on real-world datasets require preprocessing and threshold adaptation for synthetic graphics.

---

## Lesson 08: Batch Dispatch Keyword Parameter Alignment

- **Problem**: Batch processing tasks raised unexpected keyword argument errors inside Celery worker.
- **Root Cause**: Discrepancy between FastAPI batch dispatcher dictionary keys and Celery task signature parameters (`container`, `vcodec`, `target_i`, `lra`, `text`, `timecode_mode`).
- **Incorrect Approach**: Wrapping task parameters in generic `**kwargs` catch-all.
- **Correct Solution**: Explicitly typed and aligned Pydantic request models with exact keyword signatures in `video_tasks.py` and `image_tasks.py`.
- **Prevention**: Enforce Pydantic validation on all batch dispatch inputs before queuing to Redis.
- **General Lesson**: Background workers must have strict contract parity with API dispatch layers.

---

## Lesson 09: Full-File Processing with Null `end_time`

- **Problem**: `TypeError` when running batch operations on entire files without explicit `end_time` range markers.
- **Root Cause**: FFmpeg command builder expected numeric floats for `end_time` and failed when `end_time=None`.
- **Incorrect Approach**: Forcing frontend to always calculate and send video duration.
- **Correct Solution**: Upgraded FFmpeg service functions to auto-probe video duration via `ffprobe` whenever `end_time=None` or omitted.
- **Prevention**: Service layers should gracefully handle optional bounds by automatically probing file metadata.
- **General Lesson**: Make backend services resilient to partial or omitted boundary parameters.

---

## Lesson 10: Batch Modal Lifecycle & Re-Execution State Reset

- **Problem**: Running a second batch operation after completing a previous batch required a full browser reload.
- **Root Cause**: Progress state remained locked in `COMPLETED` state without a reset trigger.
- **Incorrect Approach**: Forcing window reload or destroying the modal component.
- **Correct Solution**: Added `onResetBatch` lifecycle callback in `BatchProcessModal.jsx` and `ImageBatchModal.jsx` to cleanly reset task queues, progress bars, and staged items.
- **Prevention**: Modal workflows must always provide idempotent completion states and clear reset pathways.
- **General Lesson**: Stateful modals must manage complete lifecycle transitions including restart without page refreshes.

---

## Lesson 11: Polymorphic Silence AI Pydantic Schema Typing

- **Problem**: Validation error during silence detection parsing when segment intervals returned string labels.
- **Root Cause**: Strict `List[Tuple[float, float]]` typing in Pydantic schema rejected enriched metadata dictionaries.
- **Incorrect Approach**: Stripping metadata to fit strict tuple typing.
- **Correct Solution**: Typed `speech_intervals` as `List[Dict[str, Any]]` with union parser supporting both simple timestamps and enriched segment objects.
- **Prevention**: Use Pydantic Union or generic dict structures when backend pipelines return polymorphic analytical data.
- **General Lesson**: Schemas for computer vision and audio analytics should accommodate rich metadata payloads.

---

## Lesson 12: Multi-Directory Search for Uploads & Rendered Outputs

- **Problem**: Rendered video outputs selected for downstream editing failed to load in player or cutter.
- **Root Cause**: `find_upload()` helper only searched `/data/uploads/` and did not check `/data/outputs/`.
- **Incorrect Approach**: Copying rendered files back into the uploads directory.
- **Correct Solution**: Upgraded `find_upload()` to search `/data/uploads/`, `/data/outputs/`, and `/data/image_uploads/` sequentially.
- **Prevention**: Storage lookup utilities must search across all valid asset directories.
- **General Lesson**: Assets produced by a workstation must be first-class inputs for subsequent workflows.

---

## Lesson 13: Optional `end_time` Null-Safety in Route Handlers

- **Problem**: `TypeError: '<=' not supported between instances of 'NoneType' and 'float'` when processing entire videos without explicit end boundaries.
- **Root Cause**: Fast endpoint validations evaluated `if payload.end_time <= payload.start_time:` without verifying if `payload.end_time is not None`.
- **Incorrect Approach**: Defaulting `end_time` to 0 or forcing clients to provide exact float durations.
- **Correct Solution**: Checked `payload.end_time is not None and payload.start_time is not None` before numeric comparisons and used `"end"` string fallbacks during filename generation.
- **Prevention**: Any route accepting optional numeric boundaries must guard comparisons with `is not None` checks.
- **General Lesson**: Optional parameters in Pydantic schemas must be treated as potentially null at all points in the execution trace.

