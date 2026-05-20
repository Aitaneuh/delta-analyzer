<script setup lang="ts">
interface Props {
  isAtStart: boolean
  isAtEnd: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  goToStart: []
  prevMove: []
  nextMove: []
  goToEnd: []
}>()
</script>

<template>
  <div class="flex items-center justify-center space-x-2 py-4">
    <!-- Go to start -->
    <button :disabled="isAtStart" @click="emit('goToStart')"
      class="p-2 rounded bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-700 text-gray-300 transition"
      title="Go to start">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
        class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
      </svg>
    </button>

    <!-- Previous move -->
    <button :disabled="isAtStart" @click="emit('prevMove')"
      class="p-2 rounded bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-700 text-gray-300 transition"
      title="Previous move">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
        class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
      </svg>
    </button>

    <!-- Next move -->
    <button :disabled="isAtEnd" @click="emit('nextMove')"
      class="p-2 rounded bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-700 text-gray-300 transition"
      title="Next move">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
        class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </button>

    <!-- Go to end -->
    <button :disabled="isAtEnd" @click="emit('goToEnd')"
      class="p-2 rounded bg-gray-800 hover:bg-gray-700 disabled:bg-gray-900 disabled:text-gray-700 text-gray-300 transition"
      title="Go to end">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"
        class="w-5 h-5">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  </div>
</template>