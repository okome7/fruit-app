import { mount } from '@vue/test-utils';
import { expect, it, vi } from 'vitest';
import { nextTick } from 'vue';
import App from '../src/App.vue';
import { fruitLabel } from '../src/lib/fruitLabel.js';
import { shopDropZoneStyle, shopSceneStyle, fruitScenes, fruitArtSceneUnits } from '../src/lib/fruitLayout.js';
vi.mock('../src/composables/useSfx.js', async () => {
  const { ref } = await import('vue');
  return { useSfx: () => ({ muted: ref(false), play: vi.fn(), unlock: vi.fn(), preload: vi.fn(), dispose: vi.fn(), toggle: vi.fn() }) };
});
const viewports = [[320,568],[360,640],[390,844],[430,932],[568,320],[667,375],[740,300],[844,390],[932,430],[1536,706]];
const fit = (width,height,scene) => {
  if (width >= height) {
    return { width, height, unit: Math.min(width/100, height*scene.width/scene.height/100) };
  }
  const scale = Math.min(width/scene.width,height/scene.height);
  return {width:scene.width*scale,height:scene.height*scale,unit:scene.width*scale/100};
};
it('fits both shop scenes, fruit and every emotion label without horizontal overflow', () => {
  const wrapper = mount(App);
  try {
    const fruits = wrapper.vm.$.setupState.fruits;
    for (const clerk of [false,true]) {
      const scene = fruitScenes[clerk ? 'clerk' : 'customer'];
      expect(shopSceneStyle(clerk)['--scene-aspect']).toBe(scene.width/scene.height);
      expect(shopSceneStyle(clerk)['--fruit-art-scale']).toBe(fruitArtSceneUnits);
      for (const [vw,vh] of viewports) {
        const {width,height,unit}=fit(vw,vh,scene);
        expect(width).toBeLessThanOrEqual(vw+1e-8);
        expect(height).toBeLessThanOrEqual(vh+1e-8);
        const artSize=Math.min(100,fruitArtSceneUnits*unit);
        const touchSize=Math.max(44,10.8*unit);
        for (const fruit of fruits) {
          const text=fruitLabel(fruit);
          expect(text.replace(/\n/g,'')).toBe(fruit.feeling.replace(/\n/g,''));
          const lines=text.split('\n');
          const size=lines.length>1 ? Math.min(24,1.55*unit) : Math.min(26,2.4*unit);
          expect(Math.max(...lines.map(line=>[...line].length))*size).toBeLessThanOrEqual(scene.labelWidth/scene.width*width);
          expect(lines.length*size*(lines.length>1 ? 1.05 : 1.08)).toBeLessThanOrEqual(scene.labelHeight/scene.height*height);
        }
        for(let i=1;i<scene.fruitX.length;i++) {
          expect((scene.fruitX[i]-scene.fruitX[i-1])/scene.width*width).toBeGreaterThanOrEqual(Math.max(artSize,touchSize));
        }
        for(let row=0;row<2;row++) {
          expect(scene.fruitY[row]/scene.height*height+artSize/2).toBeLessThan((scene.labelY[row]-scene.labelHeight/2)/scene.height*height);
        }
      }
    }
  } finally { wrapper.unmount(); }
});
it('keeps each shop drop target in its own artwork coordinates and preserves other backgrounds', async () => {
  for(const clerk of [false,true]) {
    const scene=fruitScenes[clerk ? 'clerk' : 'customer'];
    const style=shopDropZoneStyle(clerk);
    for(const [vw,vh] of viewports) {
      const {width,height}=fit(vw,vh,scene);
      expect(parseFloat(style.left)*width/100).toBeCloseTo(scene.basket.x/scene.width*width);
      expect(parseFloat(style.top)*height/100).toBeCloseTo(scene.basket.y/scene.height*height);
      expect(parseFloat(style.width)*width/100).toBeCloseTo(scene.basket.width/scene.width*width);
      expect(parseFloat(style.height)*height/100).toBeCloseTo(scene.basket.height/scene.height*height);
      expect((parseFloat(style.left)+parseFloat(style.width))*width/100).toBeLessThanOrEqual(width);
      expect((parseFloat(style.top)+parseFloat(style.height))*height/100).toBeLessThanOrEqual(height);
    }
  }
  const wrapper=mount(App);
  try {
    const state=wrapper.vm.$.setupState;
    for(const [screen,image] of [['how1','how1-background.png'],['help1','game-start-background.png'],['guide','guide-background.png']]) {
      state.screen=screen; await nextTick();
      expect(wrapper.find('section').attributes('style')).toContain(image);
      expect(wrapper.find('main').classes()).not.toContain('fruit-shop-viewport');
    }
    for(const screen of ['customerShop','clerkShop']) {
      const clerk=screen==='clerkShop';
      state.screen=screen; await nextTick();
      expect(wrapper.find('section').classes()).toContain('fruit-shop-screen');
      expect(wrapper.find('main').classes()).not.toContain('fruit-shop-viewport');
      expect(wrapper.find('.drop-zone').element.style.left).toBe(shopDropZoneStyle(clerk).left);
      if(clerk) {
        const style=shopSceneStyle(true),target=fruitScenes.clerk.basket,timer=fruitScenes.clerk.timer;
        expect(target.x+parseFloat(style['--timer-x'])/100*target.width).toBeCloseTo(timer.x);
        expect(target.y+parseFloat(style['--timer-y'])/100*target.height).toBeCloseTo(timer.y);
      }

      expect(wrapper.find('.drop-zone').element.style.top).toBe(shopDropZoneStyle(clerk).top);
    }
  } finally { wrapper.unmount(); }
});
