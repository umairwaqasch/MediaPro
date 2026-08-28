"""Image storage management service for VideoProcessor Image Studio."""
import os
import uuid
from pathlib import Path
from typing import Optional, List, Dict, Any
from app.config import (
    IMAGE_UPLOAD_DIR,
    IMAGE_OUTPUT_DIR,
    IMAGE_THUMBNAIL_DIR,
)


def generate_image_id() -> str:
    """Generate a unique image identifier."""
    return str(uuid.uuid4())[:12]


def get_image_upload_path(image_id: str, filename: str) -> str:
    """Get storage path for an uploaded source image."""
    ext = Path(filename).suffix.lower() or ".jpg"
    return os.path.join(IMAGE_UPLOAD_DIR, f"{image_id}{ext}")


def get_image_output_path(image_id: str, suffix: str = "", ext: str = ".jpg") -> str:
    """Get storage path for a processed output image."""
    if not ext.startswith("."):
        ext = f".{ext}"
    name = f"{image_id}_img{suffix}{ext}"
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

    # 3. Check image_id prefix in uploads
    if os.path.exists(IMAGE_UPLOAD_DIR):
        for f in os.listdir(IMAGE_UPLOAD_DIR):
            if f.startswith(identifier) and not f.startswith('.'):
                return os.path.join(IMAGE_UPLOAD_DIR, f)

    # 4. Check filename match in outputs
    if os.path.exists(IMAGE_OUTPUT_DIR):
        for f in os.listdir(IMAGE_OUTPUT_DIR):
            if f.startswith(identifier) and not f.startswith('.'):
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
        fpath = os.path.join(IMAGE_UPLOAD_DIR, f)
        if os.path.isfile(fpath):
            stat = os.stat(fpath)
            img_id = f.split(".")[0]
            thumb = f"{img_id}_thumb.jpg"
            has_thumb = os.path.isfile(os.path.join(IMAGE_THUMBNAIL_DIR, thumb))
            uploads.append({
                "id": img_id,
                "image_id": img_id,
                "filename": f,
                "type": "upload",
                "size_bytes": stat.st_size,
                "created_at": stat.st_mtime,
                "thumbnail": f"/mediapro/api/image/thumbnail/{thumb}" if has_thumb else None,
                "url": f"/mediapro/api/image/uploads/{f}",
            })
    return uploads


def list_image_outputs() -> List[Dict[str, Any]]:
    """List all processed output images."""
    outputs = []
    if not os.path.exists(IMAGE_OUTPUT_DIR):
        return outputs

    for f in sorted(os.listdir(IMAGE_OUTPUT_DIR)):
        if f.startswith('.'):
            continue
        fpath = os.path.join(IMAGE_OUTPUT_DIR, f)
        if os.path.isfile(fpath):
            stat = os.stat(fpath)
            base = Path(f).stem
            thumb = f"{base}_thumb.jpg"
            has_thumb = os.path.isfile(os.path.join(IMAGE_THUMBNAIL_DIR, thumb))
            outputs.append({
                "id": f,
                "filename": f,
                "type": "output",
                "size_bytes": stat.st_size,
                "created_at": stat.st_mtime,
                "thumbnail": f"/mediapro/api/image/thumbnail/{thumb}" if has_thumb else None,
                "url": f"/mediapro/api/image/outputs/{f}",
            })
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
    """Delete uploaded source image and associated thumbnail from disk."""
    deleted = False
    clean_id = Path(image_id).stem.replace("_thumb", "")
    if os.path.exists(IMAGE_UPLOAD_DIR):
        for f in os.listdir(IMAGE_UPLOAD_DIR):
            if not f.startswith('.') and (f.startswith(clean_id) or clean_id in f or f == image_id):
                fpath = os.path.join(IMAGE_UPLOAD_DIR, f)
                try:
                    os.remove(fpath)
                    deleted = True
                except OSError:
                    pass

    # Clean thumbnail
    if os.path.exists(IMAGE_THUMBNAIL_DIR):
        for t in os.listdir(IMAGE_THUMBNAIL_DIR):
            if not t.startswith('.') and (t.startswith(clean_id) or clean_id in t):
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
