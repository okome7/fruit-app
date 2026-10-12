import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import App from '../src/App.vue';

vi.mock('../src/composables/useSfx.js', async () => {
  const { ref } = await import('vue');
  return { useSfx: () => ({ muted: ref(false), play: vi.fn(), unlock: vi.fn(), preload: vi.fn(),
    dispose: vi.fn(), toggle: vi.fn() }) };
});
let wrapper;
const state = () => wrapper.vm.$.setupState;
const tick = async () => { await nextTick(); await nextTick(); };
afterEach(() => { wrapper?.unmount(); wrapper = null; document.body.innerHTML = ''; vi.useRealTimers(); });
async function start(screen) {
  wrapper = mount(App, { attachTo: document.body });
  state().screen = screen;
  await tick();
}
function key(value, options = {}, target = document.activeElement) {
  const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  return event;
}
function expectIsolated(dialogSelector) {
  const dialog = wrapper.find(dialogSelector).element;
  expect(dialog.closest('[inert]')).toBe(null);
  for (const selector of ['.sound-toggle', '.help-button', '.drop-zone']) {
    expect(wrapper.find(selector).element.closest('[inert]')).not.toBe(null);
  }
  expect(key('Tab').defaultPrevented).toBe(true);
  expect(dialog.contains(document.activeElement)).toBe(true);
  expect(key('Tab', { shiftKey: true }).defaultPrevented).toBe(true);
  expect(dialog.contains(document.activeElement)).toBe(true);
}

describe('gameplay dialogs, keyboard isolation and uninterrupted timer (mounted DOM)', () => {
  it('focuses customer instructions after actual navigation, isolates the scene and restores fruit focus on each visit', async () => {
    await start('customerHandoff');
    for (let visit = 0; visit < 2; visit++) {
      const next = wrapper.find('.nav-arrow.next');
      next.element.focus();
      await next.trigger('click'); await tick();
      const confirm = wrapper.find('.customer-instruction button').element;
      expect(document.activeElement).toBe(confirm);
      expectIsolated('.customer-instruction');
      if (visit === 0) expect(key('Escape').defaultPrevented).toBe(true);
      else confirm.click();
      await tick();
      expect(state().customerInstructionOpen).toBe(false);
      expect(document.activeElement).toBe(wrapper.find('.fruit-card').element);
      expect(wrapper.findAll('[inert]')).toHaveLength(0);
      if (visit === 0) {
        state().retryGame(); await tick();
        state().screen = 'customerHandoff'; await tick();
      }
    }
  });

  it('blocks covered instruction controls even without native inert support', async () => {
    await start('customerHandoff');
    await wrapper.find('.nav-arrow.next').trigger('click'); await tick();
    for (const element of wrapper.findAll('[inert]')) element.element.removeAttribute('inert');
    const help = wrapper.find('.help-button').element;
    help.focus();
    expect(document.activeElement).toBe(wrapper.find('.customer-instruction button').element);
    expect(key('Enter', {}, help).defaultPrevented).toBe(true);
    for (const type of ['pointerdown', 'pointerup', 'click']) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      help.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    }
    await tick();
    expect(state().helpOpen).toBe(false);
    expect(state().screen).toBe('customerShop');
    expect(state().customerInstructionOpen).toBe(true);
  });

  it('focuses preview Close, traps both Tab directions and restores its exact opener after repeated dismissals', async () => {
    await start('clerkShop');
    const opener = wrapper.find('.question-sign');
    for (const method of ['escape', 'close', 'backdrop']) {
      // Pointer activation does not necessarily focus the opener first.
      wrapper.find('.sound-toggle').element.focus();
      await opener.trigger('click'); await tick();
      expect(document.activeElement).toBe(wrapper.find('.question-preview-close').element);
      expectIsolated('.question-preview-backdrop');
      wrapper.find('.help-button').element.click(); await tick();
      expect(state().helpOpen).toBe(false);
      if (method === 'escape') key('Escape');
      else await wrapper.find(method === 'close' ? '.question-preview-close' : '.question-preview-backdrop').trigger('click');
      await tick();
      expect(state().questionPreviewOpen).toBe(false);
      expect(document.activeElement).toBe(opener.element);
      expect(wrapper.findAll('[inert]')).toHaveLength(0);
    }
  });

  it('announces and focuses both warnings without pausing time or changing chances', async () => {
    vi.useFakeTimers(); await start('clerkShop');
    const fruit = wrapper.find('.fruit-card').element;
    fruit.focus();
    const ids = state().displayedFruits.map(({ id }) => id);
    await vi.advanceTimersByTimeAsync(120000); await tick();
    const warning = wrapper.find('.one-minute-warning');
    expect(warning.attributes('role')).toBe('alertdialog');
    expect(warning.attributes('aria-modal')).toBe('true');
    expect(warning.attributes('aria-labelledby')).toBe(warning.find('p').attributes('id'));
    expect(document.activeElement).toBe(warning.find('button').element);
    expectIsolated('.one-minute-warning');
    await vi.advanceTimersByTimeAsync(1000);
    expect(state().remainingSeconds).toBe(59);
    await warning.find('button').trigger('click'); await tick();
    expect(document.activeElement).toBe(fruit);
    expect(state().oneMinuteAcknowledged).toBe(true);
    expect(fruit.disabled).toBe(false);
    await vi.advanceTimersByTimeAsync(59000); await tick();
    const timeUp = wrapper.find('.time-up-warning');
    expect(timeUp.attributes('role')).toBe('alertdialog');
    expect(timeUp.attributes('aria-labelledby')).toBe(timeUp.find('p').attributes('id'));
    expect(document.activeElement).toBe(timeUp.find('button').element);
    expectIsolated('.time-up-warning');
    key('Escape'); await tick();
    expect(state().timeUpAcknowledged).toBe(true);
    expect(document.activeElement).toBe(fruit);
    expect(fruit.disabled).toBe(false);
    expect(state().remainingSeconds).toBe(0);
    expect(state().attempts).toBe(3);
    expect(state().displayedFruits.map(({ id }) => id)).toEqual(ids);
    expect(wrapper.findAll('[inert]')).toHaveLength(0);
    await wrapper.find('.fruit-card').trigger('click', { detail: 0 });
    await wrapper.find('.drop-zone').trigger('click');
    expect(state().screen).toBe('productConfirm');
  });

  it('hands focus from preview to a pending warning and from an unacknowledged minute to time-up', async () => {
    vi.useFakeTimers(); await start('clerkShop');
    await vi.advanceTimersByTimeAsync(119000);
    const opener = wrapper.find('.question-sign');
    await opener.trigger('click'); await tick();
    await vi.advanceTimersByTimeAsync(2000); await tick();
    expect(state().remainingSeconds).toBe(59);
    expect(wrapper.find('.one-minute-warning').exists()).toBe(false);
    expect(document.activeElement).toBe(wrapper.find('.question-preview-close').element);
    key('Escape'); await tick();
    expect(document.activeElement).toBe(wrapper.find('.one-minute-warning button').element);
    expect(state().remainingSeconds).toBe(59);
    await vi.advanceTimersByTimeAsync(59000); await tick();
    expect(wrapper.find('.one-minute-warning').exists()).toBe(false);
    expect(document.activeElement).toBe(wrapper.find('.time-up-warning button').element);
    expectIsolated('.time-up-warning');
    await wrapper.find('.time-up-warning button').trigger('click'); await tick();
    expect(document.activeElement).toBe(opener.element);
    expect(wrapper.findAll('[inert]')).toHaveLength(0);
  });

  it('keeps help pause behavior at warning thresholds and removes all guards when unmounted', async () => {
    vi.useFakeTimers(); await start('clerkShop');
    await vi.advanceTimersByTimeAsync(119750);
    await wrapper.find('.help-button').trigger('click');
    await vi.advanceTimersByTimeAsync(5000);
    expect(state().remainingSeconds).toBe(61);
    expect(wrapper.find('[role="alertdialog"]').exists()).toBe(false);
    await wrapper.find('.help-button').trigger('click');
    await vi.advanceTimersByTimeAsync(250); await tick();
    expect(state().remainingSeconds).toBe(60);
    expect(document.activeElement).toBe(wrapper.find('.one-minute-warning button').element);
    wrapper.unmount(); wrapper = null;
    const outside = document.createElement('button'); document.body.append(outside); outside.focus();
    const onClick = vi.fn(); outside.addEventListener('click', onClick);
    expect(key('Tab').defaultPrevented).toBe(false);
    outside.click(); expect(onClick).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(outside);
  });
});
