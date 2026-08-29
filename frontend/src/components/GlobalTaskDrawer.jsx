import React from 'react';
import {
  X,
  Activity,
  Cpu,
  HardDrive,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Trash2,
  StopCircle,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { useTaskCenter } from '../context/TaskContext';

export default function GlobalTaskDrawer() {
  const {
    isDrawerOpen,
    closeDrawer,
    activeBatches,
    activeTasks,
    telemetry,
    totalActiveJobs,
    cancelBatch,
    cancelTask,
    clearCompleted,
    refreshTelemetry,
  } = useTaskCenter();

  if (!isDrawerOpen) return null;

  const vramPercent = telemetry?.vram_total_gb
    ? Math.min(100, Math.round(((telemetry?.vram_used_gb || 0) / telemetry.vram_total_gb) * 100))
    : 0;

  const ramPercent = telemetry?.ram_total_gb
    ? Math.min(100, Math.round(((telemetry?.ram_used_gb || 0) / telemetry.ram_total_gb) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-[9990] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={closeDrawer}
      />

      {/* Drawer Panel */}
      <aside
        className="relative z-10 w-full max-w-lg h-full shadow-2xl flex flex-col transition-transform transform translate-x-0
          bg-white text-zinc-900 border-l border-zinc-200
          dark:bg-zinc-950 dark:text-zinc-100 dark:border-zinc-800"
      >
        {/* Top Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">Task & Hardware Center</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {totalActiveJobs > 0
                  ? `${totalActiveJobs} active background ${totalActiveJobs === 1 ? 'job' : 'jobs'}`
                  : 'All queues idle'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={refreshTelemetry}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Refresh telemetry"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              onClick={closeDrawer}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Hardware Telemetry Bar */}
        <div className="p-4 bg-zinc-50/80 dark:bg-zinc-900/60 border-b border-zinc-200 dark:border-zinc-800/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-700 dark:text-zinc-300">
              <Cpu className="w-4 h-4 text-emerald-500" />
              <span>{telemetry?.gpu_name || 'NVIDIA GPU Acceleration'}</span>
            </div>
            {telemetry?.gpu_temp_c && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                {telemetry.gpu_temp_c}°C
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* GPU VRAM */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
              <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                <span>GPU VRAM</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {telemetry.vram_used_gb ?? 0} / {telemetry.vram_total_gb ?? 6} GB
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${vramPercent}%` }}
                />
              </div>
            </div>

            {/* System RAM */}
            <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
              <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                <span>RAM</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {telemetry.ram_used_gb ?? 0} / {telemetry.ram_total_gb ?? 16} GB
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${ramPercent}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Task List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Active Batches */}
          {activeBatches.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Active Batch Pipelines ({activeBatches.length})
              </h3>

              {activeBatches.map((batch) => (
                <div
                  key={batch.batch_id}
                  className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-800 dark:text-zinc-100 capitalize">
                          {batch.operation?.replace(/_/g, ' ')} Batch
                        </span>
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          {batch.media_type}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        {batch.completed_items}/{batch.total_items} items processed ({batch.overall_percent}%)
                      </p>
                    </div>

                    {!batch.is_all_finished && (
                      <button
                        onClick={() => cancelBatch(batch.batch_id)}
                        className="px-2 py-1 text-xs font-semibold rounded-lg bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400 transition-colors flex items-center gap-1"
                        title="Cancel batch"
                      >
                        <StopCircle className="w-3 h-3" />
                        Cancel
                      </button>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden mb-2">
                    <div
                      className={`h-full transition-all duration-300 ${
                        batch.status === 'COMPLETED'
                          ? 'bg-emerald-500'
                          : batch.status === 'PARTIAL_FAILURE'
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${batch.overall_percent}%` }}
                    />
                  </div>

                  {/* Per-item mini chips */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {batch.tasks?.slice(0, 6).map((task, i) => (
                      <span
                        key={task.task_id || i}
                        className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          task.status === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                            : task.status === 'FAILURE'
                            ? 'bg-rose-500/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                            : task.status === 'PROGRESS'
                            ? 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 animate-pulse'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                        }`}
                      >
                        {task.status === 'SUCCESS' && <CheckCircle2 className="w-2.5 h-2.5" />}
                        {task.status === 'FAILURE' && <AlertTriangle className="w-2.5 h-2.5" />}
                        {task.item_id?.slice(0, 8)}: {task.percent}%
                      </span>
                    ))}
                    {batch.tasks?.length > 6 && (
                      <span className="text-[10px] text-zinc-400 self-center">
                        +{batch.tasks.length - 6} more
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active Single Tasks */}
          {activeTasks.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Single Jobs ({activeTasks.length})
              </h3>
              {activeTasks.map((t) => (
                <div
                  key={t.task_id}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      {t.name || t.task_id.slice(0, 8)}
                    </span>
                    <button
                      onClick={() => cancelTask(t.task_id)}
                      className="text-xs text-rose-500 hover:text-rose-600 font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${t.percent || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {totalActiveJobs === 0 && (
            <div className="text-center py-16 px-4">
              <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-400 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                No Running Jobs
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-xs mx-auto">
                Any video cut, batch transcode, or image AI operation will appear here in the background without interrupting your workflow.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <button
            onClick={clearCompleted}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Finished
          </button>

          <button
            onClick={closeDrawer}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
          >
            Done
          </button>
        </div>
      </aside>
    </div>
  );
}
