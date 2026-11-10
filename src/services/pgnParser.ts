/**
 * PGN Parser - Extracts metadata and moves from Chess.com/Lichess PGN text
 */
import { chessgroundMove } from 'chessops/compat'
import { makeFen } from 'chessops/fen'
import {
  emptyHeaders,
  makePgn,
  parsePgn,
  startingPosition,
  type Game,
  type PgnNodeData,
} from 'chessops/pgn'
import { parseSan } from 'chessops/san'
import type { Color, SquareName } from 'chessops/types'
import type { GameAnalysis } from './gameAnalysis'

export type TerminationType = 'mate' | 'resign' | 'time' | 'draw' | 'other'

export interface ParsedGame {
  id: string
  source: 'chess.com' | 'lichess' | 'unknown'
  link: string | null
  event: string
  played_date: string | null // YYYY-MM-DD
  imported_date: string

  // Players
  white_player: string
  black_player: string
  white_elo: number | null
  black_elo: number | null
  white_country: string | null
  black_country: string | null
  white_avatar: string | null
  black_avatar: string | null

  // Result
  result: '1-0' | '0-1' | '1/2-1/2' | '*'
  termination: string | null
  termination_type: TerminationType | null
  winner: 'white' | 'black' | 'draw' | null

  // Time control
  time_control: string | null
  game_type: 'bullet' | 'blitz' | 'rapid' | 'classical' | 'unknown'

  // Opening
  eco_code: string | null
  opening_name: string | null

  // Technical
  pgn: string
  initial_fen: string
  final_fen: string | null

  // Analysis
  moves_count: number
  has_annotations: boolean
  moves: string[] // SAN notation moves only
  analysis?: GameAnalysis // Set once a computer analysis has finished
}

/** The fields shown in the Explore list. Accuracy is null until the game has been analyzed. */
export type GameSummary = GameListFields & {
  analyzed: boolean
  white_accuracy: number | null
  black_accuracy: number | null
}

type GameListFields = Pick<
  ParsedGame,
  | 'id'
  | 'source'
  | 'event'
  | 'played_date'
  | 'imported_date'
  | 'white_player'
  | 'black_player'
  | 'white_elo'
  | 'black_elo'
  | 'result'
  | 'winner'
  | 'termination_type'
  | 'time_control'
  | 'game_type'
  | 'eco_code'
  | 'opening_name'
>

/** The board after a given ply. Index 0 is the starting position. */
export interface BoardPosition {
  fen: string
  lastMove: SquareName[] | null
  check: Color | false
}

const VALID_RESULTS = ['1-0', '0-1', '1/2-1/2', '*'] as const

function generateGameId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/** Tag lookup that ignores case and treats PGN placeholders ("?", "-") as missing. */
function createTagReader(headers: Map<string, string>) {
  const tags = new Map([...headers].map(([key, value]) => [key.toLowerCase(), value.trim()]))
  return (name: string): string | null => {
    const value = tags.get(name.toLowerCase())
    return value && value !== '?' && value !== '-' ? value : null
  }
}

function determineSource(site: string | null, link: string | null): ParsedGame['source'] {
  const origin = `${site ?? ''} ${link ?? ''}`.toLowerCase()
  if (origin.includes('chess.com')) return 'chess.com'
  if (origin.includes('lichess')) return 'lichess'
  return 'unknown'
}

function calculateWinner(result: string): ParsedGame['winner'] {
  if (result === '1-0') return 'white'
  if (result === '0-1') return 'black'
  if (result === '1/2-1/2') return 'draw'
  return null
}

/** Estimates the game type from a time control such as "300", "180+2" or "600+0". */
function determineGameType(timeControl: string | null): ParsedGame['game_type'] {
  const match = timeControl?.match(/^(\d+)(?:\+(\d+))?$/)
  if (!match) return 'unknown'

  const baseTime = parseInt(match[1]!, 10)
  const increment = match[2] ? parseInt(match[2], 10) : 0

  // Total estimated time (base + 40 moves * increment)
  const estimatedTotal = baseTime + 40 * increment

  if (estimatedTotal < 180) return 'bullet' // < 3 min
  if (estimatedTotal < 600) return 'blitz' // < 10 min
  if (estimatedTotal < 1500) return 'rapid' // < 25 min
  return 'classical'
}

/** Maps the free-form Termination tag from each site onto one filterable category. */
function classifyTermination(
  termination: string | null,
  lastMove: string | undefined,
  winner: ParsedGame['winner'],
): TerminationType | null {
  const text = termination?.toLowerCase() ?? ''

  if (lastMove?.endsWith('#') || text.includes('checkmate')) return 'mate'
  if (text.includes('resign')) return 'resign'
  if (text.includes('time')) return 'time'
  if (winner === 'draw' || text.includes('drawn')) return 'draw'
  // Lichess writes "Normal" for any decisive game that didn't end by mate or on time.
  if (text === 'normal' && winner) return 'resign'
  return termination ? 'other' : null
}

/** Converts "2025.09.02" to "2025-09-02". Partial dates ("2025.??.??") become null. */
function normalizeDate(date: string | null): string | null {
  const match = date?.match(/^(\d{4})[.-](\d{2})[.-](\d{2})$/)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null
}

function parseElo(elo: string | null): number | null {
  const parsed = elo ? parseInt(elo, 10) : NaN
  return Number.isNaN(parsed) ? null : parsed
}

/** Links come from user-supplied text, so anything other than http(s) is dropped. */
function safeLink(url: string | null): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null
}

function openingFromEcoUrl(ecoUrl: string | null): string | null {
  // e.g. .../openings/Sicilian-Defense-Cowboy-Attack-2...d6-3.Bb2-Nf6
  const slug = ecoUrl?.match(/\/openings\/([^/?]+)/)?.[1]
  return slug ? slug.replace(/\.\.\./g, ', ').replace(/-/g, ' ') : null
}

/** Plays through a game's main line, rejecting illegal moves. */
function replayGame(game: Game<PgnNodeData>): { moves: string[]; positions: BoardPosition[] } {
  const start = startingPosition(game.headers)
  if (start.isErr) throw new Error('The PGN has an invalid starting position.')

  const position = start.value
  const moves: string[] = []
  const positions: BoardPosition[] = [
    { fen: makeFen(position.toSetup()), lastMove: null, check: false },
  ]

  for (const node of game.moves.mainline()) {
    const move = parseSan(position, node.san)
    if (!move) {
      const moveNumber = Math.floor(moves.length / 2) + 1
      throw new Error(`Illegal move "${node.san}" at move ${moveNumber}.`)
    }

    position.play(move)
    moves.push(node.san)
    positions.push({
      fen: makeFen(position.toSetup()),
      lastMove: chessgroundMove(move),
      check: position.isCheck() ? position.turn : false,
    })
  }

  return { moves, positions }
}

/** Recomputes every board position for a stored game. */
export function computePositions(pgn: string): BoardPosition[] {
  const [game] = parsePgn(pgn, emptyHeaders)
  if (!game) throw new Error('The stored PGN is empty.')
  return replayGame(game).positions
}

function toParsedGame(game: Game<PgnNodeData>): ParsedGame {
  const tag = createTagReader(game.headers)
  const { moves, positions } = replayGame(game)

  const resultTag = tag('Result')
  const result = VALID_RESULTS.find((valid) => valid === resultTag) ?? '*'
  const winner = calculateWinner(result)
  const timeControl = tag('TimeControl')
  const termination = tag('Termination')
  const site = tag('Site')
  const link = safeLink(tag('Link')) ?? safeLink(site)

  let hasAnnotations = false
  for (const node of game.moves.mainlineNodes()) {
    if (node.data.comments?.length || node.data.nags?.length || node.children.length > 1) {
      hasAnnotations = true
      break
    }
  }

  return {
    id: generateGameId(),
    source: determineSource(site, link),
    link,
    event: tag('Event') ?? 'Unknown Event',
    played_date: normalizeDate(tag('UTCDate') ?? tag('Date')),
    imported_date: new Date().toISOString(),

    white_player: tag('White') ?? 'Unknown',
    black_player: tag('Black') ?? 'Unknown',
    white_elo: parseElo(tag('WhiteElo')),
    black_elo: parseElo(tag('BlackElo')),
    white_country: tag('WhiteCountry'),
    black_country: tag('BlackCountry'),
    white_avatar: tag('WhiteUrl'),
    black_avatar: tag('BlackUrl'),

    result,
    termination,
    termination_type: classifyTermination(termination, moves[moves.length - 1], winner),
    winner,

    time_control: timeControl,
    game_type: determineGameType(timeControl),

    eco_code: tag('ECO'),
    opening_name: tag('Opening') ?? openingFromEcoUrl(tag('ECOUrl')),

    pgn: makePgn(game),
    initial_fen: positions[0]!.fen,
    final_fen: positions[positions.length - 1]!.fen,

    moves_count: moves.length,
    has_annotations: hasAnnotations,
    moves,
  }
}

/**
 * Parses PGN text into games. A single file can hold many games.
 * Throws an Error with a user-readable message if any game is invalid.
 */
export function parsePGN(pgnText: string, options: { skipInvalid?: boolean } = {}): ParsedGame[] {
  const games = parsePgn(pgnText, emptyHeaders).filter(
    (game) => game.headers.size > 0 || game.moves.children.length > 0,
  )
  if (games.length === 0) throw new Error('No chess game was found in this PGN.')

  return games.flatMap((game, index) => {
    try {
      return [toParsedGame(game)]
    } catch (err) {
      if (options.skipInvalid) return []
      const reason = err instanceof Error ? err.message : 'Invalid PGN.'
      throw new Error(games.length > 1 ? `Game ${index + 1}: ${reason}` : reason)
    }
  })
}
