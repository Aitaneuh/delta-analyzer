/**
 * Turns engine evaluations into move grades and per-player statistics.
 * Win-percentage, accuracy and grade thresholds follow Lichess's published model.
 */
import { Chess } from 'chessops/chess'
import { parseFen } from 'chessops/fen'
import { makeSan } from 'chessops/san'
import { parseUci } from 'chessops/util'
import type { EngineEval, EngineLimits, PositionEvaluator } from './engine'
import {
  reportGame,
  sideToMove,
  type AnalysisReport,
  type MoveGrade,
  type PositionEval,
} from './moveScoring'
import type { BoardPosition } from './pgnParser'

export { whiteWinPercent } from './moveScoring'
export type {
  AnalysisReport,
  MoveGrade,
  MoveReport,
  PlayerReport,
  PositionEval,
} from './moveScoring'

export const ENGINE_NAME = 'Stockfish 19 lite'
export const ANALYSIS_LIMITS: EngineLimits = { depth: 14, moveTimeMs: 2000 }

export interface GameAnalysis {
  engine: string
  depth: number
  evals: PositionEval[]
}

export const GRADE_SYMBOLS: Record<MoveGrade, string> = {
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
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

/** Builds the report for every move whose before and after positions have been evaluated. */
export function buildReport(
  sans: string[],
  positions: BoardPosition[],
  evals: PositionEval[],
): AnalysisReport {
  return reportGame(sans, sideToMove(positions[0]!.fen), evals)
}
