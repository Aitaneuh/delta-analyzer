import { describe, it, expect } from 'vitest'
import { MATE_SCORE, parseScore } from '../services/engine'
import {
  buildReport,
  evaluatePositions,
  formatEval,
  isAnalyzable,
  whiteWinPercent,
  type PositionEval,
} from '../services/gameAnalysis'
import { computePositions, parsePGN } from '../services/pgnParser'

const evalOf = (cp: number, bestSan: string | null = 'Zz9'): PositionEval => ({
  cp,
  mate: null,
  best: null,
  bestSan,
})

describe('parseScore', () => {
  it('flips scores to White’s point of view', () => {
    expect(parseScore('info depth 9 score cp 40 nodes 1 pv e7e5', true)).toEqual({
      cp: 40,
      mate: null,
    })
    expect(parseScore('info depth 9 score cp 40 nodes 1 pv e7e5', false)).toEqual({
      cp: -40,
      mate: null,
    })
  })

  it('reads forced mates and finished games', () => {
    expect(parseScore('info depth 9 score mate 3 pv a1a8', false)).toEqual({
      cp: -MATE_SCORE,
      mate: -3,
    })
    expect(parseScore('info depth 0 score mate 0', true)).toEqual({ cp: -MATE_SCORE, mate: 0 })
    expect(parseScore('info depth 0 score mate 0', false)).toEqual({ cp: MATE_SCORE, mate: 0 })
  })

  it('ignores bound scores and other output', () => {
    expect(parseScore('info depth 9 score cp 40 lowerbound nodes 1', true)).toBeNull()
    expect(parseScore('info string NNUE evaluation enabled', true)).toBeNull()
  })
})

describe('evaluation helpers', () => {
  it('maps scores to winning chances', () => {
    expect(whiteWinPercent(0)).toBe(50)
    expect(whiteWinPercent(MATE_SCORE)).toBe(100)
    expect(whiteWinPercent(-MATE_SCORE)).toBe(0)
    expect(whiteWinPercent(300)).toBeGreaterThan(75)
  })

  it('formats evaluations', () => {
    expect(formatEval({ cp: 34, mate: null })).toBe('+0.34')
    expect(formatEval({ cp: -120, mate: null })).toBe('-1.20')
    expect(formatEval({ cp: MATE_SCORE, mate: 3 })).toBe('#3')
    expect(formatEval({ cp: -MATE_SCORE, mate: -2 })).toBe('#-2')
    expect(formatEval({ cp: MATE_SCORE, mate: 0 })).toBe('#')
  })

  it('only analyzes standard chess', () => {
    expect(isAnalyzable('[White "a"]\n\n1. e4 *')).toBe(true)
    expect(isAnalyzable('[Variant "Standard"]\n\n1. e4 *')).toBe(true)
    expect(isAnalyzable('[Variant "Crazyhouse"]\n\n1. e4 *')).toBe(false)
  })
})

describe('buildReport', () => {
  const [game] = parsePGN('1. e4 e5 2. Nf3 Nc6 *')
  const positions = computePositions(game!.pgn)

  it('grades each move from the mover’s point of view', () => {
    const evals = [evalOf(20), evalOf(10), evalOf(600), evalOf(30), evalOf(30)]
    const report = buildReport(game!.moves, positions, evals)

    expect(report.moves.map((move) => move.color)).toEqual(['white', 'black', 'white', 'black'])
    expect(report.moves[1]!.grade).toBe('blunder') // Black threw away the balance
    expect(report.moves[2]!.grade).toBe('blunder') // White gave it straight back
    expect(report.moves[0]!.grade).toBeNull()
    expect(report.moves[3]!.grade).toBeNull()
    expect(report.white.blunders).toBe(1)
    expect(report.black.blunders).toBe(1)
    expect(report.moves[1]!.cpLoss).toBe(590)
  })

  it('never marks the engine’s own move as an error', () => {
    const evals = [evalOf(0, 'e4'), evalOf(-500)]
    expect(buildReport(game!.moves, positions, evals).moves[0]!.grade).toBeNull()
  })

  it('gives near-perfect accuracy when nothing is lost', () => {
    const report = buildReport(game!.moves, positions, Array(5).fill(evalOf(0)))
    expect(report.white.accuracy).toBeGreaterThan(99)
    expect(report.white.averageCpLoss).toBe(0)
  })

  it('reports only moves evaluated so far', () => {
    expect(buildReport(game!.moves, positions, [evalOf(0)]).moves).toHaveLength(0)
    expect(buildReport(game!.moves, positions, [evalOf(0), evalOf(0)]).moves).toHaveLength(1)
  })
})

describe('evaluatePositions', () => {
  it('adds the best move in SAN, including castling', async () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1'
    const results: PositionEval[] = []
    const evaluator = {
      evaluate: async () => ({ cp: 0, mate: null, best: 'e1g1' }),
      terminate: () => {},
    }

    await evaluatePositions([{ fen, lastMove: null, check: false }], evaluator, (e) =>
      results.push(e),
    )

    expect(results[0]!.bestSan).toBe('O-O')
  })
})
