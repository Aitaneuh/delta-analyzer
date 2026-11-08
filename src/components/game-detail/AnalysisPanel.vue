<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useGameStore } from '@/stores/gameStore'
import { signInUrl, useAuthStore } from '@/stores/authStore'
import { GRADE_SYMBOLS, formatEval } from '@/services/gameAnalysis'
import EvalGraph from './EvalGraph.vue'

const store = useGameStore()
const auth = useAuthStore()
const route = useRoute()
const signInHref = computed(() => signInUrl(route.fullPath))

const game = computed(() => store.currentGame)
const totalPositions = computed(() => (game.value?.moves_count ?? 0) + 1)
const progress = computed(() => (store.currentEvals.length / totalPositions.value) * 100)

const currentGrade = computed(() => {
  const index = store.currentMoveIndex - 1
  const grade = store.analysisReport?.moves[index]?.grade
  if (!grade || !game.value) return null

  return {
    symbol: GRADE_SYMBOLS[grade],
    name: grade,
    move: game.value.moves[index],
    best: store.currentEvals[index]?.bestSan ?? null,
  }
})

const statRows = computed(() => {
  const report = store.analysisReport
  if (!report) return []
  const { white, black } = report

  return [
    {
      label: 'Accuracy',
      white: `${white.accuracy.toFixed(1)}%`,
      black: `${black.accuracy.toFixed(1)}%`,
    },
    {
      label: 'Avg. centipawn loss',
      white: Math.round(white.averageCpLoss),
      black: Math.round(black.averageCpLoss),
    },
    { label: 'Inaccuracies (?!)', white: white.inaccuracies, black: black.inaccuracies },
    { label: 'Mistakes (?)', white: white.mistakes, black: black.mistakes },
    { label: 'Blunders (??)', white: white.blunders, black: black.blunders },
  ]
})
</script>

<template>
  <section v-if="game" class="bg-[#1a1d21] rounded-lg border border-gray-800 p-4 sm:p-6">
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 mb-4">
      <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wide">Computer Analysis</h3>
      <div v-if="game.analysis" class="flex flex-wrap items-center gap-x-4 gap-y-1">
        <a
          href="https://stockfishchess.org"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-gray-500 hover:text-gray-300 transition"
        >
          {{ game.analysis.engine }} · depth {{ game.analysis.depth }}
        </a>
        <button
          type="button"
          class="cursor-pointer rounded bg-gray-800 hover:bg-gray-700 px-3 py-1 text-xs font-semibold text-gray-200 transition"
          :aria-pressed="store.analysisHidden"
          @click="store.analysisHidden = !store.analysisHidden"
        >
          {{ store.analysisHidden ? 'Show analysis' : 'Hide analysis' }}
        </button>
      </div>
    </div>

    <p v-if="!store.canAnalyze" class="text-sm text-gray-500">
      Computer analysis is available for standard chess games with at least one move.
    </p>

    <!-- Not analyzed yet -->
    <div
      v-else-if="!game.analysis && !store.isAnalyzing"
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
    >
      <p class="text-sm text-gray-400">
        Stockfish checks every position in your browser, then the result is saved with this game for
        everyone to see.
      </p>
      <button
        v-if="auth.user"
        type="button"
        class="shrink-0 cursor-pointer bg-accent hover:bg-accent-dark text-white font-bold py-2 px-6 rounded transition text-sm"
        @click="store.startAnalysis()"
      >
        Analyze game
      </button>
      <a
        v-else
        :href="signInHref"
        class="shrink-0 text-center bg-accent hover:bg-accent-dark text-white font-bold py-2 px-6 rounded transition text-sm"
      >
        Sign in to analyze
      </a>
    </div>

    <!-- Running -->
    <div v-if="store.isAnalyzing" class="mb-4">
      <div class="flex items-center justify-between gap-4 mb-2 text-sm text-gray-400">
        <span>Analyzing position {{ store.currentEvals.length }} of {{ totalPositions }}</span>
        <button
          type="button"
          class="cursor-pointer text-xs text-accent hover:underline"
          @click="store.cancelAnalysis()"
        >
          Cancel
        </button>
      </div>
      <div
        role="progressbar"
        aria-label="Analysis progress"
        :aria-valuenow="Math.round(progress)"
        aria-valuemin="0"
        aria-valuemax="100"
        class="h-1.5 rounded bg-gray-800 overflow-hidden"
      >
        <div class="h-full bg-accent transition-[width]" :style="{ width: `${progress}%` }"></div>
      </div>
    </div>

    <p v-if="store.analysisError" role="alert" class="mt-3 text-sm text-red-400">
      {{ store.analysisError }}
    </p>

    <EvalGraph
      v-if="store.analysisReport"
      :evals="store.currentEvals"
      :reports="store.analysisReport.moves"
      :moves="game.moves"
      :current-move-index="store.currentMoveIndex"
      @go-to-move="store.goToMove"
    />

    <!-- Finished -->
    <template v-if="game.analysis && !store.analysisHidden">
      <div class="mt-4 text-sm text-gray-300 wrap-anywhere">
        <p v-if="store.currentEval">
          <strong class="text-gray-100">{{ formatEval(store.currentEval) }}</strong>
          <span v-if="store.currentEval.bestSan" class="ml-3 text-gray-400">
            Engine's move here: <span class="text-gray-200">{{ store.currentEval.bestSan }}</span>
          </span>
        </p>
        <p v-if="currentGrade" class="mt-1 text-gray-400">
          <span class="text-gray-200">{{ currentGrade.move }}{{ currentGrade.symbol }}</span>
          was {{ currentGrade.name === 'inaccuracy' ? 'an' : 'a' }} {{ currentGrade.name
          }}<template v-if="currentGrade.best">
            . Better was <span class="text-gray-200">{{ currentGrade.best }}</span></template
          >.
        </p>
      </div>

      <table class="mt-4 w-full table-fixed text-sm">
        <thead>
          <tr class="text-xs text-gray-500">
            <th scope="col" class="w-2/5 text-left font-medium pb-2">Stat</th>
            <th scope="col" class="text-right font-medium pb-2 truncate" :title="game.white_player">
              {{ game.white_player }}
            </th>
            <th
              scope="col"
              class="text-right font-medium pb-2 pl-3 truncate"
              :title="game.black_player"
            >
              {{ game.black_player }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in statRows" :key="row.label" class="border-t border-gray-800">
            <th scope="row" class="py-1.5 text-left font-normal text-gray-400">{{ row.label }}</th>
            <td class="py-1.5 text-right text-gray-200">{{ row.white }}</td>
            <td class="py-1.5 pl-3 text-right text-gray-200">{{ row.black }}</td>
          </tr>
        </tbody>
      </table>
    </template>
  </section>
</template>
