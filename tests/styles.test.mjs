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

test('terms retain original typography and original PNG proportions in separate action areas', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /\.terms-body\s*\{[^}]*height:\s*58\.1%;[^}]*font-size:\s*calc\(1\.47 \* var\(--scene-unit\)\);[^}]*line-height:\s*1\.18/);
  assert.doesNotMatch(css, /font-size:\s*max\(12px/);
  for (const [width,height] of [[320,568],[360,640],[390,844],[430,932],[740,300],[844,390],[1024,768],[1536,864]]) {
    const sceneHeight=width<height ? width*402/874 : height;
    const scale=Math.min(1,width/874,height/402);
    const textBottom=sceneHeight*.771;
    const actionTop=sceneHeight*.98-65*scale;
    assert.ok(textBottom<actionTop, `${width}x${height}: terms text touches actions`);
    assert.ok(width*.0835+181*scale < width*(1-.0835)-208*scale, `${width}: terms actions overlap`);
  }
});

test('result PNGs remain side by side with original ratios and a common responsive scale', () => {
  const css=readFileSync(new URL('../src/style.css', import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/App.vue', import.meta.url),'utf8');
  assert.match(css,/--png-native-unit:\s*min\(1px, calc\(var\(--scene-unit\) \/ 8\.74\)\)/);
  assert.match(css,/\.result-actions\s*\{[^}]*left:\s*50%;[^}]*bottom:\s*3%;[^}]*flex-direction:\s*row/);
  assert.match(css,/\.final-failure-screen \.result-actions button\s*\{[^}]*width:\s*calc\(320 \* var\(--png-native-unit\)\);[^}]*height:\s*auto;[^}]*padding:\s*0;[^}]*border:\s*0;/);
  assert.match(css,/\.result-actions\s*\{[^}]*width:\s*max-content/);
  assert.match(css,/\.final-failure-screen \.result-actions button\s*\{[^}]*flex:\s*0 0 auto/);
  for (const [width,height] of [[320,568],[390,844],[844,390],[1536,864]]) {
    const unit=Math.min(width/100,height*874/402/100);
    const nativeUnit=Math.min(1,unit/8.74);
    assert.ok((292+320)*nativeUnit+.7*unit<width, `${width}x${height}: result row overflows`);
  }
  assert.match(css,/button:first-child\s*\{ width:\s*calc\(292 \* var\(--png-native-unit\)\)/);
  assert.match(css,/\.choice img\s*\{[^}]*height:\s*auto;[^}]*object-fit:\s*contain/);
  assert.match(app,/class="success-copy">\s*<legend><h3>/);
  assert.doesNotMatch(app,/<p>\s*<h3>/);
});

test('shop artwork sizing uses the same layout constant as the clearance tests', () => {
  const css=readFileSync(new URL('../src/style.css', import.meta.url),'utf8');
  assert.match(css,/--fruit-art-width:\s*min\(100px, calc\(var\(--fruit-art-scale\) \* var\(--scene-unit\)\)\)/);
});

test('specified text and timer changes preserve scene geometry and use sampled background', () => {
  const css=readFileSync(new URL('../src/style.css', import.meta.url),'utf8');
  assert.match(css,/\.instruction-panel\s*\{[^}]*font-size:\s*calc\(2\.75 \* var\(--scene-unit\)\)/);
  assert.match(css,/\.fruit-shop-screen \.fruit-slot > \.fruit-feeling--multiline\s*\{[^}]*1\.55[^}]*line-height: 1\.05;[^}]*white-space: pre/);
  assert.match(css,/\.timer\s*\{[^}]*background: #253724/);
});

test('success heading removes only the yellow background and retains the brown explanation frame', () => {
  const css=readFileSync(new URL('../src/style.css', import.meta.url),'utf8');
  assert.match(css,/\.success-copy h3\s*\{[^}]*background:\s*transparent/);
  assert.match(css,/\.success-copy\s*\{[^}]*border:[^;]*#d09050;[^}]*background:\s*#fffdf4f2/);
});

test('portrait help moves to the edge without changing landscape and timer keeps sampled green in a smaller box', () => {
  const css=readFileSync(new URL('../src/style.css', import.meta.url),'utf8');
  assert.match(css,/\.help-wrap\s*\{[^}]*left:\s*32px/);
  assert.match(css,/@media \(orientation: portrait\)\s*\{\s*\.help-wrap\s*\{\s*left: max\(8px, var\(--safe-left\)\)/);
  assert.match(css,/\.timer\s*\{[^}]*padding: calc\(0\.6[^}]*background: #253724;[^}]*font-size: calc\(1\.45/);
});
