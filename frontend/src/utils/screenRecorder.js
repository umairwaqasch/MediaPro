/**
 * Industrial-grade In-Browser Screen & Camera Recording Engine
 * Utilizes WebRTC getDisplayMedia, getUserMedia, Web Audio API stereo mixer,
 * and MediaRecorder with hardware GPU acceleration.
 */

export class ScreenRecorderEngine {
  constructor(options = {}) {
    this.options = {
      fps: options.fps || 60,
      videoBitrate: options.videoBitrate || 8000000, // 8 Mbps
      audioBitrate: options.audioBitrate || 192000, // 192 kbps
      includeMic: options.includeMic ?? true,
      includeSystemAudio: options.includeSystemAudio ?? true,
      includeWebcam: options.includeWebcam ?? false,
      webcamPosition: options.webcamPosition || 'bottom-right', // 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
      webcamShape: options.webcamShape || 'circle', // 'circle' | 'rect'
      ...options,
    };

    this.displayStream = null;
    this.micStream = null;
    this.webcamStream = null;
    this.combinedStream = null;
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.audioContext = null;
    this.animFrameId = null;

    this.state = 'idle'; // 'idle' | 'recording' | 'paused'
    this.startTime = null;
    this.pausedDuration = 0;
    this.lastPauseTime = null;

    // Callbacks
    this.onStateChange = options.onStateChange || (() => {});
    this.onTimeUpdate = options.onTimeUpdate || (() => {});
    this.onVUMeter = options.onVUMeter || (() => {});
    this.onError = options.onError || (() => {});
  }

  /**
   * Request user display media, microphone, and webcam streams.
   */
  async setupStreams() {
    try {
      // 1. Capture Display Media (Screen / Window / Tab)
      const displayConstraints = {
        video: {
          frameRate: { ideal: this.options.fps, max: 60 },
          cursor: 'always',
        },
        audio: this.options.includeSystemAudio,
      };

      this.displayStream = await navigator.mediaDevices.getDisplayMedia(displayConstraints);

      // Handle user clicking "Stop Sharing" on browser banner
      this.displayStream.getVideoTracks()[0].onended = () => {
        if (this.state === 'recording' || this.state === 'paused') {
          this.stop();
        }
      };

      // 2. Capture Microphone Audio (if enabled)
      if (this.options.includeMic) {
        try {
          this.micStream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
          });
        } catch (micErr) {
          console.warn('Microphone capture declined or unavailable:', micErr);
        }
      }

      // 3. Capture Webcam Video (if enabled)
      if (this.options.includeWebcam) {
        try {
          this.webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
          });
        } catch (camErr) {
          console.warn('Webcam capture declined or unavailable:', camErr);
        }
      }

      // 4. Mix Audio Streams via Web Audio API
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioDestination = this.audioContext.createMediaStreamDestination();

      if (this.displayStream.getAudioTracks().length > 0) {
        const sysSource = this.audioContext.createMediaStreamSource(
          new MediaStream([this.displayStream.getAudioTracks()[0]])
        );
        sysSource.connect(audioDestination);
      }

      if (this.micStream && this.micStream.getAudioTracks().length > 0) {
        const micSource = this.audioContext.createMediaStreamSource(this.micStream);

        // Setup Analyser for VU Meter
        const analyser = this.audioContext.createAnalyser();
        analyser.fftSize = 256;
        micSource.connect(analyser);
        micSource.connect(audioDestination);

        this._startVUMeterLoop(analyser);
      }

      // 5. Compose Video (Webcam PiP on Canvas or Direct Display Stream)
      if (this.webcamStream && this.webcamStream.getVideoTracks().length > 0) {
        this.combinedStream = this._setupCanvasPiPCompositor(audioDestination.stream);
      } else {
        // Direct stream combination
        const videoTrack = this.displayStream.getVideoTracks()[0];
        const audioTracks = audioDestination.stream.getAudioTracks();
        this.combinedStream = new MediaStream([videoTrack, ...audioTracks]);
      }

      return true;
    } catch (err) {
      this.onError(err);
      this._cleanup();
      throw err;
    }
  }

  /**
   * Start recording.
   */
  async start() {
    if (!this.combinedStream) {
      await this.setupStreams();
    }

    this.recordedChunks = [];

    // Select optimal supported MIME type
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm',
      'video/mp4',
    ];

    let selectedMime = '';
    for (const mime of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mime)) {
        selectedMime = mime;
        break;
      }
    }

    const recorderOptions = {
      mimeType: selectedMime || undefined,
      videoBitsPerSecond: this.options.videoBitrate,
      audioBitsPerSecond: this.options.audioBitrate,
    };

    this.mediaRecorder = new MediaRecorder(this.combinedStream, recorderOptions);

    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        this.recordedChunks.push(event.data);
      }
    };

    this.mediaRecorder.start(1000); // 1-second timeslices for memory safety
    this.state = 'recording';
    this.startTime = Date.now();
    this.pausedDuration = 0;
    this.onStateChange(this.state);

    this._startTimeUpdateLoop();
  }

  /**
   * Pause recording.
   */
  pause() {
    if (this.mediaRecorder && this.state === 'recording') {
      this.mediaRecorder.pause();
      this.state = 'paused';
      this.lastPauseTime = Date.now();
      this.onStateChange(this.state);
    }
  }

  /**
   * Resume recording.
   */
  resume() {
    if (this.mediaRecorder && this.state === 'paused') {
      this.mediaRecorder.resume();
      this.state = 'recording';
      if (this.lastPauseTime) {
        this.pausedDuration += Date.now() - this.lastPauseTime;
        this.lastPauseTime = null;
      }
      this.onStateChange(this.state);
    }
  }

  /**
   * Stop recording and resolve with recorded Blob and File object.
   */
  stop() {
    return new Promise((resolve) => {
      if (!this.mediaRecorder || this.state === 'idle') {
        resolve(null);
        return;
      }

      this.mediaRecorder.onstop = () => {
        const mimeType = this.mediaRecorder.mimeType || 'video/webm';
        const blob = new Blob(this.recordedChunks, { type: mimeType });
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        const filename = `screen_recording_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
        const file = new File([blob], filename, { type: mimeType });

        this.state = 'idle';
        this.onStateChange(this.state);
        this._cleanup();

        resolve({ blob, file, filename, duration: this.getElapsedSeconds() });
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Get current elapsed recording duration in seconds.
   */
  getElapsedSeconds() {
    if (!this.startTime) return 0;
    let elapsed = Date.now() - this.startTime - this.pausedDuration;
    if (this.state === 'paused' && this.lastPauseTime) {
      elapsed -= Date.now() - this.lastPauseTime;
    }
    return Math.max(0, elapsed / 1000);
  }

  /**
   * Internal PiP Compositor Loop using Offscreen Canvas
   */
  _setupCanvasPiPCompositor(mixedAudioStream) {
    const displayVideo = document.createElement('video');
    displayVideo.srcObject = this.displayStream;
    displayVideo.muted = true;
    displayVideo.play();

    const webcamVideo = document.createElement('video');
    webcamVideo.srcObject = this.webcamStream;
    webcamVideo.muted = true;
    webcamVideo.play();

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const updateCanvasSize = () => {
      canvas.width = displayVideo.videoWidth || 1920;
      canvas.height = displayVideo.videoHeight || 1080;
    };

    displayVideo.onloadedmetadata = updateCanvasSize;

    const render = () => {
      if (this.state === 'idle') return;

      if (displayVideo.videoWidth > 0 && canvas.width !== displayVideo.videoWidth) {
        updateCanvasSize();
      }

      // Draw Main Screen
      ctx.drawImage(displayVideo, 0, 0, canvas.width, canvas.height);

      // Draw Webcam PiP
      if (webcamVideo.videoWidth > 0) {
        const pipWidth = canvas.width * 0.2; // 20% width
        const pipHeight = (pipWidth / webcamVideo.videoWidth) * webcamVideo.videoHeight;
        const padding = 24;

        let x = canvas.width - pipWidth - padding;
        let y = canvas.height - pipHeight - padding;

        if (this.options.webcamPosition === 'top-left') {
          x = padding;
          y = padding;
        } else if (this.options.webcamPosition === 'top-right') {
          x = canvas.width - pipWidth - padding;
          y = padding;
        } else if (this.options.webcamPosition === 'bottom-left') {
          x = padding;
          y = canvas.height - pipHeight - padding;
        }

        ctx.save();
        if (this.options.webcamShape === 'circle') {
          const radius = Math.min(pipWidth, pipHeight) / 2;
          ctx.beginPath();
          ctx.arc(x + radius, y + radius, radius, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(webcamVideo, x, y, radius * 2, radius * 2);
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 4;
          ctx.stroke();
        } else {
          // Rounded rect
          ctx.beginPath();
          ctx.roundRect(x, y, pipWidth, pipHeight, 16);
          ctx.clip();
          ctx.drawImage(webcamVideo, x, y, pipWidth, pipHeight);
          ctx.strokeStyle = '#6366f1';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
        ctx.restore();
      }

      this.animFrameId = requestAnimationFrame(render);
    };

    this.animFrameId = requestAnimationFrame(render);

    const canvasStream = canvas.captureStream(this.options.fps);
    const audioTracks = mixedAudioStream.getAudioTracks();
    return new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);
  }

  _startTimeUpdateLoop() {
    const update = () => {
      if (this.state === 'idle') return;
      this.onTimeUpdate(this.getElapsedSeconds());
      setTimeout(update, 200);
    };
    update();
  }

  _startVUMeterLoop(analyser) {
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const checkVolume = () => {
      if (this.state === 'idle') return;
      analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      const normalizedLevel = Math.min(1.0, avg / 128.0);
      this.onVUMeter(normalizedLevel);
      requestAnimationFrame(checkVolume);
    };
    checkVolume();
  }

  _cleanup() {
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    if (this.displayStream) this.displayStream.getTracks().forEach((t) => t.stop());
    if (this.micStream) this.micStream.getTracks().forEach((t) => t.stop());
    if (this.webcamStream) this.webcamStream.getTracks().forEach((t) => t.stop());
    if (this.audioContext && this.audioContext.state !== 'closed') this.audioContext.close();
    this.displayStream = null;
    this.micStream = null;
    this.webcamStream = null;
    this.combinedStream = null;
  }
}
