import { mount, flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import App from '../src/App.vue';

vi.mock('../src/composables/useSfx.js', async () => {
  const { ref } = await import('vue');
  return { useSfx: () => ({ muted: ref(false), play: vi.fn(), unlock: vi.fn(), preload: vi.fn(),
    dispose: vi.fn(), toggle: vi.fn() }) };
});
let wrapper;
afterEach(() => { wrapper?.unmount(); wrapper = null; document.body.innerHTML = ''; vi.useRealTimers(); });
const state = () => wrapper.vm.$.setupState;
async function start(screen = 'roles') {
  wrapper = mount(App, { attachTo: document.body });
  state().screen = screen;
  await nextTick();
}
async function open() {
  await wrapper.find('.help-button').trigger('click');
  const openerButton = wrapper.findAll('.help-menu button')[1];
  const opener = openerButton.element;
  // Pointer activation need not focus a button (for example on mobile Safari).
  await openerButton.trigger('click');
  await nextTick(); await nextTick();
  return opener;
}
function key(value, options = {}, target = document.activeElement) {
  const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  return event;
}

describe('home confirmation keyboard and background isolation (mounted DOM)', () => {
  it('focuses Cancel, marks the whole background inert and loops Tab in both directions', async () => {
    await start(); await open();
    const cancel = wrapper.find('.home-modal-no').element;
    const confirm = wrapper.find('.home-modal-yes').element;
    expect(wrapper.find('.game-surface').attributes()).toHaveProperty('inert');
    expect(document.activeElement).toBe(cancel);
    expect(key('Tab').defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(confirm);
    key('Tab'); expect(document.activeElement).toBe(cancel);
    key('Tab', { shiftKey: true }); expect(document.activeElement).toBe(confirm);
    key('Tab', { shiftKey: true }); expect(document.activeElement).toBe(cancel);
  });
  it('blocks background clicks, pointer events, Enter/Space and forced focus even without inert support', async () => {
    await start(); await open();
    wrapper.find('.game-surface').element.removeAttribute('inert');
    const next = wrapper.find('.nav-arrow.next').element;
    next.focus();
    expect(document.activeElement).toBe(wrapper.find('.home-modal-no').element);
    for (const value of ['Enter', ' ']) expect(key(value, {}, next).defaultPrevented).toBe(true);
    for (const type of ['pointerdown', 'pointerup', 'click']) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      next.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    next.click(); await nextTick();
    expect(state().screen).toBe('roles');
    expect(state().homeConfirm).toBe(true);
  });
  it('Cancel and Escape restore the exact opener, including a pointer-opened dialog', async () => {
    await start();
    const opener = await open();
    await wrapper.find('.home-modal-no').trigger('click'); await flushPromises();
    expect(document.activeElement).toBe(opener);
    expect(state().helpOpen).toBe(true);
    expect(wrapper.find('.game-surface').attributes()).not.toHaveProperty('inert');
    await wrapper.findAll('.help-menu button')[1].trigger('click'); await nextTick(); await nextTick();
    expect(key('Escape').defaultPrevented).toBe(true);
    await flushPromises();
    expect(state().homeConfirm).toBe(false);
    expect(document.activeElement).toBe(opener);
    expect(state().screen).toBe('roles');
  });
  it('OK returns to Home and focuses Start after the original opener disappears', async () => {
    await start(); await open();
    await wrapper.find('.home-modal-yes').trigger('click'); await flushPromises();
    expect(state().screen).toBe('home');
    expect(state().homeConfirm).toBe(false);
    expect(state().helpOpen).toBe(false);
    expect(wrapper.find('.game-surface').attributes()).not.toHaveProperty('inert');
    expect(document.activeElement).toBe(wrapper.find('.start-button').element);
    await wrapper.find('.start-button').trigger('click');
    expect(state().screen).toBe('terms');
  });
  it('removes document guards on unmount while open', async () => {
    await start(); await open();
    wrapper.unmount(); wrapper = null;
    const outside = document.createElement('button'); document.body.append(outside); outside.focus();
    const onClick = vi.fn(); outside.addEventListener('click', onClick);
    expect(key('Tab', {}, outside).defaultPrevented).toBe(false);
    outside.click(); expect(onClick).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(outside);
  });
  it('preserves menu/dialog timer pause and the existing timer behavior while the app is hidden', async () => {
    vi.useFakeTimers(); await start('clerkShop');
    await vi.advanceTimersByTimeAsync(5000); expect(state().remainingSeconds).toBe(175);
    await open();
    await vi.advanceTimersByTimeAsync(5000); expect(state().remainingSeconds).toBe(175);
    key('Escape'); await nextTick();
    await vi.advanceTimersByTimeAsync(3000); expect(state().remainingSeconds).toBe(175);
    await wrapper.find('.help-button').trigger('click');
    const hidden = Object.getOwnPropertyDescriptor(document, 'hidden');
    try {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
      await vi.advanceTimersByTimeAsync(3000);
      expect(state().remainingSeconds).toBe(172);
    } finally {
      if (hidden) Object.defineProperty(document, 'hidden', hidden); else delete document.hidden;
    }
  });
});
