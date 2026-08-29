from app.schemas.audio import AudioMasterRequest, AudioWaveformResponse
from app.services.audio_service import AudioService
"""Video processing domain router — all /videos/* endpoints."""
import os
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query, Body, BackgroundTasks
from fastapi.responses import FileResponse, StreamingResponse

from app.config import OUTPUT_DIR, THUMBNAIL_DIR, API_PREFIX
from app.schemas.video import (
    CutRequest, MultiCutRequest, GifRequest, AudioRequest, ConcatRequest, CropRequest,
    BurnInRequest, SilenceDetectRequest, SilenceJumpCutRequest,
    CompressRequest, SceneDetectRequest, SceneSplitRequest,
    StabilizeRequest, NormalizeAudioRequest, BoomerangRequest,
    SplitScreenRequest, ColorGradeRequest, RescaleRequest,
)
from app.services.ffmpeg_service import (
    probe_video, capture_snapshot, detect_silence_intervals,
    detect_scene_changes, generate_audio_waveform, measure_audio_loudness,
)
from app.schemas.face import FaceExtractionRequest
from app.tasks.face_tasks import extract_unique_faces_task
from celery.result import AsyncResult
from app.celery_app import celery
import io
import zipfile
from fastapi.responses import StreamingResponse
from app.tasks.video_tasks import (
    cut_video_task, create_gif_task, extract_audio_task, concat_segments_task,
    crop_video_task, burn_in_task, silence_jump_cut_task, compress_video_task,
    split_scenes_task, stabilize_video_task, normalize_audio_task,
    boomerang_loop_task, split_screen_task, color_grade_task, rescale_video_task,
    master_audio_task,
)
from app.api.v1.media import find_upload

router = APIRouter(tags=["Video"])


def _clean_suffix(custom_name: str | None) -> str | None:
    if not custom_name:
        return None
    clean = "".join(c for c in custom_name if c.isalnum() or c in ("-", "_")).strip()
    return f"_{clean}" if clean else None


@router.get("/videos/{video_id}/snapshot")
async def get_snapshot(
    video_id: str,
    timestamp: float = Query(..., ge=0),
    format: str = Query("png", pattern="^(png|jpg)$"),
):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Video not found")
    snap_filename = f"{video_id}_snap_{int(timestamp * 1000)}.{format}"
    snap_path = os.path.join(OUTPUT_DIR, snap_filename)
    try:
        capture_snapshot(matched, snap_path, timestamp, format)
        return FileResponse(snap_path, media_type=f"image/{format}", filename=snap_filename)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Snapshot failed: {e}")


@router.post("/videos/{video_id}/cut")
async def create_cut_job(video_id: str, payload: CutRequest):
    matched, original_ext = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    if payload.end_time is not None and payload.start_time is not None and payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="End time must be greater than start time")
    et_str = f"{int(payload.end_time)}s" if payload.end_time is not None else "end"
    st_str = f"{int(payload.start_time or 0)}s"
    suffix = _clean_suffix(payload.custom_name) or f"_{payload.mode}_{st_str}_to_{et_str}"
    if payload.speed != 1.0 and not payload.custom_name:
        suffix += f"_{payload.speed}x"
    if payload.audio_mode == "mute" and not payload.custom_name:
        suffix += "_muted"
    output_filename = f"{video_id}{suffix}{original_ext}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    task = cut_video_task.delay(input_path=matched, output_path=output_path, start_time=payload.start_time, end_time=payload.end_time, mode=payload.mode, audio_mode=payload.audio_mode, speed=payload.speed, volume_gain=payload.volume_gain, output_filename=output_filename)
    return {"task_id": task.id, "video_id": video_id, "output_filename": output_filename, "start_time": payload.start_time, "end_time": payload.end_time, "mode": payload.mode}


@router.post("/videos/{video_id}/multi-cut")
async def multi_cut_job(video_id: str, payload: MultiCutRequest):
    """Cut multiple queued segments into separate video files simultaneously."""
    matched, original_ext = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    if not payload.segments:
        raise HTTPException(status_code=400, detail="No segments provided for multi-cut")
    
    tasks = []
    for idx, seg in enumerate(payload.segments, 1):
        st = float(seg.start_time or 0.0)
        et = float(seg.end_time) if seg.end_time is not None else None
        if et is not None and et <= st:
            continue
        seg_label = _clean_suffix(seg.label) or f"_clip{idx:02d}"
        custom_base = _clean_suffix(payload.custom_name) or ""
        out_name = f"{video_id}{custom_base}{seg_label}_{int(st)}s_to_{int(et if et else 0)}s{original_ext}"
        out_path = os.path.join(OUTPUT_DIR, out_name)
        task = cut_video_task.delay(
            input_path=matched,
            output_path=out_path,
            start_time=st,
            end_time=et,
            mode=payload.mode or "fast",
            output_filename=out_name,
        )
        tasks.append({
            "task_id": task.id,
            "clip_index": idx,
            "start_time": st,
            "end_time": et,
            "output_filename": out_name,
        })
    return {
        "status": "QUEUED",
        "video_id": video_id,
        "total_clips": len(tasks),
        "tasks": tasks,
    }


@router.post("/videos/{video_id}/gif")
async def create_gif_job(video_id: str, payload: GifRequest):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    et_str = f"{int(payload.end_time)}s" if payload.end_time is not None else "end"
    suffix = _clean_suffix(payload.custom_name) or f"_gif_{int(payload.start_time or 0)}s_to_{et_str}"
    output_filename = f"{video_id}{suffix}.gif"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    task = create_gif_task.delay(input_path=matched, output_path=output_path, start_time=payload.start_time, end_time=payload.end_time, fps=payload.fps, width=payload.width, output_filename=output_filename)
    return {"task_id": task.id, "video_id": video_id, "output_filename": output_filename, "type": "gif"}


@router.post("/videos/{video_id}/audio")
async def create_audio_job(video_id: str, payload: AudioRequest):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    fmt = payload.get_format() if hasattr(payload, 'get_format') else (payload.format or payload.audio_format or "mp3")
    st = float(payload.start_time or 0.0)
    et = float(payload.end_time) if payload.end_time is not None else None
    suffix = _clean_suffix(payload.custom_name) or f"_audio_{int(st)}s_to_{int(et if et else 0)}s"
    output_filename = f"{video_id}{suffix}.{fmt}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    task = extract_audio_task.delay(input_path=matched, output_path=output_path, start_time=st, end_time=et, audio_format=fmt, bitrate=payload.bitrate or "192k", output_filename=output_filename)
    return {"task_id": task.id, "video_id": video_id, "output_filename": output_filename, "type": "audio"}


@router.post("/videos/{video_id}/concat")
async def create_concat_job(video_id: str, payload: ConcatRequest):
    matched, original_ext = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    if not payload.segments or len(payload.segments) < 2:
        raise HTTPException(status_code=400, detail="At least 2 segments required")
    suffix = _clean_suffix(payload.custom_name) or f"_highlight_{len(payload.segments)}clips"
    output_filename = f"{video_id}{suffix}{original_ext}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    segments_data = [{"start_time": s.start_time, "end_time": s.end_time} for s in payload.segments]
    task = concat_segments_task.delay(input_path=matched, output_path=output_path, segments=segments_data, output_filename=output_filename)
    return {"task_id": task.id, "video_id": video_id, "output_filename": output_filename, "segment_count": len(payload.segments)}


@router.post("/videos/{video_id}/crop")
async def crop_video_job(video_id: str, payload: CropRequest):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    if payload.end_time is not None and payload.start_time is not None and payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="End time must be greater than start time")
    clean_ar = (payload.aspect_ratio or "crop").replace(":", "x")
    mode_tag = "blur" if payload.bg_blur else "crop"
    et_str = f"{int(payload.end_time)}s" if payload.end_time is not None else "end"
    st_str = f"{int(payload.start_time or 0)}s"
    suffix = _clean_suffix(payload.custom_name) or f"_{mode_tag}_{clean_ar}_{st_str}_to_{et_str}"
    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    task = crop_video_task.delay(input_path=matched, output_path=output_path, start_time=payload.start_time, end_time=payload.end_time, crop_x=payload.crop_x, crop_y=payload.crop_y, crop_width=payload.crop_width, crop_height=payload.crop_height, aspect_ratio=payload.aspect_ratio, bg_blur=payload.bg_blur, output_filename=output_filename)
    return {"task_id": task.id, "video_id": video_id, "output_filename": output_filename, "aspect_ratio": payload.aspect_ratio, "type": "crop"}


@router.post("/videos/{video_id}/burn-in")
async def burn_in_overlay_job(video_id: str, payload: BurnInRequest):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    if payload.end_time is not None and payload.start_time is not None and payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="End time must be greater than start time")
    mode_tag = "tc" if payload.timecode_mode and payload.timecode_mode != "none" else "overlay"
    et_str = f"{int(payload.end_time)}s" if payload.end_time is not None else "end"
    suffix = _clean_suffix(payload.custom_name) or f"_{mode_tag}_{int(payload.start_time or 0)}s_to_{et_str}"
    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    task = burn_in_task.delay(input_path=matched, output_path=output_path, start_time=payload.start_time, end_time=payload.end_time, text=payload.text or "", timecode_mode=payload.timecode_mode or "none", position=payload.position or "bottom-right", font_size=payload.font_size or 28, font_color=payload.font_color or "white", bg_box=True if payload.bg_box is None else payload.bg_box, bg_opacity=0.6 if payload.bg_opacity is None else payload.bg_opacity, output_filename=output_filename)
    return {"task_id": task.id, "video_id": video_id, "output_filename": output_filename, "timecode_mode": payload.timecode_mode, "type": "burn_in"}


@router.post("/videos/{video_id}/silence/detect")
async def detect_video_silence(video_id: str, payload: SilenceDetectRequest):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    try:
        res = detect_silence_intervals(input_path=matched, noise_db=payload.noise_db or -30.0, min_silence_duration=payload.min_silence_duration or 0.5, padding=payload.padding or 0.05)
        return {"video_id": video_id, **res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Silence detection failed: {e}")


@router.post("/videos/{video_id}/silence/jump-cut")
async def silence_jump_cut_job(video_id: str, payload: SilenceJumpCutRequest):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    speech_intervals = payload.speech_intervals
    if not speech_intervals:
        detection = detect_silence_intervals(input_path=matched, noise_db=payload.noise_db or -30.0, min_silence_duration=payload.min_silence_duration or 0.5, padding=payload.padding or 0.05)
        speech_intervals = detection.get("speech_intervals", [])
    if not speech_intervals:
        raise HTTPException(status_code=400, detail="No speech intervals found")
    suffix = _clean_suffix(payload.custom_name) or f"_jumpcut_{len(speech_intervals)}segs"
    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    task = silence_jump_cut_task.delay(input_path=matched, output_path=output_path, speech_intervals=speech_intervals, output_filename=output_filename)
    return {"task_id": task.id, "video_id": video_id, "output_filename": output_filename, "segments_count": len(speech_intervals), "type": "silence_jump_cut"}


@router.post("/videos/{video_id}/compress")
async def compress_video_job(video_id: str, payload: CompressRequest):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    container = (payload.container or "mp4").lower().strip()
    vcodec = (payload.vcodec or "h264").lower().strip()
    target_size_mb = max(0.5, float(payload.target_size_mb or 8.0))
    suffix = _clean_suffix(payload.custom_name) or f"_{target_size_mb:.0f}mb_{vcodec}"
    output_filename = f"{video_id}{suffix}.{container}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    task = compress_video_task.delay(input_path=matched, output_path=output_path, start_time=payload.start_time, end_time=payload.end_time, target_size_mb=target_size_mb, container=container, vcodec=vcodec, output_filename=output_filename)
    return {"task_id": task.id, "video_id": video_id, "output_filename": output_filename, "target_size_mb": target_size_mb, "type": "compress"}


@router.post("/videos/{video_id}/scenes/detect")
async def detect_scenes_endpoint(video_id: str, payload: SceneDetectRequest):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    threshold = max(0.1, min(0.9, float(payload.threshold or 0.4)))
    return detect_scene_changes(input_path=matched, threshold=threshold, min_duration=max(0.1, float(payload.min_duration or 0.5)))


@router.post("/videos/{video_id}/scenes/split")
async def split_scenes_endpoint(video_id: str, payload: SceneSplitRequest):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    scenes = payload.scenes or detect_scene_changes(input_path=matched, threshold=payload.threshold or 0.4, min_duration=payload.min_duration or 0.5).get("scenes", [])
    if not scenes:
        raise HTTPException(status_code=400, detail="No scenes found to split")
    task = split_scenes_task.delay(input_path=matched, output_dir=OUTPUT_DIR, video_id=video_id, scenes=scenes, custom_name=payload.custom_name)
    return {"task_id": task.id, "video_id": video_id, "scenes_count": len(scenes), "type": "split_scenes"}


@router.post("/videos/{video_id}/stabilize")
async def stabilize_video_job(video_id: str, payload: StabilizeRequest):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    shakiness = max(1, min(10, int(payload.shakiness or 6)))
    smoothing = max(1, min(100, int(payload.smoothing or 30)))
    suffix = _clean_suffix(payload.custom_name) or f"_stabilized_s{smoothing}"
    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    task = stabilize_video_task.delay(input_path=matched, output_path=output_path, start_time=payload.start_time, end_time=payload.end_time, shakiness=shakiness, smoothing=smoothing, optzoom=1 if payload.optzoom is None or payload.optzoom == 1 else 0, zoom=float(payload.zoom or 0.0), output_filename=output_filename)
    return {"task_id": task.id, "video_id": video_id, "output_filename": output_filename, "type": "stabilize"}


@router.get("/videos/{video_id}/waveform")
async def get_video_waveform(video_id: str):
    waveform_filename = f"{video_id}_waveform.png"
    waveform_path = os.path.join(THUMBNAIL_DIR, waveform_filename)
    if os.path.exists(waveform_path) and os.path.getsize(waveform_path) > 0:
        return FileResponse(waveform_path, media_type="image/png")
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    res = generate_audio_waveform(matched, waveform_path)
    if not res or not os.path.exists(waveform_path):
        raise HTTPException(status_code=404, detail="No audio stream found")
    return FileResponse(waveform_path, media_type="image/png")


@router.post("/videos/{video_id}/loudness/measure")
async def measure_loudness_endpoint(video_id: str):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    try:
        return {"video_id": video_id, "metrics": measure_audio_loudness(matched)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/videos/{video_id}/loudness/normalize")
async def normalize_audio_job(video_id: str, payload: NormalizeAudioRequest):
    matched, ext = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    target_i = float(payload.target_i or -14.0)
    as_audio_only = bool(payload.as_audio_only)
    suffix = _clean_suffix(payload.custom_name) or f"_norm_{int(abs(target_i))}lufs"
    out_ext = ".mp3" if as_audio_only else ext
    output_filename = f"{video_id}{suffix}{out_ext}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    task = normalize_audio_task.delay(input_path=matched, output_path=output_path, start_time=payload.start_time, end_time=payload.end_time, target_i=target_i, true_peak=float(payload.true_peak or -1.0), lra=float(payload.lra or 11.0), as_audio_only=as_audio_only, output_filename=output_filename)
    return {"task_id": task.id, "video_id": video_id, "output_filename": output_filename, "target_i": target_i, "type": "normalize_audio"}


@router.post("/videos/{video_id}/boomerang")
async def boomerang_video_job(video_id: str, payload: BoomerangRequest):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    loop_count = max(1, min(10, int(payload.loop_count or 2)))
    speed = max(0.25, min(4.0, float(payload.speed or 1.0)))
    suffix = _clean_suffix(payload.custom_name) or f"_boomerang_{loop_count}x"
    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    task = boomerang_loop_task.delay(input_path=matched, output_path=output_path, start_time=payload.start_time, end_time=payload.end_time, loop_count=loop_count, speed=speed, include_audio=bool(payload.include_audio), output_filename=output_filename)
    return {"task_id": task.id, "video_id": video_id, "output_filename": output_filename, "type": "boomerang"}


@router.post("/videos/{video_id}/splitscreen")
async def split_screen_job(video_id: str, payload: SplitScreenRequest):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    processed_path = os.path.join(OUTPUT_DIR, payload.processed_video_filename)
    if not os.path.exists(processed_path):
        raise HTTPException(status_code=404, detail="Processed video file not found")
    suffix = _clean_suffix(payload.custom_name) or f"_splitscreen_{payload.layout or 'sbs'}"
    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    task = split_screen_task.delay(source_path=matched, processed_path=processed_path, output_path=output_path, start_time=float(payload.start_time or 0.0), duration=float(payload.duration or 5.0), layout=payload.layout or "side_by_side", label_left=payload.label_left or "ORIGINAL", label_right=payload.label_right or "PROCESSED", output_filename=output_filename)
    return {"task_id": task.id, "video_id": video_id, "output_filename": output_filename, "layout": payload.layout, "type": "split_screen"}


@router.post("/videos/{video_id}/colorgrade")
async def color_grade_video_job(video_id: str, payload: ColorGradeRequest):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    preset = payload.get_preset() if hasattr(payload, 'get_preset') else (payload.lut or payload.preset or "none")
    suffix = _clean_suffix(payload.custom_name) or f"_graded_{preset}"
    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    st = float(payload.start_time or 0.0)
    et = float(payload.end_time) if payload.end_time is not None else None
    task = color_grade_task.delay(input_path=matched, output_path=output_path, start_time=st, end_time=et, preset=preset, brightness=float(payload.brightness or 0.0), contrast=float(payload.contrast or 1.0), saturation=float(payload.saturation or 1.0), temperature=float(payload.temperature or 0.0), vignette=float(payload.vignette or 0.0), sharpness=float(payload.sharpness or 0.0), output_filename=output_filename)
    return {"task_id": task.id, "video_id": video_id, "output_filename": output_filename, "preset": preset, "type": "color_grade"}


@router.post("/videos/{video_id}/rescale")
async def rescale_video_job(video_id: str, payload: RescaleRequest):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    tw = max(16, (int(payload.target_width) // 2) * 2)
    th = max(16, (int(payload.target_height) // 2) * 2)
    suffix = _clean_suffix(payload.custom_name) or f"_rescaled_{tw}x{th}"
    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    task = rescale_video_task.delay(input_path=matched, output_path=output_path, target_width=tw, target_height=th, start_time=float(payload.start_time or 0.0), end_time=payload.end_time, algorithm=payload.algorithm or "lanczos", framing_mode=payload.framing_mode or "fit_pad", sharpen_strength=float(payload.sharpen_strength or 0.0), codec=payload.codec or "auto", quality_preset=payload.quality_preset or "high", output_filename=output_filename)
    return {"task_id": task.id, "video_id": video_id, "output_filename": output_filename, "target_width": tw, "target_height": th, "type": "rescale_video"}


@router.get("/videos/{video_id}/audio/waveform", response_model=AudioWaveformResponse)
async def get_audio_waveform_data(video_id: str, points: int = Query(400, ge=50, le=1200)):
    """Extract fast normalized peak points for interactive UI audio waveform rendering."""
    src, _ = find_upload(video_id)
    if not src:
        raise HTTPException(status_code=404, detail="Video not found")
    try:
        data = AudioService.extract_waveform_peaks(src, num_points=points)
        return {
            "video_id": video_id,
            "sample_rate": data.get("sample_rate", 48000),
            "duration": data.get("duration", 0.0),
            "channels": data.get("channels", 2),
            "peaks": data.get("peaks", []),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to extract waveform: {e}")


@router.post("/videos/{video_id}/audio/master")
async def master_audio(video_id: str, req: AudioMasterRequest):
    """Apply 4-band EQ, vocal clarity, de-esser, and broadcast loudness normalization."""
    src, _ = find_upload(video_id)
    if not src:
        raise HTTPException(status_code=404, detail="Video not found")

    ext = f".{req.audio_format.lower()}" if req.as_audio_only else Path(src).suffix
    out_filename = f"{video_id}_audio_master{ext}"
    out_path = os.path.join(OUTPUT_DIR, out_filename)

    filter_graph = AudioService.build_mastering_filters(req.model_dump())

    task = master_audio_task.delay(
        input_path=src,
        output_path=out_path,
        audio_filters=filter_graph,
        as_audio_only=req.as_audio_only,
        audio_format=req.audio_format,
        output_filename=out_filename,
    )
    return {"task_id": task.id, "status": "QUEUED", "output_filename": out_filename}


# ---------- Video Probing & Transform Aliases ----------
@router.get("/videos/{video_id}/probe")
async def probe_video_endpoint(video_id: str):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Video not found")
    from app.services.ffmpeg_service import probe_video
    return probe_video(matched)


@router.post("/videos/{video_id}/transform")
async def transform_video_endpoint(video_id: str, payload: dict = Body(...)):
    matched, ext = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Video not found")
    speed = float(payload.get("speed", 1.0))
    output_filename = f"{video_id}_transformed_{speed}x{ext}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    task = cut_video_task.delay(
        input_path=matched,
        output_path=output_path,
        start_time=0.0,
        end_time=None,
        mode="accurate",
        speed=speed,
        output_filename=output_filename,
    )
    return {"task_id": task.id, "video_id": video_id, "output_filename": output_filename, "status": "QUEUED"}


@router.post("/audio/master")
async def master_audio_top_level(payload: dict = Body(...)):
    vid_id = payload.get("video_id")
    if not vid_id:
        raise HTTPException(status_code=400, detail="video_id required")
    matched, _ = find_upload(vid_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Video not found")
    output_filename = f"{vid_id}_mastered.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)
    filter_graph = AudioService.build_mastering_filters(payload)
    task = master_audio_task.delay(
        input_path=matched,
        output_path=output_path,
        audio_filters=filter_graph,
        as_audio_only=payload.get("as_audio_only", False),
        audio_format=payload.get("audio_format", "mp3"),
        output_filename=output_filename,
    )
    return {"task_id": task.id, "video_id": vid_id, "output_filename": output_filename, "status": "QUEUED"}


# ---------- Plan 08: AI Unique Face Extractor & Best-Shot Gallery ----------
@router.post("/videos/{video_id}/faces/extract")
async def extract_faces_from_video(video_id: str, payload: FaceExtractionRequest = FaceExtractionRequest()):
    """Start background AI face detection, neural clustering and best-shot extraction."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    task = extract_unique_faces_task.delay(
        video_id=video_id,
        video_path=matched,
        sample_rate_fps=float(payload.sample_rate_fps or 1.5),
        similarity_threshold=float(payload.similarity_threshold or 0.65),
        min_face_size=int(payload.min_face_size or 40),
        max_frames=int(payload.max_frames or 300),
    )
    return {
        "task_id": task.id,
        "video_id": video_id,
        "status": "QUEUED",
        "message": "AI face extraction task queued"
    }


@router.get("/videos/{video_id}/faces/{task_id}")
async def get_face_extraction_status(video_id: str, task_id: str):
    """Query the progress or complete results of a face extraction job."""
    res = AsyncResult(task_id, app=celery)
    state = res.state
    if state == "SUCCESS":
        return res.result
    elif state == "PROGRESS":
        meta = res.info if isinstance(res.info, dict) else {}
        return {
            "task_id": task_id,
            "video_id": video_id,
            "status": "PROGRESS",
            "percent": meta.get("percent", 10.0),
            "message": meta.get("message", "Processing video frames..."),
        }
    elif state == "FAILURE":
        return {
            "task_id": task_id,
            "video_id": video_id,
            "status": "FAILURE",
            "error": str(res.result),
        }
    return {
        "task_id": task_id,
        "video_id": video_id,
        "status": "PENDING",
        "percent": 0.0,
        "message": "Task queued in worker...",
    }


@router.get("/videos/{video_id}/faces/{task_id}/download-zip")
async def download_faces_zip(video_id: str, task_id: str, background_tasks: BackgroundTasks = None):
    """Download all unique headshot photographs packaged into a ZIP archive."""
    import tempfile

    res = AsyncResult(task_id, app=celery)
    if res.state != "SUCCESS" or not isinstance(res.result, dict):
        raise HTTPException(status_code=400, detail="Face extraction task is not completed yet")

    people = res.result.get("people", [])
    if not people:
        raise HTTPException(status_code=404, detail="No faces were detected in this video")

    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    temp_zip_path = temp_zip.name
    temp_zip.close()

    with zipfile.ZipFile(temp_zip_path, "w", zipfile.ZIP_STORED) as zip_file:
        for p in people:
            h_filename = p.get("headshot_filename")
            if h_filename:
                h_path = os.path.join(OUTPUT_DIR, h_filename)
                if os.path.isfile(h_path):
                    zip_file.write(h_path, arcname=f"headshots/{h_filename}")

            f_filename = p.get("fullframe_filename")
            if f_filename:
                f_path = os.path.join(OUTPUT_DIR, f_filename)
                if os.path.isfile(f_path):
                    zip_file.write(f_path, arcname=f"full_frames/{f_filename}")

    zip_name = f"{video_id}_unique_faces.zip"
    if background_tasks:
        background_tasks.add_task(os.remove, temp_zip_path)

    return FileResponse(
        temp_zip_path,
        media_type="application/zip",
        filename=zip_name,
        headers={"Content-Disposition": f'attachment; filename="{zip_name}"'},
    )
