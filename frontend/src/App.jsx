import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import VideoUploader from './components/VideoUploader';
import VideoPlayer from './components/VideoPlayer';
import Timeline from './components/Timeline';
import CutControls from './components/CutControls';
import ProgressModal from './components/ProgressModal';
import VideoLibrary from './components/VideoLibrary';
import SettingsModal, { DEFAULT_SETTINGS } from './components/SettingsModal';
import BatchStagingGallery from './components/BatchStagingGallery';
import BatchProcessModal from './components/BatchProcessModal';
import ImageStudio from './components/ImageStudio/ImageStudio';
import GlobalTaskDrawer from './components/GlobalTaskDrawer';
import { saveFileToDirectory, getActiveDirectoryHandle } from './utils/fileSystem';
import { useToast } from './context/ToastContext';
import { useTaskCenter } from './context/TaskContext';

export default function App() {
  const toast = useToast();
  const { registerBatch } = useTaskCenter();

  // Theme State ('dark' | 'light')

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('vp_theme') || 'dark';
  });

  // Studio Settings State with localStorage persistence
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('vp_studio_settings');
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  // Active Studio Mode ('video' | 'image') with localStorage persistence
  const [activeStudioMode, setActiveStudioMode] = useState(() => {
    return localStorage.getItem('vp_studio_mode') || 'video';
  });

  const handleToggleStudioMode = (mode) => {
    setActiveStudioMode(mode);
    localStorage.setItem('vp_studio_mode', mode);
  };

  // Image Studio Library State
  const [imageLibrary, setImageLibrary] = useState([]);
  const [isImageLoading, setIsImageLoading] = useState(false);

  const fetchImageLibrary = async () => {
    try {
      setIsImageLoading(true);
      const res = await fetch('/mediapro/api/image/library/all');
      if (res.ok) {
        const data = await res.json();
        setImageLibrary(data.items || []);
      }
    } catch (err) {
      console.error('Failed to fetch image library:', err);
    } finally {
      setIsImageLoading(false);
    }
  };

  useEffect(() => {
    fetchImageLibrary();
  }, []);

  const handleUploadImageFile = async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/mediapro/api/image/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        await fetchImageLibrary();
      }
    } catch (err) {
      console.error('Error uploading image:', err);
    }
  };

  const handleDeleteImageItem = async (item) => {
    try {
      const endpoint =
        item.type === 'upload'
          ? `/mediapro/api/image/uploads/${item.id || item.image_id}`
          : `/mediapro/api/image/outputs/${item.filename}`;
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        setImageLibrary((prev) => prev.filter((i) => i.id !== item.id));
      }
    } catch (err) {
      console.error('Error deleting image item:', err);
    }
  };


  const handleUpdateSettings = (newSettings) => {
    setSettings(newSettings);
    try {
      localStorage.setItem('vp_studio_settings', JSON.stringify(newSettings));
    } catch (e) {
      console.error('Failed to save settings to localStorage:', e);
    }
  };

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('vp_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Video State with localStorage persistence
  const [activeVideo, setActiveVideo] = useState(() => {
    try {
      const saved = localStorage.getItem('vp_active_video');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [currentTime, setCurrentTime] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const [thumbnails, setThumbnails] = useState([]);

  // Multi-Cut Segments Queue
  const [segments, setSegments] = useState([]);

  // Live Color Grade Preview State
  const [colorGradeSettings, setColorGradeSettings] = useState(null);

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Task & Progress State
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [taskStatus, setTaskStatus] = useState('PENDING');
  const [taskPercent, setTaskPercent] = useState(0);
  const [taskSpeed, setTaskSpeed] = useState('');
  const [taskMessage, setTaskMessage] = useState('');
  const [taskResult, setTaskResult] = useState(null);
  const [taskError, setTaskError] = useState(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);

  // Output Library State
  const [outputs, setOutputs] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);

  // Batch Processing & Staging Gallery State with localStorage persistence
  const [stagedVideos, setStagedVideos] = useState(() => {
    try {
      const saved = localStorage.getItem('vp_staged_videos');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [selectedStagedIds, setSelectedStagedIds] = useState(() => {
    try {
      const saved = localStorage.getItem('vp_selected_staged_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [batchJobState, setBatchJobState] = useState(() => {
    try {
      const saved = localStorage.getItem('vp_last_batch_state');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sync to localStorage
  useEffect(() => {
    if (activeVideo) {
      localStorage.setItem('vp_active_video', JSON.stringify(activeVideo));
    } else {
      localStorage.removeItem('vp_active_video');
    }
  }, [activeVideo]);

  useEffect(() => {
    localStorage.setItem('vp_staged_videos', JSON.stringify(stagedVideos));
  }, [stagedVideos]);

  useEffect(() => {
    localStorage.setItem('vp_selected_staged_ids', JSON.stringify(selectedStagedIds));
  }, [selectedStagedIds]);

  useEffect(() => {
    if (batchJobState) {
      localStorage.setItem('vp_last_batch_state', JSON.stringify(batchJobState));
    }
  }, [batchJobState]);

  // Layout Mode: 'side_by_side' (Split) or 'stacked' (Full Widescreen Stacked)
  const [layoutMode, setLayoutMode] = useState(() => localStorage.getItem('vp_layout_mode') || 'side_by_side');

  const handleToggleLayoutMode = () => {
    setLayoutMode((prev) => {
      const next = prev === 'side_by_side' ? 'stacked' : 'side_by_side';
      localStorage.setItem('vp_layout_mode', next);
      return next;
    });
  };

  // Hardware Acceleration State
  const [hardwareInfo, setHardwareInfo] = useState(null);

  // Fetch Outputs & Library Media
  const fetchOutputs = async () => {
    setIsLibraryLoading(true);
    try {
      const res = await fetch('/mediapro/api/library/all');
      if (res.ok) {
        const data = await res.json();
        setOutputs(data.outputs || []);
        setUploads(data.uploads || []);
      } else {
        const fallbackRes = await fetch('/mediapro/api/outputs');
        if (fallbackRes.ok) {
          const fb = await fallbackRes.json();
          setOutputs(fb.outputs || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch library media:', err);
    } finally {
      setIsLibraryLoading(false);
    }
  };

  const handleUploadDirectToLibrary = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/mediapro/api/library/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Upload failed');
    }
    fetchOutputs();
  };

  // Staging Gallery Management
  const handleAddFilesToStaging = async (files) => {
    const fileList = Array.from(files);
    for (const file of fileList) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/mediapro/api/library/upload', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          const data = await res.json();
          const stagedItem = {
            id: data.video_id,
            filename: data.filename,
            metadata: data.metadata,
            videoSrc: data.url,
            thumbnail_url: `/mediapro/api/media/thumbnail/${data.video_id}_thumb_0000.jpg`,
            type: 'upload',
          };
          setStagedVideos((prev) => {
            if (prev.some((p) => p.id === stagedItem.id)) return prev;
            return [...prev, stagedItem];
          });
          setSelectedStagedIds((prev) => [...prev, stagedItem.id]);

          // Auto-load as active video if none is active
          setActiveVideo((cur) => cur || stagedItem);
        }
      } catch (e) {
        console.error('Failed to stage file:', e);
      }
    }
    fetchOutputs();
  };

  const handleToggleSelectStaged = (id) => {
    setSelectedStagedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAllStaged = () => {
    setSelectedStagedIds(stagedVideos.map((v) => v.id));
  };

  const handleDeselectAllStaged = () => {
    setSelectedStagedIds([]);
  };

  const handleRemoveStaged = (id) => {
    setStagedVideos((prev) => prev.filter((v) => v.id !== id));
    setSelectedStagedIds((prev) => prev.filter((i) => i !== id));
  };

  const handleClearAllStaged = () => {
    setStagedVideos([]);
    setSelectedStagedIds([]);
  };

  const handleLoadStagedToEditor = (item) => {
    handlePlayOutput(item);
  };

  const handleStartBatchProcess = async ({ video_ids, operation, params }) => {
    try {
      const res = await fetch('/mediapro/api/batch/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_ids,
          operation,
          params,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || 'Batch launch failed');
      }

      const data = await res.json();
      const taskIds = data.tasks.map((t) => t.task_id);

      registerBatch({
        batch_id: data.batch_id,
        media_type: 'video',
        operation,
        total_items: data.total_tasks,
        completed_items: 0,
        failed_items: 0,
        overall_percent: 0,
        is_all_finished: false,
        tasks: data.tasks,
      });

      setBatchJobState({
        isRunning: true,
        isCompleted: false,
        batchId: data.batch_id,
        totalTasks: data.total_tasks,
        completedCount: 0,
        failedCount: 0,
        overallPercent: 0,
        tasks: data.tasks.map((t) => ({ ...t, state: 'PROGRESS', percent: 0 })),
      });

      // Poll batch status every 800ms
      const interval = setInterval(async () => {
        try {
          const statusRes = await fetch('/mediapro/api/batch/status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_ids: taskIds }),
          });

          if (statusRes.ok) {
            const stData = await statusRes.json();
            setBatchJobState((prev) => ({
              ...prev,
              completedCount: stData.completed_count,
              failedCount: stData.failed_count,
              overallPercent: stData.overall_percent,
              tasks: stData.tasks,
              isCompleted: stData.is_all_finished,
              isRunning: !stData.is_all_finished,
            }));

            if (stData.is_all_finished) {
              clearInterval(interval);
              fetchOutputs();
              if (stData.failed_count === 0) {
                toast.success(`Batch "${operation}" completed! (${stData.completed_count}/${stData.total_tasks} videos)`);
              } else {
                toast.warning(`Batch completed with ${stData.failed_count} errors`);
              }
            }
          }
        } catch (pollErr) {
          console.error('Batch poll error:', pollErr);
        }
      }, 800);
    } catch (err) {
      toast.error(`Failed to start batch: ${err.message}`);
    }
  };


  useEffect(() => {
    fetchOutputs();

    // Fetch hardware acceleration capabilities
    fetch('/mediapro/api/system/acceleration')
      .then((res) => res.json())
      .then((data) => setHardwareInfo(data))
      .catch((err) => console.error('Failed to fetch hardware acceleration info:', err));
  }, []);

  // Poll for thumbnails (stops once thumbnails are loaded or after 10 attempts)
  useEffect(() => {
    if (!activeVideo?.id) return;

    let isMounted = true;
    let attempts = 0;
    let intervalId = null;

    const fetchThumbs = async () => {
      attempts++;
      try {
        const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/thumbnails`);
        if (res.ok) {
          const data = await res.json();
          if (data.thumbnails && data.thumbnails.length > 0 && isMounted) {
            setThumbnails(data.thumbnails);
            if (intervalId) clearInterval(intervalId);
            return;
          }
        }
      } catch (err) {
        console.error('Thumbnail fetch error:', err);
      }

      if (attempts >= 10 && intervalId) {
        clearInterval(intervalId);
      }
    };

    fetchThumbs();
    intervalId = setInterval(fetchThumbs, 3000);
    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeVideo?.id]);

  // Upload Video
  const handleVideoUpload = (file) => {
    setIsUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/mediapro/api/videos/upload');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 90);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        const duration = data.metadata?.duration || 0;

        setActiveVideo({
          id: data.video_id,
          filename: data.filename,
          metadata: data.metadata,
          videoSrc: `/mediapro/api/media/upload/${data.video_id}`,
        });

        setCurrentTime(0);
        setStartTime(0);
        setEndTime(duration);
        setThumbnails([]);
        setSegments([]);
        toast.success(`Video "${data.filename}" loaded!`);
      } else {
        toast.error('Upload failed: ' + xhr.responseText);
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      toast.error('Network error during upload');
    };

    xhr.send(formData);
  };


  // Add current cut range to Multi-Cut segments queue
  const handleAddSegment = () => {
    if (endTime <= startTime) return;
    setSegments((prev) => [
      ...prev,
      {
        start_time: startTime,
        end_time: endTime,
        label: `Clip ${prev.length + 1}`,
      },
    ]);
  };

  const handleRemoveSegment = (index) => {
    setSegments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectSegment = (seg) => {
    setStartTime(seg.start_time);
    setEndTime(seg.end_time);
    setCurrentTime(seg.start_time);
  };

  const initTask = (message) => {
    setIsProcessing(true);
    setTaskStatus('PENDING');
    setTaskPercent(0);
    setTaskSpeed('');
    setTaskMessage(message);
    setTaskResult(null);
    setTaskError(null);
    setIsProgressModalOpen(true);
  };

  // Cut
  const handleCutSubmit = async ({ startTime, endTime, mode, audio_mode, speed, volume_gain, customName }) => {
    if (!activeVideo) return;
    initTask('Queuing cut task in worker engine...');

    try {
      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/cut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
          mode,
          audio_mode,
          speed,
          volume_gain,
          custom_name: customName,
        }),
      });

      if (!res.ok) throw new Error('Failed to start cut job');
      const data = await res.json();
      setActiveTaskId(data.task_id);
      trackTaskProgress(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setTaskStatus('FAILURE');
      setTaskError(err.message);
    }
  };

  // Crop & Social Aspect Ratio
  const handleCropSubmit = async ({ startTime, endTime, aspect_ratio, bg_blur, customName }) => {
    if (!activeVideo) return;
    const modeLabel = bg_blur ? `Rendering ${aspect_ratio} with Blurred Background...` : `Cropping video to ${aspect_ratio}...`;
    initTask(modeLabel);

    try {
      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/crop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
          aspect_ratio,
          bg_blur,
          custom_name: customName,
        }),
      });

      if (!res.ok) throw new Error('Failed to start crop job');
      const data = await res.json();
      setActiveTaskId(data.task_id);
      trackTaskProgress(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setTaskStatus('FAILURE');
      setTaskError(err.message);
    }
  };

  // Text, Watermark & Timecode Burn-In
  const handleBurnInSubmit = async ({
    startTime,
    endTime,
    text,
    timecode_mode,
    position,
    font_size,
    font_color,
    bg_box,
    bg_opacity,
    customName,
  }) => {
    if (!activeVideo) return;
    const label = timecode_mode !== 'none' ? 'Burning in SMPTE running timecode...' : 'Burning in custom watermark overlay...';
    initTask(label);

    try {
      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/burn-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
          text,
          timecode_mode,
          position,
          font_size,
          font_color,
          bg_box,
          bg_opacity,
          custom_name: customName,
        }),
      });

      if (!res.ok) throw new Error('Failed to start burn-in job');
      const data = await res.json();
      setActiveTaskId(data.task_id);
      trackTaskProgress(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setTaskStatus('FAILURE');
      setTaskError(err.message);
    }
  };

  // Silence & Dead-Air Auto-Remover
  const handleSilenceJumpCutSubmit = async ({
    noise_db,
    min_silence_duration,
    padding,
    speech_intervals,
    customName,
  }) => {
    if (!activeVideo) return;
    initTask('Rendering tightened jump cuts & eliminating dead-air...');

    try {
      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/silence/jump-cut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noise_db,
          min_silence_duration,
          padding,
          speech_intervals,
          custom_name: customName,
        }),
      });

      if (!res.ok) throw new Error('Failed to start silence jump-cut job');
      const data = await res.json();
      setActiveTaskId(data.task_id);
      trackTaskProgress(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setTaskStatus('FAILURE');
      setTaskError(err.message);
    }
  };

  // Target File Size Compressor & Codec Matrix
  const handleCompressSubmit = async ({
    startTime,
    endTime,
    target_size_mb,
    container,
    vcodec,
    customName,
  }) => {
    if (!activeVideo) return;
    initTask(`Compressing video to fit under ${target_size_mb} MB (${container.toUpperCase()})...`);

    try {
      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/compress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
          target_size_mb,
          container,
          vcodec,
          custom_name: customName,
        }),
      });

      if (!res.ok) throw new Error('Failed to start compression job');
      const data = await res.json();
      setActiveTaskId(data.task_id);
      trackTaskProgress(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setTaskStatus('FAILURE');
      setTaskError(err.message);
    }
  };

  // Scene Detection & Smart Cut Splitter
  const handleSceneSplitSubmit = async ({
    threshold,
    min_duration,
    scenes,
    customName,
  }) => {
    if (!activeVideo) return;
    initTask(`Splitting video into ${scenes?.length || 'all'} scene clips...`);

    try {
      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/scenes/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threshold,
          min_duration,
          scenes,
          custom_name: customName,
        }),
      });

      if (!res.ok) throw new Error('Failed to start scene split job');
      const data = await res.json();
      setActiveTaskId(data.task_id);
      trackTaskProgress(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setTaskStatus('FAILURE');
      setTaskError(err.message);
    }
  };

  // 2-Pass Optical Video Stabilization
  const handleStabilizeSubmit = async ({
    startTime,
    endTime,
    shakiness,
    smoothing,
    optzoom,
    zoom,
    customName,
  }) => {
    if (!activeVideo) return;
    initTask(`Performing 2-pass video stabilization (Smooth: ${smoothing}f)...`);

    try {
      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/stabilize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
          shakiness,
          smoothing,
          optzoom,
          zoom,
          custom_name: customName,
        }),
      });

      if (!res.ok) throw new Error('Failed to start stabilization job');
      const data = await res.json();
      setActiveTaskId(data.task_id);
      trackTaskProgress(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setTaskStatus('FAILURE');
      setTaskError(err.message);
    }
  };

  // EBU R128 Broadcast Audio Normalization
  const handleNormalizeAudioSubmit = async ({
    startTime,
    endTime,
    target_i,
    true_peak,
    lra,
    as_audio_only,
    customName,
  }) => {
    if (!activeVideo) return;
    initTask(`Mastering audio to EBU R128 (${target_i} LUFS, ${true_peak} dBTP)...`);

    try {
      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/loudness/normalize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
          target_i,
          true_peak,
          lra,
          as_audio_only,
          custom_name: customName,
        }),
      });

      if (!res.ok) throw new Error('Failed to start audio normalization job');
      const data = await res.json();
      setActiveTaskId(data.task_id);
      trackTaskProgress(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setTaskStatus('FAILURE');
      setTaskError(err.message);
    }
  };

  // Cinematic 3D LUT & Color Grading
  const handleColorGradeSubmit = async ({
    startTime,
    endTime,
    preset,
    brightness,
    contrast,
    saturation,
    temperature,
    vignette,
    sharpness,
    customName,
  }) => {
    if (!activeVideo) return;
    initTask(`Applying cinematic color grade (${preset})...`);

    try {
      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/colorgrade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
          preset,
          brightness,
          contrast,
          saturation,
          temperature,
          vignette,
          sharpness,
          custom_name: customName,
        }),
      });

      if (!res.ok) throw new Error('Failed to start color grading job');
      const data = await res.json();
      setActiveTaskId(data.task_id);
      trackTaskProgress(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setTaskStatus('FAILURE');
      setTaskError(err.message);
    }
  };

  // GPU-Accelerated Video Rescaling & Super-Resolution
  const handleRescaleSubmit = async ({
    startTime,
    endTime,
    targetWidth,
    targetHeight,
    algorithm,
    framingMode,
    sharpenStrength,
    codec,
    qualityPreset,
    customName,
  }) => {
    if (!activeVideo) return;
    initTask(`Transcoding resolution to ${targetWidth}×${targetHeight} (${algorithm}, ${codec})...`);

    try {
      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/rescale`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
          target_width: targetWidth,
          target_height: targetHeight,
          algorithm,
          framing_mode: framingMode,
          sharpen_strength: sharpenStrength,
          codec,
          quality_preset: qualityPreset,
          custom_name: customName,
        }),
      });

      if (!res.ok) throw new Error('Failed to start rescaling job');
      const data = await res.json();
      setActiveTaskId(data.task_id);
      trackTaskProgress(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setTaskStatus('FAILURE');
      setTaskError(err.message);
    }
  };

  // Boomerang Ping-Pong Loop
  const handleBoomerangSubmit = async ({
    startTime,
    endTime,
    loop_count,
    speed,
    include_audio,
    customName,
  }) => {
    if (!activeVideo) return;
    initTask(`Generating ping-pong boomerang (${loop_count}x loops @ ${speed}x speed)...`);

    try {
      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/boomerang`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
          loop_count,
          speed,
          include_audio,
          custom_name: customName,
        }),
      });

      if (!res.ok) throw new Error('Failed to start boomerang job');
      const data = await res.json();
      setActiveTaskId(data.task_id);
      trackTaskProgress(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setTaskStatus('FAILURE');
      setTaskError(err.message);
    }
  };

  // Split-Screen Comparison
  const handleSplitScreenSubmit = async ({
    processed_video_filename,
    start_time,
    duration,
    layout,
    label_left,
    label_right,
    customName,
  }) => {
    if (!activeVideo) return;
    initTask(`Rendering ${layout === 'stacked' ? 'Stacked' : 'Side-by-Side'} comparison studio...`);

    try {
      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/splitscreen`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          processed_video_filename,
          start_time,
          duration,
          layout,
          label_left,
          label_right,
          custom_name: customName,
        }),
      });

      if (!res.ok) throw new Error('Failed to start split-screen job');
      const data = await res.json();
      setActiveTaskId(data.task_id);
      trackTaskProgress(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setTaskStatus('FAILURE');
      setTaskError(err.message);
    }
  };

  // GIF
  const handleGifSubmit = async ({ startTime, endTime, fps, width, customName }) => {
    if (!activeVideo) return;
    initTask('Generating high-quality animated GIF...');

    try {
      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/gif`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
          fps,
          width,
          custom_name: customName,
        }),
      });

      if (!res.ok) throw new Error('Failed to start GIF job');
      const data = await res.json();
      setActiveTaskId(data.task_id);
      trackTaskProgress(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setTaskStatus('FAILURE');
      setTaskError(err.message);
    }
  };

  // Audio
  const handleAudioSubmit = async ({ startTime, endTime, audio_format, bitrate, customName }) => {
    if (!activeVideo) return;
    initTask(`Extracting ${audio_format.toUpperCase()} audio stream...`);

    try {
      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/audio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          start_time: startTime,
          end_time: endTime,
          audio_format,
          bitrate,
          custom_name: customName,
        }),
      });

      if (!res.ok) throw new Error('Failed to start audio extraction');
      const data = await res.json();
      setActiveTaskId(data.task_id);
      trackTaskProgress(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setTaskStatus('FAILURE');
      setTaskError(err.message);
    }
  };

  // Concat Merge
  const handleConcatSubmit = async ({ segments, customName }) => {
    if (!activeVideo || segments.length < 2) return;
    initTask(`Merging ${segments.length} clips into highlight reel...`);

    try {
      const res = await fetch(`/mediapro/api/videos/${activeVideo.id}/concat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments,
          custom_name: customName,
        }),
      });

      if (!res.ok) throw new Error('Failed to start merge job');
      const data = await res.json();
      setActiveTaskId(data.task_id);
      trackTaskProgress(data.task_id);
    } catch (err) {
      setIsProcessing(false);
      setTaskStatus('FAILURE');
      setTaskError(err.message);
    }
  };

  // Task Progress Tracker
  const trackTaskProgress = (taskId) => {
    let completed = false;

    const interval = setInterval(async () => {
      if (completed) {
        clearInterval(interval);
        return;
      }
      try {
        const res = await fetch(`/mediapro/api/tasks/${taskId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.state === 'PROGRESS') {
            setTaskStatus('PROGRESS');
            setTaskPercent(data.percent || 0);
            setTaskSpeed(data.speed || '');
            setTaskMessage(data.status || 'Processing...');
          } else if (data.state === 'SUCCESS') {
            completed = true;
            clearInterval(interval);
            setIsProcessing(false);
            setTaskStatus('SUCCESS');
            setTaskPercent(100);
            setTaskResult(data.result);
            fetchOutputs();

            // Auto-Save Workflow (if enabled)
            if (settings?.storage?.autoSave !== false && data.result?.output_filename) {
              const downloadUrl = `/mediapro/api/media/output/${data.result.output_filename}`;
              const handle = getActiveDirectoryHandle();
              saveFileToDirectory(handle, data.result.output_filename, downloadUrl);
              if (settings?.storage?.autoCloseModal) {
                setTimeout(() => setIsProgressModalOpen(false), 1200);
              }
            }
          } else if (data.state === 'FAILURE') {
            completed = true;
            clearInterval(interval);
            setIsProcessing(false);
            setTaskStatus('FAILURE');
            setTaskError(data.error || 'Operation failed');
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 800);
  };

  const handlePlayOutput = async (target) => {
    let filename = typeof target === 'string' ? target : target.filename;
    let isUpload = typeof target === 'object' && target.type === 'upload';
    let videoId = typeof target === 'object'
      ? (target.id || target.video_id || filename)
      : (isUpload ? filename : `out_${filename}`);

    if (!videoId) {
      videoId = filename;
    }

    let videoSrc = typeof target === 'object' && target.videoSrc
      ? target.videoSrc
      : (isUpload || (typeof target === 'object' && target.video_id)
        ? `/mediapro/api/media/upload/${videoId}`
        : `/mediapro/api/media/output/${filename}`);

    let meta = typeof target === 'object' && target.metadata ? target.metadata : null;

    if (!meta) {
      try {
        const probeUrl = isUpload || (typeof target === 'object' && target.video_id)
          ? `/mediapro/api/videos/${videoId}/metadata`
          : `/mediapro/api/outputs/${filename}/probe`;
        const res = await fetch(probeUrl);
        if (res.ok) {
          const data = await res.json();
          meta = data.metadata;
        }
      } catch (e) {
        console.warn('Probe error on play:', e);
      }
    }

    const duration = meta?.duration || 0;
    setActiveVideo({
      id: videoId,
      filename: filename,
      metadata: meta,
      videoSrc: videoSrc,
    });
    setCurrentTime(0);
    setStartTime(0);
    setEndTime(duration);
  };

  const handleMetadataLoaded = (meta) => {
    setActiveVideo((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        metadata: {
          ...(prev.metadata || {}),
          ...meta,
        },
      };
    });
    if (meta.duration > 0) {
      setEndTime((prevEnd) => (prevEnd === 0 ? meta.duration : prevEnd));
    }
  };

  const handleDeleteLibraryItem = async (target) => {
    let filename = typeof target === 'string' ? target : target.filename;
    let isUpload = typeof target === 'object' && target.type === 'upload';
    let id = typeof target === 'object' ? (target.video_id || target.id) : filename;

    // Optimistically update UI lists immediately
    if (isUpload) {
      setUploads((prev) => prev.filter((u) => u.video_id !== id && u.filename !== filename));
    } else {
      setOutputs((prev) => prev.filter((o) => o.filename !== filename));
    }
    setStagedVideos((prev) => prev.filter((v) => v.id !== id && v.filename !== filename));
    setSelectedStagedIds((prev) => prev.filter((i) => i !== id));

    // If active video was deleted, reset active editor
    setActiveVideo((cur) => {
      if (cur && (cur.id === id || cur.filename === filename)) {
        return null;
      }
      return cur;
    });

    try {
      const deleteUrl = isUpload
        ? `/mediapro/api/uploads/${id}`
        : `/mediapro/api/outputs/${filename}`;

      const res = await fetch(deleteUrl, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchOutputs();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleStageFromLibrary = (item) => {
    const isUpload = item.type === 'upload';
    const videoId = item.video_id || item.id || `out_${item.filename}`;
    const stagedItem = {
      id: videoId,
      filename: item.filename,
      metadata: item.metadata,
      videoSrc: item.download_url || item.stream_url || (isUpload ? `/mediapro/api/media/upload/${videoId}` : `/mediapro/api/media/output/${item.filename}`),
      thumbnail_url: item.thumbnail_url,
      type: item.type || 'upload',
    };

    setStagedVideos((prev) => {
      if (prev.some((p) => p.id === stagedItem.id || p.filename === stagedItem.filename)) return prev;
      return [...prev, stagedItem];
    });
    setSelectedStagedIds((prev) => Array.from(new Set([...prev, stagedItem.id])));
  };

  const handleReset = () => {
    setActiveVideo(null);
    setCurrentTime(0);
    setStartTime(0);
    setEndTime(0);
    setThumbnails([]);
    setSegments([]);
  };

  const splitRatio = settings?.layout?.splitRatio || '8/4';
  const leftColClass = splitRatio === '7/5' ? 'lg:col-span-7' : splitRatio === '9/3' ? 'lg:col-span-9' : 'lg:col-span-8';
  const rightColClass = splitRatio === '7/5' ? 'lg:col-span-5' : splitRatio === '9/3' ? 'lg:col-span-3' : 'lg:col-span-4';

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-studio-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Header
        activeVideo={activeVideo}
        onReset={handleReset}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        outputCount={outputs.length}
        theme={theme}
        onToggleTheme={toggleTheme}
        hardwareInfo={hardwareInfo}
        layoutMode={layoutMode}
        onToggleLayoutMode={handleToggleLayoutMode}
        activeStudioMode={activeStudioMode}
        onToggleStudioMode={handleToggleStudioMode}
      />

      <main
        className={`flex-1 w-full mx-auto transition-all ${
          settings?.layout?.fullWidth !== false
            ? 'max-w-[1920px] px-3 sm:px-5 lg:px-6 py-3 sm:py-4'
            : 'max-w-[1440px] px-3 sm:px-4 lg:px-5 py-3 sm:py-4'
        }`}
      >
        {activeStudioMode === 'image' ? (
          <div className="animate-in fade-in duration-300">
            <ImageStudio
              images={imageLibrary}
              onRefreshLibrary={fetchImageLibrary}
              onUploadImage={handleUploadImageFile}
              onDeleteImage={handleDeleteImageItem}
            />
          </div>
        ) : (
          <>
            {!activeVideo ? (
              <div className="py-12">
                <VideoUploader
                  onVideoUploaded={handleVideoUpload}
                  onMultipleFilesUploaded={handleAddFilesToStaging}
                  isUploading={isUploading}
                  uploadProgress={uploadProgress}
                />
              </div>
            ) : layoutMode === 'stacked' ? (
              /* Full Widescreen Stacked Layout */
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* Top 1: Active Video Info Capsule */}
                <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-studio-900/70 border border-slate-200 dark:border-studio-800/80 px-3.5 py-2 rounded-xl text-xs font-mono shadow-sm">
                  <div className="flex items-center space-x-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse flex-shrink-0" />
                    <span className="font-bold text-slate-800 dark:text-white truncate max-w-sm sm:max-w-xl">
                      {activeVideo.filename}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{activeVideo.metadata?.width}x{activeVideo.metadata?.height}</span>
                    <span>•</span>
                    <span>{activeVideo.metadata?.fps} FPS</span>
                    <span>•</span>
                    <span className="uppercase">{activeVideo.metadata?.codec_video}</span>
                    <span>•</span>
                    <span className="text-brand-500 font-bold">Widescreen Stacked View</span>
                  </div>
                </div>

                {/* Top 2: Wide Video Player */}
                <VideoPlayer
                  videoSrc={activeVideo.videoSrc}
                  videoId={activeVideo.id}
                  metadata={activeVideo.metadata}
                  currentTime={currentTime}
                  onTimeUpdate={setCurrentTime}
                  startTime={startTime}
                  endTime={endTime}
                  onSetStartTime={setStartTime}
                  onSetEndTime={setEndTime}
                  onAddSegment={handleAddSegment}
                  settings={settings}
                  colorGradeSettings={colorGradeSettings}
                  onMetadataLoaded={handleMetadataLoaded}
                />

                {/* Middle: Full-Width Timeline Seekbar & Thumbnail Strip */}
                <Timeline
                  duration={activeVideo.metadata?.duration || 0}
                  currentTime={currentTime}
                  onSeek={setCurrentTime}
                  startTime={startTime}
                  endTime={endTime}
                  onRangeChange={(start, end) => {
                    setStartTime(start);
                    setEndTime(end);
                  }}
                  thumbnails={thumbnails}
                  fps={activeVideo.metadata?.fps || 30}
                  segments={segments}
                  onSelectSegment={handleSelectSegment}
                  onRemoveSegment={handleRemoveSegment}
                  videoId={activeVideo.id}
                />

                {/* Bottom: Dual-Card Export Engine Split 50% / 50% Left & Right */}
                <CutControls
                  metadata={activeVideo.metadata}
                  startTime={startTime}
                  endTime={endTime}
                  duration={activeVideo.metadata?.duration || 0}
                  onRangeChange={(start, end) => {
                    setStartTime(start);
                    setEndTime(end);
                  }}
                  onCutSubmit={handleCutSubmit}
                  onCropSubmit={handleCropSubmit}
                  onBurnInSubmit={handleBurnInSubmit}
                  onSilenceJumpCutSubmit={handleSilenceJumpCutSubmit}
                  onCompressSubmit={handleCompressSubmit}
                  onSceneSplitSubmit={handleSceneSplitSubmit}
                  onStabilizeSubmit={handleStabilizeSubmit}
                  onColorGradeSubmit={handleColorGradeSubmit}
                  onRescaleSubmit={handleRescaleSubmit}
                  onNormalizeAudioSubmit={handleNormalizeAudioSubmit}
                  onBoomerangSubmit={handleBoomerangSubmit}
                  onSplitScreenSubmit={handleSplitScreenSubmit}
                  onColorGradeSettingsChange={setColorGradeSettings}
                  onLoadSegmentsToQueue={(segs) => {
                    setSegments(segs.map((s, idx) => ({ id: `seg_${idx}`, start_time: s.start_time, end_time: s.end_time })));
                  }}
                  onGifSubmit={handleGifSubmit}
                  onAudioSubmit={handleAudioSubmit}
                  onConcatSubmit={handleConcatSubmit}
                  videoId={activeVideo.id}
                  segments={segments}
                  outputs={outputs}
                  isProcessing={isProcessing}
                  hardwareInfo={hardwareInfo}
                  settings={settings}
                  layoutMode="stacked"
                />
              </div>
            ) : (
              /* Side-by-Side Studio Layout */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start animate-in fade-in duration-300">
                {/* Left Column: Video Header, Player & Timeline */}
                <div className={`${leftColClass} space-y-3`}>
                  {/* Active Video Info Capsule */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-studio-900/70 border border-slate-200 dark:border-studio-800/80 px-3.5 py-2 rounded-xl text-xs font-mono shadow-sm">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse flex-shrink-0" />
                      <span className="font-bold text-slate-800 dark:text-white truncate max-w-sm">
                        {activeVideo.filename}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{activeVideo.metadata?.width}x{activeVideo.metadata?.height}</span>
                      <span>•</span>
                      <span>{activeVideo.metadata?.fps} FPS</span>
                      <span>•</span>
                      <span className="uppercase">{activeVideo.metadata?.codec_video}</span>
                    </div>
                  </div>

                  {/* Video Player */}
                  <VideoPlayer
                    videoSrc={activeVideo.videoSrc}
                    videoId={activeVideo.id}
                    metadata={activeVideo.metadata}
                    currentTime={currentTime}
                    onTimeUpdate={setCurrentTime}
                    startTime={startTime}
                    endTime={endTime}
                    onSetStartTime={setStartTime}
                    onSetEndTime={setEndTime}
                    onAddSegment={handleAddSegment}
                    settings={settings}
                    colorGradeSettings={colorGradeSettings}
                    onMetadataLoaded={handleMetadataLoaded}
                  />

                  {/* Visual Timeline & Multi-Cut Queue */}
                  <Timeline
                    duration={activeVideo.metadata?.duration || 0}
                    currentTime={currentTime}
                    onSeek={setCurrentTime}
                    startTime={startTime}
                    endTime={endTime}
                    onRangeChange={(start, end) => {
                      setStartTime(start);
                      setEndTime(end);
                    }}
                    thumbnails={thumbnails}
                    fps={activeVideo.metadata?.fps || 30}
                    segments={segments}
                    onSelectSegment={handleSelectSegment}
                    onRemoveSegment={handleRemoveSegment}
                    videoId={activeVideo.id}
                  />
                </div>

                {/* Right Column: Studio Export Engine Panel (Dual Card Stacking) */}
                <div className={`${rightColClass} lg:sticky lg:top-16`}>
                  <CutControls
                    metadata={activeVideo.metadata}
                    startTime={startTime}
                    endTime={endTime}
                    duration={activeVideo.metadata?.duration || 0}
                    onRangeChange={(start, end) => {
                      setStartTime(start);
                      setEndTime(end);
                    }}
                    onCutSubmit={handleCutSubmit}
                    onCropSubmit={handleCropSubmit}
                    onBurnInSubmit={handleBurnInSubmit}
                    onSilenceJumpCutSubmit={handleSilenceJumpCutSubmit}
                    onCompressSubmit={handleCompressSubmit}
                    onSceneSplitSubmit={handleSceneSplitSubmit}
                    onStabilizeSubmit={handleStabilizeSubmit}
                    onColorGradeSubmit={handleColorGradeSubmit}
                    onRescaleSubmit={handleRescaleSubmit}
                    onNormalizeAudioSubmit={handleNormalizeAudioSubmit}
                    onBoomerangSubmit={handleBoomerangSubmit}
                    onSplitScreenSubmit={handleSplitScreenSubmit}
                    onColorGradeSettingsChange={setColorGradeSettings}
                    onLoadSegmentsToQueue={(segs) => {
                      setSegments(segs.map((s, idx) => ({ id: `seg_${idx}`, start_time: s.start_time, end_time: s.end_time })));
                    }}
                    onGifSubmit={handleGifSubmit}
                    onAudioSubmit={handleAudioSubmit}
                    onConcatSubmit={handleConcatSubmit}
                    videoId={activeVideo.id}
                    segments={segments}
                    outputs={outputs}
                    isProcessing={isProcessing}
                    hardwareInfo={hardwareInfo}
                    settings={settings}
                    layoutMode="side_by_side"
                  />
                </div>
              </div>
            )}

            {/* Global Batch Staging Gallery Shelf */}
            <div className="mt-6">
              <BatchStagingGallery
                stagedVideos={stagedVideos}
                selectedIds={selectedStagedIds}
                onToggleSelect={handleToggleSelectStaged}
                onSelectAll={handleSelectAllStaged}
                onDeselectAll={handleDeselectAllStaged}
                onRemoveStaged={handleRemoveStaged}
                onClearAll={handleClearAllStaged}
                onAddFiles={handleAddFilesToStaging}
                onOpenBatchModal={() => {
                  if (batchJobState?.isCompleted) {
                    setBatchJobState(null);
                    try {
                      localStorage.removeItem('vp_last_batch_state');
                    } catch {}
                  }
                  setIsBatchModalOpen(true);
                }}
                onLoadStagedToEditor={handleLoadStagedToEditor}
                isProcessingBatch={batchJobState?.isRunning}
                batchProgress={batchJobState}
              />
            </div>
          </>
        )}
      </main>

      <ProgressModal
        isOpen={isProgressModalOpen}
        status={taskStatus}
        percent={taskPercent}
        speed={taskSpeed}
        message={taskMessage}
        result={taskResult}
        error={taskError}
        onClose={() => setIsProgressModalOpen(false)}
        onPlayResult={handlePlayOutput}
        settings={settings}
      />

      <BatchProcessModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        selectedVideos={stagedVideos.filter((v) => selectedStagedIds.includes(v.id))}
        onStartBatch={handleStartBatchProcess}
        batchJobState={batchJobState}
        onCancelBatch={() => {
          setBatchJobState(null);
          try {
            localStorage.removeItem('vp_last_batch_state');
          } catch {}
        }}
        onResetBatch={() => {
          setBatchJobState(null);
          try {
            localStorage.removeItem('vp_last_batch_state');
          } catch {}
        }}
        hardwareInfo={hardwareInfo}
      />

      <VideoLibrary
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        outputs={outputs}
        uploads={uploads}
        onRefresh={fetchOutputs}
        onPlayOutput={handlePlayOutput}
        onDeleteOutput={handleDeleteLibraryItem}
        isLoading={isLibraryLoading}
        onUploadFile={handleUploadDirectToLibrary}
        onAddToBatch={handleStageFromLibrary}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        hardwareInfo={hardwareInfo}
      />

      {/* Global Background Task Center & Telemetry Drawer */}
      <GlobalTaskDrawer />
    </div>
  );
}

