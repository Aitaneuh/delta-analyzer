import { createHash, randomBytes } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { config } from './config.ts'
import { pool } from './db.ts'
import { authorizeUrl, createPkce, fetchIdentity } from './lichess.ts'

const SESSION_COOKIE = 'delta_session'
const LOGIN_COOKIE = 'delta_login'
const SESSION_DAYS = 30

export interface SessionUser {
  id: string
  username: string
}

declare module 'fastify' {
  interface FastifyRequest {
    user: SessionUser | null
  }
}

const cookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'lax',
  secure: config.isHttps,
} as const

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

/** Only same-site paths are accepted, so the login can't redirect visitors elsewhere. */
function safeReturnPath(value: unknown): string {
  return typeof value === 'string' && /^\/(?![/\\])/.test(value) ? value.slice(0, 500) : '/'
}

export async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) return reply.code(401).send({ error: 'Please sign in with Lichess first.' })
}

export function registerAuth(app: FastifyInstance): void {
  app.decorateRequest('user', null)

  app.addHook('onRequest', async (request) => {
    const token = request.cookies[SESSION_COOKIE]
    if (!token || !request.url.startsWith('/api/')) return

    const { rows } = await pool.query<SessionUser>(
      `SELECT users.id, users.username
       FROM sessions JOIN users ON users.id = sessions.user_id
       WHERE sessions.token_hash = $1 AND sessions.expires_at > now()`,
      [hashToken(token)],
    )
    request.user = rows[0] ?? null
  })

  app.get('/api/auth/login', (request, reply) => {
    const { verifier, challenge, state } = createPkce()
    const returnTo = safeReturnPath((request.query as { returnTo?: unknown }).returnTo)

    reply.setCookie(LOGIN_COOKIE, JSON.stringify({ verifier, state, returnTo }), {
      ...cookieOptions,
      path: '/api/auth',
      maxAge: 600,
    })
    return reply.redirect(authorizeUrl(state, challenge))
  })

  app.get('/api/auth/callback', async (request, reply) => {
    const { code, state } = request.query as { code?: string; state?: string }
    const failed = () => reply.redirect('/import?signin=failed')

    let login: { verifier: string; state: string; returnTo: string }
    try {
      login = JSON.parse(request.cookies[LOGIN_COOKIE] ?? '')
    } catch {
      return failed()
    }
    reply.clearCookie(LOGIN_COOKIE, { ...cookieOptions, path: '/api/auth' })
    if (!code || !state || state !== login.state) return failed()

    let identity: { id: string; username: string }
    try {
      identity = await fetchIdentity(code, login.verifier)
    } catch (err) {
      request.log.warn({ err }, 'Lichess sign-in failed')
      return failed()
    }

    const { rows } = await pool.query<{ id: string }>(
      `INSERT INTO users (lichess_id, username) VALUES ($1, $2)
       ON CONFLICT (lichess_id) DO UPDATE SET username = $2, last_login_at = now()
       RETURNING id`,
      [identity.id, identity.username],
    )

    const token = randomBytes(32).toString('base64url')
    await pool.query('DELETE FROM sessions WHERE expires_at <= now()')
    await pool.query(
      `INSERT INTO sessions (token_hash, user_id, expires_at)
       VALUES ($1, $2, now() + make_interval(days => $3))`,
      [hashToken(token), rows[0]!.id, SESSION_DAYS],
    )

    reply.setCookie(SESSION_COOKIE, token, {
      ...cookieOptions,
      maxAge: SESSION_DAYS * 24 * 60 * 60,
    })
    return reply.redirect(safeReturnPath(login.returnTo))
  })

  app.post('/api/auth/logout', async (request, reply) => {
    const token = request.cookies[SESSION_COOKIE]
    if (token) await pool.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)])
    reply.clearCookie(SESSION_COOKIE, cookieOptions)
    return { ok: true }
  })

  app.get('/api/me', (request) => ({ user: request.user }))
}
