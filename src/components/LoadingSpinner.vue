<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: string
    size?: 'sm' | 'md'
    inverse?: boolean // For use on the red accent background
  }>(),
  { label: 'Loading', size: 'md', inverse: false },
)
</script>

<template>
  <span role="status" class="inline-flex items-center gap-2 text-gray-400">
    <!-- Spins only for visitors who haven't asked for reduced motion -->
    <span
      class="inline-block shrink-0 rounded-full border-2 motion-safe:animate-spin"
      :class="[
        size === 'sm' ? 'h-3.5 w-3.5' : 'h-5 w-5',
        inverse ? 'border-white/40 border-t-white' : 'border-gray-600 border-t-accent',
      ]"
      aria-hidden="true"
    ></span>
    <span class="text-sm" :class="{ 'sr-only': size === 'sm' }">{{ label }}</span>
  </span>
</template>
