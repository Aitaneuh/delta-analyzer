/**
 * Keeps the statistics views up to date. The aggregation reads every game, so it runs in the
 * background on a timer instead of when someone opens the page.
 */
import type { Pool, PoolClient } from 'pg'
import type { PositionEval } from '../src/services/moveScoring.ts'
import { pool } from './db.ts'
import { summarizeAnalysis, type AnalysisStats } from './statsQueries.ts'

const REFRESH_INTERVAL_MS = 60 * 60 * 1000
const REFRESH_LOCK_ID = 7264002
const ANALYSIS_BATCH_SIZE = 200

const ANALYSIS_STATS_COLUMNS: (keyof AnalysisStats)[] = [
  'white_accuracy',
  'black_accuracy',
  'white_acpl',
  'black_acpl',
  'white_inaccuracies',
  'black_inaccuracies',
  'white_mistakes',
  'black_mistakes',
  'white_blunders',
  'black_blunders',
]

/** Saves a game's accuracy summary. Keeps the existing one if there is one. */
export async function saveAnalysisStats(
  db: Pool | PoolClient,
  gameId: string,
  game: { moves: string[]; initial_fen: string },
  evals: PositionEval[],
): Promise<void> {
  const stats = summarizeAnalysis(game.moves, game.initial_fen, evals)
  const placeholders = ANALYSIS_STATS_COLUMNS.map((_, index) => `$${index + 2}`).join(', ')
  await db.query(
    `INSERT INTO game_analysis_stats (game_id, ${ANALYSIS_STATS_COLUMNS.join(', ')})
     VALUES ($1, ${placeholders})
     ON CONFLICT (game_id) DO NOTHING`,
    [gameId, ...ANALYSIS_STATS_COLUMNS.map((column) => stats[column])],
  )
}

/**
 * Scores any analysis that has no summary yet. New analyses are scored when they are saved, so
 * this catches up on older ones and any that failed. Paging by ID guarantees this finishes.
 */
async function summarizeNewAnalyses(client: PoolClient): Promise<void> {
  let lastId = ''

  for (;;) {
    const { rows } = await client.query<{
      game_id: string
      evals: PositionEval[]
      moves: string[]
      initial_fen: string
    }>(
      `SELECT a.game_id, a.evals, g.moves, g.initial_fen
       FROM game_analyses a
       JOIN games g ON g.id = a.game_id
       LEFT JOIN game_analysis_stats s ON s.game_id = a.game_id
       WHERE s.game_id IS NULL AND a.game_id > $1
       ORDER BY a.game_id
       LIMIT ${ANALYSIS_BATCH_SIZE}`,
      [lastId],
    )

    for (const row of rows) {
      await saveAnalysisStats(client, row.game_id, row, row.evals)
    }

    if (rows.length < ANALYSIS_BATCH_SIZE) return
    lastId = rows[rows.length - 1]!.game_id
  }
}

/**
 * Rebuilds the statistics views if the data has changed. Visitors keep reading the previous
 * version while this runs. `force` waits for any running refresh and always rebuilds; it's for
 * moderation, where names change without changing how many games there are.
 */
export async function refreshStats({ force = false } = {}): Promise<void> {
  const client = await pool.connect()
  let locked = false
  try {
    if (force) {
      await client.query('SELECT pg_advisory_lock($1)', [REFRESH_LOCK_ID])
      locked = true
    } else {
      const { rows } = await client.query<{ locked: boolean }>(
        'SELECT pg_try_advisory_lock($1) AS locked',
        [REFRESH_LOCK_ID],
      )
      locked = rows[0]!.locked
      if (!locked) return
    }

    await summarizeNewAnalyses(client)

    const { rows } = await client.query<{ current: string; stored: string }>(
      `SELECT
         concat_ws(':', (SELECT count(*) FROM games), (SELECT max(imported_at) FROM games),
           (SELECT count(*) FROM game_analysis_stats)) AS current,
         (SELECT fingerprint FROM stats_refresh) AS stored`,
    )
    const { current, stored } = rows[0]!
    if (!force && current === stored) return

    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY stats_rollup')
    await client.query('REFRESH MATERIALIZED VIEW CONCURRENTLY stats_players')
    await client.query('UPDATE stats_refresh SET refreshed_at = now(), fingerprint = $1', [current])
  } finally {
    if (locked) {
      await client.query('SELECT pg_advisory_unlock($1)', [REFRESH_LOCK_ID]).catch(() => {})
    }
    client.release()
  }
}

/** Refreshes now and then every hour. A failed run is logged and retried on the next one. */
export function scheduleStatsRefresh(onError: (err: unknown) => void): void {
  const run = () => void refreshStats().catch(onError)
  run()
  setInterval(run, REFRESH_INTERVAL_MS).unref()
}
