<script setup>
const props = defineProps({
  fruit: { type: Object, required: true }
});

const emit = defineEmits(['select']);

function onDragStart(event) {
  event.dataTransfer.setData('fruitId', props.fruit.id);

  // ★ ここで選択イベントを発火させる ★
  emit('select', props.fruit);
}
</script>

<template>
  <div
    class="fruit-card"
    draggable="true"
    role="img"
    :aria-label="`${props.fruit.fruitName}、${props.fruit.feeling.replace('\\n', '')}のくだもの`"
    @dragstart="onDragStart"
  >
    <span class="fruit-emoji">{{ props.fruit.emoji }}</span>
    <span class="fruit-face">•ᴗ•</span>
  </div>
</template>
