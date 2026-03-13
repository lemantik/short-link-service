import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { apiKeyAuth } from './auth'
import {
  getLink,
  listLinks,
  createLink,
  updateLink,
  deleteLink,
  recordClick,
  getStats,
} from './db'

export interface Env {
  DB: D1Database
  API_KEY: string
}

const app = new Hono<{ Bindings: Env }>()

app.use(
  '/api/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type', 'X-API-Key'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
)

// ── Public redirect ───────────────────────────────────────────────────────────

app.get('/:code', async (c) => {
  const code = c.req.param('code')
  const link = await getLink(c.env.DB, code)

  if (!link) {
    return c.text('Not found', 404)
  }

  // Fire-and-forget click tracking (don't block the redirect)
  const ip =
    c.req.header('CF-Connecting-IP') ??
    c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ??
    null
  const userAgent = c.req.header('User-Agent') ?? null
  const referer = c.req.header('Referer') ?? null

  c.executionCtx.waitUntil(recordClick(c.env.DB, code, ip, userAgent, referer))

  return c.redirect(link.url, 302)
})

// ── Protected API ─────────────────────────────────────────────────────────────

const api = new Hono<{ Bindings: Env }>()
api.use('*', apiKeyAuth)

api.get('/links', async (c) => {
  const links = await listLinks(c.env.DB)
  return c.json(links)
})

api.post('/links', async (c) => {
  const body = await c.req.json<{ url: string; label?: string; code?: string }>()

  if (!body.url) {
    return c.json({ error: 'url is required' }, 400)
  }

  try {
    new URL(body.url)
  } catch {
    return c.json({ error: 'invalid url' }, 400)
  }

  const code = body.code?.trim() || nanoid(7)

  if (!/^[a-zA-Z0-9_-]+$/.test(code)) {
    return c.json({ error: 'code may only contain letters, numbers, hyphens, and underscores' }, 400)
  }

  // Check for collision
  const existing = await getLink(c.env.DB, code)
  if (existing) {
    return c.json({ error: `code "${code}" already exists` }, 409)
  }

  const link = await createLink(c.env.DB, code, body.url, body.label ?? null)
  return c.json(link, 201)
})

api.patch('/links/:code', async (c) => {
  const code = c.req.param('code')
  const body = await c.req.json<{ url?: string; label?: string }>()

  if (!body.url && body.label === undefined) {
    return c.json({ error: 'provide url or label to update' }, 400)
  }

  if (body.url) {
    try {
      new URL(body.url)
    } catch {
      return c.json({ error: 'invalid url' }, 400)
    }
  }

  const link = await updateLink(c.env.DB, code, body)
  if (!link) return c.json({ error: 'not found' }, 404)

  return c.json(link)
})

api.delete('/links/:code', async (c) => {
  const code = c.req.param('code')
  const deleted = await deleteLink(c.env.DB, code)
  if (!deleted) return c.json({ error: 'not found' }, 404)
  return c.json({ success: true })
})

api.get('/links/:code/stats', async (c) => {
  const code = c.req.param('code')
  const link = await getLink(c.env.DB, code)
  if (!link) return c.json({ error: 'not found' }, 404)

  const stats = await getStats(c.env.DB, code)
  return c.json({ link, stats })
})

app.route('/api', api)

// ── Helpers ───────────────────────────────────────────────────────────────────

function nanoid(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('')
}

export default app
