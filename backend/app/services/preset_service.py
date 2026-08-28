"""Preset Service managing curated built-in recipes and persistent user presets."""
import os
import json
import time
import uuid
from typing import List, Dict, Any, Optional

PRESET_FILE = "/data/presets/user_presets.json"

BUILTIN_PRESETS: List[Dict[str, Any]] = [
    # --- Video Presets ---
    {
        "id": "builtin_yt_4k",
        "name": "YouTube 4K UHD Master",
        "type": "video",
        "category": "Social & Web",
        "description": "3840x2160 Lanczos GPU upscaler, high-bitrate master with dual-pass mastering.",
        "icon": "Maximize2",
        "tags": ["4K", "YouTube", "Lanczos", "Master"],
        "is_builtin": True,
        "params": {
            "operation": "rescale",
            "target_width": 3840,
            "target_height": 2160,
            "algorithm": "lanczos",
            "framing_mode": "fit_pad",
            "sharpen_strength": 0.3,
            "quality_preset": "high",
        },
    },
    {
        "id": "builtin_tiktok_reels",
        "name": "TikTok & Reels 9:16 Social",
        "type": "video",
        "category": "Social & Web",
        "description": "1080x1920 vertical canvas with intelligent blurred backdrop extension.",
        "icon": "Crop",
        "tags": ["9:16", "TikTok", "Reels", "Shorts"],
        "is_builtin": True,
        "params": {
            "operation": "crop",
            "aspect_ratio": "9:16",
            "bg_blur": True,
        },
    },
    {
        "id": "builtin_discord_compress",
        "name": "Discord & Slack Fast Share",
        "type": "video",
        "category": "Compression",
        "description": "Target <25MB high-efficiency H.264 compression for instant messaging uploads.",
        "icon": "Minimize2",
        "tags": ["Discord", "25MB", "Compression"],
        "is_builtin": True,
        "params": {
            "operation": "compress",
            "target_size_mb": 24.5,
            "format": "mp4",
            "codec": "h264",
        },
    },
    {
        "id": "builtin_cinematic_grade",
        "name": "Cinematic Teal & Orange Look",
        "type": "video",
        "category": "Grading",
        "description": "Hollywood 3D LUT grading with punchy contrast, warm skin tones, and subtle vignette.",
        "icon": "Palette",
        "tags": ["LUT", "Teal & Orange", "Cinematic"],
        "is_builtin": True,
        "params": {
            "operation": "colorgrade",
            "preset": "teal_orange",
            "contrast": 1.15,
            "saturation": 1.1,
            "vignette": 0.35,
        },
    },
    {
        "id": "builtin_audio_broadcast",
        "name": "EBU R128 Loudness Master",
        "type": "video",
        "category": "Audio",
        "description": "Dual-pass -14 LUFS broadcast normalization with -1.0 dBFS True-Peak limiter.",
        "icon": "Volume2",
        "tags": ["Audio", "LUFS", "EBU R128", "Podcast"],
        "is_builtin": True,
        "params": {
            "operation": "normalize",
            "target_lufs": -14.0,
            "true_peak": -1.0,
            "loudness_range": 11.0,
        },
    },
    {
        "id": "builtin_animated_gif",
        "name": "High-FPS Animated GIF Loop",
        "type": "video",
        "category": "Web & Graphics",
        "description": "480px width, 15 fps smooth GIF loop with optimized color palette generation.",
        "icon": "Film",
        "tags": ["GIF", "Loop", "Memes"],
        "is_builtin": True,
        "params": {
            "operation": "gif",
            "fps": 15,
            "width": 480,
        },
    },

    # --- Image Presets ---
    {
        "id": "builtin_img_ecommerce",
        "name": "E-Commerce Pure White Background",
        "type": "image",
        "category": "E-Commerce",
        "description": "Neural AI background removal with crisp studio #FFFFFF backdrop and edge sharpening.",
        "icon": "Sparkles",
        "tags": ["AI", "White BG", "Amazon", "Shopify"],
        "is_builtin": True,
        "params": {
            "operation": "ai_bg_remove",
            "bg_color_hex": "#FFFFFF",
            "output_format": "WEBP",
            "quality": 92,
        },
    },
    {
        "id": "builtin_img_insta_portrait",
        "name": "Instagram Portrait (4:5 Ratio)",
        "type": "image",
        "category": "Social & Web",
        "description": "4:5 vertical framing with warm golden hour LUT and 95% JPEG quality.",
        "icon": "Crop",
        "tags": ["Instagram", "4:5", "Portrait"],
        "is_builtin": True,
        "params": {
            "operation": "process",
            "aspect_ratio": "4:5",
            "lut_preset": "golden_hour",
            "output_format": "JPEG",
            "quality": 95,
        },
    },
    {
        "id": "builtin_img_doc_dewarp",
        "name": "Document Scanner & Enhancer",
        "type": "image",
        "category": "Document",
        "description": "4-point perspective dewarp to A4 paper ratio with Magic Color high-contrast filter.",
        "icon": "Scan",
        "tags": ["Document", "Dewarp", "A4", "Scanner"],
        "is_builtin": True,
        "params": {
            "operation": "perspective_crop",
            "aspect_ratio": "a4",
            "enhancement": "magic_color",
        },
    },
    {
        "id": "builtin_img_privacy_strip",
        "name": "Privacy Shield (Strip GPS & EXIF)",
        "type": "image",
        "category": "Privacy",
        "description": "Complete removal of camera metadata, lens info, and GPS geolocation coordinates.",
        "icon": "ShieldCheck",
        "tags": ["EXIF", "Privacy", "GPS"],
        "is_builtin": True,
        "params": {
            "operation": "strip_exif",
        },
    },
]


class PresetService:
    @staticmethod
    def _ensure_dir():
        d = os.path.dirname(PRESET_FILE)
        if not os.path.exists(d):
            os.makedirs(d, exist_ok=True)

    @classmethod
    def _load_user_presets(cls) -> List[Dict[str, Any]]:
        cls._ensure_dir()
        if not os.path.exists(PRESET_FILE):
            return []
        try:
            with open(PRESET_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    @classmethod
    def _save_user_presets(cls, presets: List[Dict[str, Any]]):
        cls._ensure_dir()
        with open(PRESET_FILE, "w", encoding="utf-8") as f:
            json.dump(presets, f, indent=2)

    @classmethod
    def list_presets(cls, preset_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """List all presets (built-ins + user saved)."""
        user_list = cls._load_user_presets()
        combined = list(BUILTIN_PRESETS) + list(user_list)
        if preset_type:
            combined = [p for p in combined if p.get("type") == preset_type]
        return combined

    @classmethod
    def get_preset(cls, preset_id: str) -> Optional[Dict[str, Any]]:
        for p in cls.list_presets():
            if p["id"] == preset_id:
                return p
        return None

    @classmethod
    def create_preset(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Save a new custom user preset."""
        preset_id = f"user_{str(uuid.uuid4())[:8]}"
        new_preset = {
            "id": preset_id,
            "name": data.get("name", "Custom Preset"),
            "type": data.get("type", "video"),
            "category": data.get("category", "Custom"),
            "description": data.get("description", ""),
            "icon": data.get("icon", "Sliders"),
            "tags": data.get("tags", []),
            "is_builtin": False,
            "params": data.get("params", {}),
            "created_at": time.time(),
        }

        user_presets = cls._load_user_presets()
        user_presets.insert(0, new_preset)
        cls._save_user_presets(user_presets)
        return new_preset

    @classmethod
    def delete_preset(cls, preset_id: str) -> bool:
        """Delete a user preset. Built-in presets cannot be deleted."""
        if any(p["id"] == preset_id for p in BUILTIN_PRESETS):
            return False

        user_presets = cls._load_user_presets()
        filtered = [p for p in user_presets if p["id"] != preset_id]
        if len(filtered) == len(user_presets):
            return False

        cls._save_user_presets(filtered)
        return True
