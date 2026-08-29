"""Image storage management service for MediaPro Image Studio."""
import os
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any
from app.config import (
    IMAGE_UPLOAD_DIR,
    IMAGE_OUTPUT_DIR,
    IMAGE_THUMBNAIL_DIR,
)

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif", ".tiff", ".tif", ".heic"}


def generate_image_id() -> str:
    """Generate a unique image identifier."""
    return str(uuid.uuid4())[:12]


def get_image_upload_path(image_id: str, filename: str) -> str:
    """Get storage path for an uploaded source image."""
    ext = Path(filename).suffix.lower()
    if ext not in IMAGE_EXTENSIONS:
        ext = ".jpg"
    return os.path.join(IMAGE_UPLOAD_DIR, f"{image_id}{ext}")


def get_image_output_path(image_id: str, suffix: str = "", ext: str = ".jpg") -> str:
    """Get storage path for a processed output image."""
    ext_str = ext if ext else ".jpg"
    if not ext_str.startswith("."):
        ext_str = f".{ext_str}"
    clean_id = Path(image_id).stem
    suffix_clean = (f"_{suffix}" if not suffix.startswith("_") else suffix) if suffix else ""
    name = f"{clean_id}{suffix_clean}{ext_str}"
    return os.path.join(IMAGE_OUTPUT_DIR, name)


def get_image_thumbnail_path(name: str) -> str:
    """Get thumbnail path for an image."""
    base = Path(name).stem
    return os.path.join(IMAGE_THUMBNAIL_DIR, f"{base}_thumb.jpg")


def find_image_file(identifier: str) -> Optional[str]:
    """
    Find an image in uploads or outputs by image_id, full filename, or basename.
    """
    if not identifier:
        return None

    # 1. Exact match in uploads
    exact_up = os.path.join(IMAGE_UPLOAD_DIR, identifier)
    if os.path.isfile(exact_up):
        return exact_up

    # 2. Exact match in outputs
    exact_out = os.path.join(IMAGE_OUTPUT_DIR, identifier)
    if os.path.isfile(exact_out):
        return exact_out

    # 3. Stem matching in uploads
    clean = Path(identifier).stem
    if os.path.exists(IMAGE_UPLOAD_DIR):
        for f in os.listdir(IMAGE_UPLOAD_DIR):
            if not f.startswith('.'):
                if f.startswith(clean) or clean == Path(f).stem or f == identifier:
                    return os.path.join(IMAGE_UPLOAD_DIR, f)

    # 4. Stem matching in outputs
    if os.path.exists(IMAGE_OUTPUT_DIR):
        for f in os.listdir(IMAGE_OUTPUT_DIR):
            if not f.startswith('.'):
                if f.startswith(clean) or clean == Path(f).stem or f == identifier:
                    return os.path.join(IMAGE_OUTPUT_DIR, f)

    return None


def list_image_uploads() -> List[Dict[str, Any]]:
    """List all uploaded source images."""
    uploads = []
    if not os.path.exists(IMAGE_UPLOAD_DIR):
        return uploads

    for f in sorted(os.listdir(IMAGE_UPLOAD_DIR)):
        if f.startswith('.'):
            continue
        ext = Path(f).suffix.lower()
        if ext not in IMAGE_EXTENSIONS:
            continue
        fpath = os.path.join(IMAGE_UPLOAD_DIR, f)
        if os.path.isfile(fpath):
            try:
                stat = os.stat(fpath)
                stem = Path(f).stem
                thumb = f"{stem}_thumb.jpg"
                has_thumb = os.path.isfile(os.path.join(IMAGE_THUMBNAIL_DIR, thumb))
                uploads.append({
                    "id": stem,
                    "image_id": stem,
                    "filename": f,
                    "type": "upload",
                    "size_bytes": stat.st_size,
                    "created_at": stat.st_mtime,
                    "thumbnail": f"/mediapro/api/image/thumbnail/{thumb}" if has_thumb else f"/mediapro/api/image/uploads/{f}",
                    "url": f"/mediapro/api/image/uploads/{f}",
                })
            except OSError:
                pass
    return uploads


def list_image_outputs() -> List[Dict[str, Any]]:
    """List all processed output images."""
    outputs = []
    if not os.path.exists(IMAGE_OUTPUT_DIR):
        return outputs

    for f in sorted(os.listdir(IMAGE_OUTPUT_DIR)):
        if f.startswith('.'):
            continue
        ext = Path(f).suffix.lower()
        if ext not in IMAGE_EXTENSIONS:
            continue
        fpath = os.path.join(IMAGE_OUTPUT_DIR, f)
        if os.path.isfile(fpath):
            try:
                stat = os.stat(fpath)
                stem = Path(f).stem
                thumb = f"{stem}_thumb.jpg"
                has_thumb = os.path.isfile(os.path.join(IMAGE_THUMBNAIL_DIR, thumb))
                outputs.append({
                    "id": f,
                    "filename": f,
                    "type": "output",
                    "size_bytes": stat.st_size,
                    "created_at": stat.st_mtime,
                    "thumbnail": f"/mediapro/api/image/thumbnail/{thumb}" if has_thumb else f"/mediapro/api/image/outputs/{f}",
                    "url": f"/mediapro/api/image/outputs/{f}",
                })
            except OSError:
                pass
    return outputs


def list_all_images() -> List[Dict[str, Any]]:
    """List merged inventory of uploaded source images and rendered outputs."""
    all_imgs = []
    all_imgs.extend(list_image_outputs())
    all_imgs.extend(list_image_uploads())
    # Sort newest first
    all_imgs.sort(key=lambda x: x.get("created_at", 0), reverse=True)
    return all_imgs


def delete_image_upload(image_id: str) -> bool:
    """Delete uploaded source image, all derived output renders, and associated thumbnails from disk."""
    deleted = False
    clean_id = Path(image_id).stem.replace("_thumb", "")

    # 1. Clean source uploads
    if os.path.exists(IMAGE_UPLOAD_DIR):
        for f in os.listdir(IMAGE_UPLOAD_DIR):
            if not f.startswith('.') and (f.startswith(clean_id) or clean_id in f or f == image_id):
                fpath = os.path.join(IMAGE_UPLOAD_DIR, f)
                try:
                    os.remove(fpath)
                    deleted = True
                except OSError:
                    pass

    # 2. Cascade delete all derived outputs matching this image ID
    if os.path.exists(IMAGE_OUTPUT_DIR):
        for f in os.listdir(IMAGE_OUTPUT_DIR):
            if not f.startswith('.') and (f.startswith(clean_id) or clean_id in f):
                try:
                    os.remove(os.path.join(IMAGE_OUTPUT_DIR, f))
                except OSError:
                    pass

    # 3. Clean all associated thumbnails
    if os.path.exists(IMAGE_THUMBNAIL_DIR):
        for t in os.listdir(IMAGE_THUMBNAIL_DIR):
            if not t.startswith('.') and (clean_id in t or t.startswith(clean_id)):
                try:
                    os.remove(os.path.join(IMAGE_THUMBNAIL_DIR, t))
                except OSError:
                    pass

    return deleted


def delete_image_output(filename: str) -> bool:
    """Delete processed output image and its thumbnail from disk."""
    deleted = False
    clean_base = Path(filename).stem
    if os.path.exists(IMAGE_OUTPUT_DIR):
        for f in os.listdir(IMAGE_OUTPUT_DIR):
            if not f.startswith('.') and (f == filename or f.startswith(clean_base)):
                fpath = os.path.join(IMAGE_OUTPUT_DIR, f)
                try:
                    os.remove(fpath)
                    deleted = True
                except OSError:
                    pass

    if os.path.exists(IMAGE_THUMBNAIL_DIR):
        for t in os.listdir(IMAGE_THUMBNAIL_DIR):
            if not t.startswith('.') and (clean_base in t or t.startswith(clean_base)):
                try:
                    os.remove(os.path.join(IMAGE_THUMBNAIL_DIR, t))
                except OSError:
                    pass

    return deleted


def clear_all_image_library() -> dict:
    """Delete ALL uploaded images, outputs, and thumbnails from disk."""
    counts = {"uploads": 0, "outputs": 0, "thumbnails": 0}
    for d_path, key in [(IMAGE_UPLOAD_DIR, "uploads"), (IMAGE_OUTPUT_DIR, "outputs"), (IMAGE_THUMBNAIL_DIR, "thumbnails")]:
        if os.path.exists(d_path):
            for f in os.listdir(d_path):
                if not f.startswith('.'):
                    try:
                        os.remove(os.path.join(d_path, f))
                        counts[key] += 1
                    except OSError:
                        pass
    return counts
