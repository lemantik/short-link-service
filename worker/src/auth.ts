import type { MiddlewareHandler } from 'hono'
import type { Env } from './index'

export const apiKeyAuth: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const key = c.req.header('X-API-Key')
  if (!key || key !== c.env.API_KEY) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
}
