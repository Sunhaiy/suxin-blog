/**
 * lib/db/dao/momentDao.ts
 *
 * 极客瞬间数据访问层。
 */

import { revalidateTag, unstable_cache } from 'next/cache'
import { query } from '@/lib/db'
import { extractPlainTextFromRichContent } from '@/lib/utils/extractHeadings'
import type {
  CreateMomentCommentInput,
  CreateMomentInput,
  MomentCommentRow,
  MomentEngagementSummary,
  MomentRow,
  UpdateMomentInput,
} from '@/types/moment'

const MOMENTS_TAG = 'moments'

// ============================================================
// 查询
// ============================================================

async function findMomentsUncached(params: {
  page?: number
  pageSize?: number
  type?: string
  publicOnly?: boolean
} = {}): Promise<{ data: MomentRow[]; total: number }> {
  const { page = 1, pageSize = 20, type, publicOnly = true } = params
  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (publicOnly) {
    conditions.push(`m.is_public = $${idx++}`)
    values.push(true)
  }
  if (type) {
    conditions.push(`m.type = $${idx++}`)
    values.push(type)
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (page - 1) * pageSize

  const [dataResult, countResult] = await Promise.all([
    query<MomentRow>(
      `SELECT
         m.*,
         COALESCE(l.like_count, 0)::int AS like_count,
         COALESCE(c.comment_count, 0)::int AS comment_count
       FROM moments m
       LEFT JOIN (
         SELECT moment_id, COUNT(*) AS like_count
         FROM moment_likes
         GROUP BY moment_id
       ) l ON l.moment_id = m.id
       LEFT JOIN (
         SELECT moment_id, COUNT(*) AS comment_count
         FROM moment_comments
         GROUP BY moment_id
       ) c ON c.moment_id = m.id
       ${where}
       ORDER BY m.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, pageSize, offset]
    ),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM moments m ${where}`, values),
  ])

  return {
    data: dataResult.rows,
    total: Number(countResult.rows[0].count),
  }
}

function serializeMomentQuery(params: {
  page?: number
  pageSize?: number
  type?: string
  publicOnly?: boolean
}) {
  return JSON.stringify({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
    type: params.type ?? null,
    publicOnly: params.publicOnly ?? true,
  })
}

const findPublicMomentsCached = unstable_cache(
  async (serializedParams: string): Promise<{ data: MomentRow[]; total: number }> => {
    return findMomentsUncached(
      JSON.parse(serializedParams) as {
        page?: number
        pageSize?: number
        type?: string
        publicOnly?: boolean
      }
    )
  },
  ['moments-public-list'],
  {
    revalidate: 180,
    tags: [MOMENTS_TAG],
  }
)

export async function findMoments(params: {
  page?: number
  pageSize?: number
  type?: string
  publicOnly?: boolean
} = {}): Promise<{ data: MomentRow[]; total: number }> {
  if (params.publicOnly !== false) {
    return findPublicMomentsCached(serializeMomentQuery(params))
  }

  return findMomentsUncached(params)
}

const findRecentPublicMomentsCached = unstable_cache(
  async (pageSize: number): Promise<MomentRow[]> => {
    const result = await query<MomentRow>(
      `SELECT
         m.*,
         COALESCE(l.like_count, 0)::int AS like_count,
         COALESCE(c.comment_count, 0)::int AS comment_count
       FROM moments m
       LEFT JOIN (
         SELECT moment_id, COUNT(*) AS like_count
         FROM moment_likes
         GROUP BY moment_id
       ) l ON l.moment_id = m.id
       LEFT JOIN (
         SELECT moment_id, COUNT(*) AS comment_count
         FROM moment_comments
         GROUP BY moment_id
       ) c ON c.moment_id = m.id
       WHERE m.is_public = TRUE
       ORDER BY m.created_at DESC
       LIMIT $1`,
      [pageSize]
    )

    return result.rows
  },
  ['moments-public-preview'],
  {
    revalidate: 180,
    tags: [MOMENTS_TAG],
  }
)

export async function findRecentPublicMoments(pageSize: number = 10): Promise<MomentRow[]> {
  return findRecentPublicMomentsCached(pageSize)
}

export async function findMomentById(id: number): Promise<MomentRow | null> {
  const result = await query<MomentRow>(
    `SELECT
       m.*,
       COALESCE(l.like_count, 0)::int AS like_count,
       COALESCE(c.comment_count, 0)::int AS comment_count
     FROM moments m
     LEFT JOIN (
       SELECT moment_id, COUNT(*) AS like_count
       FROM moment_likes
       GROUP BY moment_id
     ) l ON l.moment_id = m.id
     LEFT JOIN (
       SELECT moment_id, COUNT(*) AS comment_count
       FROM moment_comments
       GROUP BY moment_id
     ) c ON c.moment_id = m.id
     WHERE m.id = $1`,
    [id]
  )
  return result.rows[0] ?? null
}

// ============================================================
// 创建
// ============================================================

export async function insertMoment(input: CreateMomentInput): Promise<MomentRow> {
  const richSummary =
    input.contentJson ? extractPlainTextFromRichContent(input.contentJson).slice(0, 280) : ''
  const content = input.content?.trim() || richSummary || null

  const result = await query<MomentRow>(
    `INSERT INTO moments (type, content, content_json, images, meta, mood, weather, location, is_public)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      input.type ?? 'text',
      content,
      input.contentJson ? JSON.stringify(input.contentJson) : null,
      input.images ?? [],
      input.meta ? JSON.stringify(input.meta) : null,
      input.mood ?? null,
      input.weather ?? null,
      input.location ?? null,
      input.isPublic ?? true,
    ]
  )
  revalidateTag(MOMENTS_TAG)
  return result.rows[0]
}

// ============================================================
// 更新
// ============================================================

export async function updateMoment(id: number, input: UpdateMomentInput): Promise<MomentRow | null> {
  const setClauses: string[] = []
  const values: unknown[] = []
  let idx = 1

  const nextContent =
    input.contentJson !== undefined
      ? extractPlainTextFromRichContent(input.contentJson ?? null).slice(0, 280) || null
      : undefined

  if (input.type !== undefined) { setClauses.push(`type = $${idx++}`); values.push(input.type) }
  if (input.content !== undefined) { setClauses.push(`content = $${idx++}`); values.push(input.content) }
  if (input.contentJson !== undefined) {
    setClauses.push(`content_json = $${idx++}`)
    values.push(input.contentJson ? JSON.stringify(input.contentJson) : null)
    if (input.content === undefined) {
      setClauses.push(`content = $${idx++}`)
      values.push(nextContent)
    }
  }
  if (input.images !== undefined) { setClauses.push(`images = $${idx++}`); values.push(input.images) }
  if (input.meta !== undefined) { setClauses.push(`meta = $${idx++}`); values.push(JSON.stringify(input.meta)) }
  if (input.mood !== undefined) { setClauses.push(`mood = $${idx++}`); values.push(input.mood) }
  if (input.weather !== undefined) { setClauses.push(`weather = $${idx++}`); values.push(input.weather) }
  if (input.location !== undefined) { setClauses.push(`location = $${idx++}`); values.push(input.location) }
  if (input.isPublic !== undefined) { setClauses.push(`is_public = $${idx++}`); values.push(input.isPublic) }

  if (setClauses.length === 0) return findMomentById(id)

  values.push(id)
  const result = await query<MomentRow>(
    `UPDATE moments SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )
  revalidateTag(MOMENTS_TAG)
  return result.rows[0] ?? null
}

// ============================================================
// 删除
// ============================================================

export async function deleteMoment(id: number): Promise<boolean> {
  const result = await query(`DELETE FROM moments WHERE id = $1`, [id])
  revalidateTag(MOMENTS_TAG)
  return (result.rowCount ?? 0) > 0
}

// ============================================================
// 互动
// ============================================================

export async function toggleMomentLike(
  momentId: number,
  visitorKey: string
): Promise<MomentEngagementSummary | null> {
  return withMomentVisibility(momentId, async () => {
    const existing = await query<{ id: number }>(
      `SELECT id FROM moment_likes WHERE moment_id = $1 AND visitor_key = $2`,
      [momentId, visitorKey]
    )

    const liked = !existing.rows[0]
    if (liked) {
      await query(
        `INSERT INTO moment_likes (moment_id, visitor_key)
         VALUES ($1, $2)
         ON CONFLICT (moment_id, visitor_key) DO NOTHING`,
        [momentId, visitorKey]
      )
    } else {
      await query(
        `DELETE FROM moment_likes WHERE moment_id = $1 AND visitor_key = $2`,
        [momentId, visitorKey]
      )
    }

    revalidateTag(MOMENTS_TAG)
    return getMomentEngagementSummary(momentId, visitorKey, liked)
  })
}

export async function getMomentComments(momentId: number): Promise<MomentCommentRow[] | null> {
  return withMomentVisibility(momentId, async () => {
    const result = await query<MomentCommentRow>(
      `SELECT *
       FROM moment_comments
       WHERE moment_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [momentId]
    )

    return result.rows
  })
}

export async function insertMomentComment(
  momentId: number,
  input: CreateMomentCommentInput
): Promise<MomentCommentRow | null> {
  return withMomentVisibility(momentId, async () => {
    const result = await query<MomentCommentRow>(
      `INSERT INTO moment_comments (moment_id, author_name, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [momentId, input.authorName, input.content]
    )

    revalidateTag(MOMENTS_TAG)
    return result.rows[0]
  })
}

export async function incrementMomentShare(momentId: number): Promise<MomentEngagementSummary | null> {
  return withMomentVisibility(momentId, async () => {
    await query(
      `UPDATE moments
       SET share_count = share_count + 1
       WHERE id = $1`,
      [momentId]
    )

    revalidateTag(MOMENTS_TAG)
    return getMomentEngagementSummary(momentId)
  })
}

async function getMomentEngagementSummary(
  momentId: number,
  visitorKey?: string,
  likedOverride?: boolean
): Promise<MomentEngagementSummary> {
  const [counts, liked] = await Promise.all([
    query<{ like_count: number; comment_count: number; share_count: number }>(
      `SELECT
         (SELECT COUNT(*)::int FROM moment_likes WHERE moment_id = $1) AS like_count,
         (SELECT COUNT(*)::int FROM moment_comments WHERE moment_id = $1) AS comment_count,
         COALESCE((SELECT share_count FROM moments WHERE id = $1), 0)::int AS share_count`,
      [momentId]
    ),
    visitorKey && likedOverride === undefined
      ? query<{ liked: boolean }>(
          `SELECT EXISTS (
             SELECT 1 FROM moment_likes WHERE moment_id = $1 AND visitor_key = $2
           ) AS liked`,
          [momentId, visitorKey]
        )
      : null,
  ])

  const row = counts.rows[0]
  return {
    momentId,
    likeCount: Number(row?.like_count ?? 0),
    commentCount: Number(row?.comment_count ?? 0),
    shareCount: Number(row?.share_count ?? 0),
    liked: likedOverride ?? Boolean(liked?.rows[0]?.liked),
  }
}

async function withMomentVisibility<T>(
  momentId: number,
  fn: () => Promise<T>
): Promise<T | null> {
  const moment = await findMomentById(momentId)
  if (!moment || !moment.is_public) return null
  return fn()
}

// ============================================================
// 手环数据批量写入（定时任务专用）
// ============================================================

export async function upsertMiBandMoment(
  type: 'sleep' | 'steps' | 'heartrate',
  meta: Record<string, unknown>,
  date: Date
): Promise<MomentRow> {
  // 同一天的同类型数据做 upsert（通过 meta->>'date' 判断唯一性）
  const result = await query<MomentRow>(
    `INSERT INTO moments (type, meta, is_public, created_at)
     VALUES ($1, $2, TRUE, $3)
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [type, JSON.stringify({ ...meta, date: date.toISOString().slice(0, 10) }), date]
  )

  if (result.rows[0]) return result.rows[0]

  // 若已存在则更新
  const update = await query<MomentRow>(
    `UPDATE moments
     SET meta = $1
     WHERE type = $2 AND (meta->>'date') = $3
     RETURNING *`,
    [JSON.stringify({ ...meta, date: date.toISOString().slice(0, 10) }), type, date.toISOString().slice(0, 10)]
  )
  return update.rows[0]
}
