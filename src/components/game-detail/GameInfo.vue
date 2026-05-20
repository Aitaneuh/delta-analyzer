<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  white: string
  black: string
  whiteElo: number | null
  blackElo: number | null
  result: string
  winner: 'white' | 'black' | 'draw' | null
  termination: string | null
  timeControl: string | null
  gameType: string
  opening: string | null
  ecoCode: string | null
  source: string
  link: string | null
  date: string | null
}

const props = defineProps<Props>()

const formattedTimeControl = computed(() => {
  if (!props.timeControl) return 'Unknown'

  const match = props.timeControl.match(/^(\d+)(?:\+(\d+))?$/)
  if (!match) return props.timeControl

  const baseSeconds = parseInt(match[1], 10)
  const increment = match[2] ? parseInt(match[2], 10) : 0

  const minutes = Math.floor(baseSeconds / 60)

  if (increment > 0) {
    return `${minutes} min + ${increment} sec`
  }
  return `${minutes} min`
})

const resultText = computed(() => {
  if (props.winner === 'white') return `1-0 (White won${props.termination ? ` by ${props.termination}` : ''})`
  if (props.winner === 'black') return `0-1 (Black won${props.termination ? ` by ${props.termination}` : ''})`
  if (props.winner === 'draw') return `½-½ (Draw${props.termination ? ` by ${props.termination}` : ''})`
  return props.result
})

const formattedDate = computed(() => {
  if (!props.date) return null

  try {
    const dateObj = new Date(props.date)
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return props.date
  }
})
</script>

<template>
  <div class="bg-[#1a1d21] rounded-lg border border-gray-800 p-6">
    <h3 class="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">
      Game Information
    </h3>

    <div class="space-y-3 text-sm">
      <!-- Players -->
      <div class="flex items-center justify-between pb-3 border-b border-gray-800">
        <div class="flex items-center space-x-2">
          <span class="text-gray-500">White:</span>
          <span class="text-gray-200 font-medium">{{ white }}</span>
          <span v-if="whiteElo" class="text-gray-500">({{ whiteElo }})</span>
        </div>
        <span v-if="winner === 'white'" class="text-green-500 font-semibold">✓</span>
      </div>

      <div class="flex items-center justify-between pb-3 border-b border-gray-800">
        <div class="flex items-center space-x-2">
          <span class="text-gray-500">Black:</span>
          <span class="text-gray-200 font-medium">{{ black }}</span>
          <span v-if="blackElo" class="text-gray-500">({{ blackElo }})</span>
        </div>
        <span v-if="winner === 'black'" class="text-green-500 font-semibold">✓</span>
      </div>

      <!-- Result -->
      <div class="pb-3 border-b border-gray-800">
        <span class="text-gray-500">Result: </span>
        <span class="text-gray-200">{{ resultText }}</span>
      </div>

      <!-- Time Control -->
      <div class="pb-3 border-b border-gray-800">
        <span class="text-gray-500">Time Control: </span>
        <span class="text-gray-200">{{ formattedTimeControl }}</span>
        <span class="ml-2 text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400 uppercase">
          {{ gameType }}
        </span>
      </div>

      <!-- Opening -->
      <div v-if="opening || ecoCode" class="pb-3 border-b border-gray-800">
        <span class="text-gray-500">Opening: </span>
        <span class="text-gray-200">
          {{ opening || 'Unknown' }}
          <span v-if="ecoCode" class="text-gray-500 ml-1">({{ ecoCode }})</span>
        </span>
      </div>

      <!-- Source -->
      <div class="pb-3 border-b border-gray-800">
        <span class="text-gray-500">Source: </span>
        <span class="text-gray-200"> {{ source }}
        </span>
      </div>

      <!-- Date -->
      <div v-if="formattedDate" class="pb-3 border-b border-gray-800">
        <span class="text-gray-500">Played: </span>
        <span class="text-gray-200">{{ formattedDate }}</span>
      </div>

      <!-- External Link -->
      <div v-if="link" class="pt-2">
        <a :href="link" target="_blank" rel="noopener noreferrer"
          class="inline-flex items-center space-x-1 text-accent hover:text-accent-dark transition">
          <span>View on {{ source }}</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
            class="w-4 h-4">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
          </svg>
        </a>
      </div>
    </div>
  </div>
</template>