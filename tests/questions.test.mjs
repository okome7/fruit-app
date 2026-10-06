import test from 'node:test';
import assert from 'node:assert/strict';
import { gestureQuestions, associationQuestions, finalQuestion, pickRandomQuestion, questionParts } from '../src/lib/questions.js';

test('the three banks preserve the exact requested wording, punctuation, and 6/3/1 grouping', () => {
  assert.deepEqual(gestureQuestions, [
    'そのかんじょうのとき、からだは\nどんなうごきを　したくなる？\n（やってみて！）',
    'そのきもちのとき、いちばん　やりたくなる\nポーズを　やってみて！',
    'そのかんじょうのとき、かおは\nどんなひょうじょうに　なっちゃう？\n（かおマネしてみて！）',
    'そのきもちのとき　ダンスを　おどるなら\nどんなダンス？\nじっさいに　おどってみてね',
    'そのきもちに　なりきって　あるいてみて\n（はしったり、スキップしたりしても\nいいよ！）',
    'そのきもちのとき、もし\n『ネコちゃん』だったら　どんなポーズを\nしてる？',
  ]);
  assert.deepEqual(associationQuestions, [
    'そのきもちから\nどんなおとが　おもいうかぶ？',
    'そのきもちを　たべたら\nどんなあじが　するとおもう？',
    'そのきもちを　どうぶつであらわすと\nどんなどうぶつ？',
  ]);
  assert.equal(finalQuestion, 'そのきもちに　なりきって\n『くだもの』って　いってみて！');
});

test('each candidate has its own random interval and boundary choices remain in the correct bank', () => {
  for (const bank of [gestureQuestions, associationQuestions]) {
    assert.equal(new Set(bank).size, bank.length);
    for (let index = 0; index < bank.length; index++) {
      assert.equal(pickRandomQuestion(bank, () => (index + .5) / bank.length), bank[index]);
      assert.equal(pickRandomQuestion(bank, () => index / bank.length), bank[index]);
    }
    assert.equal(pickRandomQuestion(bank, () => 0), bank[0]);
    assert.equal(pickRandomQuestion(bank, () => 1 - Number.EPSILON), bank.at(-1));
  }
});

test('question bodies use hiragana and only katakana receives readings', () => {
  const expectedReadings = {
    'ポーズ': 'ぽーず', 'マネ': 'まね', 'ダンス': 'だんす',
    'スキップ': 'すきっぷ', 'ネコ': 'ねこ',
  };
  const seen = new Set();
  for (const question of [...gestureQuestions, ...associationQuestions, finalQuestion]) {
    assert.doesNotMatch(question, /[\p{Script=Han}A-Za-zＡ-Ｚａ-ｚ]/u);
    const parts = questionParts(question);
    assert.equal(parts.map((part) => part.text).join(''), question);
    for (const part of parts) {
      if (part.reading) {
        assert.equal(part.reading, expectedReadings[part.text]);
        assert.match(part.reading, /^[ぁ-ゖー]+$/); seen.add(part.text);
      } else assert.doesNotMatch(part.text, /[\p{Script=Han}ァ-ヴA-Za-z]/u);
    }
  }
  assert.deepEqual([...seen].sort(), Object.keys(expectedReadings).sort());
});
