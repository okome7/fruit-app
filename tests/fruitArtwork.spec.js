import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import App from '../src/App.vue';
import FruitCard from '../src/components/FruitCard.vue';
import { fruitArtwork } from '../src/lib/fruitArtwork.js';
import yesImage from '../src/assets/screens/はい_2.png';
import noImage from '../src/assets/screens/いいえ_2.png';

vi.mock('../src/composables/useSfx.js', async () => {
  const { ref } = await import('vue');
  return { useSfx: () => ({ muted: ref(false), play: vi.fn(), unlock: vi.fn(), preload: vi.fn(), dispose: vi.fn(), toggle: vi.fn() }) };
});
let app, card;
afterEach(() => { card?.unmount(); app?.unmount(); document.body.innerHTML = ''; });

const expected = {
  "anger-apple": "おこる",
  "fear-chestnut": "こわい",
  "startled-blueberry": "（びびり）びっくり",
  "happy-surprise-banana": "（うれしくて）びっくり",
  "funny-orange": "おもしろい",
  "motivated-strawberry": "やるきがある",
  "noisy-persimmon": "うるさい",
  "danger-apple": "あぶない",
  "anxious-pear": "ふあん・しんぱい",
  "happy-banana": "うれしい",
  "excited-orange": "こうふんした",
  "joy-banana": "よろこぶ",
  "dislike-grape": "いや",
  "troubled-grape": "こまる",
  "embarrassed-peach": "はずかしい",
  "irritated-persimmon": "いらいら",
  "enjoyable-orange": "たのしい",
  "happiness-peach": "しあわせ",
  "love-strawberry": "あい",
  "like-peach": "すき",
  "persistent-grape": "しつこい",
  "shock-chestnut": "しょっく",
  "boring-chestnut": "おもしろくない",
  "relaxed-kiwi": "きらく・のんびり",
  "wonderful-banana": "すてき",
  "moved-orange": "かんどう",
  "tearful-blueberry": "なきたい",
  "sympathy-blueberry": "かわいそう",
  "lonely-blueberry": "さびしい",
  "disappointed-blueberry": "がっかりする",
  "relax-watermelon": "りらっくす",
  "relief-watermelon": "あんしんする・ほっとする",
  "gratitude-orange": "かんしゃ",
  "kind-kiwi": "やさしい・しんせつ",
  "sad-blueberry": "かなしい",
  "frustrated-grape": "くやしい",
  "tired-pear": "つかれた",
  "calm-kiwi": "おだやか",
  "unconcerned-pear": "きにしない",
  "pleasant-watermelon": "きもちいい"
};
const expectedFiles = {
  "anger-apple": "怒る.png",
  "fear-chestnut": "怖い.png",
  "startled-blueberry": "びびりびっくり.png",
  "happy-surprise-banana": "嬉しくてびっくり.png",
  "funny-orange": "面白い.png",
  "motivated-strawberry": "やる気がある.png",
  "noisy-persimmon": "うるさい.png",
  "danger-apple": "危ない.png",
  "anxious-pear": "不安・心配.png",
  "happy-banana": "嬉しい.png",
  "excited-orange": "興奮した.png",
  "joy-banana": "喜ぶ.png",
  "dislike-grape": "嫌.png",
  "troubled-grape": "困る.png",
  "embarrassed-peach": "恥ずかしい.png",
  "irritated-persimmon": "イライラ.png",
  "enjoyable-orange": "楽しい.png",
  "happiness-peach": "幸せ.png",
  "love-strawberry": "愛.png",
  "like-peach": "好き.png",
  "persistent-grape": "しつこい.png",
  "shock-chestnut": "ショック.png",
  "boring-chestnut": "面白くない.png",
  "relaxed-kiwi": "気楽・のんびり.png",
  "wonderful-banana": "素敵.png",
  "moved-orange": "感動.png",
  "tearful-blueberry": "泣きたい.png",
  "sympathy-blueberry": "可哀想.png",
  "lonely-blueberry": "寂しい.png",
  "disappointed-blueberry": "がっかりする.png",
  "relax-watermelon": "リラックス.png",
  "relief-watermelon": "安心する・ホッとする.png",
  "gratitude-orange": "感謝する.png",
  "kind-kiwi": "優しい・親切.png",
  "sad-blueberry": "悲しい.png",
  "frustrated-grape": "くやしい.png",
  "tired-pear": "疲れた.png",
  "calm-kiwi": "穏やか.png",
  "unconcerned-pear": "気にしない.png",
  "pleasant-watermelon": "気持ちいい.png"
};

describe('emotion artwork across selection, dragging and confirmation', () => {
  it('uses the same supplied image for each named emotion in all three displays', async () => {
    app = mount(App);
    const state = app.vm.$.setupState;
    expect(Object.keys(fruitArtwork).sort()).toEqual(Object.keys(expected).sort());
    expect(state.fruits.map(fruit=>fruit.id).sort()).toEqual(Object.keys(expected).sort());
    expect(new Set(Object.values(fruitArtwork)).size).toBe(state.fruits.length);
    for (const [id, feeling] of Object.entries(expected)) {
      const fruit = state.fruits.find((item) => item.id === id);
      expect(fruit.feeling.replace(/\n/g, '')).toBe(feeling);
      expect(fruit.image).toBe(fruitArtwork[id]);
      expect(decodeURIComponent(fruit.image)).toContain('/フルーツ完成版/' + expectedFiles[id]);
      card = mount(FruitCard, { props: { fruit }, attachTo: document.body });
      expect(card.find('img.fruit-art').attributes('src')).toBe(fruit.image);
      expect(card.find('.fruit-face').exists()).toBe(false);
      const button = card.find('button');
      button.element.setPointerCapture = () => {};
      button.element.hasPointerCapture = () => false;
      button.element.getBoundingClientRect = () => ({ left: 10, top: 20, width: 70, height: 70 });
      card.find('img').element.getBoundingClientRect = () => ({ width: 42, height: 42 });
      await button.trigger('pointerdown', { isPrimary: true, pointerId: 1, button: 0, clientX: 30, clientY: 50 });
      expect(document.querySelector('.fruit-drag-preview img').getAttribute('src')).toBe(fruit.image);
      expect(document.querySelector('.fruit-drag-preview').style.getPropertyValue('--fruit-art-width')).toBe('42px');
      expect(document.querySelector('.fruit-drag-preview').style.getPropertyValue('--fruit-art-height')).toBe('42px');
      expect(document.querySelector('.fruit-drag-preview .fruit-face')).toBeNull();
      await button.trigger('pointercancel', { pointerId: 1 });
      card.unmount(); card = null;
      state.selectedFruit = fruit;
      for (const screen of ['customerConfirm', 'productConfirm']) {
        state.screen = screen;
        await nextTick();
        expect(app.find('.big-fruit-art').attributes('src')).toBe(fruit.image);
        expect(app.find('.big-fruit-face').exists()).toBe(false);
        expect(app.findAll('.confirm-actions img').map(image => image.attributes('src'))).toEqual([noImage, yesImage]);
        expect(app.findAll('.confirm-actions img').map(image => image.attributes('alt'))).toEqual(['いいえ', 'はい']);
        expect(app.find('.confirm-actions').text()).toBe('');
        expect(app.find('.confirmed-feeling').text().replace(/\n/g, '')).toBe(feeling);
      }
    }
  });
  it('preserves the existing fallback for emotions without supplied artwork', () => {
    const fruit = { id: 'other-fruit', emoji: '🍎', fruitName: 'りんご', feeling: 'あぶない' };
    card = mount(FruitCard, { props: { fruit } });
    expect(card.find('.fruit-emoji').text()).toBe(fruit.emoji);
    expect(card.find('.fruit-face').exists()).toBe(true);
    expect(card.find('.fruit-art').exists()).toBe(false);
  });
});
