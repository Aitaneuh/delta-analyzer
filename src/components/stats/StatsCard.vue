<script setup lang="ts">
defineProps<{ title: string; note?: string }>()
</script>

<template>
  <section class="min-w-0 bg-[#1a1d21] rounded-lg border border-gray-800 p-4 sm:p-5">
    <h2 class="text-sm font-semibold text-gray-400 uppercase tracking-wide">{{ title }}</h2>
    <p v-if="note" class="mt-1 text-xs text-gray-500">{{ note }}</p>
    <div class="mt-4">
      <slot />
    </div>
  </section>
</template>
