export const SOUND_STORAGE_KEY = "mailgames.shootout.sound.v1";

export function cueProfile(event = {}) {
  const outcome = event.outcome || event.round?.outcome || "";
  const zone = event.zone || event.round?.shotZone || "bottom-centre";
  const high = String(zone).startsWith("top-");
  const side = String(zone).endsWith("left") ? -1 : String(zone).endsWith("right") ? 1 : 0;
  const viewerRole = event.viewerRole || event.round?.viewerRole || "striker";
  const keeperView = viewerRole === "keeper";
  switch (event.type) {
    case "ui-select":
      return [{ kind: "tone", frequency: 520, duration: 0.045, gain: 0.035, wave: "sine" }];
    case "ui-lock":
      return [
        { kind: "tone", frequency: 430, duration: 0.07, gain: 0.045, wave: "triangle" },
        { kind: "tone", frequency: 660, duration: 0.08, gain: 0.035, wave: "triangle", delay: 0.055 }
      ];
    case "answer-correct":
      return [
        { kind: "tone", frequency: 560, duration: 0.08, gain: 0.04, wave: "sine" },
        { kind: "tone", frequency: 760, duration: 0.12, gain: 0.045, wave: "sine", delay: 0.07 }
      ];
    case "answer-incorrect":
      return [
        { kind: "tone", frequency: 235, endFrequency: 165, duration: 0.17, gain: 0.045, wave: "sawtooth" }
      ];
    case "replay-start":
      return [
        { kind: "noise", duration: 0.62, gain: 0.014, filter: 850 },
        { kind: "tone", frequency: 740, endFrequency: 1050, duration: 0.20, gain: 0.038, wave: "sine", delay: 0.08 }
      ];
    case "anticipation":
      return [{ kind: "tone", frequency: 880, duration: 0.075, gain: 0.03, wave: "sine" }];
    case "camera-cut":
      if (event.camera === "over-shoulder") {
        return [
          { kind: "noise", duration: 0.12, gain: 0.018, filter: 1800 },
          { kind: "tone", frequency: 510, endFrequency: 390, duration: 0.10, gain: 0.018, wave: "sine" }
        ];
      }
      if (event.camera === "ball-cam" || event.camera === "incoming-ball") {
        return [{ kind: "noise", duration: keeperView ? 0.26 : 0.18, gain: keeperView ? 0.032 : 0.022, filter: keeperView ? 2850 : 2350 }];
      }
      if (event.camera === "keeper-set") {
        return [{ kind: "tone", frequency: 380, endFrequency: 300, duration: 0.12, gain: 0.014, wave: "sine" }];
      }
      return [{ kind: "tone", frequency: 310, endFrequency: 220, duration: 0.09, gain: keeperView ? 0.012 : 0.016, wave: "triangle" }];
    case "strike":
      return [
        { kind: "noise", duration: 0.070, gain: keeperView ? 0.072 : 0.110, filter: high ? 1760 : 1480 },
        { kind: "tone", frequency: high ? 146 : 124, endFrequency: 58, duration: 0.18, gain: keeperView ? 0.088 : 0.135, wave: "sine" },
        { kind: "noise", duration: 0.24, gain: 0.024, filter: 3500, delay: 0.028 },
        { kind: "tone", frequency: side === 0 ? 84 : 76, duration: 0.11, gain: 0.024, wave: "triangle", delay: 0.025 }
      ];
    case "impact":
      if (outcome === "goal") {
        return [
          { kind: "noise", duration: high ? 0.42 : 0.34, gain: keeperView ? 0.096 : 0.078, filter: high ? 2650 : 2200 },
          { kind: "tone", frequency: high ? 112 : 92, duration: 0.22, gain: 0.068, wave: "sine" },
          { kind: "noise", duration: 0.72, gain: 0.022, filter: 940, delay: 0.055 },
          { kind: "tone", frequency: 620, endFrequency: 390, duration: 0.13, gain: 0.018, wave: "triangle", delay: 0.035 }
        ];
      }
      if (outcome === "save") {
        return [
          { kind: "noise", duration: 0.095, gain: keeperView ? 0.155 : 0.125, filter: high ? 2050 : 1700 },
          { kind: "tone", frequency: high ? 205 : 172, endFrequency: 112, duration: 0.19, gain: 0.088, wave: "triangle" },
          { kind: "noise", duration: 0.24, gain: 0.034, filter: 680, delay: 0.035 },
          { kind: "tone", frequency: 760, endFrequency: 510, duration: 0.10, gain: 0.022, wave: "sine", delay: 0.025 }
        ];
      }
      if (zone === "top-left" || zone === "top-right") {
        return [
          { kind: "tone", frequency: 1480, endFrequency: 720, duration: 0.34, gain: 0.060, wave: "triangle" },
          { kind: "tone", frequency: 920, endFrequency: 480, duration: 0.46, gain: 0.032, wave: "sine", delay: 0.018 },
          { kind: "noise", duration: 0.12, gain: 0.045, filter: 3200 }
        ];
      }
      if (zone === "top-centre") {
        return [
          { kind: "noise", duration: 0.34, gain: 0.032, filter: 1200 },
          { kind: "tone", frequency: 310, endFrequency: 168, duration: 0.35, gain: 0.038, wave: "sine" }
        ];
      }
      return [
        { kind: "noise", duration: 0.18, gain: 0.050, filter: 840 },
        { kind: "tone", frequency: 205, endFrequency: 118, duration: 0.30, gain: 0.038, wave: "sine" }
      ];
    case "result":
      if (outcome === "goal") {
        return [
          { kind: "chord", frequencies: [392, 494, 659], duration: 0.55, gain: 0.038 },
          { kind: "noise", duration: 0.9, gain: 0.024, filter: 1350 }
        ];
      }
      if (outcome === "save") {
        return [
          { kind: "chord", frequencies: [294, 370, 494], duration: 0.42, gain: 0.034 },
          { kind: "noise", duration: 0.55, gain: 0.017, filter: 1050 }
        ];
      }
      return [{ kind: "tone", frequency: 260, endFrequency: 175, duration: 0.42, gain: 0.038, wave: "triangle" }];
    case "full-time":
      return [
        { kind: "chord", frequencies: [330, 440, 554, 659], duration: 0.75, gain: 0.032 },
        { kind: "noise", duration: 1.1, gain: 0.02, filter: 1500 }
      ];
    default:
      return [];
  }
}

export class ShootoutAudio {
  constructor({ button = null, enabled = readPreference(), masterGain = 0.72 } = {}) {
    this.button = button;
    this.enabled = Boolean(enabled);
    this.masterGainValue = masterGain;
    this.context = null;
    this.master = null;
    this.noiseBuffer = null;
    this.updateButton();
    this.button?.addEventListener("click", async () => {
      this.setEnabled(!this.enabled);
      if (this.enabled) await this.unlock();
      this.handleEvent({ type: "ui-select" });
    });
  }

  async unlock() {
    if (!this.enabled) return false;
    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) return false;
    if (!this.context) {
      this.context = new AudioContextClass();
      this.master = this.context.createGain();
      this.master.gain.value = this.masterGainValue;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === "suspended") {
      try { await this.context.resume(); } catch { return false; }
    }
    return this.context.state === "running";
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    writePreference(this.enabled);
    this.updateButton();
    if (!this.enabled && this.context?.state === "running") void this.context.suspend();
  }

  updateButton() {
    if (!this.button) return;
    this.button.setAttribute("aria-pressed", String(this.enabled));
    this.button.textContent = this.enabled ? "Sound on" : "Sound off";
    this.button.title = this.enabled ? "Turn match sound off" : "Turn match sound on";
  }

  handleEvent(event = {}) {
    if (!this.enabled) return;
    const profile = cueProfile(event);
    if (!profile.length) return;
    void this.unlock().then(ready => {
      if (!ready) return;
      for (const cue of profile) this.playCue(cue);
    });
  }

  playCue(cue) {
    if (!this.context || !this.master) return;
    if (cue.kind === "noise") return this.playNoise(cue);
    if (cue.kind === "chord") {
      for (const frequency of cue.frequencies || []) this.playTone({ ...cue, kind: "tone", frequency });
      return;
    }
    this.playTone(cue);
  }

  playTone({ frequency = 440, endFrequency = frequency, duration = 0.12, gain = 0.04, wave = "sine", delay = 0 }) {
    const now = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    envelope.gain.setValueAtTime(0.0001, now);
    envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), now + Math.min(0.018, duration * 0.22));
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(envelope);
    envelope.connect(this.master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
  }

  playNoise({ duration = 0.2, gain = 0.04, filter = 1200, delay = 0 }) {
    const now = this.context.currentTime + delay;
    const source = this.context.createBufferSource();
    const envelope = this.context.createGain();
    const band = this.context.createBiquadFilter();
    source.buffer = this.getNoiseBuffer();
    band.type = "lowpass";
    band.frequency.setValueAtTime(filter, now);
    envelope.gain.setValueAtTime(Math.max(0.0002, gain), now);
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(band);
    band.connect(envelope);
    envelope.connect(this.master);
    source.start(now, 0, duration);
    source.stop(now + duration + 0.03);
  }

  getNoiseBuffer() {
    if (this.noiseBuffer) return this.noiseBuffer;
    const length = Math.max(1, Math.floor(this.context.sampleRate * 1.25));
    const buffer = this.context.createBuffer(1, length, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
    this.noiseBuffer = buffer;
    return buffer;
  }
}

export function createShootoutAudio(options = {}) {
  return new ShootoutAudio(options);
}

function readPreference() {
  try {
    const value = globalThis.localStorage?.getItem(SOUND_STORAGE_KEY);
    return value === null ? true : value !== "off";
  } catch {
    return true;
  }
}

function writePreference(enabled) {
  try { globalThis.localStorage?.setItem(SOUND_STORAGE_KEY, enabled ? "on" : "off"); } catch {}
}
