<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import {
  OUTCOME_COLORS,
  avgAccuracy,
  avgMoves,
  count,
  decimal,
  finished,
  percent,
  ratio,
  type StatsRow,
} from '@/services/stats'

export interface OutcomeRow extends StatsRow {
  label: string
  detail?: string // A second, quieter line under the label
  to?: RouteLocationRaw
}

const props = withDefaults(
  defineProps<{
    rows: OutcomeRow[]
    heading: string
    // Names of the wins / draws / losses columns
    outcomes?: [string, string, string]
    showMoves?: boolean
    showAccuracy?: boolean
  }>(),
  { outcomes: () => ['White', 'Draw', 'Black'], showMoves: false, showAccuracy: false },
)

const SEGMENTS = ['wins', 'draws', 'losses'] as const

const lines = computed(() => {
  const total = props.rows.reduce((sum, row) => sum + row.games, 0)
  return props.rows.map((row) => {
    const done = finished(row)
    return {
      row,
      share: ratio(row.games, total),
      segments: SEGMENTS.map((name, index) => ({
        name,
        label: props.outcomes[index]!,
        value: ratio(row[name], done),
      })),
    }
  })
})
</script>

<template>
  <div class="overflow-x-auto">
    <table class="w-full text-xs sm:text-sm tabular-nums">
      <thead>
        <tr class="text-xs text-gray-500">
          <th scope="col" class="text-left font-medium pb-2 pr-3">{{ heading }}</th>
          <th scope="col" class="text-right font-medium pb-2 pr-3">Games</th>
          <th scope="col" class="hidden sm:table-cell w-full min-w-10 font-medium pb-2 pr-3">
            <span class="sr-only">Result split</span>
          </th>
          <th
            v-for="(label, index) in outcomes"
            :key="label"
            scope="col"
            class="text-right font-medium pb-2 pl-2 whitespace-nowrap"
          >
            <span
              class="inline-block h-2 w-2 rounded-full mr-1"
              :style="{ backgroundColor: OUTCOME_COLORS[SEGMENTS[index]!] }"
              aria-hidden="true"
            ></span
            >{{ label }}
          </th>
          <th v-if="showMoves" scope="col" class="text-right font-medium pb-2 pl-3">Moves</th>
          <th v-if="showAccuracy" scope="col" class="text-right font-medium pb-2 pl-3">Acc.</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="{ row, share, segments } in lines"
          :key="row.key"
          class="border-t border-gray-800"
        >
          <th
            scope="row"
            class="py-1.5 pr-3 text-left font-normal text-gray-200 max-w-[8rem] sm:max-w-[11rem]"
          >
            <RouterLink
              v-if="row.to"
              :to="row.to"
              class="block truncate hover:text-white hover:underline"
              :title="row.label"
              >{{ row.label }}</RouterLink
            >
            <span v-else class="block truncate" :title="row.label">{{ row.label }}</span>
            <span v-if="row.detail" class="block truncate text-xs text-gray-500">{{
              row.detail
            }}</span>
          </th>
          <td class="py-1.5 pr-3 text-right text-gray-300" :title="`${percent(share)} of games`">
            {{ count(row.games) }}
          </td>
          <td class="hidden sm:table-cell py-1.5 pr-3">
            <div class="flex h-2.5 gap-0.5" aria-hidden="true">
              <template v-for="segment in segments" :key="segment.name">
                <div
                  v-if="segment.value"
                  class="h-full first:rounded-l last:rounded-r"
                  :style="{
                    width: `${segment.value * 100}%`,
                    backgroundColor: OUTCOME_COLORS[segment.name],
                  }"
                  :title="`${segment.label}: ${percent(segment.value)}`"
                ></div>
              </template>
            </div>
          </td>
          <td
            v-for="segment in segments"
            :key="segment.name"
            class="py-1.5 pl-2 text-right text-gray-300"
          >
            {{ percent(segment.value, 0) }}
          </td>
          <td v-if="showMoves" class="py-1.5 pl-3 text-right text-gray-300">
            {{ decimal(avgMoves(row), 0) }}
          </td>
          <td v-if="showAccuracy" class="py-1.5 pl-3 text-right text-gray-300">
            {{ avgAccuracy(row) === null ? '–' : `${decimal(avgAccuracy(row))}%` }}
          </td>
        </tr>
      </tbody>
    </table>
    <p v-if="rows.length === 0" class="py-4 text-sm text-gray-500">No games yet.</p>
  </div>
</template>
