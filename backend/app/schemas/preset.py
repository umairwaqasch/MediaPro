"""Export Preset Pydantic request and response schemas."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class PresetItem(BaseModel):
    id: str
    name: str
    type: str  # "video" | "image"
    category: str
    description: Optional[str] = ""
    icon: Optional[str] = "Zap"
    tags: Optional[List[str]] = []
    is_builtin: Optional[bool] = False
    params: Dict[str, Any]
    created_at: Optional[float] = None


class PresetCreateRequest(BaseModel):
    name: str
    type: str  # "video" | "image"
    category: Optional[str] = "Custom"
    description: Optional[str] = ""
    icon: Optional[str] = "Sliders"
    tags: Optional[List[str]] = []
    params: Dict[str, Any]


class PresetListResponse(BaseModel):
    presets: List[PresetItem]
    total: int
