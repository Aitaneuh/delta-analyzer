import { describe, it, expect } from 'vitest'
import {
  emptyMeasures,
  groupBreakdowns,
  parseStatsFilters,
  playerKey,
  prefixPattern,
  summarizeAnalysis,
  summarizeMatrix,
  type MatrixRow,
} from '../../server/statsQueries'
import { buildReport } from '../services/gameAnalysis'
import { computePositions } from '../services/pgnParser'

const row = (dimension: string, bucket: string, games: number) => ({
  ...emptyMeasures(),
  dimension,
  bucket,
  games,
})

describe('parseStatsFilters', () => {
  it('accepts only known time modes', () => {
    expect(parseStatsFilters({ game_type: 'blitz', elo_band: 'novice' })).toEqual({
      gameType: 'blitz',
      eloBand: 'novice',
    })
    expect(parseStatsFilters({ game_type: 'turbo' }).gameType).toBeNull()
    expect(parseStatsFilters({ game_type: ['rapid', 'blitz'] }).gameType).toBe('rapid')
  })

  it('treats missing and blank values as no filter', () => {
    expect(parseStatsFilters({ elo_band: '  ' })).toEqual({ gameType: null, eloBand: null })
  })
})

describe('playerKey', () => {
  it('ignores case and surrounding spaces', () => {
    expect(playerKey('  MagnusCarlsen ')).toBe('magnuscarlsen')
  })

  it('rejects placeholder names and overlong input', () => {
    expect(playerKey('Anonymous')).toBeNull()
    expect(playerKey('unknown')).toBeNull()
    expect(playerKey('x'.repeat(65))).toBeNull()
    expect(playerKey(undefined)).toBeNull()
  })
})

it('treats LIKE wildcards in a name prefix as plain text', () => {
  expect(prefixPattern('a_b%')).toBe('a\\_b\\%%')
})

describe('groupBreakdowns', () => {
  it('sorts ordered buckets by value and the rest by number of games', () => {
    const groups = groupBreakdowns([
      row('length', '80', 1),
      row('length', '10', 5),
      row('length', '0', 2),
      row('termination', 'time', 3),
      row('termination', 'mate', 9),
      row('month', '2026-02', 1),
      row('month', '2025-11', 1),
    ])
    expect(groups.length!.map((item) => item.key)).toEqual(['0', '10', '80'])
    expect(groups.termination!.map((item) => item.key)).toEqual(['mate', 'time'])
    expect(groups.month!.map((item) => item.key)).toEqual(['2025-11', '2026-02'])
  })

  it('caps long lists', () => {
    const openings = Array.from({ length: 30 }, (_, index) => row('opening', `B${index}`, index))
    const groups = groupBreakdowns(openings)
    expect(groups.opening).toHaveLength(20)
    expect(groups.opening![0]!.key).toBe('B29')
  })
})

describe('summarizeMatrix', () => {
  const cell = (game_type: string, elo_band: string, games: number, draws: number): MatrixRow => ({
    ...emptyMeasures(),
    game_type,
    elo_band,
    games,
    draws,
  })
  const matrix = [
    cell('blitz', 'novice', 10, 1),
    cell('blitz', 'expert', 20, 4),
    cell('rapid', 'novice', 5, 2),
  ]

  it('compares time modes within the chosen rating band, and bands within the chosen mode', () => {
    const { by_game_type, by_elo_band } = summarizeMatrix(matrix, {
      gameType: 'blitz',
      eloBand: 'novice',
    })
    expect(by_game_type.map(({ key, games }) => [key, games])).toEqual([
      ['blitz', 10],
      ['rapid', 5],
    ])
    expect(by_elo_band.map(({ key, games }) => [key, games])).toEqual([
      ['novice', 10],
      ['expert', 20],
    ])
  })

  it('sums everything without filters', () => {
    const { by_game_type } = summarizeMatrix(matrix, { gameType: null, eloBand: null })
    expect(by_game_type.find((item) => item.key === 'blitz')).toMatchObject({ games: 30, draws: 5 })
  })
})

describe('summarizeAnalysis', () => {
  const evalOf = (cp: number, bestSan: string | null = null) => ({
    cp,
    mate: null,
    best: null,
    bestSan,
  })

  it('matches the report shown on the game page', () => {
    const pgn = '1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 *'
    const moves = ['e4', 'e5', 'Qh5', 'Nc6', 'Bc4', 'Nf6']
    const evals = [20, 30, 25, 60, 40, 50, 900].map((cp) => evalOf(cp))
    const positions = computePositions(pgn)

    const report = buildReport(moves, positions, evals)
    const stats = summarizeAnalysis(moves, positions[0]!.fen, evals)
    expect(stats.white_accuracy).toBeCloseTo(report.white.accuracy)
    expect(stats.black_accuracy).toBeCloseTo(report.black.accuracy)
    expect(stats.black_blunders).toBe(report.black.blunders)
    expect(stats.black_blunders).toBe(1)
  })

  it('starts with the side to move in a set-up position', () => {
    const fen = '4k3/8/8/8/8/8/4P3/4K3 b - - 0 1'
    const stats = summarizeAnalysis(['Kd7'], fen, [evalOf(0), evalOf(0)])
    expect(stats.black_accuracy).not.toBeNull()
    expect(stats.white_accuracy).toBeNull()
  })
})
