import { mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import App from '../src/App.vue';
vi.mock('../src/composables/useSfx.js', async () => { const { ref } = await import('vue'); return { useSfx: () => ({ muted: ref(false), play: vi.fn(), unlock: vi.fn(), preload: vi.fn(), dispose: vi.fn(), toggle: vi.fn() }) }; });
it('shows the customer instructions for every course, preserves ruby, blocks selection until dismissed, and avoids reopening on confirmation return', async () => {
  for (const course of ['easy', 'hard', 'mix']) {
    const wrapper = mount(App, { attachTo: document.body });
    try {
      const state = wrapper.vm.$.setupState;
      state.selectedCourse = course; state.screen = 'customerHandoff';
      state.go('customerShop'); await nextTick(); await nextTick();
      expect(wrapper.find('.customer-instruction').attributes('role')).toBe('dialog');
      expect(wrapper.find('.customer-instruction ruby').text()).toBe('カゴかご');
      expect(wrapper.find('.customer-instruction rt').text()).toBe('かご');
      const body = wrapper.find('.customer-instruction p').element.cloneNode(true);
      body.querySelectorAll('rt').forEach(reading => reading.remove());
      expect(body.textContent).toBe('くだものを　ゆびで　カゴまで　はこんでね！');
      expect([...body.textContent].filter(character => character === '\u3000')).toHaveLength(3);
      expect(state.dragDisabled).toBe(true);
      state.selectFruit(state.displayedFruits[0]); expect(state.screen).toBe('customerShop');
      await wrapper.find('.customer-instruction button').trigger('click');
      expect(wrapper.find('.customer-instruction').exists()).toBe(false); expect(state.dragDisabled).toBe(false);
      state.selectFruit(state.displayedFruits[0]); await nextTick(); expect(state.screen).toBe('customerConfirm');
      state.back(); await nextTick(); expect(wrapper.find('.customer-instruction').exists()).toBe(false);
      state.screen = 'customerHandoff'; state.go('customerShop'); await nextTick();
      expect(wrapper.find('.customer-instruction').exists()).toBe(true);
      state.retryGame(); await nextTick(); expect(state.customerInstructionOpen).toBe(false);
    } finally { wrapper.unmount(); document.body.innerHTML = ''; }
  }
});
