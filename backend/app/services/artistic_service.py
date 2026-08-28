"""Artistic Filter Engine for VideoProcessor Image Studio using OpenCV and NumPy."""
import cv2
import numpy as np
from PIL import Image, ImageOps
from typing import Optional, Dict, Any, Tuple


def apply_vignette(img: Image.Image, intensity: float = 0.5, radius: float = 0.75) -> Image.Image:
    """
    Apply smooth dark radial vignette border.
    """
    if intensity <= 0.01:
        return img

    rgb_img = img.convert("RGB")
    arr = np.array(rgb_img, dtype=np.float32)
    h, w = arr.shape[:2]

    # Create radial distance mask
    Y, X = np.ogrid[:h, :w]
    cx, cy = w / 2.0, h / 2.0
    dist = np.sqrt((X - cx) ** 2 + (Y - cy) ** 2)
    max_dist = np.sqrt(cx ** 2 + cy ** 2) * max(0.1, radius)
    
    # Sigmoid / smooth falloff
    mask = 1.0 - (dist / max_dist) * intensity
    mask = np.clip(mask, 0.0, 1.0)
    mask = np.dstack([mask, mask, mask])

    out = np.clip(arr * mask, 0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGB")


def apply_film_grain(img: Image.Image, intensity: float = 0.3) -> Image.Image:
    """
    Simulate authentic analog film grain texture.
    """
    if intensity <= 0.01:
        return img

    rgb_img = img.convert("RGB")
    arr = np.array(rgb_img, dtype=np.float32)
    h, w, c = arr.shape

    # Generate Gaussian noise
    noise = np.random.normal(0, intensity * 50.0, (h, w, c))
    out = np.clip(arr + noise, 0, 255).astype(np.uint8)
    return Image.fromarray(out, "RGB")


def apply_pencil_sketch(img: Image.Image, stroke_intensity: float = 0.8, is_color: bool = False) -> Image.Image:
    """
    Convert image to fine pencil sketch or colored pencil art.
    """
    rgb_img = img.convert("RGB")
    cv_img = cv2.cvtColor(np.array(rgb_img), cv2.COLOR_RGB2BGR)

    # OpenCV pencil sketch
    sigma_s = max(10, int(stroke_intensity * 60))
    sigma_r = max(0.05, stroke_intensity * 0.1)
    dst_gray, dst_color = cv2.pencilSketch(cv_img, sigma_s=sigma_s, sigma_r=sigma_r, shade_factor=0.04)

    if is_color:
        out_rgb = cv2.cvtColor(dst_color, cv2.COLOR_BGR2RGB)
    else:
        out_rgb = cv2.cvtColor(dst_gray, cv2.COLOR_GRAY2RGB)

    return Image.fromarray(out_rgb, "RGB")


def apply_cartoon_effect(img: Image.Image, num_colors: int = 8, edge_strength: float = 0.8) -> Image.Image:
    """
    Cartoon / comic book effect with quantized flat colors and bold ink outlines.
    """
    rgb_img = img.convert("RGB")
    cv_img = cv2.cvtColor(np.array(rgb_img), cv2.COLOR_RGB2BGR)

    # 1. Bilateral filter for flat smooth cartoon colors
    color = cv2.bilateralFilter(cv_img, d=9, sigmaColor=75, sigmaSpace=75)

    # 2. Extract edge outlines using adaptive threshold
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    gray = cv2.medianBlur(gray, 7)
    thresh_val = max(3, int(edge_strength * 11) | 1)  # ensure odd
    edges = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, thresh_val, 2
    )
    edges = cv2.cvtColor(edges, cv2.COLOR_GRAY2BGR)

    # 3. Combine color with black ink outlines
    cartoon = cv2.bitwise_and(color, edges)
    out_rgb = cv2.cvtColor(cartoon, cv2.COLOR_BGR2RGB)
    return Image.fromarray(out_rgb, "RGB")


def apply_oil_painting(img: Image.Image, brush_size: int = 4, dyn_ratio: int = 1) -> Image.Image:
    """
    Stylize image to look hand-painted with oil brush strokes.
    """
    rgb_img = img.convert("RGB")
    cv_img = cv2.cvtColor(np.array(rgb_img), cv2.COLOR_RGB2BGR)

    # Downscale slightly for fast painterly filter then upscale
    h, w = cv_img.shape[:2]
    small = cv2.resize(cv_img, (max(100, w // 2), max(100, h // 2)), interpolation=cv2.INTER_LINEAR)
    
    # Stylization
    oil = cv2.stylization(small, sigma_s=60, sigma_r=0.45)
    oil_up = cv2.resize(oil, (w, h), interpolation=cv2.INTER_LANCZOS4)

    out_rgb = cv2.cvtColor(oil_up, cv2.COLOR_BGR2RGB)
    return Image.fromarray(out_rgb, "RGB")


def apply_pixelate(img: Image.Image, block_size: int = 16) -> Image.Image:
    """
    Retro 8-bit / pixel art mosaic effect.
    """
    block_size = max(2, block_size)
    w, h = img.size
    small = img.resize((max(1, w // block_size), max(1, h // block_size)), Image.Resampling.NEAREST)
    return small.resize((w, h), Image.Resampling.NEAREST)


def apply_glitch_effect(img: Image.Image, shift_amount: int = 20, num_slices: int = 8) -> Image.Image:
    """
    Horizontal RGB channel slice aberration glitch.
    """
    rgb_img = img.convert("RGB")
    arr = np.array(rgb_img)
    h, w, c = arr.shape

    out = arr.copy()
    r = out[:, :, 0]
    g = out[:, :, 1]
    b = out[:, :, 2]

    # Global chromatic shift
    r_shifted = np.roll(r, shift_amount, axis=1)
    b_shifted = np.roll(b, -shift_amount, axis=1)
    out[:, :, 0] = r_shifted
    out[:, :, 2] = b_shifted

    # Horizontal slice distortions
    for _ in range(num_slices):
        slice_y = np.random.randint(0, h - 20)
        slice_h = np.random.randint(5, 30)
        slice_shift = np.random.randint(-shift_amount * 2, shift_amount * 2)
        out[slice_y:slice_y+slice_h, :, :] = np.roll(out[slice_y:slice_y+slice_h, :, :], slice_shift, axis=1)

    return Image.fromarray(out, "RGB")


def apply_duotone(img: Image.Image, shadow_hex: str = "#001a33", highlight_hex: str = "#ff9900") -> Image.Image:
    """
    Duotone gradient map: maps dark tones to shadow color and bright tones to highlight color.
    """
    # Parse hex colors
    def hex_to_rgb(h):
        h = h.lstrip("#")
        return [int(h[i:i+2], 16) for i in (0, 2, 4)] if len(h) == 6 else [0, 0, 0]

    s_rgb = np.array(hex_to_rgb(shadow_hex), dtype=np.float32)
    h_rgb = np.array(hex_to_rgb(highlight_hex), dtype=np.float32)

    gray = ImageOps.grayscale(img)
    arr_gray = np.array(gray, dtype=np.float32) / 255.0  # 0.0 to 1.0

    # Linear interpolation
    r = (1.0 - arr_gray) * s_rgb[0] + arr_gray * h_rgb[0]
    g = (1.0 - arr_gray) * s_rgb[1] + arr_gray * h_rgb[1]
    b = (1.0 - arr_gray) * s_rgb[2] + arr_gray * h_rgb[2]

    out = np.stack([np.clip(r, 0, 255), np.clip(g, 0, 255), np.clip(b, 0, 255)], axis=2).astype(np.uint8)
    return Image.fromarray(out, "RGB")


def apply_cross_process(img: Image.Image) -> Image.Image:
    """
    Cross-processing analog darkroom simulation (S-curve, boosted contrast, cyan-yellow shift).
    """
    rgb_img = img.convert("RGB")
    arr = np.array(rgb_img, dtype=np.float32) / 255.0
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

    # S-curve contrast on Red and Green, lift Blue shadows
    r = np.clip(1.0 / (1.0 + np.exp(-10 * (r - 0.5))), 0, 1)
    g = np.clip(1.0 / (1.0 + np.exp(-8 * (g - 0.5))), 0, 1)
    b = np.clip(b * 0.85 + 0.10, 0, 1)

    out = (np.stack([r, g, b], axis=2) * 255.0).astype(np.uint8)
    return Image.fromarray(out, "RGB")
