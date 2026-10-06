import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('responsive lengths keep negative signs inside CSS math functions', () => {
  const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
  assert.doesNotMatch(css, /(?:^|[^\w-])[-+](?:calc|min|max|clamp)\(/);
  assert.match(css, /top:\s*calc\(-2\.4 \* var\(--scene-unit\)\)/);
  assert.match(css, /calc\(-0\.12 \* var\(--scene-unit\)\) 0 #fff/);
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
