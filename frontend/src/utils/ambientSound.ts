// Ambient Soundscape Web Audio Synthesizer for Molat Focus Reading Room
// 100% offline, zero network assets, zero latency, on-device audio synthesis.

export type SoundscapeType = 'mute' | 'rain' | 'fireplace' | 'cafe';

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
  }

  return true;
}

export function getCurrentSoundscape(): SoundscapeType {
  return currentSoundscape;
}
