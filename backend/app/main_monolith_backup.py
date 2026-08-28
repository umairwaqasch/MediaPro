"""FastAPI Main Application for VideoProcessor."""
import os
import uuid
import asyncio
import shutil
from pathlib import Path
from typing import Optional, List, Dict, Any

from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse
from celery.result import AsyncResult

from app.config import (
    UPLOAD_DIR,
    OUTPUT_DIR,
    THUMBNAIL_DIR,
    IMAGE_UPLOAD_DIR,
    IMAGE_OUTPUT_DIR,
    IMAGE_THUMBNAIL_DIR,
    API_PREFIX,
)
from app.services.image_service import (
    probe_image,
    generate_image_thumbnail,
)
from app.services.image_storage import (
    generate_image_id,
    get_image_upload_path,
    get_image_output_path,
    get_image_thumbnail_path,
    find_image_file,
    list_image_uploads,
    list_image_outputs,
    list_all_images,
    delete_image_upload,
    delete_image_output,
)
from app.services.metadata_service import (
    get_image_exif_metadata,
    strip_image_exif_metadata,
    extract_dominant_color_palette,
    calculate_image_histogram,
)
from app.tasks.image_tasks import (
    process_image_task,
    batch_process_images_task,
    chroma_key_image_task,
    create_collage_task,
    create_slideshow_task,
    ai_process_image_task,
    batch_ai_process_task,
    perspective_crop_task,
)
from app.services.perspective_service import auto_detect_document_corners
from app.celery_app import celery
from app.services.ffmpeg_service import (
    probe_video,
    capture_snapshot,
    detect_hardware_acceleration,
    detect_silence_intervals,
    detect_scene_changes,
    generate_audio_waveform,
    measure_audio_loudness,
)
from app.services.storage import (
    generate_video_id,
    get_upload_path,
    get_output_path,
    list_outputs,
    list_uploads,
    get_thumbnail_files,
)
from app.tasks.video_tasks import (
    cut_video_task,
    generate_thumbnails_task,
    create_gif_task,
    extract_audio_task,
    concat_segments_task,
    crop_video_task,
    burn_in_task,
    silence_jump_cut_task,
    compress_video_task,
    split_scenes_task,
    stabilize_video_task,
    normalize_audio_task,
    boomerang_loop_task,
    split_screen_task,
    color_grade_task,
    rescale_video_task,
)

app = FastAPI(
    title="VideoProcessor API",
    version="1.0.0",
    docs_url="/mediapro/api/docs",
    openapi_url="/mediapro/api/openapi.json",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter(prefix=API_PREFIX)


# -------------------------------------------------------------
# Pydantic Schemas
# -------------------------------------------------------------
class ImageProcessRequest(BaseModel):
    operation: Optional[str] = "custom"
    target_width: Optional[int] = None
    target_height: Optional[int] = None
    scale_percent: Optional[float] = None
    keep_aspect_ratio: bool = True
    resampling: str = "lanczos"
    rotate_angle: int = 0
    flip_horizontal: bool = False
    flip_vertical: bool = False
    crop_x: Optional[int] = None
    crop_y: Optional[int] = None
    crop_w: Optional[int] = None
    crop_h: Optional[int] = None
    aspect_ratio: Optional[str] = None
    blur_bg_padding: bool = False
    brightness: float = 1.0
    contrast: float = 1.0
    saturation: float = 1.0
    exposure: float = 0.0
    gamma: float = 1.0
    temperature: float = 0.0
    tint: float = 0.0
    grayscale: bool = False
    lut_preset: Optional[str] = None
    sharpen: float = 0.0
    blur_type: Optional[str] = "none"
    blur_radius: float = 0.0
    denoise: bool = False
    watermark_text: Optional[str] = None
    watermark_color: str = "#ffffff"
    watermark_size: int = 36
    watermark_opacity: float = 0.85
    watermark_position: str = "bottom_right"
    logo_path: Optional[str] = None
    logo_scale: float = 0.20
    logo_opacity: float = 0.85
    output_format: str = "JPEG"
    quality: int = 90
    optimize: bool = True
    suffix: Optional[str] = None


class ChromaKeyRequest(BaseModel):
    key_color_hex: str = "#00ff00"
    tolerance: float = 0.25
    softness: float = 0.10
    bg_color_hex: Optional[str] = None
    bg_image_path: Optional[str] = None


class CollageRequest(BaseModel):
    image_ids: List[str]
    layout: str = "2x2"
    border_width: int = 12
    border_color: str = "#18181b"


class ImageSlideshowRequest(BaseModel):
    image_ids: List[str]
    seconds_per_slide: float = 3.0


class ImageGifFromSequenceRequest(BaseModel):
    image_ids: List[str]
    fps: int = 4


class AIProcessRequest(BaseModel):
    operation: str = "bg_remove"  # "bg_remove" | "upscale" | "colorize" | "enhance"
    bg_color_hex: Optional[str] = None
    bg_image_path: Optional[str] = None
    portrait_blur_radius: int = 0
    scale: int = 2


class AIBatchProcessRequest(BaseModel):
    image_ids: List[str]
    operation: str = "bg_remove"
    params: Dict[str, Any] = {}


class ImageBatchProcessRequest(BaseModel):
    image_ids: List[str]
    operation: str
    params: Dict[str, Any] = {}


class CutRequest(BaseModel):
    start_time: float
    end_time: float
    mode: str = "fast"          # "fast" or "accurate"
    audio_mode: str = "keep"    # "keep" or "mute"
    speed: float = 1.0          # 0.25, 0.5, 1.0, 2.0, 4.0
    volume_gain: float = 1.0    # 1.0, 1.5, 2.0
    custom_name: Optional[str] = None


class GifRequest(BaseModel):
    start_time: float
    end_time: float
    fps: int = 15
    width: int = 480
    custom_name: Optional[str] = None


class AudioRequest(BaseModel):
    start_time: float
    end_time: float
    audio_format: str = "mp3"   # "mp3", "wav", "aac"
    bitrate: str = "192k"
    custom_name: Optional[str] = None


class SegmentItem(BaseModel):
    start_time: float
    end_time: float
    label: Optional[str] = None


class ConcatRequest(BaseModel):
    segments: List[SegmentItem]
    custom_name: Optional[str] = None


class CropRequest(BaseModel):
    start_time: float
    end_time: float
    crop_x: Optional[int] = None
    crop_y: Optional[int] = None
    crop_width: Optional[int] = None
    crop_height: Optional[int] = None
    aspect_ratio: Optional[str] = "9:16"  # "9:16", "1:1", "16:9", "4:5", "custom"
    bg_blur: bool = False
    custom_name: Optional[str] = None


class BurnInRequest(BaseModel):
    start_time: float
    end_time: float
    text: Optional[str] = ""
    timecode_mode: Optional[str] = "none"  # "none", "smpte", "frame"
    position: Optional[str] = "bottom-right"  # "top-left", "top-right", "top-center", "bottom-left", "bottom-right", "bottom-center", "center"
    font_size: Optional[int] = 28
    font_color: Optional[str] = "white"
    bg_box: Optional[bool] = True
    bg_opacity: Optional[float] = 0.6
    custom_name: Optional[str] = None


class SilenceDetectRequest(BaseModel):
    noise_db: Optional[float] = -30.0
    min_silence_duration: Optional[float] = 0.5
    padding: Optional[float] = 0.05


class SilenceJumpCutRequest(BaseModel):
    noise_db: Optional[float] = -30.0
    min_silence_duration: Optional[float] = 0.5
    padding: Optional[float] = 0.05
    speech_intervals: Optional[List[Dict[str, Any]]] = None
    custom_name: Optional[str] = None


class CompressRequest(BaseModel):
    start_time: float
    end_time: float
    target_size_mb: Optional[float] = 8.0
    container: Optional[str] = "mp4"
    vcodec: Optional[str] = "h264"
    custom_name: Optional[str] = None


class SceneDetectRequest(BaseModel):
    threshold: Optional[float] = 0.4
    min_duration: Optional[float] = 0.5


class SceneSplitRequest(BaseModel):
    threshold: Optional[float] = 0.4
    min_duration: Optional[float] = 0.5
    scenes: Optional[List[Dict[str, Any]]] = None
    custom_name: Optional[str] = None


class StabilizeRequest(BaseModel):
    start_time: float
    end_time: float
    shakiness: Optional[int] = 6
    smoothing: Optional[int] = 30
    optzoom: Optional[int] = 1
    zoom: Optional[float] = 0.0
    custom_name: Optional[str] = None


class NormalizeAudioRequest(BaseModel):
    start_time: float
    end_time: float
    target_i: Optional[float] = -14.0
    true_peak: Optional[float] = -1.0
    lra: Optional[float] = 11.0
    as_audio_only: Optional[bool] = False
    custom_name: Optional[str] = None


class BoomerangRequest(BaseModel):
    start_time: float
    end_time: float
    loop_count: Optional[int] = 2
    speed: Optional[float] = 1.0
    include_audio: Optional[bool] = False
    custom_name: Optional[str] = None


class SplitScreenRequest(BaseModel):
    processed_video_filename: str
    start_time: Optional[float] = 0.0
    duration: Optional[float] = 5.0
    layout: Optional[str] = "side_by_side"
    label_left: Optional[str] = "ORIGINAL"
    label_right: Optional[str] = "PROCESSED"
    custom_name: Optional[str] = None


class ColorGradeRequest(BaseModel):
    start_time: float
    end_time: float
    preset: Optional[str] = "none"
    brightness: Optional[float] = 0.0
    contrast: Optional[float] = 1.0
    saturation: Optional[float] = 1.0
    temperature: Optional[float] = 0.0
    vignette: Optional[float] = 0.0
    sharpness: Optional[float] = 0.0
    custom_name: Optional[str] = None


class RescaleRequest(BaseModel):
    target_width: int
    target_height: int
    start_time: Optional[float] = 0.0
    end_time: Optional[float] = None
    algorithm: Optional[str] = "lanczos"  # lanczos, bicubic, spline, bilinear, neighbor
    framing_mode: Optional[str] = "fit_pad"  # fit_pad, fit_blur, crop_fill, stretch
    sharpen_strength: Optional[float] = 0.0  # 0.0 to 1.0
    codec: Optional[str] = "auto"  # auto, h264, hevc, prores
    quality_preset: Optional[str] = "high"  # cinema_master, high, standard
    custom_name: Optional[str] = None


class BatchProcessRequest(BaseModel):
    video_ids: List[str]
    operation: str  # "rescale", "crop", "compress", "normalize", "colorgrade", "burn_in", "audio"
    params: Optional[Dict[str, Any]] = {}


class BatchStatusRequest(BaseModel):
    task_ids: List[str]


# -------------------------------------------------------------
# Helper: Find Upload Path
# -------------------------------------------------------------
def find_upload(video_id: str):
    clean_id = os.path.basename(video_id)
    # 1. Search in UPLOAD_DIR
    if os.path.exists(UPLOAD_DIR):
        for f in os.listdir(UPLOAD_DIR):
            if f.startswith(clean_id) or f == clean_id:
                return os.path.join(UPLOAD_DIR, f), Path(f).suffix or ".mp4"

    # 2. Search in OUTPUT_DIR (handles rendered outputs or library items)
    stripped = clean_id[4:] if clean_id.startswith("out_") else clean_id
    if os.path.exists(OUTPUT_DIR):
        for f in os.listdir(OUTPUT_DIR):
            if f == stripped or f.startswith(stripped) or f == clean_id:
                return os.path.join(OUTPUT_DIR, f), Path(f).suffix or ".mp4"

    return None, ".mp4"


# -------------------------------------------------------------
# Routes
# -------------------------------------------------------------
@router.get("/health")
async def health():
    return {"status": "ok", "service": "videoprocessor-api"}


@router.get("/system/acceleration")
@router.get("/system/hardware")
async def get_system_acceleration():
    """Return active hardware acceleration details (CUDA / NVENC vs CPU fallback)."""
    info = detect_hardware_acceleration()
    return info


@router.post("/videos/upload")
@router.post("/library/upload")
@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file, probe metadata, and trigger thumbnail generation."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    video_id = generate_video_id()
    original_filename = file.filename
    dest_path = get_upload_path(video_id, original_filename)

    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    try:
        metadata = probe_video(dest_path)
    except Exception as e:
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise HTTPException(status_code=400, detail=f"Invalid video file: {str(e)}")

    try:
        generate_thumbnails_task.delay(dest_path, video_id, 24)
    except Exception:
        pass

    return {
        "video_id": video_id,
        "filename": original_filename,
        "saved_path": dest_path,
        "metadata": metadata,
    }


@router.get("/videos/{video_id}/metadata")
async def get_video_metadata(video_id: str):
    """Retrieve metadata for an uploaded video."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Video not found")

    try:
        metadata = probe_video(matched)
        return {"video_id": video_id, "metadata": metadata}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metadata probe failed: {str(e)}")


@router.get("/videos/{video_id}/thumbnails")
async def get_video_thumbnails(video_id: str):
    """List available filmstrip thumbnails for the video."""
    thumbs = get_thumbnail_files(video_id)
    return {
        "video_id": video_id,
        "count": len(thumbs),
        "thumbnails": [f"{API_PREFIX}/media/thumbnail/{t}" for t in thumbs],
    }


@router.get("/videos/{video_id}/snapshot")
async def get_snapshot(
    video_id: str,
    timestamp: float = Query(..., ge=0),
    format: str = Query("png", pattern="^(png|jpg)$"),
):
    """Capture instant high-res frame snapshot."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Video not found")

    snap_filename = f"{video_id}_snap_{int(timestamp*1000)}.{format}"
    snap_path = os.path.join(OUTPUT_DIR, snap_filename)

    try:
        capture_snapshot(matched, snap_path, timestamp, format)
        media_type = "image/png" if format == "png" else "image/jpeg"
        return FileResponse(
            snap_path,
            media_type=media_type,
            filename=snap_filename,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Snapshot failed: {str(e)}")


@router.post("/videos/{video_id}/cut")
async def create_cut_job(video_id: str, payload: CutRequest):
    """Dispatch an async FFmpeg cut job with audio/speed options."""
    matched, original_ext = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="End time must be greater than start time")

    suffix = f"_{payload.mode}_{int(payload.start_time)}s_to_{int(payload.end_time)}s"
    if payload.speed != 1.0:
        suffix += f"_{payload.speed}x"
    if payload.audio_mode == "mute":
        suffix += "_muted"

    if payload.custom_name:
        clean_name = "".join(c for c in payload.custom_name if c.isalnum() or c in ("-", "_")).strip()
        if clean_name:
            suffix = f"_{clean_name}"

    output_filename = f"{video_id}{suffix}{original_ext}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    task = cut_video_task.delay(
        input_path=matched,
        output_path=output_path,
        start_time=payload.start_time,
        end_time=payload.end_time,
        mode=payload.mode,
        audio_mode=payload.audio_mode,
        speed=payload.speed,
        volume_gain=payload.volume_gain,
        output_filename=output_filename,
    )

    return {
        "task_id": task.id,
        "video_id": video_id,
        "output_filename": output_filename,
        "start_time": payload.start_time,
        "end_time": payload.end_time,
        "mode": payload.mode,
    }


@router.post("/videos/{video_id}/gif")
async def create_gif_job(video_id: str, payload: GifRequest):
    """Dispatch an async Animated GIF job."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="End time must be greater than start time")

    suffix = f"_gif_{int(payload.start_time)}s_to_{int(payload.end_time)}s"
    if payload.custom_name:
        clean_name = "".join(c for c in payload.custom_name if c.isalnum() or c in ("-", "_")).strip()
        if clean_name:
            suffix = f"_{clean_name}"

    output_filename = f"{video_id}{suffix}.gif"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    task = create_gif_task.delay(
        input_path=matched,
        output_path=output_path,
        start_time=payload.start_time,
        end_time=payload.end_time,
        fps=payload.fps,
        width=payload.width,
        output_filename=output_filename,
    )

    return {
        "task_id": task.id,
        "video_id": video_id,
        "output_filename": output_filename,
        "type": "gif",
    }


@router.post("/videos/{video_id}/audio")
async def create_audio_job(video_id: str, payload: AudioRequest):
    """Dispatch an async audio extraction job (MP3/WAV/AAC)."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="End time must be greater than start time")

    suffix = f"_audio_{int(payload.start_time)}s_to_{int(payload.end_time)}s"
    if payload.custom_name:
        clean_name = "".join(c for c in payload.custom_name if c.isalnum() or c in ("-", "_")).strip()
        if clean_name:
            suffix = f"_{clean_name}"

    output_filename = f"{video_id}{suffix}.{payload.audio_format}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    task = extract_audio_task.delay(
        input_path=matched,
        output_path=output_path,
        start_time=payload.start_time,
        end_time=payload.end_time,
        audio_format=payload.audio_format,
        bitrate=payload.bitrate,
        output_filename=output_filename,
    )

    return {
        "task_id": task.id,
        "video_id": video_id,
        "output_filename": output_filename,
        "type": "audio",
    }


@router.post("/videos/{video_id}/concat")
async def create_concat_job(video_id: str, payload: ConcatRequest):
    """Cut multiple segments and concatenate into one highlight reel."""
    matched, original_ext = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    if not payload.segments or len(payload.segments) < 2:
        raise HTTPException(status_code=400, detail="At least 2 segments required for concatenation")

    suffix = f"_highlight_{len(payload.segments)}clips"
    if payload.custom_name:
        clean_name = "".join(c for c in payload.custom_name if c.isalnum() or c in ("-", "_")).strip()
        if clean_name:
            suffix = f"_{clean_name}"

    output_filename = f"{video_id}{suffix}{original_ext}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    segments_data = [{"start_time": s.start_time, "end_time": s.end_time} for s in payload.segments]

    task = concat_segments_task.delay(
        input_path=matched,
        output_path=output_path,
        segments=segments_data,
        output_filename=output_filename,
    )

    return {
        "task_id": task.id,
        "video_id": video_id,
        "output_filename": output_filename,
        "segment_count": len(payload.segments),
    }


@router.post("/videos/{video_id}/crop")
async def crop_video_job(video_id: str, payload: CropRequest):
    """Dispatch an async video cropping / social aspect ratio job."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="End time must be greater than start time")

    clean_ar = (payload.aspect_ratio or "crop").replace(":", "x")
    mode_tag = "blur" if payload.bg_blur else "crop"
    suffix = f"_{mode_tag}_{clean_ar}_{int(payload.start_time)}s_to_{int(payload.end_time)}s"
    if payload.custom_name:
        clean_name = "".join(c for c in payload.custom_name if c.isalnum() or c in ("-", "_")).strip()
        if clean_name:
            suffix = f"_{clean_name}"

    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    task = crop_video_task.delay(
        input_path=matched,
        output_path=output_path,
        start_time=payload.start_time,
        end_time=payload.end_time,
        crop_x=payload.crop_x,
        crop_y=payload.crop_y,
        crop_width=payload.crop_width,
        crop_height=payload.crop_height,
        aspect_ratio=payload.aspect_ratio,
        bg_blur=payload.bg_blur,
        output_filename=output_filename,
    )

    return {
        "task_id": task.id,
        "video_id": video_id,
        "output_filename": output_filename,
        "aspect_ratio": payload.aspect_ratio,
        "bg_blur": payload.bg_blur,
        "type": "crop",
    }


@router.post("/videos/{video_id}/burn-in")
async def burn_in_overlay_job(video_id: str, payload: BurnInRequest):
    """Dispatch an async video burn-in overlay job (custom text / running timecode)."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    if payload.end_time <= payload.start_time:
        raise HTTPException(status_code=400, detail="End time must be greater than start time")

    mode_tag = "tc" if (payload.timecode_mode and payload.timecode_mode != "none") else "overlay"
    suffix = f"_{mode_tag}_{int(payload.start_time)}s_to_{int(payload.end_time)}s"
    if payload.custom_name:
        clean_name = "".join(c for c in payload.custom_name if c.isalnum() or c in ("-", "_")).strip()
        if clean_name:
            suffix = f"_{clean_name}"

    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    task = burn_in_task.delay(
        input_path=matched,
        output_path=output_path,
        start_time=payload.start_time,
        end_time=payload.end_time,
        text=payload.text or "",
        timecode_mode=payload.timecode_mode or "none",
        position=payload.position or "bottom-right",
        font_size=payload.font_size or 28,
        font_color=payload.font_color or "white",
        bg_box=payload.bg_box if payload.bg_box is not None else True,
        bg_opacity=payload.bg_opacity if payload.bg_opacity is not None else 0.6,
        output_filename=output_filename,
    )

    return {
        "task_id": task.id,
        "video_id": video_id,
        "output_filename": output_filename,
        "text": payload.text,
        "timecode_mode": payload.timecode_mode,
        "type": "burn_in",
    }


@router.post("/videos/{video_id}/silence/detect")
async def detect_video_silence(video_id: str, payload: SilenceDetectRequest):
    """Scan audio track for silent dead-air pauses and compute speech intervals."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    try:
        res = detect_silence_intervals(
            input_path=matched,
            noise_db=payload.noise_db or -30.0,
            min_silence_duration=payload.min_silence_duration or 0.5,
            padding=payload.padding or 0.05,
        )
        return {"video_id": video_id, **res}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Silence detection failed: {str(e)}")


@router.post("/videos/{video_id}/silence/jump-cut")
async def silence_jump_cut_job(video_id: str, payload: SilenceJumpCutRequest):
    """Dispatch an async video jump-cut job that eliminates dead-air pauses."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    speech_intervals = payload.speech_intervals
    if not speech_intervals:
        detection = detect_silence_intervals(
            input_path=matched,
            noise_db=payload.noise_db or -30.0,
            min_silence_duration=payload.min_silence_duration or 0.5,
            padding=payload.padding or 0.05,
        )
        speech_intervals = detection.get("speech_intervals", [])

    if not speech_intervals:
        raise HTTPException(status_code=400, detail="No speech intervals found to create jump cuts")

    suffix = f"_jumpcut_{len(speech_intervals)}segs"
    if payload.custom_name:
        clean_name = "".join(c for c in payload.custom_name if c.isalnum() or c in ("-", "_")).strip()
        if clean_name:
            suffix = f"_{clean_name}"

    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    task = silence_jump_cut_task.delay(
        input_path=matched,
        output_path=output_path,
        speech_intervals=speech_intervals,
        output_filename=output_filename,
    )

    return {
        "task_id": task.id,
        "video_id": video_id,
        "output_filename": output_filename,
        "segments_count": len(speech_intervals),
        "type": "silence_jump_cut",
    }


@router.post("/videos/{video_id}/compress")
async def compress_video_job(video_id: str, payload: CompressRequest):
    """Compress video segment to exact target file size (in MB) with custom container & codec."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    container = (payload.container or "mp4").lower().strip()
    vcodec = (payload.vcodec or "h264").lower().strip()
    target_size_mb = max(0.5, float(payload.target_size_mb or 8.0))

    ext = f".{container}"
    suffix = f"_{target_size_mb:.0f}mb_{vcodec}"
    if payload.custom_name:
        clean_name = "".join(c for c in payload.custom_name if c.isalnum() or c in ("-", "_")).strip()
        if clean_name:
            suffix = f"_{clean_name}"

    output_filename = f"{video_id}{suffix}{ext}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    task = compress_video_task.delay(
        input_path=matched,
        output_path=output_path,
        start_time=payload.start_time,
        end_time=payload.end_time,
        target_size_mb=target_size_mb,
        container=container,
        vcodec=vcodec,
        output_filename=output_filename,
    )

    return {
        "task_id": task.id,
        "video_id": video_id,
        "output_filename": output_filename,
        "target_size_mb": target_size_mb,
        "container": container,
        "vcodec": vcodec,
        "type": "compress",
    }


@router.post("/videos/{video_id}/scenes/detect")
async def detect_scenes_endpoint(video_id: str, payload: SceneDetectRequest):
    """Detect shot transitions and scene changes across the video."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    threshold = max(0.1, min(0.9, float(payload.threshold or 0.4)))
    min_duration = max(0.1, float(payload.min_duration or 0.5))

    analysis = detect_scene_changes(
        input_path=matched,
        threshold=threshold,
        min_duration=min_duration,
    )
    return analysis


@router.post("/videos/{video_id}/scenes/split")
async def split_scenes_endpoint(video_id: str, payload: SceneSplitRequest):
    """Split video into separate clips for every detected scene."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    scenes = payload.scenes
    if not scenes:
        analysis = detect_scene_changes(
            input_path=matched,
            threshold=payload.threshold or 0.4,
            min_duration=payload.min_duration or 0.5,
        )
        scenes = analysis.get("scenes", [])

    if not scenes:
        raise HTTPException(status_code=400, detail="No scenes found to split")

    task = split_scenes_task.delay(
        input_path=matched,
        output_dir=OUTPUT_DIR,
        video_id=video_id,
        scenes=scenes,
        custom_name=payload.custom_name,
    )

    return {
        "task_id": task.id,
        "video_id": video_id,
        "scenes_count": len(scenes),
        "type": "split_scenes",
    }


@router.post("/videos/{video_id}/stabilize")
async def stabilize_video_job(video_id: str, payload: StabilizeRequest):
    """2-Pass Optical Video Stabilization."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    shakiness = max(1, min(10, int(payload.shakiness or 6)))
    smoothing = max(1, min(100, int(payload.smoothing or 30)))
    optzoom = 1 if payload.optzoom is None or payload.optzoom == 1 else 0
    zoom = float(payload.zoom or 0.0)

    suffix = f"_stabilized_s{smoothing}"
    if payload.custom_name:
        clean_name = "".join(c for c in payload.custom_name if c.isalnum() or c in ("-", "_")).strip()
        if clean_name:
            suffix = f"_{clean_name}"

    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    task = stabilize_video_task.delay(
        input_path=matched,
        output_path=output_path,
        start_time=payload.start_time,
        end_time=payload.end_time,
        shakiness=shakiness,
        smoothing=smoothing,
        optzoom=optzoom,
        zoom=zoom,
        output_filename=output_filename,
    )

    return {
        "task_id": task.id,
        "video_id": video_id,
        "output_filename": output_filename,
        "shakiness": shakiness,
        "smoothing": smoothing,
        "type": "stabilize",
    }


@router.get("/videos/{video_id}/waveform")
async def get_video_waveform(video_id: str):
    """Get or generate audio waveform PNG for the video."""
    waveform_filename = f"{video_id}_waveform.png"
    waveform_path = os.path.join(THUMBNAIL_DIR, waveform_filename)

    if os.path.exists(waveform_path) and os.path.getsize(waveform_path) > 0:
        return FileResponse(waveform_path, media_type="image/png")

    # Generate on demand
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    res = generate_audio_waveform(matched, waveform_path)
    if not res or not os.path.exists(waveform_path):
        raise HTTPException(status_code=404, detail="No audio stream found in video")

    return FileResponse(waveform_path, media_type="image/png")


@router.post("/videos/{video_id}/loudness/measure")
async def measure_loudness_endpoint(video_id: str):
    """Measure EBU R128 integrated loudness (LUFS) and True Peak (dBTP)."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    try:
        metrics = measure_audio_loudness(matched)
        return {"video_id": video_id, "metrics": metrics}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/videos/{video_id}/loudness/normalize")
async def normalize_audio_job(video_id: str, payload: NormalizeAudioRequest):
    """Dual-Pass EBU R128 Broadcast Loudness Normalization."""
    matched, ext = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    target_i = float(payload.target_i or -14.0)
    true_peak = float(payload.true_peak or -1.0)
    lra = float(payload.lra or 11.0)
    as_audio_only = bool(payload.as_audio_only)

    suffix = f"_norm_{int(abs(target_i))}lufs"
    if payload.custom_name:
        clean_name = "".join(c for c in payload.custom_name if c.isalnum() or c in ("-", "_")).strip()
        if clean_name:
            suffix = f"_{clean_name}"

    out_ext = ".mp3" if as_audio_only else ext
    output_filename = f"{video_id}{suffix}{out_ext}"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    task = normalize_audio_task.delay(
        input_path=matched,
        output_path=output_path,
        start_time=payload.start_time,
        end_time=payload.end_time,
        target_i=target_i,
        true_peak=true_peak,
        lra=lra,
        as_audio_only=as_audio_only,
        output_filename=output_filename,
    )

    return {
        "task_id": task.id,
        "video_id": video_id,
        "output_filename": output_filename,
        "target_i": target_i,
        "true_peak": true_peak,
        "type": "normalize_audio",
    }


@router.post("/videos/{video_id}/boomerang")
async def boomerang_video_job(video_id: str, payload: BoomerangRequest):
    """Ping-Pong Boomerang Loop Video FX."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    loop_count = max(1, min(10, int(payload.loop_count or 2)))
    speed = max(0.25, min(4.0, float(payload.speed or 1.0)))

    suffix = f"_boomerang_{loop_count}x"
    if payload.custom_name:
        clean_name = "".join(c for c in payload.custom_name if c.isalnum() or c in ("-", "_")).strip()
        if clean_name:
            suffix = f"_{clean_name}"

    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    task = boomerang_loop_task.delay(
        input_path=matched,
        output_path=output_path,
        start_time=payload.start_time,
        end_time=payload.end_time,
        loop_count=loop_count,
        speed=speed,
        include_audio=bool(payload.include_audio),
        output_filename=output_filename,
    )

    return {
        "task_id": task.id,
        "video_id": video_id,
        "output_filename": output_filename,
        "loop_count": loop_count,
        "speed": speed,
        "type": "boomerang",
    }


@router.post("/videos/{video_id}/splitscreen")
async def split_screen_job(video_id: str, payload: SplitScreenRequest):
    """Side-by-Side or Stacked Split Screen Comparison Video."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    processed_path = os.path.join(OUTPUT_DIR, payload.processed_video_filename)
    if not os.path.exists(processed_path):
        raise HTTPException(status_code=404, detail="Processed video file not found in library")

    suffix = f"_splitscreen_{payload.layout or 'sbs'}"
    if payload.custom_name:
        clean_name = "".join(c for c in payload.custom_name if c.isalnum() or c in ("-", "_")).strip()
        if clean_name:
            suffix = f"_{clean_name}"

    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    task = split_screen_task.delay(
        source_path=matched,
        processed_path=processed_path,
        output_path=output_path,
        start_time=float(payload.start_time or 0.0),
        duration=float(payload.duration or 5.0),
        layout=payload.layout or "side_by_side",
        label_left=payload.label_left or "ORIGINAL",
        label_right=payload.label_right or "PROCESSED",
        output_filename=output_filename,
    )

    return {
        "task_id": task.id,
        "video_id": video_id,
        "output_filename": output_filename,
        "layout": payload.layout or "side_by_side",
        "type": "split_screen",
    }


@router.post("/videos/{video_id}/colorgrade")
async def color_grade_video_job(video_id: str, payload: ColorGradeRequest):
    """Cinematic 3D LUT & Color Grading FX."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    preset = payload.preset or "none"
    suffix = f"_graded_{preset}"
    if payload.custom_name:
        clean_name = "".join(c for c in payload.custom_name if c.isalnum() or c in ("-", "_")).strip()
        if clean_name:
            suffix = f"_{clean_name}"

    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    task = color_grade_task.delay(
        input_path=matched,
        output_path=output_path,
        start_time=payload.start_time,
        end_time=payload.end_time,
        preset=preset,
        brightness=float(payload.brightness or 0.0),
        contrast=float(payload.contrast or 1.0),
        saturation=float(payload.saturation or 1.0),
        temperature=float(payload.temperature or 0.0),
        vignette=float(payload.vignette or 0.0),
        sharpness=float(payload.sharpness or 0.0),
        output_filename=output_filename,
    )

    return {
        "task_id": task.id,
        "video_id": video_id,
        "output_filename": output_filename,
        "preset": preset,
        "type": "color_grade",
    }


@router.post("/videos/{video_id}/rescale")
async def rescale_video_job(video_id: str, payload: RescaleRequest):
    """GPU-Accelerated Video Super-Resolution & Multi-Scale Transcoder."""
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    tw = max(16, (int(payload.target_width) // 2) * 2)
    th = max(16, (int(payload.target_height) // 2) * 2)

    suffix = f"_rescaled_{tw}x{th}"
    if payload.custom_name:
        clean_name = "".join(c for c in payload.custom_name if c.isalnum() or c in ("-", "_")).strip()
        if clean_name:
            suffix = f"_{clean_name}"

    output_filename = f"{video_id}{suffix}.mp4"
    output_path = os.path.join(OUTPUT_DIR, output_filename)

    task = rescale_video_task.delay(
        input_path=matched,
        output_path=output_path,
        target_width=tw,
        target_height=th,
        start_time=float(payload.start_time or 0.0),
        end_time=payload.end_time,
        algorithm=payload.algorithm or "lanczos",
        framing_mode=payload.framing_mode or "fit_pad",
        sharpen_strength=float(payload.sharpen_strength or 0.0),
        codec=payload.codec or "auto",
        quality_preset=payload.quality_preset or "high",
        output_filename=output_filename,
    )

    return {
        "task_id": task.id,
        "video_id": video_id,
        "output_filename": output_filename,
        "target_width": tw,
        "target_height": th,
        "type": "rescale_video",
    }


@router.post("/batch/process")
async def batch_process_jobs(payload: BatchProcessRequest):
    """Dispatch a batch processing job across multiple staged videos."""
    if not payload.video_ids:
        raise HTTPException(status_code=400, detail="No video IDs provided")

    batch_id = str(uuid.uuid4())[:8]
    tasks = []
    operation = payload.operation.lower()
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
            suffix = f"_rescaled_{tw}x{th}"
            output_filename = f"{vid}_{batch_id}{suffix}.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = rescale_video_task.delay(
                input_path=matched,
                output_path=output_path,
                target_width=tw,
                target_height=th,
                start_time=float(params.get("start_time", 0.0) or 0.0),
                end_time=params.get("end_time"),
                algorithm=params.get("algorithm", "lanczos"),
                framing_mode=params.get("framing_mode", "fit_pad"),
                sharpen_strength=float(params.get("sharpen_strength", 0.0) or 0.0),
                codec=params.get("codec", "auto"),
                quality_preset=params.get("quality_preset", "high"),
                output_filename=output_filename,
            )
        elif operation == "crop":
            aspect = params.get("aspect_ratio", "9:16")
            bg_blur = bool(params.get("bg_blur", True))
            output_filename = f"{vid}_{batch_id}_crop_{aspect.replace(':', 'x')}.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = crop_video_task.delay(
                input_path=matched,
                output_path=output_path,
                start_time=0.0,
                end_time=None,
                aspect_ratio=aspect,
                bg_blur=bg_blur,
                output_filename=output_filename,
            )
        elif operation == "compress":
            target_mb = float(params.get("target_size_mb", 25.0) or 25.0)
            fmt = params.get("format", "mp4")
            output_filename = f"{vid}_{batch_id}_compressed_{int(target_mb)}MB.{fmt}"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = compress_video_task.delay(
                input_path=matched,
                output_path=output_path,
                start_time=0.0,
                end_time=None,
                target_size_mb=target_mb,
                container=fmt,
                vcodec=params.get("codec", "h264"),
                output_filename=output_filename,
            )
        elif operation == "normalize":
            preset = params.get("preset", "youtube_spotify")
            target_lufs = float(params.get("target_lufs", -14.0) or -14.0)
            true_peak = float(params.get("true_peak", -1.0) or -1.0)
            lra = float(params.get("loudness_range", 11.0) or 11.0)
            output_filename = f"{vid}_{batch_id}_norm_{preset}.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = normalize_audio_task.delay(
                input_path=matched,
                output_path=output_path,
                start_time=0.0,
                end_time=None,
                target_i=target_lufs,
                true_peak=true_peak,
                lra=lra,
                as_audio_only=False,
                output_filename=output_filename,
            )
        elif operation == "colorgrade":
            preset = params.get("preset", "teal_orange")
            output_filename = f"{vid}_{batch_id}_graded_{preset}.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = color_grade_task.delay(
                input_path=matched,
                output_path=output_path,
                start_time=0.0,
                end_time=None,
                preset=preset,
                brightness=float(params.get("brightness", 0.0) or 0.0),
                contrast=float(params.get("contrast", 1.0) or 1.0),
                saturation=float(params.get("saturation", 1.0) or 1.0),
                temperature=float(params.get("temperature", 0.0) or 0.0),
                vignette=float(params.get("vignette", 0.0) or 0.0),
                sharpness=float(params.get("sharpness", 0.0) or 0.0),
                output_filename=output_filename,
            )
        elif operation == "audio":
            fmt = params.get("audio_format", "mp3")
            output_filename = f"{vid}_{batch_id}_extracted.{fmt}"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = extract_audio_task.delay(
                input_path=matched,
                output_path=output_path,
                start_time=0.0,
                end_time=None,
                audio_format=fmt,
                bitrate=params.get("bitrate", "320k"),
                output_filename=output_filename,
            )
        elif operation == "burn_in":
            text = params.get("text_overlay") or params.get("text") or ""
            show_tc = bool(params.get("show_timecode", False))
            timecode_mode = "smpte" if show_tc else "none"
            position = params.get("position", "bottom-right")
            font_size = int(params.get("font_size", 28) or 28)
            font_color = params.get("font_color", "white") or "white"
            output_filename = f"{vid}_{batch_id}_burnin.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = burn_in_task.delay(
                input_path=matched,
                output_path=output_path,
                start_time=0.0,
                end_time=None,
                text=text,
                timecode_mode=timecode_mode,
                position=position,
                font_size=font_size,
                font_color=font_color,
                output_filename=output_filename,
            )
        elif operation == "gif":
            fps = int(params.get("fps", 15) or 15)
            width = int(params.get("width", 480) or 480)
            output_filename = f"{vid}_{batch_id}_animated.gif"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = create_gif_task.delay(
                input_path=matched,
                output_path=output_path,
                start_time=0.0,
                end_time=None,
                fps=fps,
                width=width,
                output_filename=output_filename,
            )
        elif operation == "stabilize":
            shakiness = int(params.get("shakiness", 6) or 6)
            smoothing = int(params.get("smoothing", 30) or 30)
            output_filename = f"{vid}_{batch_id}_stabilized.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = stabilize_video_task.delay(
                input_path=matched,
                output_path=output_path,
                start_time=0.0,
                end_time=None,
                shakiness=shakiness,
                smoothing=smoothing,
                optzoom=1,
                zoom=0.0,
                output_filename=output_filename,
            )
        elif operation == "boomerang":
            loop_cnt = int(params.get("loop_count", 2) or 2)
            spd = float(params.get("speed", 1.0) or 1.0)
            output_filename = f"{vid}_{batch_id}_boomerang_{loop_cnt}x.mp4"
            output_path = os.path.join(OUTPUT_DIR, output_filename)
            t = boomerang_loop_task.delay(
                input_path=matched,
                output_path=output_path,
                start_time=0.0,
                end_time=None,
                loop_count=loop_cnt,
                speed=spd,
                include_audio=bool(params.get("include_audio", False)),
                output_filename=output_filename,
            )

        if t:
            tasks.append({
                "video_id": vid,
                "task_id": t.id,
                "output_filename": output_filename,
            })

    return {
        "batch_id": batch_id,
        "operation": operation,
        "total_tasks": len(tasks),
        "tasks": tasks,
    }


@router.post("/batch/status")
async def get_batch_status(payload: BatchStatusRequest):
    """Get consolidated status of multiple Celery background tasks."""
    statuses = []
    completed_count = 0
    failed_count = 0
    total_percent = 0.0

    for tid in payload.task_ids:
        try:
            res = AsyncResult(tid, app=celery)
            state = res.state
            info = res.info or {}

            st = {
                "task_id": tid,
                "state": state,
                "percent": 0.0,
                "speed": "",
                "status": "Queued",
            }

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
                st["percent"] = 0.0
                st["status"] = "Failed"
                st["error"] = str(info)
                failed_count += 1

            statuses.append(st)
        except Exception as e:
            statuses.append({
                "task_id": tid,
                "state": "FAILURE",
                "error": str(e),
                "percent": 0.0,
            })

    total_count = len(payload.task_ids)
    overall_percent = round(total_percent / max(1, total_count), 1)

    return {
        "total_tasks": total_count,
        "completed_count": completed_count,
        "failed_count": failed_count,
        "overall_percent": overall_percent,
        "is_all_finished": (completed_count + failed_count) >= total_count,
        "tasks": statuses,
    }


@router.get("/tasks/{task_id}/status")
async def get_task_status(task_id: str):
    """Get status of a running background task."""
    try:
        result = AsyncResult(task_id, app=celery)
        state = result.state
        response = {
            "task_id": task_id,
            "state": state,
        }

        if state == "PROGRESS":
            response.update(result.info or {})
        elif state == "SUCCESS":
            response["result"] = result.result
            response["percent"] = 100.0
        elif state == "FAILURE":
            err_info = result.info
            response["error"] = str(err_info) if err_info else "Task failed"
            response["percent"] = 0.0

        return response
    except Exception as e:
        return {
            "task_id": task_id,
            "state": "FAILURE",
            "error": str(e),
            "percent": 0.0,
        }


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


@router.get("/outputs")
async def get_all_outputs():
    """List all processed cut outputs with download URLs and thumbnail previews."""
    items = list_outputs()
    for item in items:
        item["download_url"] = f"{API_PREFIX}/media/output/{item['filename']}"
        item["thumbnail_url"] = f"{API_PREFIX}/outputs/{item['filename']}/thumbnail"
    return {"outputs": items}


@router.get("/outputs/{filename}/probe")
async def probe_output_video(filename: str):
    """Probe an exported output file and return full metadata."""
    safe_filename = os.path.basename(filename)
    filepath = os.path.join(OUTPUT_DIR, safe_filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Output file not found")
    try:
        meta = probe_video(filepath)
        return {"filename": safe_filename, "metadata": meta}
    except Exception:
        stat = os.stat(filepath)
        return {
            "filename": safe_filename,
            "metadata": {
                "duration": 0,
                "fps": 30,
                "total_frames": 0,
                "width": 1920,
                "height": 1080,
                "codec_video": "unknown",
                "codec_audio": "unknown",
                "bitrate": 0,
                "size_bytes": stat.st_size,
            },
        }


@router.get("/outputs/{filename}/thumbnail")
async def get_output_thumbnail(filename: str):
    """Fast-extract or serve cached thumbnail poster image for an output video."""
    safe_filename = os.path.basename(filename)
    source_path = os.path.join(OUTPUT_DIR, safe_filename)
    if not os.path.exists(source_path):
        raise HTTPException(status_code=404, detail="Output file not found")

    thumb_name = f"out_poster_{safe_filename}.jpg"
    thumb_path = os.path.join(THUMBNAIL_DIR, thumb_name)

    # Generate thumbnail if not cached
    if not os.path.exists(thumb_path):
        try:
            import subprocess
            cmd = [
                "ffmpeg", "-y",
                "-ss", "0.5",
                "-i", source_path,
                "-vframes", "1",
                "-vf", "scale=320:-1",
                "-q:v", "4",
                thumb_path,
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if res.returncode != 0:
                cmd[2] = "0.0"
                subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        except Exception:
            pass

    if os.path.exists(thumb_path):
        return FileResponse(thumb_path, media_type="image/jpeg")

    raise HTTPException(status_code=404, detail="Could not generate thumbnail")


@router.post("/library/upload")
async def upload_to_library(file: UploadFile = File(...)):
    """Upload a video directly to the library."""
    video_id = generate_video_id()
    dest_path = get_upload_path(video_id, file.filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        meta = probe_video(dest_path)
    except Exception as e:
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise HTTPException(status_code=400, detail=f"Invalid video file: {str(e)}")

    # Trigger async thumbnail generation
    generate_thumbnails_task.delay(
        input_path=dest_path,
        video_id=video_id,
        count=24,
    )

    return {
        "video_id": video_id,
        "filename": file.filename,
        "metadata": meta,
        "url": f"{API_PREFIX}/media/upload/{video_id}",
    }


@router.get("/library/all")
async def get_all_library_items():
    """Get all items (both outputs and uploaded sources) in the studio library."""
    outputs = list_outputs()
    for item in outputs:
        item["type"] = "output"
        item["download_url"] = f"{API_PREFIX}/media/output/{item['filename']}"
        item["thumbnail_url"] = f"{API_PREFIX}/outputs/{item['filename']}/thumbnail"

    uploads = list_uploads()
    for item in uploads:
        item["type"] = "upload"
        item["stream_url"] = f"{API_PREFIX}/media/upload/{item['video_id']}"
        item["thumbnail_url"] = f"{API_PREFIX}/media/thumbnail/{item['video_id']}_thumb_0000.jpg"

    return {
        "outputs": outputs,
        "uploads": uploads,
        "total_count": len(outputs) + len(uploads),
    }


@router.delete("/outputs/{filename}")
async def delete_output(filename: str):
    """Delete a processed output file."""
    safe_filename = os.path.basename(filename)
    filepath = os.path.join(OUTPUT_DIR, safe_filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File not found")
    try:
        os.remove(filepath)
        # Remove poster thumbnail cache if exists
        thumb_path = os.path.join(THUMBNAIL_DIR, f"out_poster_{safe_filename}.jpg")
        if os.path.exists(thumb_path):
            os.remove(thumb_path)
        return {"status": "deleted", "filename": safe_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete: {str(e)}")


@router.delete("/uploads/{video_id}")
async def delete_uploaded_source(video_id: str):
    """Delete an uploaded source video file and its thumbnail assets."""
    safe_id = os.path.basename(video_id)
    matched, _ = find_upload(safe_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")

    try:
        os.remove(matched)
        # Clean up thumbnails for this video_id
        if os.path.exists(THUMBNAIL_DIR):
            for thumb_f in os.listdir(THUMBNAIL_DIR):
                if thumb_f.startswith(safe_id) or safe_id in thumb_f:
                    try:
                        os.remove(os.path.join(THUMBNAIL_DIR, thumb_f))
                    except Exception:
                        pass

        return {"status": "deleted", "video_id": safe_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete source video: {str(e)}")


# -------------------------------------------------------------
# Media Serving Routes
# -------------------------------------------------------------
@router.get("/media/upload/{video_id}")
async def stream_upload_video(video_id: str):
    """Stream uploaded source video file for player preview."""
    safe_id = os.path.basename(video_id)
    matched, _ = find_upload(safe_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Video not found")

    return FileResponse(
        matched,
        media_type="video/mp4",
        filename=os.path.basename(matched),
    )


@router.get("/media/output/{filename}")
async def stream_output_video(filename: str):
    """Stream or download a cut output video, audio, or GIF."""
    safe_filename = os.path.basename(filename)
    filepath = os.path.join(OUTPUT_DIR, safe_filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Output file not found")

    media_type = "video/mp4"
    if safe_filename.endswith(".gif"):
        media_type = "image/gif"
    elif safe_filename.endswith(".mp3"):
        media_type = "audio/mpeg"
    elif safe_filename.endswith(".wav"):
        media_type = "audio/wav"
    elif safe_filename.endswith(".png"):
        media_type = "image/png"
    elif safe_filename.endswith(".jpg") or safe_filename.endswith(".jpeg"):
        media_type = "image/jpeg"

    return FileResponse(
        filepath,
        media_type=media_type,
        filename=safe_filename,
    )


@router.get("/media/thumbnail/{filename}")
async def get_thumbnail(filename: str):
    """Serve thumbnail image for timeline filmstrip."""
    safe_filename = os.path.basename(filename)
    filepath = os.path.join(THUMBNAIL_DIR, safe_filename)
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    return FileResponse(filepath, media_type="image/jpeg")


# Include router in FastAPI app
# ---------------------------------------------------------------------------
# Image Studio REST API Endpoints
# ---------------------------------------------------------------------------

@router.post("/image/upload")
@router.post("/image/library/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload a source image and probe its metadata with instant thumbnail generation."""
    image_id = generate_image_id()
    orig_filename = file.filename or "image.jpg"
    dest_path = get_image_upload_path(image_id, orig_filename)

    with open(dest_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    thumb_path = get_image_thumbnail_path(image_id)
    try:
        generate_image_thumbnail(dest_path, thumb_path)
    except Exception:
        pass

    meta = probe_image(dest_path)
    meta["image_id"] = image_id
    meta["id"] = image_id
    meta["filename"] = os.path.basename(dest_path)
    meta["thumbnail"] = f"/mediapro/api/image/thumbnail/{image_id}_thumb.jpg"
    meta["url"] = f"/mediapro/api/image/uploads/{os.path.basename(dest_path)}"
    return meta


@router.get("/image/library/all")
@router.get("/image/library")
async def get_image_library():
    """Get unified list of all uploaded and rendered image library items."""
    items = list_all_images()
    return {"items": items, "count": len(items)}


@router.get("/image/probe/{image_id}")
async def get_image_probe(image_id: str):
    """Probe image metadata by image_id or filename."""
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")
    meta = probe_image(img_path)
    meta["image_id"] = image_id
    meta["filename"] = os.path.basename(img_path)
    return meta


@router.post("/image/batch/process")
async def batch_process_images_endpoint(req: ImageBatchProcessRequest):
    """Dispatch batch processing across multiple images."""
    if not req.image_ids:
        raise HTTPException(status_code=400, detail="No images specified for batch processing")

    dispatched = []
    for img_id in req.image_ids:
        img_path = find_image_file(img_id)
        if not img_path:
            continue

        p = dict(req.params)
        p["operation"] = req.operation
        p["suffix"] = f"_{req.operation}"
        task = process_image_task.delay(img_id, p)
        dispatched.append({
            "image_id": img_id,
            "task_id": task.id,
            "operation": req.operation,
        })

    return {
        "status": "DISPATCHED",
        "total": len(dispatched),
        "tasks": dispatched,
    }


@router.post("/image/batch/status")
async def get_image_batch_status(payload: Dict[str, List[str]]):
    """Query real-time status of multiple image Celery tasks."""
    task_ids = payload.get("task_ids", [])
    results = {}
    completed_count = 0
    failed_count = 0

    for tid in task_ids:
        res = AsyncResult(tid, app=celery)
        state = res.state
        meta = res.info if isinstance(res.info, dict) else {}
        if state == "SUCCESS":
            completed_count += 1
            results[tid] = {
                "state": state,
                "percent": 100.0,
                "result": res.result,
            }
        elif state == "PROGRESS":
            results[tid] = {
                "state": state,
                "percent": meta.get("percent", 0.0),
                "message": meta.get("message", "Processing..."),
            }
        elif state == "FAILURE":
            failed_count += 1
            results[tid] = {
                "state": state,
                "percent": 0.0,
                "error": str(res.result),
            }
        else:
            results[tid] = {
                "state": state,
                "percent": 0.0,
                "message": "Pending...",
            }

    all_done = (completed_count + failed_count) == len(task_ids)
    return {
        "all_done": all_done,
        "completed": completed_count,
        "failed": failed_count,
        "total": len(task_ids),
        "tasks": results,
    }


@router.post("/image/{image_id}/process")
async def process_image_endpoint(image_id: str, req: ImageProcessRequest):
    """Process an image asynchronously via Celery worker with real-time SSE progress."""
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail=f"Image not found: {image_id}")

    params = req.model_dump()
    task = process_image_task.delay(image_id, params)
    return {
        "task_id": task.id,
        "image_id": image_id,
        "status": "QUEUED",
        "message": "Image processing task queued",
    }


@router.get("/image/uploads/{filename_or_id}")
async def serve_image_upload(filename_or_id: str):
    """Serve uploaded source image."""
    fpath = find_image_file(filename_or_id)
    if not fpath or not os.path.isfile(fpath):
        raise HTTPException(status_code=404, detail="Image not found")

    ext = Path(fpath).suffix.lower()
    mime = "image/jpeg"
    if ext == ".png":
        mime = "image/png"
    elif ext == ".webp":
        mime = "image/webp"
    elif ext == ".bmp":
        mime = "image/bmp"
    elif ext in (".tif", ".tiff"):
        mime = "image/tiff"

    return FileResponse(fpath, media_type=mime, filename=os.path.basename(fpath))


@router.get("/image/outputs/{filename}")
async def serve_image_output(filename: str):
    """Serve processed output image."""
    safe_name = os.path.basename(filename)
    fpath = os.path.join(IMAGE_OUTPUT_DIR, safe_name)
    if not os.path.isfile(fpath):
        # Fallback check find_image_file
        fpath = find_image_file(safe_name)
    if not fpath or not os.path.isfile(fpath):
        raise HTTPException(status_code=404, detail="Output image not found")

    ext = Path(fpath).suffix.lower()
    mime = "image/jpeg"
    if ext == ".png":
        mime = "image/png"
    elif ext == ".webp":
        mime = "image/webp"
    elif ext == ".bmp":
        mime = "image/bmp"
    elif ext in (".tif", ".tiff"):
        mime = "image/tiff"

    return FileResponse(fpath, media_type=mime, filename=safe_name)


@router.get("/image/thumbnail/{filename}")
async def serve_image_thumbnail(filename: str):
    """Serve image thumbnail."""
    safe_name = os.path.basename(filename)
    fpath = os.path.join(IMAGE_THUMBNAIL_DIR, safe_name)
    if not os.path.isfile(fpath):
        # Fallback to source
        base = safe_name.replace("_thumb.jpg", "")
        fpath = find_image_file(base)
    if not fpath or not os.path.isfile(fpath):
        raise HTTPException(status_code=404, detail="Thumbnail not found")

    return FileResponse(fpath, media_type="image/jpeg")


@router.delete("/image/uploads/{image_id}")
@router.delete("/image/upload/{image_id}")
async def delete_image_upload_endpoint(image_id: str):
    """Delete uploaded source image and clean up host storage."""
    ok = delete_image_upload(image_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Image upload not found")
    return {"status": "DELETED", "image_id": image_id}


@router.delete("/image/outputs/{filename}")
async def delete_image_output_endpoint(filename: str):
    """Delete processed image output and clean up host storage."""
    ok = delete_image_output(filename)
    if not ok:
        raise HTTPException(status_code=404, detail="Image output not found")
    return {"status": "DELETED", "filename": filename}

# ---------------------------------------------------------------------------
# Phase 2: Artistic FX, Compositing & Metadata Endpoints
# ---------------------------------------------------------------------------

@router.get("/image/exif/{image_id}")
async def get_image_exif_endpoint(image_id: str):
    """Extract EXIF, camera, lens, and GPS metadata."""
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")
    return get_image_exif_metadata(img_path)


@router.post("/image/exif/strip/{image_id}")
async def strip_image_exif_endpoint(image_id: str):
    """Strip all EXIF tags and GPS data for 100% privacy."""
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")

    out_path = get_image_output_path(image_id, suffix="_stripped", ext=".jpg")
    strip_image_exif_metadata(img_path, out_path)
    filename = os.path.basename(out_path)
    return {
        "status": "SUCCESS",
        "output_filename": filename,
        "url": f"/mediapro/api/image/outputs/{filename}",
    }


@router.get("/image/palette/{image_id}")
async def get_image_palette_endpoint(image_id: str, count: int = 6):
    """Extract top dominant colors as hex swatches."""
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")
    palette = extract_dominant_color_palette(img_path, num_colors=count)
    return {"palette": palette, "count": len(palette)}


@router.get("/image/histogram/{image_id}")
async def get_image_histogram_endpoint(image_id: str):
    """Calculate 256-bin RGB and Luminance histogram."""
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")
    return calculate_image_histogram(img_path)


@router.post("/image/collage")
async def create_collage_endpoint(req: CollageRequest):
    """Generate a photo collage grid."""
    if len(req.image_ids) < 2:
        raise HTTPException(status_code=400, detail="Collage requires at least 2 images")
    task = create_collage_task.delay(req.image_ids, req.layout, req.border_width, req.border_color)
    return {"task_id": task.id, "status": "QUEUED", "message": "Collage task queued"}


@router.post("/image/slideshow")
async def create_slideshow_endpoint(req: ImageSlideshowRequest):
    """Render an MP4 video slideshow from images."""
    if len(req.image_ids) < 2:
        raise HTTPException(status_code=400, detail="Slideshow requires at least 2 images")
    task = create_slideshow_task.delay(req.image_ids, req.seconds_per_slide)
    return {"task_id": task.id, "status": "QUEUED", "message": "Slideshow task queued"}


@router.post("/image/gif")
async def create_image_gif_endpoint(req: ImageGifFromSequenceRequest):
    """Render an animated GIF from image sequence."""
    if len(req.image_ids) < 2:
        raise HTTPException(status_code=400, detail="GIF requires at least 2 images")
    task = create_image_gif_task.delay(req.image_ids, req.fps)
    return {"task_id": task.id, "status": "QUEUED", "message": "GIF task queued"}


@router.post("/image/{image_id}/chromakey")
async def chromakey_image_endpoint(image_id: str, req: ChromaKeyRequest):
    """Extract chroma key background."""
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")
    task = chroma_key_image_task.delay(image_id, req.model_dump())
    return {"task_id": task.id, "status": "QUEUED", "message": "Chroma key task queued"}

# ---------------------------------------------------------------------------
# Phase 3: AI Neural Vision & Deep Learning Endpoints
# ---------------------------------------------------------------------------

@router.post("/image/batch/ai")
async def batch_ai_process_endpoint(req: AIBatchProcessRequest):
    """Dispatch batch AI processing across multiple images."""
    if not req.image_ids:
        raise HTTPException(status_code=400, detail="No images specified for AI batch")
    task = batch_ai_process_task.delay(req.image_ids, req.operation, req.params)
    return {"task_id": task.id, "status": "QUEUED", "message": f"AI batch {req.operation} task queued"}


# ---------------------------------------------------------------------------
# 4-Point Perspective Transform & Document Scanner Endpoints
# ---------------------------------------------------------------------------

class PerspectiveCropRequest(BaseModel):
    points: List[List[float]]
    aspect_ratio: Optional[str] = "auto"
    enhancement: Optional[str] = "none"
    output_format: Optional[str] = "JPEG"
    quality: Optional[int] = 95


@router.post("/image/{image_id}/perspective/detect")
async def detect_document_corners_endpoint(image_id: str):
    """Auto-detect 4 document/page corners using contour analysis."""
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")
    points = auto_detect_document_corners(img_path)
    return {"status": "SUCCESS", "points": points}


@router.post("/image/{image_id}/perspective/crop")
async def perspective_crop_endpoint(image_id: str, req: PerspectiveCropRequest):
    """Apply 4-point homography warp perspective transform and document enhancement."""
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")
    if len(req.points) != 4:
        raise HTTPException(status_code=400, detail="Exactly 4 corner points required for perspective transform")
    task = perspective_crop_task.delay(
        image_id=image_id,
        points=req.points,
        aspect_ratio=req.aspect_ratio or "auto",
        enhancement=req.enhancement or "none",
        output_format=req.output_format or "JPEG",
        quality=req.quality or 95,
    )
    return {"task_id": task.id, "status": "QUEUED", "message": "Perspective crop task queued"}


app.include_router(router)
