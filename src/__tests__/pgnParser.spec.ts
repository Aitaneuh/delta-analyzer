import { describe, it, expect } from 'vitest'
import { computePositions, parsePGN } from '../services/pgnParser'

const CHESS_COM = `[Event "Live Chess"]
[Site "Chess.com"]
[Date "2025.03.04"]
[White "alice"]
[Black "bob"]
[Result "1-0"]
[WhiteElo "1500"]
[BlackElo "?"]
[TimeControl "60+1"]
[ECO "C50"]
[ECOUrl "https://www.chess.com/openings/Italian-Game"]
[Termination "alice won by checkmate"]
[Link "https://www.chess.com/game/live/1"]

1. e4 {[%clk 0:00:59]} 1... e5 2. Bc4 Nc6 3. Qh5 Nf6?? 4. Qxf7# 1-0
`

const LICHESS = `[Event "Rated Blitz game"]
[Site "https://lichess.org/abcd1234"]
[UTCDate "2024.01.31"]
[Date "????.??.??"]
[White "carol"]
[Black "dave"]
[Result "0-1"]
[TimeControl "180+0"]
[Termination "Time forfeit"]

1.d4 d5 2.c4 (2.Nf3 (2.Bf4 e6) Nf6) 2...e6 0-1
`

describe('parsePGN', () => {
  it('reads Chess.com metadata and moves', () => {
    const [game] = parsePGN(CHESS_COM)

    expect(game).toMatchObject({
      source: 'chess.com',
      link: 'https://www.chess.com/game/live/1',
      played_date: '2025-03-04',
      white_elo: 1500,
      black_elo: null,
      winner: 'white',
      game_type: 'bullet',
      termination_type: 'mate',
      opening_name: 'Italian Game',
      has_annotations: true,
      moves: ['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#'],
    })
  })

  it('handles unspaced move numbers, nested variations and Lichess tags', () => {
    const [game] = parsePGN(LICHESS)

    expect(game!.moves).toEqual(['d4', 'd5', 'c4', 'e6'])
    expect(game).toMatchObject({
      source: 'lichess',
      link: 'https://lichess.org/abcd1234',
      played_date: '2024-01-31',
      termination_type: 'time',
    })
  })

  it('imports every game in a multi-game PGN', () => {
    const games = parsePGN(`${CHESS_COM}\n${LICHESS}`)

    expect(games.map((game) => game.white_player)).toEqual(['alice', 'carol'])
    expect(new Set(games.map((game) => game.id)).size).toBe(2)
  })

  it('rejects illegal moves and empty input', () => {
    expect(() => parsePGN('1. e4 e5 2. Ke5')).toThrow('Illegal move "Ke5" at move 2.')
    expect(() => parsePGN('   ')).toThrow('No chess game')
  })

  it('drops links that are not http(s)', () => {
    const [game] = parsePGN('[Link "javascript:alert(1)"]\n\n1. e4 *')
    expect(game!.link).toBeNull()
  })
})

describe('computePositions', () => {
  it('produces one board per ply, including check and last move', () => {
    const [game] = parsePGN(CHESS_COM)
    const positions = computePositions(game!.pgn)

    expect(positions).toHaveLength(8)
    expect(positions[0]!.lastMove).toBeNull()
    expect(positions[1]!.fen).toContain('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b')
    expect(positions[1]!.lastMove).toEqual(['e2', 'e4'])
    expect(positions[7]!.check).toBe('black')
    expect(positions[7]!.fen).toBe(game!.final_fen)
  })
})
