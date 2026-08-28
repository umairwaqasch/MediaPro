"""Shared / common Pydantic schemas (error envelopes, health, telemetry)."""
from typing import Any, Dict, Optional
from pydantic import BaseModel


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None


class StandardErrorResponse(BaseModel):
    """RFC 7807-compliant error envelope."""
    error: ErrorDetail


class HealthCheckResponse(BaseModel):
    status: str
    service: str = "mediapro-api"


class TelemetryResponse(BaseModel):
    gpu_name: Optional[str] = None
    gpu_load_percent: Optional[float] = None
    vram_used_gb: Optional[float] = None
    vram_total_gb: Optional[float] = None
    gpu_temp_c: Optional[float] = None
    cpu_count: Optional[int] = None
    ram_used_gb: Optional[float] = None
    ram_total_gb: Optional[float] = None
    disk_free_gb: Optional[float] = None
    celery_active: Optional[int] = None
    celery_reserved: Optional[int] = None
    nvenc_available: bool = False
