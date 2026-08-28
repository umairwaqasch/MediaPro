"""Video processing Pydantic request schemas."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class CutRequest(BaseModel):
    start_time: Optional[float] = 0.0
    end_time: Optional[float] = None
    mode: str = "fast"          # "fast" or "accurate"
    audio_mode: str = "keep"    # "keep" or "mute"
    speed: float = 1.0
    volume_gain: float = 1.0
    custom_name: Optional[str] = None


class GifRequest(BaseModel):
    start_time: Optional[float] = 0.0
    end_time: Optional[float] = None
    fps: int = 15
    width: int = 480
    custom_name: Optional[str] = None


class AudioRequest(BaseModel):
    start_time: Optional[float] = 0.0
    end_time: Optional[float] = None
    audio_format: Optional[str] = "mp3"   # "mp3", "wav", "aac"
    format: Optional[str] = None
    bitrate: Optional[str] = "192k"
    custom_name: Optional[str] = None

    def get_format(self) -> str:
        return self.format or self.audio_format or "mp3" 


class SegmentItem(BaseModel):
    start_time: Optional[float] = 0.0
    end_time: Optional[float] = None
    label: Optional[str] = None


class ConcatRequest(BaseModel):
    segments: List[SegmentItem]
    custom_name: Optional[str] = None


class CropRequest(BaseModel):
    start_time: Optional[float] = 0.0
    end_time: Optional[float] = None
    crop_x: Optional[int] = None
    crop_y: Optional[int] = None
    crop_width: Optional[int] = None
    crop_height: Optional[int] = None
    aspect_ratio: Optional[str] = "9:16"
    bg_blur: bool = False
    custom_name: Optional[str] = None


class BurnInRequest(BaseModel):
    start_time: Optional[float] = 0.0
    end_time: Optional[float] = None
    text: Optional[str] = ""
    timecode_mode: Optional[str] = "none"
    position: Optional[str] = "bottom-right"
    font_size: Optional[int] = 28
    font_color: Optional[str] = "white"
    bg_box: Optional[bool] = True
    bg_opacity: Optional[float] = 0.6
    custom_name: Optional[str] = None


class SilenceDetectRequest(BaseModel):
    noise_db: Optional[float] = -30.0
    min_silence_duration: Optional[float] = 0.5
    padding: Optional[float] = 0.05


class SilenceJumpCutRequest(BaseModel):
    noise_db: Optional[float] = -30.0
    min_silence_duration: Optional[float] = 0.5
    padding: Optional[float] = 0.05
    speech_intervals: Optional[List[Dict[str, Any]]] = None
    custom_name: Optional[str] = None


class CompressRequest(BaseModel):
    start_time: Optional[float] = 0.0
    end_time: Optional[float] = None
    target_size_mb: Optional[float] = 8.0
    container: Optional[str] = "mp4"
    vcodec: Optional[str] = "h264"
    custom_name: Optional[str] = None


class SceneDetectRequest(BaseModel):
    threshold: Optional[float] = 0.4
    min_duration: Optional[float] = 0.5


class SceneSplitRequest(BaseModel):
    threshold: Optional[float] = 0.4
    min_duration: Optional[float] = 0.5
    scenes: Optional[List[Dict[str, Any]]] = None
    custom_name: Optional[str] = None


class StabilizeRequest(BaseModel):
    start_time: Optional[float] = 0.0
    end_time: Optional[float] = None
    shakiness: Optional[int] = 6
    smoothing: Optional[int] = 30
    optzoom: Optional[int] = 1
    zoom: Optional[float] = 0.0
    custom_name: Optional[str] = None


class NormalizeAudioRequest(BaseModel):
    start_time: Optional[float] = 0.0
    end_time: Optional[float] = None
    target_i: Optional[float] = -14.0
    true_peak: Optional[float] = -1.0
    lra: Optional[float] = 11.0
    as_audio_only: Optional[bool] = False
    custom_name: Optional[str] = None


class BoomerangRequest(BaseModel):
    start_time: Optional[float] = 0.0
    end_time: Optional[float] = None
    loop_count: Optional[int] = 2
    speed: Optional[float] = 1.0
    include_audio: Optional[bool] = False
    custom_name: Optional[str] = None


class SplitScreenRequest(BaseModel):
    processed_video_filename: str
    start_time: Optional[float] = 0.0
    duration: Optional[float] = 5.0
    layout: Optional[str] = "side_by_side"
    label_left: Optional[str] = "ORIGINAL"
    label_right: Optional[str] = "PROCESSED"
    custom_name: Optional[str] = None


class ColorGradeRequest(BaseModel):
    start_time: Optional[float] = 0.0
    end_time: Optional[float] = None
    preset: Optional[str] = "none"
    lut: Optional[str] = None
    brightness: Optional[float] = 0.0
    contrast: Optional[float] = 1.0
    saturation: Optional[float] = 1.0
    gamma: Optional[float] = 1.0
    exposure: Optional[float] = 0.0
    temperature: Optional[float] = 0.0
    vignette: Optional[float] = 0.0
    sharpness: Optional[float] = 0.0
    custom_name: Optional[str] = None

    def get_preset(self) -> str:
        return self.lut or self.preset or "none" 


class RescaleRequest(BaseModel):
    target_width: int
    target_height: int
    start_time: Optional[float] = 0.0
    end_time: Optional[float] = None
    algorithm: Optional[str] = "lanczos"
    framing_mode: Optional[str] = "fit_pad"
    sharpen_strength: Optional[float] = 0.0
    codec: Optional[str] = "auto"
    quality_preset: Optional[str] = "high"
    custom_name: Optional[str] = None
