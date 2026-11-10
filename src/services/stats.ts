/** Types and formatting for the Statistics page. Mirrors server/stats.ts. */
import { getEcoOpeningName } from '../data/ecoOpenings'

export interface StatsRow {
  key: string
  games: number
  // From White's side on the global page, from the player's side on a player's page
  wins: number
  draws: number
  losses: number
  plies: number
  favorite_wins: number
  underdog_wins: number
  analyzed: number
  accuracy_sides: number
  accuracy_sum: number
  acpl_sum: number
  inaccuracies: number
  mistakes: number
  blunders: number
}

export type MatrixRow = Omit<StatsRow, 'key'> & { game_type: string; elo_band: string }
export type Breakdowns = Partial<Record<string, StatsRow[]>>

export interface EloBand {
  key: string
  label: string
  min_elo: number | null
  max_elo: number | null
}

export interface LeaderboardEntry {
  player_key: string
  name: string
  games: number
  wins: number
  draws: number
  losses: number
  peak_rating: number | null
  score: number | null
}

export interface GlobalStats {
  perspective: 'white'
  refreshed_at: string | null
  bands: EloBand[]
  breakdowns: Breakdowns
  matrix: MatrixRow[]
  by_game_type: StatsRow[]
  by_elo_band: StatsRow[]
  players: { total: number; most_active: LeaderboardEntry[]; best_score: LeaderboardEntry[] }
  leaderboard_min_games: number
}

export interface PlayerRating {
  game_type: string
  games: number
  peak: number | null
  latest: number | null
  first_played: string | null
  last_played: string | null
}

export interface PlayerStats {
  perspective: 'player'
  name: string
  bands: EloBand[]
  breakdowns: Breakdowns
  ratings: PlayerRating[]
  rating_history: { game_type: string; month: string; rating: number }[]
}

export const GAME_TYPES = ['bullet', 'blitz', 'rapid', 'classical', 'unknown'] as const

const GAME_TYPE_LABELS: Record<string, string> = {
  bullet: 'Bullet',
  blitz: 'Blitz',
  rapid: 'Rapid',
  classical: 'Classical',
  unknown: 'No time control',
}

const TERMINATION_LABELS: Record<string, string> = {
  mate: 'Checkmate',
  resign: 'Resignation',
  time: 'Timeout',
  draw: 'Draw',
  other: 'Other',
  unknown: 'Not recorded',
}

const SOURCE_LABELS: Record<string, string> = {
  lichess: 'Lichess',
  'chess.com': 'Chess.com',
  unknown: 'Other',
}

/** Series colors, validated for the dark surface. Each time mode keeps its color everywhere. */
export const GAME_TYPE_COLORS: Record<string, string> = {
  bullet: '#3987e5',
  blitz: '#d95926',
  rapid: '#199e70',
  classical: '#c98500',
}

/** The two sides of a result and the neutral draw between them. */
export const OUTCOME_COLORS = { wins: '#3987e5', draws: '#71717a', losses: '#d95926' }

const SHORT_MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')

export const gameTypeLabel = (key: string) => GAME_TYPE_LABELS[key] ?? key
export const terminationLabel = (key: string) => TERMINATION_LABELS[key] ?? key
export const sourceLabel = (key: string) => SOURCE_LABELS[key] ?? key
export const openingLabel = (eco: string) => getEcoOpeningName(eco) ?? eco

/** A band's rating range, such as "800–1199". Empty for the unrated band. */
export function bandRange(band: EloBand): string {
  if (band.min_elo === null) return ''
  if (band.max_elo === null) return `${band.min_elo}+`
  if (band.min_elo === 0) return `<${band.max_elo}`
  return `${band.min_elo}–${band.max_elo - 1}`
}

export function bandLabel(band: EloBand | undefined, key: string): string {
  if (!band) return key
  if (band.min_elo === null) return band.label
  if (band.max_elo === null) return `${band.label} (${band.min_elo}+)`
  if (band.min_elo === 0) return `${band.label} (<${band.max_elo})`
  return `${band.label} (${band.min_elo}–${band.max_elo - 1})`
}

export function lengthLabel(key: string): string {
  const start = Number(key)
  return start >= 80 ? '80+' : `${start}–${start + 9}`
}

export function gapLabel(key: string): string {
  return (
    { '0': '< 50', '50': '50–99', '100': '100–199', '200': '200–399', '400': '400+' }[key] ?? key
  )
}

/** "300+3" becomes "5+3", "600" becomes "10 min". Other formats are shown as written. */
export function timeControlLabel(key: string): string {
  const match = key.match(/^(\d+)(?:\+(\d+))?$/)
  if (!match) return key
  const minutes = Number(match[1]) / 60
  const base = Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1).replace(/\.0$/, '')
  return match[2] === undefined ? `${base} min` : `${base}+${match[2]}`
}

export function monthLabel(month: string): string {
  const [year, number] = month.split('-')
  return `${SHORT_MONTHS[Number(number) - 1] ?? number} ${year?.slice(2)}`
}

export const finished = (row: Pick<StatsRow, 'wins' | 'draws' | 'losses'>) =>
  row.wins + row.draws + row.losses

export const ratio = (part: number, whole: number): number | null => (whole ? part / whole : null)

/** Points per finished game from the row's side: a win is 1, a draw is half. */
export const scoreOf = (row: Pick<StatsRow, 'wins' | 'draws' | 'losses'>) =>
  ratio(row.wins + row.draws / 2, finished(row))

export const avgMoves = (row: StatsRow) => ratio(row.plies / 2, row.games)
export const avgAccuracy = (row: StatsRow) => ratio(row.accuracy_sum, row.accuracy_sides)
export const perPlayerGame = (row: StatsRow, value: number) => ratio(value, row.accuracy_sides)

export function percent(value: number | null, digits = 1): string {
  return value === null ? '–' : `${(value * 100).toFixed(digits)}%`
}

export function decimal(value: number | null, digits = 1): string {
  return value === null ? '–' : value.toFixed(digits)
}

const numberFormat = new Intl.NumberFormat('en-US')
export const count = (value: number) => numberFormat.format(value)

/**
 * Up to `length` consecutive months ending at the latest month with games, with empty months
 * filled in. Months after the current one (from a wrong date in a PGN) are left out.
 */
export function monthSeries(rows: StatsRow[], length = 36, now = new Date()) {
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const games = new Map(rows.filter((row) => row.key <= current).map((row) => [row.key, row.games]))
  const latest = [...games.keys()].sort().pop()
  if (!latest) return []

  const earliest = [...games.keys()].sort()[0]!
  const series: { key: string; value: number }[] = []
  let [year, month] = latest.split('-').map(Number) as [number, number]
  for (let i = 0; i < length; i++) {
    const key = `${year}-${String(month).padStart(2, '0')}`
    if (key < earliest) break
    series.unshift({ key, value: games.get(key) ?? 0 })
    month -= 1
    if (month === 0) [year, month] = [year - 1, 12]
  }
  return series
}

/** Accepts only a single string query value. */
export function queryText(value: unknown): string {
  const single = Array.isArray(value) ? value[0] : value
  return typeof single === 'string' ? single : ''
}
