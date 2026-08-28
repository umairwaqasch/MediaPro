import React, { useState, useEffect } from 'react';
import {
  X,
  Zap,
  Maximize2,
  Crop,
  Minimize2,
  Volume2,
  Palette,
  Type,
  Music,
  CheckCircle2,
  AlertTriangle,
  Download,
  Play,
  Sparkles,
  Sliders,
  Layers,
  Film,
  Activity,
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';

const BATCH_OPERATIONS = [
  { id: 'rescale', label: '4K / 8K Super-Resolution', icon: Maximize2, desc: 'Lanczos GPU upscaler, 4K/8K presets & multi-scale transcoding' },
  { id: 'crop', label: 'Social 9:16 & Blurred Canvas', icon: Crop, desc: 'Batch transform to TikTok/Reels vertical with blurred backdrop' },
  { id: 'compress', label: 'File Size Compressor (MB)', icon: Minimize2, desc: 'Batch compress to exact target MB or high-efficiency codecs' },
  { id: 'normalize', label: 'EBU R128 Audio Normalizer', icon: Volume2, desc: 'Dual-pass -14 LUFS loudness mastering & True-Peak limiter' },
  { id: 'colorgrade', label: 'Hollywood 3D LUT Grading', icon: Palette, desc: 'Teal & Orange, Cyberpunk, Vintage 35mm & cinematic looks' },
  { id: 'burn_in', label: 'Watermark & Timecode Burn-In', icon: Type, desc: 'Overlay custom copyright titles and running SMPTE timecodes' },
  { id: 'audio', label: 'Audio Stream Extractor', icon: Music, desc: 'Batch extract MP3, WAV, or AAC audio tracks' },
  { id: 'gif', label: 'Animated GIF Generator', icon: Film, desc: 'Batch convert videos to high-fps animated GIFs' },
  { id: 'stabilize', label: '2-Pass Video Stabilization', icon: Activity, desc: 'Batch remove camera shake & optical jitter' },
];

const RESCALE_PRESETS = [
  { id: '4k_uhd', label: '4K UHD (3840x2160)', width: 3840, height: 2160, desc: 'Ultra HD 16:9 Cinema' },
  { id: '8k_uhd', label: '8K UHD (7680x4320)', width: 7680, height: 4320, desc: 'Maximum 8K Master' },
  { id: '2k_qhd', label: '2K QHD (2560x1440)', width: 2560, height: 1440, desc: '1440p Master' },
  { id: '1080p', label: '1080p Full HD (1920x1080)', width: 1920, height: 1080, desc: 'Standard 1080p HD' },
  { id: '4k_vertical', label: '4K Vertical (2160x3840)', width: 2160, height: 3840, desc: '4K 9:16 Shorts/Reels' },
  { id: '1080p_vertical', label: '1080p TikTok (1080x1920)', width: 1080, height: 1920, desc: '9:16 Social Canvas' },
  { id: '720p', label: '720p HD (1280x720)', width: 1280, height: 720, desc: 'Fast Web Video' },
  { id: '480p', label: '480p SD (854x480)', width: 854, height: 480, desc: 'Lightweight Proxy' },
];

export default function BatchProcessModal({
  isOpen,
  onClose,
  selectedVideos = [],
  onStartBatch,
  batchJobState, // { isRunning, isCompleted, batchId, totalTasks, completedCount, failedCount, overallPercent, tasks: [] }
  onCancelBatch,
  onResetBatch,
  hardwareInfo,
}) {
  const [activeTab, setActiveTab] = useState('rescale');

  // Rescale Params
  const [rescalePreset, setRescalePreset] = useState('4k_uhd');
  const [rescaleAlgorithm, setRescaleAlgorithm] = useState('lanczos');
  const [rescaleFraming, setRescaleFraming] = useState('fit_pad');
  const [rescaleSharpen, setRescaleSharpen] = useState(0.3);

  // Crop Params
  const [cropAspect, setCropAspect] = useState('9:16');
  const [cropBgBlur, setCropBgBlur] = useState(true);

  // Compress Params
  const [compressTargetMb, setCompressTargetMb] = useState(25);
  const [compressFormat, setCompressFormat] = useState('mp4');

  // Normalize Params
  const [normPreset, setNormPreset] = useState('youtube_spotify');
  const [normLufs, setNormLufs] = useState(-14);

  // Color Grade Params
  const [colorPreset, setColorPreset] = useState('teal_orange');
  const [colorBrightness, setColorBrightness] = useState(0);
  const [colorContrast, setColorContrast] = useState(1);
  const [colorSaturation, setColorSaturation] = useState(1);

  // Burn-In Params
  const [burnText, setBurnText] = useState('© VideoProcessor');
  const [burnShowTimecode, setBurnShowTimecode] = useState(false);
  const [burnPosition, setBurnPosition] = useState('bottom_center');

  // Audio Params
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [audioBitrate, setAudioBitrate] = useState('320k');

  // GIF Params
  const [gifFps, setGifFps] = useState(15);
  const [gifWidth, setGifWidth] = useState(480);

  // Stabilize Params
  const [stabShakiness, setStabShakiness] = useState(6);
  const [stabSmoothing, setStabSmoothing] = useState(30);

  if (!isOpen) return null;

  const isRunning = batchJobState?.isRunning;
  const isCompleted = batchJobState?.isCompleted;

  const handleLaunchBatch = () => {
    let params = {};

    if (activeTab === 'rescale') {
      const presetObj = RESCALE_PRESETS.find((p) => p.id === rescalePreset) || RESCALE_PRESETS[0];
      params = {
        target_width: presetObj.width,
        target_height: presetObj.height,
        algorithm: rescaleAlgorithm,
        framing_mode: rescaleFraming,
        sharpen_strength: rescaleSharpen,
        codec: 'auto',
        quality_preset: 'high',
      };
    } else if (activeTab === 'crop') {
      params = {
        aspect_ratio: cropAspect,
        bg_blur: cropBgBlur,
      };
    } else if (activeTab === 'compress') {
      params = {
        target_size_mb: compressTargetMb,
        format: compressFormat,
      };
    } else if (activeTab === 'normalize') {
      params = {
        preset: normPreset,
        target_lufs: normLufs,
      };
    } else if (activeTab === 'colorgrade') {
      params = {
        preset: colorPreset,
        brightness: colorBrightness,
        contrast: colorContrast,
        saturation: colorSaturation,
      };
    } else if (activeTab === 'burn_in') {
      params = {
        text_overlay: burnText,
        show_timecode: burnShowTimecode,
        position: burnPosition,
      };
    } else if (activeTab === 'audio') {
      params = {
        audio_format: audioFormat,
        bitrate: audioBitrate,
      };
    } else if (activeTab === 'gif') {
      params = {
        fps: gifFps,
        width: gifWidth,
      };
    } else if (activeTab === 'stabilize') {
      params = {
        shakiness: stabShakiness,
        smoothing: stabSmoothing,
      };
    }

    onStartBatch({
      video_ids: selectedVideos.map((v) => v.id),
      operation: activeTab,
      params: params,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 text-slate-900 dark:text-slate-100">
      <div className="bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-200 dark:border-studio-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-cyan text-white shadow-md">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
                  Batch Processing Studio
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-cyan text-[10px] font-mono font-bold">
                  {selectedVideos.length} {selectedVideos.length === 1 ? 'Video' : 'Videos'}
                </span>
                {hardwareInfo?.is_gpu && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold border border-emerald-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-500 animate-pulse" />
                    GPU NVENC Accelerated
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Apply operations across all selected staged videos in parallel
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (isCompleted && onResetBatch) onResetBatch();
              onClose();
            }}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-studio-800 transition"
            title={isRunning ? 'Minimize & Run in Background' : 'Close Batch Studio'}
          >
            {isRunning ? <Minimize2 className="w-5 h-5 text-brand-cyan" /> : <X className="w-5 h-5" />}
          </button>
        </div>

        {/* Live Multi-Task Progress View */}
        {isRunning || isCompleted ? (
          <div className="p-6 overflow-y-auto space-y-5 flex-1">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-brand-500/10 text-brand-500">
                {isCompleted ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-500" />
                ) : (
                  <Sparkles className="w-7 h-7 text-brand-500 animate-pulse" />
                )}
              </div>
              <h3 className="text-base font-bold">
                {isCompleted ? 'Batch Processing Complete!' : 'Processing Batch Videos in Parallel...'}
              </h3>
              <p className="text-xs text-slate-500">
                {isCompleted
                  ? `Successfully generated ${batchJobState?.completedCount || selectedVideos.length} outputs.`
                  : `Completed ${batchJobState?.completedCount || 0} of ${batchJobState?.totalTasks || selectedVideos.length} files`}
              </p>

              {isRunning && (
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-studio-700 flex items-center gap-1.5 transition active:scale-95"
                    title="Minimize modal and monitor via top-bar Task Center"
                  >
                    <Minimize2 className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>Run in Background</span>
                  </button>
                </div>
              )}

              {isCompleted && (
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={onResetBatch}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-brand-cyan text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition active:scale-95 hover:brightness-110"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>⚡ Configure Another Batch</span>
                  </button>
                </div>
              )}
            </div>


            {/* Overall Progress Bar */}
            <div className="space-y-1.5 bg-slate-50 dark:bg-studio-950 p-4 rounded-2xl border border-slate-200 dark:border-studio-800">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span>Overall Batch Progress</span>
                <span className="text-brand-500 dark:text-brand-cyan">{batchJobState?.overallPercent || 0}%</span>
              </div>
              <div className="h-3 w-full bg-slate-200 dark:bg-studio-900 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-studio-800">
                <div
                  className="h-full bg-gradient-to-r from-brand-600 via-brand-500 to-brand-cyan rounded-full transition-all duration-300 shadow-sm"
                  style={{ width: `${Math.max(5, batchJobState?.overallPercent || 0)}%` }}
                />
              </div>
            </div>

            {/* Individual Task Breakdown */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {(batchJobState?.tasks || []).map((t, idx) => (
                <div
                  key={t.task_id || idx}
                  className="bg-white dark:bg-studio-850 p-3 rounded-xl border border-slate-200 dark:border-studio-800 flex items-center justify-between text-xs font-mono"
                >
                  <div className="min-w-0 pr-3 flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-brand-cyan shrink-0" />
                    <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                      {selectedVideos[idx]?.filename || `Task #${idx + 1}`}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <span className="text-[11px] text-slate-500 font-normal">{t.status || 'Processing...'}</span>
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      t.state === 'SUCCESS'
                        ? 'bg-emerald-500/15 text-emerald-500'
                        : t.state === 'FAILURE'
                        ? 'bg-rose-500/15 text-rose-500'
                        : 'bg-brand-500/15 text-brand-500'
                    }`}>
                      {t.percent ? `${t.percent.toFixed(0)}%` : t.state}
                    </span>

                    {t.state === 'SUCCESS' && t.result?.output_filename && (
                      <a
                        href={`/mediapro/api/media/output/${t.result.output_filename}`}
                        download={t.result.output_filename}
                        className="p-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-cyan transition"
                        title="Download Output"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Operation Selection View */
          <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            {/* Left Operations Menu */}
            <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 dark:border-studio-800 bg-slate-50 dark:bg-studio-950/60 p-2.5 space-y-1 overflow-y-auto">
              {BATCH_OPERATIONS.map((op) => {
                const Icon = op.icon;
                const isSelected = activeTab === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setActiveTab(op.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-brand-500/15 border-brand-500/80 text-slate-900 dark:text-white shadow-sm'
                        : 'border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-studio-800/80'
                    }`}
                  >
                    <div className={`p-1.5 rounded-lg shrink-0 ${isSelected ? 'bg-brand-500 text-white' : 'bg-slate-200 dark:bg-studio-800 text-slate-500'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{op.label}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">{op.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Right Operation Settings Panel */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4">
              {/* Tab 1: Rescale 4K / 8K */}
              {activeTab === 'rescale' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Target Resolution Preset</span>
                    <span className="text-[10px] text-brand-500 font-mono font-bold">Lanczos Sinc + NVENC</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 text-xs">
                    {RESCALE_PRESETS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setRescalePreset(p.id)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          rescalePreset === p.id
                            ? 'bg-brand-500/15 border-brand-500 text-slate-900 dark:text-white font-bold shadow-sm'
                            : 'bg-slate-50 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{p.label}</div>
                        <div className="text-[9px] text-slate-500 font-normal">{p.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Resampling Algorithm */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Resampling Algorithm</span>
                    <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
                      {[
                        { id: 'lanczos', label: 'Lanczos (3-Lobe)' },
                        { id: 'spline', label: 'Spline' },
                        { id: 'bicubic', label: 'Bicubic' },
                        { id: 'bilinear', label: 'Bilinear' },
                      ].map((alg) => (
                        <button
                          key={alg.id}
                          type="button"
                          onClick={() => setRescaleAlgorithm(alg.id)}
                          className={`py-1.5 px-2 rounded-lg border text-center transition ${
                            rescaleAlgorithm === alg.id
                              ? 'bg-brand-600 text-white font-bold'
                              : 'bg-slate-100 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          {alg.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Framing Mode */}
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Aspect Ratio Framing</span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {[
                        { id: 'fit_pad', label: 'Letterbox / Pillarbox', desc: 'Preserve source with black bars' },
                        { id: 'fit_blur', label: '✨ Dynamic Blurred Canvas', desc: 'Fill canvas with blurred copy' },
                        { id: 'crop_fill', label: 'Center Crop to Fill', desc: 'Fill canvas with zero black bars' },
                        { id: 'stretch', label: 'Direct Stretch', desc: 'Stretch to exact dimensions' },
                      ].map((fm) => (
                        <button
                          key={fm.id}
                          type="button"
                          onClick={() => setRescaleFraming(fm.id)}
                          className={`p-2 rounded-xl border text-left transition ${
                            rescaleFraming === fm.id
                              ? 'bg-brand-500/15 border-brand-500 text-slate-900 dark:text-white font-bold'
                              : 'bg-slate-50 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <div className="text-[11px] font-bold">{fm.label}</div>
                          <div className="text-[9px] text-slate-500">{fm.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sharpening Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Post-Scaling Unsharp Sharpening</span>
                      <span className="font-mono text-brand-500 font-bold">{Math.round(rescaleSharpen * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={rescaleSharpen}
                      onChange={(e) => setRescaleSharpen(parseFloat(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>
                </div>
              )}

              {/* Tab 2: Social Aspect Crop */}
              {activeTab === 'crop' && (
                <div className="space-y-4 animate-in fade-in">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Select Target Social Aspect Ratio</span>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {['9:16', '1:1', '16:9', '4:5'].map((ratio) => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setCropAspect(ratio)}
                        className={`py-3 rounded-xl border text-center font-bold font-mono transition ${
                          cropAspect === ratio
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-50 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {ratio}
                      </button>
                    ))}
                  </div>

                  <div
                    onClick={() => setCropBgBlur(!cropBgBlur)}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                      cropBgBlur
                        ? 'bg-brand-500/10 border-brand-500 text-slate-900 dark:text-white'
                        : 'bg-slate-50 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">Dynamic Blurred Canvas Backdrop</div>
                      <div className="text-[11px] text-slate-500">Automatically creates cinematic blurred background backdrop</div>
                    </div>
                    <div className={`w-9 h-5 rounded-full p-0.5 relative transition ${cropBgBlur ? 'bg-brand-500' : 'bg-slate-300 dark:bg-studio-700'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${cropBgBlur ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Compression */}
              {activeTab === 'compress' && (
                <div className="space-y-4 animate-in fade-in">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Target File Size Limit (MB)</span>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {[10, 25, 50, 100].map((mb) => (
                      <button
                        key={mb}
                        type="button"
                        onClick={() => setCompressTargetMb(mb)}
                        className={`py-2.5 rounded-xl border text-center font-bold font-mono transition ${
                          compressTargetMb === mb
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-50 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {mb} MB
                      </button>
                    ))}
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Custom Target Size: {compressTargetMb} MB</span>
                    <input
                      type="range"
                      min="5"
                      max="500"
                      step="5"
                      value={compressTargetMb}
                      onChange={(e) => setCompressTargetMb(parseInt(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>
                </div>
              )}

              {/* Tab 4: EBU R128 Loudness */}
              {activeTab === 'normalize' && (
                <div className="space-y-4 animate-in fade-in">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Broadcast Loudness Preset</span>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {[
                      { id: 'youtube_spotify', label: 'YouTube / Spotify', lufs: -14, desc: '-14 LUFS • True Peak -1.0 dB' },
                      { id: 'broadcast_tv', label: 'European TV (EBU R128)', lufs: -23, desc: '-23 LUFS • True Peak -1.0 dB' },
                      { id: 'podcast', label: 'Podcast Master', lufs: -16, desc: '-16 LUFS • Clean voice clarity' },
                      { id: 'club_punch', label: 'Club / DJ Punch', lufs: -9, desc: '-9 LUFS • Maximum loud pop' },
                    ].map((pr) => (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() => { setNormPreset(pr.id); setNormLufs(pr.lufs); }}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          normPreset === pr.id
                            ? 'bg-brand-500/15 border-brand-500 text-slate-900 dark:text-white font-bold'
                            : 'bg-slate-50 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{pr.label}</div>
                        <div className="text-[9px] text-slate-500">{pr.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 5: Color Grading */}
              {activeTab === 'colorgrade' && (
                <div className="space-y-4 animate-in fade-in">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Hollywood 3D LUT Preset</span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[
                      { id: 'teal_orange', label: 'Teal & Orange', desc: 'Blockbuster warm skin tones' },
                      { id: 'vintage_film', label: 'Vintage 35mm', desc: 'Analog retro warmth' },
                      { id: 'cyberpunk', label: 'Cyberpunk Neon', desc: 'Vibrant magenta & cyan night pop' },
                      { id: 'golden_hour', label: 'Golden Hour', desc: 'Sunset amber glow' },
                      { id: 'noir', label: 'Film Noir (B&W)', desc: 'High-contrast dramatic B&W' },
                      { id: 'commercial', label: 'Commercial Crisp', desc: 'Modern punchy sharpness' },
                    ].map((pr) => (
                      <button
                        key={pr.id}
                        type="button"
                        onClick={() => setColorPreset(pr.id)}
                        className={`p-2.5 rounded-xl border text-left transition ${
                          colorPreset === pr.id
                            ? 'bg-brand-500/15 border-brand-500 text-slate-900 dark:text-white font-bold'
                            : 'bg-slate-50 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <div className="text-[11px] font-bold">{pr.label}</div>
                        <div className="text-[9px] text-slate-500">{pr.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 6: Text & Timecode */}
              {activeTab === 'burn_in' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Custom Title / Copyright Text</label>
                    <input
                      type="text"
                      value={burnText}
                      onChange={(e) => setBurnText(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-studio-850 border border-slate-200 dark:border-studio-800 text-xs font-mono"
                      placeholder="e.g. © 2026 MyStudio Channel"
                    />
                  </div>

                  <div
                    onClick={() => setBurnShowTimecode(!burnShowTimecode)}
                    className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition ${
                      burnShowTimecode
                        ? 'bg-brand-500/10 border-brand-500 text-slate-900 dark:text-white'
                        : 'bg-slate-50 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold">Burn Running SMPTE Timecode</div>
                      <div className="text-[11px] text-slate-500">Adds visual timecode clock overlay in bottom corner</div>
                    </div>
                    <div className={`w-9 h-5 rounded-full p-0.5 relative transition ${burnShowTimecode ? 'bg-brand-500' : 'bg-slate-300 dark:bg-studio-700'}`}>
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${burnShowTimecode ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 7: Audio Extraction */}
              {activeTab === 'audio' && (
                <div className="space-y-4 animate-in fade-in">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Audio Extraction Format</span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {['mp3', 'wav', 'aac'].map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setAudioFormat(fmt)}
                        className={`py-3 rounded-xl border text-center font-bold font-mono uppercase transition ${
                          audioFormat === fmt
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-50 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 8: Animated GIF */}
              {activeTab === 'gif' && (
                <div className="space-y-4 animate-in fade-in">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">GIF Resolution Width (px)</span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[320, 480, 640].map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setGifWidth(w)}
                        className={`py-2.5 rounded-xl border text-center font-bold font-mono transition ${
                          gifWidth === w
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-50 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>

                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">Animation Frame Rate</span>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {[10, 15, 24].map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setGifFps(f)}
                        className={`py-2 rounded-xl border text-center font-bold font-mono transition ${
                          gifFps === f
                            ? 'bg-brand-600 text-white'
                            : 'bg-slate-50 dark:bg-studio-850 border-slate-200 dark:border-studio-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {f} FPS
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 9: Video Stabilization */}
              {activeTab === 'stabilize' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Shakiness Detection Sensitivity</span>
                      <span className="font-mono text-brand-500 font-bold">{stabShakiness} / 10</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      value={stabShakiness}
                      onChange={(e) => setStabShakiness(parseInt(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Motion Smoothing Window</span>
                      <span className="font-mono text-brand-500 font-bold">{stabSmoothing} frames</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="5"
                      value={stabSmoothing}
                      onChange={(e) => setStabSmoothing(parseInt(e.target.value))}
                      className="w-full accent-brand-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-studio-800 bg-slate-50 dark:bg-studio-950/60 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-mono">
            {selectedVideos.length} {selectedVideos.length === 1 ? 'video queued' : 'videos queued for batch operation'}
          </div>

          <div className="flex items-center space-x-2">
            {!isRunning ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (isCompleted && onResetBatch) onResetBatch();
                    onClose();
                  }}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-studio-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-studio-800 transition"
                >
                  {isCompleted ? 'Close & Return to Editor' : 'Cancel'}
                </button>

                {isCompleted ? (
                  <button
                    type="button"
                    onClick={onResetBatch}
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-brand-cyan text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition active:scale-95 hover:brightness-110"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>⚡ Start New Batch</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleLaunchBatch}
                    className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-brand-600 via-brand-500 to-brand-cyan text-white text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 transition active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Start Batch ({selectedVideos.length} Files)</span>
                  </button>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={onCancelBatch}
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition"
              >
                Cancel Batch
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
