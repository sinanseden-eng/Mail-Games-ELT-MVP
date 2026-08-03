import { ShootoutAudio } from "./shootout-audio.mjs";

export const TURKEY_SOUND_STORAGE_KEY = "mailgames.turkey.sound.v1";

export function turkeyCueProfile(event = {}) {
  switch (event.type) {
    case "ui-select":
      return [{ kind: "tone", frequency: 560, duration: 0.045, gain: 0.032, wave: "triangle" }];
    case "ui-lock":
      return [
        { kind: "tone", frequency: 390, duration: 0.08, gain: 0.042, wave: "triangle" },
        { kind: "tone", frequency: 620, duration: 0.09, gain: 0.034, wave: "triangle", delay: 0.06 }
      ];
    case "fight-start":
      return [
        { kind: "noise", duration: 0.48, gain: 0.016, filter: 1050 },
        { kind: "tone", frequency: 310, endFrequency: 520, duration: 0.22, gain: 0.045, wave: "sawtooth" }
      ];
    case "gobble":
      return [
        { kind: "tone", frequency: 160, endFrequency: 115, duration: 0.09, gain: 0.045, wave: "square" },
        { kind: "tone", frequency: 135, endFrequency: 92, duration: 0.11, gain: 0.04, wave: "square", delay: 0.1 }
      ];
    case "move":
      return [{ kind: "noise", duration: 0.15, gain: 0.048, filter: 1500 }];
    case "impact":
      return event.damage > 0
        ? [
            { kind: "noise", duration: 0.18, gain: 0.095, filter: 1250 },
            { kind: "tone", frequency: 120, endFrequency: 72, duration: 0.17, gain: 0.09, wave: "sine" }
          ]
        : [
            { kind: "noise", duration: 0.1, gain: 0.052, filter: 2200 },
            { kind: "tone", frequency: 420, endFrequency: 290, duration: 0.13, gain: 0.038, wave: "triangle" }
          ];
    case "fight-result":
      return event.completed
        ? [
            { kind: "chord", frequencies: [330, 440, 554, 659], duration: 0.72, gain: 0.033 },
            { kind: "noise", duration: 0.95, gain: 0.022, filter: 1400 }
          ]
        : [{ kind: "chord", frequencies: [294, 392, 494], duration: 0.38, gain: 0.028 }];
    default:
      return [];
  }
}

export class TurkeyAudio extends ShootoutAudio {
  constructor(options = {}) {
    super({ ...options, enabled: options.enabled ?? readPreference(), masterGain: options.masterGain ?? 0.68 });
  }

  setEnabled(value) {
    this.enabled = Boolean(value);
    writePreference(this.enabled);
    this.updateButton();
    if (!this.enabled && this.context?.state === "running") void this.context.suspend();
  }

  handleEvent(event = {}) {
    if (!this.enabled) return;
    const profile = turkeyCueProfile(event);
    if (!profile.length) return;
    void this.unlock().then(ready => {
      if (!ready) return;
      for (const cue of profile) this.playCue(cue);
    });
  }
}

export function createTurkeyAudio(options = {}) {
  return new TurkeyAudio(options);
}

function readPreference() {
  try {
    const value = globalThis.localStorage?.getItem(TURKEY_SOUND_STORAGE_KEY);
    return value === null ? true : value !== "off";
  } catch {
    return true;
  }
}

function writePreference(enabled) {
  try { globalThis.localStorage?.setItem(TURKEY_SOUND_STORAGE_KEY, enabled ? "on" : "off"); } catch {}
}
