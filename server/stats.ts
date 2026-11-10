import type { FastifyInstance } from 'fastify'
import { pool } from './db.ts'
import {
  MEASURES,
  groupBreakdowns,
  parseStatsFilters,
  playerKey,
  prefixPattern,
  summarizeMatrix,
  type MatrixRow,
  type Measures,
} from './statsQueries.ts'

const LEADERBOARD_SIZE = 15
const LEADERBOARD_MIN_GAMES = 20
const SUGGESTION_COUNT = 8
const SUGGESTION_MIN_LENGTH = 2

const BANDS = 'SELECT key, label, min_elo, max_elo FROM stats_elo_bands ORDER BY position'
const SUMMED_MEASURES = MEASURES.map((name) => `sum(${name})::float8 AS ${name}`).join(', ')

// $1 is the lower-cased name and $2 an optional time mode. The OR on the game's two player
// columns is what lets Postgres use the indexes; the side condition then keeps the player's side.
const PLAYED_GAMES = `
  WITH played AS (
    SELECT g.game_type, g.winner, g.termination_type, g.moves_count, g.played_date,
      left(g.time_control, 32) AS time_control, left(g.eco_code, 32) AS eco_code,
      side.color, side.name, side.opponent,
      stats_rating(side.elo) AS rating,
      stats_rating(side.opponent_elo) AS opponent_rating,
      CASE WHEN side.color = 'white'
        AND g.initial_fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
        THEN left(g.moves ->> 0, 16) END AS first_move,
      a.game_id AS analyzed_id,
      CASE side.color WHEN 'white' THEN a.white_accuracy ELSE a.black_accuracy END AS accuracy,
      CASE side.color WHEN 'white' THEN a.white_acpl ELSE a.black_acpl END AS acpl,
      CASE side.color WHEN 'white' THEN a.white_inaccuracies ELSE a.black_inaccuracies END AS inaccuracies,
      CASE side.color WHEN 'white' THEN a.white_mistakes ELSE a.black_mistakes END AS mistakes,
      CASE side.color WHEN 'white' THEN a.white_blunders ELSE a.black_blunders END AS blunders
    FROM games g
    CROSS JOIN LATERAL (VALUES
      ('white', g.white_player, g.white_elo, g.black_player, g.black_elo),
      ('black', g.black_player, g.black_elo, g.white_player, g.white_elo)
    ) AS side (color, name, elo, opponent, opponent_elo)
    LEFT JOIN game_analysis_stats a ON a.game_id = g.id
    WHERE (lower(g.white_player) = $1 OR lower(g.black_player) = $1)
      AND lower(side.name) = $1
      AND g.moves_count > 0
      AND ($2::text IS NULL OR g.game_type = $2)
  )`

const PLAYER_BREAKDOWNS = `${PLAYED_GAMES}
  SELECT d.dimension, d.bucket,
    count(*)::float8 AS games,
    count(*) FILTER (WHERE p.winner = p.color)::float8 AS wins,
    count(*) FILTER (WHERE p.winner = 'draw')::float8 AS draws,
    count(*) FILTER (WHERE p.winner IN ('white', 'black') AND p.winner <> p.color)::float8 AS losses,
    sum(p.moves_count)::float8 AS plies,
    0::float8 AS favorite_wins,
    0::float8 AS underdog_wins,
    count(p.analyzed_id)::float8 AS analyzed,
    count(p.accuracy)::float8 AS accuracy_sides,
    COALESCE(sum(p.accuracy), 0)::float8 AS accuracy_sum,
    COALESCE(sum(p.acpl), 0)::float8 AS acpl_sum,
    COALESCE(sum(p.inaccuracies), 0)::float8 AS inaccuracies,
    COALESCE(sum(p.mistakes), 0)::float8 AS mistakes,
    COALESCE(sum(p.blunders), 0)::float8 AS blunders
  FROM played p
  CROSS JOIN LATERAL (VALUES
    ('all', 'all'),
    ('color', p.color),
    ('game_type', p.game_type),
    ('termination', COALESCE(p.termination_type, 'unknown')),
    ('length', stats_length_bucket(p.moves_count)),
    ('opening_white', CASE WHEN p.color = 'white' THEN p.eco_code END),
    ('opening_black', CASE WHEN p.color = 'black' THEN p.eco_code END),
    ('first_move', p.first_move),
    ('month', to_char(p.played_date, 'YYYY-MM')),
    ('time_control', p.time_control),
    ('opponent_band', stats_elo_band(p.opponent_rating)),
    ('strength', CASE
      WHEN p.rating IS NULL OR p.opponent_rating IS NULL THEN NULL
      WHEN p.opponent_rating - p.rating >= 50 THEN 'stronger'
      WHEN p.rating - p.opponent_rating >= 50 THEN 'weaker'
      ELSE 'similar' END),
    ('opponent', CASE WHEN lower(p.opponent) NOT IN ('anonymous', 'unknown')
      THEN left(p.opponent, 64) END)
  ) AS d (dimension, bucket)
  WHERE d.bucket IS NOT NULL
  GROUP BY d.dimension, d.bucket`

// Games without a time control (e.g. against a computer) carry placeholder ratings, so they
// still count as games but their ratings are ignored
const RATED = `p.rating IS NOT NULL AND p.game_type <> 'unknown'`

const PLAYER_RATINGS = `${PLAYED_GAMES}
  SELECT p.game_type, max(p.name) AS name, count(*)::int AS games,
    max(p.rating) FILTER (WHERE ${RATED}) AS peak,
    (array_agg(p.rating ORDER BY p.played_date DESC NULLS LAST)
      FILTER (WHERE ${RATED}))[1] AS latest,
    min(p.played_date) AS first_played,
    max(p.played_date) AS last_played
  FROM played p
  GROUP BY p.game_type`

const PLAYER_RATING_HISTORY = `${PLAYED_GAMES}
  SELECT p.game_type, to_char(p.played_date, 'YYYY-MM') AS month, round(avg(p.rating))::int AS rating
  FROM played p
  WHERE ${RATED} AND p.played_date IS NOT NULL
  GROUP BY 1, 2
  ORDER BY 2`

export function registerStats(app: FastifyInstance): void {
  app.get('/api/stats', async (request) => {
    const filters = parseStatsFilters(request.query as Record<string, unknown>)
    const params = [filters.gameType, filters.eloBand]
    const matches = `($1::text IS NULL OR game_type = $1) AND ($2::text IS NULL OR elo_band = $2)`

    const [rollup, matrix, players, bands, refresh] = await Promise.all([
      pool.query<Measures & { dimension: string; bucket: string }>(
        `SELECT dimension, bucket, ${SUMMED_MEASURES}
         FROM stats_rollup WHERE ${matches}
         GROUP BY dimension, bucket`,
        params,
      ),
      pool.query<MatrixRow>(
        `SELECT game_type, elo_band, ${SUMMED_MEASURES}
         FROM stats_rollup WHERE dimension = 'all'
         GROUP BY game_type, elo_band`,
      ),
      pool.query(
        `WITH p AS (
           SELECT player_key, max(name) AS name, sum(games)::int AS games,
             sum(wins)::int AS wins, sum(draws)::int AS draws, sum(losses)::int AS losses,
             max(peak_rating) AS peak_rating,
             (sum(wins) + sum(draws) / 2.0)::float8 / NULLIF(sum(wins) + sum(draws) + sum(losses), 0)
               AS score
           FROM stats_players WHERE ${matches}
           GROUP BY player_key
         )
         SELECT
           (SELECT count(*)::int FROM p) AS total,
           (SELECT COALESCE(json_agg(t), '[]') FROM (
             SELECT * FROM p ORDER BY games DESC, name LIMIT ${LEADERBOARD_SIZE}) t) AS most_active,
           (SELECT COALESCE(json_agg(t), '[]') FROM (
             SELECT * FROM p WHERE games >= ${LEADERBOARD_MIN_GAMES}
             ORDER BY score DESC NULLS LAST, games DESC, name
             LIMIT ${LEADERBOARD_SIZE}) t) AS best_score`,
        params,
      ),
      pool.query(BANDS),
      pool.query<{ refreshed_at: Date }>('SELECT refreshed_at FROM stats_refresh'),
    ])

    return {
      perspective: 'white',
      refreshed_at: refresh.rows[0]?.refreshed_at ?? null,
      bands: bands.rows,
      breakdowns: groupBreakdowns(rollup.rows),
      matrix: matrix.rows,
      ...summarizeMatrix(matrix.rows, filters),
      players: players.rows[0],
      leaderboard_min_games: LEADERBOARD_MIN_GAMES,
    }
  })

  app.get(
    '/api/stats/players',
    { config: { rateLimit: { max: 120, timeWindow: '1 minute' } } },
    async (request) => {
      const key = playerKey((request.query as Record<string, unknown>).q)
      if (!key || key.length < SUGGESTION_MIN_LENGTH) return { players: [] }

      const { rows } = await pool.query<{ name: string }>(
        `SELECT max(name) AS name
         FROM stats_players WHERE player_key LIKE $1
         GROUP BY player_key
         ORDER BY sum(games) DESC, 1
         LIMIT ${SUGGESTION_COUNT}`,
        [prefixPattern(key)],
      )
      return { players: rows.map((row) => row.name) }
    },
  )

  // Read directly from the games table, which is indexed by player, so that a player's own
  // numbers are up to date as soon as their games are imported
  app.get(
    '/api/stats/players/:name',
    { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const notFound = () => reply.code(404).send({ error: 'No games found for this player.' })
      const key = playerKey((request.params as { name: string }).name)
      if (!key) return notFound()

      const { gameType } = parseStatsFilters(request.query as Record<string, unknown>)
      const params = [key, gameType]
      const [breakdowns, ratings, history, bands] = await Promise.all([
        pool.query<Measures & { dimension: string; bucket: string }>(PLAYER_BREAKDOWNS, params),
        pool.query<{ name: string }>(PLAYER_RATINGS, params),
        pool.query(PLAYER_RATING_HISTORY, params),
        pool.query(BANDS),
      ])
      if (ratings.rows.length === 0) return notFound()

      return {
        perspective: 'player',
        name: ratings.rows[0]!.name,
        bands: bands.rows,
        breakdowns: groupBreakdowns(breakdowns.rows),
        ratings: ratings.rows,
        rating_history: history.rows,
      }
    },
  )
}
