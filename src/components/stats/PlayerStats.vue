<script setup lang="ts">
import { computed } from 'vue'
import BarChart from './BarChart.vue'
import OutcomeTable, { type OutcomeRow } from './OutcomeTable.vue'
import RatingChart from './RatingChart.vue'
import StatTile from './StatTile.vue'
import StatsCard from './StatsCard.vue'
import {
  GAME_TYPES,
  avgAccuracy,
  avgMoves,
  bandRange,
  count,
  decimal,
  finished,
  gameTypeLabel,
  lengthLabel,
  monthLabel,
  monthSeries,
  openingLabel,
  percent,
  perPlayerGame,
  ratio,
  scoreOf,
  terminationLabel,
  timeControlLabel,
  type EloBand,
  type PlayerStats,
  type StatsRow,
} from '@/services/stats'

const props = defineProps<{ stats: PlayerStats; bands: EloBand[] }>()

const OUTCOMES: [string, string, string] = ['Win', 'Draw', 'Loss']
const STRENGTH_LABELS: Record<string, string> = {
  stronger: 'Stronger',
  similar: 'Similar',
  weaker: 'Weaker',
}

const rows = (name: string) => props.stats.breakdowns[name] ?? []
const label = (list: StatsRow[], toLabel: (key: string) => string): OutcomeRow[] =>
  list.map((row) => ({ ...row, label: toLabel(row.key) }))
const ordered = (list: StatsRow[], keys: readonly string[], toLabel: (key: string) => string) =>
  keys.flatMap((key) => {
    const row = list.find((item) => item.key === key)
    return row ? [{ ...row, label: toLabel(key) }] : []
  })

const totals = computed(() => rows('all')[0] ?? null)

const tiles = computed(() => {
  const all = totals.value
  if (!all) return []
  const done = finished(all)
  const ratings = props.stats.ratings.filter((rating) => rating.peak !== null)
  const peak = ratings.reduce<(typeof ratings)[number] | null>(
    (best, rating) => (!best || rating.peak! > best.peak! ? rating : best),
    null,
  )
  const accuracy = avgAccuracy(all)
  return [
    { label: 'Games', value: count(all.games) },
    {
      label: 'Score',
      value: percent(scoreOf(all)),
      detail: `${all.wins} W · ${all.draws} D · ${all.losses} L`,
    },
    { label: 'Win rate', value: percent(ratio(all.wins, done)) },
    { label: 'Draw rate', value: percent(ratio(all.draws, done)) },
    {
      label: 'Peak rating',
      value: peak ? String(peak.peak) : '–',
      detail: peak ? gameTypeLabel(peak.game_type) : undefined,
    },
    { label: 'Average length', value: `${decimal(avgMoves(all), 0)} moves` },
    {
      label: 'Accuracy',
      value: accuracy === null ? '–' : `${decimal(accuracy)}%`,
      detail: `${count(all.analyzed)} analyzed game${all.analyzed === 1 ? '' : 's'}`,
    },
    {
      label: 'Blunders per game',
      value: decimal(perPlayerGame(all, all.blunders)),
      detail: all.accuracy_sides
        ? `${decimal(perPlayerGame(all, all.mistakes))} mistakes`
        : undefined,
    },
  ]
})

const ratingCards = computed(() =>
  GAME_TYPES.flatMap((mode) => {
    const rating = props.stats.ratings.find((item) => item.game_type === mode)
    return rating && rating.latest !== null ? [rating] : []
  }),
)

const colors = computed(() =>
  ordered(rows('color'), ['white', 'black'], (key) => (key === 'white' ? 'As White' : 'As Black')),
)
const gameTypes = computed(() =>
  ordered(rows('game_type'), GAME_TYPES, gameTypeLabel).map((row) => ({
    ...row,
    to: { query: { player: props.stats.name, time: row.key } },
  })),
)
const opponentBands = computed(() =>
  props.bands.flatMap((band) => {
    const row = rows('opponent_band').find((item) => item.key === band.key)
    return row ? [{ ...row, label: band.label, detail: bandRange(band) }] : []
  }),
)
const strength = computed(() =>
  ordered(rows('strength'), ['stronger', 'similar', 'weaker'], (key) => STRENGTH_LABELS[key]!),
)
const rivals = computed(() =>
  label(rows('opponent'), (name) => name).map((row) => ({
    ...row,
    to: { query: { player: row.key } },
  })),
)

const lengthBars = computed(() =>
  rows('length').map((row) => ({ key: row.key, label: lengthLabel(row.key), value: row.games })),
)
const monthBars = computed(() =>
  monthSeries(rows('month')).map((month) => ({ ...month, label: monthLabel(month.key) })),
)
const span = computed(() => {
  const dates = props.stats.ratings.flatMap((rating) =>
    [rating.first_played, rating.last_played].filter((date): date is string => !!date),
  )
  if (!dates.length) return null
  dates.sort()
  return `${dates[0]} to ${dates[dates.length - 1]}`
})
</script>

<template>
  <div v-if="!totals" class="text-center py-20 border-2 border-dashed border-gray-800 rounded-xl">
    <p class="text-gray-500">{{ stats.name }} has no games in this time mode.</p>
  </div>

  <div v-else class="space-y-6">
    <p v-if="span" class="text-sm text-gray-500">Games played from {{ span }}.</p>

    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatTile v-for="tile in tiles" :key="tile.label" v-bind="tile" />
    </div>

    <div v-if="ratingCards.length" class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatTile
        v-for="rating in ratingCards"
        :key="rating.game_type"
        :label="`${gameTypeLabel(rating.game_type)} rating`"
        :value="String(rating.latest)"
        :detail="`Peak ${rating.peak} · ${count(rating.games)} games`"
      />
    </div>

    <StatsCard
      v-if="stats.rating_history.length > 1"
      title="Rating over time"
      note="Average rating in each month's games."
    >
      <RatingChart :history="stats.rating_history" />
    </StatsCard>

    <div class="grid lg:grid-cols-2 gap-6">
      <StatsCard title="By color">
        <OutcomeTable
          :rows="colors"
          heading="Color"
          :outcomes="OUTCOMES"
          show-moves
          show-accuracy
        />
      </StatsCard>
      <StatsCard title="By time mode">
        <OutcomeTable
          :rows="gameTypes"
          heading="Mode"
          :outcomes="OUTCOMES"
          show-moves
          show-accuracy
        />
      </StatsCard>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
      <StatsCard title="Against opponents by rating">
        <OutcomeTable :rows="opponentBands" heading="Opponent" :outcomes="OUTCOMES" />
      </StatsCard>
      <StatsCard
        title="Against stronger and weaker players"
        note="Stronger or weaker by 50 points or more than the player's own rating in that game."
      >
        <OutcomeTable :rows="strength" heading="Opponent" :outcomes="OUTCOMES" />
      </StatsCard>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
      <StatsCard title="How games end">
        <OutcomeTable
          :rows="label(rows('termination'), terminationLabel)"
          heading="Ending"
          :outcomes="OUTCOMES"
          show-moves
        />
      </StatsCard>
      <StatsCard title="Game length" note="Full moves, in groups of ten.">
        <BarChart :bars="lengthBars" label="Games by length in moves" />
      </StatsCard>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
      <StatsCard title="Openings as White">
        <OutcomeTable
          :rows="label(rows('opening_white'), (eco) => `${eco} ${openingLabel(eco)}`)"
          heading="Opening"
          :outcomes="OUTCOMES"
        />
      </StatsCard>
      <StatsCard title="Openings as Black">
        <OutcomeTable
          :rows="label(rows('opening_black'), (eco) => `${eco} ${openingLabel(eco)}`)"
          heading="Opening"
          :outcomes="OUTCOMES"
        />
      </StatsCard>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
      <StatsCard title="Most frequent opponents">
        <OutcomeTable :rows="rivals" heading="Opponent" :outcomes="OUTCOMES" />
      </StatsCard>
      <div class="space-y-6 min-w-0">
        <StatsCard title="First moves as White">
          <OutcomeTable
            :rows="label(rows('first_move'), (move) => `1. ${move}`)"
            heading="Move"
            :outcomes="OUTCOMES"
          />
        </StatsCard>
        <StatsCard title="Time controls">
          <OutcomeTable
            :rows="label(rows('time_control'), timeControlLabel)"
            heading="Control"
            :outcomes="OUTCOMES"
          />
        </StatsCard>
      </div>
    </div>

    <StatsCard title="Games played per month">
      <BarChart v-if="monthBars.length" :bars="monthBars" label="Games played per month" />
      <p v-else class="text-sm text-gray-500">No dated games.</p>
    </StatsCard>
  </div>
</template>
