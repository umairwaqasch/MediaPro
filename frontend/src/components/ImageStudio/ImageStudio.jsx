import React, { useState, useEffect } from 'react';
import ImageCanvas from './ImageCanvas';
import ImageToolsMatrix from './ImageToolsMatrix';
import ImageLibrary from './ImageLibrary';
import ImageBatchGallery from './ImageBatchGallery';
import ImageBatchModal from './ImageBatchModal';
import { Sparkles, Image as ImageIcon, FolderOpen, Layers, UploadCloud } from 'lucide-react';

export default function ImageStudio({
  images,
  onRefreshLibrary,
  onUploadImage,
  onDeleteImage,
  onClearLibrary,
  onOpenLibrary,
}) {
  const [activeImage, setActiveImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);
  const [activeTab, setActiveTab] = useState('transforms');

  // Phase 4 Perspective Transform Points (Normalized 0.0 - 1.0)
  const [perspectivePoints, setPerspectivePoints] = useState([
    [0.08, 0.08],  // TL
    [0.92, 0.08],  // TR
    [0.92, 0.92],  // BR
    [0.08, 0.92],  // BL
  ]);

  // Staged batch images
  const [stagedImages, setStagedImages] = useState(() => {
    try {
      const saved = localStorage.getItem('vp_image_staged');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Tool parameters state
  const [toolState, setToolState] = useState({
    target_width: null,
    target_height: null,
    scale_percent: 100,
    rotate_angle: 0,
    flip_horizontal: false,
    flip_vertical: false,
    aspect_ratio: 'original',
    blur_bg_padding: false,
    brightness: 1.0,
    contrast: 1.0,
    saturation: 1.0,
    exposure: 0.0,
    gamma: 1.0,
    temperature: 0.0,
    grayscale: false,
    lut_preset: 'original',
    sharpen: 0.0,
    blur_type: 'none',
    blur_radius: 0.0,
    denoise: false,
    watermark_text: '',
    output_format: 'JPEG',
    quality: 90,
    optimize: true,
  });

  // Save staged images to localStorage
  useEffect(() => {
    localStorage.setItem('vp_image_staged', JSON.stringify(stagedImages));
  }, [stagedImages]);

  const handleUploadAndSelect = async (file) => {
    if (!file) return null;

    // 1. Instant local preview (0ms UI latency)
    const localBlobUrl = URL.createObjectURL(file);
    const tempItem = {
      id: 'local_' + Date.now(),
      image_id: 'local_' + Date.now(),
      filename: file.name,
      url: localBlobUrl,
      width: 0,
      height: 0,
      is_uploading: true,
    };
    setActiveImage(tempItem);
    setPreviewImage(null);

    // 2. Upload to server in background
    if (onUploadImage) {
      try {
        const data = await onUploadImage(file);
        if (data) {
          const fullItem = {
            ...data,
            id: data.image_id || data.id,
            image_id: data.image_id || data.id,
            url: data.url || `/mediapro/api/image/uploads/${data.filename}`,
            width: data.width || 0,
            height: data.height || 0,
            is_uploading: false,
          };
          setActiveImage(fullItem);
          return fullItem;
        }
      } catch (err) {
        console.error('Upload error in studio:', err);
      }
    }
    return tempItem;
  };

  // Set default active image if available
  useEffect(() => {
    if (!activeImage && images && images.length > 0) {
      setActiveImage(images[0]);
    }
  }, [images]);

  // Handle staging
  const handleAddToBatch = (img) => {
    if (!stagedImages.find((s) => s.id === img.id)) {
      setStagedImages([...stagedImages, img]);
    }
  };

  const handleRemoveStaged = (id) => {
    setStagedImages(stagedImages.filter((s) => s.id !== id));
  };

  // Process Single Image
  const handleProcessImage = async () => {
    if (!activeImage) return;
    setIsProcessing(true);
    try {
      const imageId = activeImage.image_id || activeImage.id;
      const res = await fetch(`/mediapro/api/image/${imageId}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(toolState),
      });
      const data = await res.json();
      if (data.task_id) {
        // Poll for completion
        const interval = setInterval(async () => {
          const statusRes = await fetch(`/mediapro/api/image/batch/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_ids: [data.task_id] }),
          });
          const statusData = await statusRes.json();
          const t = statusData.tasks?.[data.task_id];
          if (t?.state === 'SUCCESS') {
            clearInterval(interval);
            setIsProcessing(false);
            onRefreshLibrary();
            if (t.result?.url) {
              setPreviewImage(t.result.url);
            }
            toast.success('Image processed successfully!');
          } else if (t?.state === 'FAILURE') {
            clearInterval(interval);
            setIsProcessing(false);
            toast.error(`Processing failed: ${t.error}`);
          }
        }, 1000);
      }
    } catch (err) {
      setIsProcessing(false);
      toast.error(`Error processing image: ${err.message}`);
    }
  };

  const handlePerspectiveSuccess = (result) => {
    onRefreshLibrary();
    if (result?.url) {
      const updated = {
        id: result.output_filename || ('out_' + Date.now()),
        image_id: result.output_filename || ('out_' + Date.now()),
        filename: result.output_filename,
        url: result.url,
        width: result.width,
        height: result.height,
        is_uploading: false,
      };
      setActiveImage(updated);
      setPreviewImage(result.url);
      setPerspectivePoints([
        [0.08, 0.08],
        [0.92, 0.08],
        [0.92, 0.92],
        [0.08, 0.92],
      ]);
      setActiveTab('transforms');
    }
  };

  // Run Batch Processing
  const handleRunBatch = async (operation, params) => {
    if (stagedImages.length === 0) return;
    try {
      const imageIds = stagedImages.map((s) => s.image_id || s.id);
      let endpoint = '/mediapro/api/image/batch/process';
      let payload = {
        image_ids: imageIds,
        operation,
        params,
      };

      if (operation === 'ai_cutout') {
        endpoint = '/mediapro/api/image/batch/ai';
        payload = {
          image_ids: imageIds,
          operation: 'bg_remove',
          params: {
            bg_color_hex: params.ai_bg_mode === 'white' ? '#FFFFFF' : params.ai_bg_mode === 'black' ? '#000000' : null,
          },
        };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      const taskIds = data.tasks ? data.tasks.map((t) => t.task_id) : data.task_id ? [data.task_id] : [];
      if (taskIds.length > 0) {
        const interval = setInterval(async () => {
          const statusRes = await fetch(`/mediapro/api/image/batch/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_ids: taskIds }),
          });
          const statusData = await statusRes.json();
          setBatchProgress({
            percent: Math.round((statusData.completed / Math.max(1, statusData.total)) * 100),
          });
          if (statusData.all_done) {
            clearInterval(interval);
            setBatchProgress(null);
            setIsBatchModalOpen(false);
            onRefreshLibrary();
            if (statusData.failed === 0) {
              toast.success(`Batch complete! Processed ${statusData.completed}/${statusData.total} images.`);
            } else {
              toast.warning(`Batch finished: ${statusData.completed} succeeded, ${statusData.failed} failed.`);
            }
          }
        }, 1200);
      }
    } catch (err) {
      toast.error(`Batch error: ${err.message}`);
    }
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Top Image Studio Bar */}
      <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800/80 shadow-sm dark:shadow-xl transition-colors">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-wide text-slate-900 dark:text-white uppercase flex items-center gap-2">
              Image Processing Studio
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border border-cyan-500/20 dark:border-cyan-500/30">
                AI & Creative Vision Pro
              </span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Parametric color grading, 3D LUTs, 4-Point Perspective Scanner Dewarping, and U-2-Net AI Models
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isProcessing && (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-600 dark:text-cyan-400 text-xs font-bold animate-pulse shadow-sm">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-cyan-500" />
              <span>Processing in Background...</span>
            </div>
          )}

          <button
            onClick={onOpenLibrary || (() => setIsLibraryOpen(true))}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-cyan-500/40 text-xs font-semibold text-slate-700 dark:text-zinc-200 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm active:scale-95"
          >
            <FolderOpen className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Media Library ({images.length})
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Left / Top: Interactive Image Canvas (7 cols) */}
        <div className="xl:col-span-7 h-[580px] xl:h-[680px]">
          <ImageCanvas
            activeImage={activeImage}
            previewImage={previewImage}
            toolState={toolState}
            onUpdateToolState={setToolState}
            activeTab={activeTab}
            perspectivePoints={perspectivePoints}
            onUpdatePerspectivePoints={setPerspectivePoints}
            onUploadImage={handleUploadAndSelect}
            onClearCanvas={() => {
              setActiveImage(null);
              setPreviewImage(null);
            }}
          />
        </div>

        {/* Right / Bottom: Dual-Card Tools Matrix (5 cols) */}
        <div className="xl:col-span-5 h-[580px] xl:h-[680px]">
          <ImageToolsMatrix
            toolState={toolState}
            onUpdateToolState={setToolState}
            onExport={handleProcessImage}
            isProcessing={isProcessing}
            activeImage={activeImage}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            perspectivePoints={perspectivePoints}
            onUpdatePerspectivePoints={setPerspectivePoints}
            onPerspectiveSuccess={handlePerspectiveSuccess}
            onUploadImage={async (file) => {
              if (onUploadImage) {
                await handleUploadAndSelect(file);
              }
            }}
          />
        </div>
      </div>

      {/* Bottom Batch Staging Shelf */}
      <div className="mt-2">
        <ImageBatchGallery
          stagedImages={stagedImages}
          onRemoveStaged={handleRemoveStaged}
          onClearAll={() => setStagedImages([])}
          onOpenBatchModal={() => setIsBatchModalOpen(true)}
          onOpenLibrary={onOpenLibrary || (() => setIsLibraryOpen(true))}
          onSelectForEdit={(img) => {
            setActiveImage(img);
            setPreviewImage(null);
          }}
        />
      </div>

      {/* Image Media Library Drawer */}
      <ImageLibrary
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        images={images}
        onSelectImage={(img) => {
          setActiveImage(img);
          setPreviewImage(null);
        }}
        onUploadImage={handleUploadAndSelect}
        onDeleteImage={onDeleteImage}
        onAddToBatch={handleAddToBatch}
      />

      {/* Image Batch Modal */}
      <ImageBatchModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        stagedImages={stagedImages}
        onRunBatch={handleRunBatch}
        batchProgress={batchProgress}
      />
    </div>
  );
}
