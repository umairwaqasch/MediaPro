import React, { useState } from 'react';
import {
  X,
  Zap,
  CheckCircle,
  AlertCircle,
  Crop,
  Palette,
  Type,
  Maximize,
  RefreshCw,
  BrainCircuit,
  Bot,
  Minimize2,
} from 'lucide-react';

export default function ImageBatchModal({
  isOpen,
  onClose,
  stagedImages,
  onRunBatch,
  batchProgress,
}) {
  const [activeTab, setActiveTab] = useState('rescale'); // 'rescale' | 'convert' | 'compress' | 'colorgrade' | 'watermark' | 'ai_cutout'
  const [params, setParams] = useState({
    scale_percent: 100,
    output_format: 'WEBP',
    quality: 85,
    lut_preset: 'teal_orange',
    watermark_text: '© Media Pro Studio',
    watermark_position: 'bottom_right',
    ai_bg_mode: 'white',
  });

  if (!isOpen) return null;

  const update = (key, val) => setParams({ ...params, [key]: val });

  const handleStart = () => {
    onRunBatch(activeTab, params);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-3xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/90 rounded-3xl overflow-hidden shadow-2xl flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900/60 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Batch Image Processing Studio</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Execute automated transformations across {stagedImages.length} staged images simultaneously
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
            title={batchProgress ? 'Run in background' : 'Close'}
          >
            {batchProgress ? <Minimize2 className="w-5 h-5 text-cyan-400" /> : <X className="w-5 h-5" />}
          </button>
        </div>


        {/* Tab Selection */}
        <div className="grid grid-cols-6 border-b border-slate-200 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/30 text-xs font-semibold transition-colors">
          {[
            { id: 'rescale', label: 'Rescale', icon: Crop },
            { id: 'convert', label: 'Format', icon: RefreshCw },
            { id: 'compress', label: 'Optimize', icon: Maximize },
            { id: 'colorgrade', label: '3D LUT', icon: Palette },
            { id: 'watermark', label: 'Stamp', icon: Type },
            { id: 'ai_cutout', label: 'AI Cutout', icon: BrainCircuit },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-3 flex flex-col items-center gap-1 border-b-2 transition-all ${
                  activeTab === t.id
                    ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5 font-bold'
                    : 'border-transparent text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="p-6 space-y-4 flex-1">
          {activeTab === 'rescale' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-400">Scale Percentage for All Staged Images</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="25"
                  max="200"
                  step="5"
                  value={params.scale_percent}
                  onChange={(e) => update('scale_percent', parseInt(e.target.value))}
                  className="flex-1 h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold text-sm w-12">{params.scale_percent}%</span>
              </div>
            </div>
          )}

          {activeTab === 'convert' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-400">Target Output Container Format</label>
              <div className="grid grid-cols-4 gap-3">
                {['WEBP', 'JPEG', 'PNG', 'TIFF'].map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => update('output_format', fmt)}
                    className={`py-3 rounded-xl border font-bold text-xs transition ${
                      params.output_format === fmt
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-800 dark:text-cyan-300 shadow-sm'
                        : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'compress' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-400">Quality Compression Level ({params.quality}%)</label>
              <input
                type="range"
                min="40"
                max="100"
                step="5"
                value={params.quality}
                onChange={(e) => update('quality', parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          )}

          {activeTab === 'colorgrade' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-400">Apply Cinematic 3D LUT to Entire Batch</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'teal_orange', name: 'Teal & Orange' },
                  { id: 'vintage_35mm', name: '35mm Vintage' },
                  { id: 'cyberpunk', name: 'Cyberpunk Neon' },
                  { id: 'golden_hour', name: 'Golden Hour' },
                  { id: 'film_noir', name: 'Film Noir B&W' },
                  { id: 'crisp_commercial', name: 'Crisp Pro' },
                ].map((lut) => (
                  <button
                    key={lut.id}
                    onClick={() => update('lut_preset', lut.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                      params.lut_preset === lut.id
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-800 dark:text-cyan-300'
                        : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lut.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'watermark' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-400">Batch Watermark Text</label>
              <input
                type="text"
                value={params.watermark_text}
                onChange={(e) => update('watermark_text', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          )}

          {activeTab === 'ai_cutout' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 dark:text-zinc-400">Batch AI Background Removal Canvas</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'transparent', label: 'Transparent Alpha' },
                  { id: 'white', label: 'Pure Studio White' },
                  { id: 'black', label: 'Pure Studio Black' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => update('ai_bg_mode', m.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                      params.ai_bg_mode === m.id
                        ? 'bg-cyan-500/15 border-cyan-500 text-cyan-800 dark:text-cyan-300'
                        : 'bg-slate-50 dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Progress Bar (when running) */}
          {batchProgress && (
            <div className="p-4 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-2">
              <div className="flex justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300">
                <span>Batch Processing in Progress...</span>
                <span>{batchProgress.percent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${batchProgress.percent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900/60 flex items-center justify-between transition-colors">
          <span className="text-xs text-slate-500 dark:text-zinc-400">
            {stagedImages.length} images will be processed in background
          </span>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white transition"
            >
              Cancel
            </button>

            <button
              onClick={handleStart}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition"
            >
              <Zap className="w-4 h-4 fill-current" />
              Dispatch Batch Pipeline
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
