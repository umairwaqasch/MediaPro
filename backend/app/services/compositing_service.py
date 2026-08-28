"""Green Screen Chroma Key and Multi-Image Layout Engine."""
import os
import subprocess
import cv2
import numpy as np
from PIL import Image, ImageOps, ImageDraw
from typing import List, Optional, Dict, Any, Tuple


def apply_chroma_key(
    input_path: str,
    output_path: str,
    key_color_hex: str = "#00ff00",
    tolerance: float = 0.25,
    softness: float = 0.10,
    bg_color_hex: Optional[str] = None,
    bg_image_path: Optional[str] = None,
) -> str:
    """
    Extract green/blue screen background and replace with solid color, gradient, or background photo.
    """
    with Image.open(input_path) as src_img:
        rgb_img = src_img.convert("RGB")

    cv_img = cv2.cvtColor(np.array(rgb_img), cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(cv_img, cv2.COLOR_BGR2HSV)

    # Convert hex key color to HSV
    def hex_to_bgr(h):
        h = h.lstrip("#")
        return [int(h[4:6], 16), int(h[2:4], 16), int(h[0:2], 16)] if len(h) == 6 else [0, 255, 0]

    key_bgr = np.uint8([[hex_to_bgr(key_color_hex)]])
    key_hsv = cv2.cvtColor(key_bgr, cv2.COLOR_BGR2HSV)[0][0]

    h_target, s_target, v_target = int(key_hsv[0]), int(key_hsv[1]), int(key_hsv[2])
    h_tol = int(tolerance * 60)
    s_tol = int(tolerance * 150)
    v_tol = int(tolerance * 150)

    lower_hsv = np.array([max(0, h_target - h_tol), max(30, s_target - s_tol), max(30, v_target - v_tol)])
    upper_hsv = np.array([min(179, h_target + h_tol), min(255, s_target + s_tol), min(255, v_target + v_tol)])

    # Create mask of background
    bg_mask = cv2.inRange(hsv, lower_hsv, upper_hsv)

    # Smooth / soften mask edges
    if softness > 0:
        ksize = int(softness * 30) | 1
        bg_mask = cv2.GaussianBlur(bg_mask, (ksize, ksize), 0)

    fg_mask = 255 - bg_mask
    alpha = fg_mask.astype(np.float32) / 255.0
    alpha_3d = np.dstack([alpha, alpha, alpha])

    h, w = cv_img.shape[:2]

    # Prepare background canvas
    if bg_image_path and os.path.isfile(bg_image_path):
        with Image.open(bg_image_path) as bg_img:
            bg_resized = bg_img.convert("RGB").resize((w, h), Image.Resampling.LANCZOS)
            bg_arr = cv2.cvtColor(np.array(bg_resized), cv2.COLOR_RGB2BGR).astype(np.float32)
    elif bg_color_hex:
        bg_bgr = hex_to_bgr(bg_color_hex)
        bg_arr = np.full((h, w, 3), bg_bgr, dtype=np.float32)
    else:
        # Transparent background -> output RGBA PNG
        rgba = cv2.cvtColor(cv_img, cv2.COLOR_BGR2BGRA)
        rgba[:, :, 3] = fg_mask
        cv2.imwrite(output_path, rgba)
        return output_path

    # Composite: fg * alpha + bg * (1 - alpha)
    comp = (cv_img.astype(np.float32) * alpha_3d) + (bg_arr * (1.0 - alpha_3d))
    comp = np.clip(comp, 0, 255).astype(np.uint8)

    cv2.imwrite(output_path, comp)
    return output_path


def create_photo_collage(
    image_paths: List[str],
    layout: str = "2x2",
    border_width: int = 12,
    border_color: str = "#18181b",
    output_path: Optional[str] = None,
    target_canvas_size: Tuple[int, int] = (1920, 1080),
) -> str:
    """
    Generate professional grid collage (2x2, 3x3, 1x2, 2x1) with customizable border spacing.
    """
    if not image_paths:
        raise ValueError("No images provided for collage")

    cw, ch = target_canvas_size
    def hex_to_rgb(h):
        h = h.lstrip("#")
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4)) if len(h) == 6 else (24, 24, 27)

    bg_color = hex_to_rgb(border_color)
    canvas = Image.new("RGB", (cw, ch), bg_color)

    # Determine rows & cols
    if layout == "2x2":
        cols, rows = 2, 2
    elif layout == "3x3":
        cols, rows = 3, 3
    elif layout == "1x2" or layout == "side_by_side":
        cols, rows = 2, 1
    elif layout == "2x1" or layout == "stacked":
        cols, rows = 1, 2
    else:
        cols = int(np.ceil(np.sqrt(len(image_paths))))
        rows = int(np.ceil(len(image_paths) / cols))

    cell_w = (cw - (border_width * (cols + 1))) // cols
    cell_h = (ch - (border_width * (rows + 1))) // rows

    for idx, img_path in enumerate(image_paths[:cols * rows]):
        r = idx // cols
        c = idx % cols
        x = border_width + c * (cell_w + border_width)
        y = border_width + r * (cell_h + border_width)

        if os.path.isfile(img_path):
            with Image.open(img_path) as im:
                # Crop to cell aspect ratio
                fitted = ImageOps.fit(im.convert("RGB"), (cell_w, cell_h), Image.Resampling.LANCZOS)
                canvas.paste(fitted, (x, y))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    canvas.save(output_path, "JPEG", quality=92, optimize=True)
    return output_path


def create_photo_strip(
    image_paths: List[str],
    orientation: str = "vertical",
    border_width: int = 16,
    border_color: str = "#ffffff",
    output_path: Optional[str] = None,
) -> str:
    """
    Generate classic photo-booth style vertical or horizontal strip.
    """
    if not image_paths:
        raise ValueError("No images provided for photo strip")

    def hex_to_rgb(h):
        h = h.lstrip("#")
        return tuple(int(h[i:i+2], 16) for i in (0, 2, 4)) if len(h) == 6 else (255, 255, 255)

    bg_color = hex_to_rgb(border_color)
    card_size = (600, 450) if orientation == "vertical" else (450, 600)
    count = len(image_paths)

    if orientation == "vertical":
        cw = card_size[0] + (border_width * 2)
        ch = (card_size[1] * count) + (border_width * (count + 1)) + 40  # extra bottom margin
    else:
        cw = (card_size[0] * count) + (border_width * (count + 1))
        ch = card_size[1] + (border_width * 2)

    canvas = Image.new("RGB", (cw, ch), bg_color)

    for idx, img_path in enumerate(image_paths):
        if os.path.isfile(img_path):
            with Image.open(img_path) as im:
                fitted = ImageOps.fit(im.convert("RGB"), card_size, Image.Resampling.LANCZOS)
                if orientation == "vertical":
                    x = border_width
                    y = border_width + idx * (card_size[1] + border_width)
                else:
                    x = border_width + idx * (card_size[0] + border_width)
                    y = border_width
                canvas.paste(fitted, (x, y))

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    canvas.save(output_path, "JPEG", quality=92, optimize=True)
    return output_path


def create_image_sequence_gif(
    image_paths: List[str],
    output_path: str,
    fps: int = 4,
    size: Tuple[int, int] = (640, 480),
) -> str:
    """
    Render ordered image sequence into an animated looping GIF.
    """
    if not image_paths:
        raise ValueError("No images provided for GIF")

    frames = []
    duration_ms = int(1000 / max(1, fps))

    for p in image_paths:
        if os.path.isfile(p):
            with Image.open(p) as im:
                fitted = ImageOps.fit(im.convert("RGB"), size, Image.Resampling.LANCZOS)
                frames.append(fitted)

    if frames:
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        frames[0].save(
            output_path,
            save_all=True,
            append_images=frames[1:],
            duration=duration_ms,
            loop=0,
            optimize=True,
        )
    return output_path


def create_image_slideshow_video(
    image_paths: List[str],
    output_path: str,
    seconds_per_slide: float = 3.0,
) -> str:
    """
    Render ordered images into an MP4 video slideshow using FFmpeg.
    """
    if not image_paths:
        raise ValueError("No images provided for slideshow")

    # Write concat list file
    concat_list = os.path.join(os.path.dirname(output_path), "slideshow_concat.txt")
    with open(concat_list, "w", encoding="utf-8") as f:
        for p in image_paths:
            f.write(f"file '{p}'\n")
            f.write(f"duration {seconds_per_slide}\n")
        if image_paths:
            f.write(f"file '{image_paths[-1]}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list,
        "-vf", "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black,format=yuv420p",
        "-r", "30",
        "-c:v", "libx264",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        output_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)

    if os.path.isfile(concat_list):
        os.remove(concat_list)

    return output_path
