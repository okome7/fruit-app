import test from 'node:test';
import assert from 'node:assert/strict';
import { shopDropZoneStyle, fruitScenes } from '../src/lib/fruitLayout.js';
import { createDragSession, pointInRect } from '../src/lib/pointerDrag.js';

const sizes = [[320,568],[360,640],[390,844],[430,932],[568,320],[667,375],[740,300],[844,390],[932,430],[1536,706]];
for (const pointerType of ['mouse','touch']) {
  test(`whole basket accepts ${pointerType} drops at rim, corners and center while excluding other UI`, () => {
    const scene=fruitScenes.customer;
    const style=shopDropZoneStyle();
    for(const [vw,vh] of sizes) {
      const scale=Math.min(vw/scene.width,vh/scene.height);
      const width=vw>=vh ? vw : scene.width*scale, height=vw>=vh ? vh : scene.height*scale;
      const scaleX=width/scene.width, scaleY=height/scene.height;
      const offsetX=(vw-width)/2, offsetY=(vh-height)/2;
      const left=offsetX+parseFloat(style.left)*width/100;
      const top=offsetY+parseFloat(style.top)*height/100;
      const right=left+parseFloat(style.width)*width/100;
      const bottom=top+parseFloat(style.height)*height/100;
      const rect={left,top,right,bottom};
      const centerX=(left+right)/2, centerY=(top+bottom)/2;
      const accepted=[[left,top],[right,top],[left,bottom],[right,bottom],
        [left,centerY],[right,centerY],[centerX,top],[centerX,bottom],[centerX,centerY],
        // Outer rim measured from the actual background, outside the previous inner-only target.
        [offsetX+1423*scaleX,offsetY+536*scaleY],[offsetX+1828*scaleX,offsetY+840*scaleY]];
      const rejected=[[left-.1,centerY],[right+.1,centerY],[centerX,top-.1],[centerX,bottom+.1],
        [offsetX+1179*scaleX,offsetY+614*scaleY],[offsetX+1600*scaleX,offsetY+300*scaleY]];
      for(const [x,y] of accepted) {
        const drag=createDragSession();
        assert.equal(drag.begin({pointerId:1,isPrimary:true,button:0,pointerType,clientX:10,clientY:20}),true);
        assert.equal(drag.move({pointerId:1,pointerType,clientX:x,clientY:y}),true);
        assert.equal(drag.finish({pointerId:1,pointerType,clientX:x,clientY:y},rect),true);
      }
      for(const [x,y] of rejected) {
        assert.equal(pointInRect(x,y,rect),false);
        const drag=createDragSession();
        drag.begin({pointerId:1,isPrimary:true,button:0,pointerType,clientX:10,clientY:20});
        assert.equal(drag.finish({pointerId:1,pointerType,clientX:x,clientY:y},rect),false);
      }
    }
  });
}

for(const pointerType of ['mouse','touch']) {
  test(`whole clerk register accepts ${pointerType} on monitor, keys, case and tray across viewport scaling`,()=>{
    const scene=fruitScenes.clerk,style=shopDropZoneStyle(true);
    for(const [vw,vh] of sizes) {
      const fit=Math.min(vw/scene.width,vh/scene.height);
      const width=vw>=vh?vw:scene.width*fit,height=vw>=vh?vh:scene.height*fit;
      const sx=width/scene.width,sy=height/scene.height,ox=(vw-width)/2,oy=(vh-height)/2;
      const left=ox+parseFloat(style.left)*width/100,top=oy+parseFloat(style.top)*height/100;
      const rect={left,top,right:left+parseFloat(style.width)*width/100,bottom:top+parseFloat(style.height)*height/100};
      for(const [x,y] of [[1597,312],[1530,480],[1380,570],[1440,805],[1750,790]]) {
        const drag=createDragSession();
        drag.begin({pointerId:1,isPrimary:true,button:0,pointerType,clientX:scene.fruitX[3]*sx+ox,clientY:scene.fruitY[1]*sy+oy});
        drag.move({pointerId:1,pointerType,clientX:ox+x*sx,clientY:oy+y*sy});
        assert.equal(drag.finish({pointerId:1,pointerType,clientX:ox+x*sx,clientY:oy+y*sy},rect),true);
      }
      for(const [x,y] of [[1150,589],[1450,160],[1800,440],[1337,530],[1600,249],[1779,530],[1600,817]]) {
        const drag=createDragSession();
        drag.begin({pointerId:1,isPrimary:true,button:0,pointerType,clientX:10,clientY:20});
        assert.equal(drag.finish({pointerId:1,pointerType,clientX:ox+x*sx,clientY:oy+y*sy},rect),false);
      }
    }
  });
}
