<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  moves: string[]
  currentMoveIndex: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  goToMove: [index: number]
}>()

// Group moves into pairs (white, black)
const movePairs = computed(() => {
  const pairs: Array<{ moveNumber: number; white: string | null; black: string | null; whiteIndex: number; blackIndex: number | null }> = []

  for (let i = 0; i < props.moves.length; i += 2) {
    pairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: props.moves[i] || null,
      black: props.moves[i + 1] || null,
      whiteIndex: i + 1, // Index after this move (0-indexed becomes 1-indexed)
      blackIndex: i + 1 < props.moves.length ? i + 2 : null,
    })
  }

  return pairs
})

function handleMoveClick(index: number) {
  emit('goToMove', index)
}

function isActiveMoveIndex(index: number): boolean {
  return props.currentMoveIndex === index
}
</script>

<template>
  <div class="bg-[#1a1d21] rounded-lg border border-gray-800 h-full flex flex-col">
    <div class="border-b border-gray-800 px-4 py-3">
      <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wide">
        Moves
      </h3>
    </div>

    <div class="flex-1 overflow-y-auto p-4 space-y-1">
      <!-- Starting position -->
      <div class="flex items-center space-x-2 px-2 py-1.5 rounded cursor-pointer transition"
        :class="currentMoveIndex === 0 ? 'bg-accent text-white' : 'hover:bg-gray-800 text-gray-400'"
        @click="handleMoveClick(0)">
        <span class="text-xs font-mono">Start</span>
      </div>

      <!-- Move pairs -->
      <div v-for="pair in movePairs" :key="pair.moveNumber" class="flex items-start space-x-2 text-sm">
        <span class="text-gray-600 font-mono min-w-[2rem] text-right">
          {{ pair.moveNumber }}.
        </span>

        <div class="flex-1 flex space-x-1">
          <!-- White move -->
          <button v-if="pair.white" class="flex-1 text-left px-2 py-1 rounded font-mono text-xs transition" :class="isActiveMoveIndex(pair.whiteIndex)
            ? 'bg-accent text-white font-semibold'
            : 'text-gray-300 hover:bg-gray-800'" @click="handleMoveClick(pair.whiteIndex)">
            {{ pair.white }}
          </button>

          <!-- Black move -->
          <button v-if="pair.black" class="flex-1 text-left px-2 py-1 rounded font-mono text-xs transition" :class="isActiveMoveIndex(pair.blackIndex!)
            ? 'bg-accent text-white font-semibold'
            : 'text-gray-300 hover:bg-gray-800'" @click="handleMoveClick(pair.blackIndex!)">
            {{ pair.black }}
          </button>
        </div>
      </div>

      <div v-if="moves.length === 0" class="text-center text-gray-600 py-8 text-sm">
        No moves recorded
      </div>
    </div>
  </div>
</template>