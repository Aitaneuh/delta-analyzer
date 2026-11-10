/** Request validation and SQL building for games. No I/O, so it can be unit tested directly. */
import { createHash } from 'node:crypto'
import type { ParsedGame } from '../src/services/pgnParser.ts'

export const PAGE_SIZE = 25

export const GAME_TYPES = ['bullet', 'blitz', 'rapid', 'classical', 'unknown']
const RESULTS = ['1-0', '0-1', '1/2-1/2', '*']
const TERMINATIONS = ['mate', 'resign', 'time', 'draw', 'other']
const MAX_CP = 10000
const UCI_MOVE = /^[a-h][1-8][a-h][1-8][qrbn]?$/

export interface GameListQuery {
  where: string
  params: unknown[]
  page: number
}

type Query = Record<string, unknown>

function text(value: unknown): string {
  const single = Array.isArray(value) ? value[0] : value
  return typeof single === 'string' ? single.trim().slice(0, 200) : ''
}

function allowed(value: unknown, options: string[]): string[] {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value]
  return values.filter((item): item is string => options.includes(item as string))
}

function integer(value: unknown): number | null {
  const parsed = Number(text(value))
  return text(value) !== '' && Number.isInteger(parsed) && Math.abs(parsed) < 100000 ? parsed : null
}

function isoDate(value: unknown): string | null {
  const date = text(value)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) ? date : null
}

/** Makes user text safe to use inside a LIKE pattern. */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

/** Turns the Explore page's filters into a parameterized WHERE clause. */
export function buildGameListQuery(query: Query): GameListQuery {
  const conditions: string[] = []
  const params: unknown[] = []
  const add = (value: unknown) => `$${params.push(value)}`

  const event = text(query.game_name)
  if (event) conditions.push(`event ILIKE ${add(`%${escapeLike(event)}%`)}`)

  const player = text(query.player_name)
  if (player) {
    const pattern = add(`%${escapeLike(player)}%`)
    conditions.push(`(white_player ILIKE ${pattern} OR black_player ILIKE ${pattern})`)
  }

  const types = allowed(query.game_types, GAME_TYPES)
  if (types.length) conditions.push(`game_type = ANY(${add(types)})`)

  const results = allowed(query.results, RESULTS)
  if (results.length) conditions.push(`result = ANY(${add(results)})`)

  const terminations = allowed(query.terminations, TERMINATIONS)
  if (terminations.length) conditions.push(`termination_type = ANY(${add(terminations)})`)

  const eco = text(query.eco_code).toUpperCase()
  if (eco) conditions.push(`eco_code LIKE ${add(`${escapeLike(eco)}%`)}`)

  // At least one player must reach the minimum, and no player may exceed the maximum
  const minElo = integer(query.min_elo)
  if (minElo !== null) {
    const min = add(minElo)
    conditions.push(`(white_elo >= ${min} OR black_elo >= ${min})`)
  }
  const maxElo = integer(query.max_elo)
  if (maxElo !== null) {
    const max = add(maxElo)
    conditions.push(
      `(white_elo IS NULL OR white_elo <= ${max}) AND (black_elo IS NULL OR black_elo <= ${max})`,
    )
  }

  const kind = text(query.time_control_kind)
  if (kind === 'increment') conditions.push(`time_control ~ '\\+[1-9]'`)
  if (kind === 'standard') {
    conditions.push(`time_control IS NOT NULL AND time_control !~ '\\+[1-9]'`)
  }

  const played = isoDate(query.played_date)
  if (played) conditions.push(`played_date = ${add(played)}`)

  const imported = isoDate(query.imported_date)
  if (imported) conditions.push(`imported_at::date = ${add(imported)}`)

  if (text(query.analyzed_only) === 'true') {
    conditions.push('EXISTS (SELECT 1 FROM game_analyses a WHERE a.game_id = games.id)')
  }

  return {
    where: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    params,
    page: Math.max(1, integer(query.page) ?? 1),
  }
}

/** Identifies a game regardless of who uploaded it or how its PGN was formatted. */
export function contentHash(game: ParsedGame): string {
  const identity = [
    game.white_player.toLowerCase(),
    game.black_player.toLowerCase(),
    game.played_date ?? '',
    game.time_control ?? '',
    game.initial_fen,
    game.moves.join(' '),
  ].join('|')
  return createHash('sha256').update(identity).digest('hex')
}

/** Removes every trace of a username from a PGN, keeping the moves. */
export function anonymizePgn(pgn: string, username: string, replacement: string): string {
  const name = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return pgn
    .replace(new RegExp(`\\[(White|Black) "${name}"\\]`, 'gi'), `[$1 "${replacement}"]`)
    .replace(/^\[(Site|Link|GameId|WhiteUrl|BlackUrl) "[^"]*"\]\r?\n/gim, '')
}

export interface StoredAnalysis {
  engine: string
  depth: number
  evals: { cp: number; mate: number | null; best: string | null; bestSan: string | null }[]
}

/** Checks the shape of a browser-computed analysis. Returns null if it isn't valid. */
export function parseAnalysis(body: unknown, movesCount: number): StoredAnalysis | null {
  if (typeof body !== 'object' || body === null) return null
  const { engine, depth, evals } = body as Record<string, unknown>

  if (typeof engine !== 'string' || engine.length === 0 || engine.length > 40) return null
  if (!Number.isInteger(depth) || (depth as number) < 1 || (depth as number) > 60) return null
  if (!Array.isArray(evals) || evals.length !== movesCount + 1) return null

  const cleaned: StoredAnalysis['evals'] = []
  for (const item of evals) {
    if (typeof item !== 'object' || item === null) return null
    const { cp, mate, best, bestSan } = item as Record<string, unknown>

    if (!Number.isInteger(cp) || Math.abs(cp as number) > MAX_CP) return null
    if (mate !== null && (!Number.isInteger(mate) || Math.abs(mate as number) > 500)) return null
    if (best !== null && (typeof best !== 'string' || !UCI_MOVE.test(best))) return null
    if (bestSan !== null && (typeof bestSan !== 'string' || bestSan.length > 12)) return null

    cleaned.push({
      cp: cp as number,
      mate: mate as number | null,
      best: best as string | null,
      bestSan: bestSan as string | null,
    })
  }

  return { engine, depth: depth as number, evals: cleaned }
}
