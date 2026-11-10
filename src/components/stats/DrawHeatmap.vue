<script setup lang="ts">
import { computed } from 'vue'
import {
  bandLabel,
  count,
  finished,
  gameTypeLabel,
  percent,
  ratio,
  type EloBand,
  type MatrixRow,
} from '@/services/stats'

const props = defineProps<{ matrix: MatrixRow[]; bands: EloBand[] }>()

// Below this, a rate says more about chance than about chess
const MIN_GAMES = 10
const MODES = ['bullet', 'blitz', 'rapid', 'classical']

const cells = computed(() => {
  const byKey = new Map(props.matrix.map((row) => [`${row.game_type}|${row.elo_band}`, row]))
  const columns = props.bands.filter((band) => band.min_elo !== null)
  const rows = MODES.map((mode) => ({
    mode,
    cells: columns.map((band) => {
      const row = byKey.get(`${mode}|${band.key}`)
      const games = row ? finished(row) : 0
      return { band, games, rate: row && games >= MIN_GAMES ? ratio(row.draws, games) : null }
    }),
  }))
  const max = Math.max(0.01, ...rows.flatMap((row) => row.cells.map((cell) => cell.rate ?? 0)))
  return { columns, rows, max }
})
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[30rem] text-xs tabular-nums border-separate border-spacing-0.5">
      <thead>
        <tr class="text-gray-500">
          <th scope="col" class="text-left font-medium pb-1">
            <span class="sr-only">Time mode</span>
          </th>
          <th
            v-for="band in cells.columns"
            :key="band.key"
            scope="col"
            class="font-medium pb-1"
            :title="bandLabel(band, band.key)"
          >
            {{ band.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in cells.rows" :key="row.mode">
          <th scope="row" class="text-left font-normal text-gray-300 pr-2">
            {{ gameTypeLabel(row.mode) }}
          </th>
          <td
            v-for="cell in row.cells"
            :key="cell.band.key"
            class="h-9 rounded text-center"
            :class="cell.rate === null ? 'text-gray-600 bg-gray-900' : 'text-gray-100'"
            :style="
              cell.rate === null
                ? undefined
                : {
                    backgroundColor: `rgba(57, 135, 229, ${0.12 + 0.78 * (cell.rate / cells.max)})`,
                  }
            "
            :title="`${gameTypeLabel(row.mode)}, ${bandLabel(cell.band, cell.band.key)}: ${count(cell.games)} finished games`"
          >
            {{ cell.rate === null ? '–' : percent(cell.rate, 0) }}
          </td>
        </tr>
      </tbody>
    </table>
    <p class="mt-2 text-xs text-gray-500">
      Darker means more draws. “–” means fewer than {{ MIN_GAMES }} finished games.
    </p>
  </div>
</template>
