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
  'moved-orange': 'かんどう',
  'anger-apple': 'おこる',
  'startled-blueberry': '（びびり）びっくり',
  'noisy-persimmon': 'うるさい',
  'boring-chestnut': 'おもしろくない',
  'happiness-peach': 'しあわせ',
  'anxious-pear': 'ふあん・しんぱい',
  'motivated-strawberry': 'やるきがある',
  'kind-kiwi': 'やさしい・しんせつ',
  'relief-watermelon': 'あんしんする・ほっとする',
  'happy-surprise-banana': '（うれしくて）びっくり',
  'dislike-grape': 'いや',
};

describe('emotion artwork across selection, dragging and confirmation', () => {
  it('uses the same supplied image for each named emotion in all three displays', async () => {
    app = mount(App);
    const state = app.vm.$.setupState;
    expect(Object.keys(fruitArtwork).sort()).toEqual(Object.keys(expected).sort());
    for (const [id, feeling] of Object.entries(expected)) {
      const fruit = state.fruits.find((item) => item.id === id);
      expect(fruit.feeling.replace(/\n/g, '')).toBe(feeling);
      expect(fruit.image).toBe(fruitArtwork[id]);
      expect(fruit.image).toContain(id + '.png');
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
