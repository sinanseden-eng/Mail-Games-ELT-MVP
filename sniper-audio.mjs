export function createSniperAudio({ button = null } = {}) {
  let enabled = true;
  let context = null;

  if (button) {
    button.setAttribute("aria-pressed", "true");
    button.textContent = "Sound on";
    button.addEventListener("click", () => {
      enabled = !enabled;
      button.setAttribute("aria-pressed", String(enabled));
      button.textContent = enabled ? "Sound on" : "Sound off";
    });
  }

  async function unlock() {
    if (!enabled || typeof AudioContext === "undefined") return;
    context ||= new AudioContext();
    if (context.state === "suspended") await context.resume();
  }

  function tone(frequency, duration = 0.08, gainValue = 0.035, type = "triangle") {
    if (!enabled || !context) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.type = type;
    gain.gain.setValueAtTime(Math.max(0.0001, gainValue), context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
  }

  function noise(duration = 0.12, gainValue = 0.05, highpass = 0) {
    if (!enabled || !context) return;
    const length = Math.max(1, Math.floor(context.sampleRate * duration));
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 1.7);
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(gainValue, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    if (highpass > 0) {
      const filter = context.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.value = highpass;
      source.connect(filter).connect(gain).connect(context.destination);
    } else {
      source.connect(gain).connect(context.destination);
    }
    source.start();
  }

  function gunshot(actor = "A") {
    noise(0.075, 0.115, 520);
    tone(actor === "A" ? 72 : 68, 0.24, 0.082, "sawtooth");
    setTimeout(() => noise(0.045, 0.052, 1800), 12); // supersonic crack
    setTimeout(() => tone(actor === "A" ? 118 : 108, 0.32, 0.025, "triangle"), 95); // valley echo
    setTimeout(() => noise(0.18, 0.018, 350), 145);
  }

  function impact(hit) {
    if (hit) {
      noise(0.09, 0.045, 260);
      tone(168, 0.13, 0.04, "triangle");
      setTimeout(() => tone(540, 0.06, 0.018, "sine"), 25);
    } else {
      noise(0.13, 0.045, 700);
      tone(112, 0.1, 0.018, "triangle");
    }
  }

  function scopeFocus(actor = "A") {
    tone(actor === "A" ? 430 : 390, 0.12, 0.014, "sine");
    setTimeout(() => tone(220, 0.18, 0.012, "triangle"), 35);
    setTimeout(() => noise(0.18, 0.012, 900), 55);
  }

  function scopeLock(actor = "A") {
    tone(actor === "A" ? 760 : 710, 0.075, 0.018, "sine");
    setTimeout(() => tone(actor === "A" ? 1040 : 980, 0.095, 0.016, "sine"), 62);
  }

  function boltCycle(actor = "A") {
    tone(actor === "A" ? 176 : 164, 0.045, 0.026, "square");
    setTimeout(() => noise(0.045, 0.026, 1200), 36);
    setTimeout(() => tone(132, 0.055, 0.02, "triangle"), 82);
  }

  function handleEvent(event = {}) {
    if (!enabled || !context) return;
    if (event.type === "ui-select") tone(520, 0.05, 0.025);
    else if (event.type === "ui-lock") tone(320, 0.08, 0.035);
    else if (event.type === "emerge") tone(210, 0.1, 0.024);
    else if (event.type === "aim") tone(680, 0.08, 0.018);
    else if (event.type === "scope") scopeFocus(event.actor);
    else if (event.type === "scope-lock") scopeLock(event.actor);
    else if (event.type === "shot") gunshot(event.actor);
    else if (event.type === "disabled") {
      tone(94, 0.11, 0.025, "square");
      setTimeout(() => tone(78, 0.08, 0.018, "square"), 75);
    }
    else if (event.type === "impact") impact(Boolean(event.hit));
    else if (event.type === "bolt") boltCycle(event.actor);
    else if (event.type === "result") tone(600, 0.22, 0.03);
  }

  return { unlock, handleEvent };
}
