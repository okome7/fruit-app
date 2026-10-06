import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import App from '../src/App.vue';
import QuestionText from '../src/components/QuestionText.vue';
import { gestureQuestions, associationQuestions, finalQuestion, questionParts } from '../src/lib/questions.js';

vi.mock('../src/composables/useSfx.js', async () => {
  const { ref } = await import('vue');
  return { useSfx: () => ({ muted: ref(false), play: vi.fn(), toggle: vi.fn(),
    unlock: vi.fn(), preload: vi.fn(), dispose: vi.fn() }) };
});
let wrapper;
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; });
const state = () => wrapper.vm.$.setupState;
function plainText(element) {
  const copy = element.cloneNode(true);
  copy.querySelectorAll('rt').forEach((reading) => reading.remove());
  return copy.textContent;
}

describe('complete child-friendly question readings (mounted DOM)', () => {
  it('adds exact readings and updates reactively without modifying the original words or line breaks', async () => {
    const text = 'ポーズ、ダンス、スキップ、かおマネ\n『ネコちゃん』';
    wrapper = mount(QuestionText, { props: { text }, attachTo: document.body });
    expect(wrapper.findAll('rt').map((rt) => rt.text())).toEqual(['ぽーず', 'だんす', 'すきっぷ', 'まね', 'ねこ']);
    expect(plainText(wrapper.element.parentElement)).toBe(text);
    await wrapper.setProps({ text: 'しつもん\nそのきもち' });
    expect(wrapper.findAll('ruby')).toHaveLength(0);
  });
  it.each(['question', 'questionConfirm', 'clerkShop'])('keeps readings on %s, including late-opened previews and changing question text', async (screen) => {
    wrapper = mount(App, { attachTo: document.body });
    state().screen = screen; await nextTick(); await nextTick();
    for (const question of [...gestureQuestions, ...associationQuestions, finalQuestion]) {
      if (gestureQuestions.includes(question)) { state().attempts = 3; state().gestureQuestion = question; }
      else if (associationQuestions.includes(question)) { state().attempts = 2; state().associationQuestion = question; }
      else state().attempts = 1;
      if (screen === 'clerkShop') {
        state().questionPreviewOpen = false; await nextTick();
        await wrapper.find('.question-sign').trigger('click');
      }
      await nextTick(); await nextTick();
      const paragraph = wrapper.find('.question-card p');
      expect(paragraph.findAll('rt').map((rt) => rt.text())).toEqual(questionParts(question).filter((part) => part.reading).map((part) => part.reading));
      expect(plainText(paragraph.element)).toBe(question);
      expect(paragraph.text()).not.toMatch(/[\p{Script=Han}A-Za-zＡ-Ｚａ-ｚ]/u);
      expect(paragraph.find('ruby ruby').exists()).toBe(false);
      expect(paragraph.find('span').exists()).toBe(false); // avoid question badge span styling
      const unannotated = paragraph.element.cloneNode(true);
      unannotated.querySelectorAll('ruby').forEach((ruby) => ruby.remove());
      expect(unannotated.textContent).not.toMatch(/[\p{Script=Han}ァ-ヴA-Za-z]/u);
    }
  });
});
