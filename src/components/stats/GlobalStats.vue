<script setup lang="ts">
import { computed } from 'vue'
import BarChart from './BarChart.vue'
import DrawHeatmap from './DrawHeatmap.vue'
import OutcomeTable, { type OutcomeRow } from './OutcomeTable.vue'
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
  gapLabel,
  lengthLabel,
  monthLabel,
  monthSeries,
  openingLabel,
  percent,
  perPlayerGame,
  ratio,
  scoreOf,
  sourceLabel,
  terminationLabel,
  timeControlLabel,
  type GlobalStats,
  type LeaderboardEntry,
  type StatsRow,
} from '@/services/stats'

const props = defineProps<{ stats: GlobalStats }>()

const rows = (name: string) => props.stats.breakdowns[name] ?? []
const label = (list: StatsRow[], toLabel: (key: string) => string): OutcomeRow[] =>
  list.map((row) => ({ ...row, label: toLabel(row.key) }))

const totals = computed(() => rows('all')[0] ?? null)

const tiles = computed(() => {
  const all = totals.value
  if (!all) return []
  const done = finished(all)
  const mates = rows('termination').find((row) => row.key === 'mate')?.games ?? 0
  const accuracy = avgAccuracy(all)
  return [
    { label: 'Games', value: count(all.games) },
    { label: 'Players', value: count(props.stats.players.total) },
    { label: 'Moves played', value: count(Math.round(all.plies / 2)) },
    { label: 'Average length', value: `${decimal(avgMoves(all), 0)} moves` },
    {
      label: "White's score",
      value: percent(scoreOf(all)),
      detail: `${percent(ratio(all.wins, done), 0)} won, ${percent(ratio(all.losses, done), 0)} lost`,
    },
    { label: 'Draw rate', value: percent(ratio(all.draws, done)) },
    { label: 'Ended in checkmate', value: percent(ratio(mates, all.games)) },
    {
      label: 'Computer-analyzed',
      value: count(all.analyzed),
      detail: accuracy === null ? 'No analyses yet' : `${decimal(accuracy)}% average accuracy`,
    },
  ]
})

const byGameType = computed(() =>
  GAME_TYPES.flatMap((mode) => {
    const row = props.stats.by_game_type.find((item) => item.key === mode)
    return row ? [{ ...row, label: gameTypeLabel(mode), to: { query: { time: mode } } }] : []
  }),
)

const byEloBand = computed(() =>
  props.stats.bands.flatMap((band) => {
    const row = props.stats.by_elo_band.find((item) => item.key === band.key)
    return row ? [{ ...row, label: band.label, detail: bandRange(band) }] : []
  }),
)

// The favorite is the higher-rated player, so these rows use favorite / underdog wins
const gaps = computed(() =>
  rows('gap').map((row) => ({
    ...row,
    label: gapLabel(row.key),
    wins: row.favorite_wins,
    losses: row.underdog_wins,
  })),
)

const upsetRate = computed(() => {
  const totalsRow = gaps.value.reduce(
    (sum, row) => ({
      wins: sum.wins + row.wins,
      draws: sum.draws + row.draws,
      losses: sum.losses + row.losses,
    }),
    { wins: 0, draws: 0, losses: 0 },
  )
  return ratio(totalsRow.losses, finished(totalsRow))
})

const lengthBars = computed(() =>
  rows('length').map((row) => ({ key: row.key, label: lengthLabel(row.key), value: row.games })),
)
const ratingBars = computed(() =>
  rows('rating').map((row) => ({ key: row.key, label: row.key, value: row.games })),
)
const monthBars = computed(() =>
  monthSeries(rows('month')).map((month) => ({ ...month, label: monthLabel(month.key) })),
)

const errorRates = computed(() => {
  const all = totals.value
  if (!all || !all.accuracy_sides) return null
  return [
    { label: 'Accuracy', value: `${decimal(avgAccuracy(all))}%` },
    { label: 'Avg. centipawn loss', value: decimal(perPlayerGame(all, all.acpl_sum), 0) },
    { label: 'Inaccuracies per player', value: decimal(perPlayerGame(all, all.inaccuracies)) },
    { label: 'Mistakes per player', value: decimal(perPlayerGame(all, all.mistakes)) },
    { label: 'Blunders per player', value: decimal(perPlayerGame(all, all.blunders)) },
  ]
})

const leaderboards = computed(() => [
  { title: 'Most games', note: undefined, players: props.stats.players.most_active },
  {
    title: 'Best score',
    note: `Players with at least ${props.stats.leaderboard_min_games} games.`,
    players: props.stats.players.best_score,
  },
])

const playerLink = (player: LeaderboardEntry) => ({ query: { player: player.name } })
</script>

<template>
  <div v-if="!totals" class="text-center py-20 border-2 border-dashed border-gray-800 rounded-xl">
    <p class="text-gray-500">No games match these filters yet.</p>
  </div>

  <div v-else class="space-y-6">
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <StatTile v-for="tile in tiles" :key="tile.label" v-bind="tile" />
    </div>

    <div class="grid gap-6">
      <StatsCard
        title="By time mode"
        note="Results from White's side. The rating filter still applies."
      >
        <OutcomeTable :rows="byGameType" heading="Mode" show-moves show-accuracy />
      </StatsCard>
      <StatsCard title="By rating" note="A game's band is the average of both players' ratings.">
        <OutcomeTable :rows="byEloBand" heading="Band" show-moves show-accuracy />
      </StatsCard>
    </div>

    <StatsCard
      title="Draw rate by time mode and rating"
      note="All games, whatever the filters above."
    >
      <DrawHeatmap :matrix="stats.matrix" :bands="stats.bands" />
    </StatsCard>

    <div class="grid lg:grid-cols-2 gap-6">
      <StatsCard title="How games end">
        <OutcomeTable
          :rows="label(rows('termination'), terminationLabel)"
          heading="Ending"
          show-moves
        />
      </StatsCard>
      <StatsCard
        title="Favorites and upsets"
        :note="`The higher-rated player lost ${percent(upsetRate)} of games. Grouped by rating gap.`"
      >
        <OutcomeTable :rows="gaps" heading="Gap" :outcomes="['Favorite', 'Draw', 'Underdog']" />
      </StatsCard>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
      <StatsCard title="Game length" note="Full moves, in groups of ten.">
        <BarChart :bars="lengthBars" label="Games by length in moves" />
      </StatsCard>
      <StatsCard title="Rating distribution" note="Average rating of both players, per 100 points.">
        <BarChart v-if="ratingBars.length" :bars="ratingBars" label="Games by average rating" />
        <p v-else class="text-sm text-gray-500">No rated games.</p>
      </StatsCard>
    </div>

    <StatsCard title="Games played per month" note="By the date the game was played.">
      <BarChart v-if="monthBars.length" :bars="monthBars" label="Games played per month" />
      <p v-else class="text-sm text-gray-500">No dated games.</p>
    </StatsCard>

    <div class="grid lg:grid-cols-2 gap-6">
      <StatsCard title="Most played openings">
        <OutcomeTable
          :rows="label(rows('opening'), (eco) => `${eco} ${openingLabel(eco)}`)"
          heading="Opening"
        />
      </StatsCard>
      <div class="space-y-6 min-w-0">
        <StatsCard title="First moves" note="Games from the standard starting position.">
          <OutcomeTable :rows="label(rows('first_move'), (move) => `1. ${move}`)" heading="Move" />
        </StatsCard>
        <StatsCard title="Time controls">
          <OutcomeTable :rows="label(rows('time_control'), timeControlLabel)" heading="Control" />
        </StatsCard>
      </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
      <StatsCard
        title="Computer analysis"
        :note="`${count(totals.analyzed)} analyzed games. Averages are per player per game.`"
      >
        <dl v-if="errorRates" class="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div v-for="item in errorRates" :key="item.label">
            <dt class="text-xs text-gray-500">{{ item.label }}</dt>
            <dd class="mt-1 text-lg font-bold text-gray-100">{{ item.value }}</dd>
          </div>
        </dl>
        <p v-else class="text-sm text-gray-500">
          No game here has been analyzed yet. Open a game and run the analysis to add it.
        </p>
      </StatsCard>
      <StatsCard title="Where games come from">
        <OutcomeTable :rows="label(rows('source'), sourceLabel)" heading="Source" show-moves />
      </StatsCard>
    </div>

    <div class="grid lg:grid-cols-2 gap-6">
      <StatsCard
        v-for="board in leaderboards"
        :key="board.title"
        :title="board.title"
        :note="board.note"
      >
        <div class="overflow-x-auto">
          <table class="w-full min-w-[22rem] text-sm tabular-nums">
            <thead>
              <tr class="text-xs text-gray-500">
                <th scope="col" class="text-left font-medium pb-2 w-8">#</th>
                <th scope="col" class="text-left font-medium pb-2">Player</th>
                <th scope="col" class="text-right font-medium pb-2">Games</th>
                <th scope="col" class="text-right font-medium pb-2 pl-3">W / D / L</th>
                <th scope="col" class="text-right font-medium pb-2 pl-3">Score</th>
                <th scope="col" class="text-right font-medium pb-2 pl-3">Peak</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(player, index) in board.players"
                :key="player.player_key"
                class="border-t border-gray-800"
              >
                <td class="py-1.5 text-gray-500">{{ index + 1 }}</td>
                <th scope="row" class="py-1.5 text-left font-normal max-w-[12rem]">
                  <RouterLink
                    :to="playerLink(player)"
                    class="block truncate text-gray-200 hover:text-white hover:underline"
                    :title="player.name"
                    >{{ player.name }}</RouterLink
                  >
                </th>
                <td class="py-1.5 text-right text-gray-300">{{ count(player.games) }}</td>
                <td class="py-1.5 pl-3 text-right text-gray-400 whitespace-nowrap">
                  {{ player.wins }} / {{ player.draws }} / {{ player.losses }}
                </td>
                <td class="py-1.5 pl-3 text-right text-gray-300">{{ percent(player.score) }}</td>
                <td class="py-1.5 pl-3 text-right text-gray-300">
                  {{ player.peak_rating ?? '–' }}
                </td>
              </tr>
            </tbody>
          </table>
          <p v-if="board.players.length === 0" class="py-4 text-sm text-gray-500">
            No players qualify yet.
          </p>
        </div>
      </StatsCard>
    </div>
  </div>
</template>
