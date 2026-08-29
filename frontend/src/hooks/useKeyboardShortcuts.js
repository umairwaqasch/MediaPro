import { useEffect, useRef } from 'react';

/**
 * Global Keyboard Shortcut Engine for Media Pro Workstation
 *
 * @param {Object} keymap - Object mapping action names or key signatures to callback functions
 * @param {boolean} enabled - Whether keyboard shortcuts are currently active (default true)
 */
export function useKeyboardShortcuts(keymap = {}, enabled = true) {
  const keymapRef = useRef(keymap);
  keymapRef.current = keymap;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e) => {
      const isInput =
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName) ||
        e.target.isContentEditable;

      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const key = e.key.toLowerCase();

      const handlers = keymapRef.current;

      // 1. Escape: always handled, even inside inputs
      if (e.key === 'Escape' && handlers.onEscape) {
        e.preventDefault();
        handlers.onEscape();
        return;
      }

      // 2. Undo: Ctrl+Z / Cmd+Z (without Shift)
      if (isCtrlOrCmd && !isShift && key === 'z') {
        if (handlers.onUndo) {
          e.preventDefault();
          handlers.onUndo();
          return;
        }
      }

      // 3. Redo: Ctrl+Y / Cmd+Y OR Ctrl+Shift+Z / Cmd+Shift+Z
      if ((isCtrlOrCmd && key === 'y') || (isCtrlOrCmd && isShift && key === 'z')) {
        if (handlers.onRedo) {
          e.preventDefault();
          handlers.onRedo();
          return;
        }
      }

      // 4. Quick Export / Apply: Ctrl+S / Cmd+S (prevents browser save)
      if (isCtrlOrCmd && key === 's') {
        if (handlers.onQuickExport) {
          e.preventDefault();
          handlers.onQuickExport();
          return;
        }
      }

      // 5. Open History Drawer: Ctrl+H / Cmd+H
      if (isCtrlOrCmd && key === 'h') {
        if (handlers.onToggleHistory) {
          e.preventDefault();
          handlers.onToggleHistory();
          return;
        }
      }

      // 5b. Open Preset Manager: Ctrl+P / Cmd+P
      if (isCtrlOrCmd && key === 'p') {
        if (handlers.onTogglePresets) {
          e.preventDefault();
          handlers.onTogglePresets();
          return;
        }
      }

      // 6. Open Task Center: Ctrl+T / Cmd+T (when allowed) or Alt+T
      if ((isCtrlOrCmd || e.altKey) && key === 't') {
        if (handlers.onToggleTasks) {
          e.preventDefault();
          handlers.onToggleTasks();
          return;
        }
      }

      // 7. Studio Switcher: Ctrl+1 (Video) / Ctrl+2 (Image)
      if (isCtrlOrCmd && e.key === '1') {
        if (handlers.onSelectVideoStudio) {
          e.preventDefault();
          handlers.onSelectVideoStudio();
          return;
        }
      }
      if (isCtrlOrCmd && e.key === '2') {
        if (handlers.onSelectImageStudio) {
          e.preventDefault();
          handlers.onSelectImageStudio();
          return;
        }
      }

      // --- The following single-key shortcuts are ignored inside text inputs ---
      if (isInput) return;

      // 8. Hotkey Help Modal: '?' or '/'
      if (e.key === '?' || (isShift && e.key === '/')) {
        if (handlers.onOpenHotkeyModal) {
          e.preventDefault();
          handlers.onOpenHotkeyModal();
          return;
        }
      }

      // 9. Play/Pause Video: Spacebar
      if (e.key === ' ' || e.code === 'Space') {
        if (handlers.onTogglePlay) {
          e.preventDefault();
          handlers.onTogglePlay();
          return;
        }
      }

      // 10. Frame Navigation: Left/Right Arrow or '[' / ']'
      if (e.key === 'ArrowLeft' && isCtrlOrCmd) {
        if (handlers.onStepFrameBackward) {
          e.preventDefault();
          handlers.onStepFrameBackward();
          return;
        }
      }
      if (e.key === 'ArrowRight' && isCtrlOrCmd) {
        if (handlers.onStepFrameForward) {
          e.preventDefault();
          handlers.onStepFrameForward();
          return;
        }
      }

      // 11. Trim In/Out Points: 'i' for In Point, 'o' for Out Point
      if (key === 'i' && !isCtrlOrCmd) {
        if (handlers.onSetInPoint) {
          e.preventDefault();
          handlers.onSetInPoint();
          return;
        }
      }
      if (key === 'o' && !isCtrlOrCmd) {
        if (handlers.onSetOutPoint) {
          e.preventDefault();
          handlers.onSetOutPoint();
          return;
        }
      }

      // 12. Library Drawer: 'l' or 'm'
      if (key === 'm' && !isCtrlOrCmd) {
        if (handlers.onToggleLibrary) {
          e.preventDefault();
          handlers.onToggleLibrary();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
