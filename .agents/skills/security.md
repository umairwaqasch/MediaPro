# SKILL 11 — SECURITY ENGINEER

## 1. Responsibility
Protect the application, media pipelines, and server infrastructure from injection attacks, path traversals, resource exhaustion, and privacy leaks.

## 2. Explicit Scope
- Shell injection & FFmpeg command injection prevention.
- Path traversal & malicious filename sanitization (`werkzeug.utils.secure_filename`).
- EXIF privacy protection and GPS metadata stripping (`/image/exif/strip/{id}`).
- Resource limits (upload size caps, process timeouts, CPU constraints).

## 3. Inputs
- User-supplied filenames, text watermark parameters, custom FFmpeg arguments, uploaded binary streams.

## 4. Required Inspection Steps
1. Verify FFmpeg commands use argument lists (`['ffmpeg', '-i', path]`), NEVER `shell=True` or string interpolation.
2. Check that all uploaded filenames are sanitized before being written to disk.
3. Validate that user-supplied text overlays (watermarks, titles) are properly escaped in FFmpeg `drawtext` filters (`:` and `'` escaped).

## 5. Engineering Rules
- **No `shell=True`**: Never pass raw strings to shell execution environments.
- **Escape Filter Parameters**: Characters such as `:`, `'`, `\`, and `%` in FFmpeg filter parameters must be strictly escaped.
- **Restrict File Types**: Only allow validated MIME types and extensions (`.mp4`, `.mov`, `.mkv`, `.avi`, `.webm`, `.jpg`, `.png`, `.webp`, `.heic`).

## 6. Decision-Making Rules
- If filename contains `../` or special shell characters $\to$ strip via `os.path.basename` and assign UUID prefix.
- If text overlay contains single quotes $\to$ escape as `\'` or `\\\'`.

## 7. Validation Requirements
- Test endpoints with malicious payloads (e.g. `../../etc/passwd`, `test; rm -rf /`, `' OR '1'='1`) and verify strict rejection or safe handling.

## 8. Failure Handling
- On security violation, log security event, immediately reject request with HTTP 400 or HTTP 403, and do not execute command.

## 9. Interaction with Other Skills
- Cooperates with `storage.md`, `ffmpeg.md`, and `fastapi.md`.

## 10. Deliverables
- Hardened command executors, input sanitizers, and privacy-preserving tools.

## 11. Anti-Patterns
- Using `f"ffmpeg -i {user_file} -vf drawtext=text='{user_text}' {out}"` without argument arrays and escaping.
- Trusting client-supplied MIME headers without file signature validation.

## 12. Examples
- **Correct Filter Text Escaping**:
  ```python
  def escape_drawtext(text: str) -> str:
      return text.replace("\\", "\\\\").replace("'", "'\\\\''").replace(":", "\\:")
  ```
