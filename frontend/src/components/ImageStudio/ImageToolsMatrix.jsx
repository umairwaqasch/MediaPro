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
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';

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
  { id: 'original', label: 'Original' },
  { id: '1:1', label: '1:1 Square' },
  { id: '9:16', label: '9:16 TikTok' },
  { id: '16:9', label: '16:9 YouTube' },
  { id: '4:5', label: '4:5 Social' },
  { id: '4:3', label: '4:3 Classic' },
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
  const handleRunAI = async () => {
    if (!activeImage) return;
    const imgId = activeImage.image_id || activeImage.id;
    let payload = { operation: aiOp };
    if (aiOp === 'bg_remove') {
      if (aiBgMode === 'white') payload.bg_color_hex = '#FFFFFF';
      else if (aiBgMode === 'black') payload.bg_color_hex = '#000000';
      else if (aiBgMode === 'portrait_blur') payload.portrait_blur_radius = aiPortraitBlur;
    } else if (aiOp === 'upscale') {
      payload.scale = aiScale;
    }

    try {
      const res = await fetch(`/mediapro/api/image/${imgId}/ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.task_id) {
        toast.info(`AI ${aiOp.replace('_', ' ')} queued. Neural model processing...`);
      }
    } catch (err) {
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
          if (t?.state === 'SUCCESS') {
            clearInterval(interval);
            setIsWarping(false);
            if (onPerspectiveSuccess) onPerspectiveSuccess(t.result);
            toast.success('Document flattened & deskewed successfully!');
          } else if (t?.state === 'FAILURE') {
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
      {/* CARD 1: Categorized Tools Matrix (5 cols) */}
      <div className="lg:col-span-5 flex flex-col bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-4 shadow-sm dark:shadow-xl transition-colors">
        <h3 className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-3">
          Studio Tool Matrix
        </h3>

        <div className="grid grid-cols-2 gap-2 mb-4">
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
        <div className="mt-auto pt-3 border-t border-slate-200 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-500">
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
                aspect_ratio: 'original',
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
      <div className="lg:col-span-7 flex flex-col bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-5 shadow-sm dark:shadow-xl transition-colors">
        {/* TAB: PERSPECTIVE & SCANNER DEWARPING */}
        {activeTab === 'perspective' && (
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Scan className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  4-Point Perspective Transform & Scanner Dewarp
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                  Drag the 4 corner pins on the image canvas to align with the document boundaries.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoDetectCorners}
                  disabled={isDetectingCorners}
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isDetectingCorners ? 'Detecting...' : '🪄 Auto-Detect Corners'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetCorners}
                  className="p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition"
                  title="Reset Pins to Full Bounds"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Target Paper Size Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-400">Target Paper Aspect Ratio</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'auto', label: 'Proportional', desc: 'Auto Euclidean' },
                  { id: 'a4_portrait', label: 'A4 Portrait', desc: '1:1.414' },
                  { id: 'a4_landscape', label: 'A4 Landscape', desc: '1.414:1' },
                  { id: 'us_letter', label: 'US Letter', desc: '8.5×11 in' },
                  { id: 'square_1_1', label: '1:1 Square', desc: 'Square' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setPerspectiveAspect(opt.id)}
                    className={`p-2 rounded-xl text-center border transition ${
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

            {/* Document Enhancement Presets */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-400">Scanner-Grade Enhancement Filter</label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 'none', label: 'Original Color', desc: 'True color unwarp' },
                  { id: 'magic_color', label: '🪄 Magic Color', desc: 'Shadow removal & contrast' },
                  { id: 'bw_scan', label: '📄 Crisp B&W', desc: 'Adaptive binary text' },
                  { id: 'gray_document', label: 'Grayscale Scan', desc: 'Clean contrast scan' },
                ].map((enh) => (
                  <button
                    key={enh.id}
                    type="button"
                    onClick={() => setPerspectiveEnhance(enh.id)}
                    className={`p-2 rounded-xl text-left border transition ${
                      perspectiveEnhance === enh.id
                        ? 'bg-amber-500/20 border-amber-500 text-amber-800 dark:text-amber-200 font-bold shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    <div className="text-xs font-bold">{enh.label}</div>
                    <div className="text-[9px] text-slate-400 dark:text-zinc-500 leading-tight">{enh.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Corner Coordinates Display HUD */}
            <div className="p-3 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-xl flex items-center justify-between text-xs font-mono">
              <span className="text-slate-500 dark:text-zinc-400">Corner Pins:</span>
              <div className="flex gap-3 text-slate-700 dark:text-zinc-300">
                <span>TL: {Math.round((perspectivePoints?.[0]?.[0] || 0.08) * 100)}%, {Math.round((perspectivePoints?.[0]?.[1] || 0.08) * 100)}%</span>
                <span>TR: {Math.round((perspectivePoints?.[1]?.[0] || 0.92) * 100)}%, {Math.round((perspectivePoints?.[1]?.[1] || 0.08) * 100)}%</span>
                <span>BR: {Math.round((perspectivePoints?.[2]?.[0] || 0.92) * 100)}%, {Math.round((perspectivePoints?.[2]?.[1] || 0.92) * 100)}%</span>
                <span>BL: {Math.round((perspectivePoints?.[3]?.[0] || 0.08) * 100)}%, {Math.round((perspectivePoints?.[3]?.[1] || 0.92) * 100)}%</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-auto pt-4">
              <input
                type="file"
                ref={matrixFileInputRef}
                onChange={(e) => {
                  if (e.target.files?.[0] && onUploadImage) {
                    onUploadImage(e.target.files[0]);
                  }
                }}
                accept="image/*,.heic,.webp,.bmp"
                className="hidden"
              />
              {!activeImage ? (
                <button
                  type="button"
                  onClick={() => matrixFileInputRef.current?.click()}
                  className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition active:scale-98"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Image to Dewarp</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handlePerspectiveCrop}
                  disabled={isWarping}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
                >
                  <Scan className="w-4 h-4" />
                  <span>{isWarping ? 'Warping & Flattening Document...' : '⚡ Flatten & Deskew Document'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB: TRANSFORMS */}
        {activeTab === 'transforms' && (
          <div className="space-y-4 flex-1 flex flex-col">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Crop className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Scale, Aspect Ratio & Rotation
            </h4>

            {/* Scale Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-zinc-400">Scale Percentage</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400">{toolState.scale_percent}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="200"
                step="5"
                value={toolState.scale_percent}
                onChange={(e) => update('scale_percent', parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            {/* Aspect Ratio Framing */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-400">Aspect Ratio Framing</label>
              <div className="grid grid-cols-6 gap-2">
                {ASPECT_PRESETS.map((asp) => (
                  <button
                    key={asp.id}
                    type="button"
                    onClick={() => update('aspect_ratio', asp.id)}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      toolState.aspect_ratio === asp.id
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-700 dark:text-cyan-300'
                        : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {asp.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Blurred Canvas Toggle */}
            {toolState.aspect_ratio !== 'original' && (
              <div
                onClick={() => update('blur_bg_padding', !toolState.blur_bg_padding)}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                  toolState.blur_bg_padding
                    ? 'bg-cyan-500/10 border-cyan-500/80 text-slate-900 dark:text-white'
                    : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">Dynamic Blurred Canvas Padding</div>
                  <div className="text-[10px] text-slate-400 dark:text-zinc-500">Fill aspect bars with blurred background</div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                    toolState.blur_bg_padding ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-zinc-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      toolState.blur_bg_padding ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Rotation & Flip */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-400">Orientation & Mirror</label>
              <div className="flex gap-2">
                {[0, 90, 180, 270].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => update('rotate_angle', deg)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                      toolState.rotate_angle === deg
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-700 dark:text-cyan-300'
                        : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            {/* Export Trigger */}
            <div className="mt-auto pt-4">
              <button
                type="button"
                onClick={onExport}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition"
              >
                <Download className="w-4 h-4" />
                <span>{isProcessing ? 'Processing...' : 'Apply Transforms & Save'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: COLOR & 3D LUTS */}
        {activeTab === 'color' && (
          <div className="space-y-4 flex-1 flex flex-col">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              Cinematic 3D LUT Color Grading
            </h4>

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

            {/* Export Trigger */}
            <div className="mt-auto pt-4">
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
          <div className="space-y-4 flex-1 flex flex-col">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              AI Neural Vision & Deep Learning Engine
            </h4>

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

            {/* Action Trigger */}
            <div className="mt-auto pt-4">
              <button
                type="button"
                onClick={handleRunAI}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 transition"
              >
                <Wand2 className="w-4 h-4" />
                <span>Run AI {aiOp.replace('_', ' ')} Pipeline</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: ARTISTIC FX */}
        {activeTab === 'artistic' && (
          <div className="space-y-4 flex-1 flex flex-col">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              Creative Artistic Filters & Stylization
            </h4>

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

            <div className="mt-auto pt-4">
              <button
                type="button"
                onClick={onExport}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 transition"
              >
                <Wand2 className="w-4 h-4" />
                <span>Apply Artistic FX & Render</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: CHROMA KEY */}
        {activeTab === 'chromakey' && (
          <div className="space-y-4 flex-1 flex flex-col">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Scissors className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Green Screen Chroma Key Cutout
            </h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Extract solid green/blue studio backgrounds with feathering and despill.
            </p>

            <div className="mt-auto pt-4">
              <button
                type="button"
                onClick={onExport}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition"
              >
                <Scissors className="w-4 h-4" />
                <span>Extract Chroma Key</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB: EXIF & METADATA */}
        {activeTab === 'metadata' && (
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                EXIF Metadata Inspector & 1-Click Privacy Stripper
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
        )}

        {/* TAB: WATERMARK & STAMP */}
        {activeTab === 'watermark' && (
          <div className="space-y-4 flex-1 flex flex-col">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Type className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              Watermark & Unsharp Mask Sharpening
            </h4>

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

            <div className="mt-auto pt-4">
              <button
                type="button"
                onClick={onExport}
                disabled={isProcessing}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition"
              >
                <Download className="w-4 h-4" />
                <span>Apply Watermark & Render</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
