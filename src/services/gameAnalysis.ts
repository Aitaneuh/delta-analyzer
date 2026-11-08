/**
 * Turns engine evaluations into move grades and per-player statistics.
 * Win-percentage, accuracy and grade thresholds follow Lichess's published model.
 */
import { Chess } from 'chessops/chess'
import { parseFen } from 'chessops/fen'
import { makeSan } from 'chessops/san'
import { parseUci } from 'chessops/util'
import { MATE_SCORE, type EngineEval, type EngineLimits, type PositionEvaluator } from './engine'
import type { BoardPosition } from './pgnParser'

export const ENGINE_NAME = 'Stockfish 19 lite'
export const ANALYSIS_LIMITS: EngineLimits = { depth: 14, moveTimeMs: 2000 }

const INACCURACY_LOSS = 5
const MISTAKE_LOSS = 10
const BLUNDER_LOSS = 15
const MAX_COUNTED_CP = 1000

export type MoveGrade = 'inaccuracy' | 'mistake' | 'blunder'

export interface PositionEval extends EngineEval {
  bestSan: string | null
}

export interface GameAnalysis {
  engine: string
  depth: number
  evals: PositionEval[]
}

export interface MoveReport {
  color: 'white' | 'black'
  grade: MoveGrade | null
  cpLoss: number
  accuracy: number
}

export interface PlayerReport {
  accuracy: number
  averageCpLoss: number
  inaccuracies: number
  mistakes: number
  blunders: number
}

export interface AnalysisReport {
  moves: MoveReport[]
  white: PlayerReport
  black: PlayerReport
}

export const GRADE_SYMBOLS: Record<MoveGrade, string> = {
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
}

/** White's winning chances, from 0 to 100. */
export function whiteWinPercent(cp: number): number {
  if (Math.abs(cp) >= MATE_SCORE) return cp > 0 ? 100 : 0
  return 50 + 50 * (2 / Math.PI) * Math.atan(0.00368208 * cp)
}

export function formatEval(evaluation: Pick<EngineEval, 'cp' | 'mate'>): string {
  const { cp, mate } = evaluation
  if (mate === 0) return '#'
  if (mate !== null) return mate > 0 ? `#${mate}` : `#-${-mate}`
  return `${cp >= 0 ? '+' : ''}${(cp / 100).toFixed(2)}`
}

/** Variants need engines and rules that this analysis doesn't support. */
export function isAnalyzable(pgn: string): boolean {
  const variant = pgn.match(/\[Variant\s+"([^"]*)"\]/i)?.[1]?.toLowerCase()
  return !variant || variant === 'standard' || variant === 'from position'
}

function uciToSan(fen: string, uci: string | null): string | null {
  const move = uci ? parseUci(uci) : undefined
  const setup = parseFen(fen)
  if (!move || setup.isErr) return null

  const position = Chess.fromSetup(setup.value)
  return position.isOk ? makeSan(position.value, move) : null
}

/** Evaluates each position in order. Stops early if the evaluator is terminated. */
export async function evaluatePositions(
  positions: BoardPosition[],
  evaluator: PositionEvaluator,
  onEval: (evaluation: PositionEval) => void,
): Promise<void> {
  for (const { fen } of positions) {
    const evaluation = await evaluator.evaluate(fen, ANALYSIS_LIMITS)
    onEval({ ...evaluation, bestSan: uciToSan(fen, evaluation.best) })
  }
}

const bareSan = (san: string | null) => san?.replace(/[+#!?]/g, '') ?? null
const clampCp = (cp: number) => Math.min(MAX_COUNTED_CP, Math.max(-MAX_COUNTED_CP, cp))

function gradeFor(winLoss: number): MoveGrade | null {
  if (winLoss >= BLUNDER_LOSS) return 'blunder'
  if (winLoss >= MISTAKE_LOSS) return 'mistake'
  if (winLoss >= INACCURACY_LOSS) return 'inaccuracy'
  return null
}

function reportMove(
  san: string,
  fen: string,
  before: PositionEval,
  after: PositionEval,
): MoveReport {
  const color = fen.split(' ')[1] === 'w' ? 'white' : 'black'
  const sign = color === 'white' ? 1 : -1

  const winBefore =
    color === 'white' ? whiteWinPercent(before.cp) : 100 - whiteWinPercent(before.cp)
  const winAfter = color === 'white' ? whiteWinPercent(after.cp) : 100 - whiteWinPercent(after.cp)
  const winLoss = Math.max(0, winBefore - winAfter)
  const accuracy = 103.1668 * Math.exp(-0.04354 * winLoss) - 3.1669 + 1

  return {
    color,
    // Playing the engine's own move can't be an error, even if a later search disagrees
    grade: bareSan(san) === bareSan(before.bestSan) ? null : gradeFor(winLoss),
    cpLoss: Math.max(0, sign * (clampCp(before.cp) - clampCp(after.cp))),
    accuracy: Math.min(100, Math.max(0, accuracy)),
  }
}

function summarize(moves: MoveReport[]): PlayerReport {
  const count = (grade: MoveGrade) => moves.filter((move) => move.grade === grade).length
  const total = moves.length || 1

  const mean = moves.reduce((sum, move) => sum + move.accuracy, 0) / total
  const harmonic = total / moves.reduce((sum, move) => sum + 1 / Math.max(1, move.accuracy), 0)

  return {
    accuracy: moves.length ? (mean + harmonic) / 2 : 0,
    averageCpLoss: moves.reduce((sum, move) => sum + move.cpLoss, 0) / total,
    inaccuracies: count('inaccuracy'),
    mistakes: count('mistake'),
    blunders: count('blunder'),
  }
}

/** Builds the report for every move whose before and after positions have been evaluated. */
export function buildReport(
  sans: string[],
  positions: BoardPosition[],
  evals: PositionEval[],
): AnalysisReport {
  const moves = sans
    .slice(0, Math.max(0, evals.length - 1))
    .map((san, index) => reportMove(san, positions[index]!.fen, evals[index]!, evals[index + 1]!))

  return {
    moves,
    white: summarize(moves.filter((move) => move.color === 'white')),
    black: summarize(moves.filter((move) => move.color === 'black')),
  }
}
