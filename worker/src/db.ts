export interface Link {
  id: string
  url: string
  label: string | null
  created_at: number
  updated_at: number
}

export interface Click {
  id: number
  link_id: string
  clicked_at: number
  ip: string | null
  user_agent: string | null
  referer: string | null
}

export interface ClickStats {
  total: number
  last_30_days: number
  by_day: Array<{ date: string; count: number }>
  recent: Click[]
}

export async function getLink(db: D1Database, id: string): Promise<Link | null> {
  const result = await db
    .prepare('SELECT * FROM links WHERE id = ?')
    .bind(id)
    .first<Link>()
  return result ?? null
}

export async function listLinks(db: D1Database): Promise<Link[]> {
  const result = await db
    .prepare('SELECT * FROM links ORDER BY created_at DESC')
    .all<Link>()
  return result.results
}

export async function createLink(
  db: D1Database,
  id: string,
  url: string,
  label: string | null,
): Promise<Link> {
  const now = Date.now()
  await db
    .prepare('INSERT INTO links (id, url, label, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, url, label, now, now)
    .run()
  return { id, url, label, created_at: now, updated_at: now }
}

export async function updateLink(
  db: D1Database,
  id: string,
  fields: { url?: string; label?: string },
): Promise<Link | null> {
  const link = await getLink(db, id)
  if (!link) return null

  const url = fields.url ?? link.url
  const label = fields.label !== undefined ? fields.label : link.label
  const now = Date.now()

  await db
    .prepare('UPDATE links SET url = ?, label = ?, updated_at = ? WHERE id = ?')
    .bind(url, label, now, id)
    .run()

  return { ...link, url, label, updated_at: now }
}

export async function deleteLink(db: D1Database, id: string): Promise<boolean> {
  const result = await db.prepare('DELETE FROM links WHERE id = ?').bind(id).run()
  return (result.meta.changes ?? 0) > 0
}

export async function recordClick(
  db: D1Database,
  linkId: string,
  ip: string | null,
  userAgent: string | null,
  referer: string | null,
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO clicks (link_id, clicked_at, ip, user_agent, referer) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(linkId, Date.now(), ip, userAgent, referer)
    .run()
}

export async function getStats(db: D1Database, linkId: string): Promise<ClickStats> {
  const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

  const [totalRow, last30Row, byDayResult, recentResult] = await Promise.all([
    db
      .prepare('SELECT COUNT(*) as count FROM clicks WHERE link_id = ?')
      .bind(linkId)
      .first<{ count: number }>(),
    db
      .prepare('SELECT COUNT(*) as count FROM clicks WHERE link_id = ? AND clicked_at >= ?')
      .bind(linkId, thirtyDaysAgo)
      .first<{ count: number }>(),
    db
      .prepare(
        `SELECT strftime('%Y-%m-%d', datetime(clicked_at / 1000, 'unixepoch')) AS date,
                COUNT(*) AS count
         FROM clicks
         WHERE link_id = ? AND clicked_at >= ?
         GROUP BY date
         ORDER BY date ASC`,
      )
      .bind(linkId, thirtyDaysAgo)
      .all<{ date: string; count: number }>(),
    db
      .prepare(
        'SELECT * FROM clicks WHERE link_id = ? ORDER BY clicked_at DESC LIMIT 20',
      )
      .bind(linkId)
      .all<Click>(),
  ])

  return {
    total: totalRow?.count ?? 0,
    last_30_days: last30Row?.count ?? 0,
    by_day: byDayResult.results,
    recent: recentResult.results,
  }
}
