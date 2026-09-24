<script setup>
const props = defineProps({
  fruit: { type: Object, required: true },
  selected: Boolean
});

function onDragStart(event) {
  event.dataTransfer.setData('fruitId', props.fruit.id);
}
</script>

<template>
  <div class="fruit-card" :class="{ selected: props.selected }" draggable="true" @dragstart="onDragStart">
    <span class="fruit-emoji">{{ props.fruit.emoji }}</span>
    <span class="fruit-face">•ᴗ•</span>
  </div>
</template>

<style scoped>
.fruit-card {
  cursor: grab;
  border: none;
  background: transparent;
}
.fruit-card:active {
  cursor: grabbing;
}
</style>
