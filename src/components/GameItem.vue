<script setup lang="ts">
import { computed } from 'vue'
import { getEcoOpeningName } from '@/data/ecoOpenings'
import type { GameSummary } from '@/services/pgnParser'

const props = defineProps<{
  game: GameSummary
}>()

const openingLabel = computed(() => {
  const { eco_code, opening_name } = props.game
  const ecoName = getEcoOpeningName(eco_code)
  return ecoName ? `${eco_code} ${ecoName}` : (opening_name ?? eco_code ?? 'Unknown opening')
})

// Helper to format the result colors
const getResultClass = (player: 'white' | 'black') => {
  if (!props.game.winner || props.game.winner === 'draw') return 'text-gray-400'
  return props.game.winner === player ? 'text-green-500 font-bold' : 'text-red-500'
}
</script>

<template>
  <router-link
    :to="{ name: 'game-detail', params: { id: game.id } }"
    class="grid grid-cols-2 md:grid-cols-12 gap-x-4 gap-y-3 items-center p-4 bg-[#1a1d21] border border-gray-800 rounded-lg hover:border-accent hover:bg-[#252a30] transition cursor-pointer group"
  >
    <!-- Metadata (Type & ECO) -->
    <div class="md:col-span-3 flex flex-col items-start min-w-0">
      <span class="text-[10px] uppercase font-bold text-gray-500 tracking-widest">{{
        game.game_type
      }}</span>
      <span
        class="max-w-full truncate text-xs font-mono text-accent py-0.5 rounded"
        :title="openingLabel"
        >{{ openingLabel }}</span
      >
    </div>

    <!-- Players Section -->
    <div class="col-span-2 order-last md:order-none md:col-span-6 flex items-center gap-2 sm:gap-4">
      <div class="text-right flex-1 min-w-0">
        <span class="block truncate text-sm" :class="getResultClass('white')">{{
          game.white_player
        }}</span>
        <span v-if="game.white_elo" class="text-[10px] text-gray-500">({{ game.white_elo }})</span>
      </div>

      <div
        class="bg-gray-800 px-3 py-1 rounded text-[10px] font-bold text-gray-400 group-hover:text-white transition"
      >
        VS
      </div>

      <div class="text-left flex-1 min-w-0">
        <span class="block truncate text-sm" :class="getResultClass('black')">{{
          game.black_player
        }}</span>
        <span v-if="game.black_elo" class="text-[10px] text-gray-500">({{ game.black_elo }})</span>
      </div>
    </div>

    <!-- Right Side Info (Result & Date) -->
    <div class="md:col-span-3 flex flex-col items-end text-right min-w-0">
      <span class="text-sm font-bold text-gray-200">{{ game.result }}</span>
      <div class="flex flex-wrap justify-end gap-x-2 text-[10px] text-gray-500">
        <span v-if="game.time_control">{{ game.time_control }}</span>
        <span v-if="game.played_date">{{ game.played_date }}</span>
      </div>
      <span
        v-if="game.termination_type"
        class="text-[9px] text-gray-600 italic mt-1 capitalize"
        >{{ game.termination_type }}</span
      >
    </div>
  </router-link>
</template>
