import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import App from '../src/App.vue';
import { finishHelp } from './finishHelp.js';
import { gestureQuestions, associationQuestions } from '../src/lib/questions.js';

const sound = vi.hoisted(() => ({ play: vi.fn() }));
vi.mock('../src/composables/useSfx.js', async () => {
  const { ref } = await import('vue');
  return { useSfx: () => ({ muted: ref(false), play: sound.play, toggle: vi.fn(),
    unlock: vi.fn(), preload: vi.fn(), dispose: vi.fn() }) };
});
let wrapper;
const state = () => wrapper.vm.$.setupState;
function baseText(element) {
  const copy = element.cloneNode(true);
  copy.querySelectorAll('rt').forEach((reading) => reading.remove());
  return copy.textContent.trim();
}
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; vi.restoreAllMocks(); sound.play.mockClear(); });
async function success() {
  wrapper = mount(App, { attachTo: document.body });
  const fruit = state().fruits.find((item) => item.id === 'relief-watermelon');
  state().correctFruit = fruit; state().clerkFruit = fruit; state().selectedFruit = fruit;
  state().screen = 'productConfirm'; await nextTick();
  await wrapper.findAll('.confirm-actions button')[1].trigger('click');
  expect(state().screen).toBe('success');
  return fruit;
}

describe('PR24 success screen integrated with private Site behavior (mounted DOM)', () => {
  it('shows the correct feeling, praise, shared result layout and both actions after judging success', async () => {
    const fruit = await success();
    const panel = wrapper.find('.success');
    expect(panel.classes()).toContain('final-failure-screen');
    expect(panel.classes()).not.toContain('result');
    expect(panel.find('h1').text()).toBe('せいかい！');
    expect(panel.find('p').text()).toContain(`きもちのくだものは「${fruit.feeling}」だったよ！！`);
    expect(panel.find('p').text()).toContain('よくみつけられたね！');
    expect(panel.findAll('button').map((button) => baseText(button.element))).toEqual(['ホームへもどる', 'もういちどあそぶ']);
    expect(wrapper.find('.help-button').exists()).toBe(true);
    expect(sound.play.mock.calls).toEqual([['success']]);
    // Every feeling, including embedded line breaks, is represented accurately.
    for (const candidate of state().fruits) {
      state().correctFruit = candidate; await nextTick();
      expect(panel.find('p').text()).toContain(`「${candidate.feeling}」`);
    }
  });
  it('replay opens roles with clean history, fresh questions and the established timer/state reset', async () => {
    await success();
    state().attempts = 1; state().remainingSeconds = 0;
    state().oneMinuteAcknowledged = true; state().timeUpAcknowledged = true;
    state().history = ['home', 'question', 'productConfirm', 'failure'];
    vi.spyOn(Math, 'random').mockReturnValue(.999);
    await wrapper.findAll('.success button')[1].trigger('click');
    expect(state().screen).toBe('roles'); expect(state().history).toEqual(['home']);
    expect(state().attempts).toBe(3); expect(state().remainingSeconds).toBe(180);
    expect(state().correctFruit).toBe(null); expect(state().clerkFruit).toBe(null); expect(state().selectedFruit).toBe(null);
    expect(state().oneMinuteAcknowledged).toBe(false); expect(state().timeUpAcknowledged).toBe(false);
    expect(state().gestureQuestion).toBe(gestureQuestions.at(-1));
    expect(state().associationQuestion).toBe(associationQuestions.at(-1));
    await wrapper.find('.nav-arrow.back').trigger('click');
    expect(state().screen).toBe('home');
  });
  it('success menu keeps help return, home confirmation, focus restoration and outside dismissal', async () => {
    const fruit = await success();
    await wrapper.find('.help-button').trigger('click');
    await wrapper.find('.help-menu button').trigger('click');
    expect(state().screen).toBe('help1');
    await finishHelp(wrapper);
    expect(state().screen).toBe('success'); expect(state().correctFruit).toEqual(fruit);
    await wrapper.find('.help-button').trigger('click');
    const home = wrapper.findAll('.help-menu button')[1];
    await home.trigger('click'); await nextTick(); await nextTick();
    expect(state().homeConfirm).toBe(true);
    await wrapper.find('.home-modal-no').trigger('click'); await nextTick(); await nextTick();
    expect(state().screen).toBe('success'); expect(document.activeElement).toBe(home.element);
    await wrapper.find('.viewport').trigger('click');
    expect(state().helpOpen).toBe(false); expect(state().screen).toBe('success');
    await wrapper.find('.success button').trigger('click');
    expect(state().screen).toBe('home'); expect(state().history).toEqual([]);
  });
});
