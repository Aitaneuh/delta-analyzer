<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  white: string
  black: string
  whiteElo: number | null
  blackElo: number | null
  ecoCode: string | null
  date: string | null
  winner: 'white' | 'black' | 'draw' | null
}

const props = defineProps<Props>()

const formattedDate = computed(() => {
  if (!props.date) return ''

  try {
    const dateObj = new Date(props.date)
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  } catch {
    return props.date
  }
})

const displayTitle = computed(() => {
  const whiteName = props.white
  const blackName = props.black
  return `${whiteName} vs ${blackName}`
})

const displayEco = computed(() => {
  return props.ecoCode ? `• ${props.ecoCode}` : ''
})

const resultIcon = computed(() => {
  if (props.winner === 'white') return '1-0'
  if (props.winner === 'black') return '0-1'
  if (props.winner === 'draw') return '½-½'
  return ''
})
</script>

<template>
  <div class="bg-[#141619] border-b border-gray-800 px-6 py-4">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <router-link to="/" class="text-gray-400 hover:text-gray-200 transition flex items-center space-x-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
            class="w-5 h-5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span class="text-sm font-medium">Back</span>
        </router-link>

        <div class="h-6 w-px bg-gray-700"></div>

        <div class="flex items-center space-x-3">
          <h1 class="text-xl font-light text-gray-100 tracking-wide">
            {{ displayTitle }}
          </h1>

          <span v-if="resultIcon" class="text-sm font-semibold text-accent">
            {{ resultIcon }}
          </span>

          <span v-if="displayEco" class="text-sm text-gray-500">
            {{ displayEco }}
          </span>

          <span v-if="formattedDate" class="text-sm text-gray-500">
            • {{ formattedDate }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>