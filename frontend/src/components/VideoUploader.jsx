import React, { useState, useRef } from 'react';
import { Upload, AlertCircle } from 'lucide-react';

export default function VideoUploader({ onVideoUploaded, onMultipleFilesUploaded, isUploading, uploadProgress }) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (e.dataTransfer.files.length > 1 && onMultipleFilesUploaded) {
        onMultipleFilesUploaded(e.dataTransfer.files);
      } else {
        processFile(e.dataTransfer.files[0]);
      }
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      if (e.target.files.length > 1 && onMultipleFilesUploaded) {
        onMultipleFilesUploaded(e.target.files);
      } else {
        processFile(e.target.files[0]);
      }
    }
  };

  const processFile = (file) => {
    setError(null);
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mkv|mov|webm|avi|flv|ts|m4v)$/i)) {
      setError('Please select a valid video file (MP4, MKV, MOV, WebM, AVI, TS).');
      return;
    }
    onVideoUploaded(file);
  };

  return (
    <div className="w-full max-w-3xl mx-auto my-8 px-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative group border-2 border-dashed rounded-3xl p-10 text-center transition-all cursor-pointer overflow-hidden ${
          isDragging
            ? 'border-brand-500 bg-brand-500/10 scale-[1.01] shadow-xl'
            : 'border-slate-300 dark:border-studio-700 hover:border-brand-500/60 bg-white/70 dark:bg-studio-900/60 hover:bg-white dark:hover:bg-studio-900/90 shadow-sm'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="video/*,.mkv,.mov,.webm,.avi,.ts"
          multiple
          className="hidden"
          disabled={isUploading}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-studio-800 border border-slate-200 dark:border-studio-700 flex items-center justify-center text-brand-500 group-hover:scale-105 transition-all shadow">
            {isUploading ? (
              <div className="w-7 h-7 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-7 h-7" />
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {isUploading ? 'Uploading & Analyzing Video...' : 'Drag & Drop your video here'}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              MP4, MKV, MOV, WebM. Automatic frame-accurate indexing & timeline generation.
            </p>
          </div>

          {isUploading ? (
            <div className="w-full max-w-xs space-y-1.5 pt-1">
              <div className="h-2 w-full bg-slate-200 dark:bg-studio-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-brand-600 to-brand-cyan transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress || 10}%` }}
                />
              </div>
              <p className="text-[11px] font-mono text-slate-500">{uploadProgress ? `${uploadProgress}%` : 'Processing...'}</p>
            </div>
          ) : (
            <div className="pt-1 flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-studio-800 border border-slate-200 dark:border-studio-700 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                Max 4GB
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-studio-800 border border-slate-200 dark:border-studio-700 text-[11px] font-mono text-slate-600 dark:text-slate-300">
                Frame-Accurate
              </span>
            </div>
          )}

          {error && (
            <div className="flex items-center space-x-1.5 text-brand-rose text-xs bg-rose-50 dark:bg-brand-rose/10 border border-rose-200 dark:border-brand-rose/20 px-3 py-1.5 rounded-lg mt-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
