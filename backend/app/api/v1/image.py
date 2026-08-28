"""Image processing domain router — all /image/* endpoints."""
import os
import shutil
from pathlib import Path
from typing import Dict, List, Any, Optional

from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from fastapi.responses import FileResponse

from app.schemas.image import (
    ImageProcessRequest, ChromaKeyRequest, CollageRequest,
    ImageSlideshowRequest, ImageGifFromSequenceRequest,
    AIProcessRequest, AIBatchProcessRequest, ImageBatchProcessRequest,
    PerspectiveCropRequest,
)
from app.services.image_service import probe_image, generate_image_thumbnail
from app.services.image_storage import (
    generate_image_id, get_image_upload_path, get_image_output_path,
    get_image_thumbnail_path, find_image_file, list_all_images,
    delete_image_upload, delete_image_output, clear_all_image_library,
)
from app.services.metadata_service import (
    get_image_exif_metadata, strip_image_exif_metadata,
    extract_dominant_color_palette, calculate_image_histogram,
)
from app.services.perspective_service import auto_detect_document_corners
from app.tasks.image_tasks import (
    process_image_task, batch_process_images_task,
    chroma_key_image_task, create_collage_task, create_slideshow_task,
    ai_process_image_task, batch_ai_process_task, perspective_crop_task,
)
from app.celery_app import celery
from celery.result import AsyncResult

router = APIRouter(tags=["Image"])


# ==============================================================================
# 1. UPLOAD & INGESTION
# ==============================================================================
@router.post("/image/upload")
@router.post("/image/library/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload a source image with fast direct memory buffer and probe its metadata with instant thumbnail generation."""
    image_id = generate_image_id()
    orig_filename = file.filename or "image.jpg"
    dest_path = get_image_upload_path(image_id, orig_filename)
    contents = await file.read()
    with open(dest_path, "wb") as buffer:
        buffer.write(contents)
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


# ==============================================================================
# 2. STATIC LIBRARY & BATCH WORKERS (MUST PRECEDE DYNAMIC PATH PARAMS)
# ==============================================================================
@router.get("/image/library/all")
@router.get("/image/library")
async def get_image_library():
    items = list_all_images()
    return {"items": items, "count": len(items)}


@router.delete("/image/library/clear")
async def clear_image_library_endpoint():
    """Wipe all images, outputs, and thumbnails from library."""
    count = clear_all_image_library()
    return {"status": "SUCCESS", "message": f"Purged {count} images and thumbnails from library."}


@router.post("/image/batch/process")
async def batch_process_images_endpoint(req: ImageBatchProcessRequest):
    if not req.image_ids:
        raise HTTPException(status_code=400, detail="No images provided for batch processing")
    task = batch_process_images_task.delay(req.image_ids, req.operation, req.params)
    return {"batch_id": task.id, "tasks": [{"image_id": i, "task_id": task.id} for i in req.image_ids], "total": len(req.image_ids), "status": "QUEUED"}


@router.post("/image/batch/ai")
async def batch_ai_process_endpoint(req: AIBatchProcessRequest):
    if not req.image_ids:
        raise HTTPException(status_code=400, detail="No images provided for AI batch processing")
    task = batch_ai_process_task.delay(req.image_ids, req.operation, req.params)
    return {"batch_id": task.id, "tasks": [{"image_id": i, "task_id": task.id} for i in req.image_ids], "total": len(req.image_ids), "status": "QUEUED"}


@router.post("/image/batch/status")
async def get_image_batch_status(payload: Dict[str, List[str]]):
    task_ids = payload.get("task_ids", [])
    results = {}
    completed_count = failed_count = 0
    for tid in task_ids:
        res = AsyncResult(tid, app=celery)
        state = res.state
        meta = res.info if isinstance(res.info, dict) else {}
        if state == "SUCCESS":
            completed_count += 1
            results[tid] = {"state": state, "percent": 100.0, "result": res.result}
        elif state == "PROGRESS":
            results[tid] = {"state": state, "percent": meta.get("percent", 0.0), "message": meta.get("message", "Processing...")}
        elif state == "FAILURE":
            failed_count += 1
            results[tid] = {"state": state, "percent": 0.0, "error": str(res.result)}
        else:
            results[tid] = {"state": state, "percent": 0.0, "message": "Pending..."}
    return {
        "all_done": (completed_count + failed_count) == len(task_ids),
        "is_all_finished": (completed_count + failed_count) == len(task_ids),
        "completed": completed_count,
        "completed_count": completed_count,
        "failed": failed_count,
        "failed_count": failed_count,
        "total": len(task_ids),
        "tasks": results
    }


# ==============================================================================
# 3. MULTI-IMAGE COMPOSITING (COLLAGE, SLIDESHOW, CHROMAKEY)
# ==============================================================================
@router.post("/image/chromakey")
async def chromakey_standalone_endpoint(payload: dict = Body(...)):
    img_id = payload.get("image_id") or payload.get("id")
    if not img_id:
        raise HTTPException(status_code=400, detail="Missing image_id")
    img_path = find_image_file(img_id)
    if not img_path:
        raise HTTPException(status_code=404, detail=f"Image not found: {img_id}")
    task = chroma_key_image_task.delay(img_id, payload)
    return {"task_id": task.id, "status": "QUEUED", "message": "Chroma key task queued"}


@router.post("/image/collage")
async def create_collage_endpoint(req: CollageRequest):
    if len(req.image_ids) < 2:
        raise HTTPException(status_code=400, detail="Collage requires at least 2 images")
    task = create_collage_task.delay(req.image_ids, req.layout, req.border_width, req.border_color)
    return {"task_id": task.id, "status": "QUEUED", "message": "Collage task queued"}


@router.post("/image/slideshow")
async def create_slideshow_endpoint(req: ImageSlideshowRequest):
    if len(req.image_ids) < 2:
        raise HTTPException(status_code=400, detail="Slideshow requires at least 2 images")
    task = create_slideshow_task.delay(req.image_ids, req.seconds_per_slide)
    return {"task_id": task.id, "status": "QUEUED", "message": "Slideshow task queued"}


@router.post("/image/gif")
async def create_image_gif_endpoint(req: ImageGifFromSequenceRequest):
    if len(req.image_ids) < 2:
        raise HTTPException(status_code=400, detail="GIF requires at least 2 images")
    from app.services.compositing_service import create_image_sequence_gif
    out_path = get_image_output_path(req.image_ids[0], suffix="_sequence", ext=".gif")
    paths = [find_image_file(i) for i in req.image_ids if find_image_file(i)]
    create_image_sequence_gif(paths, out_path, fps=req.fps)
    filename = os.path.basename(out_path)
    return {"status": "SUCCESS", "filename": filename, "url": f"/mediapro/api/image/outputs/{filename}"}


# ==============================================================================
# 4. EXIF, PALETTE & HISTOGRAM DIAGNOSTICS
# ==============================================================================
@router.get("/image/exif/{image_id}")
async def get_image_exif_endpoint(image_id: str):
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")
    return get_image_exif_metadata(img_path)


@router.post("/image/exif/strip/{image_id}")
async def strip_image_exif_endpoint(image_id: str):
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")
    out_path = get_image_output_path(image_id, suffix="_stripped", ext=".jpg")
    strip_image_exif_metadata(img_path, out_path)
    filename = os.path.basename(out_path)
    return {"status": "SUCCESS", "output_filename": filename, "url": f"/mediapro/api/image/outputs/{filename}"}


@router.get("/image/palette/{image_id}")
async def get_image_palette_endpoint(image_id: str, count: int = 6):
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")
    palette = extract_dominant_color_palette(img_path, num_colors=count)
    return {"palette": palette, "count": len(palette)}


@router.get("/image/histogram/{image_id}")
async def get_image_histogram_endpoint(image_id: str):
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")
    return calculate_image_histogram(img_path)


@router.get("/image/probe/{image_id}")
async def get_image_probe(image_id: str):
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")
    meta = probe_image(img_path)
    meta["image_id"] = image_id
    meta["id"] = image_id
    meta["filename"] = os.path.basename(img_path)
    return meta


# ==============================================================================
# 5. DYNAMIC SINGLE-IMAGE PROCESSING & AI
# ==============================================================================
@router.post("/image/{image_id}/process")
async def process_image_endpoint(image_id: str, req: ImageProcessRequest):
    """Process an image asynchronously via Celery worker."""
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail=f"Image not found: {image_id}")
    task = process_image_task.delay(image_id, req.model_dump())
    return {"task_id": task.id, "image_id": image_id, "status": "QUEUED", "message": "Image processing task queued"}


@router.post("/image/{image_id}/ai")
async def ai_process_image_endpoint(image_id: str, req: AIProcessRequest):
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail=f"Image not found: {image_id}")
    task = ai_process_image_task.delay(image_id, req.operation, req.model_dump())
    return {"task_id": task.id, "status": "QUEUED", "message": f"AI {req.operation} queued"}


@router.post("/image/{image_id}/perspective/detect")
async def detect_document_corners_endpoint(image_id: str):
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")
    pts = auto_detect_document_corners(img_path)
    return {"points": pts, "count": len(pts)}


@router.post("/image/{image_id}/perspective/crop")
async def perspective_crop_endpoint(image_id: str, req: PerspectiveCropRequest):
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")
    points = req.get_points()
    if len(points) != 4:
        raise HTTPException(status_code=400, detail="Exactly 4 corner points required")
    task = perspective_crop_task.delay(
        image_id=image_id,
        points=points,
        aspect_ratio=req.get_aspect(),
        enhancement=req.get_enhancement(),
        output_format=req.output_format or "JPEG",
        quality=req.quality or 95,
    )
    return {"task_id": task.id, "status": "QUEUED", "message": "Perspective crop task queued"}


@router.post("/image/{image_id}/chromakey")
async def chromakey_image_endpoint(image_id: str, req: ChromaKeyRequest):
    img_path = find_image_file(image_id)
    if not img_path:
        raise HTTPException(status_code=404, detail="Image not found")
    task = chroma_key_image_task.delay(image_id, req.model_dump())
    return {"task_id": task.id, "status": "QUEUED", "message": "Chroma key task queued"}


# ==============================================================================
# 6. SERVING & DELETION
# ==============================================================================
@router.get("/image/uploads/{filename_or_id}")
async def serve_image_upload(filename_or_id: str):
    fpath = find_image_file(filename_or_id)
    if not fpath or not os.path.isfile(fpath):
        raise HTTPException(status_code=404, detail="Image not found")
    ext = Path(fpath).suffix.lower()
    mime = {".png": "image/png", ".webp": "image/webp", ".bmp": "image/bmp", ".gif": "image/gif", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}.get(ext, "image/jpeg")
    return FileResponse(fpath, media_type=mime, filename=os.path.basename(fpath), headers={"Cache-Control": "public, max-age=86400"})


@router.get("/image/outputs/{filename}")
async def serve_image_output(filename: str):
    from app.config import IMAGE_OUTPUT_DIR
    safe = os.path.basename(filename)
    fpath = os.path.join(IMAGE_OUTPUT_DIR, safe)
    if not os.path.isfile(fpath):
        fpath = find_image_file(safe)
    if not fpath or not os.path.isfile(fpath):
        raise HTTPException(status_code=404, detail="Output image not found")
    ext = Path(fpath).suffix.lower()
    mime = {".png": "image/png", ".webp": "image/webp", ".bmp": "image/bmp", ".gif": "image/gif", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}.get(ext, "image/jpeg")
    return FileResponse(fpath, media_type=mime, filename=safe, headers={"Cache-Control": "public, max-age=86400"})


@router.get("/image/thumbnail/{filename}")
async def serve_image_thumbnail(filename: str):
    from app.config import IMAGE_THUMBNAIL_DIR
    safe = os.path.basename(filename)
    fpath = os.path.join(IMAGE_THUMBNAIL_DIR, safe)
    if not os.path.isfile(fpath):
        base = safe.replace("_thumb.jpg", "")
        fpath = find_image_file(base)
    if not fpath or not os.path.isfile(fpath):
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(fpath, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=86400"})


@router.delete("/image/uploads/{image_id}")
@router.delete("/image/upload/{image_id}")
async def delete_image_upload_endpoint(image_id: str):
    if not delete_image_upload(image_id):
        raise HTTPException(status_code=404, detail="Image upload not found")
    return {"status": "DELETED", "image_id": image_id}


@router.delete("/image/outputs/{filename}")
async def delete_image_output_endpoint(filename: str):
    if not delete_image_output(filename):
        raise HTTPException(status_code=404, detail="Image output not found")
    return {"status": "DELETED", "filename": filename}
