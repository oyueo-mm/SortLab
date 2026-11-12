import { createSort } from './algorithms.js';

const HISTORY_LIMIT = 150000;

export class SortEngine {
  constructor(id, input) { this.reset(id, input); }

  reset(id, input) {
    const source = createSort(id, input);
    this.id = id;
    this.algorithm = source.algo;
    this.initial = source.data;
    this.values = [...source.data];
    this.generator = source.iterator;
    this.history = [];
    this.position = 0;
    this.historyStart = 0;
    this.comparisons = 0;
    this.swaps = 0;
    this.writes = 0;
    this.highlight = null;
    this.completed = false;
    this.failed = false;
    this.error = '';
    this.finishedAt = 0;
    this.operations = 0;
    this.doneGenerating = false;
  }

  stepForward() {
    if (this.completed) return null;
    let entry;
    if (this.position < this.history.length) entry = this.history[this.position];
    else {
      if (this.doneGenerating) { this.finish(); return null; }
      let next;
      try { next = this.generator.next(); }
      catch (error) { this.failed = true; this.error = error.message; this.completed = true; this.finishedAt = performance.now(); this.highlight = null; return null; }
      if (next.done) { this.doneGenerating = true; this.finish(); return null; }
      entry = { op: next.value, old: (next.value.t === 'w' || next.value.t === 'd') ? this.values[next.value.i] : null };
      this.history.push(entry);
      if (this.history.length > HISTORY_LIMIT) { this.history.shift(); this.historyStart++; this.position--; }
    }
    this.position++;
    const { op } = entry;
    if (op.t === 's') { [this.values[op.i], this.values[op.j]] = [this.values[op.j], this.values[op.i]]; this.swaps++; }
    if (op.t === 'w') { this.values[op.i] = op.v; this.writes++; }
    if (op.t === 'd') { this.values.splice(op.i,1); }
    if (op.t === 'c') this.comparisons++;
    this.operations++;
    this.highlight = op;
    return op;
  }

  stepBack() {
    if (this.position === 0) return null;
    this.position--;
    const { op, old } = this.history[this.position];
    if (op.t === 's') { [this.values[op.i], this.values[op.j]] = [this.values[op.j], this.values[op.i]]; this.swaps--; }
    if (op.t === 'w') { this.values[op.i] = old; this.writes--; }
    if (op.t === 'd') { this.values.splice(op.i,0,old); }
    if (op.t === 'c') this.comparisons--;
    this.operations--;
    this.completed = false;
    this.failed = false;
    this.finishedAt = 0;
    this.highlight = this.position ? this.history[this.position - 1].op : null;
    return op;
  }

  finish() {
    if (!this.completed) { this.completed = true; this.finishedAt = performance.now(); this.highlight = null; }
  }

  run(steps, maxTimeMs = 8) {
    const events = [];
    const start = performance.now();
    for (let k = 0; k < steps; k++) {
      const op = this.stepForward();
      if (!op) break;
      if ((op.t === 'c' || op.t === 's' || op.t === 'w') && (k % Math.max(1, Math.floor(steps / 4)) === 0)) events.push({ op, value: this.values[op.i] ?? 0 });
      if ((k & 127) === 127 && performance.now() - start > maxTimeMs) break;
    }
    return events;
  }
}

export const speedToEventsPerSecond = value => Math.round(5 * Math.pow(2800, (Math.max(1, Math.min(200, value)) - 1) / 199));
