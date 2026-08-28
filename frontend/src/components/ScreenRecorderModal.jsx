import React, { useState, useRef, useEffect } from 'react';
import {
  Video,
  X,
  Monitor,
  Mic,
  MicOff,
  Camera,
  Volume2,
  Sliders,
  Play,
  Pause,
  Square,
  Sparkles,
  Zap,
  Minimize2,
  Maximize2,
  Check,
  Radio,
} from 'lucide-react';
import { ScreenRecorderEngine } from '../utils/screenRecorder';
import { useToast } from '../context/ToastContext';

export default function ScreenRecorderModal({
  isOpen,
  onClose,
  onRecordingComplete,
}) {
  const toast = useToast();

  // Configuration State
  const [fps, setFps] = useState(60);
  const [includeMic, setIncludeMic] = useState(true);
  const [includeSystemAudio, setIncludeSystemAudio] = useState(true);
  const [includeWebcam, setIncludeWebcam] = useState(false);
  const [webcamPosition, setWebcamPosition] = useState('bottom-right');
  const [webcamShape, setWebcamShape] = useState('circle');

  // Recorder State
  const [recorderState, setRecorderState] = useState('idle'); // 'idle' | 'recording' | 'paused'
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [vuLevel, setVuLevel] = useState(0.0);
  const [isMinimized, setIsMinimized] = useState(false);

  const engineRef = useRef(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (engineRef.current) {
        engineRef.current.stop();
      }
    };
  }, []);

  if (!isOpen) return null;

  const formatDuration = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}.${ms}`;
  };

  const handleStartRecording = async () => {
    try {
      const engine = new ScreenRecorderEngine({
        fps,
        includeMic,
        includeSystemAudio,
        includeWebcam,
        webcamPosition,
        webcamShape,
        onStateChange: (state) => setRecorderState(state),
        onTimeUpdate: (secs) => setElapsedSeconds(secs),
        onVUMeter: (level) => setVuLevel(level),
        onError: (err) => {
          toast.error(`Recording error: ${err.message}`);
          setRecorderState('idle');
        },
      });

      engineRef.current = engine;
      await engine.start();
      toast.info('Screen recording started!');
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        toast.error(`Failed to initialize recorder: ${err.message}`);
      }
      setRecorderState('idle');
    }
  };

  const handlePauseResume = () => {
    if (!engineRef.current) return;
    if (recorderState === 'recording') {
      engineRef.current.pause();
      toast.info('Recording paused');
    } else if (recorderState === 'paused') {
      engineRef.current.resume();
      toast.info('Recording resumed');
    }
  };

  const handleStopRecording = async () => {
    if (!engineRef.current) return;
    toast.info('Finalizing screen recording and uploading to studio...');
    const result = await engineRef.current.stop();
    if (result && result.file) {
      if (onRecordingComplete) {
        onRecordingComplete(result.file, result.filename);
      }
      onClose();
    }
  };

  // Minimized Floating Pill Mode
  if (isMinimized && recorderState !== 'idle') {
    return (
      <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-bottom-5 duration-200">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-zinc-950/90 text-white border border-zinc-800 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse shrink-0" />
            <span className="font-mono text-xs font-bold text-white tracking-wider">
              {formatDuration(elapsedSeconds)}
            </span>
          </div>

          {/* VU Level Bar */}
          {includeMic && (
            <div className="w-12 h-2 rounded-full bg-zinc-800 overflow-hidden shrink-0">
              <div
                className="h-full bg-emerald-500 transition-all duration-75"
                style={{ width: `${Math.min(100, vuLevel * 100)}%` }}
              />
            </div>
          )}

          <div className="flex items-center gap-1.5 border-l border-zinc-800 pl-2">
            <button
              onClick={handlePauseResume}
              className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition"
              title={recorderState === 'recording' ? 'Pause' : 'Resume'}
            >
              {recorderState === 'recording' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={handleStopRecording}
              className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1 transition"
              title="Stop & Handoff to Timeline"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Finish</span>
            </button>

            <button
              onClick={() => setIsMinimized(false)}
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
              title="Maximize"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && recorderState === 'idle') onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col text-zinc-900 dark:text-zinc-100 transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
              <Video className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Screen & Camera Recording Studio</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Hardware-accelerated screen capture with voiceover & PiP facecam
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {recorderState !== 'idle' && (
              <button
                onClick={() => setIsMinimized(true)}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Minimize to floating pill"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            )}

            {recorderState === 'idle' && (
              <button
                onClick={onClose}
                className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Active Recording State Screen */}
          {recorderState !== 'idle' ? (
            <div className="py-8 text-center space-y-6">
              <div className="inline-flex items-center justify-center p-4 rounded-full bg-rose-500/10 border border-rose-500/30">
                <span className="w-6 h-6 rounded-full bg-rose-500 animate-ping absolute" />
                <span className="w-6 h-6 rounded-full bg-rose-500 relative" />
              </div>

              <div>
                <span className="font-mono text-3xl font-black tracking-widest text-zinc-900 dark:text-white block">
                  {formatDuration(elapsedSeconds)}
                </span>
                <span className="text-xs uppercase font-bold tracking-wider text-rose-500 mt-1 block">
                  {recorderState === 'recording' ? '● Recording Live' : '❚❚ Recording Paused'}
                </span>
              </div>

              {/* Mic VU Level Indicator */}
              {includeMic && (
                <div className="max-w-xs mx-auto space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>Microphone Level</span>
                    <span className="font-mono">{Math.round(vuLevel * 100)}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-75 rounded-full"
                      style={{ width: `${Math.min(100, vuLevel * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Control Action Buttons */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handlePauseResume}
                  className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-bold flex items-center gap-2 transition"
                >
                  {recorderState === 'recording' ? (
                    <>
                      <Pause className="w-4 h-4 text-amber-500" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 text-emerald-500" />
                      <span>Resume</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleStopRecording}
                  className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-rose-600/25 transition active:scale-98"
                >
                  <Square className="w-4 h-4 fill-current" />
                  <span>Stop & Open in Studio</span>
                </button>
              </div>
            </div>
          ) : (
            /* Setup Configuration View */
            <div className="space-y-4">
              {/* Quality & Framerate Selection */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                  <Monitor className="w-4 h-4" />
                  Frame Rate & Performance
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <label
                    onClick={() => setFps(60)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                      fps === 60
                        ? 'bg-rose-500/10 border-rose-500 text-zinc-900 dark:text-white'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold block">60 FPS (Pro Fluid)</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">Smooth gameplay & animations</span>
                    </div>
                  </label>

                  <label
                    onClick={() => setFps(30)}
                    className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                      fps === 30
                        ? 'bg-rose-500/10 border-rose-500 text-zinc-900 dark:text-white'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    <Monitor className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold block">30 FPS (Standard)</span>
                      <span className="text-[10px] text-zinc-400 block mt-0.5">Lightweight & compact file size</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Audio Source Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    includeSystemAudio
                      ? 'bg-rose-500/10 border-rose-500 text-zinc-900 dark:text-white'
                      : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Volume2 className="w-4 h-4 text-rose-500" />
                    <div>
                      <span className="text-xs font-bold block">System Audio</span>
                      <span className="text-[10px] text-zinc-400 block">Record computer sound</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeSystemAudio}
                    onChange={(e) => setIncludeSystemAudio(e.target.checked)}
                    className="w-4 h-4 accent-rose-500 cursor-pointer"
                  />
                </label>

                <label
                  className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between ${
                    includeMic
                      ? 'bg-rose-500/10 border-rose-500 text-zinc-900 dark:text-white'
                      : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Mic className="w-4 h-4 text-emerald-500" />
                    <div>
                      <span className="text-xs font-bold block">Microphone Voice</span>
                      <span className="text-[10px] text-zinc-400 block">Record speech voiceover</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeMic}
                    onChange={(e) => setIncludeMic(e.target.checked)}
                    className="w-4 h-4 accent-rose-500 cursor-pointer"
                  />
                </label>
              </div>

              {/* Webcam Picture-in-Picture Option */}
              <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-indigo-400" />
                    <div>
                      <span className="text-xs font-bold block">Webcam Picture-in-Picture (PiP)</span>
                      <span className="text-[10px] text-zinc-400 block">Overlay your camera feed in corner</span>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={includeWebcam}
                    onChange={(e) => setIncludeWebcam(e.target.checked)}
                    className="w-4 h-4 accent-rose-500 cursor-pointer"
                  />
                </div>

                {includeWebcam && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 block mb-1">Corner Position</label>
                      <select
                        value={webcamPosition}
                        onChange={(e) => setWebcamPosition(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                      >
                        <option value="bottom-right">Bottom-Right</option>
                        <option value="bottom-left">Bottom-Left</option>
                        <option value="top-right">Top-Right</option>
                        <option value="top-left">Top-Left</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-zinc-400 block mb-1">Overlay Shape</label>
                      <select
                        value={webcamShape}
                        onChange={(e) => setWebcamShape(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                      >
                        <option value="circle">Circular Avatar</option>
                        <option value="rect">Rounded Rectangle</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {recorderState === 'idle' && (
          <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
            <span className="text-xs text-zinc-400">Browser will prompt for screen/tab selection</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              >
                Cancel
              </button>

              <button
                onClick={handleStartRecording}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-rose-600/25 transition active:scale-98"
              >
                <Video className="w-4 h-4" />
                <span>Start Recording</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
