const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export class SortAudio {
  constructor() { this.context = null; this.enabled = true; this.volume = 0.3; this.style = 'retro'; this.lastNote = 0; this.nextScheduled = 0; }
  unlock() { if (!this.enabled) return; try { if (!this.context) this.context = new (window.AudioContext || window.webkitAudioContext)(); if (this.context.state === 'suspended') this.context.resume(); } catch { this.enabled = false; } }
  setEnabled(enabled) { this.enabled = enabled; if (enabled) this.unlock(); }
  note(value, maxValue = 100, kind = 's', delay = 0) {
    if (!this.enabled || !this.context || this.context.state !== 'running' || document.hidden) return;
    const ctx = this.context;
    const t = Math.max(ctx.currentTime, ctx.currentTime + delay);
    const ratio = clamp(value / Math.max(1, maxValue), 0, 1);
    const freq = 180 * Math.pow(2, ratio * 2.7);
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = this.style === 'soft' ? 'sine' : this.style === 'click' ? 'square' : this.style === 'synth' ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(freq, t);
    const duration = this.style === 'soft' ? 0.10 : this.style === 'synth' ? 0.07 : 0.043;
    const peak = (this.style === 'click' ? 0.009 : 0.018) * this.volume * (kind === 'c' ? 0.68 : 1);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(t); osc.stop(t + duration + 0.006);
    osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  }
  consume(events, maxValue = 100) {
    if (!events.length || !this.context) return;
    const now = this.context.currentTime;
    if (now < this.lastNote + 0.029) return;
    this.lastNote = now;
    const choices = events.length > 2 ? [events[0], events[events.length - 1]] : events;
    choices.forEach((e, i) => this.note(e.value, maxValue, e.op.t, i * 0.017));
  }
  complete() {
    if (!this.context || !this.enabled || document.hidden) return;
    for (let i = 0; i < 16; i++) this.note(i + 1, 16, 's', i * 0.036);
  }
}
