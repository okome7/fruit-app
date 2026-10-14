import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { nextTick } from 'vue';
import App from '../src/App.vue';

vi.mock('../src/composables/useSfx.js', async () => {
  const { ref } = await import('vue');
  return { useSfx: () => {
    const muted=ref(true);
    return { muted, play:vi.fn(), unlock:vi.fn(), preload:vi.fn(), dispose:vi.fn(), toggle() { muted.value=!muted.value; } };
  }};
});
let wrapper;
afterEach(() => { wrapper?.unmount(); document.body.innerHTML=''; vi.unstubAllGlobals(); });

describe('BGM integration (mounted DOM; not real audio output)', () => {
  it('stays silent through Start until explicit ON, preserves the choice across screens, and stops on OFF', async () => {
    const players=[];
    vi.stubGlobal('Audio',class {
      paused=true;
      constructor(url) { this.url=url; this.play=vi.fn(() => {this.paused=false; return Promise.resolve();}); this.pause=vi.fn(() => {this.paused=true;}); players.push(this); }
      removeAttribute() {} load() {}
    });
    wrapper=mount(App,{attachTo:document.body});
    const sfx=wrapper.vm.$.setupState.sfx;
    expect(wrapper.find('.sound-toggle').attributes('aria-pressed')).toBe('false');
    expect(players).toHaveLength(0);
    await wrapper.find('.start-button').trigger('click');
    expect(players).toHaveLength(0);
    expect(sfx.muted.value).toBe(true);
    sfx.play.mockClear();
    await wrapper.find('.sound-toggle').find('svg').trigger('click');
    expect(players).toHaveLength(1); expect(players[0].play).toHaveBeenCalledTimes(1);
    expect(players[0].url).toBe('/audio/bgm.mp3');
    expect(sfx.muted.value).toBe(false);
    expect(sfx.play).not.toHaveBeenCalled();
    wrapper.vm.$.setupState.screen='course'; await nextTick();
    expect(wrapper.find('.sound-toggle').attributes('aria-pressed')).toBe('true');
    expect(players).toHaveLength(1); expect(players[0].play).toHaveBeenCalledTimes(1);
    await wrapper.find('.sound-toggle').trigger('click');
    expect(players[0].muted).toBe(true); expect(players[0].paused).toBe(true);
    wrapper.vm.$.setupState.screen='home'; await nextTick();
    expect(wrapper.find('.sound-toggle').attributes('aria-pressed')).toBe('false');
    await wrapper.find('.start-button').trigger('click');
    expect(players[0].play).toHaveBeenCalledTimes(1);
    await wrapper.find('.sound-toggle').trigger('click');
    expect(players).toHaveLength(1); expect(players[0].play).toHaveBeenCalledTimes(2);
    wrapper.unmount(); wrapper=null;
    expect(players[0].paused).toBe(true);
  });
  it('starts OFF again on a fresh app even after the previous app was ON', async () => {
    const create=vi.fn();
    vi.stubGlobal('Audio',class {
      paused=true;
      constructor() { create(); }
      play() { this.paused=false; return Promise.resolve(); }
      pause() { this.paused=true; }
      removeAttribute() {} load() {}
    });
    wrapper=mount(App,{attachTo:document.body});
    await wrapper.find('.sound-toggle').trigger('click');
    expect(create).toHaveBeenCalledTimes(1);
    wrapper.unmount();
    wrapper=mount(App,{attachTo:document.body});
    expect(wrapper.find('.sound-toggle').attributes('aria-pressed')).toBe('false');
    await wrapper.find('.start-button').trigger('click');
    expect(create).toHaveBeenCalledTimes(1);
  });
});
