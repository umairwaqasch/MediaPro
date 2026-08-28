/**
 * File System Access API & Automated Download Utilities for VideoProcessor
 */

// In-memory directory handle cache for the current session
let activeDirectoryHandle = null;

export function getActiveDirectoryHandle() {
  return activeDirectoryHandle;
}

export function setActiveDirectoryHandle(handle) {
  activeDirectoryHandle = handle;
}

export function isFileSystemAccessSupported() {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

export async function pickExportDirectory() {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser. Standard downloads folder will be used.');
  }

  try {
    const handle = await window.showDirectoryPicker({
      id: 'videoprocessor_exports',
      mode: 'readwrite',
      startIn: 'videos',
    });
    activeDirectoryHandle = handle;
    return handle;
  } catch (err) {
    if (err.name === 'AbortError') {
      return null; // User cancelled picker
    }
    throw err;
  }
}

export async function saveFileToDirectory(dirHandle, filename, downloadUrl) {
  if (!dirHandle) {
    triggerBrowserDownload(downloadUrl, filename);
    return true;
  }

  try {
    // Check or request write permission
    if ((await dirHandle.queryPermission({ mode: 'readwrite' })) !== 'granted') {
      const perm = await dirHandle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') {
        triggerBrowserDownload(downloadUrl, filename);
        return true;
      }
    }

    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error('Failed to fetch file stream');
    const blob = await response.blob();

    const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch (err) {
    console.warn('Direct directory write failed, falling back to browser download:', err);
    triggerBrowserDownload(downloadUrl, filename);
    return false;
  }
}

export async function saveFileWithSaveAsPicker(filename, downloadUrl) {
  if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
    try {
      const ext = filename.split('.').pop() || 'mp4';
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: 'Video/Media File',
            accept: { [`video/${ext}`]: [`.${ext}`] },
          },
        ],
      });

      const response = await fetch(downloadUrl);
      if (!response.ok) throw new Error('Failed to fetch file stream');
      const blob = await response.blob();

      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;
      console.warn('Save As picker failed, falling back to standard download:', err);
      triggerBrowserDownload(downloadUrl, filename);
      return true;
    }
  } else {
    triggerBrowserDownload(downloadUrl, filename);
    return true;
  }
}

export function triggerBrowserDownload(downloadUrl, filename) {
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename || 'video_export.mp4';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
  }, 1000);
}
