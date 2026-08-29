"""Storage management service for video files."""
import os
import uuid
from pathlib import Path
from app.config import UPLOAD_DIR, OUTPUT_DIR, THUMBNAIL_DIR


def generate_video_id() -> str:
    """Generate a unique video identifier."""
    return str(uuid.uuid4())[:12]


def get_upload_path(video_id: str, filename: str) -> str:
    """Get the storage path for an uploaded video."""
    ext = Path(filename).suffix
    return os.path.join(UPLOAD_DIR, f"{video_id}{ext}")


def get_output_path(video_id: str, suffix: str = "", ext: str = ".mp4") -> str:
    """Get the storage path for a processed output video."""
    name = f"{video_id}_cut{suffix}{ext}"
    return os.path.join(OUTPUT_DIR, name)


def get_thumbnail_dir() -> str:
    """Get thumbnail directory path."""
    return THUMBNAIL_DIR


def list_outputs() -> list[dict]:
    """List all processed output files."""
    outputs = []
    for f in sorted(os.listdir(OUTPUT_DIR)):
        fpath = os.path.join(OUTPUT_DIR, f)
        if os.path.isfile(fpath):
            stat = os.stat(fpath)
            outputs.append({
                "filename": f,
                "size_bytes": stat.st_size,
                "created_at": stat.st_mtime,
            })
    return outputs


def list_uploads() -> list[dict]:
    """List all uploaded source video files."""
    uploads = []
    for f in sorted(os.listdir(UPLOAD_DIR)):
        if f.startswith('.'):
            continue
        fpath = os.path.join(UPLOAD_DIR, f)
        if os.path.isfile(fpath):
            stat = os.stat(fpath)
            vid = f.split(".")[0]
            uploads.append({
                "video_id": vid,
                "filename": f,
                "size_bytes": stat.st_size,
                "created_at": stat.st_mtime,
            })
    return uploads


def get_thumbnail_files(video_id: str) -> list[str]:
    """Get list of thumbnail filenames for a given video."""
    thumbs = []
    if os.path.exists(THUMBNAIL_DIR):
        for f in sorted(os.listdir(THUMBNAIL_DIR)):
            if f.startswith(video_id) and f.endswith(".jpg"):
                thumbs.append(f)
    return thumbs


def clear_all_outputs() -> int:
    """Purge all rendered output files from OUTPUT_DIR."""
    count = 0
    if os.path.exists(OUTPUT_DIR):
        for f in os.listdir(OUTPUT_DIR):
            fpath = os.path.join(OUTPUT_DIR, f)
            if os.path.isfile(fpath):
                try:
                    os.remove(fpath)
                    count += 1
                except Exception:
                    pass
    # Also remove output poster thumbnails
    if os.path.exists(THUMBNAIL_DIR):
        for f in os.listdir(THUMBNAIL_DIR):
            if f.startswith("out_poster_"):
                try:
                    os.remove(os.path.join(THUMBNAIL_DIR, f))
                except Exception:
                    pass
    return count


def clear_all_uploads() -> int:
    """Purge all uploaded source files from UPLOAD_DIR."""
    count = 0
    if os.path.exists(UPLOAD_DIR):
        for f in os.listdir(UPLOAD_DIR):
            fpath = os.path.join(UPLOAD_DIR, f)
            if os.path.isfile(fpath):
                try:
                    os.remove(fpath)
                    count += 1
                except Exception:
                    pass
    return count


def clear_all_thumbnails() -> int:
    """Purge all cached thumbnail images from THUMBNAIL_DIR to reclaim disk space."""
    count = 0
    if os.path.exists(THUMBNAIL_DIR):
        for f in os.listdir(THUMBNAIL_DIR):
            fpath = os.path.join(THUMBNAIL_DIR, f)
            if os.path.isfile(fpath):
                try:
                    os.remove(fpath)
                    count += 1
                except Exception:
                    pass
    return count


def clear_entire_library() -> dict:
    """Purge all video uploads, outputs, and thumbnails."""
    out_cnt = clear_all_outputs()
    up_cnt = clear_all_uploads()
    thumb_cnt = clear_all_thumbnails()
    return {
        "outputs_deleted": out_cnt,
        "uploads_deleted": up_cnt,
        "thumbnails_deleted": thumb_cnt,
        "total_deleted": out_cnt + up_cnt + thumb_cnt,
    }


