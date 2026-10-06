import test from 'node:test';
import assert from 'node:assert/strict';
import { createDragSession, pointInRect } from '../src/lib/pointerDrag.js';
import { createCountdown } from '../src/lib/countdown.js';
const event = (overrides = {}) => ({ isPrimary: true, pointerId: 1, button: 0, clientX: 10, clientY: 20, ...overrides });
const basket = { left: 100, right: 200, top: 50, bottom: 150 };

test('pointer preview begins without committing; only correct pointer can finish once', () => {
  const drag = createDragSession();
  assert.equal(drag.begin(event()), true);
  assert.equal(drag.begin(event({ pointerId: 2 })), false);
  assert.equal(drag.move(event({ pointerId: 2 })), false);
  assert.equal(drag.finish(event({ pointerId: 2, clientX: 150, clientY: 100 }), basket), false);
  assert.ok(drag.active);
  assert.equal(drag.finish(event({ clientX: 150, clientY: 100 }), basket), true);
  assert.equal(drag.active, null);
  assert.equal(drag.finish(event({ clientX: 150, clientY: 100 }), basket), false);
});
test('outside drop, cancelled drag and non-primary/right-button do not commit', () => {
  const drag = createDragSession();
  assert.equal(drag.begin(event({ isPrimary: false })), false);
  assert.equal(drag.begin(event({ button: 2 })), false);
  drag.begin(event());
  assert.equal(drag.finish(event(), basket), false);
  drag.begin(event()); drag.cancel();
  assert.equal(drag.finish(event({ clientX: 150, clientY: 100 }), basket), false);
  assert.equal(pointInRect(100, 50, basket), true);
  assert.equal(pointInRect(100, 151, basket), false);
  assert.equal(pointInRect(100, 50, null), false);
});
test('help pause/resume preserves exact remaining fraction and never resets to 180', () => {
  let now = 0;
  const timer = createCountdown(180, () => now);
  timer.resume(); now += 10250;
  assert.equal(timer.seconds, 170);
  timer.pause(); now += 50000;
  assert.equal(timer.seconds, 170);
  timer.resume(); now += 750;
  assert.equal(timer.seconds, 169);
  timer.pause(); timer.resume(); assert.equal(timer.seconds, 169);
});
test('countdown expires at zero and reset explicitly creates a new attempt', () => {
  let now = 0;
  const timer = createCountdown(180, () => now);
  timer.resume(); now = 180001;
  assert.equal(timer.seconds, 0);
  timer.pause(); timer.resume(); assert.equal(timer.seconds, 0);
  timer.reset(); assert.equal(timer.seconds, 180); assert.equal(timer.running, false);
});
