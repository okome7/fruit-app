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
const modality = () => wrapper.attributes('data-input-modality');
function key(value, options = {}) {
  const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options });
  document.activeElement.dispatchEvent(event);
  return event;
}
async function activate(selector, pointerType) {
  const target = wrapper.find(selector);
  await target.trigger('pointerdown', { pointerType });
  await target.trigger('pointerup', { pointerType });
  await target.trigger('click', { detail: 1 });
  await tick();
}
async function start(screen) {
  wrapper = mount(App, { attachTo: document.body });
  state().screen = screen;
  await tick();
}
afterEach(() => { wrapper?.unmount(); wrapper = null; document.body.innerHTML = ''; });

describe('scoped pointer/keyboard focus presentation (mounted DOM)', () => {
  it.each(['mouse', 'touch', 'pen'])('keeps %s arrival and Help re-entry quiet without removing modal focus or the Tab trap', async (pointerType) => {
    await start('customerHandoff');
    await activate('.nav-arrow.next', pointerType);
    const confirm = () => wrapper.find('.customer-instruction button').element;
    expect(modality()).toBe('pointer');
    expect(document.activeElement).toBe(confirm());
    expect(wrapper.find('.sound-toggle').element.closest('[inert]')).not.toBe(null);

    expect(key('Tab').defaultPrevented).toBe(true);
    await tick();
    expect(modality()).toBe('keyboard');
    expect(document.activeElement).toBe(wrapper.find('.help-button').element);
    expect(key('Tab', { shiftKey: true }).defaultPrevented).toBe(true);
    await tick();
    expect(document.activeElement).toBe(confirm());

    await activate('.help-button', pointerType);
    expect(wrapper.find('.customer-instruction').exists()).toBe(false);
    await activate('.help-button', pointerType);
    expect(modality()).toBe('pointer');
    expect(document.activeElement).toBe(confirm());

    await activate('.customer-instruction button', pointerType);
    // Reopening the instructions from Help preserves that surviving opener.
    expect(document.activeElement).toBe(wrapper.find('.help-button').element);
    expect(modality()).toBe('pointer');
    expect(wrapper.findAll('[inert]')).toHaveLength(0);
    expect(state().keyboardFruit).toBe(null);
    expect(wrapper.find('.fruit-card.is-picked').exists()).toBe(false);
    key('Tab'); await tick();
    expect(modality()).toBe('keyboard');
  });

  it('keeps the automatic fruit focus after a first touch dismissal without marking any fruit as picked', async () => {
    await start('customerHandoff');
    await activate('.nav-arrow.next', 'touch');
    await activate('.customer-instruction button', 'touch');
    expect(document.activeElement).toBe(wrapper.find('.fruit-card').element);
    expect(modality()).toBe('pointer');
    expect(state().keyboardFruit).toBe(null);
    expect(wrapper.find('.fruit-card.is-picked').exists()).toBe(false);
  });

  it('preserves keyboard arrival, Escape and focus restoration, even after earlier pointer use', async () => {
    await start('customerHandoff');
    const next = wrapper.find('.nav-arrow.next');
    await next.trigger('pointerdown', { pointerType: 'touch' });
    next.element.focus();
    key('Enter');
    await next.trigger('click', { detail: 0 }); await tick();
    expect(modality()).toBe('keyboard');
    expect(document.activeElement).toBe(wrapper.find('.customer-instruction button').element);
    expect(key('Escape').defaultPrevented).toBe(true);
    await tick();
    expect(wrapper.find('.customer-instruction').exists()).toBe(false);
    expect(document.activeElement).toBe(wrapper.find('.fruit-card').element);
    expect(modality()).toBe('keyboard');
  });

  it.each(['customerShop', 'clerkShop'])('keeps a plain touch unselected in %s and retains genuine keyboard picks when switching input', async (screen) => {
    await start(screen);
    const card = wrapper.find('.fruit-card');
    card.element.focus();
    await activate('.fruit-card', 'touch');
    expect(document.activeElement).toBe(card.element);
    expect(modality()).toBe('pointer');
    expect(state().selectedFruit).toBe(null);
    expect(state().keyboardFruit).toBe(null);
    expect(card.attributes('aria-pressed')).toBe('false');
    expect(card.classes()).not.toContain('is-picked');

    key('Enter');
    await card.trigger('click', { detail: 0 }); await tick();
    expect(modality()).toBe('keyboard');
    expect(state().keyboardFruit.id).toBe(state().displayedFruits[0].id);
    expect(card.classes()).toContain('is-picked');
    expect(card.attributes('aria-pressed')).toBe('true');
    await activate('.fruit-card', 'touch');
    expect(modality()).toBe('pointer');
    expect(card.classes()).toContain('is-picked');
    expect(card.attributes('aria-pressed')).toBe('true');
  });

  it('tracks legacy touch/mouse input, ignores modified shortcuts and removes its listeners on unmount', async () => {
    await start('customerHandoff');
    expect(modality()).toBe('keyboard');
    await wrapper.trigger('touchstart');
    expect(modality()).toBe('pointer');
    key('c', { ctrlKey: true }); await tick();
    expect(modality()).toBe('pointer');
    key('Tab'); await tick();
    expect(modality()).toBe('keyboard');
    await wrapper.trigger('mousedown');
    expect(modality()).toBe('pointer');
    const previousState = state();
    wrapper.unmount(); wrapper = null;
    key('Tab'); await tick();
    expect(previousState.inputModality).toBe('pointer');
  });
});
