import { revalidateTag, unstable_cache } from 'next/cache'
import { query } from '@/lib/db'
import type {
  CreatePostInput,
  PaginatedResult,
  PostQueryParams,
  PostRow,
  UpdatePostInput,
} from '@/types/post'

const POSTS_TAG = 'posts'

export async function findPostById(id: number): Promise<PostRow | null> {
  const result = await query<PostRow>('SELECT * FROM posts WHERE id = $1', [id])
  return result.rows[0] ?? null
}

async function findPostBySlugUncached(slug: string): Promise<PostRow | null> {
  const result = await query<PostRow>('SELECT * FROM posts WHERE slug = $1', [slug])
  return result.rows[0] ?? null
}

const findPostBySlugCached = unstable_cache(
  async (slug: string): Promise<PostRow | null> => {
    return findPostBySlugUncached(slug)
  },
  ['post-by-slug'],
  {
    revalidate: 300,
    tags: [POSTS_TAG],
  }
)

export async function findPostBySlug(slug: string): Promise<PostRow | null> {
  return findPostBySlugCached(slug)
}

async function findPostsUncached(params: PostQueryParams = {}): Promise<PaginatedResult<PostRow>> {
  const {
    page = 1,
    pageSize = 10,
    status,
    tag,
    tags,
    category,
    keyword,
  } = params

  const conditions: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (status) {
    conditions.push(`status = $${idx++}`)
    values.push(status)
  }

  if (tag) {
    conditions.push(`$${idx++} = ANY(tags)`)
    values.push(tag)
  }

  if (tags && tags.length > 0) {
    const placeholders = tags.map(() => `$${idx++}`).join(',')
    conditions.push(`tags && ARRAY[${placeholders}]::text[]`)
    values.push(...tags)
  }

  if (category) {
    conditions.push(`category = $${idx++}`)
    values.push(category)
  }

  if (keyword) {
    conditions.push(`(title ILIKE $${idx} OR excerpt ILIKE $${idx + 1})`)
    values.push(`%${keyword}%`, `%${keyword}%`)
    idx += 2
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (page - 1) * pageSize

  const [dataResult, countResult] = await Promise.all([
    query<PostRow>(
      `SELECT
         id,
         title,
         slug,
         excerpt,
         cover_url,
         cover_alt,
         seo_title,
         seo_description,
         is_featured,
         status,
         tags,
         category,
         view_count,
         created_at,
         updated_at,
         published_at
       FROM posts
       ${where}
       ORDER BY is_featured DESC, published_at DESC NULLS LAST, created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...values, pageSize, offset]
    ),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM posts ${where}`, values),
  ])

  const total = Number(countResult.rows[0]?.count ?? 0)

  return {
    data: dataResult.rows,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

function serializePostQueryParams(params: PostQueryParams) {
  return JSON.stringify({
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 10,
    status: params.status ?? null,
    tag: params.tag ?? null,
    tags: params.tags ?? null,
    category: params.category ?? null,
    keyword: params.keyword ?? null,
  })
}

const findPublishedPostsCached = unstable_cache(
  async (serializedParams: string): Promise<PaginatedResult<PostRow>> => {
    return findPostsUncached(JSON.parse(serializedParams) as PostQueryParams)
  },
  ['published-posts'],
  {
    revalidate: 180,
    tags: [POSTS_TAG],
  }
)

export async function findPosts(params: PostQueryParams = {}): Promise<PaginatedResult<PostRow>> {
  if (params.status === 'published') {
    return findPublishedPostsCached(serializePostQueryParams(params))
  }

  return findPostsUncached(params)
}

const findCategoriesCached = unstable_cache(
  async (): Promise<{ category: string; count: number }[]> => {
    const result = await query<{ category: string; count: string }>(
      `SELECT category, COUNT(*) AS count
       FROM posts
       WHERE status = 'published'
       GROUP BY category
       ORDER BY count DESC, category ASC`
    )

    return result.rows.map((row) => ({
      category: row.category,
      count: Number(row.count),
    }))
  },
  ['post-categories'],
  {
    revalidate: 300,
    tags: [POSTS_TAG],
  }
)

export async function findCategories(): Promise<{ category: string; count: number }[]> {
  return findCategoriesCached()
}

const findLatestPostPerCategoryCached = unstable_cache(
  async (): Promise<{ category: string; title: string; slug: string }[]> => {
    const result = await query<{ category: string; title: string; slug: string }>(
      `SELECT DISTINCT ON (category) category, title, slug
       FROM posts
       WHERE status = 'published'
       ORDER BY category, published_at DESC NULLS LAST`
    )

    return result.rows
  },
  ['latest-post-per-category'],
  {
    revalidate: 300,
    tags: [POSTS_TAG],
  }
)

export async function findLatestPostPerCategory(): Promise<
  { category: string; title: string; slug: string }[]
> {
  return findLatestPostPerCategoryCached()
}

export async function insertPost(input: CreatePostInput): Promise<PostRow> {
  const result = await query<PostRow>(
    `INSERT INTO posts (
       title,
       slug,
       content,
       excerpt,
       cover_url,
       cover_alt,
       seo_title,
       seo_description,
       is_featured,
       status,
       tags,
       category,
       published_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING *`,
    [
      input.title,
      input.slug,
      JSON.stringify(input.content),
      input.excerpt ?? null,
      input.coverUrl ?? null,
      input.coverAlt ?? null,
      input.seoTitle ?? null,
      input.seoDescription ?? null,
      input.isFeatured ?? false,
      input.status ?? 'draft',
      input.tags ?? [],
      input.category ?? '未分类',
      input.publishedAt
        ? new Date(input.publishedAt)
        : input.status === 'published'
          ? new Date()
          : null,
    ]
  )

  revalidateTag(POSTS_TAG)
  return result.rows[0]
}

export async function updatePost(id: number, input: UpdatePostInput): Promise<PostRow | null> {
  const setClauses: string[] = []
  const values: unknown[] = []
  let idx = 1

  if (input.title !== undefined) {
    setClauses.push(`title = $${idx++}`)
    values.push(input.title)
  }
  if (input.slug !== undefined) {
    setClauses.push(`slug = $${idx++}`)
    values.push(input.slug)
  }
  if (input.content !== undefined) {
    setClauses.push(`content = $${idx++}`)
    values.push(JSON.stringify(input.content))
  }
  if (input.excerpt !== undefined) {
    setClauses.push(`excerpt = $${idx++}`)
    values.push(input.excerpt)
  }
  if (input.coverUrl !== undefined) {
    setClauses.push(`cover_url = $${idx++}`)
    values.push(input.coverUrl)
  }
  if (input.coverAlt !== undefined) {
    setClauses.push(`cover_alt = $${idx++}`)
    values.push(input.coverAlt)
  }
  if (input.seoTitle !== undefined) {
    setClauses.push(`seo_title = $${idx++}`)
    values.push(input.seoTitle)
  }
  if (input.seoDescription !== undefined) {
    setClauses.push(`seo_description = $${idx++}`)
    values.push(input.seoDescription)
  }
  if (input.isFeatured !== undefined) {
    setClauses.push(`is_featured = $${idx++}`)
    values.push(input.isFeatured)
  }
  if (input.tags !== undefined) {
    setClauses.push(`tags = $${idx++}`)
    values.push(input.tags)
  }
  if (input.category !== undefined) {
    setClauses.push(`category = $${idx++}`)
    values.push(input.category)
  }
  if (input.publishedAt !== undefined) {
    setClauses.push(`published_at = $${idx++}`)
    values.push(input.publishedAt ? new Date(input.publishedAt) : null)
  }
  if (input.status !== undefined) {
    setClauses.push(`status = $${idx++}`)
    values.push(input.status)

    if (input.status === 'published' && input.publishedAt === undefined) {
      setClauses.push(`published_at = COALESCE(published_at, NOW())`)
    }
  }

  if (setClauses.length === 0) return findPostById(id)

  values.push(id)
  const result = await query<PostRow>(
    `UPDATE posts SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  )

  revalidateTag(POSTS_TAG)
  return result.rows[0] ?? null
}

export async function incrementViewCount(id: number): Promise<void> {
  await query(`UPDATE posts SET view_count = view_count + 1 WHERE id = $1`, [id])
}

export async function findAdjacentPosts(
  publishedAt: Date,
  id: number
): Promise<{ prev: PostRow | null; next: PostRow | null }> {
  const result = await query<PostRow>(
    `SELECT *
     FROM posts
     WHERE status = 'published'
     ORDER BY published_at DESC NULLS LAST, created_at DESC, id DESC`
  )
  const publishedPosts = result.rows
  const targetTime = publishedAt.getTime()
  const ordered = [...publishedPosts].sort((a, b) => {
    const timeA = a.published_at ? new Date(a.published_at).getTime() : 0
    const timeB = b.published_at ? new Date(b.published_at).getTime() : 0
    return timeB - timeA || b.id - a.id
  })
  const currentIndex = ordered.findIndex((post) => {
    const time = post.published_at ? new Date(post.published_at).getTime() : 0
    return post.id === id && time === targetTime
  })

  return {
    prev: currentIndex >= 0 ? ordered[currentIndex + 1] ?? null : null,
    next: currentIndex > 0 ? ordered[currentIndex - 1] ?? null : null,
  }
}

const findAllTagsCached = unstable_cache(
  async (): Promise<{ tag: string; count: number }[]> => {
    const result = await query<{ tag: string; count: string }>(
      `SELECT unnest(tags) AS tag, COUNT(*) AS count
       FROM posts
       WHERE status = 'published'
       GROUP BY tag
       ORDER BY count DESC, tag ASC`
    )

    return result.rows.map((row) => ({ tag: row.tag, count: Number(row.count) }))
  },
  ['post-tags'],
  {
    revalidate: 300,
    tags: [POSTS_TAG],
  }
)

export async function findAllTags(): Promise<{ tag: string; count: number }[]> {
  return findAllTagsCached()
}

const findPostsForArchiveCached = unstable_cache(
  async (): Promise<Pick<PostRow, 'id' | 'title' | 'slug' | 'category' | 'published_at'>[]> => {
    const result = await query<
      Pick<PostRow, 'id' | 'title' | 'slug' | 'category' | 'published_at'>
    >(
      `SELECT id, title, slug, category, published_at
       FROM posts
       WHERE status = 'published'
       ORDER BY published_at DESC NULLS LAST, created_at DESC`
    )

    return result.rows
  },
  ['posts-archive'],
  {
    revalidate: 300,
    tags: [POSTS_TAG],
  }
)

export async function findPostsForArchive(): Promise<
  Pick<PostRow, 'id' | 'title' | 'slug' | 'category' | 'published_at'>[]
> {
  return findPostsForArchiveCached()
}

export async function renameCategory(oldName: string, newName: string): Promise<number> {
  const result = await query(`UPDATE posts SET category = $2 WHERE category = $1`, [
    oldName,
    newName,
  ])

  revalidateTag(POSTS_TAG)
  return result.rowCount ?? 0
}

export async function resetCategory(name: string): Promise<number> {
  const result = await query(
    `UPDATE posts
     SET category = '未分类'
     WHERE category = $1 AND category != '未分类'`,
    [name]
  )

  revalidateTag(POSTS_TAG)
  return result.rowCount ?? 0
}

export async function renameTag(oldTag: string, newTag: string): Promise<number> {
  const result = await query(
    `UPDATE posts
     SET tags = ARRAY(
       SELECT DISTINCT value
       FROM unnest(array_replace(tags, $1, $2)) AS value
       WHERE value <> ''
     )
     WHERE $1 = ANY(tags)`,
    [oldTag, newTag]
  )

  revalidateTag(POSTS_TAG)
  return result.rowCount ?? 0
}

export async function resetTag(name: string): Promise<number> {
  const result = await query(
    `UPDATE posts
     SET tags = array_remove(tags, $1)
     WHERE $1 = ANY(tags)`,
    [name]
  )

  revalidateTag(POSTS_TAG)
  return result.rowCount ?? 0
}

export async function deletePost(id: number): Promise<boolean> {
  const result = await query(`DELETE FROM posts WHERE id = $1`, [id])
  revalidateTag(POSTS_TAG)
  return (result.rowCount ?? 0) > 0
}
