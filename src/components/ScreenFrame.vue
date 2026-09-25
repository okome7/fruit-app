<script setup>
defineProps({ background: { type: String, default: '' }, label: { type: String, required: true } });
</script>
<template>
  <section
    class="screen-frame"
    :aria-label="label"
    :style="background ? { backgroundImage: `url(${background})` } : {}"
  >
    <slot />
  </section>
</template>
