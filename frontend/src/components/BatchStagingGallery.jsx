import React, { useState, useRef } from 'react';
import {
  Layers,
  Upload,
  Sparkles,
  Trash2,
  Play,
  CheckSquare,
  Square,
  Maximize2,
  Film,
  Plus,
  ChevronUp,
  ChevronDown,
  X,
  FileVideo,
  Zap,
} from 'lucide-react';
import { formatBytes, formatTimecode } from '../utils/formatters';

export default function BatchStagingGallery({
  stagedVideos = [],
  selectedIds = [],
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
  onRemoveStaged,
  onClearAll,
  onAddFiles,
  onOpenBatchModal,
  onLoadToEditor,
  isProcessingBatch,
  batchProgress,
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = useRef(null);

  const totalDuration = stagedVideos.reduce((acc, v) => acc + (v.metadata?.duration || 0), 0);
  const totalBytes = stagedVideos.reduce((acc, v) => acc + (v.metadata?.size_bytes || 0), 0);
  const selectedCount = selectedIds.length;
  const allSelected = stagedVideos.length > 0 && selectedCount === stagedVideos.length;

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(e.target.files);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`rounded-2xl border transition-all duration-200 shadow-md ${
        isDraggingOver
          ? 'border-brand-500 bg-brand-500/10 ring-2 ring-brand-500/40'
          : 'border-slate-200 dark:border-studio-800 bg-white/95 dark:bg-studio-900/95 backdrop-blur-md'
      }`}
    >
      {/* Top Header Bar */}
      <div className="px-4 py-2.5 flex items-center justify-between border-b border-slate-100 dark:border-studio-800/80">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-tr from-brand-600 to-brand-cyan text-white shadow-sm">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white">Batch Staging Gallery</span>
                <span className="px-2 py-0.2 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-cyan text-[10px] font-mono font-bold">
                  {stagedVideos.length} {stagedVideos.length === 1 ? 'Clip' : 'Clips'}
                </span>
                {selectedCount > 0 && (
                  <span className="px-2 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-mono font-bold">
                    {selectedCount} Selected
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Stats Capsule */}
          {stagedVideos.length > 0 && (
            <div className="hidden sm:flex items-center space-x-2 text-[10px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-studio-800/60 px-2.5 py-1 rounded-lg">
              {totalDuration > 0 && <span>Duration: {formatTimecode(totalDuration).split('.')[0]}</span>}
              {totalBytes > 0 && <span>• {formatBytes(totalBytes)}</span>}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          {stagedVideos.length > 0 && (
            <>
              <button
                type="button"
                onClick={allSelected ? onDeselectAll : onSelectAll}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 transition"
                title={allSelected ? 'Deselect All' : 'Select All'}
              >
                {allSelected ? <CheckSquare className="w-3.5 h-3.5 text-brand-cyan" /> : <Square className="w-3.5 h-3.5" />}
                <span className="hidden md:inline">{allSelected ? 'Deselect' : 'Select All'}</span>
              </button>

              <button
                type="button"
                onClick={onClearAll}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition"
                title="Clear All Staged Clips"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Add / Import File Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 border border-slate-200 dark:border-studio-700 transition active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 text-brand-500" />
            <span>Add Clips</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,audio/*"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />

          {/* Primary Batch Action Button */}
          <button
            type="button"
            onClick={onOpenBatchModal}
            disabled={selectedCount === 0 || isProcessingBatch}
            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold shadow transition active:scale-95 ${
              selectedCount > 0 && !isProcessingBatch
                ? 'bg-gradient-to-r from-brand-600 via-brand-500 to-brand-cyan text-white shadow-brand-500/25 animate-pulse'
                : 'bg-slate-200 dark:bg-studio-800 text-slate-400 cursor-not-allowed opacity-60'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-white" />
            <span>Batch Process ({selectedCount})</span>
          </button>

          {/* Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Shelf Content */}
      {isExpanded && (
        <div className="p-3">
          {stagedVideos.length === 0 ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-studio-750 hover:border-brand-500/70 rounded-xl py-6 px-4 text-center cursor-pointer transition bg-slate-50/50 dark:bg-studio-950/40 group flex flex-col items-center justify-center space-y-1.5"
            >
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 text-brand-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-5 h-5 text-brand-500" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Drag & Drop Multiple Videos Here to Stage Batch Processing
                </p>
                <p className="text-[11px] text-slate-400">
                  Or click to browse files from your computer (4K Upscale, Social Crop 9:16, Audio Master, LUTs)
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
              {stagedVideos.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const thumbUrl = item.thumbnail_url || (item.thumbnails && item.thumbnails[0] ? `/mediapro/api/media/thumbnail/${item.thumbnails[0]}` : null);
                const resolution = item.metadata ? `${item.metadata.width}x${item.metadata.height}` : '';
                const is4K = item.metadata?.width >= 3840;
                const isHD = item.metadata?.width >= 1920 && !is4K;

                return (
                  <div
                    key={item.id}
                    className={`relative rounded-xl border p-2 transition flex flex-col justify-between group text-left ${
                      isSelected
                        ? 'bg-brand-500/10 border-brand-500 shadow-sm'
                        : 'bg-slate-50 dark:bg-studio-850/60 border-slate-200 dark:border-studio-800 hover:border-slate-400 dark:hover:border-studio-700'
                    }`}
                  >
                    {/* Select Checkbox Top Left */}
                    <button
                      type="button"
                      onClick={() => onToggleSelect(item.id)}
                      className="absolute top-3 left-3 z-20 p-1 rounded-md bg-black/60 backdrop-blur-md text-white hover:scale-110 transition"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-brand-cyan" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-300" />
                      )}
                    </button>

                    {/* Delete Item Top Right */}
                    <button
                      type="button"
                      onClick={() => onRemoveStaged(item.id)}
                      className="absolute top-3 right-3 z-20 p-1 rounded-md bg-black/60 backdrop-blur-md text-slate-300 hover:text-rose-400 hover:bg-black/80 transition opacity-0 group-hover:opacity-100"
                      title="Remove from batch"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    {/* Thumbnail Box */}
                    <div
                      onClick={() => onToggleSelect(item.id)}
                      className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-950 flex items-center justify-center cursor-pointer mb-2"
                    >
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt={item.filename}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <FileVideo className="w-6 h-6 text-slate-600" />
                      )}

                      {/* Resolution Badge */}
                      {resolution && (
                        <span className={`absolute bottom-1 right-1 px-1 py-0.2 rounded text-[8px] font-mono font-bold text-white backdrop-blur-md ${
                          is4K ? 'bg-emerald-600/90' : isHD ? 'bg-brand-600/90' : 'bg-black/70'
                        }`}>
                          {is4K ? '4K UHD' : isHD ? '1080p' : resolution}
                        </span>
                      )}

                      {/* Duration Tag */}
                      {item.metadata?.duration > 0 && (
                        <span className="absolute bottom-1 left-1 px-1 py-0.2 rounded text-[8px] font-mono text-slate-200 bg-black/75 backdrop-blur-md">
                          {formatTimecode(item.metadata.duration).split('.')[0]}
                        </span>
                      )}
                    </div>

                    {/* Title & Stats */}
                    <div className="space-y-1">
                      <p className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 truncate" title={item.filename}>
                        {item.filename}
                      </p>
                      <div className="flex items-center justify-between text-[9px] text-slate-500 font-mono">
                        <span>{item.metadata?.size_bytes ? formatBytes(item.metadata.size_bytes) : ''}</span>
                        {item.metadata?.fps && <span>{item.metadata.fps} FPS</span>}
                      </div>
                    </div>

                    {/* Quick Open in Editor Button */}
                    <button
                      type="button"
                      onClick={() => onLoadToEditor(item)}
                      className="mt-2 w-full py-1 rounded-lg bg-slate-200 dark:bg-studio-800 hover:bg-brand-600 hover:text-white text-[10px] font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 transition"
                    >
                      <Play className="w-2.5 h-2.5" />
                      <span>Edit In Studio</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
