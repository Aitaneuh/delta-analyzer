import { readFile, readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { config } from './config.ts'

// Keep DATE columns as "YYYY-MM-DD" instead of converting them to local-time JS dates
const DATE_OID = 1082
pg.types.setTypeParser(DATE_OID, (value) => value)

export const pool = new pg.Pool({ connectionString: config.databaseUrl })

const MIGRATIONS_DIR = fileURLToPath(new URL('./migrations/', import.meta.url))
const MIGRATION_LOCK_ID = 7264001

/** Applies any new SQL files in server/migrations, in filename order. */
export async function migrate(): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_LOCK_ID])
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`)

    const applied = await client.query<{ name: string }>('SELECT name FROM schema_migrations')
    const done = new Set(applied.rows.map((row) => row.name))
    const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith('.sql')).sort()

    for (const file of files) {
      if (done.has(file)) continue
      const sql = await readFile(MIGRATIONS_DIR + file, 'utf8')
      try {
        await client.query('BEGIN')
        await client.query(sql)
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        throw err
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_LOCK_ID]).catch(() => {})
    client.release()
  }
}
