import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  Sparkles,
  Download,
  Clock,
  Eye,
  Sliders,
  Image as ImageIcon,
  Play,
  RefreshCw,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

const API_BASE = '/mediapro/api';

export default function FaceExtractorModal({
  isOpen,
  onClose,
  activeVideo,
  onSeekTime,
  onSendToImageStudio,
  showNotification
}) {
  const [sampleRate, setSampleRate] = useState(1.5);
  const [similarityThreshold, setSimilarityThreshold] = useState(0.65);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [taskId, setTaskId] = useState(null);
  const [results, setResults] = useState(null);
  const [viewModes, setViewModes] = useState({}); // { [personId]: 'headshot' | 'fullframe' }
  const [error, setError] = useState(null);

  const videoId = activeVideo?.video_id || activeVideo?.id;

  // Poll task progress
  useEffect(() => {
    if (!isProcessing || !taskId || !videoId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/videos/${videoId}/faces/${taskId}`);
        if (!res.ok) throw new Error('Failed to fetch face extraction status');
        const data = await res.json();

        if (data.status === 'PROGRESS') {
          setProgressPercent(data.percent || 10);
          setProgressMessage(data.message || 'Scanning video frames for faces...');
        } else if (data.status === 'SUCCESS') {
          setIsProcessing(false);
          setProgressPercent(100);
          setResults(data);
          clearInterval(interval);
          if (showNotification) {
            showNotification(`Extracted ${data.total_unique_people || 0} unique people!`, 'success');
          }
        } else if (data.status === 'FAILURE') {
          setIsProcessing(false);
          setError(data.error || 'Face extraction failed');
          clearInterval(interval);
          if (showNotification) {
            showNotification(data.error || 'Face extraction failed', 'error');
          }
        }
      } catch (err) {
        console.error('Face polling error:', err);
      }
    }, 800);

    return () => clearInterval(interval);
  }, [isProcessing, taskId, videoId]);

  if (!isOpen) return null;

  const handleStartExtraction = async () => {
    if (!videoId) {
      if (showNotification) showNotification('Please load a video first', 'warning');
      return;
    }

    setIsProcessing(true);
    setProgressPercent(5);
    setProgressMessage('Initializing neural face detector...');
    setError(null);
    setResults(null);

    try {
      const res = await fetch(`${API_BASE}/videos/${videoId}/faces/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sample_rate_fps: Number(sampleRate),
          similarity_threshold: Number(similarityThreshold),
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || errData.message || 'Failed to start extraction');
      }

      const data = await res.json();
      setTaskId(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setError(err.message);
      if (showNotification) showNotification(err.message, 'error');
    }
  };

  const handleSeek = (seconds) => {
    if (onSeekTime) {
      onSeekTime(seconds);
      if (showNotification) {
        showNotification(`Jumped to timecode ${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`, 'info');
      }
    }
  };

  const handleSendToImageStudio = (person) => {
    if (!onSendToImageStudio) return;

    const imgObj = {
      id: `face_${person.person_id}`,
      filename: person.headshot_filename,
      url: person.headshot_url,
      thumbnail: person.headshot_url,
      width: 300,
      height: 300,
    };

    onSendToImageStudio(imgObj);
    onClose();
    if (showNotification) {
      showNotification(`Sent ${person.display_name} headshot to Image Studio!`, 'success');
    }
  };

  const handleDownloadZip = () => {
    if (!videoId || !taskId) return;
    window.open(`${API_BASE}/videos/${videoId}/faces/${taskId}/download-zip`, '_blank');
  };

  const toggleViewMode = (personId) => {
    setViewModes((prev) => ({
      ...prev,
      [personId]: prev[personId] === 'fullframe' ? 'headshot' : 'fullframe',
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-[#121824] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0f141f]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 text-emerald-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  AI Unique Face Extractor & Best-Shot Gallery
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  YuNet + SFace
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Detects all human faces, de-duplicates identities via 128D neural vectors, and extracts the sharpest photo per person.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          
          {/* Controls Bar */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6">
              {/* Sample Rate */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  Sampling Density: <span className="text-emerald-400 font-bold">{sampleRate} fps</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1.0, 1.5, 2.0, 3.0].map((rate) => (
                    <button
                      key={rate}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setSampleRate(rate)}
                      className={`px-2.5 py-1 text-xs rounded-md border font-medium transition ${
                        sampleRate === rate
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {rate} fps
                    </button>
                  ))}
                </div>
              </div>

              {/* Similarity Threshold */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  Identity Match Threshold: <span className="text-teal-400 font-bold">{similarityThreshold}</span>
                </label>
                <div className="flex items-center gap-2">
                  {[0.55, 0.65, 0.75].map((thresh) => (
                    <button
                      key={thresh}
                      type="button"
                      disabled={isProcessing}
                      onClick={() => setSimilarityThreshold(thresh)}
                      className={`px-2.5 py-1 text-xs rounded-md border font-medium transition ${
                        similarityThreshold === thresh
                          ? 'bg-teal-600 border-teal-500 text-white shadow-sm'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      {thresh === 0.65 ? '0.65 (Optimal)' : thresh}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Scan Action Button */}
            <button
              onClick={handleStartExtraction}
              disabled={isProcessing || !videoId}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 transition shadow-lg ${
                isProcessing
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white border border-emerald-400/30 hover:shadow-emerald-500/20'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Scanning Video...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-emerald-300" />
                  <span>{results ? 'Re-Scan Video' : 'Extract Unique Faces'}</span>
                </>
              )}
            </button>
          </div>

          {/* Processing Progress Strip */}
          {isProcessing && (
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2 animate-pulse">
              <div className="flex justify-between text-xs font-semibold text-emerald-300">
                <span>{progressMessage}</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-300 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30 flex items-center gap-3 text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Results Summary & Gallery */}
          {results && results.people && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>
                    Identified <strong className="text-white">{results.total_unique_people} unique individuals</strong> across{' '}
                    <strong className="text-white">{results.total_faces_detected} detected faces</strong> ({results.execution_time_sec}s)
                  </span>
                </div>

                {results.people.length > 0 && (
                  <button
                    onClick={handleDownloadZip}
                    className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1.5 transition hover:text-white"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download All People (.ZIP)</span>
                  </button>
                )}
              </div>

              {/* People Grid */}
              {results.people.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <UserCheck className="w-12 h-12 mx-auto text-slate-600" />
                  <p className="text-sm font-medium">No human faces were detected with the current settings.</p>
                  <p className="text-xs text-slate-500">Try lowering the minimum face size or increasing the sampling density.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.people.map((person) => {
                    const isFullFrame = viewModes[person.person_id] === 'fullframe';
                    const displayUrl = isFullFrame ? person.fullframe_url : person.headshot_url;

                    return (
                      <div
                        key={person.person_id}
                        className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-xl p-3.5 space-y-3 transition flex flex-col justify-between group"
                      >
                        {/* Top Info Header */}
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                              {person.display_name}
                            </h3>
                            <span className="text-[11px] text-slate-400">
                              {person.total_sightings} appearance{person.total_sightings > 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md">
                              {person.best_quality_score}% Quality
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-md">
                              {person.best_sharpness_score}% Sharp
                            </span>
                          </div>
                        </div>

                        {/* Image Preview with Toggle */}
                        <div className="relative aspect-square rounded-lg bg-black/40 border border-slate-800 overflow-hidden flex items-center justify-center group/img">
                          <img
                            src={displayUrl}
                            alt={person.display_name}
                            className={`w-full h-full object-cover transition-transform duration-300 group-hover/img:scale-105`}
                          />

                          {/* Toggle overlay badge */}
                          <button
                            onClick={() => toggleViewMode(person.person_id)}
                            className="absolute bottom-2 right-2 px-2 py-1 text-[10px] font-medium bg-black/70 hover:bg-black/90 text-slate-200 backdrop-blur-md rounded border border-white/10 flex items-center gap-1 transition"
                          >
                            <Eye className="w-3 h-3 text-emerald-400" />
                            <span>{isFullFrame ? 'Show Headshot' : 'Show Full 4K'}</span>
                          </button>
                        </div>

                        {/* Occurrences / Timeline Chips */}
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-500" />
                            Timeline Appearances:
                          </label>
                          <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto custom-scrollbar pr-1">
                            {person.occurrences.map((occ, idx) => (
                              <button
                                key={idx}
                                onClick={() => handleSeek(occ.timestamp_sec)}
                                className={`px-2 py-0.5 text-[11px] font-mono rounded border transition flex items-center gap-1 ${
                                  Math.abs(occ.timestamp_sec - person.best_timestamp_sec) < 0.1
                                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/80 font-bold'
                                    : 'bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white'
                                }`}
                                title={`Jump to ${occ.timecode} (${occ.quality_score}% quality)`}
                              >
                                <Play className="w-2.5 h-2.5 text-emerald-400 fill-emerald-400" />
                                <span>{occ.timecode}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Card Action Buttons */}
                        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleSendToImageStudio(person)}
                            className="w-full py-1.5 px-2 bg-gradient-to-r from-emerald-600/80 to-teal-600/80 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition border border-emerald-400/20"
                            title="Send directly to Image Studio for AI Background Removal / 3D LUTs"
                          >
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-200" />
                            <span>Edit in Image Studio</span>
                          </button>

                          <a
                            href={person.headshot_url}
                            download={person.headshot_filename}
                            className="w-full py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition border border-slate-700"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-400" />
                            <span>Save JPG</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Initial Instructions if no scan yet */}
          {!results && !isProcessing && (
            <div className="py-10 text-center text-slate-400 space-y-3">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <UserCheck className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-bold text-white">Extract People from Video</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Click <strong>Extract Unique Faces</strong> above to automatically scan all frames, detect individuals, de-duplicate multiple sightings, and rank the sharpest Best-Shot headshot for each person.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-[#0f141f] flex items-center justify-between text-xs text-slate-400">
          <span>Powered by OpenCV YuNet 5ms Detector & SFace Neural Embeddings</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition font-medium border border-slate-700"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
