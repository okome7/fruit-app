import { mount } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import App from '../src/App.vue';
import { associationQuestions, gestureQuestions, finalQuestion, selectionPrompt } from '../src/lib/questions.js';
vi.mock('../src/composables/useSfx.js', async () => {
 const { ref }=await import('vue');
 return {useSfx:()=>({muted:ref(false),play:vi.fn(),unlock:vi.fn(),preload:vi.fn(),dispose:vi.fn(),toggle:vi.fn()})};
});
let wrapper;
afterEach(()=>{wrapper?.unmount();wrapper=null;vi.useRealTimers();});
const tick=async()=>{await nextTick();await nextTick();};
describe('explicit voice-requested corrections',()=>{
 it('matches all question kinds without changing the question text',()=>{
  const prompts=[...gestureQuestions,...associationQuestions,finalQuestion].map(selectionPrompt);
  expect(prompts).toEqual([
   'そのうごきになる　くだものを','そのポーズになる　くだものを','そのひょうじょうになる　くだものを',
   'そのうごきになる　くだものを','そのうごきになる　くだものを','そのポーズになる　くだものを',
   'そのおとから　おもいうかぶ　くだものを','そのあじから　おもいうかぶ　くだものを',
   'そのどうぶつから　おもいうかぶ　くだものを','そのいいかたから　おもいうかぶ　くだものを']);
 });
 it('keeps a live visible timer and the same clerk background through confirmation and cancel',async()=>{
  vi.useFakeTimers();wrapper=mount(App);const s=wrapper.vm.$.setupState;
  s.screen='clerkShop';await tick();const bg=wrapper.find('.screen-frame').attributes('style');
  vi.advanceTimersByTime(2100);await tick();s.selectFruit(s.displayedFruits[0]);await tick();
  expect(s.screen).toBe('productConfirm');expect(s.remainingSeconds).toBe(178);
  expect(wrapper.find('.screen-frame').attributes('style')).toContain('clerk-shop-background.png');
  expect(bg).toContain('clerk-shop-background.png');
  expect(wrapper.find('.confirmation-timer').text()).toContain('02:58');
  vi.advanceTimersByTime(3100);await tick();expect(wrapper.find('.confirmation-timer').text()).toContain('02:55');
  await wrapper.find('.confirm-actions button').trigger('click');await tick();
  expect(s.screen).toBe('clerkShop');expect(s.remainingSeconds).toBe(175);
 });
 it('uses the customer background for customer confirmation and keeps menu home as text',async()=>{
  wrapper=mount(App);const s=wrapper.vm.$.setupState;s.screen='customerShop';await tick();
  s.selectFruit(s.displayedFruits[0]);await tick();
  expect(wrapper.find('.screen-frame').attributes('style')).toContain('customer-shop-background.png');
  await wrapper.find('.help-button').trigger('click');await tick();
  const home=wrapper.find('.help-menu button:last-child');expect(home.text()).toBe('ホームにもどる');expect(home.find('img').exists()).toBe(false);
 });
});
