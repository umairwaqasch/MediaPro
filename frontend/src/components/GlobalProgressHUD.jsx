import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Download,
  Play,
  X,
  Sparkles,
  Zap,
  Activity,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  FolderCheck,
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';
import { saveFileWithSaveAsPicker, triggerBrowserDownload } from '../utils/fileSystem';

export default function GlobalProgressHUD({
  isOpen,
  status,
  percent = 0,
  speed = '',
  message = '',
  result = null,
  error = null,
  onClose,
  onPlayResult,
  settings,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSavingAs, setIsSavingAs] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const isComplete = status === 'SUCCESS';
  const isFailed = status === 'FAILURE';
  const isRunning = status === 'PROGRESS' || status === 'PENDING';
  const downloadUrl = result ? `/mediapro/api/media/output/${result.output_filename}` : '';

  const handleSaveAs = async () => {
    if (!result) return;
    setIsSavingAs(true);
    try {
      const ok = await saveFileWithSaveAsPicker(result.output_filename, downloadUrl);
      if (ok) setSavedSuccess(true);
    } catch (e) {
      console.warn('Save As failed:', e);
      triggerBrowserDownload(downloadUrl, result.output_filename);
    } finally {
      setIsSavingAs(false);
    }
  };

  return (
    <>
      {/* Top Slim Gradient Progress Strip (Always Non-Blocking) */}
      {isRunning && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-slate-900/40 pointer-events-none">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 shadow-sm shadow-cyan-500/50 transition-all duration-300 ease-out"
            style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
          />
        </div>
      )}

      {/* Floating Bottom-Right Non-Blocking HUD */}
      <div className="fixed bottom-5 right-5 z-40 max-w-sm w-[92vw] sm:w-96 transition-all duration-300 animate-in slide-in-from-bottom-5 fade-in">
        <div className="bg-white/95 dark:bg-zinc-950/95 border border-slate-200 dark:border-zinc-800/90 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden text-slate-900 dark:text-zinc-100 ring-1 ring-black/5 dark:ring-white/5">
          {/* Header Bar */}
          <div className="px-4 py-3 bg-slate-50/80 dark:bg-zinc-900/80 border-b border-slate-200 dark:border-zinc-800/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`p-1.5 rounded-lg flex-shrink-0 ${
                  isComplete
                    ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                    : isFailed
                    ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                    : 'bg-cyan-500/10 text-cyan-500 border border-cyan-500/20'
                }`}
              >
                {isComplete ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : isFailed ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <Activity className="w-4 h-4 animate-spin" />
                )}
              </div>

              <div className="min-w-0">
                <h4 className="text-xs font-bold truncate">
                  {isComplete
                    ? 'Task Completed'
                    : isFailed
                    ? 'Task Failed'
                    : message || 'Processing in Background...'}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                  {isRunning ? `${Math.round(percent)}% ${speed ? `(${speed})` : ''}` : isComplete ? 'Ready to inspect or download' : 'Error details below'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => setIsCollapsed((prev) => !prev)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800/60 transition"
                title={isCollapsed ? 'Expand HUD' : 'Collapse HUD'}
              >
                {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                title="Dismiss HUD"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Collapsible Body */}
          {!isCollapsed && (
            <div className="p-4 space-y-3">
              {/* Progress Bar for Running Tasks */}
              {isRunning && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                    <span className="truncate max-w-[200px]">{message || 'Rendering...'}</span>
                    <span className="font-bold text-cyan-600 dark:text-cyan-400">{Math.round(percent)}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-zinc-900 rounded-full overflow-hidden border border-slate-200 dark:border-zinc-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full shadow-sm transition-all duration-300"
                      style={{ width: `${Math.max(4, Math.min(100, percent))}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 dark:text-zinc-500">
                    <span>Background Job Active</span>
                    <span>Workspace fully interactive</span>
                  </div>
                </div>
              )}

              {/* Completion Success Card (Single or Multi-Cut Batch) */}
              {isComplete && result && (
                <div className="space-y-3 animate-in fade-in duration-200">
                  {result.is_batch && Array.isArray(result.items) && result.items.length > 0 ? (
                    /* Multi-Cut Batch Results */
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                        <span>All {result.items.length} Clips Ready</span>
                        <span className="text-[10px] font-mono font-normal text-slate-500 dark:text-zinc-400">Multi-Cut Export</span>
                      </div>

                      {/* Scrollable list of generated clips */}
                      <div className="max-h-48 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
                        {result.items.map((item, idx) => {
                          const itemDownloadUrl = `/mediapro/api/media/output/${item.output_filename}`;
                          return (
                            <div
                              key={idx}
                              className="p-2 rounded-xl bg-slate-50 dark:bg-zinc-900/90 border border-slate-200 dark:border-zinc-800 text-[11px] flex items-center justify-between gap-2 shadow-sm"
                            >
                              <div className="min-w-0 flex-1">
                                <div className="font-semibold text-slate-800 dark:text-zinc-200 truncate font-mono" title={item.output_filename}>
                                  Clip #{item.clip_index || idx + 1}: {item.output_filename}
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                                  {item.file_size ? formatBytes(item.file_size) : ''}
                                  {item.duration ? ` • ${item.duration.toFixed(1)}s` : ''}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {onPlayResult && (
                                  <button
                                    type="button"
                                    onClick={() => onPlayResult(item.output_filename)}
                                    className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500 hover:text-zinc-950 transition"
                                    title="Preview clip in player"
                                  >
                                    <Play className="w-3 h-3 fill-current" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => triggerBrowserDownload(itemDownloadUrl, item.output_filename)}
                                  className="p-1.5 rounded-lg bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-300 dark:hover:bg-zinc-700 transition"
                                  title="Download this clip"
                                >
                                  <Download className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Primary Batch ZIP Download Button */}
                      {result.zip_url ? (
                        <a
                          href={result.zip_url}
                          download={`mediapro_multicut_${result.items.length}_clips.zip`}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-bold text-xs shadow-md transition active:scale-95 text-center"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download All ({result.items.length} Clips as .ZIP)</span>
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            result.items.forEach((item, idx) => {
                              setTimeout(() => {
                                triggerBrowserDownload(`/mediapro/api/media/output/${item.output_filename}`, item.output_filename);
                              }, idx * 250);
                            });
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition active:scale-95"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download All {result.items.length} Files</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    /* Single File Result */
                    <>
                      <div className="p-2.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 text-xs flex flex-col gap-1">
                        <div className="font-semibold text-emerald-700 dark:text-emerald-400 truncate">
                          {result.output_filename}
                        </div>
                        {result.file_size && (
                          <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                            Size: {formatBytes(result.file_size)}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {onPlayResult && (
                          <button
                            onClick={() => onPlayResult(result.output_filename)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-cyan-500 text-zinc-950 font-bold text-xs hover:bg-cyan-400 transition shadow-sm active:scale-95"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Preview</span>
                          </button>
                        )}

                        <button
                          onClick={handleSaveAs}
                          disabled={isSavingAs}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 font-semibold text-xs border border-slate-200 dark:border-zinc-700 transition active:scale-95"
                        >
                          {savedSuccess ? (
                            <>
                              <FolderCheck className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Saved!</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              <span>{isSavingAs ? 'Saving...' : 'Download'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Error Alert */}
              {isFailed && error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-400 text-xs">
                  <div className="font-bold mb-1">Process Error:</div>
                  <div className="font-mono text-[11px] break-all">{error}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
