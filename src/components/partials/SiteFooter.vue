<script setup lang="ts">
const links = [
  { to: '/legal', label: 'Legal notice' },
  { to: '/privacy', label: 'Privacy' },
  { to: '/terms', label: 'Terms' },
  { to: '/licenses', label: 'Open source' },
]
</script>

<template>
  <footer class="bg-zinc-950 border-t border-gray-800 px-5 py-4">
    <ul class="flex flex-wrap justify-center gap-x-6 gap-y-2 text-xs text-gray-500">
      <li v-for="link in links" :key="link.to">
        <router-link :to="link.to" class="hover:text-gray-300 transition">{{
          link.label
        }}</router-link>
      </li>
    </ul>
  </footer>
</template>
