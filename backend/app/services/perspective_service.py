import os
import cv2
import numpy as np
from PIL import Image

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
    img_area = h * w

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
                # Rescale back to normalized 0.0 - 1.0 range
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
    Modes:
      - 'none': Original colors
      - 'magic_color': Background leveling, shadow removal & text contrast boost
      - 'bw_scan': Crisp adaptive binary thresholding (pure black & white document)
      - 'gray_document': Grayscale scan with contrast stretching
    """
    if mode == 'magic_color':
        # Convert to LAB for luminance illumination leveling
        lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(lab)
        # Dilate + Median blur background estimation
        bg = cv2.medianBlur(cv2.dilate(l, np.ones((7, 7), np.uint8)), 21)
        diff = 255 - cv2.absdiff(l, bg)
        norm = cv2.normalize(diff, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8U)
        enhanced_lab = cv2.merge([norm, a, b])
        res = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2BGR)
        # Slight sharpening
        kernel = np.array([[0, -0.5, 0], [-0.5, 3.0, -0.5], [0, -0.5, 0]], dtype=np.float32)
        res = cv2.filter2D(res, -1, kernel)
        return res

    elif mode == 'bw_scan':
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        # Gaussian adaptive thresholding
        bw = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 25, 12
        )
        return cv2.cvtColor(bw, cv2.COLOR_GRAY2BGR)

    elif mode == 'gray_document':
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        # Contrast stretching via CLAHE
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        stretched = clahe.apply(gray)
        return cv2.cvtColor(stretched, cv2.COLOR_GRAY2BGR)

    return img_bgr


def warp_perspective_crop(
    input_path: str,
    output_path: str,
    points: list,  # 4 points: [[x1, y1], [x2, y2], [x3, y3], [x4, y4]] (normalized 0.0-1.0 or pixel coordinates)
    aspect_ratio: str = 'auto',  # 'auto' | 'a4_portrait' | 'a4_landscape' | 'us_letter' | 'square_1_1'
    enhancement: str = 'none',  # 'none' | 'magic_color' | 'bw_scan' | 'gray_document'
    quality: int = 95
) -> dict:
    """
    Perform 4-point homography perspective transform, crop, deskew, and enhance.
    """
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError(f"Unable to read image at {input_path}")

    h, w = img.shape[:2]
    pts = np.array(points, dtype="float32")

    # Check if normalized (0.0 to 1.0) and convert to absolute pixel coordinates
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

    # Adjust dimensions based on target paper aspect ratio
    if aspect_ratio == 'a4_portrait':
        max_height = int(max_width * 1.4142)
    elif aspect_ratio == 'a4_landscape':
        max_height = int(max_width / 1.4142)
    elif aspect_ratio == 'us_letter':
        max_height = int(max_width * (11.0 / 8.5))
    elif aspect_ratio == 'square_1_1':
        max_height = max_width

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
    if ext in ['.jpg', '.jpeg']:
        cv2.imwrite(output_path, final_img, [cv2.IMWRITE_JPEG_QUALITY, quality])
    elif ext == '.png':
        cv2.imwrite(output_path, final_img, [cv2.IMWRITE_PNG_COMPRESSION, 4])
    elif ext == '.webp':
        cv2.imwrite(output_path, final_img, [cv2.IMWRITE_WEBP_QUALITY, quality])
    else:
        cv2.imwrite(output_path, final_img)

    return {
        "width": max_width,
        "height": max_height,
        "aspect_ratio": aspect_ratio,
        "enhancement": enhancement,
        "output_path": output_path,
    }
