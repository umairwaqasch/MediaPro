# 📦 Plan 05: Export Preset Manager & Workflow Recipes

## 🎯 Objective
Empower users to create, save, export, and apply custom video and image processing preset recipes (e.g. "YouTube 4K Crisp", "TikTok Viral 9:16 + Watermark", "E-Commerce White Background WebP") with 1-click execution.

---

## 🎨 User Experience Specification

### Preset Selector & Recipe Card
```
┌─────────────────────────────────────────────────────────────────┐
│ 🎯 Quick Export Presets                           [+ New Recipe]│
├─────────────────────────────────────────────────────────────────┤
│ [★ YouTube 4K Pro]   [★ TikTok 9:16 Social]  [★ E-Commerce WebP]│
│ [★ Podcast Master]   [★ Vintage Film Look]   [+ Custom Presets] │
├─────────────────────────────────────────────────────────────────┤
│ Active Preset: "TikTok 9:16 Social"                             │
│ • Rescale: 1080x1920 (Blurred Canvas Backdrop)                  │
│ • Audio: EBU R128 Normalization (-14 LUFS)                      │
│ • Filter: Crisp Commercial LUT + 0.3 Vibrance                   │
│ • Watermark: "@creator" Top-Right (70% opacity)                 │
│                                                                 │
│ [ 💾 Save Current Settings as Preset ]  [ ⚡ Apply to Batch ]    │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Step-by-Step Implementation Steps

### 1. Preset Schema & Storage
- JSON-based preset configuration schema storing:
  - Video parameters: resolution, aspect ratio, codec, bitrate, audio normalization, LUT, watermark.
  - Image parameters: format, quality, 3D LUT, crop ratio, sharpening, vignette, AI background replacement color.
- Storage: Persistent in `localStorage` + backend `/data/presets/` directory for cross-device synchronization.

### 2. Built-in Industry Default Presets
- **Video Presets**:
  - `YouTube 4K Master` (3840x2160, 60fps, CRF 18, AAC 320k)
  - `TikTok / Instagram Reel` (1080x1920, 9:16 blur padding, -14 LUFS)
  - `Discord / Email Quickshare` (Target 24MB, 720p)
  - `Cinematic Film 24fps` (2.39:1 letterbox, Teal/Orange LUT, 24fps)
- **Image Presets**:
  - `E-Commerce Studio White` (AI Subject cutout, pure #FFFFFF canvas, 1:1 square, WebP)
  - `Instagram Feed Portrait` (4:5 ratio, subtle unsharp mask, sRGB JPG)
  - `Print Document Scan` (Magic Color, A4 proportion, 300 DPI)

### 3. Build `PresetManagerModal.jsx` & Quick-Select Toolbar
- Searchable preset library with tags, favorites, import/export JSON functionality.
- One-click application that populates all sliders, dropdowns, and toggles across the studio.

---

## 🧪 Verification & Acceptance Criteria
- [ ] Selecting a preset instantly configures all studio controls with exact recipe parameters.
- [ ] Users can save custom presets and export them as portable `.json` files.
- [ ] Applying presets in batch mode executes the full recipe across all selected media assets.
