import React, { useState, useEffect, useRef } from 'react';
import {
  Crop,
  Sliders,
  Sparkles,
  Type,
  Maximize,
  RotateCw,
  Sun,
  Palette,
  Layers,
  Check,
  Zap,
  Download,
  Wand2,
  Film,
  Grid,
  Info,
  ShieldCheck,
  Copy,
  Scissors,
  Bot,
  BrainCircuit,
  Image as ImageIcon,
  FileText,
  Scan,
  Upload,
  RefreshCw,
  RotateCcw,
  FlipHorizontal,
  FlipVertical,
  Lock,
  Unlock,
  Crosshair,
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

const SCALE_PERCENT_PRESETS = [25, 50, 75, 100, 150, 200];

const RESOLUTION_PRESETS = [
  { label: '4K UHD', w: 3840, h: 2160 },
  { label: '1080p FHD', w: 1920, h: 1080 },
  { label: '720p HD', w: 1280, h: 720 },
  { label: 'Square 1K', w: 1080, h: 1080 },
  { label: 'Story 9:16', w: 1080, h: 1920 },
];

const LUT_PRESETS = [
  { id: 'original', name: 'Original', desc: 'No color LUT' },
  { id: 'teal_orange', name: 'Teal & Orange', desc: 'Hollywood Blockbuster' },
  { id: 'vintage_35mm', name: '35mm Vintage', desc: 'Warm Golden Grain' },
  { id: 'cyberpunk', name: 'Cyberpunk Neon', desc: 'Punchy Cyan & Magenta' },
  { id: 'golden_hour', name: 'Golden Hour', desc: 'Warm Amber Glow' },
  { id: 'film_noir', name: 'Film Noir', desc: 'Dramatic High-Contrast B&W' },
  { id: 'crisp_commercial', name: 'Crisp Pro', desc: 'Clean Dynamic Range' },
];

const ARTISTIC_PRESETS = [
  { id: 'none', name: 'None', desc: 'No artistic filter' },
  { id: 'vignette', name: 'Vignette', desc: 'Smooth dark radial framing' },
  { id: 'film_grain', name: 'Film Grain', desc: 'Analog 35mm grain' },
  { id: 'pencil_sketch', name: 'Pencil Sketch', desc: 'Charcoal graphite sketch' },
  { id: 'color_sketch', name: 'Color Pencil', desc: 'Artistic colored pencil' },
  { id: 'cartoon', name: 'Cartoon / Comic', desc: 'Flat colors with bold ink lines' },
  { id: 'oil_painting', name: 'Oil Painting', desc: 'Hand-painted canvas brush' },
  { id: 'pixelate', name: '8-Bit Pixelate', desc: 'Retro arcade mosaic' },
  { id: 'glitch', name: 'RGB Glitch', desc: 'Chromatic slice aberration' },
  { id: 'duotone', name: 'Duotone Map', desc: 'Dual-tint gradient map' },
  { id: 'cross_process', name: 'Cross-Process', desc: 'Darkroom XPro contrast' },
];

const ASPECT_PRESETS = [
  { id: 'none', label: 'Full / No Crop', ratio: null, desc: 'Full image (no crop)' },
  { id: '1:1', label: '1:1 Square', ratio: 1, desc: 'Square 1080x1080' },
  { id: '9:16', label: '9:16 TikTok', ratio: 9 / 16, desc: 'Reels / Stories' },
  { id: '16:9', label: '16:9 YouTube', ratio: 16 / 9, desc: 'Widescreen HD' },
  { id: '4:5', label: '4:5 Social', ratio: 4 / 5, desc: 'Instagram Portrait' },
  { id: '4:3', label: '4:3 Classic', ratio: 4 / 3, desc: 'Standard Photo' },
  { id: '21:9', label: '21:9 Cinema', ratio: 21 / 9, desc: 'Ultrawide Screen' },
];

export default function ImageToolsMatrix({
  toolState,
  onUpdateToolState,
  onExport,
  isProcessing,
  activeImage,
  activeTab = 'transforms',
  onTabChange,
  perspectivePoints,
  onUpdatePerspectivePoints,
  onPerspectiveSuccess,
  onUploadImage,
}) {
  const toast = useToast();
  const [exifData, setExifData] = useState(null);
  const [palette, setPalette] = useState([]);
  const [histogram, setHistogram] = useState(null);
  const [copiedHex, setCopiedHex] = useState(null);

  // Phase 3 AI State
  const [aiOp, setAiOp] = useState('bg_remove');
  const [aiBgMode, setAiBgMode] = useState('transparent');
  const [aiScale, setAiScale] = useState(2);
  const [aiPortraitBlur, setAiPortraitBlur] = useState(20);

  // Phase 4 Perspective Transform State
  const [perspectiveAspect, setPerspectiveAspect] = useState('auto');
  const [perspectiveEnhance, setPerspectiveEnhance] = useState('none');
  const [isDetectingCorners, setIsDetectingCorners] = useState(false);
  const [perspectiveScale, setPerspectiveScale] = useState(100);

  // Custom Pixel Dimensions State
  const [lockAspect, setLockAspect] = useState(true);
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');

  // Sync custom width/height with active image
  useEffect(() => {
    if (activeImage && activeImage.width && activeImage.height) {
      if (toolState?.target_width) {
        setCustomWidth(String(toolState.target_width));
      } else {
        setCustomWidth(String(activeImage.width));
      }
      if (toolState?.target_height) {
        setCustomHeight(String(toolState.target_height));
      } else {
        setCustomHeight(String(activeImage.height));
      }
    }
  }, [activeImage]);

  // Recalculate and apply Aspect Ratio with live crop box positioning
  const handleApplyAspectRatio = (aspectId) => {
    if (aspectId === 'none' || !aspectId) {
      // Disable crop completely & reset to full original image
      onUpdateToolState({
        ...toolState,
        aspect_ratio: 'none',
        crop_x: null,
        crop_y: null,
        crop_w: null,
        crop_h: null,
        blur_bg_padding: false,
      });
      return;
    }

    const preset = ASPECT_PRESETS.find((p) => p.id === aspectId);
    const targetRatio = preset ? preset.ratio : null;

    if (!targetRatio) {
      onUpdateToolState({
        ...toolState,
        aspect_ratio: 'none',
        crop_x: null,
        crop_y: null,
        crop_w: null,
        crop_h: null,
      });
      return;
    }

    const imgW = activeImage?.width || 1920;
    const imgH = activeImage?.height || 1080;
    const imageAspect = imgW / imgH;

    let newW = 0.9;
    let newH = 0.9;

    if (imageAspect > targetRatio) {
      // Image is wider than target -> fit height to 90%, shrink width
      newH = 0.9;
      const pixelH = newH * imgH;
      const pixelW = pixelH * targetRatio;
      newW = pixelW / imgW;
    } else {
      // Image is taller than target -> fit width to 90%, shrink height
      newW = 0.9;
      const pixelW = newW * imgW;
      const pixelH = pixelW / targetRatio;
      newH = pixelH / imgH;
    }

    newW = Math.min(1.0, Math.max(0.05, newW));
    newH = Math.min(1.0, Math.max(0.05, newH));
    const newX = (1.0 - newW) / 2.0;
    const newY = (1.0 - newH) / 2.0;

    onUpdateToolState({
      ...toolState,
      aspect_ratio: aspectId,
      crop_x: parseFloat(newX.toFixed(4)),
      crop_y: parseFloat(newY.toFixed(4)),
      crop_w: parseFloat(newW.toFixed(4)),
      crop_h: parseFloat(newH.toFixed(4)),
    });
  };

  // Custom Pixel Width Change
  const handleWidthChange = (valStr) => {
    setCustomWidth(valStr);
    const val = parseInt(valStr, 10);
    if (!isNaN(val) && val > 0) {
      if (lockAspect && activeImage?.width && activeImage?.height) {
        const ratio = activeImage.height / activeImage.width;
        const newH = Math.round(val * ratio);
        setCustomHeight(String(newH));
        onUpdateToolState({
          ...toolState,
          target_width: val,
          target_height: newH,
          scale_percent: 100,
        });
      } else {
        onUpdateToolState({
          ...toolState,
          target_width: val,
          scale_percent: 100,
        });
      }
    }
  };

  // Custom Pixel Height Change
  const handleHeightChange = (valStr) => {
    setCustomHeight(valStr);
    const val = parseInt(valStr, 10);
    if (!isNaN(val) && val > 0) {
      if (lockAspect && activeImage?.width && activeImage?.height) {
        const ratio = activeImage.width / activeImage.height;
        const newW = Math.round(val * ratio);
        setCustomWidth(String(newW));
        onUpdateToolState({
          ...toolState,
          target_width: newW,
          target_height: val,
          scale_percent: 100,
        });
      } else {
        onUpdateToolState({
          ...toolState,
          target_height: val,
          scale_percent: 100,
        });
      }
    }
  };

  // Apply Resolution Preset
  const handleSelectResolutionPreset = (w, h) => {
    setCustomWidth(String(w));
    setCustomHeight(String(h));
    onUpdateToolState({
      ...toolState,
      target_width: w,
      target_height: h,
      scale_percent: 100,
    });
  };

  // Reset to Native Dimensions
  const handleResetNativeDimensions = () => {
    if (activeImage) {
      setCustomWidth(String(activeImage.width || 1920));
      setCustomHeight(String(activeImage.height || 1080));
      onUpdateToolState({
        ...toolState,
        target_width: null,
        target_height: null,
        scale_percent: 100,
      });
    }
  };

  // Rotation Step Helpers
  const handleRotateStep = (delta) => {
    const curr = toolState.rotate_angle || 0;
    const next = (curr + delta + 360) % 360;
    update('rotate_angle', next);
  };
  const matrixFileInputRef = useRef(null);
  const [isWarping, setIsWarping] = useState(false);

  const update = (key, val) => {
    onUpdateToolState({ ...toolState, [key]: val });
  };

  // Fetch EXIF metadata on tab change or active image change
  useEffect(() => {
    if (activeTab === 'metadata' && activeImage) {
      const imgId = activeImage.image_id || activeImage.id;
      fetch(`/mediapro/api/image/exif/${imgId}`)
        .then((r) => r.json())
        .then((data) => setExifData(data))
        .catch(() => setExifData({ has_exif: false, raw_tags: {} }));

      fetch(`/mediapro/api/image/palette/${imgId}?count=6`)
        .then((r) => r.json())
        .then((data) => setPalette(data.palette || []))
        .catch(() => setPalette([]));

      fetch(`/mediapro/api/image/histogram/${imgId}`)
        .then((r) => r.json())
        .then((data) => setHistogram(data))
        .catch(() => setHistogram(null));
    }
  }, [activeTab, activeImage]);

  const handleCopyHex = (hex) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    toast.success(`Copied ${hex} to clipboard!`);
    setTimeout(() => setCopiedHex(null), 1500);
  };

  const handleStripExif = async () => {
    if (!activeImage) return;
    const imgId = activeImage.image_id || activeImage.id;
    try {
      const res = await fetch(`/mediapro/api/image/exif/strip/${imgId}`, { method: 'POST' });
      if (res.ok) {
        toast.success('EXIF metadata & GPS location stripped! 100% privacy protected.');
        setExifData({ has_exif: false, raw_tags: {} });
      } else {
        toast.error('Failed to strip EXIF metadata');
      }
    } catch (e) {
      toast.error('Failed to strip EXIF metadata');
    }
  };

  // Run Phase 3 AI Task
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const handleRunAI = async () => {
    if (!activeImage) return;
    const imgId = activeImage.image_id || activeImage.id;
    if (!imgId || String(imgId).startsWith('local_')) {
      toast.info('Image is preparing. Please retry in a moment.');
      return;
    }
    let payload = { operation: aiOp };
    if (aiOp === 'bg_remove') {
      if (aiBgMode === 'white') payload.bg_color_hex = '#FFFFFF';
      else if (aiBgMode === 'black') payload.bg_color_hex = '#000000';
      else if (aiBgMode === 'portrait_blur') payload.portrait_blur_radius = aiPortraitBlur;
    } else if (aiOp === 'upscale') {
      payload.scale = aiScale;
    }

    setIsProcessingAI(true);
    toast.info(`AI ${aiOp.replace('_', ' ')} running on neural pipeline...`);
    try {
      const res = await fetch(`/mediapro/api/image/${imgId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.task_id) {
        let attempts = 0;
        const interval = setInterval(async () => {
          attempts++;
          if (attempts > 40) {
            clearInterval(interval);
            setIsProcessingAI(false);
            toast.error('AI processing timed out.');
            return;
          }
          try {
            const sRes = await fetch('/mediapro/api/image/batch/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ task_ids: [data.task_id] }),
            });
            const sData = await sRes.json();
            const t = sData.tasks?.[data.task_id];
            const isDone = t?.status === 'SUCCESS' || t?.state === 'SUCCESS';
            const isFailed = t?.status === 'FAILURE' || t?.state === 'FAILURE';
            if (isDone) {
              clearInterval(interval);
              setIsProcessingAI(false);
              if (onPerspectiveSuccess) onPerspectiveSuccess(t.result || t);
              toast.success(`AI ${aiOp.replace('_', ' ')} finished successfully!`);
            } else if (isFailed) {
              clearInterval(interval);
              setIsProcessingAI(false);
              toast.error(`AI operation failed: ${t.error || 'Model error'}`);
            }
          } catch (pollErr) {
            console.warn('AI polling error:', pollErr);
          }
        }, 500);
      }
    } catch (err) {
      setIsProcessingAI(false);
      toast.error(`AI error: ${err.message}`);
    }
  };

  // Phase 4: Auto-detect corners
  const handleAutoDetectCorners = async () => {
    if (!activeImage) return;
    const imgId = activeImage.image_id || activeImage.id;
    setIsDetectingCorners(true);
    try {
      const res = await fetch(`/mediapro/api/image/${imgId}/perspective/detect`, { method: 'POST' });
      const data = await res.json();
      if (data.points && data.points.length === 4) {
        if (onUpdatePerspectivePoints) {
          onUpdatePerspectivePoints(data.points);
        }
        toast.success('Document corners detected automatically!');
      }
    } catch (err) {
      toast.error('Could not auto-detect document corners');
    } finally {
      setIsDetectingCorners(false);
    }
  };

  const handleResetCorners = () => {
    onUpdatePerspectivePoints([
      [0.08, 0.08],
      [0.92, 0.08],
      [0.92, 0.92],
      [0.08, 0.92],
    ]);
  };

  // Phase 4: Flatten and Dewarp
  const handlePerspectiveCrop = async () => {
    if (!activeImage || !perspectivePoints || perspectivePoints.length !== 4) return;
    const imgId = activeImage.image_id || activeImage.id;
    if (!imgId || String(imgId).startsWith('local_')) {
      toast.info('Image is preparing. Please retry in a moment.');
      return;
    }
    setIsWarping(true);
    try {
      const res = await fetch(`/mediapro/api/image/${imgId}/perspective/crop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          src_points: perspectivePoints,
          points: perspectivePoints,
          dst_aspect: perspectiveAspect,
          aspect_ratio: perspectiveAspect,
          enhance_mode: perspectiveEnhance,
          enhancement: perspectiveEnhance,
          output_format: toolState.output_format || 'JPEG',
          quality: toolState.quality || 95,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.task_id) {
        setIsWarping(false);
        toast.error(data.detail || data.message || 'Perspective crop request failed');
        return;
      }

      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        if (attempts > 30) {
          clearInterval(interval);
          setIsWarping(false);
          toast.error('Perspective crop timed out.');
          return;
        }
        try {
          const sRes = await fetch('/mediapro/api/image/batch/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_ids: [data.task_id] }),
          });
          const sData = await sRes.json();
          const t = sData.tasks?.[data.task_id];
          const isDone = t?.status === 'SUCCESS' || t?.state === 'SUCCESS';
          const isFailed = t?.status === 'FAILURE' || t?.state === 'FAILURE';
          if (isDone) {
            clearInterval(interval);
            setIsWarping(false);
            if (onPerspectiveSuccess) onPerspectiveSuccess(t.result || t);
            toast.success('Document flattened & deskewed successfully!');
          } else if (isFailed) {
            clearInterval(interval);
            setIsWarping(false);
            toast.error(`Perspective crop failed: ${t.error || 'Server error'}`);
          }
        } catch (pollErr) {
          console.warn('Status polling error:', pollErr);
        }
      }, 500);
    } catch (err) {
      setIsWarping(false);
      toast.error(`Perspective transform error: ${err.message}`);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full max-h-full overflow-hidden">
      {/* CARD 1: Categorized Tools Matrix (5 cols) */}
      <div className="lg:col-span-5 flex flex-col bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-4 shadow-sm dark:shadow-xl transition-colors h-full overflow-hidden">
        <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3 flex-shrink-0">
          Studio Tool Matrix
        </h3>

        <div className="grid grid-cols-2 gap-2 mb-4 flex-1 overflow-y-auto custom-scrollbar pr-0.5">
          <button
            onClick={() => onTabChange('transforms')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
              activeTab === 'transforms'
                ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-700 dark:text-cyan-300 shadow-sm'
                : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Crop className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <div className="text-left">
              <div className="font-bold">Transform & Crop</div>
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">Scale, Rotate, Aspect</div>
            </div>
          </button>

          <button
            onClick={() => onTabChange('perspective')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
              activeTab === 'perspective'
                ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-400 text-amber-700 dark:text-amber-200 shadow-sm ring-1 ring-amber-500/40'
                : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Scan className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-pulse" />
            <div className="text-left">
              <div className="font-bold text-amber-700 dark:text-amber-300">📐 Perspective Crop</div>
              <div className="text-[10px] text-amber-600/80 dark:text-amber-500 font-normal">4-Pin Scanner Dewarp</div>
            </div>
          </button>

          <button
            onClick={() => onTabChange('color')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
              activeTab === 'color'
                ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-700 dark:text-cyan-300 shadow-sm'
                : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Palette className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <div className="text-left">
              <div className="font-bold">Color & 3D LUTs</div>
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">Tone, Brightness, Looks</div>
            </div>
          </button>

          <button
            onClick={() => onTabChange('ai')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
              activeTab === 'ai'
                ? 'bg-cyan-500/15 dark:bg-cyan-500/20 border-cyan-500 text-cyan-800 dark:text-cyan-200 shadow-sm ring-1 ring-cyan-500/50'
                : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <BrainCircuit className="w-4 h-4 text-cyan-600 dark:text-cyan-400 animate-pulse" />
            <div className="text-left">
              <div className="font-bold text-cyan-700 dark:text-cyan-300">🪄 AI Neural Vision</div>
              <div className="text-[10px] text-cyan-600 dark:text-cyan-500 font-normal">Cutout, 4x Super-Res</div>
            </div>
          </button>

          <button
            onClick={() => onTabChange('artistic')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
              activeTab === 'artistic'
                ? 'bg-purple-500/10 border-purple-500/40 text-purple-700 dark:text-purple-300 shadow-sm'
                : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Wand2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <div className="text-left">
              <div className="font-bold">Artistic FX</div>
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">Sketch, Oil, Glitch</div>
            </div>
          </button>

          <button
            onClick={() => onTabChange('chromakey')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
              activeTab === 'chromakey'
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 shadow-sm'
                : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Scissors className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <div className="text-left">
              <div className="font-bold">Chroma Key</div>
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">Green Screen Cutout</div>
            </div>
          </button>

          <button
            onClick={() => onTabChange('metadata')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
              activeTab === 'metadata'
                ? 'bg-blue-500/10 border-blue-500/40 text-blue-700 dark:text-blue-300 shadow-sm'
                : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <div className="text-left">
              <div className="font-bold">EXIF & Privacy</div>
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">Stripper, Palette, Histogram</div>
            </div>
          </button>

          <button
            onClick={() => onTabChange('watermark')}
            className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all ${
              activeTab === 'watermark'
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-700 dark:text-rose-300 shadow-sm'
                : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800/60'
            }`}
          >
            <Type className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <div className="text-left">
              <div className="font-bold">Watermark & Stamp</div>
              <div className="text-[10px] text-slate-400 dark:text-zinc-500 font-normal">Copyright, Unsharp Mask</div>
            </div>
          </button>
        </div>

        {/* Quick Info & Reset */}
        <div className="mt-auto pt-3 border-t border-slate-200 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-500 flex-shrink-0">
          <span>Active: {activeImage ? `${activeImage.width}×${activeImage.height}` : 'None'}</span>
          <button
            onClick={() =>
              onUpdateToolState({
                target_width: null,
                target_height: null,
                scale_percent: 100,
                rotate_angle: 0,
                flip_horizontal: false,
                flip_vertical: false,
                aspect_ratio: 'none',
                crop_x: null,
                crop_y: null,
                crop_w: null,
                crop_h: null,
                blur_bg_padding: false,
                brightness: 1.0,
                contrast: 1.0,
                saturation: 1.0,
                grayscale: false,
                lut_preset: 'original',
                sharpen: 0.0,
                blur_type: 'none',
                blur_radius: 0.0,
                denoise: false,
                watermark_text: '',
                output_format: 'JPEG',
                quality: 90,
                optimize: true,
              })
            }
            className="text-slate-600 dark:text-zinc-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition"
          >
            Reset Sliders
          </button>
        </div>
      </div>

      {/* CARD 2: Active Tool Controls & Parameter Hub (7 cols) */}
      <div className="lg:col-span-7 flex flex-col bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-5 shadow-sm dark:shadow-xl transition-colors h-full max-h-full overflow-hidden">
        {/* TAB: PERSPECTIVE & SCANNER DEWARPING */}
        {activeTab === 'perspective' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between flex-shrink-0 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scan className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  4-Point Perspective Transform & Scanner Dewarp
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Drag the 4 corner pins on the image canvas to align with document boundaries.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoDetectCorners}
                  disabled={isDetectingCorners}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>{isDetectingCorners ? 'Detecting...' : 'Auto-Detect'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResetCorners}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition"
                  title="Reset Pins to Defaults"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 space-y-4">
              {/* Target Paper & Social Aspect Ratio Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-400">Target Standard Aspect Ratio</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'auto', label: 'Proportional', desc: 'Auto Euclidean' },
                    { id: 'a4_portrait', label: 'A4 Portrait', desc: '1:1.414' },
                    { id: 'a4_landscape', label: 'A4 Landscape', desc: '1.414:1' },
                    { id: 'us_letter', label: 'US Letter', desc: '8.5x11 in' },
                    { id: 'us_legal', label: 'US Legal', desc: '8.5x14 in' },
                    { id: 'square_1_1', label: '1:1 Square', desc: 'Square' },
                    { id: '9:16', label: '9:16 Story', desc: 'TikTok/Reels' },
                    { id: '16:9', label: '16:9 HD', desc: 'YouTube' },
                    { id: '4:5', label: '4:5 Social', desc: 'Instagram' },
                    { id: '4:3', label: '4:3 Classic', desc: 'Tablet' },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setPerspectiveAspect(opt.id)}
                      className={`p-2 rounded-xl text-left border transition ${
                        perspectiveAspect === opt.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-200 font-bold shadow-sm'
                          : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{opt.label}</div>
                      <div className="text-[9px] text-slate-400 dark:text-zinc-500">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Output Scale Percentage */}
              <div className="space-y-1.5 p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800/80">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-700 dark:text-zinc-300 font-bold">Output Scaling Percentage</span>
                  <span className="font-mono text-amber-600 dark:text-amber-400 font-bold">{perspectiveScale}%</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[25, 50, 75, 100, 150, 200].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => setPerspectiveScale(pct)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        perspectiveScale === pct
                          ? 'bg-amber-500 text-zinc-950 font-bold'
                          : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Scanner-Grade Enhancement Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-400">Scanner-Grade Enhancement Filter</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'none', label: 'Original Color', desc: 'True color unwarp' },
                    { id: 'magic_color', label: 'Magic Color', desc: 'Shadow removal & contrast' },
                    { id: 'bw_scan', label: 'Crisp B&W', desc: 'Adaptive binary text' },
                    { id: 'gray_document', label: 'Grayscale Scan', desc: 'Clean contrast scan' },
                  ].map((flt) => (
                    <button
                      key={flt.id}
                      type="button"
                      onClick={() => setPerspectiveEnhance(flt.id)}
                      className={`p-2.5 rounded-xl text-left border transition ${
                        perspectiveEnhance === flt.id
                          ? 'bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-200 font-bold shadow-sm'
                          : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                      }`}
                    >
                      <div className="text-xs font-bold">{flt.label}</div>
                      <div className="text-[9px] text-slate-400 dark:text-zinc-500">{flt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Dewarp Trigger Button */}
            <div className="mt-auto pt-3 border-t border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 flex-shrink-0">
              <button
                type="button"
                onClick={handlePerspectiveCrop}
                disabled={isWarping}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
              >
                <Scan className="w-4 h-4" />
                <span>{isWarping ? 'Warping & Flattening Document...' : 'Flatten & Deskew Document'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: TRANSFORMS */}
        {activeTab === 'transforms' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between flex-shrink-0 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Crop className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                Scale, Aspect Ratio & Rotation
              </h4>
              <span className="text-[11px] font-mono text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                Native: {activeImage?.width || 1920} × {activeImage?.height || 1080} px
              </span>
            </div>

            {/* Scrollable Tool Body */}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 space-y-4">
              {/* 1. Scale by Percentage */}
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800/80">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-700 dark:text-zinc-300 font-bold">1. Scale by Percentage</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onTabChange('ai')}
                      className="text-[10px] text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1 font-bold"
                      title="Open AI 4x Super-Resolution"
                    >
                      <Sparkles className="w-3 h-3 text-cyan-500" />
                      AI 4x Super-Res
                    </button>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{toolState.scale_percent}%</span>
                  </div>
                </div>

                {/* Quick Percentage Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {[25, 50, 75, 100, 150, 200, 300, 400].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => update('scale_percent', pct)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        toolState.scale_percent === pct
                          ? 'bg-cyan-500 text-zinc-950 font-bold shadow-sm'
                          : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:border-cyan-500'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                <input
                  type="range"
                  min="10"
                  max="400"
                  step="5"
                  value={toolState.scale_percent}
                  onChange={(e) => update('scale_percent', parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 mt-2"
                />
              </div>

              {/* 2. Custom Exact Pixel Sizing */}
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800/80">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-700 dark:text-zinc-300 font-bold">2. Custom Output Resolution (px)</span>
                  <button
                    type="button"
                    onClick={handleResetNativeDimensions}
                    className="text-[10px] text-slate-500 hover:text-cyan-600 flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reset to Native
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 font-mono">Width (px)</label>
                    <input
                      type="number"
                      value={customWidth}
                      onChange={(e) => handleWidthChange(e.target.value)}
                      placeholder="Width"
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setLockAspect(!lockAspect)}
                    className={`p-2 mt-4 rounded-lg border transition ${
                      lockAspect
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-700 dark:text-cyan-300'
                        : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-400'
                    }`}
                    title={lockAspect ? 'Aspect ratio locked' : 'Aspect ratio free'}
                  >
                    {lockAspect ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>

                  <div className="flex-1">
                    <label className="text-[10px] text-slate-500 font-mono">Height (px)</label>
                    <input
                      type="number"
                      value={customHeight}
                      onChange={(e) => handleHeightChange(e.target.value)}
                      placeholder="Height"
                      className="w-full px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-xs font-mono text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Standard Resolution Quick Picks */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {RESOLUTION_PRESETS.map((res) => (
                    <button
                      key={res.label}
                      type="button"
                      onClick={() => handleSelectResolutionPreset(res.w, res.h)}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:border-cyan-500 text-slate-600 dark:text-zinc-300"
                    >
                      {res.label} ({res.w}x{res.h})
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. Aspect Ratio Framing (Optional Live Canvas Crop) */}
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                      3. Aspect Ratio Framing (Optional Live Crop)
                    </label>
                    {toolState.aspect_ratio && toolState.aspect_ratio !== 'none' && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold border border-cyan-500/30">
                        {toolState.aspect_ratio}
                      </span>
                    )}
                  </div>
                  {toolState.aspect_ratio && toolState.aspect_ratio !== 'none' && (
                    <button
                      type="button"
                      onClick={() => handleApplyAspectRatio('none')}
                      className="text-[10px] font-bold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
                    >
                      ✕ Disable Crop
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {ASPECT_PRESETS.map((asp) => (
                    <button
                      key={asp.id}
                      type="button"
                      onClick={() => handleApplyAspectRatio(asp.id)}
                      className={`p-2 rounded-xl text-left border transition ${
                        (toolState.aspect_ratio || 'none') === asp.id
                          ? 'bg-cyan-500/15 border-cyan-500 text-cyan-800 dark:text-cyan-200 font-bold ring-1 ring-cyan-500 shadow-sm'
                          : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:border-cyan-500'
                      }`}
                    >
                      <div className="text-xs font-bold">{asp.label}</div>
                      <div className="text-[9px] text-slate-400 dark:text-zinc-500 truncate">{asp.desc}</div>
                    </button>
                  ))}
                </div>

                {/* Blurred Canvas Toggle */}
                {toolState.aspect_ratio && toolState.aspect_ratio !== 'none' && (
                  <div
                    onClick={() => update('blur_bg_padding', !toolState.blur_bg_padding)}
                    className={`p-2.5 rounded-xl border cursor-pointer flex items-center justify-between transition mt-1 ${
                      toolState.blur_bg_padding
                        ? 'bg-cyan-500/10 border-cyan-500/80 text-slate-900 dark:text-white'
                        : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">Dynamic Blurred Background Padding</div>
                      <div className="text-[10px] text-slate-500">Fill empty aspect ratio margins with blurred canvas</div>
                    </div>
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${toolState.blur_bg_padding ? 'border-cyan-500 bg-cyan-500' : 'border-slate-400'}`}>
                      {toolState.blur_bg_padding && <div className="w-1.5 h-1.5 bg-zinc-950 rounded-full" />}
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Continuous 0° to 360° Rotation Slider */}
              <div className="space-y-2 p-3 bg-slate-50 dark:bg-zinc-900/60 rounded-xl border border-slate-200 dark:border-zinc-800/80">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-700 dark:text-zinc-300 font-bold">4. Continuous 0° to 360° Rotation</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold">{toolState.rotate_angle || 0}°</span>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={toolState.rotate_angle || 0}
                  onChange={(e) => update('rotate_angle', parseInt(e.target.value, 10))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />

                {/* Quick Snaps & Step Controls */}
                <div className="flex items-center justify-between gap-1.5 pt-1">
                  <div className="flex items-center gap-1">
                    {[0, 90, 180, 270].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => update('rotate_angle', deg)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                          (toolState.rotate_angle || 0) === deg
                            ? 'bg-cyan-500 text-zinc-950 border-cyan-500 font-bold'
                            : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:border-cyan-500'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleRotateStep(-90)}
                      className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:border-cyan-500"
                      title="Rotate -90° CCW"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRotateStep(90)}
                      className="p-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:border-cyan-500"
                      title="Rotate +90° CW"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => update('flip_horizontal', !toolState.flip_horizontal)}
                      className={`p-1.5 rounded-lg border transition ${
                        toolState.flip_horizontal
                          ? 'bg-cyan-500 text-zinc-950 border-cyan-500'
                          : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                      }`}
                      title="Flip Horizontal"
                    >
                      <FlipHorizontal className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => update('flip_vertical', !toolState.flip_vertical)}
                      className={`p-1.5 rounded-lg border transition ${
                        toolState.flip_vertical
                          ? 'bg-cyan-500 text-zinc-950 border-cyan-500'
                          : 'bg-white dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                      }`}
                      title="Flip Vertical"
                    >
                      <FlipVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Fixed Bottom Export Trigger */}
            <div className="mt-auto pt-3 border-t border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 flex-shrink-0">
              <button
                type="button"
                onClick={onExport}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition"
              >
                <Download className="w-4 h-4" />
                <span>{isProcessing ? 'Processing Transforms...' : 'Apply Transforms & Save'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: COLOR & 3D LUTS */}
        {activeTab === 'color' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Cinematic 3D LUT Color Grading
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {LUT_PRESETS.map((lut) => (
                  <button
                    key={lut.id}
                    type="button"
                    onClick={() => update('lut_preset', lut.id)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      toolState.lut_preset === lut.id
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-800 dark:text-cyan-200 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="text-xs font-bold">{lut.name}</div>
                    <div className="text-[9px] text-slate-400 dark:text-zinc-500">{lut.desc}</div>
                  </button>
                ))}
              </div>

              {/* Brightness, Contrast, Saturation */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                    <span>Brightness</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400">{toolState.brightness.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.05"
                    value={toolState.brightness}
                    onChange={(e) => update('brightness', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                    <span>Contrast</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400">{toolState.contrast.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.0"
                    step="0.05"
                    value={toolState.contrast}
                    onChange={(e) => update('contrast', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600 dark:text-zinc-400">
                    <span>Saturation</span>
                    <span className="font-mono text-cyan-600 dark:text-cyan-400">{toolState.saturation.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="2.5"
                    step="0.05"
                    value={toolState.saturation}
                    onChange={(e) => update('saturation', parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              </div>
            </div>

            {/* Export Trigger */}
            <div className="mt-auto pt-3 border-t border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 flex-shrink-0">
              <button
                type="button"
                onClick={onExport}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition"
              >
                <Download className="w-4 h-4" />
                <span>{isProcessing ? 'Processing...' : 'Apply Color Grade & Save'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: AI NEURAL VISION */}
        {activeTab === 'ai' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                AI Neural Vision & Deep Learning Engine
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 space-y-4">
              {/* AI Operation Selector */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'bg_remove', label: 'Background Cutout', desc: 'U-2-Net Subject Isolation' },
                  { id: 'upscale', label: '4x Super-Resolution', desc: 'Neural Upscale & Sharpen' },
                  { id: 'colorize', label: 'Vintage Colorizer', desc: 'Deep Color Restoration' },
                  { id: 'enhance', label: 'Portrait Enhancer', desc: 'Facial Clarity & Beauty' },
                ].map((op) => (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setAiOp(op.id)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      aiOp === op.id
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-800 dark:text-cyan-200 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="text-xs font-bold">{op.label}</div>
                    <div className="text-[9px] text-slate-400 dark:text-zinc-500">{op.desc}</div>
                  </button>
                ))}
              </div>

              {/* BG Mode Selector */}
              {aiOp === 'bg_remove' && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-400">Background Replacement Canvas</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'transparent', label: 'Transparent Alpha PNG' },
                      { id: 'white', label: 'Studio White (#FFFFFF)' },
                      { id: 'black', label: 'Studio Black (#000000)' },
                      { id: 'portrait_blur', label: 'Portrait Bokeh Blur' },
                    ].map((bg) => (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => setAiBgMode(bg.id)}
                        className={`p-2 rounded-xl text-xs font-semibold border transition ${
                          aiBgMode === bg.id
                            ? 'bg-cyan-500/15 border-cyan-500 text-cyan-800 dark:text-cyan-200'
                            : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                        }`}
                      >
                        {bg.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Upscale Factor Selector */}
              {aiOp === 'upscale' && (
                <div className="space-y-2 p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Super-Resolution Scale Factor</label>
                  <div className="flex gap-2">
                    {[2, 3, 4].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setAiScale(sc)}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                          aiScale === sc
                            ? 'bg-cyan-500 text-zinc-950 font-bold'
                            : 'bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300'
                        }`}
                      >
                        {sc}× Upscale ({activeImage ? `${activeImage.width * sc}×${activeImage.height * sc} px` : ''})
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Trigger */}
            <div className="mt-auto pt-3 border-t border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 flex-shrink-0">
              <button
                type="button"
                onClick={handleRunAI}
                disabled={isProcessingAI}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition"
              >
                <Wand2 className="w-4 h-4" />
                <span>{isProcessingAI ? 'Processing AI Pipeline...' : `Run AI ${aiOp.replace('_', ' ')} Pipeline`}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: ARTISTIC FX */}
        {activeTab === 'artistic' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Creative Artistic Filters & Stylization
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {ARTISTIC_PRESETS.map((fx) => (
                  <button
                    key={fx.id}
                    type="button"
                    onClick={() => update('artistic_filter', fx.id)}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      (toolState.artistic_filter || 'none') === fx.id
                        ? 'bg-purple-500/15 border-purple-500 text-purple-800 dark:text-purple-200 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="text-xs font-bold">{fx.name}</div>
                    <div className="text-[9px] text-slate-400 dark:text-zinc-500">{fx.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 flex-shrink-0">
              <button
                type="button"
                onClick={onExport}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition"
              >
                <Wand2 className="w-4 h-4" />
                <span>{isProcessing ? 'Processing...' : 'Apply Artistic FX & Render'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: CHROMA KEY */}
        {activeTab === 'chromakey' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Scissors className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Green Screen Chroma Key Cutout
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Extract solid green/blue studio backgrounds with feathering and despill.
              </p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-600 dark:text-zinc-400">
                Chroma Key extraction isolates pure `#00FF00` or `#0000FF` backdrops into clean alpha transparency PNGs.
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 flex-shrink-0">
              <button
                type="button"
                onClick={onExport}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/20"
              >
                <Scissors className="w-4 h-4" />
                <span>{isProcessing ? 'Extracting...' : 'Extract Chroma Key'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: EXIF & METADATA */}
        {activeTab === 'metadata' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between flex-shrink-0 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                EXIF Metadata & Privacy Stripper
              </h4>
              <button
                type="button"
                onClick={handleStripExif}
                className="px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/40 hover:bg-rose-500/25 text-rose-700 dark:text-rose-300 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>1-Click Strip GPS & EXIF</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 space-y-4">
              {/* Dominant Palette Swatches */}
              {palette.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-zinc-400">Dominant 6-Color Palette (Click to Copy HEX)</label>
                  <div className="grid grid-cols-6 gap-2">
                    {palette.map((hex, i) => (
                      <div
                        key={i}
                        onClick={() => handleCopyHex(hex)}
                        className="group cursor-pointer rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 p-2 flex flex-col items-center gap-1.5 bg-slate-50 dark:bg-zinc-900 transition hover:border-cyan-500"
                      >
                        <div className="w-full h-8 rounded-lg shadow-inner" style={{ backgroundColor: hex }} />
                        <span className="text-[10px] font-mono text-slate-600 dark:text-zinc-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-300">
                          {copiedHex === hex ? 'Copied!' : hex}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EXIF Data */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs font-mono space-y-1 text-slate-800 dark:text-zinc-300">
                <div>Camera: {exifData?.camera?.make ? `${exifData.camera.make} ${exifData.camera.model}` : 'None / Stripped'}</div>
                <div>Software: {exifData?.camera?.software || 'Standard Engine'}</div>
                <div>GPS: {exifData?.gps?.latitude ? `${exifData.gps.latitude}, ${exifData.gps.longitude}` : 'No GPS Tags'}</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: WATERMARK & STAMP */}
        {activeTab === 'watermark' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <div className="flex-shrink-0 pb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Type className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                Watermark & Unsharp Mask Sharpening
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1.5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-zinc-400">Watermark Text Overlay</label>
                <input
                  type="text"
                  placeholder="e.g. © Media Pro Studio"
                  value={toolState.watermark_text}
                  onChange={(e) => update('watermark_text', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-zinc-400">
                  <span>Unsharp Mask Edge Sharpening</span>
                  <span className="font-mono text-cyan-600 dark:text-cyan-400">{toolState.sharpen.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.1"
                  value={toolState.sharpen}
                  onChange={(e) => update('sharpen', parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
              </div>
            </div>

            <div className="mt-auto pt-3 border-t border-slate-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-950 flex-shrink-0">
              <button
                type="button"
                onClick={onExport}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition"
              >
                <Download className="w-4 h-4" />
                <span>{isProcessing ? 'Processing...' : 'Apply Watermark & Render'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
