<script setup>
import rightArrow from '../assets/right.png'
import leftArrow from '../assets/left.png'
defineProps({ direction: { type: String, default: 'next' } })
defineEmits(['click'])
</script>
<template><button class="nav-arrow" :class="direction" type="button" :aria-label="direction === 'next' ? 'つぎへ' : 'まえへ'" @click="$emit('click')"><img :src="direction === 'next' ? rightArrow : leftArrow" alt="" /></button></template>
