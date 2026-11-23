// Web Audio API Synthesizer & Procedural Cyberpunk Music Engine for THE SYNDICATE
class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.isMuted = false;
    this.initialized = false;

    // Music playback state
    this.musicTrack = null; // 'menu', 'combat', 'boss', 'ending'
    this.musicTimer = null;
    this.step = 0;
    this.bpm = 126;
  }

  init() {
    if (this.initialized) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.45, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.initialized = true;
    } catch (e) {
      console.warn("AudioContext initialization failed", e);
    }
  }

  ensureReady() {
    if (!this.initialized) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.ensureReady();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime, 0.05);
    }
    return this.isMuted;
  }

  // ===================== SOUND EFFECTS ===================== //

  playLaser(type = 'pulse') {
    if (!this.initialized || this.isMuted) return;
    this.ensureReady();
    const t = this.ctx.currentTime;

    if (type === 'pulse') {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(110, t + 0.12);

      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t);
      osc.stop(t + 0.13);
    } else if (type === 'scatter') {
      for (let i = 0; i < 3; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = i % 2 === 0 ? 'square' : 'sawtooth';
        const startFreq = 600 + Math.random() * 300;
        osc.frequency.setValueAtTime(startFreq, t);
        osc.frequency.exponentialRampToValueAtTime(60, t + 0.16);

        gain.gain.setValueAtTime(0.25, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(t + i * 0.015);
        osc.stop(t + i * 0.015 + 0.16);
      }
    } else if (type === 'railgun') {
      // Powerful piercing beam sound
      const osc = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc2.type = 'sine';

      osc.frequency.setValueAtTime(2400, t);
      osc.frequency.exponentialRampToValueAtTime(90, t + 0.35);

      osc2.frequency.setValueAtTime(140, t);
      osc2.frequency.exponentialRampToValueAtTime(40, t + 0.35);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(4000, t);
      filter.frequency.exponentialRampToValueAtTime(400, t + 0.35);

      gain.gain.setValueAtTime(0.6, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

      osc.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc2.start(t);
      osc.stop(t + 0.36);
      osc2.stop(t + 0.36);
    }
  }

  playDash() {
    if (!this.initialized || this.isMuted) return;
    this.ensureReady();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(350, t);
    osc.frequency.exponentialRampToValueAtTime(60, t + 0.2);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.Q.value = 3;
    filter.frequency.exponentialRampToValueAtTime(200, t + 0.2);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    osc.start(t);
    osc.stop(t + 0.21);
  }

  playHit() {
    if (!this.initialized || this.isMuted) return;
    this.ensureReady();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.09);
  }

  playExplosion(boss = false) {
    if (!this.initialized || this.isMuted) return;
    this.ensureReady();
    const t = this.ctx.currentTime;
    const dur = boss ? 0.7 : 0.35;

    // Sub rumble
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'triangle';
    sub.frequency.setValueAtTime(boss ? 120 : 150, t);
    sub.frequency.exponentialRampToValueAtTime(25, t + dur);
    subGain.gain.setValueAtTime(boss ? 0.8 : 0.5, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(t);
    sub.stop(t + dur + 0.01);

    // Noise blast
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(boss ? 800 : 1400, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + dur);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(boss ? 0.7 : 0.45, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + dur);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.sfxGain);
    noise.start(t);
  }

  playEmp() {
    if (!this.initialized || this.isMuted) return;
    this.ensureReady();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.6);

    gain.gain.setValueAtTime(0.6, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.65);
  }

  playPowerup() {
    if (!this.initialized || this.isMuted) return;
    this.ensureReady();
    const t = this.ctx.currentTime;
    const freqs = [330, 440, 554, 659, 880];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, t + i * 0.05);
      gain.gain.setValueAtTime(0.2, t + i * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.05 + 0.15);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(t + i * 0.05);
      osc.stop(t + i * 0.05 + 0.16);
    });
  }

  playBossSiren() {
    if (!this.initialized || this.isMuted) return;
    this.ensureReady();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, t);
    osc.frequency.linearRampToValueAtTime(440, t + 0.4);
    osc.frequency.linearRampToValueAtTime(220, t + 0.8);

    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 0.85);

    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.86);
  }

  playTypewriter() {
    if (!this.initialized || this.isMuted) return;
    this.ensureReady();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900 + Math.random() * 300, t);
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t);
    osc.stop(t + 0.035);
  }

  // ===================== CYBERPUNK MUSIC SYNTHESIZER ===================== //

  playMusic(track = 'combat') {
    if (this.musicTrack === track) return;
    this.stopMusic();
    this.musicTrack = track;
    this.step = 0;

    if (track === 'combat') {
      this.bpm = 128;
    } else if (track === 'boss') {
      this.bpm = 142;
    } else if (track === 'ending') {
      this.bpm = 96;
    } else {
      this.bpm = 110; // menu
    }

    const intervalMs = (60 / this.bpm / 4) * 1000; // 16th notes
    this.musicTimer = setInterval(() => this.musicTick(), intervalMs);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicTrack = null;
  }

  musicTick() {
    if (!this.initialized || this.isMuted) return;
    this.ensureReady();
    const t = this.ctx.currentTime;
    const s = this.step % 32;

    if (this.musicTrack === 'combat') {
      // 1. Kick on 0, 4, 8, 12, 16, 20, 24, 28 (four-on-the-floor)
      if (s % 4 === 0) {
        this.synthKick(t);
      }
      // 2. Snare on 8, 24 (2 and 4 beats)
      if (s === 8 || s === 24) {
        this.synthSnare(t);
      }
      // 3. Hihat on every offbeat
      if (s % 2 === 1) {
        this.synthHihat(t, s % 4 === 2 ? 0.15 : 0.08);
      }
      // 4. Rolling Cyberpunk Bassline (A minor / F / G)
      const bassNotes = [
        // Bars 1-2: A1 (55Hz)
        55, 55, 110, 55,  55, 55, 82.4, 55,  55, 55, 110, 55,  55, 73.4, 82.4, 55,
        // Bars 3-4: F1 (43.6Hz) & G1 (49Hz)
        43.6, 43.6, 87.3, 43.6,  43.6, 43.6, 65.4, 43.6,  49.0, 49.0, 98.0, 49.0,  49.0, 73.4, 82.4, 65.4
      ];
      this.synthBass(t, bassNotes[s], 0.12);

      // 5. Arpeggio lead every 4 steps
      if (s % 4 === 2) {
        const arpNotes = [440, 523.25, 659.25, 783.99, 880, 659.25, 523.25, 440];
        const note = arpNotes[(s / 4) % arpNotes.length];
        this.synthLead(t, note, 0.16);
      }
    } else if (this.musicTrack === 'boss') {
      // Fast Aggressive Darksynth
      if (s % 2 === 0) {
        this.synthKick(t, 0.45);
      }
      if (s === 4 || s === 12 || s === 20 || s === 28) {
        this.synthSnare(t, 0.35);
      }
      if (s % 2 === 1) {
        this.synthHihat(t, 0.15);
      }
      // Heavy Detuned Bass on D minor
      const bossBass = [
        36.7, 73.4, 36.7, 73.4, 36.7, 36.7, 55.0, 73.4,
        36.7, 73.4, 36.7, 73.4, 41.2, 49.0, 55.0, 65.4,
        36.7, 73.4, 36.7, 73.4, 36.7, 36.7, 55.0, 73.4,
        55.0, 65.4, 73.4, 82.4, 87.3, 82.4, 73.4, 65.4
      ];
      this.synthBass(t, bossBass[s], 0.14, true);

      // Alarm / Lead Siren pulse
      if (s === 0 || s === 16) {
        this.synthLead(t, 587.33, 0.4, 'sawtooth'); // D5
      } else if (s === 8 || s === 24) {
        this.synthLead(t, 622.25, 0.4, 'sawtooth'); // Eb5
      }
    } else if (this.musicTrack === 'ending') {
      // Triumphant, deep Syndicate Rebellion Anthem
      if (s === 0 || s === 16) {
        this.synthKick(t, 0.5);
      }
      if (s === 8 || s === 24) {
        this.synthSnare(t, 0.25);
      }
      // Warm synth chord pads
      if (s === 0) {
        // C major / A minor uplifting progression
        this.synthPad(t, [130.81, 164.81, 196.0, 261.63], 1.8);
      } else if (s === 16) {
        this.synthPad(t, [110.0, 146.83, 174.61, 220.0], 1.8);
      }
      // Neon green melody
      const melody = [
        523.25, 0, 659.25, 0, 783.99, 0, 1046.5, 0,
        880.0, 0, 783.99, 0, 659.25, 0, 587.33, 0
      ];
      if (melody[s % 16] > 0) {
        this.synthLead(t, melody[s % 16], 0.35, 'sine');
      }
    } else {
      // Menu / Ambient
      if (s % 8 === 0) {
        this.synthKick(t, 0.2);
      }
      if (s === 0 || s === 16) {
        this.synthBass(t, 55, 0.6);
        this.synthPad(t, [220, 277.18, 329.63], 2.0);
      }
    }

    this.step++;
  }

  synthKick(t, volume = 0.4) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + 0.15);
  }

  synthSnare(t, volume = 0.25) {
    // Noise
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.15);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.25));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(t);
  }

  synthHihat(t, volume = 0.08) {
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.04);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.15));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    noise.start(t);
  }

  synthBass(t, freq, duration = 0.12, heavy = false) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = heavy ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(heavy ? 600 : 350, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + duration);

    gain.gain.setValueAtTime(heavy ? 0.35 : 0.28, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  synthLead(t, freq, duration = 0.2, type = 'sawtooth') {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2200, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + duration);

    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  synthPad(t, freqs, duration = 1.5) {
    freqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.08, t + 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(t);
      osc.stop(t + duration + 0.05);
    });
  }
}

// Global audio singleton
window.gameAudio = new AudioManager();
