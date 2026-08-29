import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Download, Play, X, Sparkles, Folder, FolderCheck, Minimize2 } from 'lucide-react';
import { formatBytes } from '../utils/formatters';
import { saveFileWithSaveAsPicker, triggerBrowserDownload } from '../utils/fileSystem';

export default function ProgressModal({
  isOpen,
  status,
  percent,
  speed,
  message,
  result,
  error,
  onClose,
  onPlayResult,
  settings,
}) {
  const [isSavingAs, setIsSavingAs] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const isComplete = status === 'SUCCESS';
  const isFailed = status === 'FAILURE';
  const isRunning = status === 'PROGRESS' || status === 'PENDING';
  const downloadUrl = result ? `/mediapro/api/media/output/${result.output_filename}` : '';
  const folderDisplayName = settings?.storage?.folderName || 'Default Downloads';

  const handleSaveAs = async () => {
    if (!result) return;
    setIsSavingAs(true);
    try {
      const ok = await saveFileWithSaveAsPicker(result.output_filename, downloadUrl);
      if (ok) {
        setSavedSuccess(true);
      }
    } catch (e) {
      console.warn('Save As failed:', e);
      triggerBrowserDownload(downloadUrl, result.output_filename);
    } finally {
      setIsSavingAs(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 relative overflow-hidden text-slate-900 dark:text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-xl bg-slate-100 dark:bg-studio-800 transition"
          title={isRunning ? 'Run in background' : 'Close'}
        >
          {isRunning ? <Minimize2 className="w-4 h-4 text-brand-cyan" /> : <X className="w-4 h-4" />}
        </button>


        <div className="text-center space-y-1.5">
          {isRunning && (
            <div className="relative w-12 h-12 mx-auto flex items-center justify-center">
              <div className="w-12 h-12 rounded-full border-3 border-slate-200 dark:border-studio-800 border-t-brand-500 animate-spin" />
              <Sparkles className="w-5 h-5 text-brand-500 absolute animate-pulse" />
            </div>
          )}

          {isComplete && (
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 mx-auto flex items-center justify-center border border-emerald-500/40">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          )}

          {isFailed && (
            <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-500 mx-auto flex items-center justify-center border border-rose-500/40">
              <AlertTriangle className="w-6 h-6" />
            </div>
          )}

          <h3 className="text-base font-bold tracking-tight">
            {isRunning && 'Processing Media...'}
            {isComplete && 'Export Ready!'}
            {isFailed && 'Operation Failed'}
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isRunning && (message || 'FFmpeg engine encoding stream...')}
            {isComplete && 'Your file has been generated and is ready.'}
            {isFailed && (error || 'An error occurred during execution.')}
          </p>
        </div>

        {isRunning && (
          <div className="space-y-1.5">
            <div className="h-2.5 w-full bg-slate-200 dark:bg-studio-950 rounded-full overflow-hidden p-0.5 border border-slate-300 dark:border-studio-800">
              <div
                className="h-full bg-gradient-to-r from-brand-600 via-brand-500 to-brand-cyan rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${Math.max(5, percent || 0)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">
              <span>{percent ? `${percent.toFixed(1)}%` : 'Starting...'}</span>
              {speed && <span className="text-brand-500 dark:text-brand-cyan">Speed: {speed}</span>}
            </div>
          </div>
        )}

        {isComplete && result && (
          <div className="space-y-2.5">
            {result.is_batch && Array.isArray(result.items) && result.items.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  <span>All {result.items.length} Clips Ready</span>
                  <span className="text-[10px] font-mono text-slate-500">Multi-Cut Export</span>
                </div>

                <div className="max-h-44 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
                  {result.items.map((item, idx) => {
                    const itemDownloadUrl = `/mediapro/api/media/output/${item.output_filename}`;
                    return (
                      <div
                        key={idx}
                        className="p-2 rounded-xl bg-slate-50 dark:bg-studio-950/80 border border-slate-200 dark:border-studio-800 text-[11px] flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-800 dark:text-slate-200 truncate font-mono" title={item.output_filename}>
                            Clip #{item.clip_index || idx + 1}: {item.output_filename}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                            {item.file_size ? formatBytes(item.file_size) : ''}
                            {item.duration ? ` • ${item.duration.toFixed(1)}s` : ''}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {onPlayResult && (
                            <button
                              type="button"
                              onClick={() => {
                                onPlayResult(item.output_filename);
                                onClose();
                              }}
                              className="p-1.5 rounded-lg bg-brand-500/10 text-brand-cyan hover:bg-brand-500 hover:text-white transition"
                              title="Preview clip"
                            >
                              <Play className="w-3 h-3 fill-current" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => triggerBrowserDownload(itemDownloadUrl, item.output_filename)}
                            className="p-1.5 rounded-lg bg-slate-200 dark:bg-studio-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 transition"
                            title="Download clip"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {result.zip_url && (
                  <a
                    href={result.zip_url}
                    download={`mediapro_multicut_${result.items.length}_clips.zip`}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-brand-600 via-teal-600 to-brand-cyan text-white font-bold text-xs shadow transition active:scale-95 text-center"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download All ({result.items.length} Clips as .ZIP)</span>
                  </a>
                )}
              </div>
            ) : (
              <>
                <div className="bg-slate-50 dark:bg-studio-950/80 border border-slate-200 dark:border-studio-800 rounded-xl p-3 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-700 dark:text-slate-300">
                    <span className="text-slate-500 font-sans">Filename:</span>
                    <span className="truncate max-w-[170px]" title={result.output_filename}>
                      {result.output_filename}
                    </span>
                  </div>
                  {result.file_size && (
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 font-sans">Size:</span>
                      <span>{formatBytes(result.file_size)}</span>
                    </div>
                  )}
                  {result.duration && (
                    <div className="flex justify-between text-slate-700 dark:text-slate-300">
                      <span className="text-slate-500 font-sans">Duration:</span>
                      <span>{result.duration}s</span>
                    </div>
                  )}
                </div>

                {/* Target Folder Badge */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-[10px] text-slate-600 dark:text-slate-300">
                  <span className="flex items-center gap-1 font-semibold truncate">
                    <Folder className="w-3 h-3 text-brand-cyan shrink-0" />
                    <span className="truncate">{folderDisplayName}</span>
                  </span>
                  <span className="font-mono text-[9px] text-brand-500 font-bold shrink-0">
                    {settings?.storage?.autoSave ? '⚡ Auto-Saved' : 'Ready'}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 pt-1">
          {isComplete && result && !result.is_batch && (
            <>
              <div className="flex gap-2">
                <a
                  href={downloadUrl}
                  download={result.output_filename}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-brand-600 to-brand-cyan text-white font-bold text-xs flex items-center justify-center space-x-1.5 shadow transition active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </a>

                <button
                  type="button"
                  onClick={handleSaveAs}
                  disabled={isSavingAs}
                  className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-studio-700 hover:border-brand-500 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 transition"
                  title="Choose exact save folder on your PC"
                >
                  {savedSuccess ? <FolderCheck className="w-3.5 h-3.5 text-emerald-500" /> : <Folder className="w-3.5 h-3.5" />}
                  <span>{savedSuccess ? 'Saved!' : 'Save As...'}</span>
                </button>
              </div>

              {result.type !== 'audio' && !result.output_filename.endsWith('.gif') && (
                <button
                  onClick={() => {
                    onPlayResult(result.output_filename);
                    onClose();
                  }}
                  className="w-full py-2 rounded-xl bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center justify-center space-x-1 transition"
                >
                  <Play className="w-3 h-3" />
                  <span>Play In Studio Player</span>
                </button>
              )}
            </>
          )}

          {isRunning && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-1.5"
            >
              <Minimize2 className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Run in Background</span>
            </button>
          )}

          {isFailed && (
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-studio-800 text-slate-700 dark:text-slate-200 font-semibold text-xs transition"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


