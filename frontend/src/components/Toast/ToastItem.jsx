import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, ExternalLink } from 'lucide-react';

const TOAST_ICONS = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
  error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
  info: <Info className="w-5 h-5 text-indigo-400 shrink-0" />,
};

const BORDER_COLORS = {
  success: 'border-emerald-500/30 dark:border-emerald-500/20',
  error: 'border-rose-500/30 dark:border-rose-500/20',
  warning: 'border-amber-500/30 dark:border-amber-500/20',
  info: 'border-indigo-500/30 dark:border-indigo-500/20',
};

const PROGRESS_COLORS = {
  success: 'bg-emerald-500',
  error: 'bg-rose-500',
  warning: 'bg-amber-500',
  info: 'bg-indigo-500',
};

export default function ToastItem({ toast, onDismiss }) {
  const { id, type = 'info', message, title, action, duration } = toast;
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!duration || duration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss(id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [id, duration, onDismiss]);

  return (
    <div
      role="alert"
      className={`relative overflow-hidden w-84 sm:w-96 rounded-xl p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 transform translate-y-0
        bg-white/90 text-zinc-900 border ${BORDER_COLORS[type]}
        dark:bg-zinc-900/90 dark:text-zinc-100
        hover:shadow-indigo-500/10`}
    >
      <div className="flex items-start gap-3">
        {TOAST_ICONS[type] || TOAST_ICONS.info}
        <div className="flex-1 min-w-0 pr-2">
          {title && (
            <h4 className="text-xs font-bold uppercase tracking-wider mb-0.5 text-zinc-700 dark:text-zinc-300">
              {title}
            </h4>
          )}
          <p className="text-sm font-medium leading-snug break-words text-zinc-800 dark:text-zinc-200">
            {message}
          </p>

          {action && (
            <button
              onClick={() => {
                action.onClick?.();
                onDismiss(id);
              }}
              className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-indigo-500/30 transition-colors"
            >
              {action.label}
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>

        <button
          onClick={() => onDismiss(id)}
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors"
          title="Dismiss notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Countdown Progress Bar */}
      {duration > 0 && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-200/50 dark:bg-zinc-800/50 overflow-hidden">
          <div
            className={`h-full transition-all duration-75 ease-linear ${PROGRESS_COLORS[type]}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
