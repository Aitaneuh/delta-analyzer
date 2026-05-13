<script setup lang="ts">
import { reactive } from 'vue'
import { useGameStore } from '@/stores/gameStore'

const store = useGameStore()
// Initialize local state with current store values
const localFilters = reactive({ ...store.filters })

const handleFilter = () => {
  store.updateFilters(localFilters)
}
</script>

<template>
  <!-- Top Search Bars -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
    <div>
      <label class="block text-sm font-medium text-gray-400 mb-1">Game Name</label>
      <input
        v-model="localFilters.game_name"
        type="text"
        placeholder="e.g. Titled Tuesday"
        class="w-full bg-[#1a1d21] border border-gray-700 rounded p-2 focus-border-accent outline-none transition"
      />
      <p class="text-xs text-gray-500 mt-1 italic">Replay title or event</p>
    </div>
    <div>
      <label class="block text-sm font-medium text-gray-400 mb-1">Player</label>
      <input
        v-model="localFilters.player_name"
        type="text"
        placeholder="Search White or Black"
        class="w-full bg-[#1a1d21] border border-gray-700 rounded p-2 focus-border-accent outline-none transition"
      />
      <p class="text-xs text-gray-500 mt-1 italic">Case sensitive exact search</p>
    </div>
  </div>

  <!-- Checkbox Sections -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
    <!-- Game Types -->
    <div>
      <h3
        class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 border-b border-gray-800 pb-1"
      >
        Type
      </h3>
      <div class="space-y-2">
        <label
          v-for="t in ['Bullet', 'Blitz', 'Rapid', 'Classical']"
          :key="t"
          class="flex items-center space-x-2 cursor-pointer hover:text-white"
        >
          <input
            type="checkbox"
            :value="t.toLowerCase()"
            v-model="localFilters.game_types"
            class="accent-accent"
          />
          <span class="text-sm">{{ t }}</span>
        </label>
      </div>
    </div>

    <!-- Results -->
    <div>
      <h3
        class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 border-b border-gray-800 pb-1"
      >
        Result
      </h3>
      <div class="space-y-2">
        <label class="flex items-center space-x-2 cursor-pointer hover:text-white">
          <input type="checkbox" value="1-0" v-model="localFilters.results" class="accent-accent" />
          <span class="text-sm">White Wins (1-0)</span>
        </label>
        <label class="flex items-center space-x-2 cursor-pointer hover:text-white">
          <input type="checkbox" value="0-1" v-model="localFilters.results" class="accent-accent" />
          <span class="text-sm">Black Wins (0-1)</span>
        </label>
        <label class="flex items-center space-x-2 cursor-pointer hover:text-white">
          <input
            type="checkbox"
            value="1/2-1/2"
            v-model="localFilters.results"
            class="accent-accent"
          />
          <span class="text-sm">Draw (½-½)</span>
        </label>
      </div>
    </div>

    <!-- Termination -->
    <div>
      <h3
        class="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 border-b border-gray-800 pb-1"
      >
        Termination
      </h3>
      <div class="space-y-2">
        <label
          v-for="term in ['Mate', 'Resign', 'Time']"
          :key="term"
          class="flex items-center space-x-2 cursor-pointer hover:text-white"
        >
          <input
            type="checkbox"
            :value="term.toLowerCase()"
            v-model="localFilters.terminations"
            class="accent-accent"
          />
          <span class="text-sm">{{ term }}</span>
        </label>
      </div>
    </div>
  </div>

  <!-- Dropdowns Row -->
  <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
    <select
      v-model="localFilters.eco_code"
      class="bg-[#1a1d21] border border-gray-700 rounded p-2 text-sm outline-none focus-border-accent"
    >
      <option value="">Any ECO Opening</option>
      <option value="A00">A00 - Irregular</option>
      <option value="B20">B20 - Sicilian</option>
      <option value="C60">C60 - Ruy Lopez</option>
    </select>

    <input
      v-model.number="localFilters.min_elo"
      type="number"
      placeholder="Min Elo"
      class="bg-[#1a1d21] border border-gray-700 rounded p-2 text-sm outline-none focus-border-accent"
    />

    <input
      v-model.number="localFilters.max_elo"
      type="number"
      placeholder="Max Elo"
      class="bg-[#1a1d21] border border-gray-700 rounded p-2 text-sm outline-none focus-border-accent"
    />

    <select
      class="bg-[#1a1d21] border border-gray-700 rounded p-2 text-sm outline-none focus-border-accent"
    >
      <option>All Time Controls</option>
      <option>Standard only</option>
      <option>Incramental (+)</option>
    </select>
  </div>

  <!-- Dates Row -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
    <div>
      <input
        type="date"
        v-model="localFilters.played_date"
        class="w-full bg-[#1a1d21] border border-gray-700 rounded p-2 text-sm outline-none color-scheme-dark"
      />
      <div class="flex justify-between mt-1">
        <span class="text-xs text-gray-500">Played date</span>
        <button @click="localFilters.played_date = ''" class="text-xs accent hover:underline">
          [clear]
        </button>
      </div>
    </div>
    <div>
      <input
        type="date"
        v-model="localFilters.imported_date"
        class="w-full bg-[#1a1d21] border border-gray-700 rounded p-2 text-sm outline-none color-scheme-dark"
      />
      <div class="flex justify-between mt-1">
        <span class="text-xs text-gray-500">Upload date</span>
        <button @click="localFilters.imported_date = ''" class="text-xs accent hover:underline">
          [clear]
        </button>
      </div>
    </div>
  </div>

  <!-- Action Buttons -->
  <div class="flex space-x-3">
    <button
      @click="handleFilter"
      class="hover-bg-accent text-black font-bold py-2 px-6 rounded transition shadow-lg"
    >
      Filter
    </button>
  </div>
</template>

<style scoped>
.color-scheme-dark {
  color-scheme: dark;
}
</style>
