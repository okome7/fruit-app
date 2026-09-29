<script setup>
const props = defineProps({
  fruit: { type: Object, required: true }
});

const emit = defineEmits(['select']);

function onDragStart(event) {
  event.dataTransfer.setData('fruitId', props.fruit.id);
}
</script>

<template>
  <div class="fruit-card" :class="{ selected: props.selected }" draggable="true" @dragstart="onDragStart">
    <span class="fruit-emoji">{{ props.fruit.emoji }}</span>
    <span class="fruit-face">•ᴗ•</span>
  </button>
</template>
