import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import cookie from '@fastify/cookie'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import fastifyStatic from '@fastify/static'
import Fastify from 'fastify'
import { registerAuth } from './auth.ts'
import { config } from './config.ts'
import { migrate, pool } from './db.ts'
import { registerGames } from './games.ts'
import { registerStats } from './stats.ts'
import { scheduleStatsRefresh } from './statsRefresh.ts'

const DIST_DIR = fileURLToPath(new URL('../dist/', import.meta.url))

const app = Fastify({
  // Requests are logged at "info", so this keeps visitor IP addresses out of the logs
  logger: { level: 'warn' },
  trustProxy: (_address, hop) => hop < config.trustProxyHops,
})

await app.register(helmet, {
  contentSecurityPolicy: {
    useDefaults: false,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'wasm-unsafe-eval'"], // Stockfish is WebAssembly
      styleSrc: ["'self'", "'unsafe-inline'"], // Vue style bindings and the board library
      imgSrc: ["'self'", 'data:'], // Chess pieces are embedded images
      fontSrc: ["'self'", 'data:'], // The build embeds the smallest font files in the CSS
      connectSrc: ["'self'"],
      workerSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      ...(config.isHttps ? { upgradeInsecureRequests: [] } : {}),
    },
  },
  strictTransportSecurity: config.isHttps,
})
await app.register(cookie)
await app.register(rateLimit, {
  global: true,
  max: 300,
  timeWindow: '1 minute',
  allowList: (request) => !request.url.startsWith('/api/'),
})

registerAuth(app)
registerGames(app)
registerStats(app)

app.get('/api/health', async () => {
  await pool.query('SELECT 1')
  return { ok: true }
})

app.get('/api/site-info', () => config.site)

// In production the same server also delivers the built website
if (existsSync(DIST_DIR)) {
  await app.register(fastifyStatic, {
    root: DIST_DIR,
    setHeaders(response, path) {
      if (path.includes('/assets/') || path.includes('\\assets\\')) {
        response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
    },
  })
}

app.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api/') || !existsSync(DIST_DIR)) {
    return reply.code(404).send({ error: 'Not found.' })
  }
  return reply.sendFile('index.html')
})

app.setErrorHandler((error: { statusCode?: number; message?: string }, request, reply) => {
  const status = error.statusCode ?? 500
  if (status >= 500) request.log.error(error)
  return reply
    .code(status)
    .send({ error: status >= 500 ? 'Something went wrong.' : (error.message ?? 'Bad request.') })
})

await migrate()
await app.listen({ port: config.port, host: '0.0.0.0' })
console.log(`Delta Analyzer is listening on port ${config.port}`)
scheduleStatsRefresh((err) => app.log.error({ err }, 'Statistics refresh failed'))

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    void app.close().then(() => pool.end())
  })
}
