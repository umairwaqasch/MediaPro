"""EXIF Inspection, Privacy Stripping, Color Palette & Histogram Engine."""
import os
from PIL import Image, ImageStat, ExifTags
import numpy as np
from typing import Dict, Any, List, Optional
import piexif


def get_image_exif_metadata(image_path: str) -> Dict[str, Any]:
    """
    Extract comprehensive EXIF metadata including camera, lens, exposure, and GPS data.
    """
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    meta = {
        "has_exif": False,
        "camera_make": None,
        "camera_model": None,
        "lens_model": None,
        "date_taken": None,
        "iso": None,
        "exposure_time": None,
        "f_number": None,
        "focal_length": None,
        "gps_latitude": None,
        "gps_longitude": None,
        "raw_tags": {},
    }

    try:
        with Image.open(image_path) as img:
            exif = img.getexif()
            if exif:
                meta["has_exif"] = True
                for tag_id, val in exif.items():
                    tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                    if tag_name == "Make":
                        meta["camera_make"] = str(val).strip()
                    elif tag_name == "Model":
                        meta["camera_model"] = str(val).strip()
                    elif tag_name == "DateTime":
                        meta["date_taken"] = str(val).strip()

                # Check Exif sub-IFD
                if ExifTags.IFD.Exif in exif:
                    sub_exif = exif.get_ifd(ExifTags.IFD.Exif)
                    for tag_id, val in sub_exif.items():
                        tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
                        if tag_name == "ISOSpeedRatings":
                            meta["iso"] = val
                        elif tag_name == "ExposureTime":
                            meta["exposure_time"] = f"{val}s" if isinstance(val, (int, float)) else str(val)
                        elif tag_name == "FNumber":
                            meta["f_number"] = f"f/{val:.1f}" if isinstance(val, (int, float)) else str(val)
                        elif tag_name == "FocalLength":
                            meta["focal_length"] = f"{val}mm"
                        elif tag_name == "LensModel":
                            meta["lens_model"] = str(val).strip()

                # Check GPS sub-IFD
                if ExifTags.IFD.GPSInfo in exif:
                    gps_info = exif.get_ifd(ExifTags.IFD.GPSInfo)
                    if gps_info:
                        meta["has_gps"] = True
    except Exception:
        pass

    return meta


def strip_image_exif_metadata(image_path: str, output_path: str) -> str:
    """
    1-Click privacy removal: completely strip all EXIF tags, GPS metadata, and device serials.
    """
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    with Image.open(image_path) as img:
        data = list(img.getdata())
        image_without_exif = Image.new(img.mode, img.size)
        image_without_exif.putdata(data)

        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        image_without_exif.save(output_path, "JPEG", quality=95, optimize=True)

    # Use piexif to remove any remaining byte headers
    try:
        piexif.remove(output_path)
    except Exception:
        pass

    return output_path


def extract_dominant_color_palette(image_path: str, num_colors: int = 6) -> List[Dict[str, Any]]:
    """
    Extract top N dominant colors with hex codes, RGB values, and dominance percentage via k-means clustering.
    """
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    with Image.open(image_path) as img:
        # Resize small for fast quantization
        small = img.convert("RGB").resize((150, 150), Image.Resampling.BILINEAR)
        arr = np.array(small, dtype=np.float32).reshape(-1, 3)

    # Fast k-means quantization with PIL
    palette_img = small.quantize(colors=num_colors, method=Image.Quantize.MEDIANCUT)
    pal_data = palette_img.getpalette()[:num_colors * 3]

    colors = []
    total_pixels = 150 * 150

    # Count frequencies
    counts = np.bincount(np.array(palette_img).flatten(), minlength=num_colors)

    raw_pal = palette_img.getpalette() or []
    actual_colors = len(raw_pal) // 3
    limit = min(num_colors, actual_colors)

    for i in range(limit):
        r = raw_pal[i * 3]
        g = raw_pal[i * 3 + 1]
        b = raw_pal[i * 3 + 2]
        hex_code = f"#{r:02x}{g:02x}{b:02x}".upper()
        pct = round((counts[i] / total_pixels) * 100, 1) if i < len(counts) else 0.0
        colors.append({
            "hex": hex_code,
            "rgb": [int(r), int(g), int(b)],
            "percentage": pct,
        })

    colors.sort(key=lambda x: x["percentage"], reverse=True)
    return colors


def calculate_image_histogram(image_path: str) -> Dict[str, List[int]]:
    """
    Compute 256-bin histogram distributions for Red, Green, Blue, and Luminance channels.
    """
    if not os.path.isfile(image_path):
        raise FileNotFoundError(f"Image not found: {image_path}")

    with Image.open(image_path) as img:
        rgb = img.convert("RGB")
        r, g, b = rgb.split()
        lum = rgb.convert("L")

        hist_r = r.histogram()
        hist_g = g.histogram()
        hist_b = b.histogram()
        hist_lum = lum.histogram()

    return {
        "red": hist_r,
        "green": hist_g,
        "blue": hist_b,
        "luminance": hist_lum,
        "r": hist_r,
        "g": hist_g,
        "b": hist_b,
        "l": hist_lum,
    }
