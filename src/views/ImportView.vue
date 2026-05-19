<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const pgnText = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFileName = ref('Aucun fichier sélectionné.')
const requestAnalysis = ref(false)
const isSubmitting = ref(false)

const router = useRouter()

// Handle raw file upload
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files.length > 0) {
    const file = target.files[0]
    selectedFileName.value = file.name

    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        pgnText.value = e.target.result as string
      }
    }
    reader.readAsText(file)
  } else {
    selectedFileName.value = 'Aucun fichier sélectionné.'
  }
}

// Submit and handle the parsing logic
const handleSubmit = async () => {
  if (!pgnText.value.trim()) {
    alert('Veuillez coller un PGN ou importer un fichier.')
    return
  }

  isSubmitting.value = true

  try {
    // 1. TODO: Parse your raw PGN string here to extract metadata
    // (White, Black, Elo, Result, ECO, Date, etc.)
    const generatedId = Math.random().toString(36).substring(2, 10) // e.g., 'gh3970g3'

    console.log('Parsing PGN...', {
      pgn: pgnText.value,
      analysisRequested: requestAnalysis.value,
    })

    // 2. TODO: Save this parsed object to your Pinia store (store.allGames.push(...))

    // 3. Redirect to the newly created game page
    router.push({ name: 'game-detail', params: { id: generatedId } })
  } catch (error) {
    console.error('Failed to import game:', error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto container max-w-4xl px-6 pb-12 pt-4">
    <div class="bg-[#141619] border border-gray-800 rounded-lg p-8 shadow-xl text-gray-300">
      <h1 class="text-3xl font-light text-gray-100 mb-4 tracking-wide">Import a game</h1>

      <p class="text-sm text-gray-400 mb-4 leading-relaxed">
        When you import a game, you can analyze it, see the computer analysis and copy the link to
        share it.
      </p>

      <div
        class="flex items-start space-x-2 bg-[#2b1b1b] border-l-4 border-accent p-3 rounded text-sm accent mb-6"
      >
        <span> This game won't be private and will be uploaded to the database. </span>
      </div>

      <div class="mb-6">
        <label class="block text-sm font-semibold text-gray-400 mb-2"> Paste PGN here </label>
        <textarea
          v-model="pgnText"
          rows="8"
          placeholder='[Event "Live Chess"]...'
          class="w-full bg-[#1a1d21] border border-gray-700 rounded p-3 text-sm font-mono text-gray-200 outline-none focus:border-accent resize-y transition"
        ></textarea>
      </div>

      <div
        class="mb-6 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4"
      >
        <span class="text-sm font-semibold text-gray-400"> Or import a PGN file </span>

        <div
          class="flex items-center space-x-2 bg-[#1a1d21] border border-gray-700 rounded px-3 py-1.5 text-sm"
        >
          <button
            type="button"
            @click="fileInput?.click()"
            class="bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs px-3 py-1 rounded transition border border-gray-600"
          >
            Parcourir...
          </button>
          <span class="text-xs text-gray-500 truncate max-w-[200px]">
            {{ selectedFileName }}
          </span>
          <input
            ref="fileInput"
            type="file"
            accept=".pgn"
            class="hidden"
            @change="handleFileUpload"
          />
        </div>
      </div>

      <div class="mb-8">
        <label class="flex items-center space-x-3 cursor-pointer group select-none">
          <input
            type="checkbox"
            v-model="requestAnalysis"
            class="w-4 h-4 rounded accent-accent bg-[#1a1d21] border-gray-700"
          />
          <span class="text-sm font-medium text-gray-400 group-hover:text-gray-200 transition">
            Request a computer analysis
          </span>
        </label>
      </div>

      <div class="border-b border-gray-800 my-6"></div>

      <div class="flex justify-center">
        <button
          @click="handleSubmit"
          :disabled="isSubmitting"
          class="flex items-center space-x-2 bg-accent hover-bg-accent disabled:bg-gray-700 text-white font-bold py-2.5 px-6 rounded shadow transition text-sm tracking-wide"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke-width="2.5"
            stroke="currentColor"
            class="w-4 h-4"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
            />
          </svg>
          <span>{{ isSubmitting ? 'IMPORTING...' : 'IMPORT A GAME' }}</span>
        </button>
      </div>
    </div>
  </div>
</template>
