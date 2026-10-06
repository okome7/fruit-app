import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import App from '../src/App.vue';

const sound = vi.hoisted(() => ({ play: vi.fn(), toggle: vi.fn() }));
vi.mock('../src/composables/useSfx.js', async () => {
  const { ref } = await import('vue');
  return { useSfx: () => ({ muted: ref(false), play: sound.play, toggle: sound.toggle,
    unlock: vi.fn(), preload: vi.fn(), dispose: vi.fn() }) };
});
let wrapper;
const state = () => wrapper.vm.$.setupState;
afterEach(() => { wrapper?.unmount(); document.body.innerHTML = ''; vi.useRealTimers(); vi.clearAllMocks(); });
async function start(screen = 'roles') {
  wrapper = mount(App, { attachTo: document.body });
  state().screen = screen; await nextTick();
  await wrapper.find('.help-button').trigger('click');
  sound.play.mockClear();
}
function dispatch(element, type) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  element.dispatchEvent(event);
  return event;
}

describe('help menu outside dismissal (mounted DOM, not browser hit testing)', () => {
  it.each(['.screen-frame', '.viewport'])('closes on %s background and restores focus to the help button', async (selector) => {
    await start();
    expect(wrapper.find('.help-button').attributes('aria-expanded')).toBe('true');
    const background = wrapper.find(selector).element;
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) {
      expect(dispatch(background, type).defaultPrevented).toBe(true);
      expect(state().helpOpen).toBe(true);
    }
    expect(dispatch(background, 'click').defaultPrevented).toBe(true);
    await nextTick(); await nextTick();
    expect(state().helpOpen).toBe(false);
    expect(state().screen).toBe('roles');
    expect(wrapper.find('.help-button').attributes('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(wrapper.find('.help-button').element);
    expect(sound.play).not.toHaveBeenCalled();
  });
  it('consumes the click over navigation and allows the next deliberate click', async () => {
    await start();
    const next = wrapper.find('.nav-arrow.next').element;
    const listener = vi.fn(); next.addEventListener('pointerdown', listener);
    dispatch(next, 'pointerdown'); dispatch(next, 'pointerup'); dispatch(next, 'click');
    await nextTick();
    expect(listener).not.toHaveBeenCalled();
    expect(state().screen).toBe('roles');
    expect(state().helpOpen).toBe(false);
    expect(sound.play).not.toHaveBeenCalled();
    next.click(); await nextTick();
    expect(state().screen).toBe('courses');
    expect(sound.play).toHaveBeenCalledOnce();
  });
  it('does not toggle sound or select a fruit through the dismissal click', async () => {
    await start('customerShop');
    await wrapper.find('.sound-toggle').trigger('click');
    expect(state().helpOpen).toBe(false); expect(sound.toggle).not.toHaveBeenCalled();
    await wrapper.find('.help-button').trigger('click'); sound.play.mockClear();
    expect(wrapper.find('.viewport').classes()).toContain('help-menu-open');
    expect(wrapper.find('.fruit-card').element.disabled).toBe(true);
    // CSS makes disabled fruit transparent to hit testing. Simulate its real
    // background target; synthetic disabled-button clicks are suppressed too.
    const background = wrapper.find('.screen-frame').element;
    dispatch(background, 'pointerdown'); dispatch(background, 'pointerup');
    background.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 0 }));
    await nextTick();
    expect(state().keyboardFruit).toBe(null); expect(state().selectedFruit).toBe(null);
    expect(document.querySelector('.fruit-drag-preview')).toBe(null);
    expect(state().screen).toBe('customerShop'); expect(state().helpOpen).toBe(false);
    expect(wrapper.find('.viewport').classes()).not.toContain('help-menu-open');
    expect(wrapper.find('.fruit-card').element.disabled).toBe(false);
    expect(sound.play).not.toHaveBeenCalled();
  });
  it('keeps internal help/home actions and the existing home confirmation focus flow', async () => {
    await start();
    await wrapper.find('.help-menu button').trigger('click');
    expect(state().screen).toBe('help1'); expect(state().helpOpen).toBe(false);
    await wrapper.find('.help-close').trigger('click');
    await wrapper.find('.help-button').trigger('click');
    const home = wrapper.findAll('.help-menu button')[1];
    await home.trigger('click'); await nextTick(); await nextTick();
    expect(state().homeConfirm).toBe(true); expect(state().helpOpen).toBe(true);
    await wrapper.find('.home-modal-no').trigger('click'); await nextTick(); await nextTick();
    expect(state().homeConfirm).toBe(false); expect(state().helpOpen).toBe(true);
    expect(document.activeElement).toBe(home.element);
    await wrapper.find('.viewport').trigger('click'); await nextTick();
    expect(state().helpOpen).toBe(false);
    expect(document.activeElement).toBe(wrapper.find('.help-button').element);
    await wrapper.find('.help-button').trigger('click');
    await wrapper.find('.help-button').trigger('click');
    expect(state().helpOpen).toBe(false);
  });
  it('resumes the paused timer after dismissal without resetting time or warning flags', async () => {
    vi.useFakeTimers(); await start('clerkShop');
    await wrapper.find('.help-button').trigger('click');
    await vi.advanceTimersByTimeAsync(10500);
    const remaining = state().remainingSeconds;
    state().oneMinuteAcknowledged = true; state().timeUpAcknowledged = true;
    await wrapper.find('.help-button').trigger('click');
    await vi.advanceTimersByTimeAsync(5000); expect(state().remainingSeconds).toBe(remaining);
    await wrapper.find('.screen-frame').trigger('click');
    expect(state().remainingSeconds).toBe(remaining);
    await vi.advanceTimersByTimeAsync(1000); expect(state().remainingSeconds).toBe(remaining - 1);
    expect(state().oneMinuteAcknowledged).toBe(true); expect(state().timeUpAcknowledged).toBe(true);
  });
});
