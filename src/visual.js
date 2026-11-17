import { colorForValue } from './palette.js';
const colors = { compare: '#efb43e', swap: '#4189f4', pivot: '#a58bee', sorted: '#34bd8f', altered: '#dea25f' };

export class BarView {
  constructor(canvas, { compact = false, style = 'bars', palette = 'rainbow' } = {}) {
    this.canvas = canvas;
    this.compact = compact;
    this.style = style;
    this.palette = palette;
    this.hover = -1;
    this.width = 1;
    this.height = 1;
    this.lastValues = [];
    this.ctx = canvas.getContext('2d', { alpha: false });
    if (this.ctx) this.ctx.imageSmoothingEnabled = false;
  }
  resize() {
    if (!this.ctx) return;
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width), height = Math.max(1, rect.height);
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pxWidth = Math.round(width * dpr), pxHeight = Math.round(height * dpr);
    if (this.canvas.width !== pxWidth || this.canvas.height !== pxHeight) { this.canvas.width = pxWidth; this.canvas.height = pxHeight; }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.width = width; this.height = height;
  }
  draw(values, { highlight = null, completed = false, finishedAt = 0, now = performance.now(), altered = false } = {}) {
    if (!this.ctx) return;
    this.resize();
    const ctx = this.ctx, w = this.width, h = this.height;
    ctx.fillStyle = this.compact ? '#f5f7fb' : '#ffffff'; ctx.fillRect(0, 0, w, h);
    if (!values.length) return;
    this.lastValues = values;
    const max = Math.max(1, ...values), min = Math.min(...values), total = values.length;
    const padX = this.compact ? 7 : Math.min(20, w * 0.025);
    const maxColumns = Math.max(24, Math.floor((w - padX * 2) * 1.5));
    const n = Math.min(total, maxColumns);
    let shown = values;
    if (total > n) { const bins = new Float64Array(n); for (let i = 0; i < total; i++) { const bin = Math.min(n - 1, Math.floor(i * n / total)); if (values[i] > bins[bin]) bins[bin] = values[i]; } shown = bins; }
    const padB = this.compact ? 8 : 16, top = this.compact ? 9 : 16;
    const bw = (w - padX * 2) / n;
    const scaleHeight = h - top - padB;
    const completeFraction = completed ? Math.min(1, Math.max(0, (now - finishedAt) / (this.compact ? 350 : 730))) : 0;
    const visualIndex = i => i < 0 ? -1 : Math.min(n - 1, Math.floor(i * n / total));
    const activeA = visualIndex(highlight?.i ?? -1), activeB = visualIndex(highlight?.j ?? -1);
    for (let i = 0; i < n; i++) {
      const x = padX + i * bw, val = shown[i], barH = Math.max(2, (val / max) * scaleHeight);
      const color = colorForValue(val,min,max,this.palette);
      ctx.fillStyle = color;
      const gap = bw > 8 ? Math.max(1.5, bw * .16) : bw > 3 ? 1 : 0;
      if (this.style === 'dots' && !this.compact) { ctx.beginPath(); ctx.arc(x + bw / 2, h - padB - barH, Math.max(1.1, Math.min(4, (bw - gap) / 2)), 0, Math.PI * 2); ctx.fill(); }
      else if (this.style === 'circle' && !this.compact) { const angle = ((i + .5) / n) * Math.PI * 2 - Math.PI / 2; const radius = Math.min(w, h) * (0.12 + (val / max) * 0.35); const cx = w / 2 + Math.cos(angle) * radius, cy = h / 2 + Math.sin(angle) * radius; ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, Math.min(5, bw * .48)), 0, Math.PI * 2); ctx.fill(); }
      else ctx.fillRect(x + gap / 2, h - padB - barH, Math.max(.6, bw - gap), barH);
      if ((i===activeA||i===activeB)&&!completed) { ctx.strokeStyle=highlight?.t==='p'?colors.pivot:highlight?.t==='s'||highlight?.t==='w'?colors.swap:colors.compare;ctx.lineWidth=Math.min(3,Math.max(1.3,bw*.15));if(this.style==='bars'||this.compact)ctx.strokeRect(x+Math.max(.2,gap/2),h-padB-barH,Math.max(.6,bw-gap),barH);else {ctx.fillStyle=ctx.strokeStyle;ctx.fillRect(x+Math.max(0,bw/2-1),h-padB-4,2,4);} }
      if (!this.compact && i===visualIndex(this.hover) && !completed) {ctx.fillStyle='rgba(255,255,255,.16)';ctx.fillRect(x,h-padB-barH,Math.max(.6,bw),barH);}
      if(completed && (i / n)<=completeFraction) {ctx.fillStyle=altered?'rgba(222,162,95,.20)':'rgba(255,255,255,.25)';ctx.fillRect(x+gap/2,h-padB-barH,Math.max(.6,bw-gap),barH);}
    }
  }
  nearestIndex(clientX) { const rect = this.canvas.getBoundingClientRect(); const pad = this.compact ? 7 : Math.min(20, rect.width * .025); return Math.max(0, Math.min(this.lastValues.length - 1, Math.floor(((clientX - rect.left - pad) / (rect.width - 2 * pad)) * this.lastValues.length))); }
}
