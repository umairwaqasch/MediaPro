"""Celery background tasks for video processing."""
import os
from typing import List, Dict, Optional, Any
from app.celery_app import celery
from app.services.ffmpeg_service import (
    cut_video,
    create_animated_gif,
    extract_audio_stream,
    concatenate_videos,
    generate_thumbnails,
    crop_video,
    burn_in_overlay,
    remove_silence_jump_cut,
    compress_video_to_size,
    split_video_scenes,
    stabilize_video,
    generate_audio_waveform,
    normalize_audio_ebu_r128,
    create_boomerang_loop,
    create_split_screen_comparison,
    color_grade_video,
    rescale_video,
    master_audio_stream,
)
from app.config import THUMBNAIL_DIR, OUTPUT_DIR


@celery.task(bind=True, name="tasks.cut_video")
def cut_video_task(
    self,
    input_path: str,
    output_path: str,
    start_time: float,
    end_time: float,
    mode: str = "fast",
    audio_mode: str = "keep",
    speed: float = 1.0,
    volume_gain: float = 1.0,
    output_filename: str = "",
) -> dict:
    """Async task to cut video with optional speed & audio filter options."""
    self.update_state(
        state="PROGRESS",
        meta={"percent": 0.0, "speed": "0x", "status": "Starting video cut..."},
    )

    def progress_callback(percent: float, spd: str):
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(percent, 1),
                "speed": spd,
                "status": f"Processing ({mode.upper()}{' @ ' + str(speed) + 'x' if speed != 1.0 else ''}): {percent:.1f}%",
            },
        )

    cut_video(
        input_path=input_path,
        output_path=output_path,
        start_time=start_time,
        end_time=end_time,
        mode=mode,
        audio_mode=audio_mode,
        speed=speed,
        volume_gain=volume_gain,
        progress_callback=progress_callback,
    )

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    return {
        "status": "COMPLETED",
        "percent": 100.0,
        "output_filename": output_filename,
        "file_size": file_size,
        "start_time": start_time,
        "end_time": end_time,
        "duration": round((end_time - start_time) / speed, 3) if end_time is not None else 0.0,
        "mode": mode,
        "speed": speed,
        "audio_mode": audio_mode,
    }


@celery.task(bind=True, name="tasks.create_gif")
def create_gif_task(
    self,
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    fps: int = 15,
    width: int = 480,
    output_filename: str = "",
) -> dict:
    """Async task to create animated GIF."""
    self.update_state(
        state="PROGRESS",
        meta={"percent": 0.0, "speed": "0x", "status": "Generating animated GIF palette..."},
    )

    def progress_callback(percent: float, spd: str):
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(percent, 1),
                "speed": spd,
                "status": f"Rendering GIF ({width}px, {fps}fps): {percent:.1f}%",
            },
        )

    create_animated_gif(
        input_path=input_path,
        output_path=output_path,
        start_time=start_time,
        end_time=end_time,
        fps=fps,
        width=width,
        progress_callback=progress_callback,
    )

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
    return {
        "status": "COMPLETED",
        "percent": 100.0,
        "output_filename": output_filename,
        "file_size": file_size,
        "duration": round(end_time - start_time, 3) if end_time is not None else 0.0,
        "type": "gif",
    }


@celery.task(bind=True, name="tasks.extract_audio")
def extract_audio_task(
    self,
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    audio_format: str = "mp3",
    bitrate: str = "192k",
    output_filename: str = "",
) -> dict:
    """Async task to extract audio track."""
    self.update_state(
        state="PROGRESS",
        meta={"percent": 0.0, "speed": "0x", "status": "Extracting audio track..."},
    )

    def progress_callback(percent: float, spd: str):
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(percent, 1),
                "speed": spd,
                "status": f"Extracting {audio_format.upper()} ({bitrate}): {percent:.1f}%",
            },
        )

    extract_audio_stream(
        input_path=input_path,
        output_path=output_path,
        start_time=start_time,
        end_time=end_time,
        audio_format=audio_format,
        bitrate=bitrate,
        progress_callback=progress_callback,
    )

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
    return {
        "status": "COMPLETED",
        "percent": 100.0,
        "output_filename": output_filename,
        "file_size": file_size,
        "duration": round(end_time - start_time, 3) if end_time is not None else 0.0,
        "type": "audio",
    }


@celery.task(bind=True, name="tasks.concat_segments")
def concat_segments_task(
    self,
    input_path: str,
    output_path: str,
    segments: List[Dict[str, float]],
    output_filename: str = "",
) -> dict:
    """Cut multiple segments and concatenate into a single highlight video."""
    self.update_state(
        state="PROGRESS",
        meta={"percent": 5.0, "status": f"Cutting {len(segments)} segments..."},
    )

    temp_clips = []
    try:
        for idx, seg in enumerate(segments):
            start = seg["start_time"]
            end = seg["end_time"]
            temp_clip = f"{output_path}_temp_seg_{idx}.mp4"
            cut_video(
                input_path=input_path,
                output_path=temp_clip,
                start_time=start,
                end_time=end,
                mode="accurate",
            )
            temp_clips.append(temp_clip)

            pct = 10.0 + ((idx + 1) / len(segments)) * 60.0
            self.update_state(
                state="PROGRESS",
                meta={"percent": pct, "status": f"Prepared segment {idx + 1}/{len(segments)}"},
            )

        self.update_state(
            state="PROGRESS",
            meta={"percent": 75.0, "status": "Merging segments into final highlight video..."},
        )

        concatenate_videos(temp_clips, output_path)

        file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
        total_duration = sum(seg["end_time"] - seg["start_time"] for seg in segments)

        return {
            "status": "COMPLETED",
            "percent": 100.0,
            "output_filename": output_filename,
            "file_size": file_size,
            "duration": round(total_duration, 3),
            "segment_count": len(segments),
            "type": "merged_highlight",
        }
    finally:
        # Guarantee cleanup of temporary clips
        for clip in temp_clips:
            if os.path.exists(clip):
                try:
                    os.remove(clip)
                except Exception:
                    pass


@celery.task(bind=True, name="tasks.generate_thumbnails")
def generate_thumbnails_task(self, input_path: str, video_id: str, count: int = 24) -> dict:
    """Async task to generate thumbnail filmstrip."""
    self.update_state(
        state="PROGRESS",
        meta={"status": "Generating timeline thumbnails..."},
    )
    thumbs = generate_thumbnails(
        input_path=input_path,
        output_dir=THUMBNAIL_DIR,
        video_id=video_id,
        count=count,
    )
    # Also generate audio waveform
    waveform_path = os.path.join(THUMBNAIL_DIR, f"{video_id}_waveform.png")
    generate_audio_waveform(input_path, waveform_path)

    filenames = [os.path.basename(t) for t in thumbs]
    return {
        "status": "COMPLETED",
        "video_id": video_id,
        "thumbnails": filenames,
    }


@celery.task(bind=True, name="tasks.crop_video")
def crop_video_task(
    self,
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
    output_filename: str = "",
) -> dict:
    """Async task to crop video or convert aspect ratio with blurred background."""
    self.update_state(
        state="PROGRESS",
        meta={"percent": 0.0, "speed": "0x", "status": "Starting video crop..."},
    )

    def progress_callback(percent: float, spd: str):
        mode_label = f"Blur BG ({aspect_ratio})" if bg_blur else f"Crop ({aspect_ratio or 'Custom'})"
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(percent, 1),
                "speed": spd,
                "status": f"Rendering {mode_label}: {percent:.1f}%",
            },
        )

    crop_video(
        input_path=input_path,
        output_path=output_path,
        start_time=start_time,
        end_time=end_time,
        crop_x=crop_x,
        crop_y=crop_y,
        crop_width=crop_width,
        crop_height=crop_height,
        aspect_ratio=aspect_ratio,
        bg_blur=bg_blur,
        progress_callback=progress_callback,
    )

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    return {
        "status": "COMPLETED",
        "percent": 100.0,
        "output_filename": output_filename,
        "file_size": file_size,
        "duration": round(end_time - start_time, 3) if end_time is not None else 0.0,
        "aspect_ratio": aspect_ratio,
        "bg_blur": bg_blur,
        "type": "crop",
    }


@celery.task(bind=True, name="tasks.burn_in")
def burn_in_task(
    self,
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    text: Optional[str] = "",
    timecode_mode: Optional[str] = "none",
    position: Optional[str] = "bottom-right",
    font_size: int = 28,
    font_color: str = "white",
    bg_box: bool = True,
    bg_opacity: float = 0.6,
    output_filename: str = "",
) -> dict:
    """Async task to burn in custom text or running timecode overlay."""
    self.update_state(
        state="PROGRESS",
        meta={"percent": 0.0, "speed": "0x", "status": "Starting burn-in overlay..."},
    )

    def progress_callback(percent: float, spd: str):
        label = "Timecode" if timecode_mode != "none" else "Text Overlay"
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(percent, 1),
                "speed": spd,
                "status": f"Rendering {label}: {percent:.1f}%",
            },
        )

    burn_in_overlay(
        input_path=input_path,
        output_path=output_path,
        start_time=start_time,
        end_time=end_time,
        text=text,
        timecode_mode=timecode_mode,
        position=position,
        font_size=font_size,
        font_color=font_color,
        bg_box=bg_box,
        bg_opacity=bg_opacity,
        progress_callback=progress_callback,
    )

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    return {
        "status": "COMPLETED",
        "percent": 100.0,
        "output_filename": output_filename,
        "file_size": file_size,
        "duration": round(end_time - start_time, 3) if end_time is not None else 0.0,
        "text": text,
        "timecode_mode": timecode_mode,
        "position": position,
        "type": "burn_in",
    }


@celery.task(bind=True, name="tasks.silence_jump_cut")
def silence_jump_cut_task(
    self,
    input_path: str,
    output_path: str,
    speech_intervals: List[Dict[str, float]],
    output_filename: str = "",
) -> dict:
    """Async task to render tightened jump-cut video removing dead air."""
    self.update_state(
        state="PROGRESS",
        meta={"percent": 0.0, "speed": "1x", "status": f"Preparing jump cuts for {len(speech_intervals)} speech segments..."},
    )

    def progress_callback(percent: float, spd: str):
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(percent, 1),
                "speed": spd,
                "status": f"Rendering jump-cut speech segments: {percent:.1f}%",
            },
        )

    remove_silence_jump_cut(
        input_path=input_path,
        output_path=output_path,
        speech_intervals=speech_intervals,
        progress_callback=progress_callback,
    )

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
    total_duration = sum(seg.get("duration", seg.get("end_time", 0) - seg.get("start_time", 0)) for seg in speech_intervals)

    return {
        "status": "COMPLETED",
        "percent": 100.0,
        "output_filename": output_filename,
        "file_size": file_size,
        "duration": round(total_duration, 3),
        "segments_count": len(speech_intervals),
        "type": "silence_jump_cut",
    }


@celery.task(bind=True, name="tasks.compress_video")
def compress_video_task(
    self,
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    target_size_mb: float = 8.0,
    container: str = "mp4",
    vcodec: str = "h264",
    output_filename: str = "",
) -> dict:
    """Async task to compress video to exact target file size."""
    self.update_state(
        state="PROGRESS",
        meta={"percent": 0.0, "speed": "1x", "status": f"Calculating bitrates for {target_size_mb} MB target size..."},
    )

    def progress_callback(percent: float, spd: str):
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(percent, 1),
                "speed": spd,
                "status": f"Compressing video ({target_size_mb} MB): {percent:.1f}%",
            },
        )

    compress_video_to_size(
        input_path=input_path,
        output_path=output_path,
        start_time=start_time,
        end_time=end_time,
        target_size_mb=target_size_mb,
        container=container,
        vcodec=vcodec,
        progress_callback=progress_callback,
    )

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    return {
        "status": "COMPLETED",
        "percent": 100.0,
        "output_filename": output_filename,
        "file_size": file_size,
        "target_size_mb": target_size_mb,
        "duration": round(end_time - start_time, 3) if end_time is not None else 0.0,
        "container": container,
        "vcodec": vcodec,
        "type": "compress",
    }


@celery.task(bind=True, name="tasks.split_scenes")
def split_scenes_task(
    self,
    input_path: str,
    output_dir: str,
    video_id: str,
    scenes: List[Dict[str, Any]],
    custom_name: Optional[str] = None,
) -> dict:
    """Async task to split video into individual scene clips."""
    self.update_state(
        state="PROGRESS",
        meta={"percent": 0.0, "speed": "1x", "status": f"Splitting video into {len(scenes)} scenes..."},
    )

    def progress_callback(percent: float, spd: str):
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(percent, 1),
                "speed": spd,
                "status": f"Exporting scenes: {percent:.1f}%",
            },
        )

    output_files = split_video_scenes(
        input_path=input_path,
        output_dir=output_dir,
        video_id=video_id,
        scenes=scenes,
        custom_name=custom_name,
        progress_callback=progress_callback,
    )

    return {
        "status": "COMPLETED",
        "percent": 100.0,
        "output_filename": output_files[0] if output_files else "",
        "output_files": output_files,
        "scenes_count": len(scenes),
        "type": "split_scenes",
    }


@celery.task(bind=True, name="tasks.stabilize_video")
def stabilize_video_task(
    self,
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    shakiness: int = 6,
    smoothing: int = 30,
    optzoom: int = 1,
    zoom: float = 0.0,
    output_filename: str = "",
) -> dict:
    """Async task for 2-pass optical video stabilization."""
    self.update_state(
        state="PROGRESS",
        meta={"percent": 0.0, "speed": "1x", "status": "Starting 2-pass video stabilization..."},
    )

    def progress_callback(percent: float, spd: str):
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(percent, 1),
                "speed": spd,
                "status": f"Stabilizing: {percent:.1f}%",
            },
        )

    stabilize_video(
        input_path=input_path,
        output_path=output_path,
        start_time=start_time,
        end_time=end_time,
        shakiness=shakiness,
        smoothing=smoothing,
        optzoom=optzoom,
        zoom=zoom,
        progress_callback=progress_callback,
    )

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    return {
        "status": "COMPLETED",
        "percent": 100.0,
        "output_filename": output_filename,
        "file_size": file_size,
        "duration": round(end_time - start_time, 3) if end_time is not None else 0.0,
        "shakiness": shakiness,
        "smoothing": smoothing,
        "type": "stabilize",
    }


@celery.task(bind=True, name="tasks.normalize_audio")
def normalize_audio_task(
    self,
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    target_i: float = -14.0,
    true_peak: float = -1.0,
    lra: float = 11.0,
    as_audio_only: bool = False,
    output_filename: str = "",
) -> dict:
    """Async task for 2-pass EBU R128 audio normalization."""
    self.update_state(
        state="PROGRESS",
        meta={"percent": 0.0, "speed": "1x", "status": "Starting EBU R128 dual-pass loudness mastering..."},
    )

    def progress_callback(percent: float, spd: str):
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(percent, 1),
                "speed": spd,
                "status": f"Normalizing audio: {percent:.1f}%",
            },
        )

    normalize_audio_ebu_r128(
        input_path=input_path,
        output_path=output_path,
        start_time=start_time,
        end_time=end_time,
        target_i=target_i,
        true_peak=true_peak,
        lra=lra,
        as_audio_only=as_audio_only,
        progress_callback=progress_callback,
    )

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    return {
        "status": "COMPLETED",
        "percent": 100.0,
        "output_filename": output_filename,
        "file_size": file_size,
        "duration": round(end_time - start_time, 3) if end_time is not None else 0.0,
        "target_i": target_i,
        "true_peak": true_peak,
        "type": "normalize_audio",
    }


@celery.task(bind=True, name="tasks.boomerang_loop")
def boomerang_loop_task(
    self,
    input_path: str,
    output_path: str,
    start_time: float = 0.0,
    end_time: Optional[float] = None,
    loop_count: int = 2,
    speed: float = 1.0,
    include_audio: bool = False,
    output_filename: str = "",
) -> dict:
    """Async task for ping-pong boomerang loop video generation."""
    self.update_state(
        state="PROGRESS",
        meta={"percent": 0.0, "speed": "1x", "status": "Generating boomerang ping-pong loop..."},
    )

    def progress_callback(percent: float, spd: str):
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(percent, 1),
                "speed": spd,
                "status": f"Rendering Boomerang ({loop_count}x loops): {percent:.1f}%",
            },
        )

    create_boomerang_loop(
        input_path=input_path,
        output_path=output_path,
        start_time=start_time,
        end_time=end_time,
        loop_count=loop_count,
        speed=speed,
        include_audio=include_audio,
        progress_callback=progress_callback,
    )

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0
    seg_dur = max(0.1, (end_time - start_time) if end_time is not None else 5.0)
    total_duration = (seg_dur * 2 * loop_count) / max(0.25, speed)

    return {
        "status": "COMPLETED",
        "percent": 100.0,
        "output_filename": output_filename,
        "file_size": file_size,
        "duration": round(total_duration, 3),
        "loop_count": loop_count,
        "speed": speed,
        "type": "boomerang",
    }


@celery.task(bind=True, name="tasks.split_screen")
def split_screen_task(
    self,
    source_path: str,
    processed_path: str,
    output_path: str,
    start_time: float = 0.0,
    duration: float = 5.0,
    layout: str = "side_by_side",
    label_left: str = "ORIGINAL",
    label_right: str = "PROCESSED",
    output_filename: str = "",
) -> dict:
    """Async task for side-by-side / stacked split screen comparison."""
    self.update_state(
        state="PROGRESS",
        meta={"percent": 0.0, "speed": "1x", "status": "Rendering split-screen comparison..."},
    )

    def progress_callback(percent: float, spd: str):
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(percent, 1),
                "speed": spd,
                "status": f"Rendering Split-Screen ({layout}): {percent:.1f}%",
            },
        )

    create_split_screen_comparison(
        source_path=source_path,
        processed_path=processed_path,
        output_path=output_path,
        start_time=start_time,
        duration=duration,
        layout=layout,
        label_left=label_left,
        label_right=label_right,
        progress_callback=progress_callback,
    )

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    return {
        "status": "COMPLETED",
        "percent": 100.0,
        "output_filename": output_filename,
        "file_size": file_size,
        "duration": round(duration, 3),
        "layout": layout,
        "type": "split_screen",
    }


@celery.task(bind=True, name="tasks.color_grade")
def color_grade_task(
    self,
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
    output_filename: str = "",
) -> dict:
    """Async task for cinematic 3D LUT & color grading."""
    self.update_state(
        state="PROGRESS",
        meta={"percent": 0.0, "speed": "1x", "status": "Initializing color grading pipeline..."},
    )

    def progress_callback(percent: float, spd: str):
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(percent, 1),
                "speed": spd,
                "status": f"Rendering Color Grade ({preset}): {percent:.1f}%",
            },
        )

    color_grade_video(
        input_path=input_path,
        output_path=output_path,
        start_time=start_time,
        end_time=end_time,
        preset=preset,
        brightness=brightness,
        contrast=contrast,
        saturation=saturation,
        temperature=temperature,
        vignette=vignette,
        sharpness=sharpness,
        progress_callback=progress_callback,
    )

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    return {
        "status": "COMPLETED",
        "percent": 100.0,
        "output_filename": output_filename,
        "file_size": file_size,
        "duration": round(end_time - start_time, 3) if end_time is not None else 0.0,
        "preset": preset,
        "type": "color_grade",
    }


@celery.task(bind=True, name="tasks.rescale_video")
def rescale_video_task(
    self,
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
    output_filename: str = "",
) -> dict:
    """Async task for GPU-accelerated video super-resolution & resolution scaling."""
    self.update_state(
        state="PROGRESS",
        meta={
            "percent": 0.0,
            "speed": "1x",
            "status": f"Initializing Super-Resolution Scaling ({target_width}x{target_height}, {algorithm})...",
        },
    )

    def progress_callback(percent: float, spd: str):
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(percent, 1),
                "speed": spd,
                "status": f"Rendering Transcoded Video ({target_width}x{target_height}): {percent:.1f}%",
            },
        )

    rescale_video(
        input_path=input_path,
        output_path=output_path,
        target_width=target_width,
        target_height=target_height,
        start_time=start_time,
        end_time=end_time,
        algorithm=algorithm,
        framing_mode=framing_mode,
        sharpen_strength=sharpen_strength,
        codec=codec,
        quality_preset=quality_preset,
        progress_callback=progress_callback,
    )

    file_size = os.path.getsize(output_path) if os.path.exists(output_path) else 0

    return {
        "status": "COMPLETED",
        "percent": 100.0,
        "output_filename": output_filename,
        "file_size": file_size,
        "target_width": target_width,
        "target_height": target_height,
        "algorithm": algorithm,
        "framing_mode": framing_mode,
        "type": "rescale_video",
    }










@celery.task(bind=True, name="tasks.master_audio")
def master_audio_task(
    self,
    input_path: str,
    output_path: str,
    audio_filters: str,
    as_audio_only: bool = False,
    audio_format: str = "mp3",
    output_filename: str = "",
) -> dict:
    def progress_callback(pct, speed):
        self.update_state(
            state="PROGRESS",
            meta={
                "percent": round(pct, 1),
                "speed": speed,
                "status": "Mastering audio & EQ...",
            },
        )

    try:
        res = master_audio_stream(
            input_path=input_path,
            output_path=output_path,
            audio_filters=audio_filters,
            as_audio_only=as_audio_only,
            audio_format=audio_format,
            progress_callback=progress_callback,
        )
        return {
            "status": "COMPLETED",
            "output_path": res,
            "output_filename": output_filename,
            "url": f"/mediapro/api/outputs/{output_filename}",
        }
    except Exception as e:
        self.update_state(state="FAILURE", meta={"error": str(e)})
        raise
