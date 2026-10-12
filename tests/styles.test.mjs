import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('responsive lengths keep negative signs inside CSS math functions', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /(?:^|[^\w-])[-+](?:calc|min|max|clamp)\(/);
  assert.match(css, /top:\s*calc\(-2\.4 \* var\(--scene-unit\)\)/);
});

test('disabled fruit and its descendants pass menu-dismissal taps to the background only while the menu is open', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.help-menu-open \.fruit-card:disabled,\s*\.help-menu-open \.fruit-card:disabled \*\s*\{\s*pointer-events:\s*none;\s*\}/);
});

test('landscape scenery fills the viewport without adding an outer scene inset', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  const viewport = css.match(/\.viewport\s*\{([^}]*)\}/)[1];
  const frame = css.match(/\.screen-frame\s*\{([^}]*)\}/)[1];
  assert.doesNotMatch(css, /--scene-fit|--scene-width/);
  assert.doesNotMatch(viewport, /\bpadding\s*:/);
  assert.match(frame, /width:\s*100%/);
  assert.match(frame, /height:\s*100%/);
  assert.match(frame, /background:[^;]*100% 100% no-repeat/);
  assert.match(css, /-webkit-text-size-adjust:\s*100%/);
  assert.match(css, /@media \(orientation: portrait\)[\s\S]*aspect-ratio:\s*874 \/ 402/);
  assert.match(css, /\.screen-frame \.start-button\s*\{[^}]*top:\s*78\.856%;[^}]*bottom:\s*auto/);
});

test('only the long first lesson is reduced, while the register word matches its neighboring text', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.lesson-one\s*\{[^}]*font-size:\s*calc\(2\.5 \* var\(--scene-unit\)\)/);
  assert.match(css, /\.lesson\s*\{[^}]*font-size:\s*calc\(2\.75 \* var\(--scene-unit\)\)/);
  assert.match(css, /\.help-lesson-two \.register-word,\s*\.help-lesson-two \.register-word \.register-base\s*\{\s*font:\s*inherit;\s*\}/);
  assert.match(css, /\.katakana-ruby rt\s*\{[^}]*font-size:\s*0\.48em/);
  assert.doesNotMatch(css, /font-size:\s*1\.25em/);
  for (const [width, height, left, right, top, bottom] of [
    [874, 402, 62, 62, 0, 21], [844, 390, 47, 47, 0, 21],
    [932, 430, 59, 59, 0, 21], [740, 300, 0, 0, 0, 0],
    [1536, 706, 0, 0, 0, 0], [390, 844, 0, 0, 47, 34],
  ]) {
    const availableWidth = width - left - right, availableHeight = height - top - bottom;
    const sceneUnit = width < height ? availableWidth / 100
      : Math.min(availableWidth / 100, availableHeight * 874 / 402 / 100);
    // Worst-case full-width glyph advances; ruby reading is narrower than its base.
    assert.ok(34 * 2.5 * sceneUnit <= availableWidth * .85 + 1e-8);
    assert.ok(26 * 2.45 * sceneUnit < availableWidth * .7);
  }
});

test('terms PNG controls keep readable scrolling text and separate tap areas on small portrait scenes', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.terms-body\s*\{[^}]*height:\s*46%;[^}]*font-size:\s*max\(12px/);
  assert.match(css, /\.terms-action\s*\{[^}]*bottom:\s*4%;[^}]*min-height:\s*44px/);
  for (const [width, height] of [[320,568],[360,640],[390,844],[430,932],[740,300],[844,390],[1024,768],[1536,864]]) {
    const sceneHeight=width<height ? width*402/874 : height;
    const unit=width<height ? width/100 : Math.min(width/100,height*874/402/100);
    const textBottom=sceneHeight*.65;
    const actionHeight=Math.max(44,Math.min(width*.26,208)*65/208);
    const actionTop=sceneHeight*.96-actionHeight;
    assert.ok(textBottom<actionTop, `${width}x${height}: terms text touches actions`);
    assert.ok(width*.0835+width*.26 < width*(1-.0835-.26), `${width}: terms actions overlap`);
  }
});

test('result actions retain their original anchors and use only PNG artwork', () => {
  const css=readFileSync(new URL('../src/style.css', import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/App.vue', import.meta.url),'utf8');
  assert.match(css,/\.final-failure-screen button\s*\{[^}]*top:\s*78%;[^}]*width:\s*22%/);
  assert.match(css,/\.final-failure-screen button:first-of-type\s*\{[^}]*left:\s*23%/);
  assert.match(css,/\.final-failure-screen button:last-of-type\s*\{[^}]*left:\s*54%/);
  assert.match(css,/\.final-failure-screen button\s*\{[^}]*height:\s*calc\(5\.52 \* var\(--scene-unit\)\);[^}]*padding:\s*0;[^}]*border:\s*0;/);
  assert.match(css,/\.final-failure-screen button img\s*\{[^}]*object-fit:\s*contain/);
  assert.match(app,/class="success-copy">\s*<h3>/);
  assert.doesNotMatch(app,/<p>\s*<h3>/);
});

test('shop artwork sizing uses the same layout constant as the clearance tests', () => {
  const css=readFileSync(new URL('../src/style.css', import.meta.url),'utf8');
  assert.match(css,/--fruit-art-width:\s*min\(100px, calc\(var\(--fruit-art-scale\) \* var\(--scene-unit\)\)\)/);
});
