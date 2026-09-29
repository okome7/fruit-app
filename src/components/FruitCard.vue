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
    class="fruit-card"
    :class="{ selected: props.selected }"
    draggable="true"
    @dragstart="onDragStart"
    @click="emit('select', props.fruit)"
    type="button"
  >
    <span class="fruit-emoji">{{ props.fruit.emoji }}</span>
    <span class="fruit-face">•ᴗ•</span>
  </button>
</template>
