<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'
import GameHeader from '../components/game-detail/GameHeader.vue'
import ChessBoard from '../components/game-detail/ChessBoard.vue'
import MoveList from '../components/game-detail/MoveList.vue'
import GameInfo from '../components/game-detail/GameInfo.vue'
import GameControls from '../components/game-detail/GameControls.vue'
import EvalBar from '../components/game-detail/EvalBar.vue'
import AnalysisPanel from '../components/game-detail/AnalysisPanel.vue'
import { formatEval, whiteWinPercent } from '../services/gameAnalysis'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const gameId = computed(() => route.params.id as string)

watch(
  gameId,
  async (id) => {
    if (!id) return
    try {
      await gameStore.fetchGame(id)

      // Set by the import page's "Request a computer analysis" checkbox
      if (route.query.analyze) {
        router.replace({ query: {} })
        gameStore.startAnalysis()
      }
    } catch (error) {
      console.error('Failed to load game:', error)
      // Replace so the browser's Back button doesn't return to the broken URL
      router.replace({ name: 'not-found' })
    }
  },
  { immediate: true },
)

const handleGoToMove = (index: number) => {
  gameStore.goToMove(index)
}

const KEY_ACTIONS: Record<string, () => void> = {
  ArrowLeft: gameStore.prevMove,
  ArrowRight: gameStore.nextMove,
  ArrowUp: gameStore.goToStart,
  ArrowDown: gameStore.goToEnd,
}

function handleKeydown(event: KeyboardEvent) {
  const action = KEY_ACTIONS[event.key]
  if (!action || !gameStore.currentGame) return
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return

  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, select, [contenteditable]')) return

  // Stops the up and down keys from also scrolling the page
  event.preventDefault()
  action()
}

onMounted(() => window.addEventListener('keydown', handleKeydown))

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  gameStore.cancelAnalysis()
})
</script>

<template>
  <div class="bg-[#0d0f12]">
    <!-- Loading State -->
    <div v-if="gameStore.loading" class="flex items-center justify-center min-h-[60dvh]">
      <div class="text-center">
        <div
          class="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"
        ></div>
        <p class="text-gray-400">Loading game...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="gameStore.error" class="flex items-center justify-center min-h-[60dvh]">
      <div class="text-center">
        <p class="text-red-500 mb-4">{{ gameStore.error }}</p>
        <router-link to="/" class="text-accent hover:text-accent-dark"> Go back home </router-link>
      </div>
    </div>

    <!-- Game View -->
    <div v-else-if="gameStore.currentGame && gameStore.gameMetadata">
      <!-- Header -->
      <GameHeader
        :white="gameStore.gameMetadata.white"
        :black="gameStore.gameMetadata.black"
        :white-elo="gameStore.gameMetadata.whiteElo"
        :black-elo="gameStore.gameMetadata.blackElo"
        :eco-code="gameStore.gameMetadata.ecoCode"
        :date="gameStore.gameMetadata.date"
        :winner="gameStore.gameMetadata.winner"
      />

      <!-- Main Content -->
      <div>
        <div class="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_24rem] gap-6 items-start">
            <!-- Left Column: Chessboard + Controls. Capped so the board and controls fit on screen. -->
            <div class="min-w-0 flex flex-col gap-2">
              <div class="min-w-0 w-full mx-auto max-w-[max(20rem,calc(100dvh-16rem))]">
                <div class="flex items-stretch gap-1.5 sm:gap-2">
                  <EvalBar
                    v-if="gameStore.currentEval"
                    :white-percent="whiteWinPercent(gameStore.currentEval.cp)"
                    :label="formatEval(gameStore.currentEval)"
                  />
                  <div class="flex-1 min-w-0">
                    <ChessBoard
                      :fen="gameStore.currentFen || gameStore.currentGame.initial_fen"
                      orientation="white"
                      :interactive="false"
                      :last-move="gameStore.currentPosition?.lastMove"
                      :check="gameStore.currentPosition?.check"
                      :arrow="gameStore.currentEval?.best"
                    />
                  </div>
                </div>

                <GameControls
                  :is-at-start="gameStore.isAtStart"
                  :is-at-end="gameStore.isAtEnd"
                  @go-to-start="gameStore.goToStart"
                  @prev-move="gameStore.prevMove"
                  @next-move="gameStore.nextMove"
                  @go-to-end="gameStore.goToEnd"
                />
              </div>

              <AnalysisPanel />
            </div>

            <!-- Right Column: Move List + Game Info -->
            <div class="min-w-0 flex flex-col gap-6">
              <div class="h-72 lg:h-[26rem]">
                <MoveList
                  :moves="gameStore.currentGame.moves"
                  :current-move-index="gameStore.currentMoveIndex"
                  :reports="gameStore.analysisReport?.moves"
                  @go-to-move="handleGoToMove"
                />
              </div>

              <GameInfo
                :white="gameStore.gameMetadata.white"
                :black="gameStore.gameMetadata.black"
                :white-elo="gameStore.gameMetadata.whiteElo"
                :black-elo="gameStore.gameMetadata.blackElo"
                :result="gameStore.gameMetadata.result"
                :winner="gameStore.gameMetadata.winner"
                :termination="gameStore.gameMetadata.termination"
                :time-control="gameStore.gameMetadata.timeControl"
                :game-type="gameStore.gameMetadata.gameType"
                :opening="gameStore.gameMetadata.opening"
                :eco-code="gameStore.gameMetadata.ecoCode"
                :source="gameStore.gameMetadata.source"
                :link="gameStore.gameMetadata.link"
                :date="gameStore.gameMetadata.date"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
