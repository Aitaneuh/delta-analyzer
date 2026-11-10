<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router'
import GlobalStats from '@/components/stats/GlobalStats.vue'
import PlayerStats from '@/components/stats/PlayerStats.vue'
import LoadingSpinner from '@/components/LoadingSpinner.vue'
import { useAuthStore } from '@/stores/authStore'
import { useStatsStore } from '@/stores/statsStore'
import { GAME_TYPES, bandLabel, gameTypeLabel, queryText } from '@/services/stats'

const route = useRoute()
const router = useRouter()
const store = useStatsStore()
const auth = useAuthStore()

// The URL holds the filters, so any view of the statistics can be shared as a link
const player = computed(() => queryText(route.query.player).trim())
const gameType = computed(() => queryText(route.query.time))
const eloBand = computed(() => queryText(route.query.elo))

const search = ref(player.value)
const suggestions = ref<string[]>([])
let suggestTimer: ReturnType<typeof setTimeout> | undefined

watch(
  [player, gameType, eloBand],
  () => {
    search.value = player.value
    void store.load({ player: player.value, gameType: gameType.value, eloBand: eloBand.value })
  },
  { immediate: true },
)

const bands = computed(() => store.global?.bands ?? store.player?.bands ?? [])

function setQuery(changes: LocationQueryRaw) {
  const query: LocationQueryRaw = { ...route.query, ...changes }
  for (const key of Object.keys(query)) if (!query[key]) delete query[key]
  void router.replace({ query })
}

function showPlayer(name: string) {
  setQuery({ player: name.trim() || undefined, elo: undefined })
}

function onSearchInput() {
  clearTimeout(suggestTimer)
  const prefix = search.value
  suggestTimer = setTimeout(async () => {
    suggestions.value = await store.suggestPlayers(prefix)
  }, 200)
}

const modeOptions = [
  { key: '', label: 'All' },
  ...GAME_TYPES.filter((mode) => mode !== 'unknown').map((mode) => ({
    key: mode,
    label: gameTypeLabel(mode),
  })),
]

const bandOptions = computed(() => [
  { key: '', label: 'All ratings' },
  ...bands.value.map((band) => ({ key: band.key, label: bandLabel(band, band.key) })),
])

const updatedAgo = computed(() => {
  const at = store.global?.refreshed_at
  if (!at) return null
  const minutes = Math.round((Date.now() - new Date(at).getTime()) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  return `${hours} hour${hours === 1 ? '' : 's'} ago`
})

const showingPlayer = computed(() => !!player.value)
const hasData = computed(() => (showingPlayer.value ? !!store.player : !!store.global))
</script>

<template>
  <div class="mx-auto container px-4 sm:px-8 xl:px-32 py-6 sm:py-10">
    <header class="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div class="min-w-0">
        <p v-if="showingPlayer" class="text-sm">
          <RouterLink
            :to="{ query: { time: gameType || undefined } }"
            class="text-gray-400 hover:text-white"
          >
            ← All games
          </RouterLink>
        </p>
        <div class="flex items-center gap-3 min-w-0">
          <h1 class="text-2xl font-bold truncate">
            {{ showingPlayer ? (store.player?.name ?? player) : 'Statistics' }}
          </h1>
          <LoadingSpinner v-if="store.loading && hasData" size="sm" label="Updating statistics" />
        </div>
        <p v-if="showingPlayer" class="text-sm text-gray-500 mt-1">
          Every game on this site with this player name, live.
        </p>
        <p v-else-if="updatedAgo" class="text-sm text-gray-500 mt-1">
          Updated {{ updatedAgo }}. Site-wide numbers are recalculated every hour.
        </p>
      </div>

      <form class="flex gap-2 w-full sm:w-auto" role="search" @submit.prevent="showPlayer(search)">
        <label for="stats-player" class="sr-only">Player name</label>
        <input
          id="stats-player"
          v-model="search"
          type="search"
          list="stats-player-suggestions"
          placeholder="Player name"
          autocomplete="off"
          maxlength="64"
          class="min-w-0 flex-1 sm:w-56 bg-[#1a1d21] border border-gray-700 rounded p-2 text-sm focus:border-accent outline-none transition"
          @input="onSearchInput"
        />
        <datalist id="stats-player-suggestions">
          <option v-for="name in suggestions" :key="name" :value="name"></option>
        </datalist>
        <button
          type="submit"
          class="cursor-pointer bg-accent hover:bg-accent-dark text-white font-bold py-2 px-4 rounded transition text-sm"
        >
          View
        </button>
        <button
          v-if="auth.user && auth.user.username.toLowerCase() !== player.toLowerCase()"
          type="button"
          class="cursor-pointer rounded bg-gray-800 hover:bg-gray-700 px-3 py-2 text-sm text-gray-200 transition whitespace-nowrap"
          @click="showPlayer(auth.user.username)"
        >
          My stats
        </button>
      </form>
    </header>

    <div class="flex flex-col gap-3 mb-8">
      <div class="flex flex-wrap gap-2" role="group" aria-label="Time mode">
        <button
          v-for="option in modeOptions"
          :key="option.key"
          type="button"
          :aria-pressed="gameType === option.key"
          class="cursor-pointer rounded-full border px-3 py-1 text-sm transition"
          :class="
            gameType === option.key
              ? 'border-accent bg-accent/15 text-white'
              : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
          "
          @click="setQuery({ time: option.key })"
        >
          {{ option.label }}
        </button>
      </div>
      <div v-if="!showingPlayer" class="flex flex-wrap gap-2" role="group" aria-label="Rating band">
        <button
          v-for="option in bandOptions"
          :key="option.key"
          type="button"
          :aria-pressed="eloBand === option.key"
          class="cursor-pointer rounded-full border px-3 py-1 text-xs transition"
          :class="
            eloBand === option.key
              ? 'border-accent bg-accent/15 text-white'
              : 'border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
          "
          @click="setQuery({ elo: option.key })"
        >
          {{ option.label }}
        </button>
      </div>
    </div>

    <p v-if="store.error" role="alert" class="mb-6 text-sm text-red-400">{{ store.error }}</p>

    <div
      v-if="showingPlayer && store.notFound"
      class="text-center py-20 border-2 border-dashed border-gray-800 rounded-xl"
    >
      <p class="text-gray-400">No games found for “{{ player }}”.</p>
      <p class="mt-2 text-sm text-gray-500">The name has to match exactly, in any case.</p>
    </div>

    <!-- The previous results stay visible, dimmed, while new ones load -->
    <div
      v-else-if="hasData"
      class="transition-opacity"
      :class="store.loading ? 'opacity-50 pointer-events-none' : ''"
      :aria-busy="store.loading"
    >
      <PlayerStats v-if="showingPlayer && store.player" :stats="store.player" :bands="bands" />
      <GlobalStats v-else-if="!showingPlayer && store.global" :stats="store.global" />
    </div>

    <!-- First load: placeholders in the page's shape, so nothing jumps when the numbers arrive -->
    <div v-else-if="store.loading" class="space-y-6">
      <LoadingSpinner :label="showingPlayer ? 'Calculating statistics…' : 'Loading statistics…'" />
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3" aria-hidden="true">
        <div
          v-for="index in 8"
          :key="index"
          class="h-[74px] rounded-lg border border-gray-800 bg-[#1a1d21] motion-safe:animate-pulse"
        ></div>
      </div>
      <div class="grid lg:grid-cols-2 gap-6" aria-hidden="true">
        <div
          v-for="index in 2"
          :key="index"
          class="h-64 rounded-lg border border-gray-800 bg-[#1a1d21] motion-safe:animate-pulse"
        ></div>
      </div>
    </div>
  </div>
</template>
