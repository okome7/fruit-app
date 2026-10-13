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

test('pointer focus suppression stays scoped to customer instructions and unpicked shop fruit, with keyboard cues intact', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.match(css, /button:focus-visible,\s*\.viewport\[data-input-modality=["']keyboard["']\] \.customer-instruction \.select-fruit-action:focus,\s*\.viewport\[data-input-modality=["']keyboard["']\] \.fruit-shop-screen \.fruit-card:focus:not\(\.is-picked\)\s*\{\s*outline:[^;]*solid #8a4b16/);
  assert.match(css, /\.viewport\[data-input-modality=["']pointer["']\] \.customer-instruction \.select-fruit-action:focus,\s*\.viewport\[data-input-modality=["']pointer["']\] \.fruit-shop-screen \.fruit-card:focus:not\(\.is-picked\)\s*\{\s*outline: none;\s*\}/);
  assert.match(css, /\.fruit-card\.is-picked\s*\{\s*outline: 3px solid #e19b22;/);
  assert.match(css, /@media \(hover: hover\) and \(pointer: fine\)\s*\{\s*\.fruit-card:hover:not\(\.is-dragging\)/);
  assert.doesNotMatch(css, /(?:^|\})\s*(?:button|\.fruit-card|\.select-fruit-action)(?::focus(?:-visible)?)?\s*\{[^}]*outline:\s*none/);
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
  const actionRule = [...css.matchAll(/\.terms-action\s*\{([^}]*)\}/g)].at(-1)[1];
  const bottom = Number(actionRule.match(/bottom:\s*([\d.]+)%/)[1]) / 100;
  assert.equal(bottom, .04);
  assert.match(css, /\.terms-back\s*\{\s*left: 8\.35%;\s*width: calc\(181 \* var\(--png-native-unit\)\)/);
  assert.match(css, /\.terms-agree\s*\{\s*right: 8\.35%;\s*width: calc\(208 \* var\(--png-native-unit\)\)/);
  for (const [width,height] of [[320,568],[360,640],[390,844],[430,932],[740,300],[844,390],[1024,768],[1536,864]]) {
    const sceneHeight=width<height ? width*402/874 : height;
    const scale=Math.min(1,width/874,height/402);
    const textBottom=sceneHeight*.771;
    const actionTop=sceneHeight*(1-bottom)-65*scale;
    assert.ok(textBottom + .8 * Math.min(width/100,height*874/402/100)<actionTop, `${width}x${height}: terms text touches action focus outline`);
    assert.ok(width*.0835+181*scale < width*(1-.0835)-208*scale, `${width}: terms actions overlap`);
  }
});

test('result PNGs remain side by side with original ratios and a common responsive scale', () => {
  const css=readFileSync(new URL('../src/style.css', import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/App.vue', import.meta.url),'utf8');
  assert.match(css,/--png-native-unit:\s*min\(1px, calc\(var\(--scene-unit\) \/ 8\.74\)\)/);
  assert.match(css,/\.result-actions\s*\{[^}]*left:\s*50%;[^}]*bottom:\s*3%;[^}]*flex-direction:\s*row/);
  assert.match(css,/\.final-failure-screen \.result-actions button\s*\{[^}]*width:\s*calc\(320 \* var\(--result-png-unit\)\);[^}]*height:\s*auto;[^}]*padding:\s*0;[^}]*border:\s*0;/);
  assert.match(css,/\.result-actions\s*\{[^}]*width:\s*max-content/);
  assert.match(css,/\.final-failure-screen \.result-actions button\s*\{[^}]*flex:\s*0 0 auto/);
  for (const [width,height] of [[320,568],[390,844],[568,320],[740,300],[844,390],[932,430],[1536,864]]) {
    const unit=Math.min(width/100,height*874/402/100);
    const nativeUnit=(width*.64-4*unit-4)/612;
    assert.ok((292+320)*nativeUnit+4*unit<width, `${width}x${height}: result row overflows`);
  }
  assert.match(css,/button:first-child\s*\{\s*width:\s*calc\(292 \* var\(--result-png-unit\)\)/);
  assert.match(css,/\.choice img\s*\{[^}]*height:\s*auto;[^}]*object-fit:\s*contain/);
  assert.match(app,/class="success-copy">\s*<legend>\s*<h3>/);
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

test('success explanation background is transparent and retains the brown frame and heading', () => {
  const css=readFileSync(new URL('../src/style.css', import.meta.url),'utf8');
  assert.match(css,/\.success-copy h3\s*\{[^}]*background:\s*transparent/);
  assert.match(css,/\.success-copy\s*\{[^}]*border:[^;]*#d09050;[^}]*background:\s*transparent/);
});

test('portrait help moves to the edge without changing landscape and timer keeps sampled green in a smaller box', () => {
  const css=readFileSync(new URL('../src/style.css', import.meta.url),'utf8');
  assert.match(css,/\.help-wrap\s*\{[^}]*left:\s*32px/);
  assert.match(css,/@media \(orientation: portrait\)\s*\{\s*\.help-wrap\s*\{\s*left: max\(8px, var\(--safe-left\)\)/);
  assert.match(css,/\.timer\s*\{[^}]*padding: calc\(0\.6[^}]*background: #253724;[^}]*font-size: calc\(1\.45/);
});

test('timer text enlarges without resizing its frame and basket interaction cannot tint it', () => {
  const css=readFileSync(new URL('../src/style.css', import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/App.vue', import.meta.url),'utf8');
  assert.match(css,/\.timer-sizing\s*\{[^}]*display: inline-block;[^}]*visibility: hidden/);
  assert.match(css,/\.timer-text\s*\{[^}]*position: absolute;[^}]*inset: calc\(0\.1[^}]*font-size: calc\(1\.72/);
  assert.match(css,/\.clerk-shop-screen \.drop-zone:hover,\s*\.clerk-shop-screen \.drop-zone:active\s*\{\s*filter: none;/);
  assert.equal((app.match(/class="timer-text"/g)||[]).length,2);
});

test('both result screens maximize the shared PNG row with two pixels of illustration clearance', () => {
  const css=readFileSync(new URL('../src/style.css', import.meta.url),'utf8');
  assert.doesNotMatch(css,/\.final-failure-screen\.success \.result-actions\s*\{/);
  assert.match(css,/\.result-actions\s*\{[^}]*gap: calc\(4 \* var\(--scene-unit\)\)/);
  for(const [width,height] of [[320,568],[390,844],[568,320],[740,300],[844,390],[932,430],[1536,864]]) {
    const unit=Math.min(width/100,height*874/402/100);
    assert.ok(width*.64-4<width);
    const rowWidth=612*((width*.64-4*unit-4)/612)+4*unit;
    const left=(width-rowWidth)/2,right=left+rowWidth;
    assert.ok(left>=width*.17+2-1e-8 && right<=width*.821-2+1e-8, `${width}x${height}: result row reaches the side illustrations`);

  }
});


test('both fruit instruction buttons move down without resizing the panels or their content', () => {
  const css=readFileSync(new URL('../src/style.css', import.meta.url),'utf8');
  const app=readFileSync(new URL('../src/App.vue', import.meta.url),'utf8');
  assert.match(css,/\.png-instruction-panel \.png-action\s*\{[^}]*margin-block: calc\(3 \* var\(--scene-unit\)\) 0;[^}]*position: relative;[^}]*top: var\(--scene-unit\)/);
  assert.equal((app.match(/class="instruction-panel png-instruction-panel"/g)||[]).length,2);
});


test('timer moves slightly upward and only compact landscape viewports enlarge its lettering', () => {
  const css=readFileSync(new URL('../src/style.css', import.meta.url),'utf8');
  assert.match(css,/\.timer\s*\{[^}]*translate\(-50%, calc\(-50% - 0\.5 \* var\(--scene-unit\)\)\)/);
  assert.match(css,/@media \(orientation: landscape\) and \(max-width: 1024px\) and \(max-height: 500px\)\s*\{\s*\.timer-text\s*\{[^}]*font-size: calc\(1\.85 \* var\(--scene-unit\)\)/);
  assert.match(css,/\.timer-text\s*\{[^}]*font-size: calc\(1\.72 \* var\(--scene-unit\)\)/);
});
