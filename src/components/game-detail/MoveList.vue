<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { GRADE_SYMBOLS, type MoveReport } from '@/services/gameAnalysis'

interface Props {
  moves: string[]
  currentMoveIndex: number
  reports?: MoveReport[]
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

/** The "??" style mark for the move that produced this position, if any. */
function gradeSymbol(index: number): string {
  const grade = props.reports?.[index - 1]?.grade
  return grade ? GRADE_SYMBOLS[grade] : ''
}

function gradeClass(index: number): string {
  if (isActiveMoveIndex(index)) return 'text-white'
  const grade = props.reports?.[index - 1]?.grade
  if (grade === 'blunder') return 'text-[#f0524f]'
  if (grade === 'mistake') return 'text-[#ec835a]'
  return 'text-[#fab219]'
}

function isActiveMoveIndex(index: number): boolean {
  return props.currentMoveIndex === index
}

// Keep the current move visible. Only the list scrolls, never the page.
const scroller = ref<HTMLElement | null>(null)

watch(
  () => props.currentMoveIndex,
  async () => {
    await nextTick()
    const list = scroller.value
    const active = list?.querySelector<HTMLElement>('[data-active="true"]')
    if (list && active) {
      list.scrollTop = active.offsetTop - list.clientHeight / 2 + active.offsetHeight / 2
    }
  },
)
</script>

<template>
  <div class="bg-[#1a1d21] rounded-lg border border-gray-800 h-full flex flex-col">
    <div class="border-b border-gray-800 px-4 py-3">
      <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wide">
        Moves
      </h3>
    </div>

    <div ref="scroller" class="relative flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
      <!-- Starting position -->
      <button type="button" class="flex w-full items-center space-x-2 px-2 py-1.5 rounded cursor-pointer transition"
        :class="currentMoveIndex === 0 ? 'bg-accent text-white' : 'hover:bg-gray-800 text-gray-400'"
        :data-active="currentMoveIndex === 0"
        @click="handleMoveClick(0)">
        <span class="text-xs font-mono">Start</span>
      </button>

      <!-- Move pairs -->
      <div v-for="pair in movePairs" :key="pair.moveNumber" class="flex items-start space-x-2 text-sm">
        <span class="text-gray-600 font-mono min-w-[2rem] text-right">
          {{ pair.moveNumber }}.
        </span>

        <div class="flex-1 min-w-0 grid grid-cols-2 gap-1">
          <!-- White move -->
          <button v-if="pair.white" class="flex-1 text-left px-2 py-1 rounded font-mono text-xs transition cursor-pointer" :class="isActiveMoveIndex(pair.whiteIndex)
            ? 'bg-accent text-white font-semibold'
            : 'text-gray-300 hover:bg-gray-800'" :data-active="isActiveMoveIndex(pair.whiteIndex)" @click="handleMoveClick(pair.whiteIndex)">
            {{ pair.white }}<span class="font-bold" :class="gradeClass(pair.whiteIndex)">{{ gradeSymbol(pair.whiteIndex) }}</span>
          </button>

          <!-- Black move -->
          <button v-if="pair.black" class="flex-1 text-left px-2 py-1 rounded font-mono text-xs transition cursor-pointer" :class="isActiveMoveIndex(pair.blackIndex!)
            ? 'bg-accent text-white font-semibold'
            : 'text-gray-300 hover:bg-gray-800'" :data-active="isActiveMoveIndex(pair.blackIndex!)" @click="handleMoveClick(pair.blackIndex!)">
            {{ pair.black }}<span class="font-bold" :class="gradeClass(pair.blackIndex!)">{{ gradeSymbol(pair.blackIndex!) }}</span>
          </button>
        </div>
      </div>

      <div v-if="moves.length === 0" class="text-center text-gray-600 py-8 text-sm">
        No moves recorded
      </div>
    </div>
  </div>
</template>