"""Media serving & library management endpoints."""
import os
import shutil
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

from app.config import UPLOAD_DIR, OUTPUT_DIR, THUMBNAIL_DIR, API_PREFIX
from app.services.ffmpeg_service import probe_video
from app.services.storage import (
    generate_video_id, get_upload_path, get_output_path,
    list_outputs, list_uploads, get_thumbnail_files,
)
from app.tasks.video_tasks import generate_thumbnails_task

router = APIRouter(tags=["Media"])


# ---------- Shared helper ----------
def find_upload(video_id: str):
    """Locate a video file by ID in upload or output directories."""
    clean_id = os.path.basename(video_id)
    if os.path.exists(UPLOAD_DIR):
        for f in os.listdir(UPLOAD_DIR):
            if f.startswith(clean_id) or f == clean_id:
                return os.path.join(UPLOAD_DIR, f), Path(f).suffix or ".mp4"
    stripped = clean_id[4:] if clean_id.startswith("out_") else clean_id
    if os.path.exists(OUTPUT_DIR):
        for f in os.listdir(OUTPUT_DIR):
            if f == stripped or f.startswith(stripped) or f == clean_id:
                return os.path.join(OUTPUT_DIR, f), Path(f).suffix or ".mp4"
    return None, ".mp4"


# ---------- Upload ----------
@router.post("/videos/upload")
@router.post("/library/upload")
@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file, probe metadata, and trigger thumbnail generation."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    video_id = generate_video_id()
    dest_path = get_upload_path(video_id, file.filename)
    try:
        with open(dest_path, "wb") as buf:
            shutil.copyfileobj(file.file, buf)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
    try:
        metadata = probe_video(dest_path)
    except Exception as e:
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise HTTPException(status_code=400, detail=f"Invalid video file: {e}")
    try:
        generate_thumbnails_task.delay(dest_path, video_id, 24)
    except Exception:
        pass
    return {"video_id": video_id, "filename": file.filename, "saved_path": dest_path, "metadata": metadata}


# ---------- Library ----------
@router.get("/library/all")
async def get_all_library_items():
    """Get all items (outputs and uploaded sources) in the studio library."""
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
    return {"outputs": outputs, "uploads": uploads, "total_count": len(outputs) + len(uploads)}


# ---------- Metadata & thumbnails ----------
@router.get("/videos/{video_id}/metadata")
async def get_video_metadata(video_id: str):
    matched, _ = find_upload(video_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Video not found")
    return {"video_id": video_id, "metadata": probe_video(matched)}


@router.get("/videos/{video_id}/thumbnails")
async def get_video_thumbnails(video_id: str):
    thumbs = get_thumbnail_files(video_id)
    return {"video_id": video_id, "count": len(thumbs), "thumbnails": [f"{API_PREFIX}/media/thumbnail/{t}" for t in thumbs]}


# ---------- Outputs ----------
@router.get("/outputs")
async def get_all_outputs():
    items = list_outputs()
    for item in items:
        item["download_url"] = f"{API_PREFIX}/media/output/{item['filename']}"
        item["thumbnail_url"] = f"{API_PREFIX}/outputs/{item['filename']}/thumbnail"
    return {"outputs": items}


@router.get("/outputs/{filename}/probe")
async def probe_output_video(filename: str):
    safe = os.path.basename(filename)
    fp = os.path.join(OUTPUT_DIR, safe)
    if not os.path.exists(fp):
        raise HTTPException(status_code=404, detail="Output file not found")
    try:
        return {"filename": safe, "metadata": probe_video(fp)}
    except Exception:
        stat = os.stat(fp)
        return {"filename": safe, "metadata": {"duration": 0, "fps": 30, "total_frames": 0, "width": 1920, "height": 1080, "codec_video": "unknown", "codec_audio": "unknown", "bitrate": 0, "size_bytes": stat.st_size}}


@router.get("/outputs/{filename}/thumbnail")
async def get_output_thumbnail(filename: str):
    safe = os.path.basename(filename)
    source = os.path.join(OUTPUT_DIR, safe)
    if not os.path.exists(source):
        raise HTTPException(status_code=404, detail="Output file not found")
    thumb_name = f"out_poster_{safe}.jpg"
    thumb_path = os.path.join(THUMBNAIL_DIR, thumb_name)
    if not os.path.exists(thumb_path):
        try:
            import subprocess
            cmd = ["ffmpeg", "-y", "-ss", "0.5", "-i", source, "-vframes", "1", "-vf", "scale=320:-1", "-q:v", "4", thumb_path]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if res.returncode != 0:
                cmd[3] = "0.0"
                subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        except Exception:
            pass
    if os.path.exists(thumb_path):
        return FileResponse(thumb_path, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Could not generate thumbnail")


# ---------- Delete ----------
@router.delete("/outputs/{filename}")
async def delete_output(filename: str):
    safe = os.path.basename(filename)
    fp = os.path.join(OUTPUT_DIR, safe)
    if not os.path.exists(fp):
        raise HTTPException(status_code=404, detail="File not found")
    os.remove(fp)
    thumb = os.path.join(THUMBNAIL_DIR, f"out_poster_{safe}.jpg")
    if os.path.exists(thumb):
        os.remove(thumb)
    return {"status": "deleted", "filename": safe}


@router.delete("/uploads/{video_id}")
async def delete_uploaded_source(video_id: str):
    safe_id = os.path.basename(video_id)
    matched, _ = find_upload(safe_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Source video not found")
    os.remove(matched)
    if os.path.exists(THUMBNAIL_DIR):
        for f in os.listdir(THUMBNAIL_DIR):
            if f.startswith(safe_id) or safe_id in f:
                try:
                    os.remove(os.path.join(THUMBNAIL_DIR, f))
                except Exception:
                    pass
    return {"status": "deleted", "video_id": safe_id}


# ---------- Media streaming ----------
@router.get("/media/upload/{video_id}")
async def stream_upload_video(video_id: str):
    safe_id = os.path.basename(video_id)
    matched, _ = find_upload(safe_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(matched, media_type="video/mp4", filename=os.path.basename(matched))


@router.get("/media/output/{filename}")
async def stream_output_video(filename: str):
    safe = os.path.basename(filename)
    fp = os.path.join(OUTPUT_DIR, safe)
    if not os.path.exists(fp):
        raise HTTPException(status_code=404, detail="Output file not found")
    media_type = "video/mp4"
    if safe.endswith(".gif"):
        media_type = "image/gif"
    elif safe.endswith(".mp3"):
        media_type = "audio/mpeg"
    elif safe.endswith(".wav"):
        media_type = "audio/wav"
    elif safe.endswith((".png",)):
        media_type = "image/png"
    elif safe.endswith((".jpg", ".jpeg")):
        media_type = "image/jpeg"
    return FileResponse(fp, media_type=media_type, filename=safe)


@router.get("/media/thumbnail/{filename}")
async def get_thumbnail(filename: str):
    safe = os.path.basename(filename)
    fp = os.path.join(THUMBNAIL_DIR, safe)
    if not os.path.exists(fp):
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(fp, media_type="image/jpeg")
