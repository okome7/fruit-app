import { mount } from '@vue/test-utils';
import { describe, expect, it, vi } from 'vitest';
import App from '../src/App.vue';
vi.mock('../src/composables/useSfx.js', async () => {
  const { ref } = await import('vue');
  return { useSfx: () => ({ muted: ref(false), play: vi.fn(), unlock: vi.fn(), preload: vi.fn(), dispose: vi.fn(), toggle: vi.fn() }) };
});
const easy = ['あぶない','ふあん・\nしんぱい','いや','はずかしい','おこる','うるさい','こわい','しょっく','おもしろくない','なきたい','かわいそう','かなしい','さびしい','よろこぶ','すき','やるきがある','うれしい','おもしろい','たのしい','やさしい・\nしんせつ'];
const hard = ['（びびり）\nびっくり','いらいら','しつこい','がっかりする','くやしい','つかれた','（うれしくて）\nびっくり','しあわせ','あい','こうふんした','きらく・\nのんびり','すてき','かんしゃ','おだやか','きにしない','きもちいい','かんどう','りらっくす','あんしんする・\nほっとする','こまる'];
describe('emotion course membership', () => {
  it('partitions all 40 original emotions into the requested disjoint 20/20 groups', () => {
    const wrapper = mount(App);
    try {
      const state = wrapper.vm.$.setupState;
      const groups = {};
      for (const [course, expected] of [['easy', easy], ['hard', hard], ['mix', [...easy, ...hard]]]) {
        const seen = new Map();
        // Every Fisher-Yates interval is reached, including the final boundary.
        for (let i = 0; i <= expected.length; i++) {
          const random = vi.spyOn(Math, 'random').mockReturnValue(i / (expected.length + 1));
          state.selectCourse(course);
          expect(state.displayedFruits).toHaveLength(8);
          expect(new Set(state.displayedFruits.map(fruit => fruit.id)).size).toBe(8);
          for (const fruit of state.displayedFruits) {
            expect(expected).toContain(fruit.feeling);
            seen.set(fruit.id, fruit.feeling);
          }
          random.mockRestore();
        }
        expect([...seen.values()].sort()).toEqual([...expected].sort());
        expect(seen.size).toBe(expected.length);
        groups[course] = seen;
      }
      expect([...groups.easy.keys()].filter(id => groups.hard.has(id))).toEqual([]);
      expect([...groups.mix.entries()].sort()).toEqual([...groups.easy, ...groups.hard].sort());
    } finally { wrapper.unmount(); vi.restoreAllMocks(); }
  });
});
