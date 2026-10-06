// The user's three groups. Selection is stored for the round, never sampled by rendering.
export const gestureQuestions = Object.freeze([
  'そのかんじょうのとき、からだは\nどんなうごきを　したくなる？\n（やってみて！）',
  'そのきもちのとき、いちばん　やりたくなる\nポーズを　やってみて！',
  'そのかんじょうのとき、かおは\nどんなひょうじょうに　なっちゃう？\n（かおマネしてみて！）',
  'そのきもちのとき　ダンスを　おどるなら\nどんなダンス？\nじっさいに　おどってみてね',
  'そのきもちに　なりきって　あるいてみて\n（はしったり、スキップしたりしても\nいいよ！）',
  'そのきもちのとき、もし\n『ネコちゃん』だったら　どんなポーズを\nしてる？',
]);
export const associationQuestions = Object.freeze([
  'そのきもちから\nどんなおとが　おもいうかぶ？',
  'そのきもちを　たべたら\nどんなあじが　するとおもう？',
  'そのきもちを　どうぶつであらわすと\nどんなどうぶつ？',
]);
export const finalQuestion = 'そのきもちに　なりきって\n『くだもの』って　いってみて！';

export function pickRandomQuestion(questions, random = Math.random) {
  return questions[Math.floor(random() * questions.length)];
}

// Short word units keep the readings accurate while allowing natural wrapping.
const readings = Object.freeze({
  'ポーズ': 'ぽーず', 'マネ': 'まね', 'ダンス': 'だんす',
  'スキップ': 'すきっぷ', 'ネコ': 'ねこ',
});
const wordPattern = new RegExp(`(${Object.keys(readings).sort((a, b) => b.length - a.length).join('|')})`, 'g');

export function questionParts(text) {
  return text.split(wordPattern).filter(Boolean).map((part) => ({ text: part, reading: readings[part] || null }));
}
