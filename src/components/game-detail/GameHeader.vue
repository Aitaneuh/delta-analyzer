<script setup lang="ts">
import { computed } from 'vue'
import { getEcoOpeningName } from '@/data/ecoOpenings'

interface Props {
  white: string
  black: string
  whiteElo: number | null
  blackElo: number | null
  ecoCode: string | null
  date: string | null
  winner: 'white' | 'black' | 'draw' | null
  // Shown next to each name once the game has been analyzed
  whiteAccuracy?: number | null
  blackAccuracy?: number | null
}

const props = defineProps<Props>()

const formattedDate = computed(() => {
  if (!props.date) return ''

  // Dates are stored as UTC calendar days; formatting them locally can shift the day.
  return new Date(props.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
})

const formatAccuracy = (value: number | null | undefined) =>
  value === null || value === undefined ? null : `${value.toFixed(1)}%`

const displayEco = computed(() => {
  if (!props.ecoCode) return ''
  const name = getEcoOpeningName(props.ecoCode)
  return name ? `• ${props.ecoCode} ${name}` : `• ${props.ecoCode}`
})

const resultIcon = computed(() => {
  if (props.winner === 'white') return '1-0'
  if (props.winner === 'black') return '0-1'
  if (props.winner === 'draw') return '½-½'
  return ''
})
</script>

<template>
  <div class="bg-[#141619] border-b border-gray-800 px-4 sm:px-6 py-4">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
        <router-link
          to="/"
          class="shrink-0 text-gray-400 hover:text-gray-200 transition flex items-center space-x-1"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2"
            stroke="currentColor"
            class="w-5 h-5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          <span class="text-sm font-medium">Back</span>
        </router-link>

        <div class="hidden sm:block h-6 w-px bg-gray-700"></div>

        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 min-w-0">
          <h1
            class="min-w-0 wrap-anywhere text-lg sm:text-xl font-light text-gray-100 tracking-wide"
          >
            {{ white
            }}<span
              v-if="formatAccuracy(whiteAccuracy)"
              class="ml-1.5 text-sm text-sky-300"
              title="Accuracy"
              >{{ formatAccuracy(whiteAccuracy) }}</span
            >
            vs
            {{ black
            }}<span
              v-if="formatAccuracy(blackAccuracy)"
              class="ml-1.5 text-sm text-sky-300"
              title="Accuracy"
              >{{ formatAccuracy(blackAccuracy) }}</span
            >
          </h1>

          <span v-if="resultIcon" class="text-sm font-semibold text-accent">
            {{ resultIcon }}
          </span>

          <span v-if="displayEco" class="text-sm text-gray-500">
            {{ displayEco }}
          </span>

          <span v-if="formattedDate" class="text-sm text-gray-500"> • {{ formattedDate }} </span>
        </div>
      </div>
    </div>
  </div>
</template>
