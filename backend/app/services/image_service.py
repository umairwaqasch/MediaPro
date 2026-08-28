"""Comprehensive Image Processing Engine for VideoProcessor Image Studio using Pillow & NumPy."""
import os
import math
from pathlib import Path
from typing import Optional, Dict, Any, Tuple, List
from PIL import (
    Image,
    ImageEnhance,
    ImageFilter,
    ImageOps,
    ImageDraw,
    ImageFont,
)
import numpy as np


def probe_image(image_path: str) -> Dict[str, Any]:
    """
    Probe image metadata: dimensions, format, color mode, aspect ratio, file size.
    """
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    stat = os.stat(image_path)
    with Image.open(image_path) as img:
        width, height = img.size
        img_format = img.format or Path(image_path).suffix.lstrip(".").upper()
        mode = img.mode
        dpi = img.info.get("dpi", (72, 72))
        if isinstance(dpi, tuple):
            dpi_val = int(dpi[0])
        else:
            dpi_val = int(dpi) if dpi else 72

    gcd = math.gcd(width, height)
    aspect_ratio_str = f"{width // gcd}:{height // gcd}" if gcd > 0 else "1:1"
    aspect_ratio_num = round(width / max(height, 1), 4)

    return {
        "width": width,
        "height": height,
        "format": img_format,
        "mode": mode,
        "dpi": dpi_val,
        "size_bytes": stat.st_size,
        "aspect_ratio": aspect_ratio_str,
        "aspect_ratio_num": aspect_ratio_num,
    }


def generate_image_thumbnail(input_path: str, output_path: str, size: Tuple[int, int] = (400, 300)) -> str:
    """
    Generate an optimized thumbnail preview preserving aspect ratio.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with Image.open(input_path) as img:
        img_rgb = img.convert("RGB")
        img_rgb.thumbnail(size, Image.Resampling.LANCZOS)
        img_rgb.save(output_path, "JPEG", quality=85, optimize=True)
    return output_path


def apply_color_grading_luts(img: Image.Image, preset: str) -> Image.Image:
    """
    Apply cinematic Hollywood 3D color grade looks using fast matrix/channel math.
    """
    preset = (preset or "").lower()
    if not preset or preset in ("none", "original"):
        return img

    rgb_img = img.convert("RGB")
    arr = np.array(rgb_img, dtype=np.float32) / 255.0
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    if preset in ("teal_orange", "blockbuster"):
        # Teal shadows (boost blue/green, attenuate red), Orange highlights (boost red/yellow)
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        r = np.where(lum > 0.5, r * 1.15 + 0.05, r * 0.85)
        g = np.where(lum > 0.5, g * 1.05, g * 1.10)
        b = np.where(lum > 0.5, b * 0.80, b * 1.25 + 0.05)

    elif preset in ("vintage_35mm", "vintage", "warm_vintage"):
        # Warm golden cast, lifted shadows, compressed contrast
        r = r * 1.10 + 0.04
        g = g * 1.02 + 0.02
        b = b * 0.85 + 0.05

    elif preset in ("cyberpunk", "neon"):
        # High contrast, deep magenta shadows, neon cyan highlights
        r = np.clip((r - 0.5) * 1.3 + 0.5 + 0.08, 0, 1)
        g = np.clip((g - 0.5) * 1.1 + 0.5 - 0.03, 0, 1)
        b = np.clip((b - 0.5) * 1.35 + 0.5 + 0.12, 0, 1)

    elif preset in ("golden_hour", "sunset"):
        # Warm golden orange highlights with amber midtones
        r = r * 1.18 + 0.03
        g = g * 1.04
        b = b * 0.78

    elif preset in ("film_noir", "noir", "bw_contrast"):
        # High contrast dramatic black & white with deep blacks
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        lum = np.clip((lum - 0.5) * 1.4 + 0.5, 0, 1)
        r, g, b = lum, lum, lum

    elif preset in ("crisp_commercial", "clean"):
        # Clean punchy dynamic range, slight vibrance boost
        r = np.clip((r - 0.5) * 1.15 + 0.5, 0, 1)
        g = np.clip((g - 0.5) * 1.15 + 0.5, 0, 1)
        b = np.clip((b - 0.5) * 1.15 + 0.5, 0, 1)

    out_arr = np.stack([np.clip(r, 0, 1), np.clip(g, 0, 1), np.clip(b, 0, 1)], axis=2)
    out_arr = (out_arr * 255.0).astype(np.uint8)
    return Image.fromarray(out_arr, "RGB")


def apply_color_tone_adjustments(
    img: Image.Image,
    brightness: float = 1.0,
    contrast: float = 1.0,
    saturation: float = 1.0,
    exposure: float = 0.0,
    gamma: float = 1.0,
    temperature: float = 0.0,
    tint: float = 0.0,
    grayscale: bool = False,
    lut_preset: Optional[str] = None,
) -> Image.Image:
    """
    Parametric color adjustments for brightness, contrast, saturation, exposure,
    gamma, color temperature/tint, grayscale, and 3D LUT looks.
    """
    # 1. 3D LUT preset
    if lut_preset and lut_preset not in ("none", "original"):
        img = apply_color_grading_luts(img, lut_preset)

    # 2. Exposure & Gamma & Temperature/Tint
    if exposure != 0.0 or gamma != 1.0 or temperature != 0.0 or tint != 0.0:
        has_alpha = img.mode in ("RGBA", "LA")
        alpha = img.split()[-1] if has_alpha else None
        rgb_img = img.convert("RGB")
        arr = np.array(rgb_img, dtype=np.float32) / 255.0

        # Exposure (powers of 2)
        if exposure != 0.0:
            exp_factor = 2.0 ** exposure
            arr = arr * exp_factor

        # Gamma
        if gamma != 1.0 and gamma > 0.01:
            arr = np.power(np.maximum(arr, 0.0), 1.0 / gamma)

        # White balance: temperature (warm = +R/-B, cool = -R/+B)
        if temperature != 0.0:
            temp_shift = temperature * 0.15
            arr[:, :, 0] = arr[:, :, 0] * (1.0 + temp_shift)
            arr[:, :, 2] = arr[:, :, 2] * (1.0 - temp_shift)

        # Tint: green/magenta
        if tint != 0.0:
            tint_shift = tint * 0.15
            arr[:, :, 1] = arr[:, :, 1] * (1.0 - tint_shift)

        arr = np.clip(arr * 255.0, 0, 255).astype(np.uint8)
        img = Image.fromarray(arr, "RGB")
        if has_alpha and alpha:
            img.putalpha(alpha)

    # 3. Brightness
    if abs(brightness - 1.0) > 0.001:
        enhancer = ImageEnhance.Brightness(img)
        img = enhancer.enhance(max(0.0, brightness))

    # 4. Contrast
    if abs(contrast - 1.0) > 0.001:
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(max(0.0, contrast))

    # 5. Saturation / Grayscale
    if grayscale:
        img = ImageOps.grayscale(img).convert("RGB")
    elif abs(saturation - 1.0) > 0.001:
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(max(0.0, saturation))

    return img


def apply_sharpness_and_blur(
    img: Image.Image,
    sharpen: float = 0.0,  # 0.0 to 3.0
    blur_type: Optional[str] = None,  # "none" | "gaussian" | "box"
    blur_radius: float = 0.0,
    denoise: bool = False,
) -> Image.Image:
    """
    Apply Unsharp mask sharpening, Gaussian/Box blur, and median filtering.
    """
    if denoise:
        img = img.filter(ImageFilter.MedianFilter(size=3))

    if blur_type == "gaussian" and blur_radius > 0:
        img = img.filter(ImageFilter.GaussianBlur(radius=blur_radius))
    elif blur_type == "box" and blur_radius > 0:
        img = img.filter(ImageFilter.BoxBlur(radius=int(blur_radius)))

    if sharpen > 0.01:
        # Unsharp mask
        radius = 1.5
        percent = int(sharpen * 100)
        img = img.filter(ImageFilter.UnsharpMask(radius=radius, percent=percent, threshold=3))

    return img


def apply_watermark_and_text(
    img: Image.Image,
    text: Optional[str] = None,
    text_color: str = "#ffffff",
    text_size: int = 36,
    text_opacity: float = 0.85,
    position: str = "bottom_right",  # "top_left", "top_right", "bottom_left", "bottom_right", "center"
    logo_path: Optional[str] = None,
    logo_scale: float = 0.20,
    logo_opacity: float = 0.85,
) -> Image.Image:
    """
    Overlay custom text watermark or PNG logo with position placement and alpha transparency.
    """
    orig_mode = img.mode
    rgba_img = img.convert("RGBA")
    w, h = rgba_img.size

    overlay = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)

    # 1. Text Watermark
    if text and text.strip():
        try:
            font = ImageFont.truetype("arial.ttf", text_size)
        except Exception:
            font = ImageFont.load_default()

        # Calculate bounding box
        bbox = draw.textbbox((0, 0), text, font=font)
        tw = bbox[2] - bbox[0]
        th = bbox[3] - bbox[1]

        margin = max(20, int(min(w, h) * 0.03))
        pos_map = {
            "top_left": (margin, margin),
            "top_right": (w - tw - margin, margin),
            "bottom_left": (margin, h - th - margin),
            "bottom_right": (w - tw - margin, h - th - margin),
            "center": ((w - tw) // 2, (h - th) // 2),
            "top_center": ((w - tw) // 2, margin),
            "bottom_center": ((w - tw) // 2, h - th - margin),
        }
        tx, ty = pos_map.get(position, (w - tw - margin, h - th - margin))

        # Parse text color to RGBA
        text_color_hex = text_color.lstrip("#")
        if len(text_color_hex) == 6:
            cr = int(text_color_hex[0:2], 16)
            cg = int(text_color_hex[2:4], 16)
            cb = int(text_color_hex[4:6], 16)
        else:
            cr, cg, cb = 255, 255, 255
        alpha_val = int(max(0.0, min(1.0, text_opacity)) * 255)

        # Draw drop shadow for readability
        draw.text((tx + 2, ty + 2), text, font=font, fill=(0, 0, 0, int(alpha_val * 0.7)))
        draw.text((tx, ty), text, font=font, fill=(cr, cg, cb, alpha_val))

    # 2. Logo Watermark Overlay
    if logo_path and os.path.isfile(logo_path):
        try:
            with Image.open(logo_path) as logo:
                logo_rgba = logo.convert("RGBA")
                lw, lh = logo_rgba.size
                target_lw = int(w * max(0.05, min(0.8, logo_scale)))
                target_lh = int(lh * (target_lw / max(lw, 1)))
                logo_resized = logo_rgba.resize((target_lw, target_lh), Image.Resampling.LANCZOS)

                # Adjust logo opacity
                if logo_opacity < 0.99:
                    r, g, b, a = logo_resized.split()
                    a = a.point(lambda p: int(p * max(0.0, min(1.0, logo_opacity))))
                    logo_resized = Image.merge("RGBA", (r, g, b, a))

                margin = max(20, int(min(w, h) * 0.03))
                pos_map = {
                    "top_left": (margin, margin),
                    "top_right": (w - target_lw - margin, margin),
                    "bottom_left": (margin, h - target_lh - margin),
                    "bottom_right": (w - target_lw - margin, h - target_lh - margin),
                    "center": ((w - target_lw) // 2, (h - target_lh) // 2),
                }
                lx, ly = pos_map.get(position, (w - target_lw - margin, h - target_lh - margin))
                overlay.paste(logo_resized, (lx, ly), logo_resized)
        except Exception:
            pass

    # Composite
    composited = Image.alpha_composite(rgba_img, overlay)
    if orig_mode != "RGBA":
        return composited.convert(orig_mode if orig_mode in ("RGB", "L") else "RGB")
    return composited


def crop_image(
    img: Image.Image,
    crop_x: Optional[int] = None,
    crop_y: Optional[int] = None,
    crop_w: Optional[int] = None,
    crop_h: Optional[int] = None,
    aspect_ratio: Optional[str] = None,  # "1:1", "4:3", "16:9", "9:16", "4:5", "21:9"
    blur_bg_padding: bool = False,
) -> Image.Image:
    """
    Crop image by explicit rectangle or aspect ratio preset, with optional blurred canvas padding.
    """
    w, h = img.size

    # 1. Custom Rect Crop
    if crop_w and crop_h and crop_x is not None and crop_y is not None:
        if crop_w <= 1.0 and crop_h <= 1.0:
            cx = int(crop_x * w)
            cy = int(crop_y * h)
            cw = int(crop_w * w)
            ch = int(crop_h * h)
        else:
            cx, cy, cw, ch = int(crop_x), int(crop_y), int(crop_w), int(crop_h)
        x1 = max(0, cx)
        y1 = max(0, cy)
        x2 = min(w, x1 + cw)
        y2 = min(h, y1 + ch)
        if x2 > x1 and y2 > y1:
            return img.crop((x1, y1, x2, y2))

    # 2. Aspect Ratio Crop
    if aspect_ratio:
        ratio_map = {
            "1:1": (1, 1),
            "4:3": (4, 3),
            "3:4": (3, 4),
            "16:9": (16, 9),
            "9:16": (9, 16),
            "4:5": (4, 5),
            "21:9": (21, 9),
        }
        if aspect_ratio in ratio_map:
            target_rw, target_rh = ratio_map[aspect_ratio]
            target_ratio = target_rw / target_rh
            current_ratio = w / max(h, 1)

            if blur_bg_padding:
                # Dynamic blurred canvas
                if current_ratio > target_ratio:
                    # Video is wider than target aspect -> letterbox top/bottom
                    canvas_w = w
                    canvas_h = int(w / target_ratio)
                else:
                    # Video is taller -> pillarbox left/right
                    canvas_h = h
                    canvas_w = int(h * target_ratio)

                # Blurred background
                bg = img.resize((canvas_w, canvas_h), Image.Resampling.BILINEAR)
                bg = bg.filter(ImageFilter.GaussianBlur(radius=30))
                # Paste centered
                offset_x = (canvas_w - w) // 2
                offset_y = (canvas_h - h) // 2
                bg.paste(img, (offset_x, offset_y))
                return bg
            else:
                # Direct crop-to-fit
                if current_ratio > target_ratio:
                    new_w = int(h * target_ratio)
                    offset_x = (w - new_w) // 2
                    return img.crop((offset_x, 0, offset_x + new_w, h))
                else:
                    new_h = int(w / target_ratio)
                    offset_y = (h - new_h) // 2
                    return img.crop((0, offset_y, w, offset_y + new_h))

    return img


from app.services.artistic_service import (
    apply_vignette,
    apply_film_grain,
    apply_pencil_sketch,
    apply_cartoon_effect,
    apply_oil_painting,
    apply_pixelate,
    apply_glitch_effect,
    apply_duotone,
    apply_cross_process,
)


def process_image_pipeline(
    input_path: str,
    output_path: str,
    # 1. Dimensions & Transforms
    target_width: Optional[int] = None,
    target_height: Optional[int] = None,
    scale_percent: Optional[float] = None,
    keep_aspect_ratio: bool = True,
    resampling: str = "lanczos",  # "lanczos" | "bicubic" | "bilinear"
    rotate_angle: int = 0,  # 0, 90, 180, 270
    flip_horizontal: bool = False,
    flip_vertical: bool = False,
    # 2. Crop
    crop_x: Optional[int] = None,
    crop_y: Optional[int] = None,
    crop_w: Optional[int] = None,
    crop_h: Optional[int] = None,
    aspect_ratio: Optional[str] = None,
    blur_bg_padding: bool = False,
    # 3. Color & LUTs
    brightness: float = 1.0,
    contrast: float = 1.0,
    saturation: float = 1.0,
    exposure: float = 0.0,
    gamma: float = 1.0,
    temperature: float = 0.0,
    tint: float = 0.0,
    grayscale: bool = False,
    lut_preset: Optional[str] = None,
    # 4. Sharpness & Blur
    sharpen: float = 0.0,
    blur_type: Optional[str] = None,
    blur_radius: float = 0.0,
    denoise: bool = False,
    # 5. Phase 2 Artistic Filters
    artistic_filter: Optional[str] = None,
    vignette_intensity: float = 0.0,
    film_grain_intensity: float = 0.0,
    sketch_intensity: float = 0.8,
    cartoon_colors: int = 8,
    duotone_shadow: str = "#001a33",
    duotone_highlight: str = "#ff9900",
    glitch_amount: int = 0,
    pixelate_block: int = 0,
    # 6. Watermark
    watermark_text: Optional[str] = None,
    watermark_color: str = "#ffffff",
    watermark_size: int = 36,
    watermark_opacity: float = 0.85,
    watermark_position: str = "bottom_right",
    logo_path: Optional[str] = None,
    logo_scale: float = 0.20,
    logo_opacity: float = 0.85,
    # 7. Format & Compression
    output_format: str = "JPEG",  # "JPEG" | "PNG" | "WEBP" | "BMP" | "TIFF"
    quality: int = 90,
    optimize: bool = True,
    progress_callback=None,
) -> Dict[str, Any]:
    """
    Execute full multi-stage image processing pipeline with high fidelity.
    """
    if not os.path.isfile(input_path):
        raise FileNotFoundError(f"Source image not found: {input_path}")

    if progress_callback:
        progress_callback(10.0, "Loading source image...")

    with Image.open(input_path) as src_img:
        # Respect EXIF orientation tag if present
        img = ImageOps.exif_transpose(src_img) or src_img.copy()

    # Step 1: Rotate & Flip
    if rotate_angle in (90, 180, 270):
        img = img.rotate(-rotate_angle, expand=True)
    if flip_horizontal:
        img = ImageOps.mirror(img)
    if flip_vertical:
        img = ImageOps.flip(img)

    if progress_callback:
        progress_callback(25.0, "Applying crop and canvas formatting...")

    # Step 2: Crop & Canvas Padding
    img = crop_image(
        img,
        crop_x=crop_x,
        crop_y=crop_y,
        crop_w=crop_w,
        crop_h=crop_h,
        aspect_ratio=aspect_ratio,
        blur_bg_padding=blur_bg_padding,
    )

    # Step 3: Rescale / Resize
    resample_map = {
        "lanczos": Image.Resampling.LANCZOS,
        "bicubic": Image.Resampling.BICUBIC,
        "bilinear": Image.Resampling.BILINEAR,
    }
    resample_filter = resample_map.get(resampling.lower(), Image.Resampling.LANCZOS)

    w, h = img.size
    if scale_percent and scale_percent > 0:
        new_w = max(1, int(w * (scale_percent / 100.0)))
        new_h = max(1, int(h * (scale_percent / 100.0)))
        img = img.resize((new_w, new_h), resample_filter)
    elif target_width or target_height:
        if keep_aspect_ratio:
            if target_width and not target_height:
                new_w = target_width
                new_h = int(h * (target_width / max(w, 1)))
            elif target_height and not target_width:
                new_h = target_height
                new_w = int(w * (target_height / max(h, 1)))
            else:
                ratio = min(target_width / max(w, 1), target_height / max(h, 1))
                new_w = max(1, int(w * ratio))
                new_h = max(1, int(h * ratio))
        else:
            new_w = target_width or w
            new_h = target_height or h
        img = img.resize((new_w, new_h), resample_filter)

    if progress_callback:
        progress_callback(50.0, "Rendering color adjustments & 3D LUTs...")

    # Step 4: Color & 3D LUT Tone Adjustments
    img = apply_color_tone_adjustments(
        img,
        brightness=brightness,
        contrast=contrast,
        saturation=saturation,
        exposure=exposure,
        gamma=gamma,
        temperature=temperature,
        tint=tint,
        grayscale=grayscale,
        lut_preset=lut_preset,
    )

    if progress_callback:
        progress_callback(70.0, "Applying sharpness, blur, and watermarks...")

    # Step 5: Sharpness & Blur
    img = apply_sharpness_and_blur(
        img,
        sharpen=sharpen,
        blur_type=blur_type,
        blur_radius=blur_radius,
        denoise=denoise,
    )

    # Step 5b: Phase 2 Artistic Filters
    if artistic_filter and artistic_filter not in ("none", "original"):
        af = artistic_filter.lower()
        if af == "vignette" or vignette_intensity > 0:
            img = apply_vignette(img, intensity=vignette_intensity or 0.5)
        elif af == "film_grain" or film_grain_intensity > 0:
            img = apply_film_grain(img, intensity=film_grain_intensity or 0.3)
        elif af in ("pencil_sketch", "sketch"):
            img = apply_pencil_sketch(img, stroke_intensity=sketch_intensity, is_color=False)
        elif af in ("color_sketch", "color_pencil"):
            img = apply_pencil_sketch(img, stroke_intensity=sketch_intensity, is_color=True)
        elif af in ("cartoon", "comic"):
            img = apply_cartoon_effect(img, num_colors=cartoon_colors)
        elif af in ("oil_painting", "oil"):
            img = apply_oil_painting(img)
        elif af == "pixelate" or pixelate_block > 0:
            img = apply_pixelate(img, block_size=pixelate_block or 16)
        elif af == "glitch" or glitch_amount > 0:
            img = apply_glitch_effect(img, shift_amount=glitch_amount or 20)
        elif af == "duotone":
            img = apply_duotone(img, shadow_hex=duotone_shadow, highlight_hex=duotone_highlight)
        elif af in ("cross_process", "xpro"):
            img = apply_cross_process(img)
    elif vignette_intensity > 0:
        img = apply_vignette(img, intensity=vignette_intensity)
    elif film_grain_intensity > 0:
        img = apply_film_grain(img, intensity=film_grain_intensity)
    elif pixelate_block > 0:
        img = apply_pixelate(img, block_size=pixelate_block)
    elif glitch_amount > 0:
        img = apply_glitch_effect(img, shift_amount=glitch_amount)

    # Step 6: Watermark & Branding
    if (watermark_text and watermark_text.strip()) or (logo_path and os.path.isfile(logo_path)):
        img = apply_watermark_and_text(
            img,
            text=watermark_text,
            text_color=watermark_color,
            text_size=watermark_size,
            text_opacity=watermark_opacity,
            position=watermark_position,
            logo_path=logo_path,
            logo_scale=logo_scale,
            logo_opacity=logo_opacity,
        )

    if progress_callback:
        progress_callback(90.0, "Encoding final output image...")

    # Step 7: Format & Save
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    fmt = output_format.upper()
    if fmt in ("JPG", "JPEG"):
        save_img = img.convert("RGB")
        save_img.save(output_path, "JPEG", quality=quality, optimize=optimize)
    elif fmt == "PNG":
        save_img = img
        save_img.save(output_path, "PNG", optimize=optimize)
    elif fmt in ("WEBP", "AVIF"):
        save_img = img.convert("RGB") if img.mode not in ("RGB", "RGBA") else img
        save_img.save(output_path, "WEBP", quality=quality, method=6)
    elif fmt == "BMP":
        save_img = img.convert("RGB")
        save_img.save(output_path, "BMP")
    elif fmt == "TIFF":
        save_img = img
        save_img.save(output_path, "TIFF", compression="tiff_lzw")
    else:
        save_img = img.convert("RGB")
        save_img.save(output_path, "JPEG", quality=quality, optimize=optimize)

    # Generate thumbnail for output
    thumb_path = str(Path(output_path).with_suffix(".jpg")).replace(
        "image_outputs", "image_thumbnails"
    )
    base_name = Path(output_path).stem
    thumb_out = os.path.join(
        os.path.dirname(output_path).replace("image_outputs", "image_thumbnails"),
        f"{base_name}_thumb.jpg",
    )
    try:
        generate_image_thumbnail(output_path, thumb_out)
    except Exception:
        pass

    if progress_callback:
        progress_callback(100.0, "Image processing completed successfully.")

    final_meta = probe_image(output_path)
    return {
        "output_path": output_path,
        "filename": os.path.basename(output_path),
        "width": final_meta["width"],
        "height": final_meta["height"],
        "format": final_meta["format"],
        "size_bytes": final_meta["size_bytes"],
    }
