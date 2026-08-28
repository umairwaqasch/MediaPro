# 🔔 Plan 02: Non-Blocking Toast & Notification Engine

## 🎯 Objective
Replace all native browser `alert()` and `confirm()` dialogs across the frontend with a modern, non-blocking, asynchronous Toast & Notification Engine that supports action buttons, progress bars, audio cues, and light/dark theme styling.

---

## 🎨 User Experience Specification

```
┌────────────────────────────────────────────────────────┐
│  ✨ Processing Complete                        [✕]     │
│  Exported "final_cut_1080p.mp4" (18.4 MB)               │
│  [ ▶ Preview ]  [ 💾 Download ]                         │
└────────────────────────────────────────────────────────┘
```

- **Types Supported**: `Success` (green/cyan), `Error` (rose/red), `Warning` (amber), `Info` (blue), `Progress` (animated progress bar).
- **Positioning**: Configurable (Top-Right default, Bottom-Center for mobile).
- **Auto-Dismiss**: 4000ms default, pause on hover, sticky for errors until dismissed.
- **Action Buttons**: Optional inline buttons (e.g. `[Open in Library]`, `[Undo]`, `[Retry]`).

---

## 🛠️ Step-by-Step Implementation Steps

### 1. Build `ToastContext.jsx` & `ToastProvider`
- State: array of active toast objects `{ id, type, title, message, duration, action, onAction }`.
- Helper methods:
  - `toast.success(title, message, options)`
  - `toast.error(title, message, options)`
  - `toast.warning(title, message, options)`
  - `toast.info(title, message, options)`
  - `toast.promise(promise, { loading, success, error })`

### 2. Build `ToastContainer.jsx` & `ToastItem.jsx`
- Sleek glassmorphic card: `bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200 dark:border-zinc-800 shadow-2xl rounded-xl p-4`.
- Smooth entry/exit micro-animations using Tailwind CSS transforms (`translate-y`, `opacity`).
- Integrated progress countdown bar at the bottom of the toast card.

### 3. Refactor Frontend Call Sites
- Audit all components (`CutControls.jsx`, `ImageStudio.jsx`, `ImageToolsMatrix.jsx`, `BatchProcessModal.jsx`, `SettingsModal.jsx`) and replace every instance of `alert(...)` with `toast.error(...)` or `toast.success(...)`.

---

## 🧪 Verification & Acceptance Criteria
- [ ] No native `alert()` or `confirm()` remains in frontend code.
- [ ] Uploading, processing, rendering, and downloading trigger appropriate toast notifications.
- [ ] Error scenarios (e.g. network disconnect, invalid file) display formatted error toasts with retry actions.
