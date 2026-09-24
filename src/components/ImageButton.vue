<script setup>
defineProps({
  src: { type: String, required: true },
  alt: { type: String, required: true }
})

defineEmits(['click'])
</script>

<template>
  <button class="image-button" type="button" @click="$emit('click')">
    <img :src="src" :alt="alt" />
  </button>
</template>

<style scoped>
.image-button {
  appearance: none;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
  display: block;
}

.image-button img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.image-button:focus-visible {
  outline: 3px solid #8a4b16;
  outline-offset: 4px;
  border-radius: 34px;
}

.image-button:active {
  transform: translateY(1px);
}
</style>
