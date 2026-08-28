import React, { useRef, useEffect, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, RefreshCw, Volume2 } from 'lucide-react';

export default function AudioWaveformCanvas({
  videoId,
  currentTime = 0,
  duration = 0,
  onSeek,
  inPoint = null,
  outPoint = null,
  height = 120,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [peaks, setPeaks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1); // 1x, 2x, 4x, 8x
  const [isDragging, setIsDragging] = useState(false);

  // Fetch normalized waveform peaks from backend
  const loadWaveform = useCallback(async () => {
    if (!videoId) return;
    try {
      setIsLoading(true);
      const res = await fetch(`/mediapro/api/videos/${videoId}/audio/waveform?points=600`);
      if (res.ok) {
        const data = await res.json();
        setPeaks(data.peaks || []);
      }
    } catch (err) {
      console.error('Failed to load waveform peaks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    loadWaveform();
  }, [loadWaveform]);

  // Draw waveform onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const ch = canvas.height;
    const centerY = ch / 2;

    ctx.clearRect(0, 0, width, ch);

    if (peaks.length === 0) {
      // Draw placeholder dashed line
      ctx.strokeStyle = '#3f3f46';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
      ctx.setLineDash([]);
      return;
    }

    // In / Out selection region highlight
    if (inPoint !== null && outPoint !== null && duration > 0) {
      const inX = (inPoint / duration) * width;
      const outX = (outPoint / duration) * width;
      ctx.fillStyle = 'rgba(99, 102, 241, 0.15)';
      ctx.fillRect(inX, 0, Math.max(2, outX - inX), ch);

      // In/Out boundary lines
      ctx.strokeStyle = '#818cf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(inX, 0);
      ctx.lineTo(inX, ch);
      ctx.moveTo(outX, 0);
      ctx.lineTo(outX, ch);
      ctx.stroke();
    }

    // Draw waveform bars
    const barWidth = width / peaks.length;
    const currentProgress = duration > 0 ? currentTime / duration : 0;
    const playheadX = currentProgress * width;

    // Create gradient for played vs unplayed regions
    const playedGrad = ctx.createLinearGradient(0, 0, 0, ch);
    playedGrad.addColorStop(0, '#6366f1');
    playedGrad.addColorStop(0.5, '#a855f7');
    playedGrad.addColorStop(1, '#6366f1');

    const unplayedGrad = ctx.createLinearGradient(0, 0, 0, ch);
    unplayedGrad.addColorStop(0, '#52525b');
    unplayedGrad.addColorStop(0.5, '#71717a');
    unplayedGrad.addColorStop(1, '#52525b');

    peaks.forEach((peak, i) => {
      const x = i * barWidth;
      const barHeight = Math.max(2, peak * (ch * 0.85));
      const topY = centerY - barHeight / 2;

      ctx.fillStyle = x <= playheadX ? playedGrad : unplayedGrad;
      ctx.fillRect(x, topY, Math.max(1, barWidth - 0.5), barHeight);
    });

    // Draw center zero line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

    // Draw playhead scrubber
    if (duration > 0) {
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 2;
      ctx.shadowColor = '#f43f5e';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, ch);
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Playhead top handle pill
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(playheadX, 6, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [peaks, currentTime, duration, inPoint, outPoint, height]);

  // Handle click / drag seeking
  const handleSeekEvent = (e) => {
    const canvas = canvasRef.current;
    if (!canvas || duration <= 0) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const ratio = clickX / rect.width;
    const targetTime = ratio * duration;
    if (onSeek) {
      onSeek(targetTime);
    }
  };

  return (
    <div ref={containerRef} className="relative rounded-2xl bg-zinc-950 border border-zinc-800 p-3 select-none">
      {/* Header controls & timecode */}
      <div className="flex items-center justify-between mb-2 text-xs">
        <div className="flex items-center gap-2 text-zinc-400">
          <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-mono font-bold text-zinc-200">
            {currentTime.toFixed(2)}s / {duration.toFixed(2)}s
          </span>
          {isLoading && (
            <span className="text-[10px] text-zinc-500 flex items-center gap-1">
              <RefreshCw className="w-3 h-3 animate-spin" /> Analyzing audio...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-[11px]">
          <button
            onClick={() => setZoomLevel((z) => Math.max(1, z / 2))}
            className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-zinc-500 px-1">{zoomLevel}x</span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(8, z * 2))}
            className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Interactive Waveform Canvas */}
      <div className="overflow-x-auto rounded-xl">
        <canvas
          ref={canvasRef}
          width={800 * zoomLevel}
          height={height}
          onMouseDown={(e) => {
            setIsDragging(true);
            handleSeekEvent(e);
          }}
          onMouseMove={(e) => {
            if (isDragging) handleSeekEvent(e);
          }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          className="w-full cursor-pointer bg-zinc-900/80 rounded-xl"
          style={{ height: `${height}px` }}
        />
      </div>
    </div>
  );
}
