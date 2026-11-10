/**
 * Moderation for changes the law requires. Users can never delete games; only the site operator
 * can, from the server, using this tool.
 *
 *   node server/admin.ts anonymize <lichess-username>   Answer a privacy (erasure) request
 *   node server/admin.ts remove <game-id>               Take down illegal content
 */
import type { PoolClient } from 'pg'
import { pool } from './db.ts'
import { anonymizePgn } from './gameQueries.ts'
import { refreshStats } from './statsRefresh.ts'

const ANONYMOUS = 'Anonymous'

async function moderated(work: (client: PoolClient) => Promise<void>): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query("SELECT set_config('delta.allow_moderation', 'on', true)")
    await work(client)
    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }

  // Leaderboards hold player names, so a removed name must leave them right away
  await refreshStats({ force: true })
}

async function anonymize(username: string): Promise<void> {
  await moderated(async (client) => {
    const games = await client.query<{ id: string; pgn: string }>(
      'SELECT id, pgn FROM games WHERE lower(white_player) = lower($1) OR lower(black_player) = lower($1)',
      [username],
    )

    for (const game of games.rows) {
      await client.query(
        `UPDATE games SET
           white_player = CASE WHEN lower(white_player) = lower($2) THEN $3 ELSE white_player END,
           black_player = CASE WHEN lower(black_player) = lower($2) THEN $3 ELSE black_player END,
           white_avatar = NULL, black_avatar = NULL, link = NULL, pgn = $4
         WHERE id = $1`,
        [game.id, username, ANONYMOUS, anonymizePgn(game.pgn, username, ANONYMOUS)],
      )
    }

    const users = await client.query('DELETE FROM users WHERE lower(username) = lower($1)', [
      username,
    ])
    console.log(`Anonymized ${games.rowCount} game(s), deleted ${users.rowCount} account(s).`)
  })
}

async function remove(gameId: string): Promise<void> {
  await moderated(async (client) => {
    const result = await client.query('DELETE FROM games WHERE id = $1', [gameId])
    console.log(result.rowCount ? `Removed game ${gameId}.` : `No game with ID ${gameId}.`)
  })
}

if (import.meta.main) {
  const [command, target] = process.argv.slice(2)
  try {
    if (command === 'anonymize' && target) await anonymize(target)
    else if (command === 'remove' && target) await remove(target)
    else {
      console.error('Usage: node server/admin.ts <anonymize USERNAME | remove GAME_ID>')
      process.exitCode = 1
    }
  } finally {
    await pool.end()
  }
}
