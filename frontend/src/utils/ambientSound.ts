// Ambient Soundscape Web Audio Synthesizer for Molat Focus Reading Room
// 100% offline, zero network assets, zero latency, on-device audio synthesis.

export type SoundscapeType = 'mute' | 'rain' | 'fireplace' | 'cafe' | 'ocean' | 'forest' | 'night' | 'brown';

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let activeNodes: { stop: () => void }[] = [];
let currentSoundscape: SoundscapeType = 'mute';

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

export function stopAmbientSound() {
  activeNodes.forEach((node) => {
    try {
      node.stop();
    } catch {
      // ignore
    }
  });
  activeNodes = [];
  currentSoundscape = 'mute';
}

export function pauseAmbientSound() {
  if (audioCtx && audioCtx.state === 'running') {
    audioCtx.suspend().catch(() => {});
  }
}

export function resumeAmbientSound() {
  if (audioCtx && audioCtx.state === 'suspended' && currentSoundscape !== 'mute') {
    audioCtx.resume().catch(() => {});
  }
}

export function isAmbientSoundPlaying(): boolean {
  return !!audioCtx && audioCtx.state === 'running' && currentSoundscape !== 'mute';
}

export function setAmbientVolume(volume: number) {
  if (masterGain && audioCtx) {
    const clamped = Math.max(0, Math.min(1, volume));
    masterGain.gain.setTargetAtTime(clamped, audioCtx.currentTime, 0.05);
  }
}

// 1. Soft Rain on Glass (Pink noise through low-pass & band-pass filters)
function createRainSound(ctx: AudioContext, destination: GainNode) {
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  // Pink noise approximation (Paul Kellet's filter)
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
    b6 = white * 0.115926;
  }

  const whiteNoise = ctx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;
  whiteNoise.loop = true;

  // Lowpass filter to muffle like rain hitting glass
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(650, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.5, ctx.currentTime);

  whiteNoise.connect(filter);
  filter.connect(gain);
  gain.connect(destination);
  whiteNoise.start();

  activeNodes.push({
    stop: () => {
      try {
        whiteNoise.stop();
        whiteNoise.disconnect();
      } catch {}
    },
  });
}

// 2. Cozy Fireplace (Brown noise rumble + randomized crackle spikes)
function createFireplaceSound(ctx: AudioContext, destination: GainNode) {
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  // Brown noise (integrated white noise) for flame rumble
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    output[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = output[i];
    output[i] *= 1.8;
  }

  const rumble = ctx.createBufferSource();
  rumble.buffer = noiseBuffer;
  rumble.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(320, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.6, ctx.currentTime);

  rumble.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(destination);
  rumble.start();

  // Periodic random wood crackle pops
  let crackleTimer: any = null;
  const scheduleCrackle = () => {
    if (currentSoundscape !== 'fireplace') return;
    const delay = 150 + Math.random() * 750;
    crackleTimer = setTimeout(() => {
      try {
        if (!audioCtx || currentSoundscape !== 'fireplace') return;
        const popOsc = ctx.createOscillator();
        const popGain = ctx.createGain();
        popOsc.type = 'triangle';
        popOsc.frequency.setValueAtTime(120 + Math.random() * 300, ctx.currentTime);

        const now = ctx.currentTime;
        popGain.gain.setValueAtTime(0.08 + Math.random() * 0.12, now);
        popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);

        popOsc.connect(popGain);
        popGain.connect(destination);
        popOsc.start(now);
        popOsc.stop(now + 0.04);
      } catch {}
      scheduleCrackle();
    }, delay);
  };
  scheduleCrackle();

  activeNodes.push({
    stop: () => {
      clearTimeout(crackleTimer);
      try {
        rumble.stop();
        rumble.disconnect();
      } catch {}
    },
  });
}

// 3. Warm Coffeehouse Murmur (Low textured ambient hum)
function createCafeSound(ctx: AudioContext, destination: GainNode) {
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * 0.08;
  }

  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const filter1 = ctx.createBiquadFilter();
  filter1.type = 'bandpass';
  filter1.frequency.setValueAtTime(450, ctx.currentTime);
  filter1.Q.setValueAtTime(1.5, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.35, ctx.currentTime);

  source.connect(filter1);
  filter1.connect(gain);
  gain.connect(destination);
  source.start();

  activeNodes.push({
    stop: () => {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    },
  });
}

// 4. Rolling Ocean Waves (Pink noise sweeping through filter with slow swell LFO)
function createOceanSound(ctx: AudioContext, destination: GainNode) {
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.04;
    b6 = white * 0.115926;
  }

  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuffer;
  noise.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(360, ctx.currentTime);

  const waveGain = ctx.createGain();
  waveGain.gain.setValueAtTime(0.35, ctx.currentTime);

  // LFO for wave period (~8.5 seconds per wave)
  const lfo = ctx.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.setValueAtTime(0.12, ctx.currentTime);

  const lfoFilterGain = ctx.createGain();
  lfoFilterGain.gain.setValueAtTime(220, ctx.currentTime);
  lfo.connect(lfoFilterGain);
  lfoFilterGain.connect(filter.frequency);

  const lfoVolGain = ctx.createGain();
  lfoVolGain.gain.setValueAtTime(0.16, ctx.currentTime);
  lfo.connect(lfoVolGain);
  lfoVolGain.connect(waveGain.gain);

  noise.connect(filter);
  filter.connect(waveGain);
  waveGain.connect(destination);

  noise.start();
  lfo.start();

  activeNodes.push({
    stop: () => {
      try {
        noise.stop();
        lfo.stop();
        noise.disconnect();
        filter.disconnect();
        waveGain.disconnect();
        lfo.disconnect();
      } catch {}
    },
  });
}

// 5. Forest Breeze & Soft Chirps (Canopy wind with subtle intermittent birdsong)
function createForestSound(ctx: AudioContext, destination: GainNode) {
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * 0.05;
  }

  const windSource = ctx.createBufferSource();
  windSource.buffer = noiseBuffer;
  windSource.loop = true;

  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'bandpass';
  windFilter.frequency.setValueAtTime(340, ctx.currentTime);
  windFilter.Q.setValueAtTime(0.8, ctx.currentTime);

  const windGain = ctx.createGain();
  windGain.gain.setValueAtTime(0.3, ctx.currentTime);

  windSource.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(destination);
  windSource.start();

  // Subtle randomized distant songbird chirps every 3.5 - 7s
  let birdTimer: any = null;
  const scheduleChirp = () => {
    if (currentSoundscape !== 'forest') return;
    const delay = 3200 + Math.random() * 3800;
    birdTimer = setTimeout(() => {
      try {
        if (!audioCtx || currentSoundscape !== 'forest') return;
        const now = ctx.currentTime;
        const baseFreq = 2600 + Math.random() * 800;

        const birdOsc = ctx.createOscillator();
        const birdGain = ctx.createGain();
        birdOsc.type = 'sine';
        birdOsc.frequency.setValueAtTime(baseFreq, now);
        birdOsc.frequency.exponentialRampToValueAtTime(baseFreq * 1.3, now + 0.06);
        birdOsc.frequency.exponentialRampToValueAtTime(baseFreq * 0.95, now + 0.12);

        birdGain.gain.setValueAtTime(0.0001, now);
        birdGain.gain.linearRampToValueAtTime(0.045, now + 0.03);
        birdGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

        birdOsc.connect(birdGain);
        birdGain.connect(destination);
        birdOsc.start(now);
        birdOsc.stop(now + 0.15);
      } catch {}
      scheduleChirp();
    }, delay);
  };
  scheduleChirp();

  activeNodes.push({
    stop: () => {
      clearTimeout(birdTimer);
      try {
        windSource.stop();
        windSource.disconnect();
        windFilter.disconnect();
        windGain.disconnect();
      } catch {}
    },
  });
}

// 6. Summer Night Crickets (Gentle evening air with rhythmic cricket chirping)
function createNightSound(ctx: AudioContext, destination: GainNode) {
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    output[i] = (Math.random() * 2 - 1) * 0.03;
  }

  const airSource = ctx.createBufferSource();
  airSource.buffer = noiseBuffer;
  airSource.loop = true;

  const airFilter = ctx.createBiquadFilter();
  airFilter.type = 'lowpass';
  airFilter.frequency.setValueAtTime(260, ctx.currentTime);

  const airGain = ctx.createGain();
  airGain.gain.setValueAtTime(0.25, ctx.currentTime);

  airSource.connect(airFilter);
  airFilter.connect(airGain);
  airGain.connect(destination);
  airSource.start();

  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.setValueAtTime(4300, ctx.currentTime);
  osc2.frequency.setValueAtTime(4750, ctx.currentTime);

  const tremolo = ctx.createOscillator();
  tremolo.type = 'sawtooth';
  tremolo.frequency.setValueAtTime(15, ctx.currentTime);

  const tremoloGain = ctx.createGain();
  tremoloGain.gain.setValueAtTime(0.035, ctx.currentTime);

  const cricketGain = ctx.createGain();
  cricketGain.gain.setValueAtTime(0.02, ctx.currentTime);

  tremolo.connect(tremoloGain);
  tremoloGain.connect(cricketGain.gain);
  osc1.connect(cricketGain);
  osc2.connect(cricketGain);
  cricketGain.connect(destination);

  osc1.start();
  osc2.start();
  tremolo.start();

  activeNodes.push({
    stop: () => {
      try {
        airSource.stop();
        airSource.disconnect();
        osc1.stop();
        osc2.stop();
        tremolo.stop();
        osc1.disconnect();
        osc2.disconnect();
        tremolo.disconnect();
        tremoloGain.disconnect();
        cricketGain.disconnect();
      } catch {}
    },
  });
}

// 7. Deep Brown Noise (Grounding 1/f² low-frequency reading focus)
function createBrownNoiseSound(ctx: AudioContext, destination: GainNode) {
  const bufferSize = ctx.sampleRate * 2;
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = noiseBuffer.getChannelData(0);

  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    output[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = output[i];
    output[i] *= 2.2;
  }

  const brownSource = ctx.createBufferSource();
  brownSource.buffer = noiseBuffer;
  brownSource.loop = true;

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(240, ctx.currentTime);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.45, ctx.currentTime);

  brownSource.connect(lowpass);
  lowpass.connect(gain);
  gain.connect(destination);
  brownSource.start();

  activeNodes.push({
    stop: () => {
      try {
        brownSource.stop();
        brownSource.disconnect();
        lowpass.disconnect();
        gain.disconnect();
      } catch {}
    },
  });
}

export function playAmbientSound(type: SoundscapeType, volume: number = 0.4): boolean {
  stopAmbientSound();

  if (type === 'mute') {
    return true;
  }

  const ctx = getAudioContext();
  if (!ctx || !masterGain) return false;

  currentSoundscape = type;
  setAmbientVolume(volume);

  if (type === 'rain') {
    createRainSound(ctx, masterGain);
  } else if (type === 'fireplace') {
    createFireplaceSound(ctx, masterGain);
  } else if (type === 'cafe') {
    createCafeSound(ctx, masterGain);
  } else if (type === 'ocean') {
    createOceanSound(ctx, masterGain);
  } else if (type === 'forest') {
    createForestSound(ctx, masterGain);
  } else if (type === 'night') {
    createNightSound(ctx, masterGain);
  } else if (type === 'brown') {
    createBrownNoiseSound(ctx, masterGain);
  }

  return true;
}

export function getCurrentSoundscape(): SoundscapeType {
  return currentSoundscape;
}
