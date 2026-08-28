import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Maximize,
  Repeat,
  Tag,
  Scaling,
  MoveHorizontal,
  RotateCw,
  Sliders,
  Camera,
  Keyboard,
  Check,
  Crop,
} from 'lucide-react';
import { formatTimecode, timeToFrame } from '../utils/formatters';

export default function VideoPlayer({
  videoSrc,
  videoId,
  metadata,
  currentTime,
  onTimeUpdate,
  startTime,
  endTime,
  onSetStartTime,
  onSetEndTime,
  onAddSegment,
  settings,
  colorGradeSettings,
  onMetadataLoaded,
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLoopingRange, setIsLoopingRange] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [internalDuration, setInternalDuration] = useState(0);

  // Sizing & Transform state
  const [fitMode, setFitMode] = useState('contain');
  const [playerHeight, setPlayerHeight] = useState(480);
  const [isAutoFitScreen, setIsAutoFitScreen] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [isFlippedH, setIsFlippedH] = useState(false);
  const [showSizeControls, setShowSizeControls] = useState(false);
  const [showHotkeysModal, setShowHotkeysModal] = useState(false);
  const [snapshotToast, setSnapshotToast] = useState(null);
  const [showCropGuides, setShowCropGuides] = useState(false);
  const [guideRatio, setGuideRatio] = useState('9:16');

  // Player Seekbar State
  const playerSeekbarRef = useRef(null);
  const [isDraggingSeekbar, setIsDraggingSeekbar] = useState(false);
  const [hoverSeekTime, setHoverSeekTime] = useState(null);

  const effectiveDuration = metadata?.duration || internalDuration;

  const handleLoadedMetadata = (e) => {
    const d = e.target.duration || 0;
    const w = e.target.videoWidth || 1920;
    const h = e.target.videoHeight || 1080;
    if (d > 0) {
      setInternalDuration(d);
      if (onMetadataLoaded) {
        onMetadataLoaded({
          duration: d,
          width: w,
          height: h,
          fps: metadata?.fps || 30,
          codec_video: metadata?.codec_video || 'H264',
          codec_audio: metadata?.codec_audio || 'AAC',
        });
      }
    }
  };

  const getSeekTimeFromMouse = useCallback((e) => {
    if (!playerSeekbarRef.current || !effectiveDuration) return 0;
    const rect = playerSeekbarRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    return (x / rect.width) * effectiveDuration;
  }, [effectiveDuration]);

  const handleSeekbarMouseDown = (e) => {
    e.stopPropagation();
    setIsDraggingSeekbar(true);
    const time = getSeekTimeFromMouse(e);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    onTimeUpdate(time);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingSeekbar) return;
      const time = getSeekTimeFromMouse(e);
      if (videoRef.current) {
        videoRef.current.currentTime = time;
      }
      onTimeUpdate(time);
    };

    const handleMouseUp = () => {
      if (isDraggingSeekbar) {
        setIsDraggingSeekbar(false);
      }
    };

    if (isDraggingSeekbar) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSeekbar, getSeekTimeFromMouse, onTimeUpdate]);

  const fps = metadata?.fps || 30;
  const frameDuration = 1 / fps;

  // Live CSS Color Grade Filter
  let colorGradeFilter = '';
  if (colorGradeSettings) {
    const {
      preset = 'none',
      brightness = 0,
      contrast = 1,
      saturation = 1,
      temperature = 0,
    } = colorGradeSettings;

    let baseBrightness = 1 + brightness;
    let baseContrast = contrast;
    let baseSaturation = saturation;
    let sepia = 0;
    let hueRotate = 0;

    if (preset === 'teal_orange') {
      baseContrast *= 1.15;
      baseSaturation *= 1.2;
      hueRotate = -10;
    } else if (preset === 'vintage_film') {
      baseContrast *= 1.05;
      baseSaturation *= 0.85;
      sepia = 0.35;
    } else if (preset === 'cyberpunk') {
      baseContrast *= 1.25;
      baseSaturation *= 1.35;
      hueRotate = 40;
    } else if (preset === 'golden_hour') {
      baseContrast *= 1.1;
      baseSaturation *= 1.2;
      sepia = 0.25;
      hueRotate = -5;
    } else if (preset === 'noir_bw') {
      baseContrast *= 1.3;
      baseSaturation = 0;
      baseBrightness -= 0.02;
    } else if (preset === 'crisp_clean') {
      baseContrast *= 1.1;
      baseSaturation *= 1.15;
    }

    if (temperature > 0) {
      sepia = Math.min(1, sepia + temperature * 0.3);
      hueRotate -= temperature * 10;
    } else if (temperature < 0) {
      hueRotate -= temperature * 15;
    }

    colorGradeFilter = `brightness(${baseBrightness}) contrast(${baseContrast}) saturate(${baseSaturation}) sepia(${sepia}) hue-rotate(${hueRotate}deg)`;
  }

  useEffect(() => {
    if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.05) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;

    if (isLoopingRange && time >= endTime) {
      videoRef.current.currentTime = startTime;
      onTimeUpdate(startTime);
      return;
    }

    onTimeUpdate(time);
  };

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      if (videoRef.current.currentTime >= (metadata?.duration || 0) - 0.1) {
        videoRef.current.currentTime = startTime || 0;
      }
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, metadata?.duration, startTime]);

  const stepFrames = useCallback((frames) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const newTime = Math.max(0, Math.min(metadata?.duration || 0, videoRef.current.currentTime + frames * frameDuration));
    videoRef.current.currentTime = newTime;
    onTimeUpdate(newTime);
  }, [frameDuration, metadata?.duration, onTimeUpdate]);

  const stepSeconds = useCallback((seconds) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const newTime = Math.max(0, Math.min(metadata?.duration || 0, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    onTimeUpdate(newTime);
  }, [metadata?.duration, onTimeUpdate]);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'i':
        case 'I':
          e.preventDefault();
          onSetStartTime(currentTime);
          break;
        case 'o':
        case 'O':
          e.preventDefault();
          onSetEndTime(currentTime);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (e.shiftKey) stepSeconds(-1.0);
          else stepFrames(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (e.shiftKey) stepSeconds(1.0);
          else stepFrames(1);
          break;
        case 'j':
        case 'J':
          e.preventDefault();
          stepSeconds(-1.0);
          break;
        case 'k':
        case 'K':
          e.preventDefault();
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
          }
          break;
        case 'l':
        case 'L':
          e.preventDefault();
          stepSeconds(1.0);
          break;
        case '?':
          e.preventDefault();
          setShowHotkeysModal((prev) => !prev);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentTime, onSetStartTime, onSetEndTime, stepFrames, stepSeconds, togglePlay]);

  const handleCaptureSnapshot = async (imgFormat = 'png') => {
    if (!videoId) return;
    try {
      const snapUrl = `/mediapro/api/videos/${videoId}/snapshot?timestamp=${currentTime}&format=${imgFormat}`;
      const link = document.createElement('a');
      link.href = snapUrl;
      link.download = `frame_${timeToFrame(currentTime, fps)}_${formatTimecode(currentTime).replace(/:/g, '-')}.${imgFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setSnapshotToast(`Snapshot captured at ${formatTimecode(currentTime)}`);
      setTimeout(() => setSnapshotToast(null), 3000);
    } catch (err) {
      console.error('Snapshot failed:', err);
    }
  };

  const handleSpeedChange = (rate) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (containerRef.current.requestFullscreen) containerRef.current.requestFullscreen();
    }
  };

  const currentFrame = timeToFrame(currentTime, fps);
  const totalFrames = metadata?.total_frames || timeToFrame(metadata?.duration || 0, fps);

  const transformStyle = {
    transform: `rotate(${rotation}deg) scaleX(${isFlippedH ? -1 : 1})`,
    filter: colorGradeFilter || undefined,
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-2xl overflow-hidden shadow-md dark:shadow-2xl transition-colors relative"
    >
      {/* Compact Top Toolbar */}
      <div className="px-3 py-1.5 bg-slate-50 dark:bg-studio-950/80 border-b border-slate-200 dark:border-studio-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* View Size Buttons */}
        <div className="flex items-center space-x-1.5">
          <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1 text-[11px]">
            <Scaling className="w-3 h-3 text-brand-500" /> Size:
          </span>
          <div className="flex items-center bg-slate-200/80 dark:bg-studio-850 rounded-lg p-0.5 border border-slate-300 dark:border-studio-800 text-[11px] font-medium">
            <button
              onClick={() => { setIsAutoFitScreen(true); setPlayerHeight(480); }}
              className={`px-2 py-0.5 rounded transition ${
                isAutoFitScreen ? 'bg-brand-600 text-white font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Fit
            </button>
            <button
              onClick={() => { setIsAutoFitScreen(false); setPlayerHeight(360); }}
              className={`px-2 py-0.5 rounded transition ${
                !isAutoFitScreen && playerHeight === 360 ? 'bg-brand-600 text-white font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Compact
            </button>
            <button
              onClick={() => { setIsAutoFitScreen(false); setPlayerHeight(520); }}
              className={`px-2 py-0.5 rounded transition ${
                !isAutoFitScreen && playerHeight === 520 ? 'bg-brand-600 text-white font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Medium
            </button>
          </div>
        </div>

        {/* Aspect Fit, Snapshot, Hotkeys */}
        <div className="flex items-center space-x-1.5">
          <div className="flex items-center bg-slate-200/80 dark:bg-studio-850 rounded-lg p-0.5 border border-slate-300 dark:border-studio-800 text-[11px] font-medium">
            <button
              onClick={() => setFitMode('contain')}
              className={`px-2 py-0.5 rounded transition ${
                fitMode === 'contain' ? 'bg-white dark:bg-studio-700 text-brand-600 dark:text-brand-cyan font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Contain
            </button>
            <button
              onClick={() => setFitMode('cover')}
              className={`px-2 py-0.5 rounded transition ${
                fitMode === 'cover' ? 'bg-white dark:bg-studio-700 text-brand-600 dark:text-brand-cyan font-bold shadow-sm' : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Fill
            </button>
          </div>

          {/* Snapshot */}
          {(settings?.playerTools?.snapshot ?? true) && (
            <button
              onClick={() => handleCaptureSnapshot('png')}
              className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-studio-850 hover:bg-slate-200 dark:hover:bg-studio-800 border border-slate-300 dark:border-studio-800 text-brand-600 dark:text-brand-cyan text-[11px] font-semibold flex items-center gap-1 transition"
              title="Instant Frame Snapshot (PNG)"
            >
              <Camera className="w-3 h-3" />
              <span className="hidden sm:inline">Snapshot</span>
            </button>
          )}

          {/* Rotate */}
          {(settings?.playerTools?.rotate ?? true) && (
            <button
              onClick={() => setRotation((prev) => (prev + 90) % 360)}
              className={`p-1 rounded-lg border transition ${
                rotation !== 0 ? 'bg-brand-500/20 border-brand-500 text-brand-500 font-bold' : 'bg-slate-100 dark:bg-studio-850 border-slate-300 dark:border-studio-800 text-slate-600 dark:text-slate-400'
              }`}
              title="Rotate 90°"
            >
              <RotateCw className="w-3 h-3" />
            </button>
          )}

          {/* Flip */}
          {(settings?.playerTools?.flip ?? true) && (
            <button
              onClick={() => setIsFlippedH((prev) => !prev)}
              className={`p-1 rounded-lg border transition ${
                isFlippedH ? 'bg-brand-500/20 border-brand-500 text-brand-500 font-bold' : 'bg-slate-100 dark:bg-studio-850 border-slate-300 dark:border-studio-800 text-slate-600 dark:text-slate-400'
              }`}
              title="Mirror Horizontally"
            >
              <MoveHorizontal className="w-3 h-3" />
            </button>
          )}

          {/* Crop Guides */}
          {(settings?.playerTools?.cropGuides ?? true) && (
            <button
              onClick={() => setShowCropGuides(!showCropGuides)}
              className={`px-2 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1 transition ${
                showCropGuides
                  ? 'bg-brand-600 text-white font-bold shadow-sm'
                  : 'bg-slate-100 dark:bg-studio-850 border-slate-300 dark:border-studio-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Toggle Crop Aspect Ratio Guides"
            >
              <Crop className="w-3 h-3" />
              <span className="hidden sm:inline">Crop Guides</span>
            </button>
          )}

          {/* Height Slider Toggle */}
          {(settings?.playerTools?.heightSlider ?? true) && (
            <button
              onClick={() => setShowSizeControls(!showSizeControls)}
              className={`p-1 rounded-lg border transition ${
                showSizeControls ? 'bg-brand-600 text-white' : 'bg-slate-100 dark:bg-studio-850 border-slate-300 dark:border-studio-800 text-slate-600 dark:text-slate-400'
              }`}
              title="Height Slider"
            >
              <Sliders className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={() => setShowHotkeysModal(true)}
            className="p-1 rounded-lg bg-slate-100 dark:bg-studio-850 hover:bg-slate-200 dark:hover:bg-studio-800 border border-slate-300 dark:border-studio-800 text-slate-600 dark:text-slate-400"
            title="Keyboard Shortcuts (?)"
          >
            <Keyboard className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Snapshot Toast notification */}
      {snapshotToast && (
        <div className="absolute top-12 right-3 z-40 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 shadow-lg animate-in fade-in">
          <Check className="w-3.5 h-3.5" />
          <span>{snapshotToast}</span>
        </div>
      )}

      {/* Optional Height Slider */}
      {showSizeControls && (
        <div className="px-4 py-2 bg-slate-100 dark:bg-studio-950 border-b border-slate-200 dark:border-studio-800 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-2 flex-1">
            <span className="text-slate-500 font-mono text-[11px]">Height:</span>
            <input
              type="range"
              min="260"
              max="780"
              step="10"
              value={playerHeight}
              onChange={(e) => {
                setIsAutoFitScreen(false);
                setPlayerHeight(parseInt(e.target.value));
              }}
              className="flex-1 h-1 bg-slate-300 dark:bg-studio-800 rounded appearance-none cursor-pointer accent-brand-500"
            />
            <span className="font-mono text-brand-600 dark:text-brand-cyan font-bold w-12 text-right">
              {playerHeight}px
            </span>
          </div>
          <button
            onClick={() => { setRotation(0); setIsFlippedH(false); setFitMode('contain'); setIsAutoFitScreen(true); setPlayerHeight(480); }}
            className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      )}

      {/* Video Canvas Container */}
      <div
        className={`relative bg-black flex items-center justify-center group select-none overflow-hidden transition-all duration-200 ${
          isAutoFitScreen ? 'max-h-[50vh] min-h-[280px] h-[46vh] w-full' : ''
        }`}
        style={!isAutoFitScreen ? { height: `${playerHeight}px`, width: '100%' } : {}}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onClick={togglePlay}
          style={transformStyle}
          className={`w-full h-full cursor-pointer ${
            fitMode === 'contain' ? 'object-contain' : fitMode === 'cover' ? 'object-cover' : 'object-fill'
          }`}
        />

        {/* Live Vignette Shadow Overlay */}
        {colorGradeSettings?.vignette > 0 && (
          <div
            className="absolute inset-0 pointer-events-none z-10 transition-opacity duration-150"
            style={{
              background: `radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,${Math.min(0.95, colorGradeSettings.vignette * 0.85)}) 100%)`,
            }}
          />
        )}

        {/* Crop Guides Overlay */}
        {showCropGuides && (
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-20">
            {/* Aspect Ratio Selector on Canvas */}
            <div className="absolute top-3 right-3 pointer-events-auto bg-slate-950/80 backdrop-blur-md border border-slate-700/80 rounded-lg p-1 flex items-center space-x-1 text-[10px] font-mono shadow-lg">
              {['9:16', '1:1', '16:9', '4:5'].map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => setGuideRatio(ratio)}
                  className={`px-2 py-0.5 rounded transition ${
                    guideRatio === ratio ? 'bg-brand-600 text-white font-bold shadow' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {ratio}
                </button>
              ))}
            </div>

            {/* Visual Framing Box */}
            <div
              className="border-2 border-brand-cyan/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] relative transition-all duration-200"
              style={{
                aspectRatio: guideRatio.replace(':', '/'),
                height: guideRatio === '9:16' || guideRatio === '4:5' ? '92%' : guideRatio === '1:1' ? '80%' : '56%',
                maxHeight: '92%',
                maxWidth: '92%',
              }}
            >
              {/* Rule of Thirds Grid */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-40">
                <div className="border-r border-b border-white/60" />
                <div className="border-r border-b border-white/60" />
                <div className="border-b border-white/60" />
                <div className="border-r border-b border-white/60" />
                <div className="border-r border-b border-white/60" />
                <div className="border-b border-white/60" />
                <div className="border-r border-white/60" />
                <div className="border-r border-white/60" />
                <div />
              </div>

              {/* Aspect Ratio Tag */}
              <div className="absolute bottom-2 left-2 bg-brand-cyan/90 text-slate-950 font-bold px-1.5 py-0.5 rounded text-[10px] font-mono shadow">
                {guideRatio} Safe Area
              </div>
            </div>
          </div>
        )}

        {/* Timecode HUD */}
        {(settings?.playerTools?.timecodeHUD ?? true) && (
          <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md border border-slate-700/80 px-3 py-1.5 rounded-lg flex items-center space-x-2.5 text-[11px] font-mono text-slate-200 pointer-events-none shadow z-10">
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-sans font-semibold">Time</span>
              <span className="font-bold text-brand-cyan">{formatTimecode(currentTime)}</span>
            </div>
            <div className="h-5 w-px bg-slate-700" />
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-sans font-semibold">Frame</span>
              <span>{currentFrame} <span className="text-slate-500 font-normal">/ {totalFrames}</span></span>
            </div>
            <div className="h-5 w-px bg-slate-700" />
            <div>
              <span className="text-[9px] uppercase text-slate-400 block font-sans font-semibold">FPS</span>
              <span>{fps}</span>
            </div>
          </div>
        )}

        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition cursor-pointer"
          >
            <div className="w-14 h-14 rounded-full bg-brand-600/90 text-white flex items-center justify-center shadow-xl transform scale-95 group-hover:scale-100 transition">
              <Play className="w-7 h-7 ml-0.5" />
            </div>
          </div>
        )}
      </div>

      {/* Interactive Video Player Seekbar Track */}
      <div
        ref={playerSeekbarRef}
        onMouseDown={handleSeekbarMouseDown}
        onMouseMove={(e) => setHoverSeekTime(getSeekTimeFromMouse(e))}
        onMouseLeave={() => setHoverSeekTime(null)}
        className="relative h-3.5 bg-slate-200 dark:bg-studio-900 border-t border-slate-300 dark:border-studio-800 cursor-pointer group select-none transition-all"
        title="Click or drag to scrub playhead"
      >
        {/* Track Background */}
        <div className="absolute inset-0 bg-slate-300/60 dark:bg-studio-950/80" />

        {/* Selected Cut Region Highlight Bar */}
        {effectiveDuration > 0 && (
          <div
            className="absolute top-0 bottom-0 bg-brand-500/25 border-x border-brand-500/60 pointer-events-none"
            style={{
              left: `${((startTime || 0) / effectiveDuration) * 100}%`,
              width: `${Math.max(0, (((endTime || effectiveDuration) - (startTime || 0)) / effectiveDuration) * 100)}%`,
            }}
          />
        )}

        {/* Playback Progress Fill */}
        {effectiveDuration > 0 && (
          <div
            className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-brand-600 via-brand-500 to-brand-cyan pointer-events-none shadow-sm"
            style={{ width: `${(currentTime / effectiveDuration) * 100}%` }}
          />
        )}

        {/* Sliding Scrubber Playhead Handle */}
        {effectiveDuration > 0 && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none"
            style={{ left: `${(currentTime / effectiveDuration) * 100}%` }}
          >
            <div className="w-3.5 h-3.5 bg-white dark:bg-slate-100 border-2 border-brand-500 rounded-full shadow-lg shadow-brand-500/60 group-hover:scale-125 transition-transform" />
          </div>
        )}

        {/* Hover Timecode Tooltip */}
        {hoverSeekTime !== null && effectiveDuration > 0 && (
          <div
            className="absolute -top-7 -translate-x-1/2 bg-slate-900/95 text-white text-[10px] font-mono px-1.5 py-0.5 rounded shadow pointer-events-none z-30"
            style={{ left: `${(hoverSeekTime / effectiveDuration) * 100}%` }}
          >
            {formatTimecode(hoverSeekTime).split('.')[0]}
          </div>
        )}
      </div>

      {/* Streamlined Stepper & Marker Controls */}
      <div className="p-2.5 bg-slate-50 dark:bg-studio-850 border-t border-slate-200 dark:border-studio-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        {/* Frame Stepping */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => stepSeconds(-1)}
            title="Step Back 1s (J)"
            className="px-2 py-1 rounded bg-slate-200 dark:bg-studio-800 hover:bg-slate-300 dark:hover:bg-studio-700 border border-slate-300 dark:border-studio-700 text-[11px] font-mono text-slate-700 dark:text-slate-300 transition"
          >
            -1s
          </button>
          <button
            onClick={() => stepFrames(-5)}
            title="Step Back 5 Frames"
            className="px-1.5 py-1 rounded bg-slate-200 dark:bg-studio-800 hover:bg-slate-300 dark:hover:bg-studio-700 border border-slate-300 dark:border-studio-700 text-[11px] font-mono text-slate-700 dark:text-slate-300 transition"
          >
            -5f
          </button>
          <button
            onClick={() => stepFrames(-1)}
            title="Step Back 1 Frame (←)"
            className="p-1 rounded bg-slate-200 dark:bg-studio-800 hover:bg-slate-300 dark:hover:bg-studio-700 border border-slate-300 dark:border-studio-700 text-slate-700 dark:text-slate-300 transition"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={togglePlay}
            className="w-8 h-8 rounded-lg bg-brand-600 hover:bg-brand-500 text-white flex items-center justify-center shadow transition active:scale-95 mx-0.5"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </button>

          <button
            onClick={() => stepFrames(1)}
            title="Step Forward 1 Frame (→)"
            className="p-1 rounded bg-slate-200 dark:bg-studio-800 hover:bg-slate-300 dark:hover:bg-studio-700 border border-slate-300 dark:border-studio-700 text-slate-700 dark:text-slate-300 transition"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => stepFrames(5)}
            title="Step Forward 5 Frames"
            className="px-1.5 py-1 rounded bg-slate-200 dark:bg-studio-800 hover:bg-slate-300 dark:hover:bg-studio-700 border border-slate-300 dark:border-studio-700 text-[11px] font-mono text-slate-700 dark:text-slate-300 transition"
          >
            +5f
          </button>
          <button
            onClick={() => stepSeconds(1)}
            title="Step Forward 1s (L)"
            className="px-2 py-1 rounded bg-slate-200 dark:bg-studio-800 hover:bg-slate-300 dark:hover:bg-studio-700 border border-slate-300 dark:border-studio-700 text-[11px] font-mono text-slate-700 dark:text-slate-300 transition"
          >
            +1s
          </button>
        </div>

        {/* IN / OUT Markers */}
        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => onSetStartTime(currentTime)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold transition"
            title="Mark IN Point (Key: I)"
          >
            <Tag className="w-3 h-3" />
            <span>IN [{formatTimecode(currentTime).split('.')[0]}]</span>
          </button>

          <button
            onClick={() => onSetEndTime(currentTime)}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs font-semibold transition"
            title="Mark OUT Point (Key: O)"
          >
            <Tag className="w-3 h-3" />
            <span>OUT [{formatTimecode(currentTime).split('.')[0]}]</span>
          </button>

          {onAddSegment && (
            <button
              onClick={onAddSegment}
              className="px-2.5 py-1 rounded-lg bg-brand-500/10 hover:bg-brand-500/20 border border-brand-500/30 text-brand-600 dark:text-brand-cyan text-xs font-semibold transition"
              title="Save current [IN, OUT] as a Multi-Cut Segment"
            >
              + Clip
            </button>
          )}
        </div>

        {/* Playback Tools */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsLoopingRange(!isLoopingRange)}
            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition ${
              isLoopingRange ? 'bg-brand-500 text-white border-brand-500 font-bold' : 'bg-slate-200 dark:bg-studio-800 border-slate-300 dark:border-studio-700 text-slate-600 dark:text-slate-400'
            }`}
            title="Loop Range"
          >
            <Repeat className="w-3 h-3" />
          </button>

          <div className="flex items-center bg-slate-200 dark:bg-studio-800 rounded-lg border border-slate-300 dark:border-studio-700 p-0.5 text-[10px] font-mono">
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
              <button
                key={rate}
                onClick={() => handleSpeedChange(rate)}
                className={`px-1 py-0.5 rounded ${
                  playbackRate === rate ? 'bg-brand-600 text-white font-bold' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-1">
            <button onClick={toggleMute} className="text-slate-500 dark:text-slate-400">
              {isMuted || volume === 0 ? <VolumeX className="w-3.5 h-3.5 text-brand-rose" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-12 h-1 bg-slate-300 dark:bg-studio-700 rounded appearance-none cursor-pointer accent-brand-500"
            />
          </div>

          <button onClick={toggleFullscreen} className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white" title="Fullscreen">
            <Maximize className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Hotkeys Modal */}
      {showHotkeysModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-2xl p-5 max-w-xs w-full space-y-3 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-studio-800 pb-2">
              <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5 text-brand-500" /> Pro Hotkeys
              </h4>
              <button onClick={() => setShowHotkeysModal(false)} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-white">✕</button>
            </div>
            <div className="space-y-1.5 text-xs font-mono text-slate-700 dark:text-slate-300">
              <div className="flex justify-between"><span>Play/Pause:</span><span className="px-1.5 py-0.2 bg-slate-100 dark:bg-studio-800 rounded font-bold">Space</span></div>
              <div className="flex justify-between"><span>Mark IN:</span><span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded font-bold">I</span></div>
              <div className="flex justify-between"><span>Mark OUT:</span><span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded font-bold">O</span></div>
              <div className="flex justify-between"><span>Step Frame:</span><span className="px-1.5 py-0.2 bg-slate-100 dark:bg-studio-800 rounded font-bold">← / →</span></div>
              <div className="flex justify-between"><span>Step 1s:</span><span className="px-1.5 py-0.2 bg-slate-100 dark:bg-studio-800 rounded font-bold">Shift + ← / →</span></div>
              <div className="flex justify-between"><span>Scrub:</span><span className="px-1.5 py-0.2 bg-slate-100 dark:bg-studio-800 rounded font-bold">J / K / L</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
