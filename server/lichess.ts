/** Talks to the Lichess API. Lichess asks for one request at a time and a pause after a 429. */
import { createHash, randomBytes } from 'node:crypto'
import { config } from './config.ts'

const USER_AGENT = 'DeltaAnalyzer'
const RATE_LIMIT_PAUSE_MS = 60_000
const REQUEST_TIMEOUT_MS = 60_000
const STANDARD_PERF_TYPES = 'ultraBullet,bullet,blitz,rapid,classical,correspondence'

export class LichessBusyError extends Error {}

let queue: Promise<unknown> = Promise.resolve()
let pausedUntil = 0

/** Runs Lichess requests one after another, across every visitor. */
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queue.then(() => {
    if (Date.now() < pausedUntil) throw new LichessBusyError()
    return task()
  })
  queue = result.catch(() => {})
  return result
}

async function lichessFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(config.lichessUrl + path, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: { 'User-Agent': USER_AGENT, ...init.headers },
  })
  if (response.status === 429) {
    pausedUntil = Date.now() + RATE_LIMIT_PAUSE_MS
    throw new LichessBusyError()
  }
  return response
}

export const redirectUri = () => `${config.publicUrl}/api/auth/callback`

export function createPkce(): { verifier: string; challenge: string; state: string } {
  const verifier = randomBytes(48).toString('base64url')
  return {
    verifier,
    challenge: createHash('sha256').update(verifier).digest('base64url'),
    state: randomBytes(24).toString('base64url'),
  }
}

/** No scope is requested: signing in only reveals the visitor's public username. */
export function authorizeUrl(state: string, challenge: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.lichessClientId,
    redirect_uri: redirectUri(),
    code_challenge_method: 'S256',
    code_challenge: challenge,
    state,
  })
  return `${config.lichessUrl}/oauth?${params}`
}

/** Exchanges the login code for the account's identity. The token is revoked, never stored. */
export function fetchIdentity(
  code: string,
  verifier: string,
): Promise<{ id: string; username: string }> {
  return enqueue(async () => {
    const tokenResponse = await lichessFetch('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: verifier,
        redirect_uri: redirectUri(),
        client_id: config.lichessClientId,
      }),
    })
    if (!tokenResponse.ok) throw new Error(`Lichess token error ${tokenResponse.status}`)
    const { access_token: token } = (await tokenResponse.json()) as { access_token: string }
    const authorization = { Authorization: `Bearer ${token}` }

    try {
      const accountResponse = await lichessFetch('/api/account', { headers: authorization })
      if (!accountResponse.ok) throw new Error(`Lichess account error ${accountResponse.status}`)
      const { id, username } = (await accountResponse.json()) as { id: string; username: string }
      return { id, username }
    } finally {
      await lichessFetch('/api/token', { method: 'DELETE', headers: authorization }).catch(() => {})
    }
  })
}

/** Downloads a user's most recent finished standard-chess games as PGN. */
export function fetchRecentGames(username: string, max: number): Promise<string> {
  return enqueue(async () => {
    const params = new URLSearchParams({
      max: String(max),
      perfType: STANDARD_PERF_TYPES,
      opening: 'true',
      clocks: 'false',
      evals: 'false',
      finished: 'true',
      ongoing: 'false',
    })
    const response = await lichessFetch(
      `/api/games/user/${encodeURIComponent(username)}?${params}`,
      { headers: { Accept: 'application/x-chess-pgn' } },
    )
    if (!response.ok) throw new Error(`Lichess export error ${response.status}`)
    return response.text()
  })
}
