import React, { useState, useRef } from 'react';
import {
  Layers,
  Download,
  Trash2,
  Play,
  RefreshCw,
  X,
  Film,
  Upload,
  Search,
  CheckCircle2,
  Sparkles,
  HardDrive,
  Clock,
  FileVideo,
  Plus,
} from 'lucide-react';
import { formatBytes } from '../utils/formatters';
import { useToast } from '../context/ToastContext';


function LibraryItemCard({ item, onPlay, onDelete, onAddToBatch }) {
  const [isHovered, setIsHovered] = useState(false);
  const [thumbError, setThumbError] = useState(false);

  const isOutput = item.type !== 'upload';
  const downloadUrl = item.download_url || `/mediapro/api/media/output/${item.filename}`;
  const videoSrc = isOutput
    ? `/mediapro/api/media/output/${item.filename}`
    : item.stream_url || `/mediapro/api/media/upload/${item.video_id}`;
  const thumbUrl = item.thumbnail_url || `/mediapro/api/outputs/${item.filename}/thumbnail`;

  const isAudio = item.filename.endsWith('.mp3') || item.filename.endsWith('.wav');
  const isGif = item.filename.endsWith('.gif');
  const ext = item.filename.split('.').pop()?.toUpperCase() || 'MP4';

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 hover:border-brand-500/60 rounded-2xl p-3 space-y-2.5 transition group shadow-sm hover:shadow-md"
    >
      {/* Thumbnail / Live Hover Preview Box */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-200 dark:border-studio-800 group-hover:border-brand-500/30">
        {!isAudio ? (
          <>
            {/* Live Hover Preview Video */}
            {isHovered && !isGif ? (
              <video
                src={`${videoSrc}#t=0.2`}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-cover animate-in fade-in duration-200"
              />
            ) : !thumbError ? (
              <img
                src={thumbUrl}
                alt={item.filename}
                onError={() => setThumbError(true)}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-900 to-studio-950 text-slate-500">
                <FileVideo className="w-8 h-8 text-brand-500/50 mb-1" />
                <span className="text-[10px] font-mono text-slate-400">Video Preview</span>
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-brand-950 to-studio-900 text-brand-cyan">
            <Sparkles className="w-7 h-7 mb-1 animate-pulse" />
            <span className="text-[10px] font-mono font-bold">Audio Track</span>
          </div>
        )}

        {/* Format & Type Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-[9px] font-mono font-bold text-white uppercase border border-white/10">
            {ext}
          </span>
          {item.type === 'upload' && (
            <span className="px-1.5 py-0.5 rounded bg-brand-600/80 backdrop-blur-md text-[9px] font-sans font-bold text-white">
              Source
            </span>
          )}
        </div>

        {/* Hover Quick Play Overlay */}
        <div
          onClick={() => onPlay(item)}
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer backdrop-blur-[1px]"
        >
          <div className="w-10 h-10 rounded-full bg-brand-600 text-white flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition">
            <Play className="w-5 h-5 ml-0.5" />
          </div>
        </div>
      </div>

      {/* Info Details */}
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-mono font-bold text-slate-900 dark:text-slate-100 truncate" title={item.filename}>
          {item.filename}
        </p>
        <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">{formatBytes(item.size_bytes)}</span>
          <span>{new Date(item.created_at * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center space-x-1.5 pt-1 border-t border-slate-100 dark:border-studio-800 text-xs">
        <button
          onClick={() => onPlay(item)}
          className="flex-1 py-1.5 px-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-[11px] font-bold flex items-center justify-center space-x-1 shadow transition active:scale-95"
        >
          <Play className="w-3 h-3" />
          <span>Open in Studio</span>
        </button>

        {onAddToBatch && (
          <button
            type="button"
            onClick={() => onAddToBatch(item)}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-studio-800 hover:bg-brand-500/20 text-slate-600 dark:text-slate-300 hover:text-brand-500 dark:hover:text-brand-cyan transition"
            title="Stage in Batch Gallery"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}

        <a
          href={downloadUrl}
          download={item.filename}
          className="py-1.5 px-2.5 rounded-xl bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-700 dark:text-slate-200 text-[11px] font-semibold flex items-center justify-center space-x-1 transition"
          title="Download File"
        >
          <Download className="w-3 h-3" />
        </a>

        <button
          type="button"
          onClick={() => onDelete(item)}
          className="p-1.5 rounded-xl bg-slate-100 dark:bg-studio-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition"
          title={`Delete ${item.type === 'upload' ? 'Source' : 'Output'} Video`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function VideoLibrary({
  isOpen,
  onClose,
  outputs = [],
  uploads = [],
  onRefresh,
  onPlayOutput,
  onDeleteOutput,
  isLoading,
  onUploadFile,
  onAddToBatch,
}) {
  const toast = useToast();
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'outputs' | 'uploads'
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Combine items
  const allItems = [
    ...outputs.map((o) => ({ ...o, type: 'output' })),
    ...uploads.map((u) => ({ ...u, type: 'upload' })),
  ].sort((a, b) => (b.created_at || 0) - (a.created_at || 0));

  const filteredItems = allItems.filter((item) => {
    if (filterTab === 'outputs' && item.type !== 'output') return false;
    if (filterTab === 'uploads' && item.type !== 'upload') return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const name = (item.filename || item.video_id || '').toLowerCase();
      return name.includes(q);
    }
    return true;
  });

  const handleBulkUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setIsUploading(true);
    try {
      for (const file of files) {
        if (onUploadFile) {
          await onUploadFile(file);
        } else {
          const formData = new FormData();
          formData.append('file', file);
          await fetch('/mediapro/api/videos/upload', {
            method: 'POST',
            body: formData,
          });
        }
      }
      onRefresh();
      toast.success(`Uploaded ${files.length} ${files.length === 1 ? 'video' : 'videos'} to library!`);
    } catch (err) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };


  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl bg-slate-50 dark:bg-studio-950 border-l border-slate-200 dark:border-studio-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-studio-800 bg-white dark:bg-studio-900 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-cyan">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">Studio Media Library</h2>
                <span className="px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-cyan text-[10px] font-mono font-bold">
                  {filteredItems.length}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Browse renders, hover for live video preview, stage into batch, and open clips in studio
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition active:scale-95"
              title="Import Video File to Library"
            >
              <Upload className={`w-3.5 h-3.5 ${isUploading ? 'animate-bounce' : ''}`} />
              <span>{isUploading ? 'Importing...' : 'Import Video'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,audio/*"
              multiple
              onChange={handleFileInputChange}
              className="hidden"
            />

            <button
              onClick={onRefresh}
              className="p-2 rounded-xl bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-600 dark:text-slate-300 transition"
              title="Refresh Library"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 dark:bg-studio-800 hover:bg-slate-200 dark:hover:bg-studio-700 text-slate-600 dark:text-slate-300 transition"
              title="Close Library"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="p-3.5 border-b border-slate-200 dark:border-studio-800 bg-white/70 dark:bg-studio-900/70 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library clips by filename..."
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-100 dark:bg-studio-850 border border-slate-200 dark:border-studio-800 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-brand-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {[
              { id: 'all', label: `All (${allItems.length})` },
              { id: 'outputs', label: `Exports (${outputs.length})` },
              { id: 'uploads', label: `Sources (${uploads.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl transition text-xs ${
                  filterTab === tab.id
                    ? 'bg-brand-600 text-white font-bold shadow-sm'
                    : 'bg-slate-100 dark:bg-studio-850 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Media Grid / List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {filteredItems.length === 0 ? (
            <div className="text-center py-20 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-slate-200/60 dark:bg-studio-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
                <Film className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  {searchQuery ? 'No matching clips found' : 'No library media yet'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Click "Import Video" above or export a video from the studio
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-brand-500/10 hover:bg-brand-500/20 text-brand-600 dark:text-brand-cyan text-xs font-bold transition inline-flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Video Now</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredItems.map((item, idx) => (
                <LibraryItemCard
                  key={`${item.filename}_${idx}`}
                  item={item}
                  onPlay={(it) => {
                    onPlayOutput(it);
                    onClose();
                  }}
                  onDelete={onDeleteOutput}
                  onAddToBatch={onAddToBatch}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

