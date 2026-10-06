import { mount, flushPromises } from '@vue/test-utils';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { nextTick } from 'vue';
import App from '../src/App.vue';
import FruitCard from '../src/components/FruitCard.vue';
const sound = vi.hoisted(() => ({ play: vi.fn() }));
vi.mock('../src/composables/useSfx.js', async () => {
  const { ref } = await import('vue');
  const muted = ref(false);
  return { useSfx: () => ({ muted, play: sound.play, unlock: vi.fn(), preload: vi.fn(), dispose: vi.fn(), toggle: () => { muted.value = !muted.value; } }) };
});
let wrapper;
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; vi.useRealTimers(); sound.play.mockClear(); });
const state = () => wrapper.vm.$.setupState;
const label = () => wrapper.find('section').attributes('aria-label');
async function shop(screen = 'customerShop') { state().screen = screen; await nextTick(); }
async function drop(index = 0) { wrapper.findAllComponents(FruitCard)[index].vm.$emit('drop', state().displayedFruits[index]); await nextTick(); }

describe('isolated prototype mounted-DOM integration (not browser rendering)', () => {
  it('starts at home with a visible mute control and no game changes', async () => {
    wrapper = mount(App, { attachTo: document.body });
    expect(label()).toBe('ホーム画面');
    expect(wrapper.find('.prototype-label').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('試作');
    const toggle = wrapper.find('.sound-toggle');
    expect(toggle.text()).toBe('');
    expect(toggle.attributes('aria-label')).toBe('音をオフにする');
    expect(toggle.attributes('aria-pressed')).toBe('true');
    expect(toggle.find('.sound-waves').exists()).toBe(true);
    expect(toggle.find('.sound-muted-mark').exists()).toBe(false);
    expect(toggle.find('svg').attributes('aria-hidden')).toBe('true');
    expect(toggle.find('svg').attributes('focusable')).toBe('false');
    await toggle.find('svg').trigger('click');
    expect(toggle.attributes('aria-label')).toBe('音をオンにする');
    expect(toggle.attributes('aria-pressed')).toBe('false');
    expect(toggle.find('.sound-muted-mark').exists()).toBe(true);
    expect(toggle.find('.sound-waves').exists()).toBe(false);
    expect(sound.play).not.toHaveBeenCalled();
    await toggle.trigger('click');
    expect(toggle.attributes('aria-pressed')).toBe('true');
    expect(toggle.find('.sound-waves').exists()).toBe(true);
  });
  it('requests fullscreen only on a user click, tracks exit and handles browser refusal', async () => {
    const enabled = Object.getOwnPropertyDescriptor(document, 'fullscreenEnabled');
    const element = Object.getOwnPropertyDescriptor(document, 'fullscreenElement');
    const request = document.documentElement.requestFullscreen;
    const exit = document.exitFullscreen;
    const requestMock = vi.fn(async () => {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: document.documentElement });
    });
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
    document.documentElement.requestFullscreen = requestMock;
    document.exitFullscreen = vi.fn(async () => {
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, value: null });
    });
    try {
      wrapper = mount(App, { attachTo: document.body }); await nextTick();
      expect(wrapper.find('.fullscreen-toggle').exists()).toBe(true);
      expect(requestMock).not.toHaveBeenCalled();
      await wrapper.find('.fullscreen-toggle').trigger('click'); await flushPromises();
      expect(requestMock).toHaveBeenCalledOnce();
      expect(wrapper.find('.fullscreen-toggle').attributes('aria-pressed')).toBe('true');
      await wrapper.find('.fullscreen-toggle').trigger('click'); await flushPromises();
      expect(document.exitFullscreen).toHaveBeenCalledOnce();
      expect(wrapper.find('.fullscreen-toggle').attributes('aria-pressed')).toBe('false');
      requestMock.mockRejectedValueOnce(new Error('not allowed'));
      await wrapper.find('.fullscreen-toggle').trigger('click'); await flushPromises();
      expect(wrapper.find('[role="status"]').text()).toContain('切り替えられませんでした');
      expect(label()).toBe('ホーム画面');
    } finally {
      document.documentElement.requestFullscreen = request;
      document.exitFullscreen = exit;
      if (enabled) Object.defineProperty(document, 'fullscreenEnabled', enabled); else delete document.fullscreenEnabled;
      if (element) Object.defineProperty(document, 'fullscreenElement', element); else delete document.fullscreenElement;
    }
  });
  it('does not commit on drag start, cancellation, or outside drop; commits exactly on basket release', async () => {
    wrapper = mount(App, { attachTo: document.body }); await shop();
    const card = wrapper.find('.fruit-card');
    let captured = false;
    card.element.setPointerCapture = () => { captured = true; };
    card.element.hasPointerCapture = () => captured;
    card.element.releasePointerCapture = () => { captured = false; };
    card.element.getBoundingClientRect = () => ({ left: 10, top: 20, width: 70, height: 70 });
    wrapper.find('.drop-zone').element.getBoundingClientRect = () => ({ left: 100, top: 50, right: 200, bottom: 150 });
    const event = { isPrimary: true, pointerId: 1, button: 0, clientX: 30, clientY: 50 };
    await card.trigger('pointerdown', event);
    expect(label()).toBe('お客さんの商品選択画面');
    expect(document.querySelector('.fruit-drag-preview')).not.toBe(null);
    await card.trigger('pointercancel', event);
    expect(document.querySelector('.fruit-drag-preview')).toBe(null);
    expect(state().selectedFruit).toBe(null);
    await card.trigger('pointerdown', event); await card.trigger('pointerup', event);
    expect(label()).toBe('お客さんの商品選択画面');
    await card.trigger('pointerdown', event);
    await card.trigger('pointermove', { ...event, clientX: 150, clientY: 100 });
    expect(wrapper.find('.drop-zone--over').exists()).toBe(true);
    expect(label()).toBe('お客さんの商品選択画面');
    await card.trigger('pointerup', { ...event, clientX: 150, clientY: 100 });
    expect(label()).toBe('商品確認画面');
    expect(state().correctFruit.id).toBe(state().displayedFruits[0].id);
    expect(document.querySelector('.fruit-drag-preview')).toBe(null);
  });
  it('sets clerk choice correctly and preserves correct/wrong/third-failure decisions', async () => {
    wrapper = mount(App); await shop(); await drop(0);
    await shop('clerkShop'); await drop(0);
    expect(state().clerkFruit.id).toBe(state().correctFruit.id);
    await wrapper.findAll('.confirm-actions button')[1].trigger('click');
    expect(label()).toBe('正解画面');
    state().attempts = 3;
    for (let remaining = 2; remaining >= 0; remaining--) {
      await shop('clerkShop'); await drop(1);
      await wrapper.findAll('.confirm-actions button')[1].trigger('click');
      expect(label()).toBe(remaining ? '失敗画面' : '最終失敗画面');
      expect(state().attempts).toBe(Math.max(1, remaining));
    }
  });
  it('pauses help/menu, preserves 02:50 and warning flags, resumes without a reset', async () => {
    vi.useFakeTimers(); wrapper = mount(App); await shop('clerkShop');
    await vi.advanceTimersByTimeAsync(10000); expect(state().formattedTime).toBe('02:50');
    await wrapper.find('.help-button').trigger('click');
    await vi.advanceTimersByTimeAsync(5000); expect(state().formattedTime).toBe('02:50');
    await wrapper.find('.help-menu button').trigger('click');
    expect(label()).toContain('ヘルプ');
    await vi.advanceTimersByTimeAsync(5000); await wrapper.find('.help-close').trigger('click');
    expect(state().formattedTime).toBe('02:50');
    await vi.advanceTimersByTimeAsync(111000); expect(state().formattedTime).toBe('00:59');
    await wrapper.find('.one-minute-warning button').trigger('click');
    await wrapper.find('.help-button').trigger('click'); await wrapper.find('.help-menu button').trigger('click');
    await wrapper.find('.nav-arrow.next').trigger('click'); await wrapper.find('.help-close').trigger('click');
    expect(state().formattedTime).toBe('00:59'); expect(state().oneMinuteAcknowledged).toBe(true);
    await vi.advanceTimersByTimeAsync(1000); expect(state().formattedTime).toBe('00:58');
  });
  it('keyboard selection requires the basket action; simple touch click never commits', async () => {
    wrapper = mount(App); await shop();
    await wrapper.find('.fruit-card').trigger('click', { detail: 1 });
    expect(state().selectedFruit).toBe(null); expect(state().keyboardFruit).toBe(null);
    await wrapper.find('.fruit-card').trigger('click', { detail: 0 });
    expect(label()).toBe('お客さんの商品選択画面'); expect(state().keyboardFruit).not.toBe(null);
    await wrapper.find('.drop-zone').trigger('click'); expect(label()).toBe('商品確認画面');
  });
  it('restarts at role selection with a clean game and never returns to an old answer', async () => {
    vi.useFakeTimers(); wrapper = mount(App); await shop(); await drop(0);
    state().history = ['home', 'customerShop', 'productConfirm', 'failure'];
    state().attempts = 1; state().oneMinuteAcknowledged = true;
    state().timeUpAcknowledged = true; state().remainingSeconds = 0;
    await shop('finalFailure');
    await wrapper.findAll('.final-failure-screen button')[1].trigger('click');
    expect(label()).toBe('役割を決める画面');
    expect(wrapper.text()).toContain('さっそく');
    expect(state().history).toEqual(['home']);
    expect(state().selectedFruit).toBe(null);
    expect(state().correctFruit).toBe(null);
    expect(state().clerkFruit).toBe(null);
    expect(state().attempts).toBe(3);
    expect(state().remainingSeconds).toBe(180);
    expect(state().oneMinuteAcknowledged).toBe(false);
    expect(state().timeUpAcknowledged).toBe(false);
    await wrapper.find('.nav-arrow.back').trigger('click');
    expect(label()).toBe('ホーム画面');
  });
  it('explains dragging and distinguishes the selected feeling in either confirmation', async () => {
    wrapper = mount(App); await shop('help2');
    expect(wrapper.find('.help-lesson-two').text()).toContain('ゆびを　はなさず');
    expect(wrapper.find('.help-lesson-two').text()).not.toContain('タップ');
    state().displayedFruits = [
      { id: 'angry', emoji: '🍎', fruitName: 'りんご', feeling: 'おこる' },
      { id: 'danger', emoji: '🍎', fruitName: 'りんご', feeling: 'あぶない' },
    ];
    await shop(); await drop(0);
    expect(wrapper.find('.confirmed-feeling').text()).toBe('おこる');
    await shop('clerkShop'); await drop(1);
    expect(wrapper.find('.confirmed-feeling').text()).toBe('あぶない');
    expect(wrapper.find('.big-fruit').attributes('aria-label')).toContain('あぶない');
  });
  it('uses one context-specific sound per action without a button sound masking the result', async () => {
    wrapper = mount(App, { attachTo: document.body });
    await wrapper.find('.start-button').trigger('click');
    expect(sound.play.mock.calls).toEqual([['button']]); sound.play.mockClear();
    await shop(); await drop(0);
    expect(sound.play.mock.calls).toEqual([['drop']]); sound.play.mockClear();
    await shop('clerkShop'); await drop(1); sound.play.mockClear();
    await wrapper.findAll('.confirm-actions button')[1].trigger('click');
    expect(sound.play.mock.calls).toEqual([['retry']]); sound.play.mockClear();
    await shop('clerkShop'); await drop(0); sound.play.mockClear();
    await wrapper.findAll('.confirm-actions button')[1].trigger('click');
    expect(sound.play.mock.calls).toEqual([['success']]); sound.play.mockClear();
    state().attempts = 1;
    await shop('clerkShop'); await drop(1); sound.play.mockClear();
    await wrapper.findAll('.confirm-actions button')[1].trigger('click');
    expect(sound.play.mock.calls).toEqual([['retry']]);
  });
  it('keeps a readable register word and its reading only on help step two', async () => {
    wrapper = mount(App, { attachTo: document.body }); await shop('help2'); await nextTick();
    expect(wrapper.find('.help-lesson-two .register-base').text()).toBe('レジ');
    expect(wrapper.find('.help-lesson-two .register-word rt').text()).toBe('れじ');
    state().helpOpen = true; await nextTick(); await nextTick();
    state().helpOpen = false; await nextTick(); await nextTick();
    expect(wrapper.findAll('.register-word')).toHaveLength(1);
    expect(wrapper.findAll('.register-word ruby')).toHaveLength(0);
    await shop('productIntro'); await nextTick();
    expect(wrapper.find('.register-word').exists()).toBe(false);
  });
});
