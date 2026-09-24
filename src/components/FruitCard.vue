<script setup>
defineProps({ fruit: { type: Object, required: true }, selected: Boolean })
defineEmits(['select'])
</script>
<template><button class="fruit-card" :class="{ selected }" type="button" :aria-label="`${fruit.feeling.replace('\\n', '・')}の${fruit.emoji}`" @click="$emit('select', fruit)"><span class="fruit-emoji" aria-hidden="true">{{ fruit.emoji }}</span><span class="fruit-face" aria-hidden="true">•ᴗ•</span></button></template>
