<script setup>
defineProps({ muted: Boolean });
</script>

<template>
  <svg class="sound-icon" viewBox="0 0 24 24" width="24" height="24"
    fill="none" stroke="currentColor" stroke-width="1.8"
    stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true" focusable="false">
    <path d="M11 5 6 9H3v6h3l5 4V5Z" />
    <path v-if="muted" class="sound-muted-mark" d="m3 3 18 18" />
    <path v-else class="sound-waves" d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14" />
  </svg>
</template>
