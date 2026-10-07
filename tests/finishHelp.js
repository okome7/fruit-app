import { expect } from 'vitest';

export async function finishHelp(wrapper) {
  for (let step = 0; step < 3 && !wrapper.find('.help-complete').exists(); step++) {
    expect(wrapper.find('.help-close').exists()).toBe(false);
    expect(wrapper.find('.sound-toggle').exists()).toBe(true);
    await wrapper.find('.nav-arrow.next').trigger('click');
  }
  expect(wrapper.find('.help-close').exists()).toBe(false);
  expect(wrapper.find('.sound-toggle').exists()).toBe(true);
  await wrapper.find('.help-complete').trigger('click');
}
