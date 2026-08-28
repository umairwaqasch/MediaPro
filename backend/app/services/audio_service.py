"""Audio Mastering & Waveform Analysis Service for Media Pro."""
import os
import subprocess
import json
import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger("mediapro.audio")

LOUDNORM_PRESETS = {
    "youtube_14": {"target_i": -14.0, "true_peak": -1.0, "lra": 11.0},
    "podcast_16": {"target_i": -16.0, "true_peak": -1.0, "lra": 11.0},
    "broadcast_23": {"target_i": -23.0, "true_peak": -1.0, "lra": 7.0},
    "loud_9": {"target_i": -9.0, "true_peak": -0.5, "lra": 14.0},
}


class AudioService:
    @classmethod
    def build_mastering_filters(cls, params: Dict[str, Any]) -> str:
        """Construct a high-fidelity FFmpeg audio filter graph from mastering parameters."""
        filters = []

        # 1. Noise Gate (if enabled)
        if params.get("noise_gate"):
            filters.append("agate=threshold=-38dB:ratio=2.5:range=-60dB:attack=20:release=250")

        # 2. Vocal Clarity Chain (High-pass + presence lift)
        if params.get("vocal_clarity"):
            filters.append("highpass=f=90")
            filters.append("equalizer=f=2800:width_type=o:width=1.5:g=3.0")

        # 3. 4-Band Parametric Equalizer
        bass = float(params.get("eq_bass_80hz", 0.0) or 0.0)
        lowmid = float(params.get("eq_lowmid_500hz", 0.0) or 0.0)
        highmid = float(params.get("eq_highmid_3khz", 0.0) or 0.0)
        air = float(params.get("eq_air_10khz", 0.0) or 0.0)

        if abs(bass) > 0.1:
            filters.append(f"equalizer=f=80:width_type=o:width=1.5:g={bass:.1f}")
        if abs(lowmid) > 0.1:
            filters.append(f"equalizer=f=500:width_type=o:width=1.5:g={lowmid:.1f}")
        if abs(highmid) > 0.1:
            filters.append(f"equalizer=f=3000:width_type=o:width=1.5:g={highmid:.1f}")
        if abs(air) > 0.1:
            filters.append(f"equalizer=f=10000:width_type=o:width=1.5:g={air:.1f}")

        # 4. De-Esser (High-frequency harshness control)
        if params.get("de_esser"):
            filters.append("equalizer=f=7200:width_type=o:width=1.8:g=-4.5")

        # 5. Master Gain
        gain = float(params.get("gain_db", 0.0) or 0.0)
        if abs(gain) > 0.1:
            filters.append(f"volume={gain:.1f}dB")

        # 6. Broadcast Loudness Normalization
        norm = params.get("normalize_target", "none")
        if norm in LOUDNORM_PRESETS:
            cfg = LOUDNORM_PRESETS[norm]
            filters.append(f"loudnorm=I={cfg['target_i']}:TP={cfg['true_peak']}:LRA={cfg['lra']}")

        return ",".join(filters) if filters else "anull"

    @classmethod
    def extract_waveform_peaks(cls, input_path: str, num_points: int = 400) -> Dict[str, Any]:
        """Extract normalized peak amplitudes from audio stream for client-side rendering."""
        if not os.path.exists(input_path):
            raise FileNotFoundError(f"Media file not found: {input_path}")

        # Extract low-sample 8-bit mono raw audio stream to analyze peaks quickly
        cmd = [
            "ffmpeg", "-y", "-i", input_path,
            "-vn", "-ac", "1", "-ar", "2000",
            "-f", "s8", "pipe:1",
        ]

        try:
            p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
            raw_data, _ = p.communicate(timeout=10)
            if not raw_data:
                # Return dummy peaks if silent or failed
                return {
                    "sample_rate": 44100,
                    "duration": 0.0,
                    "channels": 2,
                    "peaks": [0.1] * num_points,
                }

            # Downsample raw bytes to num_points normalized peaks
            total_samples = len(raw_data)
            chunk_size = max(1, total_samples // num_points)
            peaks = []

            for i in range(num_points):
                start = i * chunk_size
                end = min(total_samples, start + chunk_size)
                if start >= total_samples:
                    peaks.append(0.05)
                    continue

                chunk = raw_data[start:end]
                # Convert s8 byte (-128 to 127) to absolute float 0.0 - 1.0
                max_val = max((abs(int(b) - 128 if isinstance(b, int) else abs(b)) for b in chunk), default=0)
                norm_peak = min(1.0, round(max_val / 128.0, 3))
                peaks.append(max(0.05, norm_peak))

            return {
                "sample_rate": 48000,
                "duration": total_samples / 2000.0,
                "channels": 2,
                "peaks": peaks,
            }
        except Exception as e:
            logger.warning(f"Waveform extraction error: {e}")
            return {
                "sample_rate": 44100,
                "duration": 0.0,
                "channels": 2,
                "peaks": [0.15] * num_points,
            }
