import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  Trash2,
  Plus,
  Image as ImageIcon,
  Check,
  Search,
  ExternalLink,
} from 'lucide-react';

export default function ImageLibrary({
  isOpen,
  onClose,
  images,
  onSelectImage,
  onAddToBatch,
  onDeleteImage,
  onUploadImage,
}) {
  const [filter, setFilter] = useState('all'); // 'all' | 'upload' | 'output'
  const [search, setSearch] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const filtered = images.filter((img) => {
    if (filter !== 'all' && img.type !== filter) return false;
    if (search && !img.filename.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      files.forEach((f) => onUploadImage(f));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-5xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/90 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-900/60 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Studio Image Media Library</h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Browse, stage, inspect, or delete image assets ({images.length} files)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 text-zinc-950 font-bold text-xs hover:bg-cyan-400 transition-colors shadow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              Upload Images
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar Filter */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-zinc-800/80 bg-slate-50/50 dark:bg-zinc-900/30 gap-4 transition-colors">
          <div className="flex items-center gap-1.5">
            {['all', 'upload', 'output'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                  filter === f
                    ? 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/40 font-bold'
                    : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                {f === 'upload' ? 'Sources' : f === 'output' ? 'Exports' : 'All Media'}
              </button>
            ))}
          </div>

          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500" />
            <input
              type="text"
              placeholder="Search images..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Grid List */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100/50 dark:bg-transparent">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-zinc-500">
              <ImageIcon className="w-12 h-12 mb-3 text-slate-300 dark:text-zinc-700" />
              <p className="text-sm font-semibold text-slate-600 dark:text-zinc-400">No images match your filter</p>
              <p className="text-xs text-slate-400 dark:text-zinc-600 mt-1">Upload an image or adjust your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map((img) => {
                const imgId = img.image_id || img.id;
                const thumbUrl = img.thumbnail || img.url || `/mediapro/api/image/thumbnail/${imgId}_thumb.jpg`;
                const fullUrl = img.url || `/mediapro/api/image/uploads/${img.filename}`;
                return (
                  <div
                    key={img.id || img.filename}
                    className="group relative bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-cyan-500/60 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all flex flex-col"
                  >
                    {/* Thumbnail Viewport */}
                    <div
                      onClick={() => {
                        onSelectImage(img);
                        onClose();
                      }}
                      className="relative w-full h-36 bg-slate-100 dark:bg-zinc-950 cursor-pointer overflow-hidden flex items-center justify-center"
                    >
                      <img
                        src={thumbUrl}
                        alt={img.filename}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src = fullUrl;
                        }}
                      />
                      <span className="absolute top-2 left-2 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-black/70 text-white backdrop-blur">
                        {img.type}
                      </span>
                    </div>

                    {/* Meta & Actions */}
                    <div className="p-3 flex flex-col gap-1.5 bg-white dark:bg-zinc-900 transition-colors">
                      <div className="text-xs font-semibold text-slate-800 dark:text-zinc-200 truncate" title={img.filename}>
                        {img.filename}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 flex justify-between">
                        <span>{(img.size_bytes ? img.size_bytes / 1024 : 0).toFixed(1)} KB</span>
                        <span>{new Date(img.created_at * 1000).toLocaleDateString()}</span>
                      </div>

                      {/* Action Bar */}
                      <div className="flex items-center gap-1.5 mt-1 pt-2 border-t border-slate-100 dark:border-zinc-800/80">
                        <button
                          onClick={() => {
                            onSelectImage(img);
                            onClose();
                          }}
                          className="flex-1 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold text-[10px] transition"
                        >
                          Select
                        </button>
                        <button
                          onClick={() => onAddToBatch(img)}
                          className="p-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-600 dark:text-zinc-300 transition"
                          title="Stage for Batch"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteImage(imgId, img.type)}
                          className="p-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
