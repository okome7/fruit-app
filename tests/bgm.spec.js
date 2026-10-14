import { mount } from '@vue/test-utils';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { nextTick } from 'vue';
import App from '../src/App.vue';

vi.mock('../src/composables/useSfx.js', async () => {
  const { ref } = await import('vue');
  return { useSfx: () => {
    const muted=ref(false);
    return { muted, play:vi.fn(), unlock:vi.fn(), preload:vi.fn(), dispose:vi.fn(), toggle() { muted.value=!muted.value; } };
  }};
});
let wrapper;
afterEach(() => { wrapper?.unmount(); document.body.innerHTML=''; vi.unstubAllGlobals(); });

describe('BGM integration (mounted DOM; not real audio output)', () => {
  it('first OFF stays silent and first ON starts one player without a generic button sound', async () => {
    const players=[];
    vi.stubGlobal('Audio',class {
      paused=true;
      constructor() { this.play=vi.fn(() => {this.paused=false; return Promise.resolve();}); this.pause=vi.fn(() => {this.paused=true;}); players.push(this); }
      removeAttribute() {} load() {}
    });
    wrapper=mount(App,{attachTo:document.body});
    const sfx=wrapper.vm.$.setupState.sfx;
    const toggle=wrapper.find('.sound-toggle');
    await toggle.find('svg').trigger('click');
    expect(players).toHaveLength(0);
    expect(sfx.play).not.toHaveBeenCalled(); expect(sfx.unlock).not.toHaveBeenCalled();
    await toggle.find('svg').trigger('click');
    expect(players).toHaveLength(1); expect(players[0].play).toHaveBeenCalledTimes(1);
    expect(sfx.play).not.toHaveBeenCalled();
    await toggle.trigger('click');
    expect(players[0].muted).toBe(true); expect(players[0].paused).toBe(true);
  });
  it('starts on Start, survives screen changes, follows sound toggle and stops on unmount', async () => {
    const players=[];
    vi.stubGlobal('Audio',class {
      paused=true;
      constructor(url) { this.url=url; this.play=vi.fn(() => { this.paused=false; return Promise.resolve(); }); this.pause=vi.fn(() => {this.paused=true;}); players.push(this); }
      removeAttribute() {} load() {}
    });
    wrapper=mount(App,{attachTo:document.body});
    expect(players).toHaveLength(0);
    await wrapper.find('.start-button').trigger('click');
    expect(players).toHaveLength(1);
    expect(players[0].url).toBe('/audio/bgm.mp3');
    expect(players[0].play).toHaveBeenCalledTimes(1);
    wrapper.vm.$.setupState.screen='course'; await nextTick();
    expect(players).toHaveLength(1); expect(players[0].play).toHaveBeenCalledTimes(1);
    await wrapper.find('.sound-toggle').trigger('click');
    expect(players[0].paused).toBe(true); expect(players[0].muted).toBe(true);
    await wrapper.find('.sound-toggle').trigger('click');
    expect(players[0].play).toHaveBeenCalledTimes(2);
    wrapper.unmount(); wrapper=null;
    expect(players[0].paused).toBe(true);
  });
});
