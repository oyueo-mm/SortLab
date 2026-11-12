import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { algorithms, createSort } from '../src/algorithms.js';
import { generateData } from '../src/data.js';

function run(id, input) {
  const { data, iterator } = createSort(id, input);
  const a = [...data];
  let events = 0;
  for (const op of iterator) {
    assert.ok(['c','s','w','p','r','d'].includes(op.t), `${id}: bad operation`);
    if (op.t === 's') { assert.ok(op.i >= 0 && op.i < a.length && op.j >= 0 && op.j < a.length, `${id} invalid swap`); [a[op.i],a[op.j]] = [a[op.j],a[op.i]]; }
    if (op.t === 'w') { assert.ok(op.i >= 0 && op.i < a.length, `${id} invalid write`); a[op.i] = op.v; }
    if (op.t === 'd') { assert.ok(op.i >= 0 && op.i < a.length, `${id} invalid deletion`); a.splice(op.i,1); }
    assert.ok(++events < 1_000_000, `${id}: exceeded event budget`);
  }
  assert.deepEqual(a, [...data].sort((x,y)=>x-y), `${id}: incorrectly sorted`);
}

for (const algo of algorithms.filter(a=>!a.altersInput&&!a.mayNotFinish)) {
  test(`${algo.en}: random, ordered, reverse, duplicate, wave`, () => {
    const n = algo.maxSize ? Math.min(algo.maxSize, 16) : 28;
    for (const pattern of ['random','ascending','descending','nearly','duplicates','mountain','wave']) {
      const seed = 0.31415926;
      const size = ['bogo','bozo'].includes(algo.id) ? 4 : n;
      run(algo.id,generateData(size,pattern,seed));
    }
    for (let seed = 1; seed <= 6; seed++) {
      run(algo.id,generateData(['bogo','bozo'].includes(algo.id)?4:algo.maxSize?Math.min(algo.maxSize,23):31,'random',seed/11));
    }
  });
}

test('handles short and equal-value arrays', () => {
  for (const algo of algorithms.filter(a=>!a.altersInput&&!a.mayNotFinish)) {
    for (const input of [[1],[1,1],[2,1],[2,2,1,1],[3,3,3,3]]) run(algo.id,input);
  }
});
