<script setup lang="ts">
import { onMounted } from 'vue'
import NavBar from './components/partials/NavBar.vue'
import SiteFooter from './components/partials/SiteFooter.vue'
import { useAuthStore } from './stores/authStore'

const auth = useAuthStore()

onMounted(() => auth.fetchUser())
</script>

<template>
  <main class="flex min-h-dvh flex-col">
    <NavBar />
    <router-view class="flex-1" />
    <SiteFooter />
  </main>
</template>
