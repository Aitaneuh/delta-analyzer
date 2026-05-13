<script setup lang="ts">
import Navbar from './components/partials/Navbar.vue' with { type: 'vue' };

</script>

<template>
  <main>
    <Navbar />
    <router-view />
  </main>
</template>

<style scoped></style>
