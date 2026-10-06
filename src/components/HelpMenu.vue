<script setup>
import helpIcon from '../assets/screens/help.webp';
defineProps({ open: Boolean })
defineEmits(['toggle', 'guide', 'home'])
</script>
<template><div class="help-wrap"><button class="help-button" type="button" aria-label="オプション" :aria-expanded="open" @click="$emit('toggle')"><img :src="helpIcon" alt="" /></button><div v-if="open" class="help-menu"><button type="button" @click="$emit('guide')">あそびかた</button><button type="button" @click="$emit('home', $event)">ホームにもどる</button></div></div></template>
