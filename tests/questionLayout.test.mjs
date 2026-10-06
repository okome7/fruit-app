import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gestureQuestions, associationQuestions, finalQuestion, questionParts } from '../src/lib/questions.js';

const css = readFileSync(new URL('../src/style.css', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.vue', import.meta.url), 'utf8');
const questions = [...gestureQuestions, ...associationQuestions, finalQuestion];

test('all question panels share the help-body font size and more open line spacing', () => {
  assert.match(css, /\.help-lesson,\s*\.question-card p\s*\{\s*font-size:\s*calc\(2\.45 \* var\(--scene-unit\)\);\s*line-height:\s*1\.9;/);
  const paragraph = css.match(/\.question-card p\s*\{([^}]*white-space[^}]*)\}/)[1];
  assert.match(paragraph, /width:\s*100%/);
  assert.match(paragraph, /min-width:\s*0/);
  assert.match(paragraph, /white-space:\s*pre-line/);
  assert.match(paragraph, /overflow-wrap:\s*break-word/);
  assert.doesNotMatch(paragraph, /font-size|line-height/);
  assert.match(css, /\.katakana-ruby rt\s*\{[^}]*font-size:\s*0\.48em/);
  assert.match(css, /\.question-card span\s*\{[^}]*font-size:\s*calc\(2\.2 \* var\(--scene-unit\)\)/);
  assert.equal((app.match(/<p><QuestionText :text="questionText" \/><\/p>/g) || []).length, 2);
});

test('all grouped questions and complete readings fit their panel with conservative glyph estimates', () => {
  assert.equal(questions.length, 10);
  assert.match(css, /\.question-card\s*\{[^}]*padding:\s*calc\(4\.5 \* var\(--scene-unit\)\) calc\(4 \* var\(--scene-unit\)\) calc\(2 \* var\(--scene-unit\)\)/);
  for (const [width, height, left, right, top, bottom] of [
    [874, 402, 62, 62, 0, 21], [844, 390, 47, 47, 0, 21],
    [932, 430, 59, 59, 0, 21], [740, 300, 0, 0, 0, 0],
    [1536, 706, 0, 0, 0, 0], [390, 844, 0, 0, 47, 34],
    [320, 568, 0, 0, 0, 0], [1024, 768, 0, 0, 0, 0],
  ]) {
    const portrait = width < height;
    const sceneUnit = portrait ? (width - left - right) / 100
      : Math.min((width - left - right) / 100, (height - top - bottom) * 874 / 402 / 100);
    const frameWidth = portrait ? width - left - right : width;
    const frameHeight = portrait ? frameWidth * 402 / 874 : height;
    const innerWidth = frameWidth * .6 - (4 * 2 + .45 * 2) * sceneUnit;
    const innerHeight = frameHeight * .48 - (4.5 + 2 + .45 * 2) * sceneUnit;
    const bodySize = 2.45 * sceneUnit;
    const charsPerLine = Math.floor(innerWidth / bodySize);
    assert.ok(charsPerLine >= 20);
    // Ruby's reading and base both fit a 1.9em line box; no question-specific font shrink.
    assert.ok(1 + .48 < 1.9);
    for (const question of questions) {
      // Treat ruby words as unbreakable, using the wider of base and reading.
      const advances = questionParts(question).flatMap((part) => part.reading
        ? [Math.max([...part.text].length, [...part.reading].length * .48)]
        : [...part.text].map((character) => character === '\n' ? null : 1));
      let estimatedLines = 1, used = 0;
      for (const advance of advances) {
        if (advance === null) { estimatedLines++; used = 0; continue; }
        assert.ok(advance <= charsPerLine);
        if (used + advance > charsPerLine) { estimatedLines++; used = 0; }
        used += advance;
      }
      assert.ok(estimatedLines * bodySize * 1.9 < innerHeight,
        `${width}×${height}: ${question}`);
    }
  }
});
