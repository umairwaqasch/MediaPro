# SKILL 04 — FFMPEG PIPELINE ENGINEER

## 1. Responsibility
Own all video, audio, and container media processing workflows, filter graphs, codec parameter tuning, hardware acceleration, and process execution.

## 2. Explicit Scope
- FFmpeg command construction in `backend/app/services/ffmpeg_service.py`.
- Hardware acceleration (`h264_nvenc`, `hevc_nvenc`, `cuda` filters) with seamless CPU fallback (`libx264`, `libx265`).
- Complex audio/video filtergraphs (`vidstab`, `loudnorm`, `atempo`, `scale`, `overlay`, `lut3d`, `drawtext`, `silencedetect`).
- Metadata probing (`ffprobe`) and frame-accurate seeking (`-ss` before `-i` for fast seek, after `-i` for frame accuracy).

## 3. Inputs
- Input media path, output format parameters, timecode ranges, filter settings, hardware probe results.

## 4. Required Inspection Steps
1. Determine if operation supports Fast Stream Copy (`-c copy`) or requires re-encoding.
2. Check if hardware encoder (`h264_nvenc`) is available via GPU detection.
3. Validate stream presence (video, audio, subtitles) using `probe_media()`.

## 5. Engineering Rules
- **Separate Construction from Execution**: Command builders must return `List[str]` arguments, never a raw concatenated shell string.
- **Never Shell-Interpolate**: Use `subprocess.run(cmd_array)` or `asyncio.create_subprocess_exec(*cmd_array)`.
- **Automated Fallback**: When NVENC fails or is unavailable on host, automatically fall back to CPU (`libx264`) without throwing an unhandled exception.

## 6. Decision-Making Rules
- If operation is simple cut with no filters & keyframe-aligned $\to$ use Fast Stream Copy.
- If speed remap, filter, or color grading is requested $\to$ use NVENC re-encode with CPU fallback.
- If duration is unknown (`end_time=None`) $\to$ probe duration before building seek arguments.

## 7. Validation Requirements
- Verify FFmpeg exit code is `0`.
- Verify output file exists, is non-zero in size, and can be probed cleanly with `ffprobe`.

## 8. Failure Handling
- Parse FFmpeg `stderr` on non-zero exit codes to extract meaningful error messages (e.g. `Invalid argument`, `No space left`).

## 9. Interaction with Other Skills
- Cooperates with `storage.md`, `performance.md`, `recovery.md`, and `testing.md`.

## 10. Deliverables
- Deterministic, high-speed FFmpeg command pipelines and execution helpers.

## 11. Anti-Patterns
- Using `os.system("ffmpeg -i " + input + " ...")` (security & shell injection risk).
- Hardcoding `-c:v h264_nvenc` without verifying hardware support.
- Omitting `-y` flag, causing FFmpeg to hang waiting for interactive overwrite confirmation.

## 12. Examples
- **Correct Filtergraph**:
  ```python
  # EBU R128 Dual-Pass Loudnorm
  cmd = [
      "ffmpeg", "-y", "-i", input_path,
      "-af", f"loudnorm=I={target_i}:LRA={lra}:TP={target_tp}",
      "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
      output_path
  ]
  ```
