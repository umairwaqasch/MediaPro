/**
 * Format seconds into HH:MM:SS.mmm
 */
export function formatTimecode(seconds) {
  if (isNaN(seconds) || seconds === null || seconds === undefined) return '00:00:00.000';
  const totalMs = Math.max(0, Math.floor(seconds * 1000));
  const ms = totalMs % 1000;
  const totalSecs = Math.floor(totalMs / 1000);
  const s = totalSecs % 60;
  const totalMins = Math.floor(totalSecs / 60);
  const m = totalMins % 60;
  const h = Math.floor(totalMins / 60);

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/**
 * Format bytes to readable string (MB, GB, etc.)
 */
export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Calculate current frame number from time and FPS
 */
export function timeToFrame(seconds, fps) {
  if (!fps || fps <= 0) return 0;
  return Math.floor(seconds * fps);
}
