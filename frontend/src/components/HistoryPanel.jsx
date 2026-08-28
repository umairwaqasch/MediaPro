import React from 'react';
import {
  History,
  RotateCcw,
  RotateCw,
  X,
  Clock,
  CheckCircle2,
  Trash2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export default function HistoryPanel({
  isOpen,
  onClose,
  history = [],
  currentIndex = 0,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onJumpTo,
  onReset,
  studioMode = 'video',
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9985] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel Drawer */}
      <aside
        className="relative z-10 w-full max-w-sm h-full shadow-2xl flex flex-col transition-transform transform translate-x-0
          bg-white text-zinc-900 border-l border-zinc-200
          dark:bg-zinc-950 dark:text-zinc-100 dark:border-zinc-800"
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Action History</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Step {currentIndex + 1} of {history.length} snapshots
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            title="Close history panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Undo / Redo Toolbar */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between gap-2">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
              canUndo
                ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm hover:border-amber-500 hover:text-amber-600'
                : 'opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900/40 border-transparent text-zinc-400'
            }`}
            title="Undo (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
            <kbd className="text-[9px] font-mono opacity-60 ml-0.5">^Z</kbd>
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
              canRedo
                ? 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm hover:border-amber-500 hover:text-amber-600'
                : 'opacity-40 cursor-not-allowed bg-zinc-100 dark:bg-zinc-900/40 border-transparent text-zinc-400'
            }`}
            title="Redo (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Redo</span>
            <kbd className="text-[9px] font-mono opacity-60 ml-0.5">^Y</kbd>
          </button>
        </div>

        {/* History Timeline */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {history.map((entry, idx) => {
            const isCurrent = idx === currentIndex;
            const isFuture = idx > currentIndex;
            const timeStr = entry.timestamp
              ? new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : '';

            return (
              <button
                key={`${idx}_${entry.timestamp}`}
                onClick={() => onJumpTo(idx)}
                className={`w-full text-left p-3 rounded-xl border flex items-center gap-3 transition-all ${
                  isCurrent
                    ? 'bg-amber-500/10 border-amber-500/40 text-zinc-900 dark:text-white font-bold shadow-sm'
                    : isFuture
                    ? 'opacity-50 hover:opacity-80 border-transparent hover:bg-zinc-100 dark:hover:bg-zinc-900 text-zinc-500'
                    : 'border-transparent hover:border-zinc-200 dark:hover:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 text-zinc-700 dark:text-zinc-300'
                }`}
              >
                {/* Status Dot */}
                <div
                  className={`w-3 h-3 rounded-full shrink-0 flex items-center justify-center ${
                    isCurrent
                      ? 'bg-amber-500 ring-4 ring-amber-500/20'
                      : isFuture
                      ? 'border-2 border-zinc-300 dark:border-zinc-700'
                      : 'bg-zinc-400 dark:bg-zinc-600'
                  }`}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs truncate">{entry.label || `Step ${idx + 1}`}</span>
                    {isCurrent && (
                      <span className="text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.2 rounded bg-amber-500 text-zinc-950 shrink-0">
                        Active
                      </span>
                    )}
                  </div>
                  {timeStr && (
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono block">
                      {timeStr}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <button
            onClick={() => onReset && onReset()}
            className="px-3 py-1.5 text-xs font-semibold text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Reset Stack
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
          >
            Done
          </button>
        </div>
      </aside>
    </div>
  );
}
