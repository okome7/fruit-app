import { mount, flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import App from '../src/App.vue';
import { finishHelp } from './finishHelp.js';
import { gestureQuestions, associationQuestions, finalQuestion } from '../src/lib/questions.js';
vi.mock('../src/composables/useSfx.js', async () => {
  const { ref } = await import('vue');
  return { useSfx: () => ({ muted: ref(false), play: vi.fn(), unlock: vi.fn(), preload: vi.fn(), dispose: vi.fn(), toggle: vi.fn() }) };
});
let wrapper;
afterEach(() => { wrapper?.unmount(); wrapper = null; document.body.innerHTML = ''; vi.restoreAllMocks(); });
const state = () => wrapper.vm.$.setupState;
async function tick() { await nextTick(); await nextTick(); }
function plain(selector = '.question-card p') { const copy = wrapper.find(selector).element.cloneNode(true); copy.querySelectorAll('rt').forEach(x => x.remove()); return copy.textContent; }
async function next() { await wrapper.find('.nav-arrow.next').trigger('click'); }
async function choose(index) { await wrapper.findAll('.fruit-card')[index].trigger('click', { detail: 0 }); await wrapper.find('.drop-zone').trigger('click'); await wrapper.findAll('.confirm-actions button')[1].trigger('click'); }
async function rolesToQuestion() {
  await next(); await wrapper.find('.course-list button').trigger('click'); await wrapper.find('.choice.yes').trigger('click'); await next(); await choose(0); await next(); await next();
  expect(state().screen).toBe('question');
}
async function homeToQuestion() {
  await wrapper.find('.start-button').trigger('click'); await wrapper.find('.terms-agree').trigger('click');
  for (let i = 0; i < 5; i++) await next();
  expect(state().screen).toBe('roles'); await rolesToQuestion();
}
async function answer(index) { await next(); await wrapper.find('.instruction-panel button').trigger('click'); await choose(index); }

describe('independent question selection mounted-DOM QA', () => {
  it('reaches every gesture and association candidate using controlled random values', async () => {
    const gestureSeen = new Set(); const associationSeen = new Set(); const fixedSeen = new Set();
    for (let i = 0; i < 6; i++) {
      const value = (i + 0.5) / 6; vi.spyOn(Math, 'random').mockReturnValue(value);
      wrapper = mount(App, { attachTo: document.body }); state().screen = 'question'; await tick();
      expect(gestureQuestions).toHaveLength(6); expect(associationQuestions).toHaveLength(3);
      expect(plain()).toBe(gestureQuestions[i]); gestureSeen.add(plain());
      state().attempts = 2; await tick(); expect(plain()).toBe(associationQuestions[Math.floor(value * 3)]); associationSeen.add(plain());
      state().attempts = 1; await tick(); fixedSeen.add(plain());
      wrapper.unmount(); wrapper = null; document.body.innerHTML = ''; vi.restoreAllMocks();
    }
    expect(gestureSeen.size).toBe(6); expect(associationSeen.size).toBe(3); expect(fixedSeen.size).toBe(1);
  });
  it('preserves Q1 and Q2 through help, menu, back, preview, and rerender without sampling again', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    wrapper = mount(App, { attachTo: document.body }); await homeToQuestion();
    for (const attempts of [3, 2]) {
      state().attempts = attempts; state().screen = 'question'; state().history = ['home', 'clerkRules']; await tick();
      const expected = plain(); const calls = random.mock.calls.length; random.mockReturnValue(0.95);
      await wrapper.find('.help-button').trigger('click'); await wrapper.find('.help-button').trigger('click'); expect(plain()).toBe(expected);
      await wrapper.find('.help-button').trigger('click'); await wrapper.find('.help-menu button').trigger('click'); await next(); await finishHelp(wrapper); expect(plain()).toBe(expected);
      await wrapper.find('.nav-arrow.back').trigger('click'); await next(); expect(plain()).toBe(expected);
      await next(); await wrapper.find('.instruction-panel button').trigger('click');
      await wrapper.find('.question-sign').trigger('click'); expect(plain()).toBe(expected); await wrapper.find('.question-preview-close').trigger('click');
      await wrapper.find('.question-sign').trigger('click'); expect(plain()).toBe(expected); await wrapper.find('.question-preview-backdrop').trigger('click');
      await wrapper.find('.fruit-card').trigger('click', { detail: 0 }); await wrapper.find('.drop-zone').trigger('click'); await wrapper.find('.confirm-actions button').trigger('click');
      await wrapper.find('.question-sign').trigger('click'); expect(plain()).toBe(expected);
      wrapper.vm.$forceUpdate(); await tick(); expect(plain()).toBe(expected); expect(random.mock.calls.length).toBe(calls);
    }
  });
  it('advances Q1 gesture, Q2 association, and fixed Q3 through actual failed guesses', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7); wrapper = mount(App, { attachTo: document.body }); await homeToQuestion();
    expect(wrapper.find('.question-card > span').text()).toBe('しつもん1'); expect(gestureQuestions).toContain(plain());
    await answer(1); expect(state().screen).toBe('failure'); await wrapper.find('.failure-screen button').trigger('click');
    expect(wrapper.find('.question-card > span').text()).toBe('しつもん2'); expect(associationQuestions).toContain(plain());
    await answer(1); await wrapper.find('.failure-screen button').trigger('click');
    expect(wrapper.find('.question-card > span').text()).toBe('しつもん3'); expect(plain()).toBe(finalQuestion);
    await answer(1); expect(state().screen).toBe('finalFailure');
  });
  it('returning Home and starting again resamples both groups for the new game', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0); wrapper = mount(App, { attachTo: document.body }); await homeToQuestion();
    const oldQ1 = state().gestureQuestion, oldQ2 = state().associationQuestion;
    await answer(0); expect(state().screen).toBe('success'); random.mockReturnValue(0.999);
    await wrapper.find('.success button').trigger('click'); await homeToQuestion();
    expect(state().gestureQuestion).not.toBe(oldQ1); expect(state().associationQuestion).not.toBe(oldQ2);
    expect(state().gestureQuestion).toBe(gestureQuestions[5]); expect(state().associationQuestion).toBe(associationQuestions[2]);
  });
  it('retry from final failure resamples both questions with a new random value', async () => {
    const random = vi.spyOn(Math, 'random').mockReturnValue(0); wrapper = mount(App, { attachTo: document.body });
    const oldQ1 = state().gestureQuestion, oldQ2 = state().associationQuestion;
    state().screen = 'finalFailure'; await tick(); random.mockReturnValue(0.999);
    await wrapper.findAll('.final-failure-screen button')[1].trigger('click'); await rolesToQuestion();
    expect(state().gestureQuestion).toBe(gestureQuestions[5]); expect(state().associationQuestion).toBe(associationQuestions[2]);
    expect(state().gestureQuestion).not.toBe(oldQ1); expect(state().associationQuestion).not.toBe(oldQ2);
  });
});
