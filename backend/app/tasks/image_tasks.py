import os
import time
from pathlib import Path
from typing import Dict, Any, List
from app.celery_app import celery
from app.services.image_storage import (
    find_image_file,
    get_image_output_path,
    get_image_thumbnail_path,
)
from app.services.image_service import (
    process_image_pipeline,
    generate_image_thumbnail,
)


@celery.task(bind=True, name="tasks.process_image")
def process_image_task(self, image_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Asynchronous Celery task for single image processing with real-time SSE progress.
    """
    input_path = find_image_file(image_id)
    if not input_path:
        raise FileNotFoundError(f"Image not found: {image_id}")

    output_format = params.get("output_format", "JPEG").lower()
    ext = f".{output_format}" if output_format != "jpeg" else ".jpg"
    suffix = params.get("suffix", f"_{params.get('operation', 'edit')}")
    output_path = get_image_output_path(image_id, suffix=suffix, ext=ext)

    def progress_callback(pct: float, msg: str):
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(pct, 1),
                "message": msg,
                "image_id": image_id,
            },
        )

    progress_callback(5.0, "Starting image processing pipeline...")
    result = process_image_pipeline(
        input_path=input_path,
        output_path=output_path,
        target_width=params.get("target_width"),
        target_height=params.get("target_height"),
        scale_percent=params.get("scale_percent"),
        keep_aspect_ratio=params.get("keep_aspect_ratio", True),
        resampling=params.get("resampling", "lanczos"),
        rotate_angle=params.get("rotate_angle", 0),
        flip_horizontal=params.get("flip_horizontal", False),
        flip_vertical=params.get("flip_vertical", False),
        crop_x=params.get("crop_x"),
        crop_y=params.get("crop_y"),
        crop_w=params.get("crop_w"),
        crop_h=params.get("crop_h"),
        aspect_ratio=params.get("aspect_ratio"),
        blur_bg_padding=params.get("blur_bg_padding", False),
        brightness=params.get("brightness", 1.0),
        contrast=params.get("contrast", 1.0),
        saturation=params.get("saturation", 1.0),
        exposure=params.get("exposure", 0.0),
        gamma=params.get("gamma", 1.0),
        temperature=params.get("temperature", 0.0),
        tint=params.get("tint", 0.0),
        grayscale=params.get("grayscale", False),
        lut_preset=params.get("lut_preset"),
        sharpen=params.get("sharpen", 0.0),
        blur_type=params.get("blur_type"),
        blur_radius=params.get("blur_radius", 0.0),
        denoise=params.get("denoise", False),
        watermark_text=params.get("watermark_text"),
        watermark_color=params.get("watermark_color", "#ffffff"),
        watermark_size=params.get("watermark_size", 36),
        watermark_opacity=params.get("watermark_opacity", 0.85),
        watermark_position=params.get("watermark_position", "bottom_right"),
        logo_path=params.get("logo_path"),
        logo_scale=params.get("logo_scale", 0.20),
        logo_opacity=params.get("logo_opacity", 0.85),
        output_format=params.get("output_format", "JPEG"),
        quality=params.get("quality", 90),
        optimize=params.get("optimize", True),
        progress_callback=progress_callback,
    )

    return {
        "status": "SUCCESS",
        "output_filename": result["filename"],
        "output_path": result["output_path"],
        "width": result["width"],
        "height": result["height"],
        "size_bytes": result["size_bytes"],
        "format": result["format"],
        "url": f"/mediapro/api/image/outputs/{result['filename']}",
    }


@celery.task(bind=True, name="tasks.batch_process_images")
def batch_process_images_task(self, image_ids: List[str], operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """
    Process a list of images in batch with aggregate progress reporting.
    """
    total = len(image_ids)
    results = []

    for idx, img_id in enumerate(image_ids):
        pct = (idx / max(total, 1)) * 100.0
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(pct, 1),
                "message": f"Processing image {idx + 1}/{total}...",
                "current_image": img_id,
            },
        )

        input_path = find_image_file(img_id)
        if not input_path:
            results.append({"image_id": img_id, "status": "ERROR", "error": "Not found"})
            continue

        output_format = params.get("output_format", "JPEG").lower()
        ext = f".{output_format}" if output_format != "jpeg" else ".jpg"
        suffix = f"_{operation}"
        output_path = get_image_output_path(img_id, suffix=suffix, ext=ext)

        try:
            res = process_image_pipeline(
                input_path=input_path,
                output_path=output_path,
                **params,
            )
            results.append({
                "image_id": img_id,
                "status": "SUCCESS",
                "output_filename": res["filename"],
                "url": f"/mediapro/api/image/outputs/{res['filename']}",
            })
        except Exception as e:
            results.append({"image_id": img_id, "status": "ERROR", "error": str(e)})

    return {
        "status": "SUCCESS",
        "total": total,
        "completed": len([r for r in results if r.get("status") == "SUCCESS"]),
        "results": results,
    }

from app.services.compositing_service import (
    apply_chroma_key,
    create_photo_collage,
    create_photo_strip,
    create_image_sequence_gif,
    create_image_slideshow_video,
)


@celery.task(bind=True, name="tasks.chroma_key_image")
def chroma_key_image_task(self, image_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Process chroma key background removal/replacement."""
    input_path = find_image_file(image_id)
    if not input_path:
        raise FileNotFoundError(f"Image not found: {image_id}")

    output_path = get_image_output_path(image_id, suffix="_chromakey", ext=".png" if not params.get("bg_color_hex") and not params.get("bg_image_path") else ".jpg")
    self.update_state(state="PROGRESS", meta={"percent": 20.0, "message": "Keying out background color..."})

    apply_chroma_key(
        input_path=input_path,
        output_path=output_path,
        key_color_hex=params.get("key_color_hex", "#00ff00"),
        tolerance=params.get("tolerance", 0.25),
        softness=params.get("softness", 0.10),
        bg_color_hex=params.get("bg_color_hex"),
        bg_image_path=params.get("bg_image_path"),
    )

    self.update_state(state="PROGRESS", meta={"percent": 100.0, "message": "Chroma key completed"})
    filename = os.path.basename(output_path)
    return {
        "status": "SUCCESS",
        "output_filename": filename,
        "output_path": output_path,
        "url": f"/mediapro/api/image/outputs/{filename}",
    }


@celery.task(bind=True, name="tasks.create_collage")
def create_collage_task(self, image_ids: List[str], layout: str = "2x2", border_width: int = 12, border_color: str = "#18181b") -> Dict[str, Any]:
    """Generate a photo collage grid."""
    image_paths = [find_image_file(img_id) for img_id in image_ids if find_image_file(img_id)]
    if not image_paths:
        raise ValueError("No valid images found for collage")

    first_id = image_ids[0]
    output_path = get_image_output_path(first_id, suffix=f"_collage_{layout}", ext=".jpg")
    self.update_state(state="PROGRESS", meta={"percent": 30.0, "message": f"Building {layout} collage..."})

    create_photo_collage(
        image_paths=image_paths,
        layout=layout,
        border_width=border_width,
        border_color=border_color,
        output_path=output_path,
    )

    filename = os.path.basename(output_path)
    return {
        "status": "SUCCESS",
        "output_filename": filename,
        "output_path": output_path,
        "url": f"/mediapro/api/image/outputs/{filename}",
    }


@celery.task(bind=True, name="tasks.create_slideshow")
def create_slideshow_task(self, image_ids: List[str], seconds_per_slide: float = 3.0) -> Dict[str, Any]:
    """Generate an MP4 slideshow from image sequence."""
    image_paths = [find_image_file(img_id) for img_id in image_ids if find_image_file(img_id)]
    if not image_paths:
        raise ValueError("No valid images found for slideshow")

    first_id = image_ids[0]
    output_path = get_image_output_path(first_id, suffix="_slideshow", ext=".mp4").replace("image_outputs", "outputs")
    self.update_state(state="PROGRESS", meta={"percent": 30.0, "message": "Rendering MP4 video slideshow..."})

    create_image_slideshow_video(
        image_paths=image_paths,
        output_path=output_path,
        seconds_per_slide=seconds_per_slide,
    )

    filename = os.path.basename(output_path)
    return {
        "status": "SUCCESS",
        "output_filename": filename,
        "output_path": output_path,
        "url": f"/mediapro/api/media/output/{filename}",
    }


@celery.task(bind=True, name="tasks.create_image_gif")
def create_image_gif_task(self, image_ids: List[str], fps: int = 4) -> Dict[str, Any]:
    """Generate animated GIF from image sequence."""
    image_paths = [find_image_file(img_id) for img_id in image_ids if find_image_file(img_id)]
    if not image_paths:
        raise ValueError("No valid images found for GIF")

    first_id = image_ids[0]
    output_path = get_image_output_path(first_id, suffix="_animated", ext=".gif")
    self.update_state(state="PROGRESS", meta={"percent": 30.0, "message": "Generating animated GIF..."})

    create_image_sequence_gif(
        image_paths=image_paths,
        output_path=output_path,
        fps=fps,
    )

    filename = os.path.basename(output_path)
    return {
        "status": "SUCCESS",
        "output_filename": filename,
        "output_path": output_path,
        "url": f"/mediapro/api/image/outputs/{filename}",
    }

from app.services.ai_service import (
    ai_remove_background,
    ai_upscale_image,
    ai_colorize_photo,
    ai_enhance_portrait,
)


@celery.task(bind=True, name="tasks.ai_process_image")
def ai_process_image_task(self, image_id: str, operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Process AI neural operations (bg_remove, upscale, colorize, enhance)."""
    input_path = find_image_file(image_id)
    if not input_path:
        raise FileNotFoundError(f"Image not found: {image_id}")

    self.update_state(state="PROGRESS", meta={"percent": 20.0, "message": f"Running AI {operation} model..."})
    ext = ".png" if operation == "bg_remove" and not params.get("bg_color_hex") and not params.get("bg_image_path") else ".jpg"
    output_path = get_image_output_path(image_id, suffix=f"_ai_{operation}", ext=ext)

    if operation == "bg_remove":
        ai_remove_background(
            input_path=input_path,
            output_path=output_path,
            bg_color_hex=params.get("bg_color_hex"),
            bg_image_path=params.get("bg_image_path"),
            portrait_blur_radius=params.get("portrait_blur_radius", 0),
        )
    elif operation == "upscale":
        ai_upscale_image(
            input_path=input_path,
            output_path=output_path,
            scale=params.get("scale", 2),
        )
    elif operation == "colorize":
        ai_colorize_photo(
            input_path=input_path,
            output_path=output_path,
        )
    elif operation == "enhance":
        ai_enhance_portrait(
            input_path=input_path,
            output_path=output_path,
        )
    else:
        raise ValueError(f"Unknown AI operation: {operation}")

    self.update_state(state="PROGRESS", meta={"percent": 100.0, "message": "AI operation completed successfully"})
    filename = os.path.basename(output_path)
    return {
        "status": "SUCCESS",
        "output_filename": filename,
        "output_path": output_path,
        "url": f"/mediapro/api/image/outputs/{filename}",
    }


@celery.task(bind=True, name="tasks.batch_ai_process")
def batch_ai_process_task(self, image_ids: List[str], operation: str, params: Dict[str, Any]) -> Dict[str, Any]:
    """Run batch AI processing across multiple staged images."""
    total = len(image_ids)
    results = []

    for idx, img_id in enumerate(image_ids):
        pct = (idx / max(total, 1)) * 100.0
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(pct, 1),
                "message": f"Processing AI image {idx + 1}/{total}...",
                "current_image": img_id,
            },
        )

        input_path = find_image_file(img_id)
        if not input_path:
            results.append({"image_id": img_id, "status": "ERROR", "error": "Not found"})
            continue

        ext = ".png" if operation == "bg_remove" and not params.get("bg_color_hex") and not params.get("bg_image_path") else ".jpg"
        output_path = get_image_output_path(img_id, suffix=f"_ai_{operation}", ext=ext)

        try:
            if operation == "bg_remove":
                ai_remove_background(
                    input_path=input_path,
                    output_path=output_path,
                    bg_color_hex=params.get("bg_color_hex"),
                    bg_image_path=params.get("bg_image_path"),
                    portrait_blur_radius=params.get("portrait_blur_radius", 0),
                )
            elif operation == "upscale":
                ai_upscale_image(input_path, output_path, scale=params.get("scale", 2))
            elif operation == "colorize":
                ai_colorize_photo(input_path, output_path)
            elif operation == "enhance":
                ai_enhance_portrait(input_path, output_path)

            filename = os.path.basename(output_path)
            results.append({
                "image_id": img_id,
                "status": "SUCCESS",
                "output_filename": filename,
                "url": f"/mediapro/api/image/outputs/{filename}",
            })
        except Exception as e:
            results.append({"image_id": img_id, "status": "ERROR", "error": str(e)})

    return {
        "status": "SUCCESS",
        "total": total,
        "completed": len([r for r in results if r.get("status") == "SUCCESS"]),
        "results": results,
    }


@celery.task(bind=True, name="tasks.perspective_crop")
def perspective_crop_task(
    self,
    image_id: str,
    points: list,
    aspect_ratio: str = 'auto',
    enhancement: str = 'none',
    output_format: str = 'JPEG',
    quality: int = 95
) -> Dict[str, Any]:
    """Execute 4-point homography perspective transform and document enhancement."""
    input_path = find_image_file(image_id)
    if not input_path:
        raise ValueError(f"Image not found for ID: {image_id}")

    ext = f".{output_format.lower()}" if output_format else ".jpg"
    if ext == ".jpeg":
        ext = ".jpg"

    output_path = get_image_output_path(image_id, suffix=f"_perspective_{aspect_ratio}", ext=ext)
    self.update_state(state="PROGRESS", meta={"percent": 35.0, "message": "Applying homography perspective transform..."})

    from app.services.perspective_service import warp_perspective_crop
    res = warp_perspective_crop(
        input_path=input_path,
        output_path=output_path,
        points=points,
        aspect_ratio=aspect_ratio,
        enhancement=enhancement,
        quality=quality,
    )

    # Generate thumbnail
    thumb_path = get_image_thumbnail_path(f"{Path(output_path).stem}")
    try:
        generate_image_thumbnail(output_path, thumb_path)
    except Exception:
        pass

    filename = os.path.basename(output_path)
    return {
        "status": "SUCCESS",
        "output_filename": filename,
        "output_path": output_path,
        "width": res["width"],
        "height": res["height"],
        "url": f"/mediapro/api/image/outputs/{filename}",
        "thumbnail": f"/mediapro/api/image/thumbnail/{Path(output_path).stem}_thumb.jpg",
    }
