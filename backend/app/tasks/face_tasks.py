"""Celery async task for AI Unique Face Extraction & Clustering."""
from typing import Dict, Any, Optional
from app.celery_app import celery
from app.config import OUTPUT_DIR
from app.services.face_service import FaceService


@celery.task(bind=True, name="app.tasks.face_tasks.extract_unique_faces_task")
def extract_unique_faces_task(
    self,
    video_id: str,
    video_path: str,
    sample_rate_fps: float = 1.5,
    similarity_threshold: float = 0.65,
    min_face_size: int = 40,
    max_frames: int = 300,
) -> Dict[str, Any]:
    """Extract unique people and best-shots from video."""
    self.update_state(
        state="PROGRESS",
        meta={"percent": 5.0, "message": "Initializing neural face detection models..."},
    )

    def progress_cb(pct: float, msg: str):
        self.update_state(
            state="PROGRESS",
            meta={"percent": round(pct, 1), "message": msg},
        )

    res = FaceService.extract_and_cluster_video_faces(
        video_path=video_path,
        output_dir=OUTPUT_DIR,
        video_id=video_id,
        sample_rate_fps=sample_rate_fps,
        similarity_threshold=similarity_threshold,
        min_face_size=min_face_size,
        max_frames=max_frames,
        progress_callback=progress_cb,
    )

    res["task_id"] = self.request.id
    return res
