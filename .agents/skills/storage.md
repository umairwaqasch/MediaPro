# SKILL 10 — FILESYSTEM / MEDIA STORAGE ENGINEER

## 1. Responsibility
Manage media storage lifecycles, path resolution, directory structuring, disk space reclamation, atomic file persistence, and orphan asset cleanup.

## 2. Explicit Scope
- Storage directories under `/data/`:
  - `/data/uploads/` & `/data/image_uploads/` (Raw source media)
  - `/data/outputs/` & `/data/image_outputs/` (Processed outputs & rendered clips)
  - `/data/thumbnails/` & `/data/image_thumbnails/` (Thumbnails & waveforms)
- Storage services in `backend/app/services/storage.py` and `image_storage.py`.
- Preservation of `.gitkeep` files during directory cleanup.

## 3. Inputs
- File upload streams, temporary transcode files, output path generators, cleanup requests.

## 4. Required Inspection Steps
1. Verify target directory exists before writing (`os.makedirs(dir, exist_ok=True)`).
2. Check file path sanitization to prevent directory traversal (`..` attacks).
3. Verify disk space utilization using `shutil.disk_usage()`.

## 5. Engineering Rules
- **No Path Traversal**: Always validate that resolved file paths reside strictly inside the designated `/data/` subdirectory.
- **Atomic Outputs**: Write to a temporary file in the same filesystem mount and atomically rename (`os.replace`) upon complete render.
- **Search Precedence**: When looking up media for downstream editing, search `/data/uploads/`, `/data/outputs/`, and `/data/image_uploads/`.

## 6. Decision-Making Rules
- If client requests file deletion $\to$ delete main file and all associated thumbnails/waveforms.
- If total disk space exceeds 90% threshold $\to$ trigger LRU temporary cache pruning.

## 7. Validation Requirements
- Test file upload, persistence, and indexing via `/mediapro/api/library/all`.
- Verify `.gitkeep` presence in all 6 directories after storage operations.

## 8. Failure Handling
- On `IOError` or `DiskFull`, abort operation, clean up partial output files, and return HTTP 507 Insufficient Storage.

## 9. Interaction with Other Skills
- Cooperates with `security.md`, `concurrency.md`, and `ffmpeg.md`.

## 10. Deliverables
- Robust, leak-free storage management utilities and path resolvers.

## 11. Anti-Patterns
- Writing directly to `/tmp/` outside the persistent `/data/` bind mount.
- Leaving broken zero-byte files on disk after failed FFmpeg encodes.

## 12. Examples
- **Correct Safe Path Resolver**:
  ```python
  def get_safe_media_path(filename: str, base_dir: str) -> str:
      clean_name = os.path.basename(filename)
      full_path = os.path.abspath(os.path.join(base_dir, clean_name))
      if not full_path.startswith(os.path.abspath(base_dir)):
          raise ValueError("Directory traversal attempt detected")
      return full_path
  ```
