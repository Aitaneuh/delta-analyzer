<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '../stores/gameStore'
import GameHeader from '../components/game-detail/GameHeader.vue'
import ChessBoard from '../components/game-detail/ChessBoard.vue'
import MoveList from '../components/game-detail/MoveList.vue'
import GameInfo from '../components/game-detail/GameInfo.vue'
import GameControls from '../components/game-detail/GameControls.vue'

const route = useRoute()
const router = useRouter()
const gameStore = useGameStore()

const gameId = computed(() => route.params.id as string)

onMounted(async () => {
  if (gameId.value) {
    try {
      await gameStore.fetchGame(gameId.value)
    } catch (error) {
      console.error('Failed to load game:', error)
      // Redirect to 404 if game not found
      router.push({ name: 'not-found' })
    }
  }
})

const handleGoToMove = (index: number) => {
  gameStore.goToMove(index)
}
</script>

<template>
  <div class="min-h-screen bg-[#0d0f12]">
    <!-- Loading State -->
    <div v-if="gameStore.loading" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
        <p class="text-gray-400">Loading game...</p>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="gameStore.error" class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <p class="text-red-500 mb-4">{{ gameStore.error }}</p>
        <router-link to="/" class="text-accent hover:text-accent-dark">
          Go back home
        </router-link>
      </div>
    </div>

    <!-- Game View -->
    <div v-else-if="gameStore.currentGame && gameStore.gameMetadata" class="flex flex-col h-screen">
      <!-- Header -->
      <GameHeader :white="gameStore.gameMetadata.white" :black="gameStore.gameMetadata.black"
        :white-elo="gameStore.gameMetadata.whiteElo" :black-elo="gameStore.gameMetadata.blackElo"
        :eco-code="gameStore.gameMetadata.ecoCode" :date="gameStore.gameMetadata.date"
        :winner="gameStore.gameMetadata.winner" />

      <!-- Main Content -->
      <div class="flex-1 overflow-hidden">
        <div class="max-w-7xl mx-auto px-6 py-6 h-full">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            <!-- Left Column: Chessboard + Controls -->
            <div class="lg:col-span-2 flex flex-col space-y-4">
              <ChessBoard :fen="gameStore.currentFen || gameStore.currentGame.initial_fen" orientation="white"
                :interactive="false" />

              <GameControls :is-at-start="gameStore.isAtStart" :is-at-end="gameStore.isAtEnd"
                @go-to-start="gameStore.goToStart" @prev-move="gameStore.prevMove" @next-move="gameStore.nextMove"
                @go-to-end="gameStore.goToEnd" />
            </div>

            <!-- Right Column: Move List + Game Info -->
            <div class="lg:col-span-1 flex flex-col space-y-6 max-h-[calc(100vh-8rem)] lg:max-h-full">
              <div class="flex-1 min-h-0">
                <MoveList :moves="gameStore.currentGame.moves" :current-move-index="gameStore.currentMoveIndex"
                  @go-to-move="handleGoToMove" />
              </div>

              <GameInfo :white="gameStore.gameMetadata.white" :black="gameStore.gameMetadata.black"
                :white-elo="gameStore.gameMetadata.whiteElo" :black-elo="gameStore.gameMetadata.blackElo"
                :result="gameStore.gameMetadata.result" :winner="gameStore.gameMetadata.winner"
                :termination="gameStore.gameMetadata.termination" :time-control="gameStore.gameMetadata.timeControl"
                :game-type="gameStore.gameMetadata.gameType" :opening="gameStore.gameMetadata.opening"
                :eco-code="gameStore.gameMetadata.ecoCode" :source="gameStore.gameMetadata.source"
                :link="gameStore.gameMetadata.link" :date="gameStore.gameMetadata.date" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>