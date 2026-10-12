// Display-only breaks preserve the emotion wording used by game logic.
export function fruitLabel(fruit) {
  const labels = {
    'boring-chestnut': 'おもしろく\nない',
    'happy-surprise-banana': '（うれしくて）\nびっくり',
    'startled-blueberry': '（びびり）\nびっくり',
    'anxious-pear': 'ふあん・\nしんぱい',
    'relaxed-kiwi': 'きらく・\nのんびり',
    'relief-watermelon': 'あんしんする・\nほっとする',
    'kind-kiwi': 'やさしい・\nしんせつ',
  };
  return labels[fruit.id] ?? fruit.feeling;
}
