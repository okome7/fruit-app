<script setup>
import { onMounted, ref } from 'vue';
import heroImage from '../assets/home-logo.png';

const props = defineProps({
  fruit: {
    type: Object,
    required: true
  }
});

const feelingLabel = ref(null);

onMounted(() => {
  const el = feelingLabel.value;
  if (!el) return;

  // 改行ありはそのまま
  if (props.fruit.feeling.includes('\n')) return;

  const maxWidth = parseFloat(getComputedStyle(el).width);

  if (el.scrollWidth > maxWidth) {
    el.style.fontSize = 'calc(1.0 * var(--scene-unit))';
  }
});
</script>

<template>
  <span
    ref="feelingLabel"
    :class="{
      'fruit-feeling': !props.fruit.feeling.includes('\n'),
      'fruit-feeling--multiline': props.fruit.feeling.includes('\n')
    }"
  >
    {{ props.fruit.feeling }}
  </span>

  <img
    class="fruit-hero"
    :src="heroImage"
    alt="男の子と女の子、気持ちを表すフルーツが並んだ、おしゃべりきもちのくだものやさんのタイトル"
  />
</template>

<style>
.fruit-hero {
  position: absolute;
  top: 3.7313%;
  left: 15.67506%;
  width: 68.64989%;
  height: 46.26866%;
  display: flex; /* ← 追加 */
  flex-wrap: wrap; /* ← 追加 */
  justify-content: center; /* ← 追加：中央揃え */
  align-items: flex-start; /* ← 追加：上揃え */
}

.fruit-feeling {
  font-size: 0.9rem !important;
  font-weight: bold;
  line-height: 1.3;
  display: block;
  text-align: center;
  white-space: nowrap;
}
</style>
