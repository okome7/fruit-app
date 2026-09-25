<script setup>
const props = defineProps({
  fruit: { type: Object, required: true },
  selected: Boolean
});
const emit = defineEmits(['select']);

function onDragStart(event) {
  event.dataTransfer.setData('fruitId', props.fruit.id);
}
</script>

<template>
  <button
    type="button"
    class="fruit-card"
    :class="{ selected: props.selected }"
    draggable="true"
    :aria-label="`${props.fruit.feeling.replace('\\n', '')}のくだもの`"
    @click="emit('select', props.fruit)"
    @dragstart="onDragStart"
  >
    <span class="fruit-emoji">{{ props.fruit.emoji }}</span>
    <span class="fruit-face">•ᴗ•</span>
  </button>
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
