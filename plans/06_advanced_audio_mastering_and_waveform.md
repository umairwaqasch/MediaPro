# 🎙️ Plan 06: Advanced Audio Mastering, Multi-Band EQ & Waveform Scrubbing

## 🎯 Objective
Upgrade the Video Studio audio capabilities with an interactive visual waveform scrubber, multi-band parametric equalizer, voice clarity booster, audio ducking, and dual-track audio mixing.

---

## 🎨 User Experience Specification

### Interactive Audio Track & Multi-Band EQ Panel
```
┌────────────────────────────────────────────────────────────────────────┐
│ 🎚️ Audio Mastering Studio                                              │
├────────────────────────────────────────────────────────────────────────┤
│ Waveform: [||||||||||||||||||||||||||||||||||||||||||||||||||||||||||] │
│ Volume Gain: [───●──────────] +3.0 dB                                  │
│                                                                        │
│ Parametric Equalizer:                                                  │
│ [Bass: +2dB]  [Low-Mid: 0dB]  [Presence: +4dB]  [Treble/Air: +1.5dB]   │
│                                                                        │
│ Voice Enhancements:                                                    │
│ [x] AI Vocal Clarity (Speech Isolation & De-Hum)                       │
│ [x] Background Audio Ducking (Auto-lower music when speech is detected)│
│ [x] Broadcast Loudness Mastering (-14 LUFS YouTube / -16 LUFS Podcast)  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Step-by-Step Implementation Steps

### 1. FFmpeg Audio Mastering Pipeline
- **Parametric EQ**: `ffmpeg -af "equalizer=f=80:width_type=o:width=2:g=2,equalizer=f=3000:width_type=o:width=1.5:g=4"`
- **Vocal Enhancer & High-Pass Filter**: `ffmpeg -af "highpass=f=80,lowpass=f=12000,compand=0.3|0.8:1|1:-90/-60|-60/-40|-40/-30|-20/-20:6:0:-90:0.2"`
- **Audio Ducking**: `ffmpeg -i video.mp4 -i bgm.mp3 -filter_complex "[1:a]volume=0.8[bgm];[0:a][bgm]sidechaincompress=threshold=0.08:ratio=4:attack=20:release=300"`

### 2. Frontend Visual Waveform & Audio Controls
- Render accurate interactive canvas waveform peaks with zoom.
- Sliders for 4-band EQ (Bass 80Hz, Low-Mid 500Hz, Presence 3kHz, Air 10kHz).
- Volume gain slider with live decibel readout (`-24 dB` to `+12 dB`).

---

## 🧪 Verification & Acceptance Criteria
- [ ] Rendered video produces mastered audio conforming to targeted LUFS and EQ curves.
- [ ] Vocal clarity filter cleans low-end hum and boosts speech intelligibility.
- [ ] Waveform scrubbing is smooth and responsive in the timeline.
