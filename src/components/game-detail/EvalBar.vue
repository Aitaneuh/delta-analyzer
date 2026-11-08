<script setup lang="ts">
defineProps<{
  whitePercent: number
  label: string
}>()
</script>

<template>
  <div class="flex w-10 sm:w-12 shrink-0 flex-col items-center gap-1">
    <div
      aria-hidden="true"
      class="relative w-3 sm:w-5 flex-1 overflow-hidden rounded bg-[#2b2f36] border border-gray-800"
    >
      <div
        class="absolute inset-x-0 bottom-0 bg-gray-100 transition-[height] duration-200"
        :style="{ height: `${whitePercent}%` }"
      ></div>
      <div class="absolute inset-x-0 top-1/2 h-px bg-gray-500"></div>
    </div>
    <span
      class="whitespace-nowrap text-[10px] sm:text-xs font-bold text-gray-200"
      :aria-label="`Evaluation ${label}`"
      data-testid="eval-score"
      >{{ label }}</span
    >
  </div>
</template>
