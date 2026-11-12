import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { SortEngine, speedToEventsPerSecond } from '../src/engine.js';
import { algorithms } from '../src/algorithms.js';
import { generateData } from '../src/data.js';

test('undo/redo restores array and counters for comparison, swap and write events', () => {
  for (const id of ['bubble','insertion','quickHoare','merge','timsort','counting']) {
    const seed = generateData(24,'random',0.672);
    const e = new SortEngine(id,seed);
    const positions = [];
    for (let i=0;i<40;i++) { positions.push({values:[...e.values],comparisons:e.comparisons,swaps:e.swaps,writes:e.writes});e.stepForward(); }
    for (let i=39;i>=0;i--) { e.stepBack(); assert.deepEqual(e.values,positions[i].values,id);assert.equal(e.comparisons,positions[i].comparisons,id);assert.equal(e.swaps,positions[i].swaps,id);assert.equal(e.writes,positions[i].writes,id); }
    for(let i=0;i<40;i++)e.stepForward();
    while(!e.completed)e.stepForward();
    assert.deepEqual(e.values,[...seed].sort((x,y)=>x-y),id);
    e.stepBack();assert.equal(e.completed,false);
    while(!e.completed)e.stepForward();
    assert.deepEqual(e.values,[...seed].sort((x,y)=>x-y),id);
  }
});

test('performance on length 100 and all major input patterns', () => {
  for (const a of algorithms.filter(a => !a.altersInput && !a.mayNotFinish && !['bogo','bozo','stooge','slow'].includes(a.id))) {
    for(const pattern of ['random','ascending','descending','duplicates','nearly']) {
      const data=generateData(Math.min(100,a.maxSize||100),pattern,0.18272);
      const e=new SortEngine(a.id,data);
      let budget=2_000_000;
      while(!e.completed && budget-->0) e.stepForward();
      assert.ok(e.completed&&!e.failed,`${a.id}/${pattern} did not finish`);
      assert.deepEqual(e.values,[...e.initial].sort((x,y)=>x-y),`${a.id}/${pattern}`);
    }
  }
});

test('speed function is monotonic with safe boundaries', () => {
  const speeds=[1,2,5,10,20,50,100,150,199,200].map(speedToEventsPerSecond);
  assert.ok(speeds.every((v,i)=>i===0 || v>=speeds[i-1]));
  assert.equal(speedToEventsPerSecond(1),5);
  assert.equal(speedToEventsPerSecond(200),14000);
});
