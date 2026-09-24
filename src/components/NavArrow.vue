<script setup>
import arrow from '../assets/screens/arrow-guide.png'
defineProps({ direction: { type: String, default: 'next' } })
defineEmits(['click'])
</script>
<template><button class="nav-arrow" :class="direction" type="button" :aria-label="direction === 'next' ? 'つぎへ' : 'まえへ'" @click="$emit('click')"><img :src="arrow" alt="" /></button></template>
