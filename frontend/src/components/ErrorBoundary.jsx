import React from 'react';
import { AlertTriangle, RefreshCw, Trash2, Copy, Check, ShieldAlert } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('CRITICAL REACT RUNTIME ERROR CAUGHT BY ERROR BOUNDARY:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetStorageAndReload = () => {
    try {
      const keysToClear = [
        'vp_active_video',
        'vp_active_image',
        'vp_staged_videos',
        'vp_selected_staged',
        'vp_selected_staged_ids',
        'vp_batch_job',
        'vp_last_batch_state',
        'vp_image_staged',
        'vp_preset_favorites',
        'vp_studio_settings',
      ];
      keysToClear.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.warn('Storage purge error:', e);
    }
    window.location.reload();
  };

  handleCopyError = () => {
    const errorText = `Media Pro Runtime Exception Report:\n\nError: ${this.state.error?.toString()}\n\nStack:\n${this.state.error?.stack || 'N/A'}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || 'N/A'}`;
    navigator.clipboard.writeText(errorText).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="w-full max-w-2xl bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Top Badge & Header */}
            <div className="flex items-center gap-3.5 border-b border-slate-800 pb-5">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-bold text-white tracking-wide">
                    Media Pro Workstation Recovery
                  </h1>
                  <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    Exception Caught
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  A component error occurred during rendering. The workstation prevented a blank screen crash.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="space-y-2">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Error Details:
              </span>
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 font-mono text-xs text-rose-300 overflow-x-auto max-h-48 custom-scrollbar whitespace-pre-wrap select-text">
                {this.state.error?.toString() || 'Unknown runtime error'}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={this.handleReload}
                  className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-cyan-500/20 active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Reload Studio</span>
                </button>

                <button
                  onClick={this.handleResetStorageAndReload}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs border border-slate-700 transition-all flex items-center gap-2 active:scale-95"
                  title="Purges any corrupt cached state from localStorage and resets workspace"
                >
                  <Trash2 className="w-4 h-4 text-rose-400" />
                  <span>Reset Workspace State</span>
                </button>
              </div>

              <button
                onClick={this.handleCopyError}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs border border-slate-800 transition-all flex items-center gap-1.5"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-semibold">Copied Report</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Error</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
