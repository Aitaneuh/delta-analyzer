<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signInUrl, useAuthStore } from '@/stores/authStore'
import { useGameStore, type ImportResult } from '@/stores/gameStore'

const pgnText = ref('')
const fileInput = ref<HTMLInputElement | null>(null)
const selectedFileName = ref('No file selected.')
const importError = ref<string | null>(null)
const requestAnalysis = ref(false)
const isSubmitting = ref(false)
const acceptedPermanent = ref(false)
const lichessCount = ref(25)
const lichessResult = ref<ImportResult | null>(null)

const router = useRouter()
const route = useRoute()
const store = useGameStore()
const auth = useAuthStore()

const signInFailed = computed(() => route.query.signin === 'failed')
const signInHref = computed(() => signInUrl('/import'))

// Handle raw file upload
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  importError.value = null

  if (!file) {
    selectedFileName.value = 'No file selected.'
    return
  }

  selectedFileName.value = file.name

  const reader = new FileReader()
  reader.onload = () => {
    pgnText.value = reader.result as string
  }
  reader.onerror = () => {
    importError.value = `Could not read ${file.name}.`
  }
  reader.readAsText(file)

  // Lets the same file be picked again after editing it on disk
  target.value = ''
}

// Upload the PGN, then open the result
const handleSubmit = async () => {
  importError.value = null
  lichessResult.value = null

  if (!pgnText.value.trim()) {
    importError.value = 'Please paste a PGN or import a file.'
    return
  }

  isSubmitting.value = true

  try {
    const { games } = await store.importPgn(pgnText.value)

    if (games.length === 1) {
      router.push({
        name: 'game-detail',
        params: { id: games[0]!.id },
        query: requestAnalysis.value ? { analyze: '1' } : {},
      })
    } else {
      router.push({ name: 'explore' })
    }
  } catch (error) {
    importError.value = error instanceof Error ? error.message : 'Failed to import this PGN.'
  } finally {
    isSubmitting.value = false
  }
}

const handleLichessImport = async () => {
  importError.value = null
  lichessResult.value = null
  isSubmitting.value = true

  try {
    lichessResult.value = await store.importFromLichess(lichessCount.value)
  } catch (error) {
    importError.value = error instanceof Error ? error.message : 'Failed to import your games.'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="mx-auto container max-w-4xl px-4 sm:px-6 pb-12 pt-4">
    <div class="bg-[#141619] border border-gray-800 rounded-lg p-4 sm:p-8 shadow-xl text-gray-300">
      <h1 class="text-2xl sm:text-3xl font-light text-gray-100 mb-4 tracking-wide">
        Import a game
      </h1>

      <p class="text-sm text-gray-400 mb-4 leading-relaxed">
        When you import a game, you can replay it move by move, analyze it with Stockfish and share
        its link. A PGN file with several games imports all of them.
      </p>

      <div class="bg-[#2b1b1b] border-l-4 border-accent p-3 rounded text-sm text-accent mb-6">
        Imported games are public. <strong>Once a game is uploaded, it can't be deleted.</strong>
      </div>

      <p v-if="!auth.ready" class="text-sm text-gray-500">Loading...</p>

      <!-- Signed out -->
      <div v-else-if="!auth.user" class="text-center py-6">
        <p v-if="signInFailed" role="alert" class="mb-4 text-sm text-red-400">
          Sign-in with Lichess didn't complete. Please try again.
        </p>
        <p class="text-sm text-gray-400 mb-4">Sign in with your Lichess account to import games.</p>
        <a
          :href="signInHref"
          class="inline-block bg-accent hover:bg-accent-dark text-white font-bold py-2.5 px-6 rounded shadow transition text-sm"
        >
          Sign in with Lichess
        </a>
      </div>

      <!-- Signed in -->
      <template v-else>
        <label class="flex items-start gap-3 cursor-pointer select-none mb-8">
          <input
            v-model="acceptedPermanent"
            type="checkbox"
            class="mt-0.5 w-4 h-4 shrink-0 rounded accent-accent"
          />
          <span class="text-sm font-medium text-gray-300">
            I understand that games I upload are public and can't be deleted, and I accept the
            <router-link to="/terms" class="text-accent hover:underline"
              >Terms of Service</router-link
            >.
          </span>
        </label>

        <!-- From Lichess -->
        <section class="mb-8">
          <h2 class="text-sm font-semibold text-gray-300 mb-1">Import from Lichess</h2>
          <p class="text-sm text-gray-500 mb-3">
            Imports the most recent finished games of {{ auth.user.username }}. Games already on the
            site are skipped.
          </p>
          <div class="flex flex-col sm:flex-row sm:items-center gap-3">
            <select
              v-model.number="lichessCount"
              aria-label="Number of games to import"
              class="bg-[#1a1d21] border border-gray-700 rounded p-2 text-sm outline-none focus:border-accent"
            >
              <option :value="10">Last 10 games</option>
              <option :value="25">Last 25 games</option>
              <option :value="50">Last 50 games</option>
              <option :value="100">Last 100 games</option>
            </select>
            <button
              type="button"
              :disabled="isSubmitting || !acceptedPermanent"
              class="cursor-pointer disabled:cursor-not-allowed bg-accent hover:bg-accent-dark disabled:bg-gray-700 text-white font-bold py-2 px-6 rounded shadow transition text-sm"
              @click="handleLichessImport"
            >
              {{ isSubmitting ? 'Importing...' : 'Import my Lichess games' }}
            </button>
          </div>
          <p v-if="lichessResult" role="status" class="mt-3 text-sm text-green-500">
            Imported {{ lichessResult.created }} new
            {{ lichessResult.created === 1 ? 'game' : 'games'
            }}<template v-if="lichessResult.duplicates"
              >, {{ lichessResult.duplicates }} already on the site</template
            >.
            <router-link to="/" class="underline">View games</router-link>
          </p>
        </section>

        <div class="border-b border-gray-800 my-6"></div>

        <!-- From a PGN -->
        <h2 class="text-sm font-semibold text-gray-300 mb-3">Upload a PGN</h2>
        <div class="mb-6">
          <label for="pgn-input" class="block text-sm font-semibold text-gray-400 mb-2">
            Paste PGN here
          </label>
          <textarea
            id="pgn-input"
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
            class="flex min-w-0 items-center space-x-2 bg-[#1a1d21] border border-gray-700 rounded px-3 py-1.5 text-sm"
          >
            <button
              type="button"
              class="shrink-0 cursor-pointer bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs px-3 py-1 rounded transition border border-gray-600"
              @click="fileInput?.click()"
            >
              Browse...
            </button>
            <span class="min-w-0 text-xs text-gray-500 truncate max-w-50">
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

        <div class="mb-6">
          <label class="flex items-center space-x-3 cursor-pointer group select-none">
            <input
              v-model="requestAnalysis"
              type="checkbox"
              class="w-4 h-4 rounded accent-accent bg-[#1a1d21] border-gray-700"
            />
            <span class="text-sm font-medium text-gray-400 group-hover:text-gray-200 transition">
              Request a computer analysis (single-game imports)
            </span>
          </label>
        </div>

        <div class="flex justify-center">
          <button
            :disabled="isSubmitting || !acceptedPermanent"
            class="cursor-pointer disabled:cursor-not-allowed w-full sm:w-auto justify-center flex items-center space-x-2 bg-accent hover:bg-accent-dark disabled:bg-gray-700 text-white font-bold py-2.5 px-6 rounded shadow transition text-sm tracking-wide"
            @click="handleSubmit"
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
      </template>

      <p
        v-if="importError"
        role="alert"
        class="mt-4 text-sm text-red-400 wrap-anywhere text-center"
      >
        {{ importError }}
      </p>
    </div>
  </div>
</template>
