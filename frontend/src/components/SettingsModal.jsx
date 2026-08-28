import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Zap,
  Scissors,
  Crop,
  Film,
  Music,
  Layers,
  Camera,
  Sliders,
  RotateCw,
  MoveHorizontal,
  RotateCcw,
  Check,
  Cpu,
  Monitor,
  Layout,
  Sparkles,
  Type,
  MicOff,
  Minimize2,
  Compass,
  Repeat,
  Palette,
  Volume2,
  Maximize2,
  Folder,
  FolderOpen,
  HardDrive,
  Download,
  Copy,
  CheckCircle2,
  Image as ImageIcon,
  BrainCircuit,
  Wand2,
} from 'lucide-react';
import { pickExportDirectory, isFileSystemAccessSupported } from '../utils/fileSystem';
import { useToast } from '../context/ToastContext';

export const DEFAULT_SETTINGS = {
  features: {
    cut: true,
    crop: true,
    rescale: true,
    text: true,
    silence: true,
    compress: true,
    scenes: true,
    stabilize: true,
    colorgrade: true,
    normalize: true,
    boomerang: true,
    gif: true,
    audio: true,
    merge: true,
  },
  playerTools: {
    snapshot: true,
    cropGuides: true,
    rotate: true,
    flip: true,
    heightSlider: true,
    timecodeHUD: true,
  },
  storage: {
    autoSave: true,
    folderName: '',
    autoCloseModal: false,
  },
  engine: {
    hardwareMode: 'auto',
    defaultCutMode: 'fast',
    thumbnailCount: 24,
  },
  layout: {
    fullWidth: true,
    splitRatio: '8/4',
    density: 'compact',
  },
  imageStudio: {
    defaultFormat: 'JPEG',
    defaultQuality: 90,
    defaultLut: 'original',
    defaultWatermark: '© VideoProcessor Studio',
    defaultWatermarkPosition: 'bottom_right',
    aiModelPreference: 'u2netp',
    autoThumbnails: true,
  },
};

export default function SettingsModal({ isOpen, onClose, settings, onUpdateSettings, hardwareInfo }) {
  const [activeCategory, setActiveCategory] = useState('features'); // 'features' | 'storage' | 'imageStudio' | 'player' | 'engine' | 'layout'
  const [localSettings, setLocalSettings] = useState(settings || DEFAULT_SETTINGS);
  const [showSavedToast, setShowSavedToast] = useState(false);
  const [copiedHostPath, setCopiedHostPath] = useState(false);
  const [copiedImagePath, setCopiedImagePath] = useState(false);
  const [isPickingFolder, setIsPickingFolder] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings || DEFAULT_SETTINGS);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const toggleFeature = (key) => {
    setLocalSettings((prev) => {
      const updated = {
        ...prev,
        features: {
          ...prev.features,
          [key]: !prev.features[key],
        },
      };
      const enabledCount = Object.values(updated.features).filter(Boolean).length;
      if (enabledCount === 0) return prev;
      return updated;
    });
  };

  const togglePlayerTool = (key) => {
    setLocalSettings((prev) => ({
      ...prev,
      playerTools: {
        ...prev.playerTools,
        [key]: !prev.playerTools[key],
      },
    }));
  };

  const updateStorage = (key, val) => {
    setLocalSettings((prev) => ({
      ...prev,
      storage: {
        ...(prev.storage || DEFAULT_SETTINGS.storage),
        [key]: val,
      },
    }));
  };

  const updateImageStudio = (key, val) => {
    setLocalSettings((prev) => ({
      ...prev,
      imageStudio: {
        ...(prev.imageStudio || DEFAULT_SETTINGS.imageStudio),
        [key]: val,
      },
    }));
  };

  const handlePickDirectory = async () => {
    setIsPickingFolder(true);
    try {
      const handle = await pickExportDirectory();
      if (handle) {
        updateStorage('folderName', handle.name);
        toast.success(`Export directory set to "${handle.name}"`);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to select directory');
    } finally {
      setIsPickingFolder(false);
    }
  };

  const handleCopyHostPath = () => {
    const hostPath = 'c:/Users/umairwaqas/Projects/VideoProcessor/data/outputs/';
    navigator.clipboard.writeText(hostPath);
    setCopiedHostPath(true);
    toast.success('Outputs path copied to clipboard');
    setTimeout(() => setCopiedHostPath(false), 2000);
  };

  const handleCopyImagePath = () => {
    const hostPath = 'c:/Users/umairwaqas/Projects/VideoProcessor/data/image_outputs/';
    navigator.clipboard.writeText(hostPath);
    setCopiedImagePath(true);
    toast.success('Image outputs path copied to clipboard');
    setTimeout(() => setCopiedImagePath(false), 2000);
  };

  const updateEngine = (key, val) => {
    setLocalSettings((prev) => ({
      ...prev,
      engine: {
        ...prev.engine,
        [key]: val,
      },
    }));
  };

  const updateLayout = (key, val) => {
    setLocalSettings((prev) => ({
      ...prev,
      layout: {
        ...prev.layout,
        [key]: val,
      },
    }));
  };

  const handleSave = () => {
    onUpdateSettings(localSettings);
    setShowSavedToast(true);
    setTimeout(() => {
      setShowSavedToast(false);
      onClose();
    }, 400);
  };

  const handleReset = () => {
    setLocalSettings(DEFAULT_SETTINGS);
    onUpdateSettings(DEFAULT_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-6xl xl:max-w-7xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-zinc-100">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-slate-50 dark:bg-zinc-900/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                Studio Preferences & Module Manager
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Configure Video Studio, Image Studio, AI runtimes, storage directories, and UI density
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex border-b border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40 px-6 text-xs font-semibold overflow-x-auto gap-2">
          {[
            { id: 'features', label: '🎬 Video Modules', icon: Sparkles },
            { id: 'imageStudio', label: '🖼️ Image Studio Preferences', icon: ImageIcon },
            { id: 'storage', label: '📁 Export Directory & Auto-Save', icon: FolderOpen },
            { id: 'player', label: '📹 Video Player Tools', icon: Monitor },
            { id: 'engine', label: '⚡ Hardware & Engine', icon: Cpu },
            { id: 'layout', label: '🖥️ Layout & Widescreen', icon: Layout },
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`py-3 px-3.5 border-b-2 flex items-center gap-2 transition whitespace-nowrap ${
                  activeCategory === cat.id
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 font-bold bg-cyan-500/5'
                    : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* TAB: Image Studio Preferences */}
          {activeCategory === 'imageStudio' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-xs text-slate-500 dark:text-zinc-400">
                Configure default encoding formats, quality sliders, 3D LUT presets, and AI neural segmentation models.
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* 1. Default Image Export Format */}
                <div className="p-4 bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-2.5">
                  <div className="flex items-center space-x-2">
                    <ImageIcon className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      Default Image Export Container
                    </span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {['JPEG', 'PNG', 'WEBP', 'BMP', 'TIFF'].map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => updateImageStudio('defaultFormat', fmt)}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          (localSettings.imageStudio?.defaultFormat || 'JPEG') === fmt
                            ? 'bg-cyan-500 text-zinc-950 border-cyan-400 shadow-sm'
                            : 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-500">
                    Standardizes format selection across the 1-Click Export Hub.
                  </p>
                </div>

                {/* 2. Default Quality Preset */}
                <div className="p-4 bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        Default Encoding Quality
                      </span>
                    </div>
                    <span className="font-mono text-cyan-400 text-xs font-bold">
                      {localSettings.imageStudio?.defaultQuality || 90}%
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { q: 100, label: '100% Max' },
                      { q: 90, label: '90% High' },
                      { q: 80, label: '80% Medium' },
                      { q: 60, label: '60% Small' },
                    ].map((opt) => (
                      <button
                        key={opt.q}
                        type="button"
                        onClick={() => updateImageStudio('defaultQuality', opt.q)}
                        className={`py-2 rounded-xl text-xs font-bold border transition ${
                          (localSettings.imageStudio?.defaultQuality || 90) === opt.q
                            ? 'bg-cyan-500 text-zinc-950 border-cyan-400 shadow-sm'
                            : 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. AI Neural Model Engine Preference */}
                <div className="p-4 bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-2.5">
                  <div className="flex items-center space-x-2">
                    <BrainCircuit className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                      AI Background Cutout Model (U-2-Net)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'u2netp', label: '⚡ U-2-Netp (Fast / Lightweight)', desc: 'Instant 0.5s neural cutout' },
                      { id: 'u2net', label: '🎯 U-2-Net (Full Precision)', desc: 'High micro-detail hair segmentation' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => updateImageStudio('aiModelPreference', m.id)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          (localSettings.imageStudio?.aiModelPreference || 'u2netp') === m.id
                            ? 'bg-cyan-500/20 border-cyan-500 text-cyan-200 font-bold shadow-sm'
                            : 'bg-white dark:bg-zinc-950 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{m.label}</div>
                        <div className="text-[9px] text-slate-500 dark:text-zinc-500">{m.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. Permanent Image Host Storage */}
                <div className="p-4 bg-slate-50 dark:bg-zinc-900/70 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        Image Output Host Directory
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyImagePath}
                      className="flex items-center space-x-1 text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 text-slate-700 dark:text-zinc-300 transition"
                    >
                      {copiedImagePath ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedImagePath ? 'Copied!' : 'Copy Path'}</span>
                    </button>
                  </div>
                  <div className="p-2 rounded-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-slate-600 dark:text-zinc-300 select-all break-all">
                    c:/Users/umairwaqas/Projects/VideoProcessor/data/image_outputs/
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-500 leading-tight">
                    Rendered image outputs are physically persisted in your workspace volume.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Export Directory & Auto-Save */}
          {activeCategory === 'storage' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="text-xs text-slate-500 dark:text-zinc-400">
                Configure default export directory and automated completion saving behavior.
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
                {/* 1. Master Auto-Save Card */}
                <div
                  onClick={() => updateStorage('autoSave', !(localSettings.storage?.autoSave ?? true))}
                  className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                    (localSettings.storage?.autoSave ?? true)
                      ? 'bg-cyan-500/10 border-cyan-500 text-slate-900 dark:text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="space-y-1 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">Auto-Save directly to Default Directory</span>
                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        (localSettings.storage?.autoSave ?? true)
                          ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                      }`}>
                        {(localSettings.storage?.autoSave ?? true) ? '⚡ Direct Auto-Save' : '✋ Prompt on Save'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-tight">
                      {(localSettings.storage?.autoSave ?? true)
                        ? 'Exports automatically save to your chosen directory immediately upon completion without asking.'
                        : 'Opens a popup dialog when export finishes so you can confirm, download, or play.'}
                    </p>
                  </div>

                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                      (localSettings.storage?.autoSave ?? true) ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        (localSettings.storage?.autoSave ?? true) ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                {/* 2. Choose Working Export Directory Card */}
                <div className="p-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FolderOpen className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        Default Working Folder
                      </span>
                    </div>
                    {localSettings.storage?.folderName && (
                      <button
                        type="button"
                        onClick={() => updateStorage('folderName', '')}
                        className="text-[10px] text-slate-400 hover:text-rose-400 transition"
                      >
                        Reset to Default Downloads
                      </button>
                    )}
                  </div>

                  <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-xs font-mono flex items-center justify-between">
                    <div className="truncate flex items-center space-x-2">
                      <Folder className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span className="truncate font-semibold text-slate-700 dark:text-zinc-300">
                        {localSettings.storage?.folderName
                          ? `📁 ${localSettings.storage.folderName}`
                          : '📥 System Default Browser Downloads'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handlePickDirectory}
                      disabled={isPickingFolder}
                      className="ml-2 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-zinc-950 font-bold text-[10px] flex items-center space-x-1 shrink-0 transition shadow-sm"
                    >
                      <FolderOpen className="w-3 h-3" />
                      <span>{localSettings.storage?.folderName ? 'Change Folder...' : 'Pick Folder...'}</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-500 leading-tight">
                    Select any folder on your computer. When Auto-Save is enabled, finished exports write directly to this folder.
                  </p>
                </div>

                {/* 3. Permanent Video Storage Path */}
                <div className="p-4 bg-slate-50 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <HardDrive className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">
                        Video Output Host Directory
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyHostPath}
                      className="flex items-center space-x-1 text-[10px] font-mono px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-zinc-800 hover:bg-slate-300 text-slate-700 dark:text-zinc-300 transition"
                    >
                      {copiedHostPath ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedHostPath ? 'Copied!' : 'Copy Path'}</span>
                    </button>
                  </div>

                  <div className="p-2 rounded-xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 text-[11px] font-mono text-slate-600 dark:text-zinc-300 select-all break-all">
                    c:/Users/umairwaqas/Projects/VideoProcessor/data/outputs/
                  </div>
                </div>

                {/* 4. Auto-Close Progress Modal on Save */}
                <div
                  onClick={() => updateStorage('autoCloseModal', !(localSettings.storage?.autoCloseModal ?? false))}
                  className={`p-4 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                    (localSettings.storage?.autoCloseModal ?? false)
                      ? 'bg-cyan-500/10 border-cyan-500 text-slate-900 dark:text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300'
                  }`}
                >
                  <div className="pr-3">
                    <div className="text-xs font-bold">Auto-Dismiss Progress Dialog on Export</div>
                    <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">Automatically closes the completion popup after the file has been saved</div>
                  </div>
                  <div
                    className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                      (localSettings.storage?.autoCloseModal ?? false) ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        (localSettings.storage?.autoCloseModal ?? false) ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Video Features */}
          {activeCategory === 'features' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="text-xs text-slate-500 dark:text-zinc-400">
                Enable or disable export tabs in the Video Studio Export Engine.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[
                  { id: 'cut', label: 'Video Cut Studio', desc: 'Fast copy & accurate trimming', icon: Scissors, enabled: localSettings.features.cut },
                  { id: 'crop', label: 'Social 9:16 & Canvas', desc: 'TikTok & blurred backdrop', icon: Crop, enabled: localSettings.features.crop },
                  { id: 'rescale', label: '4K/8K Super-Resolution', desc: 'Lanczos upscaler & convert', icon: Maximize2, enabled: localSettings.features.rescale ?? true },
                  { id: 'text', label: 'Watermark & Timecode', desc: 'SMPTE clock & copyright', icon: Type, enabled: localSettings.features.text },
                  { id: 'silence', label: 'Silence AI Jump-Cut', desc: 'Auto dead-air remover', icon: MicOff, enabled: localSettings.features.silence },
                  { id: 'compress', label: 'File Size Compressor', desc: 'Fit exact MB (Discord/Email)', icon: Minimize2, enabled: localSettings.features.compress },
                  { id: 'scenes', label: 'Scene Splitter AI', desc: 'Smart visual shot detector', icon: Sparkles, enabled: localSettings.features.scenes },
                  { id: 'stabilize', label: 'Optical Stabilization', desc: '2-pass motion smoother', icon: Compass, enabled: localSettings.features.stabilize },
                  { id: 'colorgrade', label: 'Hollywood 3D LUT', desc: 'Teal & Orange, Cyberpunk', icon: Palette, enabled: localSettings.features.colorgrade },
                  { id: 'gif', label: 'Animated GIF Creator', desc: 'Paletted looping GIF maker', icon: Film, enabled: localSettings.features.gif },
                  { id: 'audio', label: 'Audio Stream Studio', desc: 'MP3/WAV extract & gain', icon: Music, enabled: localSettings.features.audio },
                  { id: 'normalize', label: 'EBU R128 Normalizer', desc: 'Broadcast loudness master', icon: Volume2, enabled: localSettings.features.normalize },
                  { id: 'boomerang', label: 'Boomerang & Split', desc: 'Reverse loop & compare', icon: Repeat, enabled: localSettings.features.boomerang },
                  { id: 'merge', label: 'Multi-Clip Merger', desc: 'Timeline highlight stitcher', icon: Layers, enabled: localSettings.features.merge },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => toggleFeature(item.id)}
                      className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                        item.enabled
                          ? 'bg-cyan-500/10 border-cyan-500/80 text-slate-900 dark:text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <div className={`p-2 rounded-xl shrink-0 ${item.enabled ? 'bg-cyan-500 text-zinc-950 shadow-sm' : 'bg-slate-200 dark:bg-zinc-700 text-slate-500'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 truncate">
                          <div className="text-xs font-bold truncate">{item.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">{item.desc}</div>
                        </div>
                      </div>

                      <div
                        className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                          item.enabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            item.enabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: Video Player Tools */}
          {activeCategory === 'player' && (
            <div className="space-y-3 animate-in fade-in">
              <div className="text-xs text-slate-500 dark:text-zinc-400">
                Customize interactive controls and overlays in the Video Player toolbar.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {[
                  { id: 'snapshot', label: 'Instant Frame Snapshot', desc: '1-click lossless frame capture', icon: Camera, enabled: localSettings.playerTools.snapshot },
                  { id: 'cropGuides', label: 'Crop & Rule-of-Thirds', desc: 'Framing safe-area overlays', icon: Crop, enabled: localSettings.playerTools.cropGuides },
                  { id: 'rotate', label: '90° Rotation Tool', desc: 'Live video rotate button', icon: RotateCw, enabled: localSettings.playerTools.rotate },
                  { id: 'flip', label: 'Mirror Flip Tool', desc: 'Live horizontal flip', icon: MoveHorizontal, enabled: localSettings.playerTools.flip },
                  { id: 'heightSlider', label: 'Player Height Slider', desc: 'Resize bar (260px - 780px)', icon: Sliders, enabled: localSettings.playerTools.heightSlider },
                  { id: 'timecodeHUD', label: 'Timecode & Frame HUD', desc: 'Timecode and FPS canvas badge', icon: Monitor, enabled: localSettings.playerTools.timecodeHUD },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => togglePlayerTool(item.id)}
                      className={`p-3 rounded-2xl border cursor-pointer flex items-center justify-between transition ${
                        item.enabled
                          ? 'bg-cyan-500/10 border-cyan-500/80 text-slate-900 dark:text-white shadow-sm'
                          : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 text-slate-400 opacity-60'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                        <div className={`p-2 rounded-xl shrink-0 ${item.enabled ? 'bg-cyan-500 text-zinc-950 shadow-sm' : 'bg-slate-200 dark:bg-zinc-700 text-slate-500'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 truncate">
                          <div className="text-xs font-bold truncate">{item.label}</div>
                          <div className="text-[10px] text-slate-500 dark:text-zinc-400 truncate">{item.desc}</div>
                        </div>
                      </div>

                      <div
                        className={`w-9 h-5 rounded-full transition-colors relative p-0.5 shrink-0 ${
                          item.enabled ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-zinc-700'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform ${
                            item.enabled ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: Hardware & Engine */}
          {activeCategory === 'engine' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="font-bold text-cyan-600 dark:text-cyan-400 block">Active Hardware Acceleration Status</span>
                  <span className="text-[11px] text-slate-600 dark:text-zinc-300">
                    {hardwareInfo?.gpu_name || 'NVIDIA GeForce RTX 3050 6GB Laptop GPU'}
                  </span>
                </div>
                <span className="px-2.5 py-1 rounded bg-cyan-500 text-zinc-950 font-mono text-[10px] font-bold">
                  {hardwareInfo?.is_gpu ? '🚀 NVENC Active' : 'CPU Mode'}
                </span>
              </div>

              {/* Hardware Preference */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold block text-slate-700 dark:text-zinc-300">
                  Hardware Acceleration Preference
                </label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'auto', label: 'Auto Detect (Recommended)', desc: 'NVENC with CPU fallback' },
                    { id: 'nvenc', label: 'Force NVENC GPU', desc: 'Hardware GPU only' },
                    { id: 'cpu', label: 'Force CPU (Software)', desc: 'libx264 software encoder' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => updateEngine('hardwareMode', mode.id)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        localSettings.engine.hardwareMode === mode.id
                          ? 'bg-cyan-500/15 border-cyan-500 text-slate-900 dark:text-white font-bold shadow-sm'
                          : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{mode.label}</div>
                      <div className="text-[9px] text-slate-500 dark:text-zinc-500 font-normal">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Default Cut Mode */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold block text-slate-700 dark:text-zinc-300">
                  Default Export Cut Mode
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'fast', label: '⚡ Fast Cut (Stream Copy)', desc: 'Instant 0s lossless export' },
                    { id: 'accurate', label: '🎯 Accurate (Re-encode)', desc: 'Exact frame precision' },
                  ].map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => updateEngine('defaultCutMode', mode.id)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        localSettings.engine.defaultCutMode === mode.id
                          ? 'bg-cyan-500/15 border-cyan-500 text-slate-900 dark:text-white font-bold shadow-sm'
                          : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{mode.label}</div>
                      <div className="text-[9px] text-slate-500 dark:text-zinc-500 font-normal">{mode.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Layout & Widescreen */}
          {activeCategory === 'layout' && (
            <div className="space-y-4 animate-in fade-in">
              <div
                onClick={() => updateLayout('fullWidth', !localSettings.layout.fullWidth)}
                className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                  localSettings.layout.fullWidth
                    ? 'bg-cyan-500/10 border-cyan-500 text-slate-900 dark:text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                }`}
              >
                <div>
                  <div className="text-xs font-bold">100% Full Viewport Widescreen Mode</div>
                  <div className="text-[11px] text-slate-500 dark:text-zinc-400">Expands the workspace to fill all horizontal screen space</div>
                </div>
                <div
                  className={`w-9 h-5 rounded-full transition-colors relative p-0.5 ${
                    localSettings.layout.fullWidth ? 'bg-cyan-500' : 'bg-slate-300 dark:bg-zinc-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      localSettings.layout.fullWidth ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold block text-slate-700 dark:text-zinc-300">
                  UI Element Density
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { id: 'compact', label: 'Compact Studio (Zero Scroll)', desc: 'Optimized for single viewport' },
                    { id: 'normal', label: 'Comfortable', desc: 'Standard padding and heights' },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => updateLayout('density', d.id)}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        localSettings.layout.density === d.id
                          ? 'bg-cyan-500/15 border-cyan-500 text-slate-900 dark:text-white font-bold shadow-sm'
                          : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      <div className="text-[11px] font-bold">{d.label}</div>
                      <div className="text-[9px] text-slate-500 dark:text-zinc-500">{d.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/60 flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-zinc-800 transition"
          >
            Reset All to Defaults
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800 transition"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center space-x-2 shadow-lg shadow-cyan-500/20 transition"
            >
              <Check className="w-4 h-4" />
              <span>{showSavedToast ? 'Settings Applied!' : 'Save & Apply Preferences'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
