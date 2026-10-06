import test from 'node:test';
import assert from 'node:assert/strict';
import { createImagePreloader } from '../src/lib/imagePreloader.js';

function fixture(allowed = true) {
  const images = [];
  const scheduled = new Map();
  let id = 0;
  const preloader = createImagePreloader({
    createImage: () => { const image = {}; images.push(image); return image; },
    schedule: (callback) => { scheduled.set(++id, callback); return id; },
    cancelSchedule: (key) => scheduled.delete(key),
    allowPrefetch: () => allowed,
  });
  const finish = (index, ok = true) => images[index][ok ? 'onload' : 'onerror']();
  const run = () => { const [key, callback] = scheduled.entries().next().value; scheduled.delete(key); return callback(); };
  return { preloader, images, scheduled, finish, run };
}
const flush = async () => { await Promise.resolve(); await Promise.resolve(); };

test('current screen completes first, then next-screen images load one at a time at low priority', async () => {
  const f = fixture();
  const plan = f.preloader.plan(['current', 'current'], ['next1', 'next2']);
  assert.deepEqual(f.images.map((i) => i.src), ['current']);
  assert.equal(f.images[0].fetchPriority, 'high');
  assert.equal(f.scheduled.size, 0);
  f.finish(0); await plan;
  const prefetch = f.run();
  assert.deepEqual(f.images.map((i) => i.src), ['current', 'next1']);
  assert.equal(f.images[1].fetchPriority, 'low');
  f.finish(1); await flush();
  assert.deepEqual(f.images.map((i) => i.src), ['current', 'next1', 'next2']);
  f.finish(2); await prefetch;
  await f.preloader.plan(['next1'], []);
  assert.equal(f.images.length, 3);
  assert.equal(f.images[1].fetchPriority, 'high');
});
test('changing screen cancels stale queued prefetch and stops an in-flight plan after one image', async () => {
  const f = fixture();
  const first = f.preloader.plan(['a'], ['b', 'never']);
  f.finish(0); await first;
  const prefetch = f.run();
  const second = f.preloader.plan(['c'], ['d']);
  f.finish(1); await prefetch;
  assert.equal(f.images.some((i) => i.src === 'never'), false);
  f.finish(2); await second;
  assert.equal(f.scheduled.size, 1);
  await f.preloader.plan(['c'], []);
  assert.equal(f.scheduled.size, 0);
});
test('save-data policy and current-image errors skip speculation; failure is retryable', async () => {
  const f = fixture(false);
  const first = f.preloader.plan(['a'], ['b']);
  f.finish(0, false); await first;
  assert.equal(f.scheduled.size, 0);
  const retry = f.preloader.plan(['a'], ['b']);
  f.finish(1); await retry;
  assert.equal(f.images.length, 2);
  assert.equal(f.scheduled.size, 0);
});
test('dispose prevents any further speculative requests', async () => {
  const f = fixture();
  const pending = f.preloader.plan(['a'], ['b']);
  f.preloader.dispose(); f.finish(0); await pending;
  assert.equal(f.scheduled.size, 0);
  await f.preloader.plan(['c'], ['d']);
  assert.equal(f.images.length, 1);
});
