// Pixel anchors measured from the actual scene artwork. Background and foreground
// share the same full-frame percentage coordinates at every viewport size.
export const fruitScenes = {
  customer: {
    width: 1186, height: 535,
    fruitX: [156, 350, 545, 740], fruitY: [163, 382],
    labelX: [[154, 349, 544, 738], [150, 345, 542, 737]], labelY: [250, 475],
    labelWidth: 119, labelHeight: 38,
  },
  clerk: {
    width: 937, height: 438,
    fruitX: [124, 278, 432, 585], fruitY: [126, 297],
    labelX: [[123, 278, 432, 586], [120, 274, 430, 585]], labelY: [195, 372],
    labelWidth: 92, labelHeight: 30,
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
