import React, { useState } from 'react';
import {
  Volume2,
  X,
  Sliders,
  Sparkles,
  Mic,
  Shield,
  Gauge,
  Radio,
  Download,
  RotateCcw,
  Check,
  Zap,
} from 'lucide-react';
import AudioWaveformCanvas from './AudioWaveformCanvas';
import { useToast } from '../../context/ToastContext';
import { useTaskCenter } from '../../context/TaskContext';

const LOUDNESS_PRESETS = [
  { id: 'youtube_14', label: 'YouTube & Spotify (-14 LUFS)', desc: 'Standard streaming target with -1.0 True-Peak limiter' },
  { id: 'podcast_16', label: 'Podcast & Apple Music (-16 LUFS)', desc: 'Optimized voice clarity for mobile earbuds & spoken audio' },
  { id: 'broadcast_23', label: 'Broadcast TV EBU R128 (-23 LUFS)', desc: 'Strict television & cinema dynamic range standards' },
  { id: 'loud_9', label: 'Club / Punchy EDM (-9 LUFS)', desc: 'High-energy master with maximum loudness saturation' },
  { id: 'none', label: 'Transparent / No Normalization', desc: 'Preserves existing peak levels without loudnorm processing' },
];

export default function AudioMasteringModal({
  isOpen,
  onClose,
  activeVideo,
  currentTime = 0,
  onSeek,
  onMasterComplete,
}) {
  const toast = useToast();
  const { registerBatch } = useTaskCenter();

  // 4-Band EQ state (-12 to +12 dB)
  const [eqBass, setEqBass] = useState(0.0);
  const [eqLowMid, setEqLowMid] = useState(0.0);
  const [eqHighMid, setEqHighMid] = useState(0.0);
  const [eqAir, setEqAir] = useState(0.0);

  // Dynamics & Enhancements
  const [vocalClarity, setVocalClarity] = useState(false);
  const [deEsser, setDeEsser] = useState(false);
  const [noiseGate, setNoiseGate] = useState(false);

  // Master Gain & Loudness
  const [gainDb, setGainDb] = useState(0.0);
  const [loudnessPreset, setLoudnessPreset] = useState('youtube_14');

  // Output options
  const [asAudioOnly, setAsAudioOnly] = useState(false);
  const [audioFormat, setAudioFormat] = useState('mp3');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !activeVideo) return null;

  const handleResetEQ = () => {
    setEqBass(0.0);
    setEqLowMid(0.0);
    setEqHighMid(0.0);
    setEqAir(0.0);
    setVocalClarity(false);
    setDeEsser(false);
    setNoiseGate(false);
    setGainDb(0.0);
    setLoudnessPreset('youtube_14');
    toast.info('Audio master settings reset');
  };

  const handleStartMastering = async () => {
    try {
      setIsProcessing(true);
      const payload = {
        eq_bass_80hz: parseFloat(eqBass),
        eq_lowmid_500hz: parseFloat(eqLowMid),
        eq_highmid_3khz: parseFloat(eqHighMid),
        eq_air_10khz: parseFloat(eqAir),
        vocal_clarity: vocalClarity,
        de_esser: deEsser,
        noise_gate: noiseGate,
        gain_db: parseFloat(gainDb),
        normalize_target: loudnessPreset,
        as_audio_only: asAudioOnly,
        audio_format: audioFormat,
      };

      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/audio/master`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Server error initiating audio mastering');
      }

      const data = await res.json();
      toast.success('Audio mastering dispatched to worker in background!');
      if (onMasterComplete) {
        onMasterComplete(data);
      }
      onClose();
    } catch (err) {
      toast.error(`Mastering failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9990] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-4xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-zinc-900 dark:text-zinc-100 transition-colors">
        {/* Header */}
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-500">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Advanced Audio Mastering Studio</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                4-Band Parametric EQ, Vocal Clarity, De-Esser, and Broadcast EBU R128 Loudness Processing
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* 1. Interactive Audio Waveform */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                <Gauge className="w-4 h-4" />
                Interactive Waveform & Scrubbing
              </span>
              <span className="text-xs text-zinc-400">Click or drag anywhere on waveform to seek</span>
            </div>

            <AudioWaveformCanvas
              videoId={activeVideo.id}
              currentTime={currentTime}
              duration={activeVideo.duration || 0}
              onSeek={onSeek}
              height={100}
            />
          </div>

          {/* 2. 4-Band Parametric Equalizer */}
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
                <Sliders className="w-4 h-4" />
                4-Band Parametric Equalizer
              </span>
              <button
                onClick={handleResetEQ}
                className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 flex items-center gap-1 transition"
              >
                <RotateCcw className="w-3 h-3" />
                Reset EQ
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* Sub & Bass (80Hz) */}
              <div className="space-y-2 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Sub & Bass</span>
                  <span className="font-mono text-[11px] text-indigo-500 font-bold">{eqBass > 0 ? `+${eqBass}` : eqBass} dB</span>
                </div>
                <span className="text-[10px] text-zinc-400 block">80 Hz Low-Shelf</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={eqBass}
                  onChange={(e) => setEqBass(e.target.value)}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Low-Mid (500Hz) */}
              <div className="space-y-2 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Low-Mid</span>
                  <span className="font-mono text-[11px] text-indigo-500 font-bold">{eqLowMid > 0 ? `+${eqLowMid}` : eqLowMid} dB</span>
                </div>
                <span className="text-[10px] text-zinc-400 block">500 Hz Body & Warmth</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={eqLowMid}
                  onChange={(e) => setEqLowMid(e.target.value)}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* High-Mid (3kHz) */}
              <div className="space-y-2 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Presence</span>
                  <span className="font-mono text-[11px] text-indigo-500 font-bold">{eqHighMid > 0 ? `+${eqHighMid}` : eqHighMid} dB</span>
                </div>
                <span className="text-[10px] text-zinc-400 block">3.0 kHz Clarity</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={eqHighMid}
                  onChange={(e) => setEqHighMid(e.target.value)}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Air (10kHz) */}
              <div className="space-y-2 p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800/80">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-300">Air & Sparkle</span>
                  <span className="font-mono text-[11px] text-indigo-500 font-bold">{eqAir > 0 ? `+${eqAir}` : eqAir} dB</span>
                </div>
                <span className="text-[10px] text-zinc-400 block">10.0 kHz High-Shelf</span>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={eqAir}
                  onChange={(e) => setEqAir(e.target.value)}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* 3. Dynamics & Vocal Enhancements */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Vocal Clarity */}
            <label
              className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                vocalClarity
                  ? 'bg-indigo-500/10 border-indigo-500 text-indigo-500'
                  : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <input
                type="checkbox"
                checked={vocalClarity}
                onChange={(e) => setVocalClarity(e.target.checked)}
                className="sr-only"
              />
              <div className="p-2 rounded-xl bg-indigo-500/10 shrink-0">
                <Mic className="w-4 h-4 text-indigo-500" />
              </div>
              <div>
                <span className="text-xs font-bold block">Vocal Clarity Boost</span>
                <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                  Highpass 90Hz + speech harmonic lift
                </span>
              </div>
            </label>

            {/* De-Esser */}
            <label
              className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                deEsser
                  ? 'bg-purple-500/10 border-purple-500 text-purple-500'
                  : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <input
                type="checkbox"
                checked={deEsser}
                onChange={(e) => setDeEsser(e.target.checked)}
                className="sr-only"
              />
              <div className="p-2 rounded-xl bg-purple-500/10 shrink-0">
                <Sparkles className="w-4 h-4 text-purple-500" />
              </div>
              <div>
                <span className="text-xs font-bold block">Dynamic De-Esser</span>
                <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                  Attenuates harsh 7.2kHz sibilance
                </span>
              </div>
            </label>

            {/* Noise Gate */}
            <label
              className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-start gap-3 ${
                noiseGate
                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                  : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}
            >
              <input
                type="checkbox"
                checked={noiseGate}
                onChange={(e) => setNoiseGate(e.target.checked)}
                className="sr-only"
              />
              <div className="p-2 rounded-xl bg-emerald-500/10 shrink-0">
                <Shield className="w-4 h-4 text-emerald-500" />
              </div>
              <div>
                <span className="text-xs font-bold block">Smart Noise Gate</span>
                <span className="text-[10px] text-zinc-400 leading-tight block mt-0.5">
                  Suppresses background room hiss & hum
                </span>
              </div>
            </label>
          </div>

          {/* 4. Broadcast Loudness Normalization */}
          <div className="p-5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-4">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-500 flex items-center gap-1.5">
              <Radio className="w-4 h-4" />
              Loudness Standards & Master Normalization
            </span>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {LOUDNESS_PRESETS.map((preset) => (
                <label
                  key={preset.id}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-2.5 ${
                    loudnessPreset === preset.id
                      ? 'bg-indigo-500/10 border-indigo-500 text-zinc-900 dark:text-white'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-400'
                  }`}
                >
                  <input
                    type="radio"
                    name="loudness"
                    value={preset.id}
                    checked={loudnessPreset === preset.id}
                    onChange={() => setLoudnessPreset(preset.id)}
                    className="sr-only"
                  />
                  <div className={`w-3.5 h-3.5 rounded-full border mt-0.5 flex items-center justify-center shrink-0 ${
                    loudnessPreset === preset.id ? 'border-indigo-500 bg-indigo-500' : 'border-zinc-400'
                  }`}>
                    {loudnessPreset === preset.id && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{preset.label}</span>
                    <span className="text-[10px] text-zinc-400 leading-relaxed block mt-0.5">{preset.desc}</span>
                  </div>
                </label>
              ))}
            </div>

            {/* Master Gain Slider */}
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Master Volume Gain Trim</span>
                <span className="font-mono text-[11px] font-bold text-indigo-500">{gainDb > 0 ? `+${gainDb}` : gainDb} dB</span>
              </div>
              <input
                type="range"
                min="-24"
                max="12"
                step="0.5"
                value={gainDb}
                onChange={(e) => setGainDb(e.target.value)}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>
          </div>

          {/* 5. Audio-Only Export Toggle */}
          <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold block">Export as Separate Audio Track</span>
              <span className="text-[10px] text-zinc-400 block">
                Extracts high-bitrate mastered audio file instead of muxing back into video
              </span>
            </div>

            <div className="flex items-center gap-3">
              {asAudioOnly && (
                <select
                  value={audioFormat}
                  onChange={(e) => setAudioFormat(e.target.value)}
                  className="px-2.5 py-1 text-xs rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200"
                >
                  <option value="mp3">MP3 (320 kbps)</option>
                  <option value="wav">WAV (Uncompressed PCM)</option>
                  <option value="aac">AAC (320 kbps)</option>
                </select>
              )}

              <input
                type="checkbox"
                checked={asAudioOnly}
                onChange={(e) => setAsAudioOnly(e.target.checked)}
                className="w-4 h-4 accent-indigo-500 cursor-pointer rounded"
              />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          >
            Cancel
          </button>

          <button
            onClick={handleStartMastering}
            disabled={isProcessing}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50"
          >
            <Zap className="w-4 h-4" />
            <span>{isProcessing ? 'Processing Master...' : 'Render Mastered Audio'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
