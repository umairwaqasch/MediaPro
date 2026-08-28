"""FFmpeg and FFprobe service wrappers for VideoProcessor with CUDA/NVENC auto-detection."""
import json
import subprocess
import os
import re
from typing import Optional, List, Callable, Dict, Any

# Hardware Acceleration Cache
_HW_ACCEL_INFO = None


def detect_hardware_acceleration() -> dict:
    """
    Detect if NVIDIA CUDA / NVENC hardware encoding is available and operational.
    Gracefully falls back to CPU if not present.
    """
    global _HW_ACCEL_INFO
    if _HW_ACCEL_INFO is not None:
        return _HW_ACCEL_INFO

    # 1. Check GPU Device Name via nvidia-smi if available
    gpu_name = None
    try:
        smi_res = subprocess.run(
            ["nvidia-smi", "--query-gpu=name", "--format=csv,noheader"],
            capture_output=True,
            text=True,
            timeout=3,
        )
        if smi_res.returncode == 0 and smi_res.stdout.strip():
            gpu_name = smi_res.stdout.strip().split("\n")[0]
    except Exception:
        gpu_name = None

    # 2. Test NVENC H.264 Encoder
    nvenc_h264_works = False
    try:
        test_cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "nullsrc=s=256x256:d=0.1",
            "-c:v", "h264_nvenc",
            "-f", "null", "-",
        ]
        res = subprocess.run(test_cmd, capture_output=True, text=True, timeout=5)
        nvenc_h264_works = (res.returncode == 0)
    except Exception:
        nvenc_h264_works = False

    # 3. Test NVENC HEVC (H.265) Encoder
    nvenc_hevc_works = False
    try:
        test_cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "nullsrc=s=256x256:d=0.1",
            "-c:v", "hevc_nvenc",
            "-f", "null", "-",
        ]
        res = subprocess.run(test_cmd, capture_output=True, text=True, timeout=5)
        nvenc_hevc_works = (res.returncode == 0)
    except Exception:
        nvenc_hevc_works = False

    if nvenc_h264_works:
        _HW_ACCEL_INFO = {
            "mode": "cuda",
            "is_gpu": True,
            "gpu_name": gpu_name or "NVIDIA CUDA GPU",
            "encoder_h264": "h264_nvenc",
            "encoder_hevc": "hevc_nvenc" if nvenc_hevc_works else "libx265",
            "label": f"🚀 CUDA / NVENC ({gpu_name or 'NVIDIA GPU'})",
            "description": "Hardware Accelerated Encoding Active",
        }
    else:
        _HW_ACCEL_INFO = {
            "mode": "cpu",
            "is_gpu": False,
            "gpu_name": "CPU (Software Mode)",
            "encoder_h264": "libx264",
            "encoder_hevc": "libx265",
            "label": "⚙️ CPU Mode (libx264)",
            "description": "Software Encoding (CPU Fallback)",
        }

    return _HW_ACCEL_INFO


def get_best_video_encoder(target_codec: str = "h264") -> tuple[str, list[str]]:
    """
    Get the optimal encoder and parameter flags based on hardware capabilities.
    Returns (encoder_name, encoder_args_list).
    """
    accel = detect_hardware_acceleration()

    if accel["is_gpu"] and target_codec == "h264":
        # Ultra-fast NVIDIA NVENC with high quality constant quantization (cq 19)
        return "h264_nvenc", ["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "19"]
    elif accel["is_gpu"] and target_codec in ("h265", "hevc"):
        return "hevc_nvenc", ["-c:v", "hevc_nvenc", "-preset", "p4", "-cq", "22"]
    elif target_codec in ("h265", "hevc"):
        return "libx265", ["-c:v", "libx265", "-preset", "medium", "-crf", "22"]
    else:
        # Standard CPU libx264
        return "libx264", ["-c:v", "libx264", "-preset", "medium", "-crf", "18"]


def probe_video(filepath: str) -> dict:
    """Extract comprehensive video metadata using ffprobe."""
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        filepath,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr}")

    data = json.loads(result.stdout)

    video_stream = None
    audio_stream = None
    for stream in data.get("streams", []):
        if stream["codec_type"] == "video" and video_stream is None:
            video_stream = stream
        elif stream["codec_type"] == "audio" and audio_stream is None:
            audio_stream = stream

    if not video_stream:
        raise ValueError("No video stream found in file")

    fps_str = video_stream.get("r_frame_rate", "30/1")
    fps_parts = fps_str.split("/")
    fps = float(fps_parts[0]) / float(fps_parts[1]) if len(fps_parts) == 2 else float(fps_parts[0])

    duration = float(data["format"].get("duration", 0))
    total_frames = int(duration * fps)

    return {
        "duration": duration,
        "fps": round(fps, 3),
        "total_frames": total_frames,
        "width": int(video_stream.get("width", 0)),
        "height": int(video_stream.get("height", 0)),
        "codec_video": video_stream.get("codec_name", "unknown"),
        "codec_audio": audio_stream.get("codec_name", "unknown") if audio_stream else None,
        "bitrate": int(data["format"].get("bit_rate", 0)),
        "size_bytes": int(data["format"].get("size", 0)),
        "format_name": data["format"].get("format_name", "unknown"),
    }


def capture_snapshot(
    input_path: str,
    output_path: str,
    timestamp: float,
    img_format: str = "png",
) -> str:
    """Capture a single frame snapshot at timestamp."""
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(timestamp),
        "-i", input_path,
        "-vframes", "1",
    ]
    if img_format == "png":
        cmd += ["-c:v", "png", output_path]
    else:
        cmd += ["-q:v", "2", output_path]

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(f"Snapshot failed: {result.stderr}")
    return output_path


def build_atempo_filter_chain(speed: float) -> str:
    """
    Build chained atempo filter string for arbitrary speed from 0.05 to 100.0.
    FFmpeg's atempo accepts values between 0.5 and 2.0 per instance.
    """
    curr = float(speed)
    if curr <= 0.01:
        return "atempo=1.0"
    filters = []
    while curr < 0.5:
        filters.append("atempo=0.5")
        curr /= 0.5
    while curr > 2.0:
        filters.append("atempo=2.0")
        curr /= 2.0
    filters.append(f"atempo={curr:.4f}")
    return ",".join(filters)


def cut_video(
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    mode: str = "fast",
    audio_mode: str = "keep",  # "keep" | "mute"
    speed: float = 1.0,        # continuous speed from 0.10 to 4.0
    volume_gain: float = 1.0,
    progress_callback=None,
) -> str:
    """
    Cut a video segment with optional audio stripping, continuous speed adjustment, and volume gain.
    """
    if end_time is None or end_time <= start_time:
        meta = probe_video(input_path)
        end_time = meta.get("duration", 0.0)
    duration = max(0.1, end_time - start_time)
    needs_reencode = mode != "fast" or audio_mode == "mute" or abs(speed - 1.0) > 0.001 or volume_gain != 1.0

    if not needs_reencode:
        # Fast Stream Copy
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start_time),
            "-i", input_path,
            "-t", str(duration),
            "-c", "copy",
            "-avoid_negative_ts", "make_zero",
            "-progress", "pipe:1",
            "-nostats",
            output_path,
        ]
    else:
        # Re-encode mode with GPU NVENC acceleration + speed adjustment + volume gain
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start_time),
            "-i", input_path,
            "-t", str(duration),
        ]

        # Video filters
        v_filters = []
        if abs(speed - 1.0) > 0.001:
            setpts_val = 1.0 / speed
            v_filters.append(f"setpts={setpts_val:.6f}*PTS")

        if v_filters:
            cmd += ["-vf", ",".join(v_filters)]

        _, encoder_flags = get_best_video_encoder("h264")
        cmd += encoder_flags

        # Audio handling
        if audio_mode == "mute":
            cmd += ["-an"]
        else:
            a_filters = []
            if abs(speed - 1.0) > 0.001:
                a_filters.append(build_atempo_filter_chain(speed))
            if volume_gain != 1.0:
                a_filters.append(f"volume={volume_gain:.2f}")

            if a_filters:
                cmd += ["-af", ",".join(a_filters)]
            cmd += ["-c:a", "aac", "-b:a", "192k"]

        cmd += ["-avoid_negative_ts", "make_zero", "-progress", "pipe:1", "-nostats", output_path]

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    spd = "0x"
    try:
        for line in process.stdout:
            line = line.strip()
            if line.startswith("out_time_ms="):
                try:
                    time_ms = int(line.split("=")[1])
                    curr = time_ms / 1_000_000.0
                    effective_duration = duration / speed
                    if effective_duration > 0 and progress_callback:
                        pct = min(100.0, (curr / effective_duration) * 100)
                        progress_callback(pct, spd)
                except Exception:
                    pass
            elif line.startswith("speed="):
                spd = line.split("=")[1].strip()

        process.wait(timeout=600)
    except subprocess.TimeoutExpired:
        process.kill()
        raise TimeoutError("Video processing timed out after 600 seconds")

    if process.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {process.stderr.read()}")

    if progress_callback:
        progress_callback(100.0, spd)

    return output_path


def create_animated_gif(
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    fps: int = 15,
    width: int = 480,
    progress_callback=None,
) -> str:
    """Create high-quality animated GIF using two-pass palettegen filter."""
    if end_time is None or end_time <= start_time:
        meta = probe_video(input_path)
        end_time = meta.get("duration", 0.0)
    duration = max(0.1, end_time - start_time)
    filter_complex = (
        f"[0:v]fps={fps},scale={width}:-1:flags=lanczos,split[s0][s1];"
        f"[s0]palettegen=max_colors=128[p];"
        f"[s1][p]paletteuse=dither=bayer:bayer_scale=5"
    )

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-i", input_path,
        "-t", str(duration),
        "-filter_complex", filter_complex,
        "-loop", "0",
        "-progress", "pipe:1",
        "-nostats",
        output_path,
    ]

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    spd = "0x"
    try:
        for line in process.stdout:
            line = line.strip()
            if line.startswith("out_time_ms="):
                try:
                    time_ms = int(line.split("=")[1])
                    curr = time_ms / 1_000_000.0
                    if duration > 0 and progress_callback:
                        pct = min(100.0, (curr / duration) * 100)
                        progress_callback(pct, spd)
                except Exception:
                    pass
            elif line.startswith("speed="):
                spd = line.split("=")[1].strip()

        process.wait(timeout=600)
    except subprocess.TimeoutExpired:
        process.kill()
        raise TimeoutError("GIF generation timed out after 600 seconds")

    if process.returncode != 0:
        raise RuntimeError(f"GIF generation failed: {process.stderr.read()}")

    if progress_callback:
        progress_callback(100.0, spd)

    return output_path


def extract_audio_stream(
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    audio_format: str = "mp3",
    bitrate: str = "192k",
    progress_callback=None,
) -> str:
    """Extract audio track as MP3, AAC, or WAV."""
    if end_time is None or end_time <= start_time:
        meta = probe_video(input_path)
        end_time = meta.get("duration", 0.0)
    duration = max(0.1, end_time - start_time)
    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-i", input_path,
        "-t", str(duration),
        "-vn",
    ]

    if audio_format == "mp3":
        cmd += ["-c:a", "libmp3lame", "-b:a", bitrate]
    elif audio_format == "wav":
        cmd += ["-c:a", "pcm_s16le"]
    elif audio_format == "aac":
        cmd += ["-c:a", "aac", "-b:a", bitrate]

    cmd += ["-progress", "pipe:1", "-nostats", output_path]

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    spd = "0x"
    try:
        for line in process.stdout:
            line = line.strip()
            if line.startswith("out_time_ms="):
                try:
                    time_ms = int(line.split("=")[1])
                    curr = time_ms / 1_000_000.0
                    if duration > 0 and progress_callback:
                        pct = min(100.0, (curr / duration) * 100)
                        progress_callback(pct, spd)
                except Exception:
                    pass
            elif line.startswith("speed="):
                spd = line.split("=")[1].strip()

        process.wait(timeout=600)
    except subprocess.TimeoutExpired:
        process.kill()
        raise TimeoutError("Audio extraction timed out after 600 seconds")

    if process.returncode != 0:
        raise RuntimeError(f"Audio extraction failed: {process.stderr.read()}")

    if progress_callback:
        progress_callback(100.0, spd)

    return output_path


def concatenate_videos(
    clip_paths: List[str],
    output_path: str,
    progress_callback=None,
) -> str:
    """Concatenate multiple video files into a single video."""
    if not clip_paths:
        raise ValueError("No video clips provided for concatenation")

    # Create temporary concat list file with escaped paths
    concat_list_file = f"{output_path}_concat_list.txt"
    with open(concat_list_file, "w", encoding="utf-8") as f:
        for clip in clip_paths:
            escaped_clip = clip.replace("'", "'\\''")
            f.write(f"file '{escaped_clip}'\n")

    cmd = [
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", concat_list_file,
        "-c", "copy",
        "-progress", "pipe:1",
        "-nostats",
        output_path,
    ]

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    spd = "0x"
    try:
        for line in process.stdout:
            line = line.strip()
            if line.startswith("speed="):
                spd = line.split("=")[1].strip()
                if progress_callback:
                    progress_callback(50.0, spd)

        process.wait(timeout=600)
    except subprocess.TimeoutExpired:
        process.kill()
        raise TimeoutError("FFmpeg concatenation timed out after 600 seconds")
    finally:
        if os.path.exists(concat_list_file):
            try:
                os.remove(concat_list_file)
            except Exception:
                pass

    if process.returncode != 0:
        raise RuntimeError(f"Concatenation failed: {process.stderr.read()}")

    if progress_callback:
        progress_callback(100.0, spd)

    return output_path


def generate_thumbnails(
    input_path: str,
    output_dir: str,
    video_id: str,
    count: int = 24,
    width: int = 160,
) -> list[str]:
    """Generate evenly-spaced thumbnail images for filmstrip timeline."""
    meta = probe_video(input_path)
    duration = meta["duration"]

    if duration <= 0:
        return []

    interval = duration / count
    thumbnails = []

    for i in range(count):
        timestamp = interval * i + (interval / 2)
        output_file = f"{output_dir}/{video_id}_thumb_{i:04d}.jpg"

        cmd = [
            "ffmpeg", "-y",
            "-ss", str(timestamp),
            "-i", input_path,
            "-vframes", "1",
            "-vf", f"scale={width}:-1",
            "-q:v", "5",
            output_file,
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            thumbnails.append(output_file)

    return thumbnails


def crop_video(
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    crop_x: Optional[int] = None,
    crop_y: Optional[int] = None,
    crop_width: Optional[int] = None,
    crop_height: Optional[int] = None,
    aspect_ratio: Optional[str] = "9:16",
    bg_blur: bool = False,
    progress_callback=None,
) -> str:
    """
    Crop video or convert aspect ratio with optional dynamic blurred background padding.
    """
    meta = probe_video(input_path)
    if end_time is None or end_time <= start_time:
        end_time = meta.get("duration", 0.0)
    duration = max(0.1, end_time - start_time)
    src_w = meta["width"]
    src_h = meta["height"]
    has_audio = meta.get("codec_audio") is not None

    _, encoder_flags = get_best_video_encoder("h264")

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-i", input_path,
        "-t", str(duration),
    ]

    if bg_blur:
        # Determine target canvas dimensions for social aspect ratios
        if aspect_ratio == "9:16":
            target_w, target_h = (1080, 1920) if src_h >= 1080 else (720, 1280)
        elif aspect_ratio == "1:1":
            target_w, target_h = (1080, 1080) if src_h >= 1080 else (720, 720)
        elif aspect_ratio == "4:5":
            target_w, target_h = (1080, 1350) if src_h >= 1080 else (720, 900)
        elif aspect_ratio == "16:9":
            target_w, target_h = (1920, 1080) if src_h >= 1080 else (1280, 720)
        else:
            target_w, target_h = (1080, 1920)

        filter_complex = (
            f"[0:v]scale={target_w}:{target_h}:force_original_aspect_ratio=increase,crop={target_w}:{target_h},boxblur=25:5[bg];"
            f"[0:v]scale={target_w}:{target_h}:force_original_aspect_ratio=decrease[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2"
        )
        cmd += ["-filter_complex", filter_complex]
    else:
        # Direct pixel cropping
        if crop_width and crop_height and crop_x is not None and crop_y is not None:
            # Ensure coordinates and dimensions are valid and even (yuv420p requirement)
            cw = max(32, min(src_w, (int(crop_width) // 2) * 2))
            ch = max(32, min(src_h, (int(crop_height) // 2) * 2))
            cx = max(0, min(src_w - cw, (int(crop_x) // 2) * 2))
            cy = max(0, min(src_h - ch, (int(crop_y) // 2) * 2))
            cmd += ["-vf", f"crop={cw}:{ch}:{cx}:{cy}"]
        elif aspect_ratio == "9:16":
            cw = min(src_w, (int(src_h * 9 / 16) // 2) * 2)
            ch = src_h
            cx = (src_w - cw) // 2
            cy = 0
            cmd += ["-vf", f"crop={cw}:{ch}:{cx}:{cy}"]
        elif aspect_ratio == "1:1":
            size = (min(src_w, src_h) // 2) * 2
            cx = (src_w - size) // 2
            cy = (src_h - size) // 2
            cmd += ["-vf", f"crop={size}:{size}:{cx}:{cy}"]
        elif aspect_ratio == "4:5":
            cw = min(src_w, (int(src_h * 4 / 5) // 2) * 2)
            ch = src_h
            cx = (src_w - cw) // 2
            cy = 0
            cmd += ["-vf", f"crop={cw}:{ch}:{cx}:{cy}"]
        elif aspect_ratio == "16:9":
            ch = min(src_h, (int(src_w * 9 / 16) // 2) * 2)
            cw = src_w
            cx = 0
            cy = (src_h - ch) // 2
            cmd += ["-vf", f"crop={cw}:{ch}:{cx}:{cy}"]

    cmd += encoder_flags

    if has_audio:
        cmd += ["-c:a", "aac", "-b:a", "192k"]
    else:
        cmd += ["-an"]

    cmd += ["-avoid_negative_ts", "make_zero", "-progress", "pipe:1", "-nostats", output_path]

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    spd = "0x"
    try:
        for line in process.stdout:
            line = line.strip()
            if line.startswith("out_time_ms="):
                try:
                    time_ms = int(line.split("=")[1])
                    curr = time_ms / 1_000_000.0
                    if duration > 0 and progress_callback:
                        pct = min(100.0, (curr / duration) * 100)
                        progress_callback(pct, spd)
                except Exception:
                    pass
            elif line.startswith("speed="):
                spd = line.split("=")[1].strip()

        process.wait(timeout=600)
    except subprocess.TimeoutExpired:
        process.kill()
        raise TimeoutError("Crop operation timed out after 600 seconds")

    if process.returncode != 0:
        raise RuntimeError(f"Crop operation failed: {process.stderr.read()}")

    if progress_callback:
        progress_callback(100.0, spd)

    return output_path


def burn_in_overlay(
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    text: Optional[str] = "",
    timecode_mode: Optional[str] = "none",  # 'none' | 'smpte' | 'frame' | 'pts'
    position: Optional[str] = "bottom-right",  # 'top-left' | 'top-right' | 'top-center' | 'bottom-left' | 'bottom-right' | 'bottom-center' | 'center'
    font_size: int = 28,
    font_color: str = "white",
    bg_box: bool = True,
    bg_opacity: float = 0.6,
    progress_callback: Optional[Callable[[float, str], None]] = None,
) -> str:
    """
    Burn in custom text, watermark labels, and/or SMPTE running timecodes into video frames.
    Uses DejaVu Sans Mono / Sans Bold fonts with GPU NVENC hardware acceleration.
    """
    meta = probe_video(input_path)
    total_duration = meta.get("duration", 0)
    has_audio = meta.get("codec_audio") is not None
    fps = meta.get("fps", 30)

    if end_time is None or end_time <= start_time:
        end_time = total_duration

    duration = max(0.1, end_time - start_time)

    # Position formulas for FFmpeg drawtext
    pos_map = {
        "top-left": ("32", "32"),
        "top-right": ("w-tw-32", "32"),
        "top-center": ("(w-tw)/2", "32"),
        "bottom-left": ("32", "h-th-32"),
        "bottom-right": ("w-tw-32", "h-th-32"),
        "bottom-center": ("(w-tw)/2", "h-th-32"),
        "center": ("(w-tw)/2", "(h-th)/2"),
    }
    x_expr, y_expr = pos_map.get(position or "bottom-right", ("w-tw-32", "h-th-32"))

    # Escape custom text for FFmpeg drawtext
    clean_text = (text or "").strip()
    escaped_text = clean_text.replace("'", "'\\''").replace(":", "\\:").replace("%", "\\%")

    # Build text expression based on timecode mode
    font_file = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"
    if timecode_mode == "smpte":
        if escaped_text:
            text_expr = f"{escaped_text}  %{'{pts\\:hms}'}"
        else:
            text_expr = "%{pts\\:hms}"
    elif timecode_mode == "frame":
        if escaped_text:
            text_expr = f"{escaped_text}  F\\:%{'{n}'}"
        else:
            text_expr = "FRAME %{n}"
    else:
        text_expr = escaped_text if escaped_text else " "
        font_file = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

    # Box styling
    safe_opacity = max(0.0, min(1.0, float(bg_opacity if bg_opacity is not None else 0.6)))
    box_str = f"box=1:boxcolor=black@{safe_opacity}:boxborderw=8" if bg_box else "box=0"
    safe_color = (font_color or "white").lower().strip()
    safe_size = max(12, min(120, int(font_size or 28)))

    drawtext_filter = (
        f"drawtext=fontfile={font_file}:"
        f"text='{text_expr}':"
        f"x={x_expr}:y={y_expr}:"
        f"fontsize={safe_size}:"
        f"fontcolor={safe_color}:"
        f"{box_str}"
    )

    _, encoder_flags = get_best_video_encoder("h264")

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-i", input_path,
        "-t", str(duration),
        "-vf", drawtext_filter,
    ]
    cmd += encoder_flags

    if has_audio:
        cmd += ["-c:a", "aac", "-b:a", "192k"]
    else:
        cmd += ["-an"]

    cmd += ["-avoid_negative_ts", "make_zero", "-progress", "pipe:1", "-nostats", output_path]

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    spd = "0x"
    try:
        for line in process.stdout:
            line = line.strip()
            if line.startswith("out_time_ms="):
                try:
                    time_ms = int(line.split("=")[1])
                    curr = time_ms / 1_000_000.0
                    if duration > 0 and progress_callback:
                        pct = min(100.0, (curr / duration) * 100)
                        progress_callback(pct, spd)
                except Exception:
                    pass
            elif line.startswith("speed="):
                spd = line.split("=")[1].strip()

        process.wait(timeout=600)
    except subprocess.TimeoutExpired:
        process.kill()
        raise TimeoutError("Burn-in operation timed out after 600 seconds")

    if process.returncode != 0:
        raise RuntimeError(f"Burn-in operation failed: {process.stderr.read()}")

    if progress_callback:
        progress_callback(100.0, spd)

    return output_path


def detect_silence_intervals(
    input_path: str,
    noise_db: float = -30.0,
    min_silence_duration: float = 0.5,
    padding: float = 0.05,
) -> dict:
    """
    Scan audio stream using FFmpeg's silencedetect filter and return detected silence
    and active speech intervals with time savings metrics.
    """
    meta = probe_video(input_path)
    total_duration = meta.get("duration", 0)

    if not meta.get("codec_audio"):
        return {
            "original_duration": total_duration,
            "silence_duration": 0.0,
            "tightened_duration": total_duration,
            "percent_saved": 0.0,
            "silence_count": 0,
            "speech_intervals": [{"start_time": 0.0, "end_time": total_duration, "label": "Full Clip"}],
            "silence_intervals": [],
        }

    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-af", f"silencedetect=noise={noise_db}dB:d={min_silence_duration}",
        "-f", "null",
        "-",
    ]

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )
    _, stderr = process.communicate()

    # Parse silence intervals from stderr
    silence_starts = [float(m) for m in re.findall(r"silence_start:\s*([0-9.]+)", stderr)]
    silence_ends = [float(m) for m in re.findall(r"silence_end:\s*([0-9.]+)", stderr)]

    silence_intervals = []
    for i in range(min(len(silence_starts), len(silence_ends))):
        s_start = silence_starts[i]
        s_end = silence_ends[i]
        if s_end > s_start:
            silence_intervals.append({
                "start": round(s_start, 3),
                "end": round(s_end, 3),
                "duration": round(s_end - s_start, 3),
            })

    if len(silence_starts) > len(silence_ends):
        s_start = silence_starts[-1]
        if total_duration > s_start:
            silence_intervals.append({
                "start": round(s_start, 3),
                "end": round(total_duration, 3),
                "duration": round(total_duration - s_start, 3),
            })

    # Invert silence into speech intervals with safety padding
    raw_speech = []
    current_time = 0.0

    for sil in silence_intervals:
        speech_end = min(total_duration, sil["start"] + padding)
        if speech_end - current_time >= 0.1:
            raw_speech.append((max(0.0, current_time), speech_end))
        current_time = max(0.0, sil["end"] - padding)

    if total_duration - current_time >= 0.1:
        raw_speech.append((current_time, total_duration))

    # Merge overlapping or contiguous speech intervals
    merged_speech = []
    for start, end in raw_speech:
        if not merged_speech:
            merged_speech.append([start, end])
        else:
            prev_start, prev_end = merged_speech[-1]
            if start <= prev_end + 0.05:
                merged_speech[-1][1] = max(prev_end, end)
            else:
                merged_speech.append([start, end])

    speech_intervals = [
        {
            "start_time": round(s, 3),
            "end_time": round(e, 3),
            "duration": round(e - s, 3),
            "label": f"Speech #{i + 1}",
        }
        for i, (s, e) in enumerate(merged_speech)
    ]

    total_speech_duration = sum(seg["duration"] for seg in speech_intervals)
    silence_saved = max(0.0, total_duration - total_speech_duration)
    percent_saved = round((silence_saved / total_duration) * 100, 1) if total_duration > 0 else 0.0

    return {
        "original_duration": round(total_duration, 3),
        "silence_duration": round(silence_saved, 3),
        "tightened_duration": round(total_speech_duration, 3),
        "percent_saved": percent_saved,
        "silence_count": len(silence_intervals),
        "speech_intervals": speech_intervals,
        "silence_intervals": silence_intervals,
    }


def remove_silence_jump_cut(
    input_path: str,
    output_path: str,
    speech_intervals: List[Dict[str, float]],
    progress_callback: Optional[Callable[[float, str], None]] = None,
) -> str:
    """
    Render a tightened jump-cut video from speech intervals using GPU NVENC acceleration.
    """
    if not speech_intervals:
        raise ValueError("No speech intervals provided for jump-cut rendering")

    temp_clips = []
    try:
        for idx, seg in enumerate(speech_intervals):
            start = float(seg.get("start_time", seg.get("start", 0.0)))
            end = float(seg.get("end_time", seg.get("end", 0.0)))
            if end <= start:
                continue
            temp_clip = f"{output_path}_temp_jump_{idx}.mp4"
            cut_video(
                input_path=input_path,
                output_path=temp_clip,
                start_time=start,
                end_time=end,
                mode="accurate",
            )
            temp_clips.append(temp_clip)

            if progress_callback:
                pct = ((idx + 1) / len(speech_intervals)) * 75.0
                progress_callback(pct, "1x")

        concatenate_videos(temp_clips, output_path)

        if progress_callback:
            progress_callback(100.0, "1x")

        return output_path
    finally:
        for clip in temp_clips:
            if os.path.exists(clip):
                try:
                    os.remove(clip)
                except Exception:
                    pass


def compress_video_to_size(
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    target_size_mb: float = 8.0,
    container: str = "mp4",
    vcodec: str = "h264",
    progress_callback: Optional[Callable[[float, str], None]] = None,
) -> str:
    """
    Compress a video segment to fit under a specified target file size (in MB)
    using calculated video and audio bitrates with GPU NVENC hardware acceleration.
    """
    meta = probe_video(input_path)
    total_dur = meta.get("duration", 0.0)
    if end_time is None or end_time <= start_time:
        end_time = total_dur
    duration = max(0.1, end_time - start_time)
    has_audio = meta.get("codec_audio") is not None

    # Calculate total target bits with 5% container/muxing safety margin
    total_target_bits = target_size_mb * 8 * 1024 * 1024 * 0.95
    total_bitrate_bps = max(64_000, total_target_bits / duration)

    # Allocate audio & video bitrate
    if has_audio:
        audio_bitrate_bps = min(128_000, int(total_bitrate_bps * 0.15))
        video_bitrate_bps = max(50_000, int(total_bitrate_bps - audio_bitrate_bps))
    else:
        audio_bitrate_bps = 0
        video_bitrate_bps = int(total_bitrate_bps)

    video_bitrate_k = f"{int(video_bitrate_bps / 1000)}k"
    audio_bitrate_k = f"{int(audio_bitrate_bps / 1000)}k"
    bufsize_k = f"{int(video_bitrate_bps * 2 / 1000)}k"

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-i", input_path,
        "-t", str(duration),
    ]

    hw = detect_hardware_acceleration()
    is_gpu = hw.get("is_gpu", False)

    # Video Codec Selection
    if vcodec in ("hevc", "h265"):
        if is_gpu:
            cmd += ["-c:v", "hevc_nvenc", "-preset", "p4", "-b:v", video_bitrate_k, "-maxrate", video_bitrate_k, "-bufsize", bufsize_k]
        else:
            cmd += ["-c:v", "libx265", "-preset", "fast", "-b:v", video_bitrate_k, "-maxrate", video_bitrate_k, "-bufsize", bufsize_k]
    elif vcodec == "vp9":
        cmd += ["-c:v", "libvpx-vp9", "-b:v", video_bitrate_k, "-maxrate", video_bitrate_k, "-bufsize", bufsize_k]
    elif vcodec == "prores":
        cmd += ["-c:v", "prores_ks", "-profile:v", "2"]
    else:  # default h264
        if is_gpu:
            cmd += ["-c:v", "h264_nvenc", "-preset", "p4", "-b:v", video_bitrate_k, "-maxrate", video_bitrate_k, "-bufsize", bufsize_k]
        else:
            cmd += ["-c:v", "libx264", "-preset", "fast", "-b:v", video_bitrate_k, "-maxrate", video_bitrate_k, "-bufsize", bufsize_k]

    # Audio Codec Selection
    if has_audio:
        if container == "webm" or vcodec == "vp9":
            cmd += ["-c:a", "libopus", "-b:a", audio_bitrate_k]
        elif container == "mov" and vcodec == "prores":
            cmd += ["-c:a", "pcm_s16le"]
        else:
            cmd += ["-c:a", "aac", "-b:a", audio_bitrate_k]
    else:
        cmd += ["-an"]

    cmd += ["-avoid_negative_ts", "make_zero", "-progress", "pipe:1", "-nostats", output_path]

    process = subprocess.Popen(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    spd = "0x"
    try:
        for line in process.stdout:
            line = line.strip()
            if line.startswith("out_time_ms="):
                try:
                    time_ms = int(line.split("=")[1])
                    curr = time_ms / 1_000_000.0
                    if duration > 0 and progress_callback:
                        pct = min(100.0, (curr / duration) * 100)
                        progress_callback(pct, spd)
                except Exception:
                    pass
            elif line.startswith("speed="):
                spd = line.split("=")[1].strip()

        process.wait(timeout=600)
    except subprocess.TimeoutExpired:
        process.kill()
        raise TimeoutError("Compression operation timed out after 600 seconds")

    if process.returncode != 0:
        raise RuntimeError(f"Compression operation failed: {process.stderr.read()}")

    if progress_callback:
        progress_callback(100.0, spd)

    return output_path


def detect_scene_changes(
    input_path: str,
    threshold: float = 0.4,
    min_duration: float = 0.5,
) -> Dict[str, Any]:
    """
    Detect visual scene changes and shot transitions using FFmpeg's scene detection filter.
    Returns detected cut points and constructed scene intervals.
    """
    meta = probe_video(input_path)
    total_duration = meta.get("duration", 0.0)
    if total_duration <= 0:
        return {
            "scene_count": 1,
            "scenes": [{"id": "scene_1", "scene_number": 1, "start_time": 0.0, "end_time": 0.0, "duration": 0.0}],
            "cut_points": [],
            "total_duration": 0.0,
        }

    # Run FFmpeg with scene detection filter
    filter_str = f"select='gt(scene,{threshold})',showinfo"
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", filter_str,
        "-f", "null", "-",
    ]

    process = subprocess.run(
        cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    stderr_output = process.stderr or ""
    # Extract timestamps from showinfo
    raw_cuts = [float(x) for x in re.findall(r"pts_time:\s*([0-9.]+)", stderr_output)]

    # Filter cuts that are too close to boundaries or to each other
    valid_cuts = []
    for c in sorted(raw_cuts):
        if c < min_duration or c > (total_duration - min_duration):
            continue
        if not valid_cuts or (c - valid_cuts[-1]) >= min_duration:
            valid_cuts.append(round(c, 3))

    # Construct scene segments
    cut_boundaries = sorted(list(set([0.0] + valid_cuts + [total_duration])))
    scenes = []
    for i in range(len(cut_boundaries) - 1):
        s_start = round(cut_boundaries[i], 3)
        s_end = round(cut_boundaries[i + 1], 3)
        scenes.append({
            "id": f"scene_{i + 1}",
            "scene_number": i + 1,
            "start_time": s_start,
            "end_time": s_end,
            "duration": round(s_end - s_start, 3),
        })

    return {
        "scene_count": len(scenes),
        "scenes": scenes,
        "cut_points": valid_cuts,
        "total_duration": round(total_duration, 3),
        "threshold": threshold,
    }


def split_video_scenes(
    input_path: str,
    output_dir: str,
    video_id: str,
    scenes: List[Dict[str, Any]],
    custom_name: Optional[str] = None,
    progress_callback: Optional[Callable[[float, str], None]] = None,
) -> List[str]:
    """
    Split video into individual scene clips using GPU NVENC hardware acceleration.
    """
    if not scenes:
        raise ValueError("No scenes provided for splitting")

    output_files = []
    total = len(scenes)

    for idx, sc in enumerate(scenes):
        start = sc["start_time"]
        end = sc["end_time"]
        prefix = f"scene_{idx + 1:02d}"
        if custom_name:
            prefix = f"{custom_name}_sc{idx + 1:02d}"

        out_name = f"{video_id}_{prefix}_{int(start)}s_{int(end)}s.mp4"
        out_path = os.path.join(output_dir, out_name)

        cut_video(
            input_path=input_path,
            output_path=out_path,
            start_time=start,
            end_time=end,
            mode="accurate",
        )
        output_files.append(out_name)

        if progress_callback:
            pct = ((idx + 1) / total) * 100.0
            progress_callback(pct, "1x")

    return output_files


def stabilize_video(
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    shakiness: int = 6,
    smoothing: int = 30,
    optzoom: int = 1,
    zoom: float = 0.0,
    progress_callback: Optional[Callable[[float, str], None]] = None,
) -> str:
    """
    2-Pass Optical Video Stabilization using vidstabdetect and vidstabtransform with GPU NVENC.
    """
    if end_time is None or end_time <= start_time:
        meta = probe_video(input_path)
        end_time = meta.get("duration", 0.0)
    duration = max(0.1, end_time - start_time)
    trf_file = f"{output_path}_transforms.trf"

    try:
        # Pass 1: Motion Vector Analysis
        if progress_callback:
            progress_callback(5.0, "Analyzing motion vectors (Pass 1/2)...")

        cmd_pass1 = [
            "ffmpeg", "-y",
            "-ss", str(start_time),
            "-i", input_path,
            "-t", str(duration),
            "-vf", f"vidstabdetect=stepsize=6:shakiness={shakiness}:accuracy=10:result={trf_file}",
            "-f", "null", "-",
        ]
        proc1 = subprocess.run(cmd_pass1, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if proc1.returncode != 0:
            raise RuntimeError(f"Pass 1 motion analysis failed: {proc1.stderr}")

        if progress_callback:
            progress_callback(50.0, "Smoothing frames & rendering stabilized video (Pass 2/2)...")

        # Pass 2: Motion Compensation & Rendering
        hw = detect_hardware_acceleration()
        is_gpu = hw.get("is_gpu", False)
        vcodec = "h264_nvenc" if is_gpu else "libx264"
        preset = "p4" if is_gpu else "fast"

        transform_vf = f"vidstabtransform=input={trf_file}:smoothing={smoothing}:optzoom={optzoom}:zoom={zoom}"

        cmd_pass2 = [
            "ffmpeg", "-y",
            "-ss", str(start_time),
            "-i", input_path,
            "-t", str(duration),
            "-vf", transform_vf,
            "-c:v", vcodec,
            "-preset", preset,
            "-c:a", "copy",
            "-progress", "pipe:1",
            "-nostats",
            output_path,
        ]

        proc2 = subprocess.Popen(cmd_pass2, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        spd = "1x"
        try:
            for line in proc2.stdout:
                line = line.strip()
                if line.startswith("out_time_ms="):
                    try:
                        time_ms = int(line.split("=")[1])
                        curr = time_ms / 1_000_000.0
                        if duration > 0 and progress_callback:
                            pct = 50.0 + min(49.0, (curr / duration) * 50.0)
                            progress_callback(pct, spd)
                    except Exception:
                        pass
                elif line.startswith("speed="):
                    spd = line.split("=")[1].strip()

            proc2.wait(timeout=600)
        except subprocess.TimeoutExpired:
            proc2.kill()
            raise TimeoutError("Pass 2 stabilization timed out after 600s")

        if proc2.returncode != 0:
            raise RuntimeError(f"Pass 2 stabilization failed: {proc2.stderr.read()}")

        if progress_callback:
            progress_callback(100.0, spd)

        return output_path
    finally:
        if os.path.exists(trf_file):
            try:
                os.remove(trf_file)
            except Exception:
                pass


def generate_audio_waveform(
    input_path: str,
    output_path: str,
    width: int = 1200,
    height: int = 64,
    color: str = "#06b6d4",
) -> Optional[str]:
    """
    Generate an audio waveform PNG image using showwavespic filter.
    Returns output_path if successful, None if video has no audio stream.
    """
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    color_hex = color.replace("#", "0x") if color.startswith("#") else color

    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-filter_complex", f"aformat=channel_layouts=mono,showwavespic=s={width}x{height}:colors={color}",
        "-frames:v", "1",
        output_path,
    ]

    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    if res.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 0:
        return output_path
    return None


def measure_audio_loudness(
    input_path: str,
    start_time: float = 0.0,
    duration: Optional[float] = None,
    target_i: float = -14.0,
    true_peak: float = -1.0,
    lra: float = 11.0,
) -> Dict[str, Any]:
    """
    Measure audio loudness metrics using FFmpeg loudnorm filter pass 1.
    """
    cmd = ["ffmpeg", "-ss", str(start_time)]
    if duration and duration > 0:
        cmd.extend(["-t", str(duration)])
    cmd.extend([
        "-i", input_path,
        "-af", f"loudnorm=I={target_i}:TP={true_peak}:LRA={lra}:print_format=json",
        "-f", "null", "-",
    ])

    proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    stderr_text = proc.stderr

    # Extract JSON blob between { and }
    match = re.search(r"\{[^{}]*\"input_i\"[^{}]*\}", stderr_text, re.DOTALL)
    if not match:
        raise RuntimeError(f"Could not parse loudnorm measurement JSON: {stderr_text[-500:]}")

    try:
        data = json.loads(match.group(0))
        return {
            "input_i": float(data.get("input_i", -24.0)),
            "input_tp": float(data.get("input_tp", -2.0)),
            "input_lra": float(data.get("input_lra", 11.0)),
            "input_thresh": float(data.get("input_thresh", -34.0)),
            "target_offset": float(data.get("target_offset", 0.0)),
            "raw": data,
        }
    except Exception as e:
        raise RuntimeError(f"Failed to decode loudnorm JSON: {e}")


def normalize_audio_ebu_r128(
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    target_i: float = -14.0,
    true_peak: float = -1.0,
    lra: float = 11.0,
    as_audio_only: bool = False,
    progress_callback: Optional[Callable[[float, str], None]] = None,
) -> str:
    """
    Dual-pass EBU R128 broadcast loudness normalizer with linear filter compensation.
    """
    if end_time is None or end_time <= start_time:
        meta = probe_video(input_path)
        end_time = meta.get("duration", 0.0)
    duration = max(0.1, end_time - start_time)

    # Pass 1: Measure
    if progress_callback:
        progress_callback(10.0, "Measuring audio loudness profile (Pass 1/2)...")

    meas = measure_audio_loudness(
        input_path=input_path,
        start_time=start_time,
        duration=duration,
        target_i=target_i,
        true_peak=true_peak,
        lra=lra,
    )

    if progress_callback:
        progress_callback(40.0, "Normalizing & rendering audio master (Pass 2/2)...")

    loudnorm_filter = (
        f"loudnorm=I={target_i}:TP={true_peak}:LRA={lra}:"
        f"measured_I={meas['input_i']}:measured_TP={meas['input_tp']}:"
        f"measured_LRA={meas['input_lra']}:measured_thresh={meas['input_thresh']}:"
        f"offset={meas['target_offset']}:linear=true"
    )

    if as_audio_only:
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start_time),
            "-i", input_path,
            "-t", str(duration),
            "-af", loudnorm_filter,
            "-c:a", "libmp3lame" if output_path.endswith(".mp3") else "aac",
            "-b:a", "192k",
            "-progress", "pipe:1",
            "-nostats",
            output_path,
        ]
    else:
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start_time),
            "-i", input_path,
            "-t", str(duration),
            "-af", loudnorm_filter,
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-progress", "pipe:1",
            "-nostats",
            output_path,
        ]

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    spd = "1x"
    try:
        for line in proc.stdout:
            line = line.strip()
            if line.startswith("out_time_ms="):
                try:
                    time_ms = int(line.split("=")[1])
                    curr = time_ms / 1_000_000.0
                    if duration > 0 and progress_callback:
                        pct = 40.0 + min(59.0, (curr / duration) * 60.0)
                        progress_callback(pct, spd)
                except Exception:
                    pass
            elif line.startswith("speed="):
                spd = line.split("=")[1].strip()

        proc.wait(timeout=600)
    except subprocess.TimeoutExpired:
        proc.kill()
        raise TimeoutError("Audio normalization timed out after 600s")

    if proc.returncode != 0:
        raise RuntimeError(f"Audio normalization failed: {proc.stderr.read()}")

    if progress_callback:
        progress_callback(100.0, spd)

    return output_path


def create_boomerang_loop(
    input_path: str,
    output_path: str,
    start_time: float,
    end_time: float,
    loop_count: int = 2,
    speed: float = 1.0,
    include_audio: bool = False,
    progress_callback: Optional[Callable[[float, str], None]] = None,
) -> str:
    """
    Generate a seamless ping-pong boomerang video (forward + reverse repeated N times).
    """
    duration = max(0.1, end_time - start_time)
    loops = max(1, min(10, int(loop_count)))
    hw = detect_hardware_acceleration()
    is_gpu = hw.get("is_gpu", False)
    vcodec = "h264_nvenc" if is_gpu else "libx264"
    preset = "p4" if is_gpu else "fast"

    # Forward + Reverse Filter
    vfilter = "[0:v]split=2[v1][v2];[v2]reverse[v2r];[v1][v2r]concat=n=2:v=1:a=0[vpong]"
    if speed != 1.0:
        setpts_val = 1.0 / max(0.25, min(4.0, speed))
        vfilter += f";[vpong]setpts={setpts_val:.4f}*PTS[vspeed]"
        v_final_node = "vspeed"
    else:
        v_final_node = "vpong"

    # Repeat loop
    if loops > 1:
        # Loop count = loops - 1 additional repeats
        vfilter += f";[{v_final_node}]loop=loop={loops - 1}:size=32767:start=0[vloop]"
        map_v = "[vloop]"
    else:
        map_v = f"[{v_final_node}]"

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-i", input_path,
        "-t", str(duration),
        "-filter_complex", vfilter,
        "-map", map_v,
        "-c:v", vcodec,
        "-preset", preset,
    ]

    if include_audio:
        afilter = "[0:a]asplit=2[a1][a2];[a2]areverse[a2r];[a1][a2r]concat=n=2:v=0:a=1[apong]"
        if speed != 1.0:
            afilter += f";[apong]atempo={speed}[aspeed]"
            a_final_node = "aspeed"
        else:
            a_final_node = "apong"

        if loops > 1:
            afilter += f";[{a_final_node}]aloop=loop={loops - 1}:size=2147483647:start=0[aloop]"
            map_a = "[aloop]"
        else:
            map_a = f"[{a_final_node}]"

        full_filter = f"{vfilter};{afilter}"
        cmd = [
            "ffmpeg", "-y",
            "-ss", str(start_time),
            "-i", input_path,
            "-t", str(duration),
            "-filter_complex", full_filter,
            "-map", map_v,
            "-map", map_a,
            "-c:v", vcodec,
            "-preset", preset,
            "-c:a", "aac",
        ]

    cmd.extend(["-progress", "pipe:1", "-nostats", output_path])

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    total_out_duration = duration * 2 * loops / speed
    spd = "1x"
    try:
        for line in proc.stdout:
            line = line.strip()
            if line.startswith("out_time_ms="):
                try:
                    time_ms = int(line.split("=")[1])
                    curr = time_ms / 1_000_000.0
                    if total_out_duration > 0 and progress_callback:
                        pct = min(99.0, (curr / total_out_duration) * 100.0)
                        progress_callback(pct, spd)
                except Exception:
                    pass
            elif line.startswith("speed="):
                spd = line.split("=")[1].strip()

        proc.wait(timeout=600)
    except subprocess.TimeoutExpired:
        proc.kill()
        raise TimeoutError("Boomerang generation timed out after 600s")

    if proc.returncode != 0:
        raise RuntimeError(f"Boomerang generation failed: {proc.stderr.read()}")

    if progress_callback:
        progress_callback(100.0, spd)

    return output_path


def create_split_screen_comparison(
    source_path: str,
    processed_path: str,
    output_path: str,
    start_time: float = 0.0,
    duration: float = 5.0,
    layout: str = "side_by_side",
    label_left: str = "ORIGINAL",
    label_right: str = "PROCESSED",
    progress_callback: Optional[Callable[[float, str], None]] = None,
) -> str:
    """
    Create side-by-side or stacked split screen comparison video with on-screen badges.
    """
    hw = detect_hardware_acceleration()
    is_gpu = hw.get("is_gpu", False)
    vcodec = "h264_nvenc" if is_gpu else "libx264"
    preset = "p4" if is_gpu else "fast"

    # Font style
    draw_left = f"drawtext=text='{label_left}':fontcolor=white:fontsize=20:x=20:y=20:box=1:boxcolor=black@0.6"
    draw_right = f"drawtext=text='{label_right}':fontcolor=white:fontsize=20:x=20:y=20:box=1:boxcolor=black@0.6"

    if layout == "stacked":
        fc = f"[0:v]scale=1280:360,{draw_left}[v0];[1:v]scale=1280:360,{draw_right}[v1];[v0][v1]vstack[vout]"
    else:  # side_by_side
        fc = f"[0:v]scale=640:720,{draw_left}[v0];[1:v]scale=640:720,{draw_right}[v1];[v0][v1]hstack[vout]"

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-t", str(duration),
        "-i", source_path,
        "-ss", str(start_time),
        "-t", str(duration),
        "-i", processed_path,
        "-filter_complex", fc,
        "-map", "[vout]",
        "-map", "0:a?",
        "-c:v", vcodec,
        "-preset", preset,
        "-c:a", "copy",
        "-progress", "pipe:1",
        "-nostats",
        output_path,
    ]

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    spd = "1x"
    try:
        for line in proc.stdout:
            line = line.strip()
            if line.startswith("out_time_ms="):
                try:
                    time_ms = int(line.split("=")[1])
                    curr = time_ms / 1_000_000.0
                    if duration > 0 and progress_callback:
                        pct = min(99.0, (curr / duration) * 100.0)
                        progress_callback(pct, spd)
                except Exception:
                    pass
            elif line.startswith("speed="):
                spd = line.split("=")[1].strip()

        proc.wait(timeout=600)
    except subprocess.TimeoutExpired:
        proc.kill()
        raise TimeoutError("Split screen comparison timed out after 600s")

    if proc.returncode != 0:
        raise RuntimeError(f"Split screen comparison failed: {proc.stderr.read()}")

    if progress_callback:
        progress_callback(100.0, spd)

    return output_path


def color_grade_video(
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    preset: str = "none",
    brightness: float = 0.0,
    contrast: float = 1.0,
    saturation: float = 1.0,
    temperature: float = 0.0,
    vignette: float = 0.0,
    sharpness: float = 0.0,
    progress_callback: Optional[Callable[[float, str], None]] = None,
) -> str:
    """
    Apply cinematic color grade preset and parametric adjustments to video.
    """
    if end_time is None or end_time <= start_time:
        meta = probe_video(input_path)
        end_time = meta.get("duration", 0.0)
    duration = max(0.1, end_time - start_time)
    hw = detect_hardware_acceleration()
    is_gpu = hw.get("is_gpu", False)
    vcodec = "h264_nvenc" if is_gpu else "libx264"
    preset_opt = "p4" if is_gpu else "fast"

    filters = []

    # 1. Preset Base Configuration
    base_contrast = contrast
    base_saturation = saturation
    base_brightness = brightness

    if preset == "teal_orange":
        base_contrast *= 1.15
        base_saturation *= 1.2
        filters.append("colorbalance=rs=0.08:gs=-0.02:bs=-0.08:rm=-0.05:gm=0.02:bm=0.08:rh=-0.08:gh=0.0:bh=0.12")
    elif preset == "vintage_film":
        base_contrast *= 1.05
        base_saturation *= 0.85
        filters.append("colorbalance=rs=0.12:gs=0.05:bs=-0.08:rm=0.06:gm=0.02:bm=-0.05:rh=0.02:gh=-0.02:bh=-0.06")
    elif preset == "cyberpunk":
        base_contrast *= 1.25
        base_saturation *= 1.35
        filters.append("colorbalance=rs=0.12:gs=-0.08:bs=0.15:rm=-0.08:gm=0.05:bm=0.12:rh=0.1:gh=-0.05:bh=0.15")
    elif preset == "golden_hour":
        base_contrast *= 1.1
        base_saturation *= 1.2
        filters.append("colorbalance=rs=0.15:gs=0.05:bs=-0.12:rm=0.12:gm=0.04:bm=-0.08:rh=0.08:gh=0.02:bh=-0.06")
    elif preset == "noir_bw":
        base_contrast *= 1.3
        base_saturation = 0.0
        base_brightness -= 0.02
    elif preset == "crisp_clean":
        base_contrast *= 1.1
        base_saturation *= 1.15
        filters.append("unsharp=5:5:0.8:5:5:0.0")

    # 2. Temperature Tuning
    if temperature != 0.0:
        temp_val = max(-1.0, min(1.0, float(temperature)))
        if temp_val > 0:  # Warm
            filters.append(f"colorbalance=rs={temp_val*0.1:.3f}:gs={temp_val*0.03:.3f}:bs={-temp_val*0.1:.3f}")
        else:  # Cool
            filters.append(f"colorbalance=rs={temp_val*0.08:.3f}:gs=0.0:bs={-temp_val*0.12:.3f}")

    # 3. Parametric EQ (Brightness, Contrast, Saturation)
    c_clamped = max(0.2, min(2.5, base_contrast))
    b_clamped = max(-0.8, min(0.8, base_brightness))
    s_clamped = max(0.0, min(3.0, base_saturation))
    filters.append(f"eq=contrast={c_clamped:.3f}:brightness={b_clamped:.3f}:saturation={s_clamped:.3f}")

    # 4. Vignette
    if vignette > 0.0:
        vig_amount = max(0.1, min(1.0, float(vignette)))
        # PI/6 (0.523) to PI/3 (1.047)
        angle_rad = (3.14159 / 6.0) + (vig_amount * 3.14159 / 6.0)
        filters.append(f"vignette={angle_rad:.3f}")

    # 5. Extra Sharpness
    if sharpness > 0.0 and preset != "crisp_clean":
        sharp_val = max(0.1, min(2.0, float(sharpness)))
        filters.append(f"unsharp=5:5:{sharp_val:.2f}:5:5:0.0")

    # 6. Strict Universal Web Pixel Format
    filters.append("format=yuv420p")

    vf_chain = ",".join(filters)

    cmd = [
        "ffmpeg", "-y",
        "-ss", str(start_time),
        "-i", input_path,
        "-t", str(duration),
        "-vf", vf_chain,
        "-c:v", vcodec,
        "-preset", preset_opt,
        "-c:a", "copy",
        "-progress", "pipe:1",
        "-nostats",
        output_path,
    ]

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    spd = "1x"
    try:
        for line in proc.stdout:
            line = line.strip()
            if line.startswith("out_time_ms="):
                try:
                    time_ms = int(line.split("=")[1])
                    curr = time_ms / 1_000_000.0
                    if duration > 0 and progress_callback:
                        pct = min(99.0, (curr / duration) * 100.0)
                        progress_callback(pct, spd)
                except Exception:
                    pass
            elif line.startswith("speed="):
                spd = line.split("=")[1].strip()

        proc.wait(timeout=600)
    except subprocess.TimeoutExpired:
        proc.kill()
        raise TimeoutError("Color grading timed out after 600s")

    if proc.returncode != 0:
        raise RuntimeError(f"Color grading failed: {proc.stderr.read()}")

    if progress_callback:
        progress_callback(100.0, spd)

    return output_path


def rescale_video(
    input_path: str,
    output_path: str,
    target_width: int,
    target_height: int,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    algorithm: str = "lanczos",
    framing_mode: str = "fit_pad",
    sharpen_strength: float = 0.0,
    codec: str = "auto",
    quality_preset: str = "high",
    progress_callback: Optional[Callable[[float, str], None]] = None,
) -> str:
    """
    High-performance resolution scaler & super-resolution transcoder.
    Supports 8K, 4K, 2K, 1080p, 720p, 480p, vertical & custom aspect ratios
    with Lanczos/Spline/Bicubic algorithms, CUDA/NVENC acceleration, and sharpening.
    """
    # 1. Probe source duration and format
    meta = probe_video(input_path)
    total_dur = meta.get("duration", 0.0)
    
    if end_time is None or end_time <= 0 or end_time > total_dur:
        end_time = total_dur
    
    duration = max(0.1, end_time - start_time)

    # Ensure even dimensions (required by encoders like NVENC/x264/x265)
    tw = max(16, (int(target_width) // 2) * 2)
    th = max(16, (int(target_height) // 2) * 2)

    # 2. Resampling Algorithm Flag
    algo_map = {
        "lanczos": "flags=lanczos",
        "bicubic": "flags=bicubic:param0=0:param1=0.75",
        "spline": "flags=spline",
        "bilinear": "flags=bilinear",
        "neighbor": "flags=neighbor",
    }
    flag_str = algo_map.get(algorithm.lower(), "flags=lanczos")

    # Optional Post-Scaling Texture Sharpening
    sharp_filter = ""
    if float(sharpen_strength) > 0.0:
        s_val = max(0.1, min(2.0, float(sharpen_strength) * 1.5))
        sharp_filter = f",unsharp=5:5:{s_val:.2f}:5:5:0.0"

    # 3. Framing & Aspect Ratio Mode
    use_complex = False
    filter_arg = ""

    if framing_mode == "fit_blur":
        # Dynamic Blurred Backdrop
        use_complex = True
        filter_arg = (
            f"[0:v]scale={tw}:{th}:force_original_aspect_ratio=increase:{flag_str},"
            f"crop={tw}:{th},boxblur=25:5[bg];"
            f"[0:v]scale={tw}:{th}:force_original_aspect_ratio=decrease:{flag_str}{sharp_filter}[fg];"
            f"[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[vout]"
        )
    elif framing_mode == "crop_fill":
        # Center Crop to Fill target aspect ratio
        filter_arg = (
            f"scale={tw}:{th}:force_original_aspect_ratio=increase:{flag_str},"
            f"crop={tw}:{th}{sharp_filter},format=yuv420p"
        )
    elif framing_mode == "stretch":
        # Direct Stretch
        filter_arg = f"scale={tw}:{th}:{flag_str}{sharp_filter},format=yuv420p"
    else:
        # Default: fit_pad (Letterbox / Pillarbox with clean black padding)
        filter_arg = (
            f"scale={tw}:{th}:force_original_aspect_ratio=decrease:{flag_str},"
            f"pad={tw}:{th}:(ow-iw)/2:(oh-ih)/2:black{sharp_filter},format=yuv420p"
        )

    # 4. Hardware Encoder Selection
    accel = detect_hardware_acceleration()
    is_gpu = accel.get("is_gpu", False)
    
    # Auto select HEVC for 4K/8K (>=3840 or >=2160) for optimal compression & throughput
    is_ultra_hd = (tw >= 3840 or th >= 2160)
    
    # Resolve Codec
    resolved_codec = codec.lower()
    if resolved_codec == "auto":
        resolved_codec = "hevc" if is_ultra_hd else "h264"

    # Quality setting map
    cq_h264 = 18
    cq_hevc = 20
    crf_h264 = 18
    crf_hevc = 20

    if quality_preset == "cinema_master":
        cq_h264, cq_hevc, crf_h264, crf_hevc = 14, 16, 14, 16
    elif quality_preset == "standard":
        cq_h264, cq_hevc, crf_h264, crf_hevc = 23, 24, 23, 24

    encoder_args = []
    if resolved_codec in ("hevc", "h265"):
        if is_gpu:
            encoder_args = ["-c:v", "hevc_nvenc", "-preset", "p5", "-cq", str(cq_hevc)]
        else:
            encoder_args = ["-c:v", "libx265", "-preset", "medium", "-crf", str(crf_hevc)]
    elif resolved_codec == "prores":
        encoder_args = ["-c:v", "prores_ks", "-profile:v", "3", "-vendor", "apl0", "-bits_per_mb", "8000", "-pix_fmt", "yuv422p10le"]
    else:  # h264 default
        if is_gpu:
            encoder_args = ["-c:v", "h264_nvenc", "-preset", "p5", "-cq", str(cq_h264)]
        else:
            encoder_args = ["-c:v", "libx264", "-preset", "medium", "-crf", str(crf_h264)]

    # 5. Build FFmpeg command
    cmd = ["ffmpeg", "-y", "-ss", str(start_time), "-i", input_path, "-t", str(duration)]

    if use_complex:
        cmd.extend(["-filter_complex", filter_arg, "-map", "[vout]", "-map", "0:a?"])
    else:
        cmd.extend(["-vf", filter_arg])

    cmd.extend(encoder_args)
    cmd.extend(["-c:a", "aac", "-b:a", "192k", "-progress", "pipe:1", "-nostats", output_path])

    # 6. Execute with real-time progress parsing
    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    spd = "1x"
    try:
        for line in proc.stdout:
            line = line.strip()
            if line.startswith("out_time_ms="):
                try:
                    time_ms = int(line.split("=")[1])
                    curr = time_ms / 1_000_000.0
                    if duration > 0 and progress_callback:
                        pct = min(99.0, (curr / duration) * 100.0)
                        progress_callback(pct, spd)
                except Exception:
                    pass
            elif line.startswith("speed="):
                spd = line.split("=")[1].strip()

        proc.wait(timeout=1200)  # 20 min timeout for 4K/8K rendering
    except subprocess.TimeoutExpired:
        proc.kill()
        raise TimeoutError("Rescaling timed out after 1200s")

    if proc.returncode != 0:
        raise RuntimeError(f"Rescaling failed: {proc.stderr.read()}")

    if progress_callback:
        progress_callback(100.0, spd)

    return output_path








