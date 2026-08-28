import React, { useState, useEffect } from 'react';
import {
  Scissors,
  Zap,
  Crosshair,
  RotateCcw,
  Volume2,
  VolumeX,
  Gauge,
  Film,
  Music,
  Layers,
  Sparkles,
  Crop,
  Smartphone,
  Square,
  Tv,
  Image as ImageIcon,
  Type,
  MicOff,
  Wand2,
  Minimize2,
  Compass,
  Repeat,
  Columns,
  Palette,
  SunMedium,
  Sliders,
  Maximize2,
} from 'lucide-react';
import { formatTimecode, formatBytes } from '../utils/formatters';

export default function CutControls({
  metadata,
  startTime,
  endTime,
  duration,
  onRangeChange,
  onCutSubmit,
  onCropSubmit,
  onBurnInSubmit,
  onSilenceJumpCutSubmit,
  onCompressSubmit,
  onSceneSplitSubmit,
  onStabilizeSubmit,
  onColorGradeSubmit,
  onRescaleSubmit,
  onNormalizeAudioSubmit,
  onOpenAudioMaster,
  onBoomerangSubmit,
  onSplitScreenSubmit,
  onLoadSegmentsToQueue,
  onGifSubmit,
  onAudioSubmit,
  onConcatSubmit,
  onColorGradeSettingsChange,
  videoId,
  segments = [],
  outputs = [],
  isProcessing,
  hardwareInfo,
  cropSettings,
  onCropSettingsChange,
  settings,
  layoutMode = 'side_by_side',
}) {
  const [activeTab, setActiveTab] = useState('cut'); // 'cut' | 'crop' | 'text' | 'silence' | 'compress' | 'scenes' | 'stabilize' | 'colorgrade' | 'boomerang' | 'gif' | 'audio' | 'merge'

  // Video Cut Options
  const [cutMode, setCutMode] = useState(settings?.engine?.defaultCutMode || 'fast');
  const [audioMode, setAudioMode] = useState('keep');
  const [speed, setSpeed] = useState(1.0);
  const [volumeGain, setVolumeGain] = useState(1.0);
  const [customName, setCustomName] = useState('');

  // Crop Options
  const [cropAspectRatio, setCropAspectRatio] = useState('9:16');
  const [bgBlur, setBgBlur] = useState(false);

  // Text & Timecode Burn-In Options
  const [burnText, setBurnText] = useState('');
  const [timecodeMode, setTimecodeMode] = useState('smpte'); // 'none' | 'smpte' | 'frame'
  const [overlayPos, setOverlayPos] = useState('bottom-right');
  const [fontSize, setFontSize] = useState(28);
  const [fontColor, setFontColor] = useState('white');
  const [bgBox, setBgBox] = useState(true);
  const [bgOpacity, setBgOpacity] = useState(0.6);

  // Silence Remover & Jump-Cut Options
  const [noiseDb, setNoiseDb] = useState(-30);
  const [minSilenceDuration, setMinSilenceDuration] = useState(0.5);
  const [padding, setPadding] = useState(0.05);
  const [isAnalyzingSilence, setIsAnalyzingSilence] = useState(false);
  const [silenceAnalysisResult, setSilenceAnalysisResult] = useState(null);

  // Target Size Compressor & Codec Matrix Options
  const [targetSizeMb, setTargetSizeMb] = useState(8);
  const [compressContainer, setCompressContainer] = useState('mp4');
  const [compressCodec, setCompressCodec] = useState('h264');

  // Scene Detection & Splitter Options
  const [sceneThreshold, setSceneThreshold] = useState(0.4);
  const [minSceneDuration, setMinSceneDuration] = useState(0.5);
  const [isAnalyzingScenes, setIsAnalyzingScenes] = useState(false);
  const [sceneAnalysisResult, setSceneAnalysisResult] = useState(null);

  // Optical Video Stabilization Options
  const [shakiness, setShakiness] = useState(6);
  const [smoothing, setSmoothing] = useState(30);
  const [optZoom, setOptZoom] = useState(true);
  const [extraZoom, setExtraZoom] = useState(0);

  // Cinematic 3D LUT & Color Grading Options
  const [colorPreset, setColorPreset] = useState('none');
  const [colorBrightness, setColorBrightness] = useState(0.0);
  const [colorContrast, setColorContrast] = useState(1.0);
  const [colorSaturation, setColorSaturation] = useState(1.0);
  const [colorTemperature, setColorTemperature] = useState(0.0);
  const [colorVignette, setColorVignette] = useState(0.0);
  const [colorSharpness, setColorSharpness] = useState(0.0);

  // Sync Color Grade preview with parent
  useEffect(() => {
    if (onColorGradeSettingsChange) {
      if (activeTab === 'colorgrade') {
        onColorGradeSettingsChange({
          preset: colorPreset,
          brightness: colorBrightness,
          contrast: colorContrast,
          saturation: colorSaturation,
          temperature: colorTemperature,
          vignette: colorVignette,
        });
      } else {
        onColorGradeSettingsChange(null);
      }
    }
  }, [activeTab, colorPreset, colorBrightness, colorContrast, colorSaturation, colorTemperature, colorVignette, onColorGradeSettingsChange]);

  // Boomerang Loop & Split Screen Options
  const [boomerangSubTab, setBoomerangSubTab] = useState('boomerang'); // 'boomerang' | 'splitscreen'
  const [boomerangLoops, setBoomerangLoops] = useState(2);
  const [boomerangSpeed, setBoomerangSpeed] = useState(1.0);
  const [boomerangAudio, setBoomerangAudio] = useState(false);
  const [selectedProcessedFile, setSelectedProcessedFile] = useState(outputs[0]?.filename || '');
  const [splitLayout, setSplitLayout] = useState('side_by_side');
  const [labelLeft, setLabelLeft] = useState('ORIGINAL');
  const [labelRight, setLabelRight] = useState('PROCESSED');

  // Audio Studio & EBU R128 Normalizer Options
  const [audioSubTab, setAudioSubTab] = useState('extract'); // 'extract' | 'normalize'
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [audioBitrate, setAudioBitrate] = useState('192k');
  const [targetLufs, setTargetLufs] = useState(-14);
  const [truePeak, setTruePeak] = useState(-1.0);
  const [lra, setLra] = useState(11.0);
  const [asAudioOnly, setAsAudioOnly] = useState(false);
  const [isAnalyzingLoudness, setIsAnalyzingLoudness] = useState(false);
  const [loudnessMetrics, setLoudnessMetrics] = useState(null);

  // Resolution Rescaler & 4K Super-Resolution Options
  const [rescalePreset, setRescalePreset] = useState('4k_uhd');
  const [rescaleWidth, setRescaleWidth] = useState(3840);
  const [rescaleHeight, setRescaleHeight] = useState(2160);
  const [rescaleAlgorithm, setRescaleAlgorithm] = useState('lanczos'); // 'lanczos' | 'bicubic' | 'spline' | 'bilinear' | 'neighbor'
  const [rescaleFraming, setRescaleFraming] = useState('fit_pad'); // 'fit_pad' | 'fit_blur' | 'crop_fill' | 'stretch'
  const [rescaleSharpen, setRescaleSharpen] = useState(0.2); // 0.0 to 1.0
  const [rescaleCodec, setRescaleCodec] = useState('auto'); // 'auto' | 'h264' | 'hevc' | 'prores'
  const [rescaleQuality, setRescaleQuality] = useState('high'); // 'cinema_master' | 'high' | 'standard'

  const handleSelectRescalePreset = (presetId, w, h) => {
    setRescalePreset(presetId);
    if (presetId !== 'custom') {
      setRescaleWidth(w);
      setRescaleHeight(h);
    }
  };

  // GIF Options
  const [gifFps, setGifFps] = useState(15);
  const [gifWidth, setGifWidth] = useState(480);

  // Dynamic Available Tabs based on Settings
  const allTabs = [
    { id: 'cut', label: 'Cut', icon: Scissors, enabled: settings?.features?.cut ?? true },
    { id: 'crop', label: 'Crop', icon: Crop, enabled: settings?.features?.crop ?? true },
    { id: 'rescale', label: 'Rescale 4K', icon: Maximize2, enabled: settings?.features?.rescale ?? true },
    { id: 'text', label: 'Text/TC', icon: Type, enabled: settings?.features?.text ?? true },
    { id: 'silence', label: 'Silence AI', icon: MicOff, enabled: settings?.features?.silence ?? true },
    { id: 'compress', label: 'Compress', icon: Minimize2, enabled: settings?.features?.compress ?? true },
    { id: 'scenes', label: 'Scene AI', icon: Sparkles, enabled: settings?.features?.scenes ?? true },
    { id: 'stabilize', label: 'Stabilize', icon: Compass, enabled: settings?.features?.stabilize ?? true },
    { id: 'colorgrade', label: 'Color Grade', icon: Palette, enabled: settings?.features?.colorgrade ?? true },
    { id: 'boomerang', label: 'Boomerang', icon: Repeat, enabled: settings?.features?.boomerang ?? true },
    { id: 'gif', label: 'GIF', icon: Film, enabled: settings?.features?.gif ?? true },
    { id: 'audio', label: 'Audio', icon: Music, enabled: settings?.features?.audio ?? true },
    { id: 'merge', label: `Merge ${segments.length > 0 ? `(${segments.length})` : ''}`, icon: Layers, enabled: settings?.features?.merge ?? true },
  ];
  const availableTabs = allTabs.filter((t) => t.enabled);

  const timelineTools = availableTabs.filter((t) =>
    ['cut', 'crop', 'silence', 'scenes', 'stabilize', 'boomerang', 'merge'].includes(t.id)
  );
  const creativeTools = availableTabs.filter((t) =>
    ['rescale', 'colorgrade', 'text', 'compress', 'gif', 'audio'].includes(t.id)
  );

  // Auto-switch to first enabled tab if current activeTab is disabled
  React.useEffect(() => {
    if (!availableTabs.some((t) => t.id === activeTab) && availableTabs.length > 0) {
      setActiveTab(availableTabs[0].id);
    }
  }, [settings?.features]);

  const handleDetectSilence = async () => {
    if (!videoId) return;
    setIsAnalyzingSilence(true);
    try {
      const res = await fetch(`/mediapro/api/videos/${videoId}/silence/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noise_db: noiseDb,
          min_silence_duration: minSilenceDuration,
          padding,
        }),
      });
      if (!res.ok) throw new Error('Silence analysis failed');
      const data = await res.json();
      setSilenceAnalysisResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingSilence(false);
    }
  };

  const handleDetectScenes = async () => {
    if (!videoId) return;
    setIsAnalyzingScenes(true);
    try {
      const res = await fetch(`/mediapro/api/videos/${videoId}/scenes/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threshold: sceneThreshold,
          min_duration: minSceneDuration,
        }),
      });
      if (!res.ok) throw new Error('Scene detection scan failed');
      const data = await res.json();
      setSceneAnalysisResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingScenes(false);
    }
  };

  const handleMeasureLoudness = async () => {
    if (!videoId) return;
    setIsAnalyzingLoudness(true);
    try {
      const res = await fetch(`/mediapro/api/videos/${videoId}/loudness/measure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Loudness measurement failed');
      const data = await res.json();
      setLoudnessMetrics(data.metrics);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAnalyzingLoudness(false);
    }
  };

  const fps = metadata?.fps || 30;
  const cutDuration = Math.max(0, endTime - startTime);

  const handleExport = (e) => {
    e.preventDefault();
    if (activeTab === 'cut') {
      onCutSubmit({
        startTime,
        endTime,
        mode: cutMode,
        audio: audioMode,
        speed: parseFloat(speed),
        volumeGain: parseFloat(volumeGain),
        customName: customName.trim(),
      });
    } else if (activeTab === 'crop') {
      if (onCropSubmit) {
        onCropSubmit({
          startTime,
          endTime,
          aspect_ratio: cropAspectRatio,
          bg_blur: bgBlur,
          customName: customName.trim(),
        });
      }
    } else if (activeTab === 'text') {
      if (onBurnInSubmit) {
        onBurnInSubmit({
          startTime,
          endTime,
          text: burnText,
          timecode_mode: timecodeMode,
          position: overlayPos,
          font_size: fontSize,
          font_color: fontColor,
          bg_box: bgBox,
          bg_opacity: bgOpacity,
          customName: customName.trim(),
        });
      }
    } else if (activeTab === 'silence') {
      if (onSilenceJumpCutSubmit) {
        onSilenceJumpCutSubmit({
          noise_db: noiseDb,
          min_silence_duration: minSilenceDuration,
          padding,
          speech_intervals: silenceAnalysisResult?.speech_intervals,
          customName: customName.trim(),
        });
      }
    } else if (activeTab === 'compress') {
      if (onCompressSubmit) {
        onCompressSubmit({
          startTime,
          endTime,
          target_size_mb: parseFloat(targetSizeMb),
          container: compressContainer,
          vcodec: compressCodec,
          customName: customName.trim(),
        });
      }
    } else if (activeTab === 'scenes') {
      if (onSceneSplitSubmit) {
        onSceneSplitSubmit({
          threshold: sceneThreshold,
          min_duration: minSceneDuration,
          scenes: sceneAnalysisResult?.scenes,
          customName: customName.trim(),
        });
      }
    } else if (activeTab === 'stabilize') {
      if (onStabilizeSubmit) {
        onStabilizeSubmit({
          startTime,
          endTime,
          shakiness: parseInt(shakiness, 10),
          smoothing: parseInt(smoothing, 10),
          optzoom: optZoom ? 1 : 0,
          zoom: parseFloat(extraZoom),
          customName: customName.trim(),
        });
      }
    } else if (activeTab === 'colorgrade') {
      if (onColorGradeSubmit) {
        onColorGradeSubmit({
          startTime,
          endTime,
          preset: colorPreset,
          brightness: parseFloat(colorBrightness),
          contrast: parseFloat(colorContrast),
          saturation: parseFloat(colorSaturation),
          temperature: parseFloat(colorTemperature),
          vignette: parseFloat(colorVignette),
          sharpness: parseFloat(colorSharpness),
          customName: customName.trim(),
        });
      }
    } else if (activeTab === 'rescale') {
      if (onRescaleSubmit) {
        onRescaleSubmit({
          startTime,
          endTime,
          targetWidth: parseInt(rescaleWidth, 10),
          targetHeight: parseInt(rescaleHeight, 10),
          algorithm: rescaleAlgorithm,
          framingMode: rescaleFraming,
          sharpenStrength: parseFloat(rescaleSharpen),
          codec: rescaleCodec,
          qualityPreset: rescaleQuality,
          customName: customName.trim(),
        });
      }
    } else if (activeTab === 'boomerang') {
      if (boomerangSubTab === 'boomerang') {
        if (onBoomerangSubmit) {
          onBoomerangSubmit({
            startTime,
            endTime,
            loop_count: parseInt(boomerangLoops, 10),
            speed: parseFloat(boomerangSpeed),
            include_audio: boomerangAudio,
            customName: customName.trim(),
          });
        }
      } else {
        if (onSplitScreenSubmit) {
          onSplitScreenSubmit({
            processed_video_filename: selectedProcessedFile,
            start_time: startTime,
            duration: cutDuration,
            layout: splitLayout,
            label_left: labelLeft,
            label_right: labelRight,
            customName: customName.trim(),
          });
        }
      }
    } else if (activeTab === 'gif') {
      onGifSubmit({
        startTime,
        endTime,
        fps: gifFps,
        width: gifWidth,
        customName: customName.trim(),
      });
    } else if (activeTab === 'audio') {
      if (audioSubTab === 'normalize') {
        if (onNormalizeAudioSubmit) {
          onNormalizeAudioSubmit({
            startTime,
            endTime,
            target_i: parseFloat(targetLufs),
            true_peak: parseFloat(truePeak),
            lra: parseFloat(lra),
            as_audio_only: asAudioOnly,
            customName: customName.trim(),
          });
        }
      } else {
        onAudioSubmit({
          startTime,
          endTime,
          audio_format: audioFormat,
          bitrate: audioBitrate,
          customName: customName.trim(),
        });
      }
    } else if (activeTab === 'merge') {
      onConcatSubmit({
        segments,
        customName: customName.trim(),
      });
    }
  };

  return (
    <div
      className={
        layoutMode === 'stacked'
          ? 'grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch w-full'
          : 'flex flex-col gap-3.5 w-full'
      }
    >
      {/* CARD 1: Studio Tool Selection Matrix */}
      <div
        className={`bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-2xl p-4 shadow-sm dark:shadow-xl transition-colors flex flex-col justify-between space-y-3.5 ${
          layoutMode === 'stacked' ? 'lg:col-span-5' : ''
        }`}
      >
        {/* Card 1 Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-studio-800/80 pb-2.5">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-brand-500" />
            <h2 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight">
              Studio Tools Matrix
            </h2>
          </div>
          <button
            type="button"
            onClick={() => onRangeChange(0, duration)}
            className="flex items-center space-x-1 text-[11px] text-slate-500 hover:text-brand-500 dark:hover:text-white transition font-mono"
            title="Reset range to entire video"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Clip</span>
          </button>
        </div>

        {/* Group 1: Timeline & Smart AI Cutters */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Timeline & Smart AI Cutters
            </span>
            <span className="font-mono text-slate-400">
              {timelineTools.length} Tools
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
            {timelineTools.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-2.5 rounded-xl flex items-center space-x-2 transition text-left border ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-600 to-brand-500 text-white font-bold border-brand-400 shadow-md shadow-brand-500/20 scale-[1.02]'
                      : 'bg-slate-50 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-brand-500'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Group 2: Creative FX & Audio Mastering */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-studio-800/60">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Creative FX & Audio Mastering
            </span>
            <span className="font-mono text-slate-400">
              {creativeTools.length} Tools
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
            {creativeTools.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-2.5 rounded-xl flex items-center space-x-2 transition text-left border ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-600 to-brand-cyan text-white font-bold border-brand-cyan/60 shadow-md shadow-brand-cyan/20 scale-[1.02]'
                      : 'bg-slate-50 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-white' : 'text-brand-cyan'}`} />
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CARD 2: Active Tool Controls & Export Engine Panel */}
      <div
        className={`bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-2xl p-4 sm:p-5 shadow-sm dark:shadow-xl transition-colors flex flex-col justify-between space-y-4 ${
          layoutMode === 'stacked' ? 'lg:col-span-7' : 'flex-1'
        }`}
      >
        {/* Card 2 Header: Active Module Title & Cut Range Badge */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-studio-800/80 pb-3">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-cyan border border-brand-500/20">
              {availableTabs.find((t) => t.id === activeTab)?.icon &&
                React.createElement(availableTabs.find((t) => t.id === activeTab).icon, { className: 'w-4 h-4' })}
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                {availableTabs.find((t) => t.id === activeTab)?.label || 'Export'} Controls
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-1 text-[11px] font-mono bg-slate-100 dark:bg-studio-850 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-300">
            <span>Duration:</span>
            <span className="font-bold text-brand-600 dark:text-brand-cyan">{formatTimecode(cutDuration).split('.')[0]}</span>
          </div>
        </div>

        {/* Active Tab Body Controls */}
        <div className="space-y-4 flex-1">
          {/* Tab 1: Video Cut Options */}
          {activeTab === 'cut' && (
            <div className="space-y-3 animate-in fade-in duration-200">
              {/* Stream Copy vs Re-encode */}
              <div className="grid grid-cols-2 gap-2">
                <div
                  onClick={() => setCutMode('fast')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col space-y-1 ${
                    cutMode === 'fast'
                      ? 'bg-brand-500/10 border-brand-500 text-slate-900 dark:text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3 text-brand-500" /> Fast Cut
                    </span>
                    <span className="text-[9px] font-mono px-1 rounded bg-brand-cyan/20 text-brand-cyan">0s</span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">Stream copy (lossless instant)</p>
                </div>

                <div
                  onClick={() => setCutMode('accurate')}
                  className={`p-2.5 rounded-xl border cursor-pointer transition flex flex-col space-y-1 ${
                    cutMode === 'accurate'
                      ? 'bg-brand-500/10 border-brand-500 text-slate-900 dark:text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-500 dark:text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold flex items-center gap-1">
                      <Crosshair className="w-3 h-3 text-brand-rose" /> Accurate
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
                      {hardwareInfo?.is_gpu ? '🚀 NVENC' : '⚙️ CPU'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-tight">
                    {hardwareInfo?.is_gpu ? 'GPU accelerated' : 'Frame re-encode'}
                  </p>
                </div>
              </div>

              {/* Continuous Precision Speed & Audio Modifiers */}
              <div className="space-y-3 bg-slate-50 dark:bg-studio-850/60 border border-slate-200 dark:border-studio-800/80 p-3 rounded-xl">
                {/* Speed Multiplier */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-brand-cyan" /> Speed Multiplier:
                    </span>
                    <div className="flex items-center space-x-1.5 font-mono text-xs">
                      <span className="font-bold text-brand-600 dark:text-brand-cyan bg-brand-500/10 px-1.5 py-0.5 rounded border border-brand-500/20">
                        {parseFloat(speed).toFixed(2)}x
                      </span>
                      <span className="text-[9px] text-slate-400 font-sans">
                        {speed < 1.0 ? 'Slow-Mo' : speed > 1.0 ? 'Fast' : '1:1 Standard'}
                      </span>
                    </div>
                  </div>

                  {/* Continuous Precision Slider */}
                  <input
                    type="range"
                    min="0.10"
                    max="3.00"
                    step="0.05"
                    value={speed}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setSpeed(val);
                      if (val !== 1.0) setCutMode('accurate');
                    }}
                    className="w-full h-1.5 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />

                  {/* Quick Select Preset Chips */}
                  <div className="grid grid-cols-5 sm:grid-cols-9 gap-1 text-[9px] font-mono pt-1">
                    {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 2.5, 3.0].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setSpeed(s);
                          if (s !== 1.0) setCutMode('accurate');
                        }}
                        className={`py-1 rounded-md transition text-center ${
                          Math.abs(speed - s) < 0.01
                            ? 'bg-brand-600 text-white font-bold shadow-sm'
                            : 'bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Audio Track */}
                <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-studio-800">
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Volume2 className="w-3.5 h-3.5 text-brand-cyan" /> Audio Track:
                  </span>
                  <div className="flex items-center bg-slate-200/80 dark:bg-studio-800 rounded-lg p-0.5 border border-slate-300 dark:border-studio-700 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setAudioMode('keep')}
                      className={`flex-1 py-1 rounded transition ${
                        audioMode === 'keep' ? 'bg-brand-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      Keep Audio {speed !== 1.0 && '• Pitch Preserved'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setAudioMode('mute'); setCutMode('accurate'); }}
                      className={`flex-1 py-1 rounded transition flex items-center justify-center gap-1 ${
                        audioMode === 'mute' ? 'bg-brand-rose text-white font-bold' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <VolumeX className="w-2.5 h-2.5" /> Mute Track
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

      {/* Tab 2: Crop & Social Aspect Ratio */}
      {activeTab === 'crop' && (
        <div className="space-y-3 animate-in fade-in duration-200 bg-slate-50 dark:bg-studio-850/60 border border-slate-200 dark:border-studio-800 p-3 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Crop className="w-3.5 h-3.5 text-brand-cyan" /> Social Aspect Ratios
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
              {hardwareInfo?.is_gpu ? '🚀 NVENC' : '⚙️ CPU'}
            </span>
          </div>

          {/* Aspect Ratio Grid */}
          <div className="grid grid-cols-2 gap-1.5 text-xs font-medium">
            {[
              { id: '9:16', label: '9:16 Shorts / TikTok', icon: Smartphone, desc: '1080x1920' },
              { id: '1:1', label: '1:1 Square (Feed)', icon: Square, desc: '1080x1080' },
              { id: '16:9', label: '16:9 Landscape (YT)', icon: Tv, desc: '1920x1080' },
              { id: '4:5', label: '4:5 Portrait', icon: ImageIcon, desc: '1080x1350' },
            ].map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setCropAspectRatio(preset.id)}
                  className={`p-2 rounded-lg border text-left flex items-start gap-2 transition ${
                    cropAspectRatio === preset.id
                      ? 'bg-brand-500/10 border-brand-500 text-slate-900 dark:text-white shadow-sm'
                      : 'bg-white dark:bg-studio-900 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${cropAspectRatio === preset.id ? 'text-brand-cyan' : 'text-slate-400'}`} />
                  <div>
                    <span className="text-[11px] font-bold block leading-tight">{preset.id}</span>
                    <span className="text-[9px] text-slate-500 block leading-tight">{preset.desc}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Blurred Background Toggle */}
          <div
            onClick={() => setBgBlur(!bgBlur)}
            className={`p-2.5 rounded-xl border cursor-pointer transition flex items-center justify-between ${
              bgBlur
                ? 'bg-brand-500/15 border-brand-500 text-slate-900 dark:text-white shadow-sm'
                : 'bg-white dark:bg-studio-900 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center gap-1 text-[11px] font-bold">
                <Sparkles className={`w-3 h-3 ${bgBlur ? 'text-brand-cyan' : 'text-slate-400'}`} />
                <span>✨ Dynamic Blurred Background</span>
              </div>
              <p className="text-[9px] text-slate-500 leading-tight">
                Fills canvas with blurred video instead of black bars
              </p>
            </div>
            <div
              className={`w-8 h-4 rounded-full transition-colors relative p-0.5 ${
                bgBlur ? 'bg-brand-500' : 'bg-slate-300 dark:bg-studio-700'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full bg-white transition-transform ${
                  bgBlur ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Text, Watermark & Timecode Burn-In */}
      {activeTab === 'text' && (
        <div className="space-y-3 animate-in fade-in duration-200 bg-slate-50 dark:bg-studio-850/60 border border-slate-200 dark:border-studio-800 p-3 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Type className="w-3.5 h-3.5 text-brand-cyan" /> Burn-In Overlay
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand-rose/20 text-rose-600 dark:text-brand-rose font-bold">
              {hardwareInfo?.is_gpu ? '🚀 NVENC' : '⚙️ CPU'}
            </span>
          </div>

          {/* Quick Watermark Presets */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-semibold block">Quick Watermark Presets:</span>
            <div className="flex flex-wrap gap-1 text-[9px] font-mono font-semibold">
              {['CONFIDENTIAL', 'DRAFT REVIEW', 'FOR REVIEW ONLY', '© COPYRIGHT'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setBurnText(preset)}
                  className={`px-1.5 py-0.5 rounded border transition ${
                    burnText === preset
                      ? 'bg-brand-600 text-white border-brand-600'
                      : 'bg-white dark:bg-studio-900 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Text Input */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-semibold block">Overlay Text / Title:</span>
            <input
              type="text"
              value={burnText}
              onChange={(e) => setBurnText(e.target.value)}
              placeholder="e.g. Director Cut / Watermark / @YourHandle"
              className="w-full bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 focus:border-brand-500 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition font-sans"
            />
          </div>

          {/* Timecode Mode */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-semibold block">Timecode Generator:</span>
            <div className="flex bg-slate-200/80 dark:bg-studio-800 rounded-lg p-0.5 text-[10px] font-mono">
              {[
                { id: 'none', label: 'None' },
                { id: 'smpte', label: '⏱️ SMPTE (00:00:00)' },
                { id: 'frame', label: '🔢 Frame #' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTimecodeMode(m.id)}
                  className={`flex-1 py-1 rounded transition ${
                    timecodeMode === m.id
                      ? 'bg-brand-600 text-white font-bold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* 6-Position Grid */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
              <span>Position:</span>
              <span className="font-mono text-brand-600 dark:text-brand-cyan uppercase">{overlayPos}</span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[9px] font-mono text-center">
              {[
                { id: 'top-left', label: 'Top-L' },
                { id: 'top-center', label: 'Top-C' },
                { id: 'top-right', label: 'Top-R' },
                { id: 'bottom-left', label: 'Bot-L' },
                { id: 'center', label: 'Center' },
                { id: 'bottom-right', label: 'Bot-R' },
              ].map((pos) => (
                <button
                  key={pos.id}
                  type="button"
                  onClick={() => setOverlayPos(pos.id)}
                  className={`py-1 rounded border transition ${
                    overlayPos === pos.id
                      ? 'bg-brand-600 text-white font-bold border-brand-500 shadow-sm'
                      : 'bg-white dark:bg-studio-900 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>

          {/* Styling: Size, Color & Box */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-studio-800 text-xs">
            {/* Font Size Slider */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>Font Size:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{fontSize}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="64"
                step="2"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Font Color Swatches */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 block">Color:</span>
              <div className="flex items-center space-x-1.5">
                {[
                  { id: 'white', bg: 'bg-white border-slate-400' },
                  { id: 'yellow', bg: 'bg-yellow-400 border-yellow-500' },
                  { id: 'cyan', bg: 'bg-cyan-400 border-cyan-500' },
                  { id: 'red', bg: 'bg-rose-500 border-rose-600' },
                  { id: 'green', bg: 'bg-emerald-400 border-emerald-500' },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setFontColor(c.id)}
                    className={`w-4 h-4 rounded-full border-2 transition transform ${c.bg} ${
                      fontColor === c.id ? 'scale-110 ring-2 ring-brand-500 ring-offset-1' : 'opacity-80'
                    }`}
                    title={c.id}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Background Box Opacity */}
          <div className="flex items-center justify-between pt-1 text-xs">
            <label className="flex items-center space-x-1.5 cursor-pointer text-[11px] text-slate-700 dark:text-slate-300">
              <input
                type="checkbox"
                checked={bgBox}
                onChange={(e) => setBgBox(e.target.checked)}
                className="rounded accent-brand-500"
              />
              <span>Backing Box ({Math.round(bgOpacity * 100)}%)</span>
            </label>
            {bgBox && (
              <input
                type="range"
                min="0.2"
                max="1.0"
                step="0.1"
                value={bgOpacity}
                onChange={(e) => setBgOpacity(parseFloat(e.target.value))}
                className="w-24 h-1 bg-slate-200 dark:bg-studio-800 rounded appearance-none cursor-pointer accent-brand-500"
              />
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Silence & Dead-Air Auto-Remover */}
      {activeTab === 'silence' && (
        <div className="space-y-3 animate-in fade-in duration-200 bg-slate-50 dark:bg-studio-850/60 border border-slate-200 dark:border-studio-800 p-3 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <MicOff className="w-3.5 h-3.5 text-brand-cyan" /> Silence Slicer (Jump Cut)
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand-rose/20 text-rose-600 dark:text-brand-rose font-bold">
              {hardwareInfo?.is_gpu ? '🚀 NVENC' : '⚙️ CPU'}
            </span>
          </div>

          {/* Noise Sensitivity Presets */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
              <span>Noise Threshold:</span>
              <span className="font-mono text-brand-600 dark:text-brand-cyan">{noiseDb} dB</span>
            </div>
            <div className="flex bg-slate-200/80 dark:bg-studio-800 rounded-lg p-0.5 text-[10px] font-mono">
              {[
                { db: -25, label: 'Gentle (-25dB)' },
                { db: -30, label: 'Normal (-30dB)' },
                { db: -38, label: 'Aggressive (-38dB)' },
              ].map((lvl) => (
                <button
                  key={lvl.db}
                  type="button"
                  onClick={() => setNoiseDb(lvl.db)}
                  className={`flex-1 py-1 rounded transition ${
                    noiseDb === lvl.db
                      ? 'bg-brand-600 text-white font-bold shadow-sm'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Min Silence Duration & Padding */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold block">Min Pause:</span>
              <div className="flex bg-slate-200/80 dark:bg-studio-800 rounded-lg p-0.5 text-[9px] font-mono">
                {[0.3, 0.5, 0.8, 1.2].map((dur) => (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => setMinSilenceDuration(dur)}
                    className={`flex-1 py-0.5 rounded ${
                      minSilenceDuration === dur ? 'bg-brand-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {dur}s
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                <span>Padding:</span>
                <span className="font-mono">{Math.round(padding * 1000)}ms</span>
              </div>
              <input
                type="range"
                min="0.02"
                max="0.15"
                step="0.01"
                value={padding}
                onChange={(e) => setPadding(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded appearance-none cursor-pointer accent-brand-500 mt-1"
              />
            </div>
          </div>

          {/* Scan & Analyze Button */}
          <button
            type="button"
            onClick={handleDetectSilence}
            disabled={isAnalyzingSilence || isProcessing}
            className="w-full py-1.5 rounded-lg border border-brand-500/40 bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-cyan text-xs font-bold flex items-center justify-center space-x-1.5 transition"
          >
            <Wand2 className={`w-3.5 h-3.5 ${isAnalyzingSilence ? 'animate-spin' : ''}`} />
            <span>{isAnalyzingSilence ? 'Scanning Audio Track...' : '🔍 Scan & Detect Dead-Air'}</span>
          </button>

          {/* Analysis Report & Timeline Queue Button */}
          {silenceAnalysisResult && (
            <div className="space-y-2 bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-lg p-2.5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  ✨ {silenceAnalysisResult.silence_count} Pauses Detected
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                  -{silenceAnalysisResult.silence_duration}s ({silenceAnalysisResult.percent_saved}% faster)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono bg-slate-50 dark:bg-studio-950 p-1.5 rounded border border-slate-100 dark:border-studio-850">
                <div>Original: <span className="font-bold text-slate-700 dark:text-slate-200">{formatTimecode(silenceAnalysisResult.original_duration).split('.')[0]}</span></div>
                <div>Tightened: <span className="font-bold text-brand-500">{formatTimecode(silenceAnalysisResult.tightened_duration).split('.')[0]}</span></div>
              </div>

              {/* Action: Send to Timeline Queue */}
              {onLoadSegmentsToQueue && (
                <button
                  type="button"
                  onClick={() => onLoadSegmentsToQueue(silenceAnalysisResult.speech_intervals)}
                  className="w-full py-1.5 rounded bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold flex items-center justify-center space-x-1 transition border border-slate-200 dark:border-studio-700"
                >
                  <Layers className="w-3 h-3 text-brand-cyan" />
                  <span>Send {silenceAnalysisResult.speech_intervals.length} Speech Clips to Timeline Queue</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Target File Size Compressor & Codec Matrix */}
      {activeTab === 'compress' && (
        <div className="space-y-3 animate-in fade-in duration-200 bg-slate-50 dark:bg-studio-850/60 border border-slate-200 dark:border-studio-800 p-3 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Minimize2 className="w-3.5 h-3.5 text-brand-cyan" /> Target Size Compressor
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand-rose/20 text-rose-600 dark:text-brand-rose font-bold">
              {compressCodec === 'vp9' || compressCodec === 'prores' ? '⚙️ CPU' : (hardwareInfo?.is_gpu ? '🚀 NVENC' : '⚙️ CPU')}
            </span>
          </div>

          {/* Quick Target Size Presets */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-semibold block">Target File Limit:</span>
            <div className="grid grid-cols-4 gap-1 text-[9px] font-mono font-semibold">
              {[
                { mb: 8, label: '8 MB', hint: 'Discord' },
                { mb: 25, label: '25 MB', hint: 'Email' },
                { mb: 50, label: '50 MB', hint: 'Telegram' },
                { mb: 100, label: '100 MB', hint: 'Web' },
              ].map((preset) => (
                <button
                  key={preset.mb}
                  type="button"
                  onClick={() => setTargetSizeMb(preset.mb)}
                  className={`p-1.5 rounded border text-center transition ${
                    targetSizeMb === preset.mb
                      ? 'bg-brand-600 text-white font-bold border-brand-500 shadow-sm'
                      : 'bg-white dark:bg-studio-900 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <span className="block">{preset.label}</span>
                  <span className={`text-[8px] block ${targetSizeMb === preset.mb ? 'text-white/80' : 'text-slate-400'}`}>
                    {preset.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Size Input */}
          <div className="flex items-center space-x-2 bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-lg px-2.5 py-1 text-xs">
            <span className="text-[10px] text-slate-500 font-semibold whitespace-nowrap">Custom Size:</span>
            <input
              type="number"
              min="0.5"
              max="2000"
              step="0.5"
              value={targetSizeMb}
              onChange={(e) => setTargetSizeMb(Math.max(0.1, parseFloat(e.target.value) || 1))}
              className="w-full bg-transparent font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none text-right"
            />
            <span className="text-[10px] font-mono text-slate-500">MB</span>
          </div>

          {/* Container & Codec Matrix */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {/* Container Format */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold block">Container:</span>
              <div className="flex bg-slate-200/80 dark:bg-studio-800 rounded-lg p-0.5 text-[9px] font-mono uppercase">
                {['mp4', 'webm', 'mkv', 'mov'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setCompressContainer(c);
                      if (c === 'webm') setCompressCodec('vp9');
                      if (c === 'mov' && compressCodec === 'vp9') setCompressCodec('h264');
                    }}
                    className={`flex-1 py-1 rounded transition ${
                      compressContainer === c
                        ? 'bg-brand-600 text-white font-bold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Video Codec */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-semibold block">Video Codec:</span>
              <select
                value={compressCodec}
                onChange={(e) => setCompressCodec(e.target.value)}
                className="w-full bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-lg px-2 py-1 text-[10px] font-mono text-slate-900 dark:text-slate-100 focus:outline-none"
              >
                <option value="h264">H.264 (Universal NVENC)</option>
                <option value="hevc">H.265 / HEVC (High Efficiency)</option>
                <option value="vp9">VP9 (Open WebM)</option>
                <option value="prores">Apple ProRes (Editing)</option>
              </select>
            </div>
          </div>

          {/* Live Bitrate Calculation HUD */}
          <div className="bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-lg p-2 text-[10px] font-mono space-y-1">
            <div className="flex items-center justify-between text-slate-500">
              <span>Segment Duration:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">{cutDuration.toFixed(1)}s</span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Calculated Video Bitrate:</span>
              <span className="font-bold text-brand-600 dark:text-brand-cyan">
                {cutDuration > 0
                  ? `${Math.max(50, Math.round(((targetSizeMb * 8 * 1024 * 1024 * 0.95) / cutDuration - 128000) / 1000))} kbps`
                  : '0 kbps'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span>Audio Bitrate:</span>
              <span className="font-bold text-slate-700 dark:text-slate-300">128 kbps (AAC/Opus)</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Scene AI (Auto Scene Detection & Splitter) */}
      {activeTab === 'scenes' && (
        <div className="space-y-3 animate-in fade-in duration-200 bg-slate-50 dark:bg-studio-850/60 border border-slate-200 dark:border-studio-800 p-3 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-cyan" /> Smart Scene Splitter
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan font-bold">
              AI Vision
            </span>
          </div>

          {/* Sensitivity Presets */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-semibold block">Cut Sensitivity:</span>
            <div className="grid grid-cols-4 gap-1 text-[9px] font-mono">
              {[
                { val: 0.3, label: '0.3', hint: 'Sensitive' },
                { val: 0.4, label: '0.4', hint: 'Balanced' },
                { val: 0.5, label: '0.5', hint: 'Strict' },
                { val: 0.6, label: '0.6', hint: 'Major' },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => setSceneThreshold(p.val)}
                  className={`p-1.5 rounded border text-center transition ${
                    sceneThreshold === p.val
                      ? 'bg-brand-600 text-white font-bold border-brand-500 shadow-sm'
                      : 'bg-white dark:bg-studio-900 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <span className="block">{p.label}</span>
                  <span className={`text-[8px] block ${sceneThreshold === p.val ? 'text-white/80' : 'text-slate-400'}`}>
                    {p.hint}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Min Duration */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-semibold block">Min Scene Duration:</span>
            <div className="flex bg-slate-200/80 dark:bg-studio-800 rounded-lg p-0.5 text-[10px] font-mono">
              {[0.5, 1.0, 2.0].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setMinSceneDuration(d)}
                  className={`flex-1 py-0.5 rounded ${
                    minSceneDuration === d ? 'bg-brand-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {d}s
                </button>
              ))}
            </div>
          </div>

          {/* Scan Action Button */}
          <button
            type="button"
            onClick={handleDetectScenes}
            disabled={isAnalyzingScenes}
            className="w-full py-2 rounded-xl bg-slate-900 dark:bg-studio-800 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition shadow-sm border border-slate-700/50"
          >
            {isAnalyzingScenes ? (
              <>
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                <span>Scanning Video Transitions...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
                <span>Scan Video For Scenes</span>
              </>
            )}
          </button>

          {/* Scan Results Card */}
          {sceneAnalysisResult && (
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <span>🎬 {sceneAnalysisResult.scene_count} Scenes Detected</span>
                <span className="text-[10px] font-mono text-slate-500">{sceneAnalysisResult.total_duration}s total</span>
              </div>

              {/* Scene list */}
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {sceneAnalysisResult.scenes.map((sc, idx) => (
                  <div
                    key={sc.id || idx}
                    onClick={() => onRangeChange && onRangeChange(sc.start_time, sc.end_time)}
                    className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 text-[10px] font-mono cursor-pointer hover:border-brand-500 hover:bg-brand-50/20 transition"
                  >
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      Scene #{idx + 1}: {formatTimecode(sc.start_time).split('.')[0]} → {formatTimecode(sc.end_time).split('.')[0]}
                    </span>
                    <span className="text-slate-500">({sc.duration.toFixed(1)}s)</span>
                  </div>
                ))}
              </div>

              {/* Action: Send to Timeline Queue */}
              {onLoadSegmentsToQueue && (
                <button
                  type="button"
                  onClick={() => onLoadSegmentsToQueue(sceneAnalysisResult.scenes)}
                  className="w-full py-1.5 rounded bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold flex items-center justify-center space-x-1 transition border border-slate-200 dark:border-studio-700"
                >
                  <Layers className="w-3 h-3 text-brand-cyan" />
                  <span>Send {sceneAnalysisResult.scene_count} Scenes to Timeline Queue</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 7: 2-Pass Optical Video Stabilization */}
      {activeTab === 'stabilize' && (
        <div className="space-y-3 animate-in fade-in duration-200 bg-slate-50 dark:bg-studio-850/60 border border-slate-200 dark:border-studio-800 p-3 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Compass className="w-3.5 h-3.5 text-brand-cyan" /> Optical Video Stabilizer
            </span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-brand-cyan/20 text-brand-cyan font-bold">
              {hardwareInfo?.is_gpu ? '🚀 NVENC 2-Pass' : '⚙️ CPU 2-Pass'}
            </span>
          </div>

          {/* Stabilization Presets */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-semibold block">Stabilization Profile:</span>
            <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
              {[
                { name: 'Tripod (Rock Steady)', shake: 8, smooth: 50 },
                { name: 'Handheld (Standard)', shake: 6, smooth: 30 },
                { name: 'Subtle (Gentle Float)', shake: 4, smooth: 15 },
                { name: 'Action Cam (Extreme)', shake: 10, smooth: 40 },
              ].map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setShakiness(preset.shake);
                    setSmoothing(preset.smooth);
                  }}
                  className={`p-1.5 rounded border text-left transition ${
                    shakiness === preset.shake && smoothing === preset.smooth
                      ? 'bg-brand-600 text-white font-bold border-brand-500 shadow-sm'
                      : 'bg-white dark:bg-studio-900 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-sans font-semibold text-[10px]">{preset.name}</span>
                  <span className={`text-[8px] block ${shakiness === preset.shake && smoothing === preset.smooth ? 'text-white/80' : 'text-slate-400'}`}>
                    Shake: {preset.shake} · Smooth: {preset.smooth}f
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Detailed Tuning Sliders */}
          <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-studio-800">
            {/* Shakiness */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500 font-semibold">Motion Shakiness:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{shakiness}/10</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={shakiness}
                onChange={(e) => setShakiness(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Smoothing */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500 font-semibold">Smoothing Window:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{smoothing} frames</span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                step="5"
                value={smoothing}
                onChange={(e) => setSmoothing(parseInt(e.target.value, 10))}
                className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Auto Optimal Zoom */}
            <div className="flex items-center justify-between pt-1">
              <div>
                <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block">Auto Optimal Zoom</span>
                <span className="text-[8px] text-slate-400 block">Dynamically scale frame to hide black edge artifacts</span>
              </div>
              <input
                type="checkbox"
                checked={optZoom}
                onChange={(e) => setOptZoom(e.target.checked)}
                className="w-4 h-4 rounded text-brand-600 focus:ring-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 8: Cinematic 3D LUT & Color Grading Studio */}
      {activeTab === 'colorgrade' && (
        <div className="space-y-3 animate-in fade-in duration-200 bg-slate-50 dark:bg-studio-850/60 border border-slate-200 dark:border-studio-800 p-3 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Palette className="w-3 h-3 text-brand-cyan" /> Cinematic LUT & Color Grading
            </span>
            <button
              type="button"
              onClick={() => {
                setColorPreset('none');
                setColorBrightness(0.0);
                setColorContrast(1.0);
                setColorSaturation(1.0);
                setColorTemperature(0.0);
                setColorVignette(0.0);
                setColorSharpness(0.0);
              }}
              className="text-[10px] text-slate-500 hover:text-brand-500 flex items-center gap-1 font-mono transition"
            >
              <RotateCcw className="w-2.5 h-2.5" /> Reset
            </button>
          </div>

          {/* Cinematic Preset Swatches */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-semibold block">Cinematic Looks & LUTs:</span>
            <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
              {[
                { id: 'none', label: 'Natural / Clean', grad: 'from-slate-500 to-slate-700', desc: 'True to source' },
                { id: 'teal_orange', label: 'Teal & Orange', grad: 'from-cyan-500 to-orange-500', desc: 'Hollywood action' },
                { id: 'vintage_film', label: 'Vintage 35mm', grad: 'from-amber-600 to-yellow-800', desc: 'Warm retro stock' },
                { id: 'cyberpunk', label: 'Cyberpunk Neon', grad: 'from-pink-500 to-cyan-400', desc: 'Vibrant night pop' },
                { id: 'golden_hour', label: 'Golden Hour', grad: 'from-amber-400 to-orange-600', desc: 'Sunset amber glow' },
                { id: 'noir_bw', label: 'Film Noir B&W', grad: 'from-zinc-900 to-zinc-500', desc: 'Dramatic monochrome' },
                { id: 'crisp_clean', label: 'Commercial Crisp', grad: 'from-blue-500 to-emerald-400', desc: 'Punchy clarity' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setColorPreset(p.id)}
                  className={`p-1.5 rounded-lg border text-left flex items-center space-x-2 transition ${
                    colorPreset === p.id
                      ? 'bg-brand-600 text-white font-bold border-brand-500 shadow-sm'
                      : 'bg-white dark:bg-studio-900 border-slate-200 dark:border-studio-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full bg-gradient-to-tr ${p.grad} shadow-sm shrink-0 border border-white/20`} />
                  <div className="min-w-0">
                    <span className="block font-sans font-semibold text-[10px] truncate">{p.label}</span>
                    <span className={`text-[8px] block truncate ${colorPreset === p.id ? 'text-white/80' : 'text-slate-400'}`}>
                      {p.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Parametric Adjustment Sliders */}
          <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-studio-800">
            {/* Contrast */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500 font-semibold">Contrast:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {Math.round(colorContrast * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.8"
                step="0.05"
                value={colorContrast}
                onChange={(e) => setColorContrast(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Saturation */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500 font-semibold">Saturation:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {Math.round(colorSaturation * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="2.5"
                step="0.05"
                value={colorSaturation}
                onChange={(e) => setColorSaturation(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Brightness */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500 font-semibold">Brightness / Exposure:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {colorBrightness > 0 ? `+${Math.round(colorBrightness * 100)}%` : `${Math.round(colorBrightness * 100)}%`}
                </span>
              </div>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.05"
                value={colorBrightness}
                onChange={(e) => setColorBrightness(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Temperature (Cool <-> Warm) */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500 font-semibold">Color Temperature:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {colorTemperature > 0 ? `+${Math.round(colorTemperature * 100)} Warm` : colorTemperature < 0 ? `${Math.round(colorTemperature * 100)} Cool` : 'Neutral'}
                </span>
              </div>
              <input
                type="range"
                min="-1.0"
                max="1.0"
                step="0.1"
                value={colorTemperature}
                onChange={(e) => setColorTemperature(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Vignette */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500 font-semibold">Vignette (Corner Falloff):</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {Math.round(colorVignette * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={colorVignette}
                onChange={(e) => setColorVignette(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>

            {/* Sharpness */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-slate-500 font-semibold">Edge Sharpness / Detail:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {Math.round(colorSharpness * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.5"
                step="0.1"
                value={colorSharpness}
                onChange={(e) => setColorSharpness(parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab: GPU Video Super-Resolution & Resolution Transcoder */}
      {activeTab === 'rescale' && (
        <div className="space-y-3 animate-in fade-in duration-200 bg-slate-50 dark:bg-studio-850/60 border border-slate-200 dark:border-studio-800 p-3.5 rounded-xl">
          {/* Header & Scale Multiplier HUD */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5">
              <Maximize2 className="w-4 h-4 text-brand-cyan" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Super-Resolution Scaler
              </span>
            </div>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
              {hardwareInfo?.is_gpu ? '🚀 CUDA / NVENC' : '⚙️ CPU'}
            </span>
          </div>

          {/* Dynamic Resolution Multiplier Card */}
          {metadata && (
            <div className="p-2 rounded-lg bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 text-[11px] font-mono flex items-center justify-between shadow-inner">
              <div>
                <span className="text-slate-400 block text-[9px]">SOURCE RESOLUTION</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">{metadata.width} × {metadata.height}</span>
              </div>
              <div className="text-center px-2">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  (rescaleWidth * rescaleHeight) > (metadata.width * metadata.height)
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : (rescaleWidth * rescaleHeight) < (metadata.width * metadata.height)
                    ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                    : 'bg-brand-500/20 text-brand-cyan border border-brand-500/30'
                }`}>
                  {((rescaleWidth * rescaleHeight) / (metadata.width * metadata.height)).toFixed(2)}× {
                    (rescaleWidth * rescaleHeight) > (metadata.width * metadata.height) ? 'Upscale' : (rescaleWidth * rescaleHeight) < (metadata.width * metadata.height) ? 'Downscale' : 'Same Res'
                  }
                </span>
              </div>
              <div className="text-right">
                <span className="text-brand-cyan block text-[9px]">TARGET RESOLUTION</span>
                <span className="font-bold text-brand-600 dark:text-brand-cyan">{rescaleWidth} × {rescaleHeight}</span>
              </div>
            </div>
          )}

          {/* Section: Resolution Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold">
              <span>Standard Presets:</span>
              <span className="font-mono text-[9px] text-brand-500">16:9 Landscape / 9:16 Vertical / 1:1</span>
            </div>

            <div className="grid grid-cols-3 gap-1 text-[9px] font-mono">
              {[
                { id: '8k_uhd', label: '8K UHD Master', w: 7680, h: 4320, badge: 'Ultra' },
                { id: '4k_uhd', label: '4K UHD Cinema', w: 3840, h: 2160, badge: '4K' },
                { id: '1440p_2k', label: '2K / 1440p QHD', w: 2560, h: 1440, badge: '2K' },
                { id: '1080p_fhd', label: '1080p Full HD', w: 1920, h: 1080, badge: 'FHD' },
                { id: '720p_hd', label: '720p HD', w: 1280, h: 720, badge: 'HD' },
                { id: '480p_sd', label: '480p SD', w: 854, h: 480, badge: 'SD' },
                { id: '4k_vert', label: '4K Vertical', w: 2160, h: 3840, badge: '9:16' },
                { id: '1080p_vert', label: '1080p TikTok', w: 1080, h: 1920, badge: '9:16' },
                { id: 'square_4k', label: 'Square 4K', w: 2160, h: 2160, badge: '1:1' },
                { id: 'square_1080', label: 'Square 1080', w: 1080, h: 1080, badge: '1:1' },
                { id: 'insta_4_5', label: 'Insta Portrait', w: 1080, h: 1350, badge: '4:5' },
                { id: 'custom', label: 'Custom Res', w: rescaleWidth, h: rescaleHeight, badge: 'Custom' },
              ].map((p) => {
                const isSelected = rescalePreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectRescalePreset(p.id, p.w, p.h)}
                    className={`p-1.5 rounded-lg border text-left transition flex flex-col justify-between ${
                      isSelected
                        ? 'bg-brand-600 text-white font-bold border-brand-500 shadow-sm'
                        : 'bg-white dark:bg-studio-900 border-slate-200 dark:border-studio-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-sans font-semibold text-[9px] truncate">{p.label}</span>
                      <span className={`text-[7px] px-1 rounded ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-studio-800 text-slate-400'}`}>
                        {p.badge}
                      </span>
                    </div>
                    <span className={`text-[8px] font-mono mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                      {p.id === 'custom' ? `${rescaleWidth}×${rescaleHeight}` : `${p.w}×${p.h}`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Dimension Inputs (When Custom Selected or Customizing) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="space-y-0.5">
              <span className="text-[9px] text-slate-500 font-semibold block">Width (px):</span>
              <input
                type="number"
                step="2"
                min="16"
                max="8192"
                value={rescaleWidth}
                onChange={(e) => {
                  setRescalePreset('custom');
                  setRescaleWidth(Math.max(16, parseInt(e.target.value, 10) || 16));
                }}
                className="w-full bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="space-y-0.5">
              <span className="text-[9px] text-slate-500 font-semibold block">Height (px):</span>
              <input
                type="number"
                step="2"
                min="16"
                max="8192"
                value={rescaleHeight}
                onChange={(e) => {
                  setRescalePreset('custom');
                  setRescaleHeight(Math.max(16, parseInt(e.target.value, 10) || 16));
                }}
                className="w-full bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Resampling Filter Algorithm */}
          <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-studio-800">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500 font-semibold">Resampling Algorithm:</span>
              <span className="font-mono text-[9px] text-brand-cyan">
                {rescaleAlgorithm === 'lanczos' ? '3-Lobe Sinc (Sharpest 4K)' : rescaleAlgorithm}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 text-[9px] font-mono">
              {[
                { id: 'lanczos', name: 'Lanczos', desc: 'Sharpest 4K/8K' },
                { id: 'bicubic', name: 'Bicubic', desc: 'Smooth & Crisp' },
                { id: 'spline', name: 'Spline', desc: 'Natural Gradation' },
                { id: 'bilinear', name: 'Bilinear', desc: 'Fast Downscale' },
                { id: 'neighbor', name: 'Nearest', desc: 'Pixel-Art/Retro' },
              ].map((algo) => (
                <button
                  key={algo.id}
                  type="button"
                  onClick={() => setRescaleAlgorithm(algo.id)}
                  className={`p-1.5 rounded-lg border text-left transition ${
                    rescaleAlgorithm === algo.id
                      ? 'bg-brand-600 text-white font-bold border-brand-500 shadow-sm'
                      : 'bg-white dark:bg-studio-900 border-slate-200 dark:border-studio-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-sans font-semibold text-[10px]">{algo.name}</span>
                  <span className={`text-[7.5px] block ${rescaleAlgorithm === algo.id ? 'text-white/80' : 'text-slate-400'}`}>
                    {algo.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Framing / Canvas Mode */}
          <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-studio-800">
            <span className="text-[10px] text-slate-500 font-semibold block">Aspect Ratio Framing:</span>
            <div className="grid grid-cols-2 gap-1.5 text-[9px] font-mono">
              {[
                { id: 'fit_pad', name: 'Pillarbox / Letterbox', desc: 'Preserve frame with black borders' },
                { id: 'fit_blur', name: '✨ Blurred Canvas', desc: 'Dynamic blurred backdrop' },
                { id: 'crop_fill', name: 'Center Crop to Fill', desc: 'Fills screen without borders' },
                { id: 'stretch', name: 'Direct Stretch', desc: 'Forces exact dimensions' },
              ].map((fm) => (
                <button
                  key={fm.id}
                  type="button"
                  onClick={() => setRescaleFraming(fm.id)}
                  className={`p-1.5 rounded-lg border text-left transition ${
                    rescaleFraming === fm.id
                      ? 'bg-brand-600 text-white font-bold border-brand-500 shadow-sm'
                      : 'bg-white dark:bg-studio-900 border-slate-200 dark:border-studio-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <span className="block font-sans font-semibold text-[10px]">{fm.name}</span>
                  <span className={`text-[7.5px] block ${rescaleFraming === fm.id ? 'text-white/80' : 'text-slate-400'}`}>
                    {fm.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Post-Scaling Texture Sharpening Slider */}
          <div className="space-y-1 pt-1 border-t border-slate-200 dark:border-studio-800">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500 font-semibold">Post-Scaling Detail Sharpening:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                {Math.round(rescaleSharpen * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={rescaleSharpen}
              onChange={(e) => setRescaleSharpen(parseFloat(e.target.value))}
              className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />
          </div>

          {/* Hardware Codec & Quality Selector */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200 dark:border-studio-800 text-[10px]">
            <div className="space-y-0.5">
              <span className="text-slate-500 font-semibold block">Target Codec:</span>
              <select
                value={rescaleCodec}
                onChange={(e) => setRescaleCodec(e.target.value)}
                className="w-full bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-lg p-1.5 text-[10px] font-mono text-slate-800 dark:text-slate-200"
              >
                <option value="auto">Auto (NVENC HEVC for 4K)</option>
                <option value="hevc">H.265 / HEVC (4K/8K Pro)</option>
                <option value="h264">H.264 (NVENC Fast)</option>
                <option value="prores">Apple ProRes 422</option>
              </select>
            </div>
            <div className="space-y-0.5">
              <span className="text-slate-500 font-semibold block">Quality Preset:</span>
              <select
                value={rescaleQuality}
                onChange={(e) => setRescaleQuality(e.target.value)}
                className="w-full bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-lg p-1.5 text-[10px] font-mono text-slate-800 dark:text-slate-200"
              >
                <option value="cinema_master">Cinema Master (Lossless-Grade)</option>
                <option value="high">High Quality (Broadcast)</option>
                <option value="standard">Standard Web (Fast)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab 9: Boomerang & Split Screen */}
      {activeTab === 'boomerang' && (
        <div className="space-y-3 animate-in fade-in duration-200 bg-slate-50 dark:bg-studio-850/60 border border-slate-200 dark:border-studio-800 p-3 rounded-xl">
          {/* Sub-tab Navigation */}
          <div className="flex bg-slate-200/80 dark:bg-studio-800 rounded-lg p-0.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setBoomerangSubTab('boomerang')}
              className={`flex-1 py-1 rounded flex items-center justify-center space-x-1 transition ${
                boomerangSubTab === 'boomerang'
                  ? 'bg-brand-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Repeat className="w-3 h-3" />
              <span>Ping-Pong Loop</span>
            </button>
            <button
              type="button"
              onClick={() => setBoomerangSubTab('splitscreen')}
              className={`flex-1 py-1 rounded flex items-center justify-center space-x-1 transition ${
                boomerangSubTab === 'splitscreen'
                  ? 'bg-brand-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Columns className="w-3 h-3" />
              <span>Split-Screen Compare</span>
            </button>
          </div>

          {/* Sub-mode 1: Boomerang Ping-Pong Loop */}
          {boomerangSubTab === 'boomerang' && (
            <div className="space-y-3">
              {/* Loop Count */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold block">Loop Iterations:</span>
                <div className="flex bg-slate-200/80 dark:bg-studio-800 rounded-lg p-0.5 text-[10px] font-mono">
                  {[2, 3, 4, 6].map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setBoomerangLoops(l)}
                      className={`flex-1 py-1 rounded transition ${
                        boomerangLoops === l
                          ? 'bg-brand-600 text-white font-bold shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {l}x Loops
                    </button>
                  ))}
                </div>
              </div>

              {/* Speed Multiplier */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold block">Playback Speed:</span>
                <div className="flex bg-slate-200/80 dark:bg-studio-800 rounded-lg p-0.5 text-[10px] font-mono">
                  {[
                    { label: '0.75x Slow', val: 0.75 },
                    { label: '1.0x Normal', val: 1.0 },
                    { label: '1.5x Fast', val: 1.5 },
                    { label: '2.0x Hyper', val: 2.0 },
                  ].map((s) => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setBoomerangSpeed(s.val)}
                      className={`flex-1 py-1 rounded transition ${
                        boomerangSpeed === s.val
                          ? 'bg-brand-600 text-white font-bold shadow-sm'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio Toggle */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-studio-800">
                <div>
                  <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block">Ping-Pong Audio</span>
                  <span className="text-[8px] text-slate-400 block">Play forward + reverse audio loop (disable for silent loop)</span>
                </div>
                <input
                  type="checkbox"
                  checked={boomerangAudio}
                  onChange={(e) => setBoomerangAudio(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-600 focus:ring-0 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Sub-mode 2: Split-Screen Comparison Studio */}
          {boomerangSubTab === 'splitscreen' && (
            <div className="space-y-3">
              {/* Select Processed Video */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold block">Compare Against Library File:</span>
                {outputs.length === 0 ? (
                  <p className="text-[10px] text-slate-500 italic bg-white dark:bg-studio-900 p-2 rounded-lg border border-slate-200 dark:border-studio-800">
                    No exported output files found yet. Export a clip, stabilization, or crop first to compare.
                  </p>
                ) : (
                  <select
                    value={selectedProcessedFile}
                    onChange={(e) => setSelectedProcessedFile(e.target.value)}
                    className="w-full bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-mono focus:outline-none"
                  >
                    {outputs.map((out) => (
                      <option key={out.filename} value={out.filename}>
                        {out.filename} ({formatBytes(out.size)})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Layout Mode */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold block">Comparison Layout:</span>
                <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                  {[
                    { id: 'side_by_side', label: 'Side by Side (Left/Right)' },
                    { id: 'stacked', label: 'Stacked (Top/Bottom)' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => setSplitLayout(l.id)}
                      className={`p-1.5 rounded-lg border text-left transition ${
                        splitLayout === l.id
                          ? 'bg-brand-600 text-white font-bold border-brand-500 shadow-sm'
                          : 'bg-white dark:bg-studio-900 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Badges */}
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="space-y-0.5">
                  <span className="text-slate-500 font-semibold">Left/Top Label:</span>
                  <input
                    type="text"
                    value={labelLeft}
                    onChange={(e) => setLabelLeft(e.target.value)}
                    className="w-full bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 font-mono text-[10px]"
                  />
                </div>
                <div className="space-y-0.5">
                  <span className="text-slate-500 font-semibold">Right/Bottom Label:</span>
                  <input
                    type="text"
                    value={labelRight}
                    onChange={(e) => setLabelRight(e.target.value)}
                    className="w-full bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-lg px-2 py-1 text-slate-800 dark:text-slate-200 font-mono text-[10px]"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 9: GIF */}
      {activeTab === 'gif' && (
        <div className="space-y-2.5 animate-in fade-in duration-200 bg-slate-50 dark:bg-studio-850/60 border border-slate-200 dark:border-studio-800 p-3 rounded-xl">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-brand-cyan" /> GIF Presets
          </span>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-semibold block">FPS:</span>
            <div className="flex bg-slate-200/80 dark:bg-studio-800 rounded-lg p-0.5 text-[10px] font-mono">
              {[10, 15, 24].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setGifFps(f)}
                  className={`flex-1 py-0.5 rounded ${gifFps === f ? 'bg-brand-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  {f} FPS
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 font-semibold block">Width:</span>
            <div className="flex bg-slate-200/80 dark:bg-studio-800 rounded-lg p-0.5 text-[10px] font-mono">
              {[320, 480, 640].map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setGifWidth(w)}
                  className={`flex-1 py-0.5 rounded ${gifWidth === w ? 'bg-brand-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  {w}px
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 9: Audio Studio & EBU R128 Normalizer */}
      {activeTab === 'audio' && (
        <div className="space-y-3 animate-in fade-in duration-200 bg-slate-50 dark:bg-studio-850/60 border border-slate-200 dark:border-studio-800 p-3 rounded-xl">
          {/* Sub-tab Navigation */}
          <div className="flex bg-slate-200/80 dark:bg-studio-800 rounded-lg p-0.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setAudioSubTab('extract')}
              className={`flex-1 py-1 rounded flex items-center justify-center space-x-1 transition ${
                audioSubTab === 'extract'
                  ? 'bg-brand-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Music className="w-3 h-3" />
              <span>Extract Audio</span>
            </button>
            <button
              type="button"
              onClick={() => setAudioSubTab('normalize')}
              className={`flex-1 py-1 rounded flex items-center justify-center space-x-1 transition ${
                audioSubTab === 'normalize'
                  ? 'bg-brand-600 text-white font-bold shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Volume2 className="w-3 h-3" />
              <span>EBU R128 Master</span>
            </button>
          </div>

          {/* Launch Advanced Mastering Studio Modal */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-brand-500/10 border border-indigo-500/20 flex items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-indigo-400 block">Pro Mastering Suite</span>
              <span className="text-[10px] text-zinc-400 block">4-Band Parametric EQ, Vocal Clarity & Waveform</span>
            </div>
            <button
              type="button"
              onClick={onOpenAudioMaster}
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition whitespace-nowrap"
            >
              Open Studio
            </button>
          </div>

          {/* Sub-mode 1: Simple Audio Extraction */}
          {audioSubTab === 'extract' && (
            <div className="space-y-2.5">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold block">Format:</span>
                <div className="flex bg-slate-200/80 dark:bg-studio-800 rounded-lg p-0.5 text-[10px] font-mono">
                  {['mp3', 'wav', 'aac'].map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setAudioFormat(fmt)}
                      className={`flex-1 py-0.5 rounded uppercase ${
                        audioFormat === fmt ? 'bg-brand-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>
              {audioFormat === 'mp3' && (
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 font-semibold block">Bitrate:</span>
                  <div className="flex bg-slate-200/80 dark:bg-studio-800 rounded-lg p-0.5 text-[10px] font-mono">
                    {['128k', '192k', '320k'].map((br) => (
                      <button
                        key={br}
                        type="button"
                        onClick={() => setAudioBitrate(br)}
                        className={`flex-1 py-0.5 rounded ${
                          audioBitrate === br ? 'bg-brand-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {br}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sub-mode 2: EBU R128 Broadcast Normalizer */}
          {audioSubTab === 'normalize' && (
            <div className="space-y-3">
              {/* Broadcast Presets */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold block">Target Loudness Standard:</span>
                <div className="grid grid-cols-2 gap-1 text-[9px] font-mono">
                  {[
                    { name: 'YouTube / Spotify', i: -14, tp: -1.0 },
                    { name: 'European TV (EBU)', i: -23, tp: -1.0 },
                    { name: 'Podcast / Dialogue', i: -16, tp: -1.5 },
                    { name: 'Club / Loud EDM', i: -9, tp: -0.5 },
                  ].map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => {
                        setTargetLufs(p.i);
                        setTruePeak(p.tp);
                      }}
                      className={`p-1.5 rounded border text-left transition ${
                        targetLufs === p.i && truePeak === p.tp
                          ? 'bg-brand-600 text-white font-bold border-brand-500 shadow-sm'
                          : 'bg-white dark:bg-studio-900 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span className="block font-sans font-semibold text-[10px]">{p.name}</span>
                      <span className={`text-[8px] block ${targetLufs === p.i && truePeak === p.tp ? 'text-white/80' : 'text-slate-400'}`}>
                        {p.i} LUFS · {p.tp} dBTP
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-studio-800">
                {/* Target LUFS */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500 font-semibold">Integrated Loudness (LUFS):</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{targetLufs} LUFS</span>
                  </div>
                  <input
                    type="range"
                    min="-30"
                    max="-6"
                    step="1"
                    value={targetLufs}
                    onChange={(e) => setTargetLufs(parseInt(e.target.value, 10))}
                    className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>

                {/* True Peak */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-500 font-semibold">Max True Peak (dBTP):</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{truePeak.toFixed(1)} dBTP</span>
                  </div>
                  <input
                    type="range"
                    min="-3.0"
                    max="-0.1"
                    step="0.1"
                    value={truePeak}
                    onChange={(e) => setTruePeak(parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-200 dark:bg-studio-800 rounded-lg appearance-none cursor-pointer accent-brand-500"
                  />
                </div>

                {/* Output Mode (Video vs MP3) */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block">Audio Only (MP3)</span>
                    <span className="text-[8px] text-slate-400 block">Export normalized MP3 rather than full video</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={asAudioOnly}
                    onChange={(e) => setAsAudioOnly(e.target.checked)}
                    className="w-4 h-4 rounded text-brand-600 focus:ring-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Analysis Scanner */}
              <button
                type="button"
                onClick={handleMeasureLoudness}
                disabled={isAnalyzingLoudness}
                className="w-full py-1.5 rounded-lg bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold flex items-center justify-center space-x-1 transition border border-slate-200 dark:border-studio-700"
              >
                {isAnalyzingLoudness ? (
                  <>
                    <div className="w-2.5 h-2.5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mr-1" />
                    <span>Analyzing Loudness Profile...</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3 text-brand-cyan" />
                    <span>Scan Current Audio LUFS</span>
                  </>
                )}
              </button>

              {/* Measured HUD */}
              {loudnessMetrics && (
                <div className="bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-lg p-2 text-[9px] font-mono grid grid-cols-2 gap-1 text-slate-500">
                  <div>Measured LUFS: <span className="font-bold text-slate-700 dark:text-slate-200">{loudnessMetrics.input_i}</span></div>
                  <div>True Peak: <span className="font-bold text-slate-700 dark:text-slate-200">{loudnessMetrics.input_tp} dBTP</span></div>
                  <div>Dynamic LRA: <span className="font-bold text-slate-700 dark:text-slate-200">{loudnessMetrics.input_lra} LU</span></div>
                  <div>Offset Req: <span className="font-bold text-brand-600 dark:text-brand-cyan">{loudnessMetrics.target_offset} dB</span></div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab 10: Merge Segments Queue */}
      {activeTab === 'merge' && (
        <div className="space-y-2.5 animate-in fade-in duration-200 bg-slate-50 dark:bg-studio-850/60 border border-slate-200 dark:border-studio-800 p-3 rounded-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Layers className="w-3 h-3 text-brand-cyan" /> Multi-Clip Highlight Queue
            </span>
            <span className="text-[10px] font-mono font-bold text-brand-cyan">
              {segments.length} {segments.length === 1 ? 'clip' : 'clips'}
            </span>
          </div>

          {segments.length === 0 ? (
            <p className="text-[11px] text-slate-500 text-center py-4 bg-white dark:bg-studio-900 rounded-lg border border-dashed border-slate-300 dark:border-studio-800">
              No clips queued yet.<br />
              Use <span className="text-brand-500 font-bold">+ Add to Queue</span> in timeline to add clips.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {segments.map((seg, idx) => (
                <div
                  key={seg.id || idx}
                  className="flex items-center justify-between p-1.5 rounded-lg bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 text-[10px] font-mono"
                >
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    #{idx + 1}: {formatTimecode(seg.start_time).split('.')[0]} → {formatTimecode(seg.end_time).split('.')[0]}
                  </span>
                  <span className="text-slate-500">
                    ({(seg.end_time - seg.start_time).toFixed(1)}s)
                  </span>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-slate-500">
            Clips will be losslessly stitched into one continuous video in sequential order.
          </p>
        </div>
      )}

      {/* Range Display Badges */}
      {activeTab !== 'merge' && (
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="bg-slate-50 dark:bg-studio-850 border border-slate-200 dark:border-studio-800 rounded-lg p-2">
            <span className="text-[9px] text-emerald-600 dark:text-emerald-400 block font-sans font-bold">START (IN)</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">{formatTimecode(startTime)}</span>
          </div>
          <div className="bg-slate-50 dark:bg-studio-850 border border-slate-200 dark:border-studio-800 rounded-lg p-2">
            <span className="text-[9px] text-rose-600 dark:text-rose-400 block font-sans font-bold">END (OUT)</span>
            <span className="font-bold text-slate-800 dark:text-slate-100">{formatTimecode(endTime)}</span>
          </div>
        </div>
      )}

      {/* Custom Output Name */}
      <div className="space-y-1">
        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">Custom Name (Optional)</label>
        <input
          type="text"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="e.g. clip_01"
          className="w-full bg-slate-50 dark:bg-studio-850 border border-slate-200 dark:border-studio-800 focus:border-brand-500 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none transition font-mono"
        />
      </div>

      {/* Metadata Capsule */}
      {metadata && (
        <div className="bg-slate-50 dark:bg-studio-950/60 border border-slate-200 dark:border-studio-800 rounded-lg p-2 grid grid-cols-2 gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
          <div>Res: <span className="text-slate-700 dark:text-slate-200">{metadata.width}x{metadata.height}</span></div>
          <div>FPS: <span className="text-slate-700 dark:text-slate-200">{metadata.fps}</span></div>
          <div>Codec: <span className="text-slate-700 dark:text-slate-200 uppercase">{metadata.codec_video}</span></div>
          <div>Size: <span className="text-slate-700 dark:text-slate-200">{formatBytes(metadata.size_bytes)}</span></div>
        </div>
      )}

      {/* Export Action Button */}
      <div className="mt-auto pt-2">
        <button
          onClick={handleExport}
          disabled={isProcessing || (activeTab === 'merge' ? segments.length < 2 : cutDuration <= 0)}
          className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center space-x-1.5 transition shadow-md ${
            isProcessing || (activeTab === 'merge' ? segments.length < 2 : cutDuration <= 0)
              ? 'bg-slate-200 dark:bg-studio-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-brand-600 via-brand-500 to-brand-cyan hover:from-brand-500 hover:to-brand-600 text-white shadow-brand-500/25 active:scale-[0.99]'
          }`}
        >
          {activeTab === 'crop' ? (
            <Crop className="w-3.5 h-3.5" />
          ) : activeTab === 'rescale' ? (
            <Maximize2 className="w-3.5 h-3.5" />
          ) : activeTab === 'text' ? (
            <Type className="w-3.5 h-3.5" />
          ) : activeTab === 'silence' ? (
            <Zap className="w-3.5 h-3.5" />
          ) : activeTab === 'compress' ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : activeTab === 'scenes' ? (
            <Sparkles className="w-3.5 h-3.5" />
          ) : activeTab === 'stabilize' ? (
            <Compass className="w-3.5 h-3.5" />
          ) : activeTab === 'colorgrade' ? (
            <Palette className="w-3.5 h-3.5" />
          ) : activeTab === 'boomerang' ? (
            <Repeat className="w-3.5 h-3.5" />
          ) : activeTab === 'gif' ? (
            <Film className="w-3.5 h-3.5" />
          ) : activeTab === 'audio' ? (
            <Music className="w-3.5 h-3.5" />
          ) : activeTab === 'merge' ? (
            <Layers className="w-3.5 h-3.5" />
          ) : (
            <Scissors className="w-3.5 h-3.5" />
          )}
          <span>
            {isProcessing
              ? 'Processing...'
              : activeTab === 'cut'
              ? `Export Cut (${formatTimecode(cutDuration).split('.')[0]})`
              : activeTab === 'crop'
              ? `Export ${bgBlur ? 'Blurred BG' : 'Crop'} (${cropAspectRatio})`
              : activeTab === 'rescale'
              ? `Export ${rescaleWidth > (metadata?.width || 0) ? 'Super-Res 4K' : 'Rescaled'} (${rescaleWidth}×${rescaleHeight})`
              : activeTab === 'text'
              ? `Export Burn-In (${timecodeMode !== 'none' ? 'Timecode' : 'Text'})`
              : activeTab === 'silence'
              ? 'Auto Jump-Cut (Remove Dead-Air)'
              : activeTab === 'compress'
              ? `Export Compressed (${targetSizeMb} MB)`
              : activeTab === 'scenes'
              ? `Export ${sceneAnalysisResult?.scenes?.length || 'All'} Scene Clips`
              : activeTab === 'stabilize'
              ? 'Export Stabilized Video (2-Pass)'
              : activeTab === 'colorgrade'
              ? `Export Color Grade (${colorPreset === 'none' ? 'Custom' : colorPreset.replace('_', ' ').toUpperCase()})`
              : activeTab === 'boomerang'
              ? boomerangSubTab === 'boomerang'
                ? `Export Boomerang (${boomerangLoops}x Loop)`
                : 'Export Split-Screen Compare'
              : activeTab === 'gif'
              ? `Export GIF (${formatTimecode(cutDuration).split('.')[0]})`
              : activeTab === 'audio'
              ? audioSubTab === 'normalize'
                ? `Export Master (${targetLufs} LUFS)`
                : `Export ${audioFormat.toUpperCase()}`
              : `Merge ${segments.length} Clips`}
          </span>
        </button>
      </div>
    </div>
  </div>
</div>
  );
}
