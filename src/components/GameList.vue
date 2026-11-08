<script setup lang="ts">
import { onMounted } from 'vue'
import GameItem from './GameItem.vue'
import { useGameStore } from '@/stores/gameStore'

const store = useGameStore()

onMounted(() => store.fetchGames())
</script>

<template>
  <div class="space-y-3">
    <!-- Header/Count -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-sm font-medium text-gray-400">Showing {{ store.totalGames }} games</h2>
    </div>

    <p v-if="store.listError" role="alert" class="text-sm text-red-400">{{ store.listError }}</p>

    <!-- List -->
    <div v-else-if="store.games.length > 0" class="flex flex-col space-y-2">
      <GameItem v-for="game in store.games" :key="game.id" :game="game" />
    </div>

    <!-- Empty State -->
    <div
      v-else-if="!store.listLoading"
      class="text-center py-20 border-2 border-dashed border-gray-800 rounded-xl"
    >
      <p class="text-gray-500">No games found.</p>
    </div>

    <!-- Pagination -->
    <nav
      v-if="store.totalPages > 1"
      aria-label="Game list pages"
      class="flex items-center justify-center gap-4 pt-4 text-sm text-gray-400"
    >
      <button
        type="button"
        :disabled="store.page <= 1"
        class="cursor-pointer disabled:cursor-not-allowed rounded bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-700 px-4 py-2 transition"
        @click="store.goToPage(store.page - 1)"
      >
        Previous
      </button>
      <span>Page {{ store.page }} of {{ store.totalPages }}</span>
      <button
        type="button"
        :disabled="store.page >= store.totalPages"
        class="cursor-pointer disabled:cursor-not-allowed rounded bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-700 px-4 py-2 transition"
        @click="store.goToPage(store.page + 1)"
      >
        Next
      </button>
    </nav>
  </div>
</template>
