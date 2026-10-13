<script setup>
defineProps({ background: { type: String, default: '' }, label: { type: String, required: true } });
</script>
<template>
  <section
    class="screen-frame"
    :aria-label="label"
    :style="background ? { backgroundImage: `url(${JSON.stringify(background.replaceAll('(', '%28').replaceAll(')', '%29'))})` } : {}"
  >
    <slot />
  </section>
</template>
