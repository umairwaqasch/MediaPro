"""Batch video processing router and task status endpoints."""
import os
import uuid
import json
import asyncio


from fastapi import APIRouter, HTTPException
from celery.result import AsyncResult
from sse_starlette.sse import EventSourceResponse

from app.schemas.batch import (
    BatchProcessRequest, BatchStatusRequest, UniversalBatchSubmitRequest,
    BatchJobSummaryResponse, BatchCancelResponse,
)
from app.services.batch_service import BatchService
from app.config import OUTPUT_DIR
from app.celery_app import celery
from app.tasks.video_tasks import (
    rescale_video_task, crop_video_task, compress_video_task,
    normalize_audio_task, color_grade_task, extract_audio_task,
    burn_in_task, create_gif_task, stabilize_video_task, boomerang_loop_task,
)
from app.api.v1.media import find_upload

router = APIRouter(tags=["Batch & Tasks"])


# ---------------------------------------------------------------------------
# Universal Batch Processing Endpoints (Videos & Images)
# ---------------------------------------------------------------------------

@router.post("/batch/jobs")
async def create_universal_batch_job(payload: UniversalBatchSubmitRequest):
    """Dispatch a unified batch processing job across multiple video or image assets."""
    if not payload.item_ids:
        raise HTTPException(status_code=400, detail="No items provided for batch processing")
    try:
        res = BatchService.create_batch(
            media_type=payload.media_type,
            operation=payload.operation,
            item_ids=payload.item_ids,
            params=payload.params or {},
            custom_name=payload.custom_name,
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dispatch batch: {e}")


@router.get("/batch/jobs/active")
async def list_active_batch_jobs():
    """List all currently active / running batches."""
    return {"batches": BatchService.list_active_batches()}


@router.get("/batch/jobs/{batch_id}")
async def get_batch_job_status(batch_id: str):
    """Query aggregated status and per-item progress for a batch."""
    st = BatchService.get_batch_status(batch_id)
    if not st:
        raise HTTPException(status_code=404, detail="Batch job not found")
    return st



@router.post("/batch/jobs/{batch_id}/cancel")
async def cancel_batch_job(batch_id: str):
    """Cancel all active and queued tasks within a batch."""
    res = BatchService.cancel_batch(batch_id)
    if res.get("status") == "NOT_FOUND":
        raise HTTPException(status_code=404, detail="Batch job not found")
    return res


@router.get("/batch/jobs/{batch_id}/events")
async def batch_job_events_sse(batch_id: str):
    """Server-Sent Events stream for real-time progress of an entire batch."""
    async def batch_event_generator():
        while True:
            st = BatchService.get_batch_status(batch_id)
            if not st:
                yield {"event": "error", "data": json.dumps({"error": "Batch not found"})}
                break

            data_str = json.dumps(st)
            yield {"event": "update", "data": data_str}

            if st["is_all_finished"] or st["status"] in ("COMPLETED", "PARTIAL_FAILURE", "CANCELLED", "FAILED"):
                yield {"event": "complete", "data": data_str}
                break

            await asyncio.sleep(1.0)

    return EventSourceResponse(batch_event_generator())


# ---------------------------------------------------------------------------
# Legacy Video Batch Endpoint
# ---------------------------------------------------------------------------



@router.post("/batch/process")
async def batch_process_jobs(payload: BatchProcessRequest):
    """Dispatch a batch processing job across multiple staged videos."""
    if not payload.video_ids:
        raise HTTPException(status_code=400, detail="No video IDs provided")
    batch_id = str(uuid.uuid4())[:8]
    tasks = []
    operation = (payload.operation or 'rescale').lower()
    params = payload.params or {}

    for vid in payload.video_ids:
        matched, _ = find_upload(vid)
        if not matched or not os.path.exists(matched):
            safe_f = os.path.basename(vid)
            if safe_f.startswith("out_"):
                safe_f = safe_f[4:]
            out_f = os.path.join(OUTPUT_DIR, safe_f)
            if os.path.exists(out_f):
                matched = out_f
            else:
                continue

        t = None
        output_filename = ""

        if operation == "rescale":
            tw = max(16, (int(params.get("target_width", 3840)) // 2) * 2)
            th = max(16, (int(params.get("target_height", 2160)) // 2) * 2)
            output_filename = f"{vid}_{batch_id}_rescaled_{tw}x{th}.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = rescale_video_task.delay(input_path=matched, output_path=output_path, target_width=tw, target_height=th, start_time=float(params.get("start_time", 0.0) or 0.0), end_time=params.get("end_time"), algorithm=params.get("algorithm", "lanczos"), framing_mode=params.get("framing_mode", "fit_pad"), sharpen_strength=float(params.get("sharpen_strength", 0.0) or 0.0), codec=params.get("codec", "auto"), quality_preset=params.get("quality_preset", "high"), output_filename=output_filename)

        elif operation == "crop":
            aspect = params.get("aspect_ratio", "9:16")
            output_filename = f"{vid}_{batch_id}_crop_{aspect.replace(':', 'x')}.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = crop_video_task.delay(input_path=matched, output_path=output_path, start_time=0.0, end_time=None, aspect_ratio=aspect, bg_blur=bool(params.get("bg_blur", True)), output_filename=output_filename)

        elif operation == "compress":
            target_mb = float(params.get("target_size_mb", 25.0) or 25.0)
            fmt = params.get("format", "mp4")
            output_filename = f"{vid}_{batch_id}_compressed_{int(target_mb)}MB.{fmt}"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = compress_video_task.delay(input_path=matched, output_path=output_path, start_time=0.0, end_time=None, target_size_mb=target_mb, container=fmt, vcodec=params.get("codec", "h264"), output_filename=output_filename)

        elif operation == "normalize":
            preset = params.get("preset", "youtube_spotify")
            output_filename = f"{vid}_{batch_id}_norm_{preset}.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = normalize_audio_task.delay(input_path=matched, output_path=output_path, start_time=0.0, end_time=None, target_i=float(params.get("target_lufs", -14.0) or -14.0), true_peak=float(params.get("true_peak", -1.0) or -1.0), lra=float(params.get("loudness_range", 11.0) or 11.0), as_audio_only=False, output_filename=output_filename)

        elif operation == "colorgrade":
            preset = params.get("preset", "teal_orange")
            output_filename = f"{vid}_{batch_id}_graded_{preset}.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = color_grade_task.delay(input_path=matched, output_path=output_path, start_time=0.0, end_time=None, preset=preset, brightness=float(params.get("brightness", 0.0) or 0.0), contrast=float(params.get("contrast", 1.0) or 1.0), saturation=float(params.get("saturation", 1.0) or 1.0), temperature=float(params.get("temperature", 0.0) or 0.0), vignette=float(params.get("vignette", 0.0) or 0.0), sharpness=float(params.get("sharpness", 0.0) or 0.0), output_filename=output_filename)

        elif operation == "audio":
            fmt = params.get("audio_format", "mp3")
            output_filename = f"{vid}_{batch_id}_extracted.{fmt}"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = extract_audio_task.delay(input_path=matched, output_path=output_path, start_time=0.0, end_time=None, audio_format=fmt, bitrate=params.get("bitrate", "320k"), output_filename=output_filename)

        elif operation == "burn_in":
            text = params.get("text_overlay") or params.get("text") or ""
            show_tc = bool(params.get("show_timecode", False))
            timecode_mode = "smpte" if show_tc else "none"
            output_filename = f"{vid}_{batch_id}_burnin.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = burn_in_task.delay(input_path=matched, output_path=output_path, start_time=0.0, end_time=None, text=text, timecode_mode=timecode_mode, position=params.get("position", "bottom-right"), font_size=int(params.get("font_size", 28) or 28), font_color=params.get("font_color", "white") or "white", output_filename=output_filename)

        elif operation == "gif":
            output_filename = f"{vid}_{batch_id}_animated.gif"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = create_gif_task.delay(input_path=matched, output_path=output_path, start_time=0.0, end_time=None, fps=int(params.get("fps", 15) or 15), width=int(params.get("width", 480) or 480), output_filename=output_filename)

        elif operation == "stabilize":
            output_filename = f"{vid}_{batch_id}_stabilized.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = stabilize_video_task.delay(input_path=matched, output_path=output_path, start_time=0.0, end_time=None, shakiness=int(params.get("shakiness", 6) or 6), smoothing=int(params.get("smoothing", 30) or 30), optzoom=1, zoom=0.0, output_filename=output_filename)

        elif operation == "boomerang":
            loop_cnt = int(params.get("loop_count", 2) or 2)
            output_filename = f"{vid}_{batch_id}_boomerang_{loop_cnt}x.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = boomerang_loop_task.delay(input_path=matched, output_path=output_path, start_time=0.0, end_time=None, loop_count=loop_cnt, speed=float(params.get("speed", 1.0) or 1.0), include_audio=bool(params.get("include_audio", False)), output_filename=output_filename)

        if t:
            tasks.append({"video_id": vid, "task_id": t.id, "output_filename": output_filename})

    return {"batch_id": batch_id, "operation": operation, "total_tasks": len(tasks), "tasks": tasks}


@router.post("/batch/status")
async def get_batch_status(payload: BatchStatusRequest):
    """Get consolidated status of multiple Celery background tasks."""
    statuses = []
    completed_count = failed_count = 0
    total_percent = 0.0
    for tid in payload.task_ids:
        try:
            res = AsyncResult(tid, app=celery)
            state = res.state
            info = res.info or {}
            st = {"task_id": tid, "state": state, "percent": 0.0, "speed": "", "status": "Queued"}
            if state == "PROGRESS":
                st["percent"] = float(info.get("percent", 0.0) or 0.0)
                st["speed"] = info.get("speed", "")
                st["status"] = info.get("status", "Processing...")
                total_percent += st["percent"]
            elif state == "SUCCESS":
                st["percent"] = 100.0
                st["status"] = "Completed"
                st["result"] = res.result
                completed_count += 1
                total_percent += 100.0
            elif state == "FAILURE":
                st["status"] = "Failed"
                st["error"] = str(info)
                failed_count += 1
            statuses.append(st)
        except Exception as e:
            statuses.append({"task_id": tid, "state": "FAILURE", "error": str(e), "percent": 0.0})
    total_count = len(payload.task_ids)
    all_finished = (completed_count + failed_count) >= total_count
    return {"total_tasks": total_count, "total": total_count, "completed_count": completed_count, "completed": completed_count, "failed_count": failed_count, "failed": failed_count, "overall_percent": round(total_percent / max(1, total_count), 1), "is_all_finished": all_finished, "all_done": all_finished, "tasks": statuses}


@router.post("/tasks/{task_id}/cancel")
async def cancel_task(task_id: str):
    """Revoke (cancel) a running Celery task."""
    celery.control.revoke(task_id, terminate=True, signal="SIGKILL")
    return {"status": "REVOKED", "task_id": task_id}


@router.post("/tasks/clear-completed")
async def clear_completed_tasks():
    """Clear all completed task results from Celery backend."""
    celery.control.purge()
    return {"status": "CLEARED"}


@router.get("/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    """Get status of a running background task with unified status and state."""
    try:
        result = AsyncResult(task_id, app=celery)
        state = result.state
        response = {"task_id": task_id, "state": state, "status": state}
        if state == "PROGRESS":
            response.update(result.info or {})
        elif state == "SUCCESS":
            response["result"] = result.result
            response["percent"] = 100.0
            response["status"] = "SUCCESS"
        elif state == "FAILURE":
            response["error"] = str(result.info) if result.info else "Task failed"
            response["percent"] = 0.0
            response["status"] = "FAILURE"
        return response
    except Exception as e:
        return {"task_id": task_id, "state": "FAILURE", "status": "FAILURE", "error": str(e), "percent": 0.0}


@router.get("/tasks/{task_id}/events")
async def task_events_sse(task_id: str):
    """SSE endpoint for streaming task progress updates."""
    async def event_generator():
        while True:
            result = AsyncResult(task_id, app=celery)
            data = {"state": result.state}
            if result.state == "PROGRESS":
                data.update(result.info or {})
            elif result.state == "SUCCESS":
                data["result"] = result.result
                data["percent"] = 100.0
                yield {"event": "update", "data": str(data)}
                yield {"event": "complete", "data": str(data)}
                break
            elif result.state == "FAILURE":
                data["error"] = str(result.info or "Task failed")
                yield {"event": "error", "data": str(data)}
                break
            yield {"event": "update", "data": str(data)}
            await asyncio.sleep(0.5)
    return EventSourceResponse(event_generator())
