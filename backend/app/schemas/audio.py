"""Audio mastering Pydantic schemas."""
from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class AudioEQBand(BaseModel):
    frequency: float  # Hz
    gain_db: float    # -12.0 to +12.0 dB
    q_factor: Optional[float] = 1.0


class AudioMasterRequest(BaseModel):
    # 4-Band Parametric EQ
    eq_bass_80hz: Optional[float] = 0.0      # -12 to +12 dB (Sub & Bass)
    eq_lowmid_500hz: Optional[float] = 0.0   # -12 to +12 dB (Body & Warmth)
    eq_highmid_3khz: Optional[float] = 0.0   # -12 to +12 dB (Presence & Clarity)
    eq_air_10khz: Optional[float] = 0.0      # -12 to +12 dB (Air & Brilliance)

    # Dynamics & Enhancement
    vocal_clarity: Optional[bool] = False    # Highpass 100Hz + vocal presence boost + soft compand
    de_esser: Optional[bool] = False         # High-frequency harshness attenuation (6-8kHz)
    noise_gate: Optional[bool] = False       # Downward expander for background hiss/room noise

    # Gain & Broadcast Normalization
    gain_db: Optional[float] = 0.0           # -24.0 to +12.0 dB master gain
    normalize_target: Optional[str] = "none" # "none" | "youtube_14" | "podcast_16" | "broadcast_23" | "loud_9"
    as_audio_only: Optional[bool] = False    # Output MP3/WAV vs muxing back into video
    audio_format: Optional[str] = "mp3"      # "mp3" | "wav" | "aac"


class AudioWaveformResponse(BaseModel):
    video_id: str
    sample_rate: int
    duration: float
    channels: int
    peaks: List[float]  # Normalized 0.0 to 1.0 peak heights (500-1000 data points)
