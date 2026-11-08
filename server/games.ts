import { randomBytes } from 'node:crypto'
import type { FastifyInstance, FastifyReply } from 'fastify'
import { parsePGN, type ParsedGame } from '../src/services/pgnParser.ts'
import { requireUser } from './auth.ts'
import { pool } from './db.ts'
import { PAGE_SIZE, buildGameListQuery, contentHash, parseAnalysis } from './gameQueries.ts'
import { LichessBusyError, fetchRecentGames } from './lichess.ts'

const MAX_GAMES_PER_UPLOAD = 200
const LICHESS_IMPORT_SIZES = [10, 25, 50, 100]

const SUMMARY_COLUMNS = `id, imported_at AS imported_date, source, event, played_date,
  white_player, black_player, white_elo, black_elo, result, winner, termination_type,
  time_control, game_type, eco_code, opening_name`

const DETAIL_COLUMNS = `games.id, imported_at AS imported_date, source, link, event, played_date,
  white_player, black_player, white_elo, black_elo, white_country, black_country,
  white_avatar, black_avatar, result, winner, termination, termination_type, time_control,
  game_type, eco_code, opening_name, pgn, initial_fen, final_fen, moves_count, has_annotations,
  moves`

const INSERT_COLUMNS = [
  'source',
  'link',
  'event',
  'played_date',
  'white_player',
  'black_player',
  'white_elo',
  'black_elo',
  'white_country',
  'black_country',
  'white_avatar',
  'black_avatar',
  'result',
  'winner',
  'termination',
  'termination_type',
  'time_control',
  'game_type',
  'eco_code',
  'opening_name',
  'pgn',
  'initial_fen',
  'final_fen',
  'moves_count',
  'has_annotations',
] as const

interface SaveResult {
  games: { id: string; isNew: boolean }[]
  created: number
  duplicates: number
}

/** Saves games in one transaction. A game that already exists links to its first upload. */
async function saveGames(games: ParsedGame[], userId: string): Promise<SaveResult> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const saved: SaveResult['games'] = []

    for (const game of games) {
      const hash = contentHash(game)
      const values = INSERT_COLUMNS.map((column) => game[column])
      const placeholders = INSERT_COLUMNS.map((_, index) => `$${index + 5}`).join(', ')

      const inserted = await client.query<{ id: string }>(
        `INSERT INTO games (id, content_hash, uploaded_by, moves, ${INSERT_COLUMNS.join(', ')})
         VALUES ($1, $2, $3, $4, ${placeholders})
         ON CONFLICT (content_hash) DO NOTHING
         RETURNING id`,
        [randomBytes(8).toString('base64url'), hash, userId, JSON.stringify(game.moves), ...values],
      )

      if (inserted.rows[0]) {
        saved.push({ id: inserted.rows[0].id, isNew: true })
      } else {
        const existing = await client.query<{ id: string }>(
          'SELECT id FROM games WHERE content_hash = $1',
          [hash],
        )
        saved.push({ id: existing.rows[0]!.id, isNew: false })
      }
    }

    await client.query('COMMIT')
    const created = saved.filter((game) => game.isNew).length
    return { games: saved, created, duplicates: saved.length - created }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

function requirePermanentConsent(body: { accept_permanent?: unknown }, reply: FastifyReply) {
  if (body.accept_permanent === true) return true
  reply.code(400).send({ error: 'You must accept that uploaded games cannot be deleted.' })
  return false
}

export function registerGames(app: FastifyInstance): void {
  app.get('/api/games', async (request) => {
    const { where, params, page } = buildGameListQuery(request.query as Record<string, unknown>)

    const [count, games] = await Promise.all([
      pool.query<{ total: number }>(`SELECT count(*)::int AS total FROM games ${where}`, params),
      pool.query(
        `SELECT ${SUMMARY_COLUMNS} FROM games ${where}
         ORDER BY imported_at DESC, id
         LIMIT ${PAGE_SIZE} OFFSET $${params.length + 1}`,
        [...params, (page - 1) * PAGE_SIZE],
      ),
    ])

    return { games: games.rows, total: count.rows[0]!.total, page, pageSize: PAGE_SIZE }
  })

  app.get('/api/games/:id', async (request, reply) => {
    const { id } = request.params as { id: string }
    const { rows } = await pool.query(
      `SELECT ${DETAIL_COLUMNS},
         CASE WHEN game_analyses.game_id IS NULL THEN NULL
           ELSE json_build_object(
             'engine', game_analyses.engine,
             'depth', game_analyses.depth,
             'evals', game_analyses.evals)
         END AS analysis
       FROM games LEFT JOIN game_analyses ON game_analyses.game_id = games.id
       WHERE games.id = $1`,
      [id],
    )
    if (!rows[0]) return reply.code(404).send({ error: 'Game not found.' })

    const { analysis, ...game } = rows[0]
    return analysis ? { ...game, analysis } : game
  })

  app.post(
    '/api/games',
    {
      preHandler: requireUser,
      bodyLimit: 5 * 1024 * 1024,
      config: { rateLimit: { max: 20, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const body = (request.body ?? {}) as { pgn?: unknown; accept_permanent?: unknown }
      if (!requirePermanentConsent(body, reply)) return reply
      if (typeof body.pgn !== 'string') return reply.code(400).send({ error: 'No PGN was sent.' })

      let games: ParsedGame[]
      try {
        games = parsePGN(body.pgn)
      } catch (err) {
        return reply.code(400).send({ error: err instanceof Error ? err.message : 'Invalid PGN.' })
      }
      if (games.length > MAX_GAMES_PER_UPLOAD) {
        return reply
          .code(400)
          .send({ error: `Please upload at most ${MAX_GAMES_PER_UPLOAD} games at once.` })
      }

      return saveGames(games, request.user!.id)
    },
  )

  app.post(
    '/api/lichess/import',
    { preHandler: requireUser, config: { rateLimit: { max: 5, timeWindow: '1 minute' } } },
    async (request, reply) => {
      const body = (request.body ?? {}) as { max?: unknown; accept_permanent?: unknown }
      if (!requirePermanentConsent(body, reply)) return reply
      if (!LICHESS_IMPORT_SIZES.includes(body.max as number)) {
        return reply.code(400).send({ error: 'Choose how many games to import.' })
      }

      let pgn: string
      try {
        pgn = await fetchRecentGames(request.user!.username, body.max as number)
      } catch (err) {
        if (err instanceof LichessBusyError) {
          return reply.code(503).send({ error: 'Lichess is busy. Please try again in a minute.' })
        }
        request.log.warn({ err }, 'Lichess import failed')
        return reply.code(502).send({ error: 'Could not download your games from Lichess.' })
      }

      if (!pgn.trim()) return { games: [], created: 0, duplicates: 0 }
      const games = parsePGN(pgn, { skipInvalid: true }).filter((game) => game.moves_count > 0)
      return saveGames(games, request.user!.id)
    },
  )

  app.put(
    '/api/games/:id/analysis',
    {
      preHandler: requireUser,
      bodyLimit: 2 * 1024 * 1024,
      config: { rateLimit: { max: 30, timeWindow: '1 minute' } },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const game = await pool.query<{ moves_count: number }>(
        'SELECT moves_count FROM games WHERE id = $1',
        [id],
      )
      if (!game.rows[0]) return reply.code(404).send({ error: 'Game not found.' })

      const analysis = parseAnalysis(request.body, game.rows[0].moves_count)
      if (!analysis) return reply.code(400).send({ error: 'This analysis is not valid.' })

      // Analyses are permanent too, so the first complete one is kept
      await pool.query(
        `INSERT INTO game_analyses (game_id, engine, depth, evals, analyzed_by)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (game_id) DO NOTHING`,
        [id, analysis.engine, analysis.depth, JSON.stringify(analysis.evals), request.user!.id],
      )

      const { rows } = await pool.query(
        'SELECT engine, depth, evals FROM game_analyses WHERE game_id = $1',
        [id],
      )
      return rows[0]
    },
  )
}
