"""Centralized Redis-backed Batch Processing Service for Media Pro.

Manages the lifecycle of multi-item video and image batch processing jobs,
including state tracking, per-item status, progress aggregation, and mass cancellation.
"""
import json
import time
import uuid
import logging
from typing import Dict, Any, List, Optional
import redis

from app.celery_app import celery
from app.config import REDIS_URL, OUTPUT_DIR, IMAGE_OUTPUT_DIR
from app.api.v1.media import find_upload
from app.services.image_storage import find_image_file
from app.tasks.video_tasks import (
    rescale_video_task, crop_video_task, compress_video_task,
    normalize_audio_task, color_grade_task, extract_audio_task,
    burn_in_task, create_gif_task, stabilize_video_task, boomerang_loop_task,
)
from app.tasks.image_tasks import (
    process_image_task, ai_process_image_task, chroma_key_image_task,
    perspective_crop_task,
)

logger = logging.getLogger("mediapro.batch")

# Connect to Redis
redis_client = redis.Redis.from_url(REDIS_URL, decode_responses=True)

BATCH_KEY_PREFIX = "mediapro:batch:"
BATCH_ACTIVE_SET = "mediapro:active_batches"
BATCH_EXPIRY_SECONDS = 86400 * 3  # Keep batch records for 3 days


class BatchService:
    """Orchestrates multi-item batch execution and status aggregation."""

    @staticmethod
    def _get_key(batch_id: str) -> str:
        return f"{BATCH_KEY_PREFIX}{batch_id}"

    @classmethod
    def create_batch(
        cls,
        media_type: str,
        operation: str,
        item_ids: List[str],
        params: Dict[str, Any],
        custom_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Dispatch a unified batch job for videos or images."""
        batch_id = f"batch_{str(uuid.uuid4())[:8]}"
        created_at = time.time()
        tasks = []

        # 1. Dispatch individual items to Celery
        for idx, item_id in enumerate(item_ids):
            task_obj = None
            output_filename = ""

            if media_type == "video":
                task_obj, output_filename = cls._dispatch_video_item(
                    batch_id=batch_id,
                    video_id=item_id,
                    operation=operation,
                    params=params,
                    custom_name=custom_name,
                )
            elif media_type == "image":
                task_obj, output_filename = cls._dispatch_image_item(
                    batch_id=batch_id,
                    image_id=item_id,
                    operation=operation,
                    params=params,
                )

            if task_obj:
                tasks.append({
                    "item_id": item_id,
                    "task_id": task_obj.id,
                    "output_filename": output_filename,
                    "status": "QUEUED",
                    "percent": 0.0,
                    "error": None,
                })

        batch_record = {
            "batch_id": batch_id,
            "media_type": media_type,
            "operation": operation,
            "params": json.dumps(params),
            "custom_name": custom_name or "",
            "status": "PROCESSING" if tasks else "FAILED",
            "total_items": len(tasks),
            "completed_items": 0,
            "failed_items": 0,
            "overall_percent": 0.0,
            "created_at": created_at,
            "updated_at": created_at,
            "tasks": json.dumps(tasks),
        }

        # 2. Store in Redis
        key = cls._get_key(batch_id)
        redis_client.hset(key, mapping=batch_record)
        redis_client.expire(key, BATCH_EXPIRY_SECONDS)
        redis_client.sadd(BATCH_ACTIVE_SET, batch_id)

        return cls.get_batch_status(batch_id)

    @classmethod
    def _dispatch_video_item(
        cls, batch_id: str, video_id: str, operation: str, params: Dict[str, Any], custom_name: Optional[str]
    ):
        matched, original_ext = find_upload(video_id)
        if not matched:
            return None, ""

        op = operation.lower()
        output_filename = ""
        task = None

        if op == "rescale":
            tw = max(16, (int(params.get("target_width", 3840)) // 2) * 2)
            th = max(16, (int(params.get("target_height", 2160)) // 2) * 2)
            output_filename = f"{video_id}_{batch_id}_rescaled_{tw}x{th}.mp4"
            out_path = f"{OUTPUT_DIR}/{output_filename}"
            task = rescale_video_task.delay(
                input_path=matched, output_path=out_path, target_width=tw, target_height=th,
                start_time=float(params.get("start_time", 0.0) or 0.0), end_time=params.get("end_time"),
                algorithm=params.get("algorithm", "lanczos"), framing_mode=params.get("framing_mode", "fit_pad"),
                sharpen_strength=float(params.get("sharpen_strength", 0.0) or 0.0),
                codec=params.get("codec", "auto"), quality_preset=params.get("quality_preset", "high"),
                output_filename=output_filename,
            )

        elif op == "crop":
            aspect = params.get("aspect_ratio", "9:16")
            output_filename = f"{video_id}_{batch_id}_crop_{aspect.replace(':', 'x')}.mp4"
            out_path = f"{OUTPUT_DIR}/{output_filename}"
            task = crop_video_task.delay(
                input_path=matched, output_path=out_path, start_time=0.0, end_time=None,
                aspect_ratio=aspect, bg_blur=bool(params.get("bg_blur", True)),
                output_filename=output_filename,
            )

        elif op == "compress":
            target_mb = float(params.get("target_size_mb", 25.0) or 25.0)
            fmt = params.get("format", "mp4")
            output_filename = f"{video_id}_{batch_id}_compressed_{int(target_mb)}MB.{fmt}"
            out_path = f"{OUTPUT_DIR}/{output_filename}"
            task = compress_video_task.delay(
                input_path=matched, output_path=out_path, start_time=0.0, end_time=None,
                target_size_mb=target_mb, container=fmt, vcodec=params.get("codec", "h264"),
                output_filename=output_filename,
            )

        elif op == "normalize":
            preset = params.get("preset", "youtube_spotify")
            output_filename = f"{video_id}_{batch_id}_norm_{preset}.mp4"
            out_path = f"{OUTPUT_DIR}/{output_filename}"
            task = normalize_audio_task.delay(
                input_path=matched, output_path=out_path, start_time=0.0, end_time=None,
                target_i=float(params.get("target_lufs", -14.0) or -14.0),
                true_peak=float(params.get("true_peak", -1.0) or -1.0),
                lra=float(params.get("loudness_range", 11.0) or 11.0),
                as_audio_only=False, output_filename=output_filename,
            )

        elif op == "colorgrade":
            preset = params.get("preset", "teal_orange")
            output_filename = f"{video_id}_{batch_id}_graded_{preset}.mp4"
            out_path = f"{OUTPUT_DIR}/{output_filename}"
            task = color_grade_task.delay(
                input_path=matched, output_path=out_path, start_time=0.0, end_time=None, preset=preset,
                brightness=float(params.get("brightness", 0.0) or 0.0),
                contrast=float(params.get("contrast", 1.0) or 1.0),
                saturation=float(params.get("saturation", 1.0) or 1.0),
                temperature=float(params.get("temperature", 0.0) or 0.0),
                vignette=float(params.get("vignette", 0.0) or 0.0),
                sharpness=float(params.get("sharpness", 0.0) or 0.0),
                output_filename=output_filename,
            )

        elif op == "audio":
            fmt = params.get("audio_format", "mp3")
            output_filename = f"{video_id}_{batch_id}_extracted.{fmt}"
            out_path = f"{OUTPUT_DIR}/{output_filename}"
            task = extract_audio_task.delay(
                input_path=matched, output_path=out_path, start_time=0.0, end_time=None,
                audio_format=fmt, bitrate=params.get("bitrate", "320k"),
                output_filename=output_filename,
            )

        elif op == "burn_in":
            text = params.get("text_overlay") or params.get("text") or ""
            show_tc = bool(params.get("show_timecode", False))
            output_filename = f"{video_id}_{batch_id}_burnin.mp4"
            out_path = f"{OUTPUT_DIR}/{output_filename}"
            task = burn_in_task.delay(
                input_path=matched, output_path=out_path, start_time=0.0, end_time=None,
                text=text, timecode_mode="smpte" if show_tc else "none",
                position=params.get("position", "bottom-right"),
                font_size=int(params.get("font_size", 28) or 28),
                font_color=params.get("font_color", "white") or "white",
                output_filename=output_filename,
            )

        elif op == "gif":
            output_filename = f"{video_id}_{batch_id}_animated.gif"
            out_path = f"{OUTPUT_DIR}/{output_filename}"
            task = create_gif_task.delay(
                input_path=matched, output_path=out_path, start_time=0.0, end_time=None,
                fps=int(params.get("fps", 15) or 15), width=int(params.get("width", 480) or 480),
                output_filename=output_filename,
            )

        elif op == "stabilize":
            output_filename = f"{video_id}_{batch_id}_stabilized.mp4"
            out_path = f"{OUTPUT_DIR}/{output_filename}"
            task = stabilize_video_task.delay(
                input_path=matched, output_path=out_path, start_time=0.0, end_time=None,
                shakiness=int(params.get("shakiness", 6) or 6),
                smoothing=int(params.get("smoothing", 30) or 30),
                optzoom=1, zoom=0.0, output_filename=output_filename,
            )

        elif op == "boomerang":
            loop_cnt = int(params.get("loop_count", 2) or 2)
            output_filename = f"{video_id}_{batch_id}_boomerang_{loop_cnt}x.mp4"
            out_path = f"{OUTPUT_DIR}/{output_filename}"
            task = boomerang_loop_task.delay(
                input_path=matched, output_path=out_path, start_time=0.0, end_time=None,
                loop_count=loop_cnt, speed=float(params.get("speed", 1.0) or 1.0),
                include_audio=bool(params.get("include_audio", False)),
                output_filename=output_filename,
            )

        return task, output_filename

    @classmethod
    def _dispatch_image_item(
        cls, batch_id: str, image_id: str, operation: str, params: Dict[str, Any]
    ):
        img_path = find_image_file(image_id)
        if not img_path:
            return None, ""

        op = operation.lower()
        p = dict(params)
        p["operation"] = op
        p["suffix"] = f"_{batch_id}_{op}"
        output_filename = f"{image_id}_{batch_id}_{op}.jpg"

        if op.startswith("ai_") or op in ("bg_remove", "upscale", "colorize", "enhance"):
            ai_op = op.replace("ai_", "")
            task = ai_process_image_task.delay(image_id, {"operation": ai_op, **params})
        elif op == "chromakey":
            task = chroma_key_image_task.delay(image_id, params)
        elif op == "perspective_crop":
            task = perspective_crop_task.delay(
                image_id=image_id,
                points=params.get("points", []),
                aspect_ratio=params.get("aspect_ratio", "auto"),
                enhancement=params.get("enhancement", "none"),
            )
        else:
            task = process_image_task.delay(image_id, p)

        return task, output_filename

    @classmethod
    def get_batch_status(cls, batch_id: str) -> Optional[Dict[str, Any]]:
        """Query real-time status of a batch and all its constituent tasks."""
        key = cls._get_key(batch_id)
        raw = redis_client.hgetall(key)
        if not raw:
            return None

        tasks = json.loads(raw.get("tasks", "[]"))
        completed_count = 0
        failed_count = 0
        total_percent = 0.0
        is_cancelled = raw.get("status") == "CANCELLED"

        for item in tasks:
            tid = item["task_id"]
            if is_cancelled and item["status"] != "SUCCESS":
                item["status"] = "CANCELLED"
                item["percent"] = 0.0
                continue

            try:
                from celery.result import AsyncResult
                res = AsyncResult(tid, app=celery)
                state = res.state
                info = res.info if isinstance(res.info, dict) else {}

                if state == "SUCCESS":
                    completed_count += 1
                    item["status"] = "SUCCESS"
                    item["percent"] = 100.0
                    item["result"] = res.result
                    total_percent += 100.0
                elif state == "PROGRESS":
                    item["status"] = "PROGRESS"
                    item["percent"] = float(info.get("percent", 0.0) or 0.0)
                    item["message"] = info.get("message", info.get("status", "Processing..."))
                    total_percent += item["percent"]
                elif state == "FAILURE":
                    failed_count += 1
                    item["status"] = "FAILURE"
                    item["percent"] = 0.0
                    item["error"] = str(res.result or info)
                elif state == "REVOKED":
                    item["status"] = "CANCELLED"
                    item["percent"] = 0.0
                else:
                    item["status"] = "QUEUED"
                    item["percent"] = 0.0
            except Exception as e:
                item["status"] = "FAILURE"
                item["error"] = str(e)
                failed_count += 1

        total_items = max(1, len(tasks))
        overall_percent = round(total_percent / total_items, 1)
        all_done = (completed_count + failed_count) >= total_items

        status = raw.get("status", "PROCESSING")
        if not is_cancelled:
            if all_done:
                status = "COMPLETED" if failed_count == 0 else "PARTIAL_FAILURE"
                redis_client.srem(BATCH_ACTIVE_SET, batch_id)
            else:
                status = "PROCESSING"

        # Update Redis cache
        update_data = {
            "status": status,
            "completed_items": completed_count,
            "failed_items": failed_count,
            "overall_percent": overall_percent,
            "updated_at": time.time(),
            "tasks": json.dumps(tasks),
        }
        redis_client.hset(key, mapping=update_data)

        return {
            "batch_id": batch_id,
            "media_type": raw.get("media_type", "video"),
            "operation": raw.get("operation", "unknown"),
            "custom_name": raw.get("custom_name", ""),
            "status": status,
            "total_items": len(tasks),
            "completed_items": completed_count,
            "failed_items": failed_count,
            "overall_percent": overall_percent,
            "is_all_finished": all_done,
            "created_at": float(raw.get("created_at", 0)),
            "updated_at": float(update_data["updated_at"]),
            "tasks": tasks,
        }

    @classmethod
    def cancel_batch(cls, batch_id: str) -> Dict[str, Any]:
        """Cancel all pending/running tasks in a batch."""
        key = cls._get_key(batch_id)
        raw = redis_client.hgetall(key)
        if not raw:
            return {"batch_id": batch_id, "status": "NOT_FOUND"}

        tasks = json.loads(raw.get("tasks", "[]"))
        for item in tasks:
            tid = item.get("task_id")
            if tid:
                try:
                    celery.control.revoke(tid, terminate=True, signal="SIGKILL")
                except Exception as e:
                    logger.warning(f"Error revoking task {tid}: {e}")

        redis_client.hset(key, mapping={"status": "CANCELLED", "updated_at": time.time()})
        redis_client.srem(BATCH_ACTIVE_SET, batch_id)

        return {"batch_id": batch_id, "status": "CANCELLED", "cancelled_tasks": len(tasks)}

    @classmethod
    def list_active_batches(cls) -> List[Dict[str, Any]]:
        """Return list of all currently active batches."""
        active_ids = redis_client.smembers(BATCH_ACTIVE_SET) or []
        results = []
        for bid in active_ids:
            st = cls.get_batch_status(bid)
            if st and not st["is_all_finished"]:
                results.append(st)
        return results
