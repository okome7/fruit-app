import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('confirmation artwork and longest labels fit as separate nonshrinking rows on small and large screens', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.confirm-card > \*\s*\{[^}]*flex-shrink:\s*0/);
  assert.match(css, /\.big-fruit-art\s*\{[^}]*width:\s*min\(100px, calc\(10 \* var\(--scene-unit\)\)\);[^}]*height:\s*min\(100px, calc\(10 \* var\(--scene-unit\)\)\);[^}]*object-fit:\s*contain/);
  for (const [w,h] of [[320,568],[360,640],[390,844],[568,320],[740,300],[844,390],[1536,706]]) {
    const portrait = w < h;
    const frameHeight = portrait ? w * 402 / 874 : h;
    const unit = portrait ? w / 100 : Math.min(w / 100, h * 874 / 402 / 100);
    const cardWidth = portrait ? w * .76 - 2.9 * unit : w * .6 - 4.9 * unit;
    const cardHeight = portrait ? frameHeight * .92 - 2.9 * unit : frameHeight * .8 - 4.9 * unit;
    const fruitHeight = Math.min(100,10*unit);
    // Two-line feeling, wrapped two-line question and button row, with three gaps.
    const contentHeight = fruitHeight + 2*2*1.15*unit + 2*3*1.2*unit + Math.max(44,(16*65/152)*unit) + 3*unit;
    assert.ok(contentHeight <= cardHeight, `${w}x${h}: rows overflow the card`);
    assert.ok(17*2*unit <= cardWidth, `${w}x${h}: longest feeling overflows`);
    assert.ok((2*16+4)*unit <= cardWidth, `${w}x${h}: actions overflow`);
  }
});
