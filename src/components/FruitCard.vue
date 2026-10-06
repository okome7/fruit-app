<script setup>
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import { createDragSession, pointInRect } from '../lib/pointerDrag.js';

const props = defineProps({
  fruit: { type: Object, required: true },
  dropZone: { default: null },
  disabled: Boolean,
  picked: Boolean,
});
const emit = defineEmits(['drop', 'drag-change', 'keyboard-pick']);
const drag = createDragSession();
const preview = ref(null);
let sourceElement = null;
const previewStyle = computed(() => preview.value ? {
  left: `${preview.value.left}px`, top: `${preview.value.top}px`,
  width: `${preview.value.width}px`, height: `${preview.value.height}px`,
  '--fruit-size': preview.value.fruitSize, '--face-size': preview.value.faceSize,
} : {});

function targetRect() { return props.dropZone?.getBoundingClientRect(); }
function cancel() {
  const pointerId = drag.active?.pointerId;
  drag.cancel();
  preview.value = null;
  emit('drag-change', { active: false, over: false });
  if (pointerId !== undefined && sourceElement?.hasPointerCapture(pointerId)) {
    sourceElement.releasePointerCapture(pointerId);
  }
  sourceElement = null;
}
function start(event) {
  if (props.disabled || !drag.begin(event)) return;
  sourceElement = event.currentTarget;
  try { sourceElement.setPointerCapture(event.pointerId); }
  catch { cancel(); return; }
  const rect = sourceElement.getBoundingClientRect();
  const emoji = sourceElement.querySelector('.fruit-emoji');
  const face = sourceElement.querySelector('.fruit-face');
  preview.value = {
    left: rect.left, top: rect.top, width: rect.width, height: rect.height,
    offsetX: event.clientX - rect.left, offsetY: event.clientY - rect.top,
    fruitSize: getComputedStyle(emoji).fontSize, faceSize: getComputedStyle(face).fontSize,
  };
  emit('drag-change', { active: true, over: false });
}
function move(event) {
  if (!drag.move(event) || !preview.value) return;
  preview.value = { ...preview.value,
    left: event.clientX - preview.value.offsetX,
    top: event.clientY - preview.value.offsetY,
  };
  emit('drag-change', { active: true, over: pointInRect(event.clientX, event.clientY, targetRect()) });
}
function finish(event) {
  if (event.pointerId !== drag.active?.pointerId) return;
  const accepted = !props.disabled && drag.finish(event, targetRect());
  cancel();
  if (accepted) emit('drop', props.fruit);
}
function handleKey(event) { if (event.key === 'Escape') cancel(); }
function handleVisibility() { if (document.hidden) cancel(); }
function keyboardPick(event) {
  // Native keyboard / assistive-technology activation. A mouse/touch tap never commits.
  if (event.detail === 0 && !props.disabled) emit('keyboard-pick', props.fruit);
}
watch(() => props.disabled, (disabled) => { if (disabled) cancel(); });
onMounted(() => {
  window.addEventListener('blur', cancel);
  window.addEventListener('resize', cancel);
  window.addEventListener('keydown', handleKey);
  document.addEventListener('visibilitychange', handleVisibility);
});
onUnmounted(() => {
  cancel();
  window.removeEventListener('blur', cancel);
  window.removeEventListener('resize', cancel);
  window.removeEventListener('keydown', handleKey);
  document.removeEventListener('visibilitychange', handleVisibility);
});
</script>

<template>
  <button
    class="fruit-card" type="button" data-sfx-skip :disabled="disabled"
    :class="{ 'is-dragging': preview, 'is-picked': picked }"
    :aria-label="`${fruit.fruitName}、${fruit.feeling.replace(/\n/g, '')}。レジへ運ぶ`"
    :aria-pressed="picked"
    @pointerdown="start" @pointermove="move" @pointerup="finish"
    @pointercancel="cancel" @lostpointercapture="cancel"
    @contextmenu.prevent @dragstart.prevent @click="keyboardPick"
  >
    <span class="fruit-emoji">{{ fruit.emoji }}</span>
    <span class="fruit-face">•ᴗ•</span>
  </button>
  <Teleport to="body">
    <div v-if="preview" class="fruit-drag-preview" :style="previewStyle" aria-hidden="true">
      <span class="fruit-emoji">{{ fruit.emoji }}</span>
      <span class="fruit-face">•ᴗ•</span>
    </div>
  </Teleport>
</template>
