import os

canvas_path = r"c:\Users\umairwaqas\Projects\VideoProcessor\frontend\src\components\ImageStudio\ImageCanvas.jsx"
matrix_path = r"c:\Users\umairwaqas\Projects\VideoProcessor\frontend\src\components\ImageStudio\ImageToolsMatrix.jsx"

UPGRADED_CANVAS = r'''import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  Sliders,
  Eye,
  Columns,
  Sparkles,
  Crop,
  RotateCw,
  Crosshair,
  Move,
  Check,
} from 'lucide-react';

export default function ImageCanvas({
  activeImage,
  previewImage,
  toolState,
  onUpdateToolState,
  activeTab = 'transforms',
  perspectivePoints,
  onUpdatePerspectivePoints,
}) {
  const [zoom, setZoom] = useState(100);
  const [splitPos, setSplitPos] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [showSplit, setShowSplit] = useState(false);

  // Interaction dragging states
  const [draggingPinIdx, setDraggingPinIdx] = useState(null);
  const [cropDragMode, setCropDragMode] = useState(null); // 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w'
  const dragStartRef = useRef(null);

  const containerRef = useRef(null);
  const imageWrapperRef = useRef(null);

  // Compute live CSS preview filter
  const getCssFilter = () => {
    if (!toolState) return 'none';
    const {
      brightness = 1.0,
      contrast = 1.0,
      saturation = 1.0,
      grayscale = false,
      sharpen = 0,
      blur_type = 'none',
      blur_radius = 0,
    } = toolState;

    let f = `brightness(${brightness}) contrast(${contrast}) saturate(${grayscale ? 0 : saturation})`;
    if (blur_type === 'gaussian' && blur_radius > 0) {
      f += ` blur(${Math.min(blur_radius, 10)}px)`;
    }
    return f;
  };

  // Crop rectangle (Normalized 0.0 - 1.0)
  const cropBox = {
    x: toolState?.crop_x !== undefined && toolState?.crop_x !== null ? toolState.crop_x : 0.05,
    y: toolState?.crop_y !== undefined && toolState?.crop_y !== null ? toolState.crop_y : 0.05,
    w: toolState?.crop_w !== undefined && toolState?.crop_w !== null ? toolState.crop_w : 0.90,
    h: toolState?.crop_h !== undefined && toolState?.crop_h !== null ? toolState.crop_h : 0.90,
  };

  // Update crop box when aspect ratio changes in transforms tab
  useEffect(() => {
    if (activeTab === 'transforms' && activeImage && toolState?.aspect_ratio && toolState.aspect_ratio !== 'original') {
      const ratioMap = {
        '1:1': 1.0,
        '9:16': 9 / 16,
        '16:9': 16 / 9,
        '4:5': 4 / 5,
        '4:3': 4 / 3,
      };
      const targetRatio = ratioMap[toolState.aspect_ratio];
      if (targetRatio) {
        const imgRatio = (activeImage.width || 1920) / (activeImage.height || 1080);
        let w = 0.85;
        let h = 0.85;
        if (imgRatio > targetRatio) {
          // Image is wider than target aspect ratio
          h = 0.85;
          w = (h * targetRatio) / imgRatio;
        } else {
          // Image is taller than target aspect ratio
          w = 0.85;
          h = (w / targetRatio) * imgRatio;
        }
        w = Math.min(0.95, Math.max(0.1, w));
        h = Math.min(0.95, Math.max(0.1, h));
        const x = (1.0 - w) / 2;
        const y = (1.0 - h) / 2;

        onUpdateToolState({
          ...toolState,
          crop_x: parseFloat(x.toFixed(4)),
          crop_y: parseFloat(y.toFixed(4)),
          crop_w: parseFloat(w.toFixed(4)),
          crop_h: parseFloat(h.toFixed(4)),
        });
      }
    }
  }, [toolState?.aspect_ratio]);

  // Perspective Points (Default to 8% margin if not provided)
  const currentPerspectivePts = perspectivePoints || [
    [0.08, 0.08],  // TL
    [0.92, 0.08],  // TR
    [0.92, 0.92],  // BR
    [0.08, 0.92],  // BL
  ];

  // Drag Handlers
  const handleSplitMouseDown = (e) => {
    e.stopPropagation();
    setIsDraggingSplit(true);
  };

  const handlePinMouseDown = (idx, e) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingPinIdx(idx);
  };

  const handleCropStart = (mode, e) => {
    e.stopPropagation();
    e.preventDefault();
    setCropDragMode(mode);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      crop: { ...cropBox },
    };
  };

  // Mouse Move
  const handleMouseMove = useCallback((e) => {
    if (isDraggingSplit && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const pct = Math.max(5, Math.min(95, (x / rect.width) * 100));
      setSplitPos(pct);
    } else if (draggingPinIdx !== null && imageWrapperRef.current && onUpdatePerspectivePoints) {
      // Dragging Perspective Corner Pins
      const rect = imageWrapperRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));
      const normX = parseFloat((x / rect.width).toFixed(4));
      const normY = parseFloat((y / rect.height).toFixed(4));

      const newPts = [...currentPerspectivePts];
      newPts[draggingPinIdx] = [normX, normY];
      onUpdatePerspectivePoints(newPts);
    } else if (cropDragMode && imageWrapperRef.current && dragStartRef.current) {
      // Dragging Crop Box Handles or Moving Window
      const rect = imageWrapperRef.current.getBoundingClientRect();
      const deltaX = (e.clientX - dragStartRef.current.clientX) / rect.width;
      const deltaY = (e.clientY - dragStartRef.current.clientY) / rect.height;
      const initial = dragStartRef.current.crop;

      let newX = initial.x;
      let newY = initial.y;
      let newW = initial.w;
      let newH = initial.h;

      if (cropDragMode === 'move') {
        newX = Math.max(0, Math.min(1 - newW, initial.x + deltaX));
        newY = Math.max(0, Math.min(1 - newH, initial.y + deltaY));
      } else {
        if (cropDragMode.includes('w')) {
          const maxLeft = initial.x + initial.w - 0.05;
          newX = Math.max(0, Math.min(maxLeft, initial.x + deltaX));
          newW = initial.w - (newX - initial.x);
        }
        if (cropDragMode.includes('e')) {
          newW = Math.max(0.05, Math.min(1 - initial.x, initial.w + deltaX));
        }
        if (cropDragMode.includes('n')) {
          const maxTop = initial.y + initial.h - 0.05;
          newY = Math.max(0, Math.min(maxTop, initial.y + deltaY));
          newH = initial.h - (newY - initial.y);
        }
        if (cropDragMode.includes('s')) {
          newH = Math.max(0.05, Math.min(1 - initial.y, initial.h + deltaY));
        }
      }

      onUpdateToolState({
        ...toolState,
        crop_x: parseFloat(newX.toFixed(4)),
        crop_y: parseFloat(newY.toFixed(4)),
        crop_w: parseFloat(newW.toFixed(4)),
        crop_h: parseFloat(newH.toFixed(4)),
      });
    }
  }, [isDraggingSplit, draggingPinIdx, cropDragMode, currentPerspectivePts, cropBox, onUpdatePerspectivePoints, onUpdateToolState, toolState]);

  const handleMouseUp = () => {
    setIsDraggingSplit(false);
    setDraggingPinIdx(null);
    setCropDragMode(null);
    dragStartRef.current = null;
  };

  useEffect(() => {
    if (isDraggingSplit || draggingPinIdx !== null || cropDragMode !== null) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingSplit, draggingPinIdx, cropDragMode, handleMouseMove]);

  if (!activeImage) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-white dark:bg-zinc-950 text-slate-400 dark:text-zinc-500 rounded-2xl border border-slate-200 dark:border-zinc-800/80 p-8 shadow-sm dark:shadow-2xl transition-colors">
        <Sparkles className="w-12 h-12 mb-3 text-cyan-500/50 animate-pulse" />
        <p className="text-base font-semibold text-slate-700 dark:text-zinc-400">No Image Selected</p>
        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">Upload or select an image from the library to begin editing.</p>
      </div>
    );
  }

  const origUrl = activeImage.url || `/mediapro/api/image/uploads/${activeImage.filename}`;
  const currUrl = previewImage || origUrl;

  const isTransformTab = activeTab === 'transforms';
  const isPerspectiveTab = activeTab === 'perspective';

  const pinLabels = ['TL', 'TR', 'BR', 'BL'];
  const pinColors = [
    'from-amber-500 to-orange-500',
    'from-orange-500 to-rose-500',
    'from-rose-500 to-purple-500',
    'from-purple-500 to-indigo-500',
  ];

  // Calculated pixel bounds
  const pxWidth = activeImage.width || 1920;
  const pxHeight = activeImage.height || 1080;
  const cropPxW = Math.round(cropBox.w * pxWidth);
  const cropPxH = Math.round(cropBox.h * pxHeight);

  return (
    <div className="relative w-full h-full flex flex-col bg-white dark:bg-zinc-950 rounded-2xl border border-slate-200 dark:border-zinc-800/80 overflow-hidden shadow-sm dark:shadow-2xl transition-colors">
      {/* Top Canvas Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50/90 dark:bg-zinc-900/90 backdrop-blur border-b border-slate-200 dark:border-zinc-800/80 z-20 transition-colors">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            {activeImage.format || 'IMAGE'}
          </span>
          <span className="text-xs text-slate-600 dark:text-zinc-400 font-mono">
            {pxWidth} × {pxHeight} px
          </span>
          {activeImage.aspect_ratio && (
            <span className="text-xs text-slate-400 dark:text-zinc-500">({activeImage.aspect_ratio})</span>
          )}

          {/* Active Overlay Status Badges */}
          {isTransformTab && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 animate-pulse">
              ✂️ Interactive Crop Box Active ({cropPxW}×{cropPxH} px)
            </span>
          )}
          {isPerspectiveTab && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 animate-pulse">
              📐 4-Corner Perspective Pinning Active
            </span>
          )}
        </div>

        {/* Zoom & Split Controls */}
        <div className="flex items-center gap-2">
          {!isTransformTab && !isPerspectiveTab && (
            <>
              <button
                onClick={() => setShowSplit(!showSplit)}
                title="Toggle Before/After Split View"
                className={`p-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${
                  showSplit
                    ? 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 font-semibold'
                    : 'bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split View</span>
              </button>
              <div className="h-4 w-px bg-slate-300 dark:bg-zinc-800 mx-1" />
            </>
          )}

          <button
            onClick={() => setZoom((z) => Math.max(25, z - 25))}
            className="p-1.5 rounded-lg bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          <span className="text-xs font-mono text-slate-700 dark:text-zinc-400 w-10 text-center">{zoom}%</span>

          <button
            onClick={() => setZoom((z) => Math.min(400, z + 25))}
            className="p-1.5 rounded-lg bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoom(100)}
            className="p-1.5 rounded-lg bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors"
            title="Reset Zoom"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 w-full h-full flex items-center justify-center p-4 overflow-hidden select-none bg-slate-100 dark:bg-zinc-950 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:16px_16px] transition-colors"
      >
        <div
          ref={imageWrapperRef}
          className="relative transition-transform duration-75 origin-center shadow-lg dark:shadow-2xl rounded-lg overflow-visible inline-block max-h-[70vh] max-w-full"
          style={{
            transform: `scale(${zoom / 100})`,
          }}
        >
          {showSplit && !isTransformTab && !isPerspectiveTab ? (
            <div className="relative overflow-hidden flex items-center justify-center">
              {/* Processed / Preview Image with live CSS filters */}
              <img
                src={currUrl}
                alt="Edited Preview"
                className="max-h-[68vh] w-auto object-contain block select-none pointer-events-none"
                style={{ filter: getCssFilter() }}
              />

              {/* Original Before Image Layer (Clipped by splitPos) */}
              <div
                className="absolute inset-0 overflow-hidden pointer-events-none"
                style={{ clipPath: `polygon(0 0, ${splitPos}% 0, ${splitPos}% 100%, 0 100%)` }}
              >
                <img
                  src={origUrl}
                  alt="Original"
                  className="max-h-[68vh] w-auto object-contain block select-none pointer-events-none"
                />
              </div>

              {/* Split Line Divider */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_12px_rgba(6,182,212,0.8)] cursor-ew-resize z-10"
                style={{ left: `${splitPos}%` }}
                onMouseDown={handleSplitMouseDown}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-cyan-500 border-2 border-white shadow-lg flex items-center justify-center text-[10px] text-zinc-950 font-black cursor-ew-resize">
                  ↔
                </div>
              </div>

              {/* Badges */}
              <span className="absolute bottom-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded bg-black/70 text-zinc-100 backdrop-blur z-10 pointer-events-none">
                ORIGINAL
              </span>
              <span className="absolute bottom-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500 text-black font-semibold backdrop-blur z-10 pointer-events-none">
                EDITED
              </span>
            </div>
          ) : (
            <div className="relative inline-block">
              {/* Base Image */}
              <img
                src={currUrl}
                alt="Workspace Preview"
                className="max-h-[68vh] w-auto object-contain block rounded-lg select-none shadow-md"
                style={{ filter: getCssFilter() }}
              />

              {/* ========================================================================= */}
              {/* OVERLAY 1: INTERACTIVE 8-HANDLE VISUAL CROP BOX (TRANSFORM TAB)           */}
              {/* ========================================================================= */}
              {isTransformTab && (
                <div className="absolute inset-0 z-30 pointer-events-auto overflow-hidden rounded-lg">
                  {/* Dimmed Background Overlay around Crop Box */}
                  <div
                    className="absolute border-2 border-cyan-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] cursor-move transition-shadow"
                    style={{
                      left: `${cropBox.x * 100}%`,
                      top: `${cropBox.y * 100}%`,
                      width: `${cropBox.w * 100}%`,
                      height: `${cropBox.h * 100}%`,
                    }}
                    onMouseDown={(e) => handleCropStart('move', e)}
                  >
                    {/* Rule of Thirds 3x3 Grid Lines */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                      <div className="border-r border-b border-cyan-400/30" />
                      <div className="border-r border-b border-cyan-400/30" />
                      <div className="border-b border-cyan-400/30" />
                      <div className="border-r border-b border-cyan-400/30" />
                      <div className="border-r border-b border-cyan-400/30" />
                      <div className="border-b border-cyan-400/30" />
                      <div className="border-r border-cyan-400/30" />
                      <div className="border-r border-cyan-400/30" />
                      <div />
                    </div>

                    {/* Center Move Icon Indicator */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-full bg-cyan-500/80 text-zinc-950 shadow-md opacity-80 group-hover:opacity-100 pointer-events-none">
                      <Move className="w-3.5 h-3.5" />
                    </div>

                    {/* Dimension HUD Badge */}
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono font-bold text-cyan-300 pointer-events-none whitespace-nowrap shadow-lg border border-cyan-500/30">
                      {cropPxW} × {cropPxH} px ({toolState?.aspect_ratio || 'freeform'})
                    </div>

                    {/* 4 Corner Handles */}
                    <div
                      onMouseDown={(e) => handleCropStart('nw', e)}
                      className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-cyan-400 border-2 border-white rounded-sm cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                    />
                    <div
                      onMouseDown={(e) => handleCropStart('ne', e)}
                      className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-cyan-400 border-2 border-white rounded-sm cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                    />
                    <div
                      onMouseDown={(e) => handleCropStart('se', e)}
                      className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-cyan-400 border-2 border-white rounded-sm cursor-nwse-resize shadow-md hover:scale-125 transition-transform"
                    />
                    <div
                      onMouseDown={(e) => handleCropStart('sw', e)}
                      className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-cyan-400 border-2 border-white rounded-sm cursor-nesw-resize shadow-md hover:scale-125 transition-transform"
                    />

                    {/* 4 Edge Handles */}
                    <div
                      onMouseDown={(e) => handleCropStart('n', e)}
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-cyan-400 border border-white rounded-full cursor-ns-resize shadow-md hover:scale-110 transition-transform"
                    />
                    <div
                      onMouseDown={(e) => handleCropStart('s', e)}
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-cyan-400 border border-white rounded-full cursor-ns-resize shadow-md hover:scale-110 transition-transform"
                    />
                    <div
                      onMouseDown={(e) => handleCropStart('w', e)}
                      className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-6 bg-cyan-400 border border-white rounded-full cursor-ew-resize shadow-md hover:scale-110 transition-transform"
                    />
                    <div
                      onMouseDown={(e) => handleCropStart('e', e)}
                      className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-6 bg-cyan-400 border border-white rounded-full cursor-ew-resize shadow-md hover:scale-110 transition-transform"
                    />
                  </div>
                </div>
              )}

              {/* ========================================================================= */}
              {/* OVERLAY 2: INTERACTIVE 4-CORNER PERSPECTIVE PINNING OVERLAY               */}
              {/* ========================================================================= */}
              {isPerspectiveTab && (
                <div className="absolute inset-0 z-30 pointer-events-auto">
                  {/* SVG Polygon & Connector Box */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <polygon
                      points={currentPerspectivePts.map((p) => `${p[0] * 100}%,${p[1] * 100}%`).join(' ')}
                      fill="rgba(245, 158, 11, 0.22)"
                      stroke="#f59e0b"
                      strokeWidth="2.5"
                      strokeDasharray="6,4"
                    />
                    {/* Diagonal Guidelines */}
                    <line
                      x1={`${currentPerspectivePts[0][0] * 100}%`}
                      y1={`${currentPerspectivePts[0][1] * 100}%`}
                      x2={`${currentPerspectivePts[2][0] * 100}%`}
                      y2={`${currentPerspectivePts[2][1] * 100}%`}
                      stroke="rgba(245, 158, 11, 0.3)"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                    <line
                      x1={`${currentPerspectivePts[1][0] * 100}%`}
                      y1={`${currentPerspectivePts[1][1] * 100}%`}
                      x2={`${currentPerspectivePts[3][0] * 100}%`}
                      y2={`${currentPerspectivePts[3][1] * 100}%`}
                      stroke="rgba(245, 158, 11, 0.3)"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                  </svg>

                  {/* 4 Draggable Corner Pins */}
                  {currentPerspectivePts.map((pt, idx) => (
                    <div
                      key={idx}
                      onMouseDown={(e) => handlePinMouseDown(idx, e)}
                      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-40 group"
                      style={{
                        left: `${pt[0] * 100}%`,
                        top: `${pt[1] * 100}%`,
                      }}
                    >
                      {/* Pulse Ring */}
                      <div className="absolute inset-0 -m-1.5 rounded-full bg-amber-400/40 animate-ping pointer-events-none" />

                      {/* Pin Circle */}
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${pinColors[idx]} border-2 border-white shadow-2xl flex items-center justify-center text-[10px] font-black text-white transform group-hover:scale-125 transition-transform`}>
                        {pinLabels[idx]}
                      </div>

                      {/* Tooltip HUD */}
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded bg-black/85 text-[9px] font-mono font-bold text-amber-300 pointer-events-none whitespace-nowrap shadow-lg border border-amber-500/40 opacity-90 group-hover:opacity-100 transition-opacity">
                        {Math.round(pt[0] * 100)}%, {Math.round(pt[1] * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
'''

with open(canvas_path, "w", encoding="utf-8") as f:
    f.write(UPGRADED_CANVAS.strip() + "\n")

print("ImageCanvas.jsx updated with dual interactive Crop & Perspective overlays!")
