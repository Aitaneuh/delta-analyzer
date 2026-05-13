<script setup lang="ts">
import GameItem from './GameItem.vue'
import { useGameStore } from '@/stores/gameStore'

const store = useGameStore()
</script>

<template>
  <div class="space-y-3">
    <!-- Header/Count -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-sm font-medium text-gray-400">
        Showing {{ store.filteredGames.length }} games
      </h2>
    </div>

    <!-- List -->
    <div v-if="store.filteredGames.length > 0" class="flex flex-col space-y-2">
      <GameItem v-for="game in store.filteredGames" :key="game.id" :game="game" />
    </div>

    <!-- Empty State -->
    <div v-else class="text-center py-20 border-2 border-dashed border-gray-800 rounded-xl">
      <p class="text-gray-500">No matches found for these filters.</p>
    </div>
  </div>
</template>
