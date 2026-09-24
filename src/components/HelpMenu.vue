<script setup>
defineProps({ open: Boolean })
defineEmits(['toggle', 'guide', 'home'])
</script>
<template><div class="help-wrap"><button class="help-button" type="button" aria-label="オプション" @click="$emit('toggle')">?</button><div v-if="open" class="help-menu"><button type="button" @click="$emit('guide')">あそびかた</button><button type="button" @click="$emit('home')">ホームにもどる</button></div></div></template>
