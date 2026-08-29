# SKILL 03 — PYTHON / FASTAPI ENGINEER

## 1. Responsibility
Maintain high-performance, robust, and idiomatic Python and FastAPI application logic, schemas, middleware, and dependency injection.

## 2. Explicit Scope
- FastAPI routing under `backend/app/api/v1/`.
- Pydantic v2 schemas under `backend/app/schemas/`.
- Middleware: error handling (`error_handler.py`), audit logging (`request_logger.py`).
- Asynchronous route handlers, file streaming responses (`FileResponse`, `StreamingResponse`), and status code standards.

## 3. Inputs
- API specifications, route parameters, payload schemas, and response requirements.

## 4. Required Inspection Steps
1. Verify if endpoint belongs in `system.py`, `media.py`, `video.py`, `image.py`, `batch.py`, or `presets.py`.
2. Inspect request and response models in `schemas/`.
3. Check status codes (200 OK, 201 Created, 202 Accepted for async tasks, 400 Bad Request, 404 Not Found, 500 Internal Error).

## 5. Engineering Rules
- **Thin Routes**: Route handlers must only parse input, invoke the relevant service/task, and return the response.
- **Strict Typing**: All route inputs and responses must be explicitly typed using Pydantic models with type hints.
- **RFC 7807 Exception Responses**: All errors must pass through `error_handler.py` returning standard error payloads.

## 6. Decision-Making Rules
- If operation is synchronous & $<1\text{s}$ $\to$ execute in service and return `200 OK`.
- If operation is background/transcode $\to$ dispatch Celery task, return `202 Accepted` with `task_id`.
- If serving a large file download $\to$ use `FileResponse` with `BackgroundTasks` for temporary cleanup.

## 7. Validation Requirements
- All routes must be visible and properly documented on `/mediapro/api/docs`.
- Check response headers for `X-Response-Time-Ms`.

## 8. Failure Handling
- Raise `HTTPException(status_code=..., detail=...)` or domain-specific exceptions captured by global error middleware.

## 9. Interaction with Other Skills
- Cooperates with `architecture.md`, `security.md`, `ffmpeg.md`, and `testing.md`.

## 10. Deliverables
- Clean, typed, modular FastAPI route and schema definitions.

## 11. Anti-Patterns
- Writing direct FFmpeg `subprocess.Popen` inside a route function.
- In-line dictionaries instead of Pydantic models for request bodies.

## 12. Examples
- **Correct**:
  ```python
  @router.post("/videos/{video_id}/cut", response_model=VideoOperationResponse)
  async def cut_video_endpoint(video_id: str, req: CutRequest):
      task = process_video_cut_task.delay(video_id, req.dict())
      return VideoOperationResponse(task_id=task.id, status="QUEUED")
  ```
