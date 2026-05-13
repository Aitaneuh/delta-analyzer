<script setup lang="ts">
import type { ChessGame } from '@/types/game'
import { useRouter } from 'vue-router'

const props = defineProps<{
  game: ChessGame
}>()

const router = useRouter()

const goToGame = () => {
  router.push({ name: 'game-detail', params: { id: props.game.id } })
}

// Helper to format the result colors
const getResultClass = (player: 'white' | 'black') => {
  if (props.game.result === '1/2-1/2') return 'text-gray-400'
  if (player === 'white') {
    return props.game.result === '1-0' ? 'text-green-500 font-bold' : 'text-red-500'
  } else {
    return props.game.result === '0-1' ? 'text-green-500 font-bold' : 'text-red-500'
  }
}
</script>

<template>
  <div
    @click="goToGame"
    class="grid grid-cols-12 gap-4 items-center p-4 bg-[#1a1d21] border border-gray-800 rounded-lg hover:border-accent hover:bg-[#252a30] transition cursor-pointer group"
  >
    <!-- Metadata (Type & ECO) -->
    <div class="col-span-2 flex flex-col items-start">
      <span class="text-[10px] uppercase font-bold text-gray-500 tracking-widest">{{
        game.game_type
      }}</span>
      <span class="text-xs font-mono text-accent bg-accent/10 py-0.5 rounded">{{
        game.opening
      }}</span>
    </div>

    <!-- Players Section -->
    <div class="col-span-6 flex items-center justify-center space-x-4">
      <div class="text-right flex-1">
        <span class="block text-sm" :class="getResultClass('white')">{{ game.white_player }}</span>
        <span class="text-[10px] text-gray-500">({{ game.white_elo }})</span>
      </div>

      <div
        class="bg-gray-800 px-3 py-1 rounded text-[10px] font-bold text-gray-400 group-hover:text-white transition"
      >
        VS
      </div>

      <div class="text-left flex-1">
        <span class="block text-sm" :class="getResultClass('black')">{{ game.black_player }}</span>
        <span class="text-[10px] text-gray-500">({{ game.black_elo }})</span>
      </div>
    </div>

    <!-- Right Side Info (Result & Date) -->
    <div class="col-span-4 flex flex-col items-end">
      <span class="text-sm font-bold text-gray-200">{{ game.result }}</span>
      <div class="flex items-center space-x-2 text-[10px] text-gray-500">
        <span>{{ game.time_control }}</span>
        <span>•</span>
        <span>{{ game.played_date }}</span>
      </div>
      <span class="text-[9px] text-gray-600 italic mt-1 capitalize">{{ game.termination }}</span>
    </div>
  </div>
</template>
