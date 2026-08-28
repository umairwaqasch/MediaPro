"""AI Face Extraction, Neural Clustering & Best-Shot Gallery Engine using OpenCV YuNet & SFace."""
import os
import time
import math
import urllib.request
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Callable
import cv2
import numpy as np

MODEL_DIR = "/data/models"
YUNET_PATH = os.path.join(MODEL_DIR, "face_detection_yunet_2023mar.onnx")
SFACE_PATH = os.path.join(MODEL_DIR, "face_recognition_sface_2021dec.onnx")

YUNET_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
SFACE_URL = "https://github.com/opencv/opencv_zoo/raw/main/models/face_recognition_sface/face_recognition_sface_2021dec.onnx"


def ensure_face_models() -> Tuple[str, str]:
    """Ensure OpenCV YuNet and SFace models exist, auto-downloading if missing."""
    os.makedirs(MODEL_DIR, exist_ok=True)
    if not os.path.exists(YUNET_PATH) or os.path.getsize(YUNET_PATH) < 1000:
        try:
            urllib.request.urlretrieve(YUNET_URL, YUNET_PATH)
        except Exception as e:
            print(f"Warning: Failed to download YuNet model: {e}")

    if not os.path.exists(SFACE_PATH) or os.path.getsize(SFACE_PATH) < 1000:
        try:
            urllib.request.urlretrieve(SFACE_URL, SFACE_PATH)
        except Exception as e:
            print(f"Warning: Failed to download SFace model: {e}")

    return YUNET_PATH, SFACE_PATH


def format_timecode(seconds: float) -> str:
    """Format seconds into MM:SS or HH:MM:SS string."""
    mins, secs = divmod(int(seconds), 60)
    hrs, mins = divmod(mins, 60)
    if hrs > 0:
        return f"{hrs:02d}:{mins:02d}:{secs:02d}"
    return f"{mins:02d}:{secs:02d}"


def calculate_face_quality(
    frame: np.ndarray,
    bbox: Tuple[int, int, int, int],
    landmarks: Optional[np.ndarray] = None
) -> Tuple[float, float]:
    """
    Compute multi-factor quality score (0 - 100) and sharpness score (0 - 100).
    Evaluates:
      1. Sharpness: Laplacian variance on grayscale face ROI (no motion blur).
      2. Frontality / Symmetry: Eye-nose-mouth alignment.
      3. Resolution / Scale: Face area in pixels.
    """
    x, y, w, h = bbox
    fh, fw = frame.shape[:2]
    x1, y1 = max(0, x), max(0, y)
    x2, y2 = min(fw, x + w), min(fh, y + h)

    if x2 <= x1 or y2 <= y1:
        return 10.0, 10.0

    face_roi = frame[y1:y2, x1:x2]
    gray = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY) if len(face_roi.shape) == 3 else face_roi

    # 1. Sharpness via Laplacian Variance
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    sharpness_score = round(min(100.0, max(0.0, (lap_var / 300.0) * 100.0)), 1)

    # 2. Frontality & Pose Symmetry
    frontality_score = 70.0
    if landmarks is not None and len(landmarks) >= 5:
        # Landmarks: [r_eye, l_eye, nose, r_mouth, l_mouth]
        r_eye = landmarks[0]
        l_eye = landmarks[1]
        nose = landmarks[2]

        eye_dx = abs(l_eye[0] - r_eye[0])
        eye_dy = abs(l_eye[1] - r_eye[1])
        eye_tilt = eye_dy / max(1.0, eye_dx)

        # Nose centering between eyes
        eye_center_x = (r_eye[0] + l_eye[0]) / 2.0
        nose_offset_x = abs(nose[0] - eye_center_x) / max(1.0, eye_dx)

        if eye_tilt < 0.15 and nose_offset_x < 0.20:
            frontality_score = 95.0
        elif eye_tilt < 0.30 and nose_offset_x < 0.40:
            frontality_score = 75.0
        else:
            frontality_score = 45.0

    # 3. Resolution score
    res_score = min(100.0, (h / 160.0) * 100.0)

    # Composite weighted quality
    composite = (0.45 * sharpness_score) + (0.35 * frontality_score) + (0.20 * res_score)
    quality_score = round(min(100.0, max(10.0, composite)), 1)

    return quality_score, sharpness_score


def crop_headshot_with_padding(
    frame: np.ndarray,
    bbox: Tuple[int, int, int, int],
    margin_ratio: float = 0.20
) -> np.ndarray:
    """Crop square headshot centered on face with clean margin padding."""
    x, y, w, h = bbox
    fh, fw = frame.shape[:2]

    # Expand bounding box
    cx = x + w / 2.0
    cy = y + h / 2.0
    side = max(w, h) * (1.0 + margin_ratio * 2)

    x1 = int(max(0, cx - side / 2.0))
    y1 = int(max(0, cy - side / 2.0))
    x2 = int(min(fw, cx + side / 2.0))
    y2 = int(min(fh, cy + side / 2.0))

    crop = frame[y1:y2, x1:x2]
    # Resize to standard crisp 300x300 headshot
    if crop.size > 0:
        return cv2.resize(crop, (300, 300), interpolation=cv2.INTER_LANCZOS4)
    return frame[max(0, y):min(fh, y+h), max(0, x):min(fw, x+w)]


class FaceService:
    @staticmethod
    def extract_and_cluster_video_faces(
        video_path: str,
        output_dir: str,
        video_id: str,
        sample_rate_fps: float = 1.5,
        min_face_size: int = 40,
        similarity_threshold: float = 0.65,
        max_frames: int = 300,
        progress_callback: Optional[Callable[[float, str], None]] = None,
    ) -> Dict[str, Any]:
        """
        Scan video, detect human faces, cluster unique individuals via SFace embeddings,
        and select the sharpest Best-Shot photograph per person.
        """
        if not os.path.isfile(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")

        t0 = time.time()
        os.makedirs(output_dir, exist_ok=True)
        ensure_face_models()

        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise ValueError(f"Could not open video file: {video_path}")

        fps = max(1.0, cap.get(cv2.CAP_PROP_FPS) or 30.0)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 1)
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH) or 1280)
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) or 720)

        # Initialize YuNet & SFace models
        detector = None
        recognizer = None
        has_yunet = os.path.exists(YUNET_PATH) and os.path.getsize(YUNET_PATH) > 1000
        has_sface = os.path.exists(SFACE_PATH) and os.path.getsize(SFACE_PATH) > 1000

        if has_yunet:
            try:
                detector = cv2.FaceDetectorYN.create(
                    model=YUNET_PATH,
                    config="",
                    input_size=(width, height),
                    score_threshold=0.6,
                    nms_threshold=0.3,
                    top_k=5000,
                )
            except Exception as e:
                print(f"Failed to create YuNet detector: {e}")

        if has_sface:
            try:
                recognizer = cv2.FaceRecognizerSF.create(
                    model=SFACE_PATH,
                    config="",
                )
            except Exception as e:
                print(f"Failed to create SFace recognizer: {e}")

        frame_step = max(1, int(fps / max(0.2, sample_rate_fps)))
        detections = []
        frame_idx = 0
        sampled_count = 0

        while cap.isOpened() and sampled_count < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % frame_step == 0:
                sampled_count += 1
                curr_sec = round(frame_idx / fps, 2)
                timecode_str = format_timecode(curr_sec)

                if progress_callback and sampled_count % 5 == 0:
                    pct = min(75.0, (frame_idx / max(1, total_frames)) * 75.0)
                    progress_callback(pct, f"Scanning faces at {timecode_str} (frame {frame_idx}/{total_frames})...")

                if detector is not None:
                    detector.setInputSize((frame.shape[1], frame.shape[0]))
                    _, faces = detector.detect(frame)
                    if faces is not None:
                        for face in faces:
                            # Face vector: [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score]
                            bbox = [int(face[0]), int(face[1]), int(face[2]), int(face[3])]
                            if bbox[2] < min_face_size or bbox[3] < min_face_size:
                                continue

                            landmarks = np.array([
                                [face[4], face[5]],   # Right Eye
                                [face[6], face[7]],   # Left Eye
                                [face[8], face[9]],   # Nose
                                [face[10], face[11]], # Right Mouth
                                [face[12], face[13]], # Left Mouth
                            ])

                            # SFace aligned feature vector
                            feature = None
                            if recognizer is not None:
                                try:
                                    aligned_face = recognizer.alignCrop(frame, face)
                                    feature = recognizer.feature(aligned_face)
                                except Exception:
                                    pass

                            q_score, s_score = calculate_face_quality(frame, bbox, landmarks)

                            detections.append({
                                "timestamp_sec": curr_sec,
                                "timecode": timecode_str,
                                "bbox": bbox,
                                "quality_score": q_score,
                                "sharpness_score": s_score,
                                "feature": feature,
                                "frame": frame.copy(),
                            })

            frame_idx += 1

        cap.release()

        if progress_callback:
            progress_callback(80.0, f"Clustering {len(detections)} detected faces into unique individuals...")

        # ----------------------------------------------------------------------
        # Identity Clustering (De-duplication)
        # ----------------------------------------------------------------------
        clusters = []  # list of list of detection dicts

        for det in detections:
            matched_cluster_idx = None
            best_sim = -1.0

            if det["feature"] is not None and recognizer is not None:
                for c_idx, cluster in enumerate(clusters):
                    centroid_feat = cluster["features"][0]
                    sim = recognizer.match(centroid_feat, det["feature"], cv2.FaceRecognizerSF_FR_COSINE)
                    if sim >= similarity_threshold and sim > best_sim:
                        best_sim = sim
                        matched_cluster_idx = c_idx

            if matched_cluster_idx is not None:
                clusters[matched_cluster_idx]["items"].append(det)
                if det["feature"] is not None:
                    clusters[matched_cluster_idx]["features"].append(det["feature"])
            else:
                clusters.append({
                    "items": [det],
                    "features": [det["feature"]] if det["feature"] is not None else [],
                })

        if progress_callback:
            progress_callback(90.0, "Selecting Best-Shot photograph for each person and saving assets...")

        # ----------------------------------------------------------------------
        # Best-Shot Selection & Asset Generation
        # ----------------------------------------------------------------------
        unique_people = []

        for idx, cluster in enumerate(clusters):
            items = cluster["items"]
            # Sort by composite quality score descending
            items.sort(key=lambda x: x["quality_score"], reverse=True)
            best = items[0]

            person_id = f"person_{idx + 1}"
            display_name = f"Person {idx + 1}"

            # Save headshot crop
            headshot_img = crop_headshot_with_padding(best["frame"], best["bbox"])
            headshot_filename = f"{video_id}_{person_id}_best_headshot.jpg"
            headshot_path = os.path.join(output_dir, headshot_filename)
            cv2.imwrite(headshot_path, headshot_img, [int(cv2.IMWRITE_JPEG_QUALITY), 95])

            # Save full-frame
            fullframe_filename = f"{video_id}_{person_id}_best_fullframe.jpg"
            fullframe_path = os.path.join(output_dir, fullframe_filename)
            cv2.imwrite(fullframe_path, best["frame"], [int(cv2.IMWRITE_JPEG_QUALITY), 95])

            occurrences = []
            for it in items:
                occurrences.append({
                    "timestamp_sec": it["timestamp_sec"],
                    "timecode": it["timecode"],
                    "quality_score": it["quality_score"],
                    "sharpness_score": it["sharpness_score"],
                    "bbox": it["bbox"],
                })

            unique_people.append({
                "person_id": person_id,
                "display_name": display_name,
                "total_sightings": len(items),
                "best_timestamp_sec": best["timestamp_sec"],
                "best_timecode": best["timecode"],
                "best_quality_score": best["quality_score"],
                "best_sharpness_score": best["sharpness_score"],
                "headshot_filename": headshot_filename,
                "headshot_url": f"/mediapro/api/media/output/{headshot_filename}",
                "fullframe_filename": fullframe_filename,
                "fullframe_url": f"/mediapro/api/media/output/{fullframe_filename}",
                "occurrences": occurrences,
            })

        # Sort people by total sightings descending
        unique_people.sort(key=lambda p: p["total_sightings"], reverse=True)

        exec_time = round(time.time() - t0, 2)

        return {
            "video_id": video_id,
            "status": "SUCCESS",
            "total_unique_people": len(unique_people),
            "total_faces_detected": len(detections),
            "total_frames_sampled": sampled_count,
            "execution_time_sec": exec_time,
            "people": unique_people,
        }
