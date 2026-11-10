<script setup lang="ts">
defineProps<{ label: string; value: string; detail?: string }>()
</script>

<template>
  <div class="min-w-0 bg-[#1a1d21] rounded-lg border border-gray-800 px-4 py-3">
    <p class="text-xs text-gray-500 truncate">{{ label }}</p>
    <p class="mt-1 text-xl sm:text-2xl font-bold text-gray-100 truncate">{{ value }}</p>
    <p v-if="detail" class="mt-0.5 text-xs text-gray-400 truncate" :title="detail">{{ detail }}</p>
  </div>
</template>
