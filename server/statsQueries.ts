/** Request validation and result shaping for statistics. No I/O, so it can be unit tested. */
import { reportGame, sideToMove, type PositionEval } from '../src/services/moveScoring.ts'
import { GAME_TYPES } from './gameQueries.ts'

export const MAX_PLAYER_NAME = 64
const PLACEHOLDER_PLAYERS = ['anonymous', 'unknown']

export const MEASURES = [
  'games',
  'wins',
  'draws',
  'losses',
  'plies',
  'favorite_wins',
  'underdog_wins',
  'analyzed',
  'accuracy_sides',
  'accuracy_sum',
  'acpl_sum',
  'inaccuracies',
  'mistakes',
  'blunders',
] as const

type Measure = (typeof MEASURES)[number]
export type Measures = Record<Measure, number>
export type StatsRow = Measures & { key: string }
export type MatrixRow = Measures & { game_type: string; elo_band: string }

export interface StatsFilters {
  gameType: string | null
  eloBand: string | null
}

/** How each breakdown is sorted, and how many rows the page shows. */
const BREAKDOWNS: Record<string, { order: 'numeric' | 'alpha' | 'games'; limit?: number }> = {
  length: { order: 'numeric' },
  rating: { order: 'numeric' },
  gap: { order: 'numeric' },
  month: { order: 'alpha' },
  opening: { order: 'games', limit: 20 },
  opening_white: { order: 'games', limit: 12 },
  opening_black: { order: 'games', limit: 12 },
  first_move: { order: 'games', limit: 10 },
  time_control: { order: 'games', limit: 12 },
  opponent: { order: 'games', limit: 10 },
}

function single(value: unknown): string | null {
  const first = Array.isArray(value) ? value[0] : value
  return typeof first === 'string' && first.trim() ? first.trim().slice(0, 200) : null
}

export function parseStatsFilters(query: Record<string, unknown>): StatsFilters {
  const gameType = single(query.game_type)
  return {
    gameType: gameType && GAME_TYPES.includes(gameType) ? gameType : null,
    eloBand: single(query.elo_band), // Only ever a query parameter: an unknown band finds nothing
  }
}

/** The lookup key for a player, or null if the name can't belong to a real player. */
export function playerKey(name: unknown): string | null {
  const key = single(name)?.toLowerCase()
  if (!key || key.length > MAX_PLAYER_NAME || PLACEHOLDER_PLAYERS.includes(key)) return null
  return key
}

/** Makes a name prefix safe to use in a LIKE pattern. */
export function prefixPattern(prefix: string): string {
  return `${prefix.replace(/[\\%_]/g, '\\$&')}%`
}

export function emptyMeasures(): Measures {
  return Object.fromEntries(MEASURES.map((name) => [name, 0])) as Measures
}

function addMeasures(target: Measures, source: Measures): void {
  for (const name of MEASURES) target[name] += source[name]
}

/** Groups "dimension, bucket, measures" rows into sorted, capped lists per dimension. */
export function groupBreakdowns(
  rows: (Measures & { dimension: string; bucket: string })[],
): Record<string, StatsRow[]> {
  const groups: Record<string, StatsRow[]> = {}
  for (const { dimension, bucket, ...measures } of rows) {
    ;(groups[dimension] ??= []).push({ ...measures, key: bucket })
  }

  for (const [dimension, group] of Object.entries(groups)) {
    const { order, limit } = BREAKDOWNS[dimension] ?? { order: 'games' as const }
    group.sort((a, b) => {
      if (order === 'numeric') return Number(a.key) - Number(b.key)
      if (order === 'alpha') return a.key.localeCompare(b.key)
      return b.games - a.games || a.key.localeCompare(b.key)
    })
    if (limit) group.length = Math.min(limit, group.length)
  }
  return groups
}

function sumBy(rows: MatrixRow[], keyOf: (row: MatrixRow) => string): StatsRow[] {
  const totals = new Map<string, Measures>()
  for (const row of rows) {
    const key = keyOf(row)
    if (!totals.has(key)) totals.set(key, emptyMeasures())
    addMeasures(totals.get(key)!, row)
  }
  return [...totals].map(([key, measures]) => ({ ...measures, key }))
}

/**
 * The comparison tables, from the full time mode x rating band grid. Each one ignores its own
 * filter, so it can still be compared across its values while the other filter applies.
 */
export function summarizeMatrix(matrix: MatrixRow[], filters: StatsFilters) {
  return {
    by_game_type: sumBy(
      matrix.filter((row) => !filters.eloBand || row.elo_band === filters.eloBand),
      (row) => row.game_type,
    ),
    by_elo_band: sumBy(
      matrix.filter((row) => !filters.gameType || row.game_type === filters.gameType),
      (row) => row.elo_band,
    ),
  }
}

export interface AnalysisStats {
  white_accuracy: number | null
  black_accuracy: number | null
  white_acpl: number
  black_acpl: number
  white_inaccuracies: number
  black_inaccuracies: number
  white_mistakes: number
  black_mistakes: number
  white_blunders: number
  black_blunders: number
}

/** The per-game numbers saved for statistics, from the same scoring the game page shows. */
export function summarizeAnalysis(
  moves: string[],
  initialFen: string,
  evals: PositionEval[],
): AnalysisStats {
  const report = reportGame(moves, sideToMove(initialFen), evals)
  const movedWhite = report.moves.some((move) => move.color === 'white')
  const movedBlack = report.moves.some((move) => move.color === 'black')

  return {
    white_accuracy: movedWhite ? report.white.accuracy : null,
    black_accuracy: movedBlack ? report.black.accuracy : null,
    white_acpl: report.white.averageCpLoss,
    black_acpl: report.black.averageCpLoss,
    white_inaccuracies: report.white.inaccuracies,
    black_inaccuracies: report.black.inaccuracies,
    white_mistakes: report.white.mistakes,
    black_mistakes: report.black.mistakes,
    white_blunders: report.white.blunders,
    black_blunders: report.black.blunders,
  }
}
