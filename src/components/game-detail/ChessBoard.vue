<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'
import 'chessground/assets/chessground.cburnett.css'

interface Props {
  fen?: string
  orientation?: 'white' | 'black'
  interactive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  orientation: 'white',
  interactive: false,
})

const boardContainer = ref<HTMLDivElement | null>(null)
let boardApi: Api | null = null

onMounted(() => {
  if (boardContainer.value) {
    boardApi = Chessground(boardContainer.value, {
      fen: props.fen,
      orientation: props.orientation,
      viewOnly: !props.interactive,
      movable: {
        free: false,
        color: undefined,
      },
      drawable: {
        enabled: false,
      },
      highlight: {
        lastMove: true,
        check: true,
      },
      animation: {
        enabled: true,
        duration: 200,
      },
    })
  }
})

watch(() => props.fen, (newFen) => {
  if (boardApi && newFen) {
    boardApi.set({
      fen: newFen,
    })
  }
})

watch(() => props.orientation, (newOrientation) => {
  if (boardApi) {
    boardApi.set({
      orientation: newOrientation,
    })
  }
})
</script>

<template>
  <div class="bg-[#1a1d21] rounded-lg overflow-hidden border border-gray-800">
    <div ref="boardContainer" class="chessboard-container" style="width: 100%; aspect-ratio: 1/1;"></div>
  </div>
</template>

<style scoped>
.chessboard-container :deep(.cg-wrap) {
  width: 100%;
  height: 100%;
}

/* Custom styling to match dark theme */
.chessboard-container :deep(cg-board) {
  background-color: #ff4848;
}
</style>