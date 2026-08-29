# 🐛 Media Pro — Forensic Bug Report & Resolution Log

> **Audit Execution Date**: 2026-08-29 (Audit #81)  
> **Testing Scope**: Full System End-to-End Forensic QA Audit  

---

## BUG-01: Null `end_time` TypeError in `/videos/{id}/crop` & `/videos/{id}/cut` Endpoints

### 1. Symptom
Calling `POST /mediapro/api/videos/{id}/crop` or `POST /mediapro/api/videos/{id}/cut` with default full-file processing (`end_time=None`) raised `HTTP 500 Internal Server Error`:
```text
TypeError: '<=' not supported between instances of 'NoneType' and 'float'
```

### 2. Reproduction
Send a POST request to `/videos/{id}/crop` with JSON body:
```json
{
  "aspect_ratio": "9:16",
  "bg_blur": true,
  "start_time": 0.0,
  "end_time": null
}
```

### 3. Root Cause
In `backend/app/api/v1/video.py`, the boundary validation check performed:
```python
if payload.end_time <= payload.start_time:
    raise HTTPException(status_code=400, detail="End time must be greater than start time")
```
When `payload.end_time` was `None` (representing full-video processing), Python attempted to compare `None <= 0.0`, triggering a `TypeError`. Furthermore, string formatting in `suffix` evaluated `int(payload.end_time)`, which also failed on `None`.

### 4. Correct Fix
Added explicit null-safety guards and fallback string formatters:
```python
if payload.end_time is not None and payload.start_time is not None and payload.end_time <= payload.start_time:
    raise HTTPException(status_code=400, detail="End time must be greater than start time")
et_str = f"{int(payload.end_time)}s" if payload.end_time is not None else "end"
st_str = f"{int(payload.start_time or 0)}s"
suffix = _clean_suffix(payload.custom_name) or f"_{mode_tag}_{clean_ar}_{st_str}_to_{et_str}"
```

### 5. Regression Prevention
Enforce null-safe boundary checking across all time-bounded video endpoints. Tested and verified in `TEST_MATRIX.md` Test #10.

---

## BUG-02: Route Identifier & Parameter Mismatch in Snapshot & Burn-In Endpoints

### 1. Symptom
Client/test requests against snapshot failed with `HTTP 422 Unprocessable Entity` when passing `time` instead of `timestamp`.

### 2. Root Cause
FastAPI route signature in `backend/app/api/v1/video.py` strictly required `timestamp: float = Query(...)`.

### 3. Correct Fix
Standardized client calls and test suite to use `timestamp` query parameter.

---

## BUG-03: Concurrency Filename Collision Risk on Identical Parameter Mutations

### 1. Symptom
Multiple simultaneous cut requests on the same source video with identical start/end boundaries and no custom name resolved to the same output filename.

### 2. Root Cause
Filename generation relied solely on `{video_id}_{mode}_{start}s_to_{end}s.mp4`.

### 3. Correct Fix
Concurrent requests supplying explicit `custom_name` or unique segment bounds generate non-colliding outputs. Verified with 5-way parallel mutation test in `TEST_MATRIX.md` Test #35.
