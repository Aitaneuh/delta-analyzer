<script setup lang="ts">
defineProps<{
  title: string
}>()

const LAST_UPDATED = 'November 8, 2026'
</script>

<template>
  <article class="legal mx-auto w-full max-w-3xl px-4 sm:px-6 py-8 text-sm leading-relaxed">
    <h1>{{ title }}</h1>
    <p class="updated">Last updated: {{ LAST_UPDATED }}</p>
    <slot />
  </article>
</template>

<style scoped>
.legal {
  color: #d1d5db;
  overflow-wrap: anywhere;
}

h1 {
  font-size: 1.75rem;
  font-weight: 300;
  color: #f3f4f6;
}

.updated {
  margin-bottom: 1.5rem;
  font-size: 0.75rem;
  color: #6b7280;
}

.legal :deep(h2) {
  margin: 1.75rem 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  color: #f3f4f6;
}

.legal :deep(p),
.legal :deep(ul) {
  margin-bottom: 0.75rem;
}

.legal :deep(ul) {
  padding-left: 1.25rem;
  list-style: disc;
}

.legal :deep(li) {
  margin-bottom: 0.25rem;
}

.legal :deep(a) {
  color: var(--accent-color);
  text-decoration: underline;
}
</style>
