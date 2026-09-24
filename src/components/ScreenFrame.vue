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

<style scoped>
.screen-frame {
  position: relative;
  background-size: cover;
  background-position: center;

  /* ⭐ これを追加する ⭐ */
  pointer-events: none;
}

.screen-frame > * {
  /* 子要素（フルーツや drop-zone）はイベントを受け取れるようにする */
  pointer-events: auto;
}
</style>
