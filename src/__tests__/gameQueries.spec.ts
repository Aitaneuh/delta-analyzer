import { describe, it, expect } from 'vitest'
import {
  anonymizePgn,
  buildGameListQuery,
  contentHash,
  parseAnalysis,
} from '../../server/gameQueries'
import { parsePGN } from '../services/pgnParser'

describe('buildGameListQuery', () => {
  it('has no conditions by default', () => {
    expect(buildGameListQuery({})).toEqual({ where: '', params: [], page: 1 })
  })

  it('keeps user text out of the SQL', () => {
    const { where, params } = buildGameListQuery({ player_name: "x'; DROP TABLE games;--" })
    expect(where).not.toContain('DROP')
    expect(params).toEqual(["%x'; DROP TABLE games;--%"])
  })

  it('treats LIKE wildcards as plain text', () => {
    expect(buildGameListQuery({ game_name: '100%_a' }).params).toEqual(['%100\\%\\_a%'])
  })

  it('accepts only known values for choice filters', () => {
    const { where, params } = buildGameListQuery({
      game_types: ['blitz', 'evil'],
      results: 'nope',
    })
    expect(where).toBe('WHERE game_type = ANY($1)')
    expect(params).toEqual([['blitz']])
  })

  it('can keep only analyzed games', () => {
    expect(buildGameListQuery({ analyzed_only: 'true' }).where).toContain('game_analyses')
    expect(buildGameListQuery({ analyzed_only: 'false' }).where).toBe('')
  })

  it('ignores invalid numbers and dates', () => {
    expect(
      buildGameListQuery({ min_elo: 'abc', max_elo: '', played_date: 'yesterday', page: '-4' }),
    ).toEqual({ where: '', params: [], page: 1 })
  })

  it('combines filters with numbered parameters', () => {
    const { where, params, page } = buildGameListQuery({
      eco_code: 'b2',
      min_elo: '1500',
      time_control_kind: 'increment',
      imported_date: '2026-01-02',
      page: '3',
    })
    expect(where).toContain('eco_code LIKE $1')
    expect(where).toContain('white_elo >= $2')
    expect(where).toContain('imported_at::date = $3')
    expect(params).toEqual(['B2%', 1500, '2026-01-02'])
    expect(page).toBe(3)
  })
})

describe('contentHash', () => {
  const pgn = '[White "Alice"]\n[Black "Bob"]\n[Date "2025.01.02"]\n\n1. e4 e5 *'

  it('ignores name case and PGN formatting', () => {
    const [a] = parsePGN(pgn)
    const [b] = parsePGN('[White "ALICE"]\n[Black "bob"]\n[Date "2025.01.02"]\n\n1.e4   {x} e5 *')
    expect(contentHash(a!)).toBe(contentHash(b!))
  })

  it('differs when the moves differ', () => {
    const [a] = parsePGN(pgn)
    const [b] = parsePGN(pgn.replace('e5', 'c5'))
    expect(contentHash(a!)).not.toBe(contentHash(b!))
  })
})

describe('parseAnalysis', () => {
  const entry = { cp: 10, mate: null, best: 'e2e4', bestSan: 'e4' }
  const valid = { engine: 'Stockfish 19 lite', depth: 14, evals: [entry, entry] }

  it('accepts a complete analysis and drops unknown fields', () => {
    const body = { ...valid, evals: [{ ...entry, extra: 'x' }, entry] }
    expect(parseAnalysis(body, 1)!.evals[0]).toEqual(entry)
  })

  it('accepts a finished game with no best move', () => {
    const last = { cp: 10000, mate: 0, best: null, bestSan: null }
    expect(parseAnalysis({ ...valid, evals: [entry, last] }, 1)).not.toBeNull()
  })

  it.each([
    ['wrong length', { ...valid, evals: [entry] }],
    ['bad depth', { ...valid, depth: 0 }],
    ['bad engine', { ...valid, engine: '' }],
    ['bad score', { ...valid, evals: [{ ...entry, cp: 99999 }, entry] }],
    ['bad move', { ...valid, evals: [{ ...entry, best: '<script>' }, entry] }],
    ['not an object', 'hello'],
  ])('rejects %s', (_name, body) => {
    expect(parseAnalysis(body, 1)).toBeNull()
  })
})

describe('anonymizing a PGN', () => {
  const pgn = `[Site "https://lichess.org/abc"]
[White "Alice"]
[Black "Bob"]
[GameId "abc"]

1. e4 *`

  it('removes the name and identifying links, and keeps the moves', () => {
    const result = anonymizePgn(pgn, 'alice', 'Anonymous')
    expect(result).toContain('[White "Anonymous"]')
    expect(result).toContain('[Black "Bob"]')
    expect(result).not.toContain('lichess.org')
    expect(result).not.toContain('GameId')
    expect(result).toContain('1. e4')
  })
})
