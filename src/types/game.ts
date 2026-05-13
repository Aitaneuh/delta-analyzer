export interface ChessGame {
  id: string
  event: string
  game_name: string
  played_date: string | Date
  imported_date: string | Date
  white_player: string
  black_player: string
  white_elo: number
  black_elo: number
  result: '1-0' | '0-1' | '1/2-1/2'
  time_control: string
  game_type: 'bullet' | 'blitz' | 'rapid' | 'classical'
  eco_code: string
  opening: string
  termination: 'mate' | 'time' | 'resign'
  pgn: string
  moves: string
}
