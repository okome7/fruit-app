// Pixel anchors measured from the actual scene artwork. Background and foreground
// share the same full-frame percentage coordinates at every viewport size.
// Keep the measured plate centers while leaving a real gap above the labels.
export const fruitArtSceneUnits = 10;
export const fruitScenes = {
  customer: {
    width: 1847, height: 851,
    fruitX: [247, 555, 863, 1168], fruitY: [264, 613],
    labelX: [[239, 550, 863, 1177], [239, 550, 863, 1177]], labelY: [400, 753],
    labelWidth: 280, labelHeight: 64,
    basket: { x: 1420, y: 534, width: 410, height: 307 },
  },
  clerk: {
    width: 1836, height: 856,
    fruitX: [248, 550, 853, 1150], fruitY: [249, 589],
    labelX: [[239, 550, 860, 1167], [239, 550, 860, 1167]], labelY: [379, 721],
    labelWidth: 274, labelHeight: 60,
    // Keep only the area below the former register target midpoint (y533).
    basket: { x: 1338, y: 534, width: 440, height: 282 },
    timer: { x: 1597, y: 312 },
    question: { x: 1345, y: 103, width: 212, height: 118 },
  },
};

export function fruitSlotStyle(index, clerk = false) {
  const scene = fruitScenes[clerk ? 'clerk' : 'customer'];
  const row = Math.floor(index / 4);
  const column = index % 4;
  const percent = (value, total) => `${(value / total) * 100}%`;
  return {
    '--fruit-x': percent(scene.fruitX[column], scene.width),
    '--fruit-y': percent(scene.fruitY[row], scene.height),
    '--label-x': percent(scene.labelX[row][column], scene.width),
    '--label-y': percent(scene.labelY[row], scene.height),
    '--label-width': percent(scene.labelWidth, scene.width),
    '--label-height': percent(scene.labelHeight, scene.height),
  };
}

// The visible target and pointer hit test share this same DOM rectangle.
export function shopDropZoneStyle(clerk = false) {
  const scene = fruitScenes[clerk ? 'clerk' : 'customer'];
  const box = scene.basket;
  return {
    left: `${box.x / scene.width * 100}%`,
    top: `${box.y / scene.height * 100}%`,
    width: `${box.width / scene.width * 100}%`,
    height: `${box.height / scene.height * 100}%`,
    right: 'auto',
    bottom: 'auto',
  };
}

export function shopSceneStyle(clerk = false) {
  const scene = fruitScenes[clerk ? 'clerk' : 'customer'];
  const style = { '--scene-aspect': scene.width / scene.height, '--fruit-art-scale': fruitArtSceneUnits };
  if (clerk) {
    style['--timer-scene-x'] = `${scene.timer.x / scene.width * 100}%`;
    style['--timer-scene-y'] = `${scene.timer.y / scene.height * 100}%`;
    style['--timer-x'] = `${(scene.timer.x - scene.basket.x) / scene.basket.width * 100}%`;
    style['--timer-y'] = `${(scene.timer.y - scene.basket.y) / scene.basket.height * 100}%`;
    style['--question-left'] = `${scene.question.x / scene.width * 100}%`;
    style['--question-top'] = `${scene.question.y / scene.height * 100}%`;
    style['--question-width'] = `${scene.question.width / scene.width * 100}%`;
    style['--question-height'] = `${scene.question.height / scene.height * 100}%`;
  }
  return style;
}
