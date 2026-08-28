import React from 'react';
import { Scissors, Layers, RefreshCw, Sun, Moon, Cpu, Zap, Settings, LayoutGrid, Columns, Film, Image as ImageIcon, Activity } from 'lucide-react';
import { useTaskCenter } from '../context/TaskContext';

export default function Header({
  activeVideo,
  onReset,
  onOpenLibrary,
  onOpenSettings,
  outputCount,
  theme,
  onToggleTheme,
  hardwareInfo,
  layoutMode,
  onToggleLayoutMode,
  activeStudioMode = 'video', // 'video' | 'image'
  onToggleStudioMode,
}) {
  const { openDrawer, totalActiveJobs, telemetry } = useTaskCenter();
  const isGpu = hardwareInfo?.is_gpu || telemetry?.nvenc_available;

  return (
    <header className="border-b border-slate-200 dark:border-studio-800 bg-white/90 dark:bg-studio-900/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-6 py-2.5 flex items-center justify-between transition-colors">
      <div className="flex items-center space-x-3 sm:space-x-4">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-cyan flex items-center justify-center shadow-md shadow-brand-500/20">
            <Scissors className="w-4 h-4 text-white transform -rotate-45" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1">
                Media <span className="text-brand-500">Pro</span>
              </h1>
              <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-brand-500/10 text-brand-600 dark:text-brand-cyan border border-brand-500/20">
                ULTIMATE STUDIO
              </span>
            </div>
          </div>
        </div>

        {/* Studio Mode Selector Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-studio-950 p-0.5 rounded-xl border border-slate-200 dark:border-studio-800">
          <button
            onClick={() => onToggleStudioMode && onToggleStudioMode('video')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeStudioMode === 'video'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Video Studio</span>
          </button>

          <button
            onClick={() => onToggleStudioMode && onToggleStudioMode('image')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
              activeStudioMode === 'image'
                ? 'bg-cyan-500 text-zinc-950 shadow-sm'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Image Studio</span>
          </button>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Layout Switcher (Side-by-Side vs Full-Widescreen Stacked) */}
        {activeVideo && (
          <button
            onClick={onToggleLayoutMode}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 border border-slate-200 dark:border-studio-700 text-slate-700 dark:text-slate-300 transition"
            title={`Switch to ${layoutMode === 'stacked' ? 'Side-by-Side' : 'Full-Screen Stacked'} Layout`}
          >
            {layoutMode === 'stacked' ? (
              <>
                <Columns className="w-3.5 h-3.5 text-brand-cyan" />
                <span className="hidden sm:inline">Split View</span>
              </>
            ) : (
              <>
                <LayoutGrid className="w-3.5 h-3.5 text-brand-500" />
                <span className="hidden sm:inline">Full Widescreen</span>
              </>
            )}
          </button>
        )}

        {/* Real-time Hardware Telemetry Pill */}
        <button
          onClick={openDrawer}
          className={`hidden md:flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold border transition cursor-pointer hover:opacity-90 ${
            isGpu
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-slate-100 dark:bg-studio-800 border-slate-200 dark:border-studio-700 text-slate-600 dark:text-slate-400'
          }`}
          title="Click to open Task & Hardware Center"
        >
          {isGpu ? (
            <Zap className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          ) : (
            <Cpu className="w-3.5 h-3.5 text-slate-400" />
          )}
          <span>
            {telemetry.vram_used_gb !== undefined && telemetry.vram_total_gb
              ? `VRAM ${telemetry.vram_used_gb}/${telemetry.vram_total_gb}G`
              : 'CUDA Active'}
          </span>
        </button>

        {/* Global Task Center Button with Active Badge */}
        <button
          onClick={openDrawer}
          className="relative p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 border border-slate-200 dark:border-studio-700 transition"
          title="Open Global Task Center & Background Jobs"
        >
          <Activity className={`w-4 h-4 ${totalActiveJobs > 0 ? 'text-indigo-500 animate-spin' : ''}`} />
          {totalActiveJobs > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
              {totalActiveJobs}
            </span>
          )}
        </button>

        {/* Studio Settings Gear */}
        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 border border-slate-200 dark:border-studio-700 transition"
          title="Studio Settings & Feature Manager"
        >
          <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300 hover:text-brand-500 transition" />
        </button>


        {/* Dark / Light Theme Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 border border-slate-200 dark:border-studio-700 transition"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Theme`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-brand-amber animate-in spin-in-180" />
          ) : (
            <Moon className="w-4 h-4 text-brand-600 animate-in spin-in-180" />
          )}
        </button>

        {activeVideo && (
          <button
            onClick={onReset}
            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 border border-slate-200 dark:border-studio-700 transition"
          >
            <RefreshCw className="w-3 h-3" />
            <span>New Video</span>
          </button>
        )}

        <button
          onClick={onOpenLibrary}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-brand-600 to-brand-700 hover:from-brand-500 hover:to-brand-600 shadow-sm transition relative"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Library</span>
          {outputCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-brand-rose text-[10px] font-bold flex items-center justify-center text-white ml-0.5">
              {outputCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
