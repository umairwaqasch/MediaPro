"""Media serving & library management endpoints."""
import os
import shutil
import re
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException, Header
from fastapi.responses import FileResponse, StreamingResponse

from app.config import UPLOAD_DIR, OUTPUT_DIR, THUMBNAIL_DIR, API_PREFIX
from app.services.ffmpeg_service import probe_video
from app.services.storage import (
    generate_video_id, get_upload_path, get_output_path,
    list_outputs, list_uploads, get_thumbnail_files,
    clear_all_outputs, clear_all_uploads, clear_all_thumbnails, clear_entire_library,
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


def range_stream_file(file_path: str, range_header: str | None = None, media_type: str = "video/mp4", filename: str = ""):
    """Stream media file with full HTTP 206 Byte-Range Partial Content support for 0ms instant playback and smooth scrubbing."""
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
        
    file_size = os.path.getsize(file_path)
    
    if not range_header:
        return FileResponse(
            file_path,
            media_type=media_type,
            filename=filename or os.path.basename(file_path),
            headers={"Accept-Ranges": "bytes"}
        )
    
    range_match = re.match(r"bytes=(\d+)-(\d*)", range_header.strip())
    if not range_match:
        return FileResponse(
            file_path,
            media_type=media_type,
            filename=filename or os.path.basename(file_path),
            headers={"Accept-Ranges": "bytes"}
        )
    
    start = int(range_match.group(1))
    end_str = range_match.group(2)
    end = int(end_str) if end_str else file_size - 1
    
    if start >= file_size or start > end:
        raise HTTPException(
            status_code=416,
            detail="Requested range not satisfiable",
            headers={"Content-Range": f"bytes */{file_size}"}
        )
    
    end = min(end, file_size - 1)
    content_length = end - start + 1
    
    def file_chunk_generator(start_pos: int, total_len: int, chunk_size: int = 512 * 1024):
        with open(file_path, "rb") as f:
            f.seek(start_pos)
            bytes_left = total_len
            while bytes_left > 0:
                to_read = min(bytes_left, chunk_size)
                data = f.read(to_read)
                if not data:
                    break
                bytes_left -= len(data)
                yield data
                
    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(content_length),
        "Content-Type": media_type,
    }
    if filename:
        headers["Content-Disposition"] = f'inline; filename="{filename}"'
        
    return StreamingResponse(
        file_chunk_generator(start, content_length),
        status_code=206,
        headers=headers,
        media_type=media_type,
    )


# ---------- Upload ----------
@router.post("/media/upload")
@router.post("/videos/upload")
@router.post("/library/upload")
@router.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload a video file with high-performance 4MB chunked streaming, probe metadata, and trigger thumbnail generation."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")
    video_id = generate_video_id()
    dest_path = get_upload_path(video_id, file.filename)
    try:
        CHUNK_SIZE = 4 * 1024 * 1024  # 4MB async streaming buffer for high disk I/O throughput
        with open(dest_path, "wb") as buf:
            while True:
                chunk = await file.read(CHUNK_SIZE)
                if not chunk:
                    break
                buf.write(chunk)
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
    return {"video_id": video_id, "id": video_id, "filename": file.filename, "saved_path": dest_path, "metadata": metadata}


# ---------- Library ----------
@router.get("/library/all")
@router.get("/media/library/all")
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
@router.get("/media/outputs")
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


from fastapi import APIRouter, UploadFile, File, HTTPException, Header, BackgroundTasks, Response

@router.get("/media/download-zip")
@router.get("/outputs/download-zip")
async def download_outputs_zip(files: str, zip_name: str = "mediapro_export.zip", background_tasks: BackgroundTasks = None):
    """
    Package multiple output video files into a zip archive and stream it directly for instant 1-click batch download.
    """
    import zipfile
    import tempfile

    file_list = [f.strip() for f in files.split(",") if f.strip()]
    if not file_list:
        raise HTTPException(status_code=400, detail="No files specified for zip packaging")

    temp_zip = tempfile.NamedTemporaryFile(delete=False, suffix=".zip")
    temp_zip_path = temp_zip.name
    temp_zip.close()

    added_count = 0
    with zipfile.ZipFile(temp_zip_path, "w", zipfile.ZIP_STORED) as zip_file:
        for fname in file_list:
            safe_name = os.path.basename(fname)
            file_path = os.path.join(OUTPUT_DIR, safe_name)
            if os.path.exists(file_path):
                zip_file.write(file_path, arcname=safe_name)
                added_count += 1

    if added_count == 0:
        if os.path.exists(temp_zip_path):
            os.remove(temp_zip_path)
        raise HTTPException(status_code=404, detail="None of the specified files were found in outputs")

    clean_zip_name = os.path.basename(zip_name) if zip_name.endswith(".zip") else f"{os.path.basename(zip_name)}.zip"

    if background_tasks:
        background_tasks.add_task(os.remove, temp_zip_path)

    return FileResponse(
        temp_zip_path,
        media_type="application/zip",
        filename=clean_zip_name,
        headers={"Content-Disposition": f'attachment; filename="{clean_zip_name}"'},
    )


# ---------- Bulk Clear & Purge Operations (Defined BEFORE dynamic path params) ----------
@router.delete("/outputs/clear")
@router.delete("/media/outputs/clear")
def clear_outputs_endpoint():
    """Purge all generated export videos and thumbnails from disk."""
    count = clear_all_outputs()
    return {"status": "SUCCESS", "message": f"Purged {count} output files and thumbnails from disk."}


@router.delete("/uploads/clear")
@router.delete("/media/uploads/clear")
def clear_uploads_endpoint():
    """Purge all uploaded source videos from disk."""
    count = clear_all_uploads()
    return {"status": "SUCCESS", "message": f"Purged {count} uploaded source videos from disk."}


@router.delete("/thumbnails/clear")
@router.delete("/media/thumbnails/clear")
def clear_thumbnails_endpoint():
    """Purge all cached thumbnail images from disk to reclaim storage."""
    count = clear_all_thumbnails()
    return {"status": "SUCCESS", "message": f"Purged {count} thumbnail files from disk."}


@router.delete("/library/clear")
@router.delete("/media/library/clear")
def clear_library_endpoint():
    """Wipe all video uploads, outputs, and thumbnails from disk."""
    res = clear_entire_library()
    return {"status": "SUCCESS", "details": res, "message": f"Purged {res['total_deleted']} video assets from library."}


# ---------- Delete (Individual items) ----------
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
async def stream_upload_video(video_id: str, range: str | None = Header(None)):
    safe_id = os.path.basename(video_id)
    matched, ext = find_upload(safe_id)
    if not matched or not os.path.exists(matched):
        raise HTTPException(status_code=404, detail="Video not found")
    media_type = "video/mp4" if ext == ".mp4" else "video/quicktime" if ext == ".mov" else "video/webm" if ext == ".webm" else "video/mp4"
    return range_stream_file(matched, range_header=range, media_type=media_type, filename=os.path.basename(matched))


@router.get("/media/output/{filename}")
async def stream_output_video(filename: str, range: str | None = Header(None)):
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
    elif safe.endswith(".webm"):
        media_type = "video/webm"
    elif safe.endswith(".mov"):
        media_type = "video/quicktime"
    return range_stream_file(fp, range_header=range, media_type=media_type, filename=safe)


@router.get("/media/thumbnail/{filename}")
async def get_thumbnail(filename: str):
    safe = os.path.basename(filename)
    fp = os.path.join(THUMBNAIL_DIR, safe)
    if not os.path.exists(fp):
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    return FileResponse(fp, media_type="image/jpeg")
