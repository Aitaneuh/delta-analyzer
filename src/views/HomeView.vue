<script setup lang="ts">
import SearchItem from '@/components/SearchItem.vue'
import GameList from '@/components/GameList.vue'
</script>

<template>
  <div class="m-auto container px-32 py-10">
    <SearchItem />

    <div class="border-b border-gray-800 my-10"></div>

    <GameList />
  </div>
</template>
