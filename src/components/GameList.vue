<script setup lang="ts">
import { computed, onMounted } from 'vue'
import GameItem from './GameItem.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import { useGameStore } from '@/stores/gameStore'

const store = useGameStore()

// Before the first results arrive there is nothing to dim, so placeholders hold the space
const firstLoad = computed(() => store.listLoading && store.games.length === 0)

onMounted(() => store.fetchGames())
</script>

<template>
  <div class="space-y-3">
    <!-- Header/Count -->
    <div class="flex justify-between items-center mb-4 min-h-5">
      <LoadingSpinner v-if="firstLoad" label="Loading games…" />
      <h2 v-else class="text-sm font-medium text-gray-400">Showing {{ store.totalGames }} games</h2>
      <LoadingSpinner v-if="store.listLoading && !firstLoad" size="sm" label="Updating results" />
    </div>

    <p v-if="store.listError" role="alert" class="text-sm text-red-400">{{ store.listError }}</p>

    <!-- Placeholders -->
    <div v-else-if="firstLoad" class="flex flex-col space-y-2" aria-hidden="true">
      <div
        v-for="index in 5"
        :key="index"
        class="h-[74px] rounded-lg border border-gray-800 bg-[#1a1d21] motion-safe:animate-pulse"
      ></div>
    </div>

    <!-- List. The previous results stay, dimmed, while new ones load. -->
    <div
      v-else-if="store.games.length > 0"
      class="flex flex-col space-y-2 transition-opacity"
      :class="{ 'opacity-50 pointer-events-none': store.listLoading }"
      :aria-busy="store.listLoading"
    >
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
