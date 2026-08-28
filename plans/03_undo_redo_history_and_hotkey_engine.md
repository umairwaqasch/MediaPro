# ⏪ Plan 03: Multi-Level Undo/Redo History & Global Hotkey Engine

## 🎯 Objective
Implement an industrial-grade Undo/Redo state management engine (`Ctrl+Z` / `Ctrl+Y`) with a visual history panel, coupled with a centralized Keyboard Shortcut Manager and interactive Hotkey Cheatsheet modal (`?` or `Ctrl+/`).

---

## 🎨 User Experience Specification

### Visual History Panel (Sidebar Drawer)
```
┌───────────────────────────────────────────────┐
│ 📜 History Stack                    (6 steps) │
├───────────────────────────────────────────────┤
│ ✓ Original Image Loaded             10:14:02  │
│ ✓ Rotated 90° Clockwise             10:14:15  │
│ ✓ Aspect Ratio Set (16:9)           10:14:22  │
│ ➜ 3D LUT Applied (Teal & Orange)    10:14:38  │ ← Current State
│   Exposure Boost (+0.4 EV)          10:14:45  │
│   Sharpen (0.6)                     10:15:01  │
├───────────────────────────────────────────────┤
│ [ ⏪ Undo (Ctrl+Z) ]   [ ⏩ Redo (Ctrl+Y) ]   │
└───────────────────────────────────────────────┘
```

### Keyboard Shortcut Cheatsheet Modal (`?` or `Ctrl+/`)
- **Playback**: `Space` (Play/Pause), `J` (Rewind 2x), `K` (Pause), `L` (Fast-Forward 2x), `Left/Right` (Frame Step).
- **Marking**: `I` (Set In-Point), `O` (Set Out-Point), `X` (Clear Range).
- **History**: `Ctrl+Z` (Undo), `Ctrl+Y` / `Ctrl+Shift+Z` (Redo).
- **View**: `F` (Fullscreen), `Z` (Zoom to Fit), `Tab` (Toggle Tool Panel), `S` (Split View).
- **Studio**: `1` (Switch to Video Studio), `2` (Switch to Image Studio), `B` (Batch Drawer).

---

## 🛠️ Step-by-Step Implementation Steps

### 1. Build `useHistoryStack` Custom Hook
- Maintains past states array `past: T[]`, present state `present: T`, and future states array `future: T[]`.
- Max history depth limit (e.g. 50 snapshots) with automatic FIFO pruning.
- Methods: `pushState(description, state)`, `undo()`, `redo()`, `jumpTo(index)`, `canUndo`, `canRedo`, `historyList`.

### 2. Connect History Stack to Studio States
- **Video Studio**: Trimming points, playback speed, aspect ratio, audio normalization, LUT selection.
- **Image Studio**: Tool states (brightness, contrast, LUT, crop rectangle, rotation, filters, watermarks).

### 3. Build `useKeyboardShortcuts` & `HotkeyModal.jsx`
- Global keydown event listener with modifier key detection (`Ctrl`, `Shift`, `Alt`).
- Ignore key events when active element is an `<input>`, `<textarea>`, or contenteditable.
- Render beautiful interactive keyboard cheat sheet modal with search filter and categories.

---

## 🧪 Verification & Acceptance Criteria
- [ ] Pressing `Ctrl+Z` undoes the previous edit; `Ctrl+Y` redoes it accurately.
- [ ] History panel allows clicking any past state to restore that exact parameter snapshot.
- [ ] Pressing `?` opens the interactive Hotkey Cheatsheet.
