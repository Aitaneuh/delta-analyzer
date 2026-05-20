/**
 * PGN Parser - Extracts all metadata and moves from Chess.com/Lichess PGN strings
 */

export interface ParsedGame {
  id: string
  source: 'chess.com' | 'lichess' | 'unknown'
  link: string | null
  event: string
  played_date: string | null
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
}

/**
 * Generate a unique game ID
 */
function generateGameId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Extract tag value from PGN headers
 */
function extractTag(pgn: string, tagName: string): string | null {
  const regex = new RegExp(`\\[${tagName}\\s+"([^"]*)"\\]`, 'i')
  const match = pgn.match(regex)
  return match ? match[1] : null
}

/**
 * Determine source (Chess.com vs Lichess)
 */
function determineSource(pgn: string): 'chess.com' | 'lichess' | 'unknown' {
  const site = extractTag(pgn, 'Site')?.toLowerCase() || ''

  if (site.includes('chess.com')) return 'chess.com'
  if (site.includes('lichess')) return 'lichess'

  return 'unknown'
}

/**
 * Calculate winner from result
 */
function calculateWinner(result: string): 'white' | 'black' | 'draw' | null {
  if (result === '1-0') return 'white'
  if (result === '0-1') return 'black'
  if (result === '1/2-1/2') return 'draw'
  return null
}

/**
 * Determine game type from time control
 */
function determineGameType(
  timeControl: string | null,
): 'bullet' | 'blitz' | 'rapid' | 'classical' | 'unknown' {
  if (!timeControl) return 'unknown'

  // Parse time control (e.g., "300", "180+2", "600+0")
  const match = timeControl.match(/^(\d+)(?:\+(\d+))?$/)
  if (!match) return 'unknown'

  const baseTime = parseInt(match[1], 10)
  const increment = match[2] ? parseInt(match[2], 10) : 0

  // Total estimated time (base + 40 moves * increment)
  const estimatedTotal = baseTime + 40 * increment

  if (estimatedTotal < 180) return 'bullet' // < 3 min
  if (estimatedTotal < 600) return 'blitz' // < 10 min
  if (estimatedTotal < 1500) return 'rapid' // < 25 min
  return 'classical'
}

/**
 * Extract moves from PGN movetext
 */
function extractMoves(pgn: string): { moves: string[]; hasAnnotations: boolean } {
  // Find the movetext section (after all headers)
  const lines = pgn.split('\n')
  const movetextStart = lines.findIndex((line) => !line.startsWith('[') && line.trim() !== '')

  if (movetextStart === -1) {
    return { moves: [], hasAnnotations: false }
  }

  const movetext = lines.slice(movetextStart).join(' ')

  // Check for annotations
  const hasAnnotations = /\$\d+|[!?]{1,2}|\{[^}]*\}/.test(movetext)

  // Remove comments, variations, and annotations
  let cleaned = movetext
    .replace(/\{[^}]*\}/g, '') // Remove {...} comments
    .replace(/\([^)]*\)/g, '') // Remove (...) variations
    .replace(/\$\d+/g, '') // Remove $N annotations
    .replace(/[!?]+/g, '') // Remove !, ?, !!, etc.
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()

  // Remove result markers
  cleaned = cleaned.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '')

  // Extract moves (remove move numbers)
  const moves: string[] = []
  const tokens = cleaned.split(/\s+/)

  for (const token of tokens) {
    // Skip move numbers (e.g., "1.", "10.", etc.)
    if (/^\d+\.+$/.test(token)) continue

    // Valid move (starts with piece letter, pawn move, or castle)
    if (
      /^[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](=[NBRQ])?[+#]?$/.test(token) ||
      /^O-O(-O)?[+#]?$/.test(token)
    ) {
      moves.push(token)
    }
  }

  return { moves, hasAnnotations }
}

/**
 * Parse PGN string into structured game object
 */
export function parsePGN(pgnText: string): ParsedGame {
  const id = generateGameId()
  const source = determineSource(pgnText)

  // Extract all metadata
  const event = extractTag(pgnText, 'Event') || 'Unknown Event'
  const site = extractTag(pgnText, 'Site')
  const date = extractTag(pgnText, 'Date')
  const utcDate = extractTag(pgnText, 'UTCDate')
  const whitePlayer = extractTag(pgnText, 'White') || 'Unknown'
  const blackPlayer = extractTag(pgnText, 'Black') || 'Unknown'
  const whiteElo = extractTag(pgnText, 'WhiteElo')
  const blackElo = extractTag(pgnText, 'BlackElo')
  const result = extractTag(pgnText, 'Result') || '*'
  const timeControl = extractTag(pgnText, 'TimeControl')
  const ecoCode = extractTag(pgnText, 'ECO')
  const opening = extractTag(pgnText, 'Opening')
  const termination = extractTag(pgnText, 'Termination')
  const link = extractTag(pgnText, 'Link')
  const initialFen =
    extractTag(pgnText, 'FEN') || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  const finalFen = extractTag(pgnText, 'CurrentPosition')

  // Chess.com specific
  const whiteCountry = extractTag(pgnText, 'WhiteCountry')
  const blackCountry = extractTag(pgnText, 'BlackCountry')
  const whiteUrl = extractTag(pgnText, 'WhiteUrl')
  const blackUrl = extractTag(pgnText, 'BlackUrl')

  // Extract ECO URL for opening name if Opening tag is missing
  let openingName = opening
  if (!openingName && source === 'chess.com') {
    const ecoUrl = extractTag(pgnText, 'ECOUrl')
    if (ecoUrl) {
      // Extract opening name from URL like .../Sicilian-Defense-Cowboy-Attack-2...d6-3.Bb2-Nf6
      const match = ecoUrl.match(/\/openings\/([^/?]+)/)
      if (match) {
        openingName = match[1].replace(/-/g, ' ').replace(/\.\.\./g, ', ')
      }
    }
  }

  // Extract moves
  const { moves, hasAnnotations } = extractMoves(pgnText)

  return {
    id,
    source,
    link,
    event,
    played_date: utcDate || date,
    imported_date: new Date().toISOString(),

    white_player: whitePlayer,
    black_player: blackPlayer,
    white_elo: whiteElo ? parseInt(whiteElo, 10) : null,
    black_elo: blackElo ? parseInt(blackElo, 10) : null,
    white_country: whiteCountry,
    black_country: blackCountry,
    white_avatar: whiteUrl,
    black_avatar: blackUrl,

    result: result as '1-0' | '0-1' | '1/2-1/2' | '*',
    termination,
    winner: calculateWinner(result),

    time_control: timeControl,
    game_type: determineGameType(timeControl),

    eco_code: ecoCode,
    opening_name: openingName,

    pgn: pgnText,
    initial_fen: initialFen,
    final_fen: finalFen,

    moves_count: moves.length,
    has_annotations: hasAnnotations,
    moves,
  }
}
