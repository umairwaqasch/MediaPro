import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Trash2, Play, Layers, MoveHorizontal } from 'lucide-react';
import { formatTimecode } from '../utils/formatters';

export default function Timeline({
  duration,
  currentTime,
  onSeek,
  startTime,
  endTime,
  onRangeChange,
  thumbnails,
  fps = 30,
  segments = [],
  onSelectSegment,
  onRemoveSegment,
  videoId,
}) {
  const timelineRef = useRef(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [draggingHandle, setDraggingHandle] = useState(null); // 'start' | 'end' | 'range' | 'playhead' | null
  const [dragAnchor, setDragAnchor] = useState(null); // { mouseTime, initialStart, initialEnd }
  const [hoverTime, setHoverTime] = useState(null);

  const startPercent = duration > 0 ? (startTime / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTime / duration) * 100 : 100;
  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const hoverPercent = duration > 0 && hoverTime !== null ? (hoverTime / duration) * 100 : null;

  const getTimeFromMouseEvent = useCallback((e) => {
    if (!timelineRef.current || duration <= 0) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = x / rect.width;
    return ratio * duration;
  }, [duration]);

  const handleMouseDown = (e, type) => {
    e.stopPropagation();
    const time = getTimeFromMouseEvent(e);

    if (type === 'start' || type === 'end') {
      setDraggingHandle(type);
    } else if (type === 'range') {
      setDraggingHandle('range');
      setDragAnchor({
        mouseTime: time,
        initialStart: startTime,
        initialEnd: endTime,
        rangeDuration: endTime - startTime,
      });
    } else {
      // type === 'playhead' or clicking on background track
      setDraggingHandle('playhead');
      setIsDraggingPlayhead(true);
      onSeek(time);
    }
  };

  const handleMouseMoveOverTimeline = (e) => {
    if (draggingHandle) return;
    const time = getTimeFromMouseEvent(e);
    setHoverTime(time);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!draggingHandle && !isDraggingPlayhead) return;
      const time = getTimeFromMouseEvent(e);

      if (draggingHandle === 'start') {
        const newStart = Math.max(0, Math.min(time, endTime - 0.05));
        onRangeChange(newStart, endTime);
      } else if (draggingHandle === 'end') {
        const newEnd = Math.min(duration, Math.max(time, startTime + 0.05));
        onRangeChange(startTime, newEnd);
      } else if (draggingHandle === 'range' && dragAnchor) {
        const delta = time - dragAnchor.mouseTime;
        const rangeDur = dragAnchor.rangeDuration;
        let newStart = dragAnchor.initialStart + delta;
        let newEnd = dragAnchor.initialEnd + delta;

        if (newStart < 0) {
          newStart = 0;
          newEnd = rangeDur;
        } else if (newEnd > duration) {
          newEnd = duration;
          newStart = Math.max(0, duration - rangeDur);
        }

        onRangeChange(newStart, newEnd);
      } else if (draggingHandle === 'playhead' || isDraggingPlayhead) {
        onSeek(time);
      }
    };

    const handleMouseUp = () => {
      setDraggingHandle(null);
      setIsDraggingPlayhead(false);
      setDragAnchor(null);
    };

    if (draggingHandle || isDraggingPlayhead) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingHandle, isDraggingPlayhead, dragAnchor, duration, startTime, endTime, onRangeChange, onSeek, getTimeFromMouseEvent]);

  // Generate ruler tick marks
  const tickCount = 8;
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) => {
    const time = (duration / tickCount) * i;
    return {
      percent: (i / tickCount) * 100,
      label: formatTimecode(time).split('.')[0],
    };
  });

  return (
    <div className="bg-white dark:bg-studio-900 border border-slate-200 dark:border-studio-800 rounded-2xl p-3 sm:p-4 shadow-sm dark:shadow-xl select-none space-y-2 transition-colors">
      {/* Timeline Header Info */}
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-700 dark:text-slate-300 text-[11px]">Timeline</span>
          <span>•</span>
          <span className="font-mono text-[11px]">
            {formatTimecode(duration).split('.')[0]}
          </span>
        </div>
        <div className="flex items-center space-x-2 text-[11px] font-mono">
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            IN: {formatTimecode(startTime).split('.')[0]}
          </span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="text-rose-600 dark:text-rose-400 font-bold">
            OUT: {formatTimecode(endTime).split('.')[0]}
          </span>
          <span className="text-slate-300 dark:text-slate-600">|</span>
          <span className="text-brand-600 dark:text-brand-cyan font-bold bg-brand-500/10 px-1.5 py-0.2 rounded border border-brand-500/20">
            Cut: {formatTimecode(Math.max(0, endTime - startTime))}
          </span>
        </div>
      </div>

      {/* Main Interactive Timeline Box */}
      <div className="relative pt-3 pb-1">
        {/* Ruler Tick Marks */}
        <div className="relative h-3 w-full mb-1">
          {ticks.map((t, idx) => (
            <div
              key={idx}
              className="absolute top-0 transform -translate-x-1/2 flex flex-col items-center pointer-events-none"
              style={{ left: `${t.percent}%` }}
            >
              <div className="h-1.5 w-px bg-slate-300 dark:bg-studio-700" />
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">{t.label}</span>
            </div>
          ))}
        </div>

        {/* Filmstrip & Scrub Container */}
        <div
          ref={timelineRef}
          onMouseDown={(e) => handleMouseDown(e, 'playhead')}
          onMouseMove={handleMouseMoveOverTimeline}
          onMouseLeave={() => setHoverTime(null)}
          className="relative h-16 bg-slate-900 dark:bg-studio-950 rounded-xl cursor-pointer border border-slate-300 dark:border-studio-800 shadow-inner group"
        >
          {/* Inner Filmstrip Viewport (contains thumbnails and waveforms) */}
          <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
            {/* Background Thumbnail Filmstrip */}
            <div className="absolute inset-0 flex items-center opacity-75 group-hover:opacity-95 transition-opacity">
              {thumbnails && thumbnails.length > 0 ? (
                thumbnails.map((thumbUrl, idx) => (
                  <img
                    key={idx}
                    src={thumbUrl}
                    alt={`thumb-${idx}`}
                    className="h-full flex-1 object-cover border-r border-black/30 select-none"
                    loading="lazy"
                  />
                ))
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[11px] font-mono text-slate-500">
                  Visual filmstrip generating...
                </div>
              )}
            </div>

            {/* Audio Waveform Soundwave Overlay */}
            {videoId && (
              <div className="absolute inset-0 flex items-center opacity-40 mix-blend-screen">
                <img
                  src={`/mediapro/api/videos/${videoId}/waveform`}
                  alt="Audio Waveform"
                  className="w-full h-full object-fill select-none filter drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Render Multi-Cut Saved Segments on timeline */}
            {segments.map((seg, sIdx) => {
              const sPct = duration > 0 ? (seg.start_time / duration) * 100 : 0;
              const ePct = duration > 0 ? (seg.end_time / duration) * 100 : 0;
              return (
                <div
                  key={sIdx}
                  className="absolute top-0 bottom-0 bg-brand-cyan/30 border-x border-brand-cyan"
                  style={{
                    left: `${sPct}%`,
                    width: `${Math.max(0.5, ePct - sPct)}%`,
                  }}
                >
                  <span className="absolute top-0 left-0 bg-brand-cyan text-studio-950 text-[8px] font-bold px-0.5 rounded-br">
                    #{sIdx + 1}
                  </span>
                </div>
              );
            })}

            {/* Dimmed Areas Outside Active Range */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-black/65 backdrop-blur-[1px]"
              style={{ width: `${startPercent}%` }}
            />
            <div
              className="absolute top-0 bottom-0 right-0 bg-black/65 backdrop-blur-[1px]"
              style={{ width: `${100 - endPercent}%` }}
            />
          </div>

          {/* Active Cut Region Highlight Box (Interactive Sliding Selection Bar) */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'range')}
            className="absolute top-0 bottom-0 border-y-2 border-brand-500 bg-brand-500/25 hover:bg-brand-500/35 transition-colors cursor-grab active:cursor-grabbing z-10 flex items-center justify-center group/range"
            style={{
              left: `${startPercent}%`,
              width: `${Math.max(0, endPercent - startPercent)}%`,
            }}
            title="Drag to slide entire cut selection range"
          >
            <div className="opacity-0 group-hover/range:opacity-100 transition-opacity bg-black/75 backdrop-blur-md px-1.5 py-0.5 rounded text-[9px] font-mono text-white flex items-center space-x-1 shadow pointer-events-none">
              <MoveHorizontal className="w-2.5 h-2.5 text-brand-cyan" />
              <span>Slide Range</span>
            </div>
          </div>

          {/* Hover Timecode Marker & Cursor Line */}
          {hoverPercent !== null && !draggingHandle && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-25 flex flex-col items-center"
              style={{ left: `${hoverPercent}%` }}
            >
              <div className="absolute -top-5 bg-slate-900 text-white text-[9px] font-mono px-1 py-0.2 rounded shadow">
                {formatTimecode(hoverTime).split('.')[0]}
              </div>
              <div className="w-px h-full bg-white/60 border-dashed" />
            </div>
          )}

          {/* START (IN) Handle */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'start')}
            className="absolute top-0 bottom-0 z-30 transform -translate-x-1/2 cursor-ew-resize group/start flex items-center"
            style={{ left: `${startPercent}%` }}
            title="Drag to adjust Start (IN) marker"
          >
            <div className="w-4 h-full bg-emerald-500 hover:bg-emerald-400 rounded-l-md flex flex-col items-center justify-center shadow-lg transition-colors border-r border-emerald-600">
              <div className="w-0.5 h-5 bg-black/40 rounded-full" />
              <div className="absolute -top-3.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[8px] font-bold px-1 rounded shadow transform scale-90 group-hover/start:scale-100 transition">
                IN
              </div>
            </div>
          </div>

          {/* END (OUT) Handle */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'end')}
            className="absolute top-0 bottom-0 z-30 transform translate-x-[-50%] cursor-ew-resize group/end flex items-center"
            style={{ left: `${endPercent}%` }}
            title="Drag to adjust End (OUT) marker"
          >
            <div className="w-4 h-full bg-rose-500 hover:bg-rose-400 rounded-r-md flex flex-col items-center justify-center shadow-lg transition-colors border-l border-rose-600">
              <div className="w-0.5 h-5 bg-black/40 rounded-full" />
              <div className="absolute -top-3.5 bg-rose-600 hover:bg-rose-500 text-white text-[8px] font-bold px-1 rounded shadow transform scale-90 group-hover/end:scale-100 transition">
                OUT
              </div>
            </div>
          </div>

          {/* Current Playhead Scrubber Handle (Glowing Bar + Top Pointer) */}
          <div
            onMouseDown={(e) => handleMouseDown(e, 'playhead')}
            className="absolute -top-2 bottom-0 z-40 transform -translate-x-1/2 cursor-ew-resize flex flex-col items-center group/playhead"
            style={{ left: `${currentPercent}%` }}
            title="Drag playhead to scrub video"
          >
            {/* Playhead Top Grabber Head */}
            <div className="w-3.5 h-3.5 bg-brand-cyan text-slate-950 rounded-sm rotate-45 transform shadow-lg shadow-brand-cyan/60 flex items-center justify-center group-hover/playhead:scale-125 transition-transform" />
            {/* Vertical Laser Playhead Line */}
            <div className="w-0.5 h-full bg-brand-cyan shadow-[0_0_8px_rgba(6,182,212,0.9)]" />
            {/* Invisible expanded grab hit area */}
            <div className="absolute inset-y-0 -left-3 -right-3 cursor-ew-resize" />
          </div>
        </div>
      </div>

      {/* Multi-Segment Queue Strip */}
      {segments.length > 0 && (
        <div className="pt-1.5 border-t border-slate-200 dark:border-studio-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Layers className="w-3 h-3 text-brand-500" /> Multi-Cut Queue ({segments.length} clips)
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {segments.map((seg, idx) => (
              <div
                key={idx}
                className="flex items-center space-x-1.5 bg-slate-100 dark:bg-studio-850 border border-slate-200 dark:border-studio-700 rounded-lg px-2 py-1 text-[11px] font-mono text-slate-700 dark:text-slate-300 shadow-sm"
              >
                <span className="w-3.5 h-3.5 rounded-full bg-brand-500/20 text-brand-600 dark:text-brand-cyan text-[9px] font-bold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span>
                  {formatTimecode(seg.start_time).split('.')[0]} - {formatTimecode(seg.end_time).split('.')[0]}
                </span>
                <button
                  onClick={() => onSelectSegment && onSelectSegment(seg)}
                  className="text-slate-400 hover:text-brand-500 transition p-0.5"
                  title="Load into player"
                >
                  <Play className="w-2.5 h-2.5" />
                </button>
                <button
                  onClick={() => onRemoveSegment && onRemoveSegment(idx)}
                  className="text-slate-400 hover:text-rose-500 transition p-0.5"
                  title="Remove"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
