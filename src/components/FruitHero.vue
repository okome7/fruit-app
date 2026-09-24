<script setup>
import heroImage from '../assets/hero.png'
</script>

<template>
  <img
    class="fruit-hero"
    :src="heroImage"
    alt="男の子と女の子、気持ちを表すフルーツが並んだ、こころのくだものやさんのタイトル"
  />
</template>

<style scoped>
.fruit-hero {
  position: absolute;
  top: 3.7313%;
  left: 13.72998%;
  width: 70.02288%;
  height: 47.01493%;
  object-fit: cover;
  display: block;
}
</style>
