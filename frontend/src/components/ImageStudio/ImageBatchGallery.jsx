import React from 'react';
import { Layers, X, Plus, Zap, Image as ImageIcon } from 'lucide-react';

export default function ImageBatchGallery({
  stagedImages,
  onRemoveStaged,
  onOpenBatchModal,
  onOpenLibrary,
  onSelectForEdit,
  onClearAll,
}) {
  if (!stagedImages || stagedImages.length === 0) {
    return (
      <div className="w-full bg-white dark:bg-zinc-950/80 border border-slate-200 dark:border-zinc-800/80 rounded-2xl p-4 flex items-center justify-between shadow-sm dark:shadow-md transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-500 dark:text-zinc-500">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-zinc-300">Batch Staging Gallery</div>
            <div className="text-[11px] text-slate-500 dark:text-zinc-500">
              Stage multiple images to perform bulk resize, format conversion, watermark, or 3D LUT grading.
            </div>
          </div>
        </div>

        <button
          onClick={onOpenLibrary}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-cyan-500/40 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm"
        >
          <Plus className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
          Add from Library
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-zinc-950 border border-cyan-500/40 rounded-2xl p-3.5 shadow-md dark:shadow-2xl flex flex-col gap-3 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">Batch Staging Gallery</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-mono font-bold">
            {stagedImages.length} staged
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearAll}
            className="px-2.5 py-1 rounded-xl text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition"
          >
            Clear All
          </button>

          <button
            onClick={onOpenLibrary}
            className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white font-medium flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add More
          </button>

          <button
            onClick={onOpenBatchModal}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-zinc-950 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition"
          >
            <Zap className="w-3.5 h-3.5 fill-current" />
            Configure & Run Batch
          </button>
        </div>
      </div>

      <div className="flex gap-2.5 overflow-x-auto pb-1">
        {stagedImages.map((img) => {
          const imgId = img.image_id || img.id;
          const thumbUrl = img.thumbnail || img.url || `/mediapro/api/image/thumbnail/${imgId}_thumb.jpg`;
          return (
            <div
              key={imgId}
              className="group relative flex-shrink-0 w-24 h-24 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-100 dark:bg-zinc-900 overflow-hidden shadow-inner cursor-pointer"
              onClick={() => onSelectForEdit && onSelectForEdit(img)}
            >
              <img
                src={thumbUrl}
                alt={img.filename}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveStaged(img.id);
                }}
                className="absolute top-1 right-1 p-1 rounded-full bg-black/70 hover:bg-rose-500 text-white opacity-0 group-hover:opacity-100 transition-all"
                title="Remove from batch"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 inset-x-0 bg-black/70 px-1 py-0.5 text-[8px] text-zinc-300 truncate text-center">
                {img.filename}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
