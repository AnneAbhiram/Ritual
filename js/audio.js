let ctx = null;

function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function playCelebrationChime() {
  const ac = getCtx();
  const notes = [523.25, 659.25, 783.99, 1046.5];
  const now = ac.currentTime;
  notes.forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    const start = now + i * 0.11;
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.9);
    osc.connect(gain).connect(ac.destination);
    osc.start(start);
    osc.stop(start + 0.95);
  });
}
