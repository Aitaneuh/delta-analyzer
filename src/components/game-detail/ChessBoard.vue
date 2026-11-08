<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { Chessground } from 'chessground'
import type { Api } from 'chessground/api'
import type { Color, Key } from 'chessground/types'

// Official Lichess Layout & Theme Asset Streams
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.brown.css'     // Classic brown/wood style theme
import 'chessground/assets/chessground.cburnett.css'  // Standard crisp piece set

interface Props {
  fen?: string
  orientation?: 'white' | 'black'
  interactive?: boolean
  lastMove?: string[] | null
  check?: Color | false
  arrow?: string | null // UCI move to draw, e.g. "e2e4"
}

const props = withDefaults(defineProps<Props>(), {
  fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  orientation: 'white',
  interactive: false,
  lastMove: null,
  check: false,
  arrow: null,
})

const boardContainer = ref<HTMLDivElement | null>(null)
let boardApi: Api | null = null

function showArrow() {
  const move = props.arrow
  boardApi?.setAutoShapes(
    move
      ? [{ orig: move.slice(0, 2) as Key, dest: move.slice(2, 4) as Key, brush: 'blue' }]
      : [],
  )
}

onMounted(() => {
  if (boardContainer.value) {
    boardApi = Chessground(boardContainer.value, {
      fen: props.fen,
      lastMove: (props.lastMove as Key[] | null) ?? undefined,
      check: props.check,
      orientation: props.orientation,
      viewOnly: false, // Must be false so the board registers right-clicks for shapes
      movable: {
        free: false,
        color: props.interactive ? 'both' : undefined, // Controls piece dragging based on prop
        dests: undefined
      },
      drawable: {
        enabled: true,
        visible: true,
        eraseOnClick: true, // Left click clears everything, exactly like Lichess
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
    showArrow()
  }
})

watch(() => props.arrow, showArrow)

watch(() => props.fen, (newFen) => {
  if (boardApi && newFen) {
    boardApi.set({
      fen: newFen,
      lastMove: (props.lastMove as Key[] | null) ?? undefined,
      check: props.check,
    })
  }
})

onBeforeUnmount(() => {
  boardApi?.destroy()
  boardApi = null
})

watch(() => props.orientation, (newOrientation) => {
  if (boardApi) {
    boardApi.set({ orientation: newOrientation })
  }
})

watch(() => props.interactive, (isNewInteractive) => {
  if (boardApi) {
    boardApi.set({
      movable: { color: isNewInteractive ? 'both' : undefined }
    })
  }
})
</script>

<template>
  <div class="bg-[#1a1d21] rounded-lg overflow-hidden border border-gray-800 p-2">
    <div ref="boardContainer" class="chessboard-container blue" @contextmenu.prevent
      style="width: 100%; aspect-ratio: 1/1;"></div>
  </div>
</template>

<style scoped>
/* Ensure the grid wrap fills out the parent dimensions fluidly */
.chessboard-container :deep(.cg-wrap) {
  width: 100%;
  height: 100%;
}

.chessboard-container :deep(cg-board) {
  background-color: #ff6666;
}
</style>