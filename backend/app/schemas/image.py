"""Image processing Pydantic request schemas."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class ImageProcessRequest(BaseModel):
    operation: Optional[str] = "custom"
    target_width: Optional[int] = None
    target_height: Optional[int] = None
    scale_percent: Optional[float] = None
    keep_aspect_ratio: bool = True
    resampling: str = "lanczos"
    rotate_angle: int = 0
    flip_horizontal: bool = False
    flip_vertical: bool = False
    crop_x: Optional[int] = None
    crop_y: Optional[int] = None
    crop_w: Optional[int] = None
    crop_h: Optional[int] = None
    aspect_ratio: Optional[str] = None
    blur_bg_padding: bool = False
    brightness: float = 1.0
    contrast: float = 1.0
    saturation: float = 1.0
    exposure: float = 0.0
    gamma: float = 1.0
    temperature: float = 0.0
    tint: float = 0.0
    grayscale: bool = False
    lut_preset: Optional[str] = None
    sharpen: float = 0.0
    blur_type: Optional[str] = "none"
    blur_radius: float = 0.0
    denoise: bool = False
    watermark_text: Optional[str] = None
    watermark_color: str = "#ffffff"
    watermark_size: int = 36
    watermark_opacity: float = 0.85
    watermark_position: str = "bottom_right"
    logo_path: Optional[str] = None
    logo_scale: float = 0.20
    logo_opacity: float = 0.85
    output_format: str = "JPEG"
    quality: int = 90
    optimize: bool = True
    suffix: Optional[str] = None


class ChromaKeyRequest(BaseModel):
    key_color_hex: str = "#00ff00"
    tolerance: float = 0.25
    softness: float = 0.10
    bg_color_hex: Optional[str] = None
    bg_image_path: Optional[str] = None


class CollageRequest(BaseModel):
    image_ids: List[str]
    layout: str = "2x2"
    border_width: int = 12
    border_color: str = "#18181b"


class ImageSlideshowRequest(BaseModel):
    image_ids: List[str]
    seconds_per_slide: float = 3.0


class ImageGifFromSequenceRequest(BaseModel):
    image_ids: List[str]
    fps: int = 4


class AIProcessRequest(BaseModel):
    operation: str = "bg_remove"   # "bg_remove" | "upscale" | "colorize" | "enhance"
    bg_color_hex: Optional[str] = None
    bg_image_path: Optional[str] = None
    portrait_blur_radius: int = 0
    scale: int = 2


class AIBatchProcessRequest(BaseModel):
    image_ids: List[str]
    operation: str = "bg_remove"
    params: Dict[str, Any] = {}


class ImageBatchProcessRequest(BaseModel):
    image_ids: List[str]
    operation: str
    params: Dict[str, Any] = {}


class PerspectiveCropRequest(BaseModel):
    src_points: List[List[float]]           # [[x0,y0],[x1,y1],[x2,y2],[x3,y3]]
    dst_aspect: Optional[str] = "auto"     # "auto", "a4_portrait", "us_letter", "square_1_1"
    enhance_mode: Optional[str] = "none"   # "none", "magic_color", "crisp_bw", "grayscale"
    output_format: Optional[str] = "JPEG"
    quality: Optional[int] = 90
