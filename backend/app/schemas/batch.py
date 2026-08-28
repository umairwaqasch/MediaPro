"""Batch processing Pydantic request/response schemas."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class BatchProcessRequest(BaseModel):
    video_ids: List[str]
    operation: Optional[str] = "rescale"
    preset: Optional[str] = "720p_web"
    format: Optional[str] = "mp4"
    params: Optional[Dict[str, Any]] = {}


class BatchStatusRequest(BaseModel):
    task_ids: List[str]


class UniversalBatchSubmitRequest(BaseModel):
    media_type: str = "video"  # "video" | "image"
    operation: str
    item_ids: List[str]
    params: Optional[Dict[str, Any]] = {}
    custom_name: Optional[str] = None


class BatchCancelResponse(BaseModel):
    batch_id: str
    status: str
    cancelled_tasks: Optional[int] = 0


class BatchItemStatus(BaseModel):
    item_id: str
    task_id: str
    output_filename: str
    status: str
    percent: float = 0.0
    message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class BatchJobSummaryResponse(BaseModel):
    batch_id: str
    media_type: str
    operation: str
    custom_name: Optional[str] = ""
    status: str
    total_items: int
    completed_items: int
    failed_items: int
    overall_percent: float
    is_all_finished: bool
    created_at: float
    updated_at: float
    tasks: List[BatchItemStatus]

