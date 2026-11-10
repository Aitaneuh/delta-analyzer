/**
 * Grades moves from engine evaluations. The server uses this too, for site-wide statistics, so
 * it must not import anything: the production image only contains this one file from src/.
 * Win-percentage, accuracy and grade thresholds follow Lichess's published model.
 */
import type { EngineEval } from './engine'

export const MATE_SCORE = 10000

const INACCURACY_LOSS = 5
const MISTAKE_LOSS = 10
const BLUNDER_LOSS = 15
const MAX_COUNTED_CP = 1000

export type MoveGrade = 'inaccuracy' | 'mistake' | 'blunder'
export type Side = 'white' | 'black'

export interface PositionEval extends EngineEval {
  bestSan: string | null
}

export interface MoveReport {
  color: Side
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

/** White's winning chances, from 0 to 100. */
export function whiteWinPercent(cp: number): number {
  if (Math.abs(cp) >= MATE_SCORE) return cp > 0 ? 100 : 0
  return 50 + 50 * (2 / Math.PI) * Math.atan(0.00368208 * cp)
}

export function sideToMove(fen: string): Side {
  return fen.split(' ')[1] === 'w' ? 'white' : 'black'
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
  color: Side,
  before: PositionEval,
  after: PositionEval,
): MoveReport {
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
export function reportGame(
  sans: string[],
  firstToMove: Side,
  evals: PositionEval[],
): AnalysisReport {
  const secondToMove: Side = firstToMove === 'white' ? 'black' : 'white'
  const moves = sans
    .slice(0, Math.max(0, evals.length - 1))
    .map((san, index) =>
      reportMove(san, index % 2 ? secondToMove : firstToMove, evals[index]!, evals[index + 1]!),
    )

  return {
    moves,
    white: summarize(moves.filter((move) => move.color === 'white')),
    black: summarize(moves.filter((move) => move.color === 'black')),
  }
}
