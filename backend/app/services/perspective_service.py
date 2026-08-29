import os
import cv2
import numpy as np
from PIL import Image
from typing import Optional, List, Dict, Any

def order_points(pts: np.ndarray) -> np.ndarray:
    """
    Order points in standard clockwise format:
    [Top-Left, Top-Right, Bottom-Right, Bottom-Left].
    """
    rect = np.zeros((4, 2), dtype="float32")
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]  # Top-Left has smallest sum
    rect[2] = pts[np.argmax(s)]  # Bottom-Right has largest sum

    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]  # Top-Right has smallest difference (y - x)
    rect[3] = pts[np.argmax(diff)]  # Bottom-Left has largest difference (y - x)
    return rect


def auto_detect_document_corners(image_path: str) -> list:
    """
    Auto-detect the 4 corners of a document/paper in the image using contour analysis.
    Returns normalized coordinates [[x, y], ...] in 0.0-1.0 range.
    """
    img = cv2.imread(image_path)
    if img is None:
        return [[0.08, 0.08], [0.92, 0.08], [0.92, 0.92], [0.08, 0.92]]

    h, w = img.shape[:2]

    # Downscale for fast edge detection
    scale = 800.0 / max(h, w) if max(h, w) > 800 else 1.0
    if scale < 1.0:
        small = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    else:
        small = img.copy()

    sh, sw = small.shape[:2]
    gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Edge detection
    edges = cv2.Canny(blurred, 50, 150)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    dilated = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    for c in contours:
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        if len(approx) == 4 and cv2.isContourConvex(approx):
            area = cv2.contourArea(approx)
            if area > (sh * sw * 0.10):  # At least 10% of image area
                pts = approx.reshape(4, 2).astype("float32")
                ordered = order_points(pts)
                norm_pts = []
                for pt in ordered:
                    norm_pts.append([float(pt[0] / sw), float(pt[1] / sh)])
                return norm_pts

    # Fallback to standard 8% margin inset rectangle
    return [
        [0.08, 0.08],  # Top-Left
        [0.92, 0.08],  # Top-Right
        [0.92, 0.92],  # Bottom-Right
        [0.08, 0.92],  # Bottom-Left
    ]


def enhance_document(img_bgr: np.ndarray, mode: str) -> np.ndarray:
    """
    Apply scanner-grade document enhancements to flattened page.
    """
    if mode == 'magic_color':
        lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        bg = cv2.medianBlur(cv2.dilate(l, np.ones((7, 7), np.uint8)), 21)
        diff = 255 - cv2.absdiff(l, bg)
        norm = cv2.normalize(diff, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        enhanced_lab = cv2.merge([norm, a, b])
        res = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
        kernel = np.array([[0, -0.5, 0], [-0.5, 3.0, -0.5], [0, -0.5, 0]], dtype=np.float32)
        res = cv2.filter2D(res, -1, kernel)
        return res

    elif mode == 'bw_scan':
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        bw = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 25, 12
        )
        return cv2.cvtColor(bw, cv2.COLOR_GRAY2BGR)

    elif mode == 'gray_document':
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        stretched = clahe.apply(gray)
        return cv2.cvtColor(stretched, cv2.COLOR_GRAY2BGR)

    return img_bgr


def warp_perspective_crop(
    input_path: str,
    output_path: str,
    points: list,
    aspect_ratio: str = 'auto',
    enhancement: str = 'none',
    target_width: Optional[int] = None,
    target_height: Optional[int] = None,
    scale_percent: Optional[float] = None,
    quality: int = 95
) -> dict:
    """
    Perform 4-point homography perspective transform, crop, deskew, and enhance.
    Supports all standard print (A4, Letter, Legal) and digital (1:1, 9:16, 16:9, 4:5, 4:3, etc.) ratios.
    """
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError(f"Unable to read image at {input_path}")

    h, w = img.shape[:2]
    pts = np.array(points, dtype="float32")

    # Convert normalized coords (0.0 - 1.0) to pixel coordinates
    if np.max(pts) <= 1.0:
        pts[:, 0] *= w
        pts[:, 1] *= h

    # Order points: TL, TR, BR, BL
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # Compute Euclidean widths and heights
    width_a = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    width_b = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    max_width = max(int(width_a), int(width_b), 100)

    height_a = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    height_b = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    max_height = max(int(height_a), int(height_b), 100)

    # Standard Aspect Ratio Mapping
    ratio_map = {
        'a4': 1.0 / 1.4142,
        'a4_portrait': 1.0 / 1.4142,
        'a4_landscape': 1.4142,
        'us_letter': 8.5 / 11.0,
        'letter': 8.5 / 11.0,
        'us_legal': 8.5 / 14.0,
        'legal': 8.5 / 14.0,
        '1:1': 1.0,
        'square': 1.0,
        'square_1_1': 1.0,
        '9:16': 9.0 / 16.0,
        '16:9': 16.0 / 9.0,
        '4:5': 4.0 / 5.0,
        '4:3': 4.0 / 3.0,
        '3:4': 3.0 / 4.0,
        '2:3': 2.0 / 3.0,
        '3:2': 3.0 / 2.0,
        '21:9': 21.0 / 9.0,
    }

    if aspect_ratio in ratio_map:
        target_w_over_h = ratio_map[aspect_ratio]
        max_height = max(100, int(max_width / target_w_over_h))

    # Explicit Target Width/Height Override
    if target_width and target_height:
        max_width = int(target_width)
        max_height = int(target_height)
    elif target_width and not target_height:
        ratio = max_height / max(max_width, 1)
        max_width = int(target_width)
        max_height = int(max_width * ratio)
    elif target_height and not target_width:
        ratio = max_width / max(max_height, 1)
        max_height = int(target_height)
        max_width = int(max_height * ratio)

    # Percentage scaling
    if scale_percent and scale_percent > 0:
        max_width = max(50, int(max_width * (scale_percent / 100.0)))
        max_height = max(50, int(max_height * (scale_percent / 100.0)))

    dst = np.array([
        [0, 0],
        [max_width - 1, 0],
        [max_width - 1, max_height - 1],
        [0, max_height - 1],
    ], dtype="float32")

    # Compute Homography Perspective Matrix & Warp
    M = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(img, M, (max_width, max_height), flags=cv2.INTER_LANCZOS4)

    # Apply scanner enhancement filter
    final_img = enhance_document(warped, enhancement)

    # Save output
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    ext = os.path.splitext(output_path)[1].lower()
    if ext in ('.jpg', '.jpeg'):
        cv2.imwrite(output_path, final_img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    elif ext == '.png':
        cv2.imwrite(output_path, final_img, [cv2.IMWRITE_PNG_COMPRESSION, 4])
    elif ext == '.webp':
        cv2.imwrite(output_path, final_img, [cv2.IMWRITE_WEBP_QUALITY, quality])
    else:
        cv2.imwrite(output_path, final_img)

    return {
        "status": "SUCCESS",
        "output_path": output_path,
        "width": max_width,
        "height": max_height,
        "aspect_ratio": aspect_ratio,
        "enhancement": enhancement
    }
