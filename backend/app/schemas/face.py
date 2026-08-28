"""Pydantic schemas for AI Unique Face Extraction & Clustering."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class FaceExtractionRequest(BaseModel):
    sample_rate_fps: Optional[float] = 1.5
    min_face_size: Optional[int] = 40
    similarity_threshold: Optional[float] = 0.65
    max_frames: Optional[int] = 300
    custom_name: Optional[str] = None


class FaceOccurrence(BaseModel):
    timestamp_sec: float
    timecode: str
    quality_score: float
    sharpness_score: float
    bbox: List[int]  # [x, y, w, h]


class UniquePersonItem(BaseModel):
    person_id: str
    display_name: str
    total_sightings: int
    best_timestamp_sec: float
    best_timecode: str
    best_quality_score: float
    best_sharpness_score: float
    headshot_filename: str
    headshot_url: str
    fullframe_filename: str
    fullframe_url: str
    occurrences: List[FaceOccurrence]


class FaceExtractionResponse(BaseModel):
    task_id: str
    video_id: str
    status: str
    total_unique_people: int
    total_faces_detected: int
    total_frames_sampled: int
    execution_time_sec: float
    people: List[UniquePersonItem]
