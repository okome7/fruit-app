import test from 'node:test';
import assert from 'node:assert/strict';
import { fruitScenes, fruitSlotStyle } from '../src/lib/fruitLayout.js';

test('fruit and label anchors scale in the artwork coordinate system in portrait and landscape', () => {
  for (const clerk of [false, true]) {
    const scene = fruitScenes[clerk ? 'clerk' : 'customer'];
    for (const [width, height] of [[874, 402], [844, 390], [932, 430], [390, 390 * 402 / 874]]) {
      for (let index = 0; index < 8; index++) {
        const style = fruitSlotStyle(index, clerk);
        const row = Math.floor(index / 4), column = index % 4;
        assert.ok(Math.abs(parseFloat(style['--fruit-x']) / 100 * width - scene.fruitX[column] / scene.width * width) < 0.001);
        assert.ok(Math.abs(parseFloat(style['--label-y']) / 100 * height - scene.labelY[row] / scene.height * height) < 0.001);
        assert.ok(parseFloat(style['--fruit-y']) < parseFloat(style['--label-y']));
      }
    }
  }
});

test('customer plate anchors match screenshot-verified circles independently of their labels', () => {
  assert.deepEqual(fruitScenes.customer.fruitX, [247,555,863,1168]);
  assert.deepEqual(fruitScenes.customer.fruitY, [264,613]);
  // The fourth plate is left of its pink label; they must keep distinct centers.
  assert.equal(fruitScenes.customer.labelX[1][3], 1177);
});
