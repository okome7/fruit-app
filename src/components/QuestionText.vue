<script setup>
import { computed } from 'vue';
import { questionParts } from '../lib/questions.js';

const props = defineProps({ text: { type: String, default: '' } });
const parts = computed(() => questionParts(props.text));
</script>

<template>
  <template v-for="(part, index) in parts" :key="index"><ruby v-if="part.reading" class="katakana-ruby">{{ part.text }}<rt>{{ part.reading }}</rt></ruby><template v-else>{{ part.text }}</template></template>
</template>
